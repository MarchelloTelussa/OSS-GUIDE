import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/session.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.mov', '.webm', '.ogv', '.ogg'];
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

function looksLikeVideo(buf, ext) {
    if (['.mp4', '.m4v', '.mov'].includes(ext)) return buf.length > 12 && buf.toString('latin1', 4, 8) === 'ftyp';
    if (ext === '.webm') return buf.length > 4 && buf.readUInt32BE(0) === 0x1A45DFA3;
    return buf.length > 4 && buf.toString('latin1', 0, 4) === 'OggS';
}

// -------------------------------------------------------------
// 1. ROUTE SPESIFIK (Wajib Diletakkan Sebelum Parameter Dinamis)
// -------------------------------------------------------------

router.get('/guides', async (req, res) => {
    try {
        const queryText = `
        SELECT
            c.id,
            c.title,
            c.function_desc AS "functionDesc",
            c.viewcount AS "views"
        FROM content c
        LEFT JOIN guide_steps gs ON c.id = gs.guide_id
        GROUP BY c.id
        ORDER BY c.id ASC;
        `;
        const { rows } = await db.query(queryText);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching guides:', error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/guides/types', async (req, res) => {
    try {
        const queryText = `
        SELECT DISTINCT type
        FROM content
        WHERE type IS NOT NULL
        ORDER BY type ASC;
        `;
        const { rows } = await db.query(queryText);
        
        const types = rows.map(row => row.type);
        res.json(types);
    } catch (error) {
        console.error('Error fetching guide types:', error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.put('/guide/types/:type', requireAuth('ITAdmin'), async (req, res) => {
    const { type } = req.params;
    const { newType } = req.body;

    if (!newType || !newType.trim()) {
        return res.status(400).json({ error: 'newType tidak boleh kosong' });
    }

    const trimmedNewType = newType.trim();

    // Tentukan nama folder safe untuk type lama dan baru
    const safeOldType = type.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
    const safeNewType = trimmedNewType.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // 1. Update kolom `type` pada tabel content
        const updateTypeQuery = `
            UPDATE content
            SET type = $2
            WHERE type = $1
            RETURNING id, video_url;
        `;

        const { rows } = await client.query(updateTypeQuery, [type, trimmedNewType]);

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Type tidak ditemukan' });
        }

        // 2. Update seluruh string `video_url` yang mengandung folder type lama menjadi type baru
        // Mengganti /videos/old_type/ menjadi /videos/new_type/
        const oldPathPrefix = `/videos/${safeOldType}/`;
        const newPathPrefix = `/videos/${safeNewType}/`;

        const updateVideoUrlQuery = `
            UPDATE content
            SET video_url = REPLACE(video_url, $1, $2)
            WHERE type = $3 AND video_url LIKE $4;
        `;

        await client.query(updateVideoUrlQuery, [
            oldPathPrefix,
            newPathPrefix,
            trimmedNewType,
            `${oldPathPrefix}%`
        ]);

        await client.query('COMMIT');

        // 3. Rename folder di filesystem dari public/videos/old_type ke public/videos/new_type
        if (safeOldType !== safeNewType) {
            const oldFolderPath = path.join(__dirname, '../public/videos', safeOldType);
            const newFolderPath = path.join(__dirname, '../public/videos', safeNewType);

            try {
                if (fs.existsSync(oldFolderPath)) {
                    // Pastikan folder induk /public/videos/ ada
                    const videosParentDir = path.dirname(newFolderPath);
                    if (!fs.existsSync(videosParentDir)) {
                        fs.mkdirSync(videosParentDir, { recursive: true });
                    }

                    // Pindahkan/Rename seluruh folder type beserta isinya
                    fs.renameSync(oldFolderPath, newFolderPath);
                    console.log(`Folder type berhasil di-rename dari '${safeOldType}' ke '${safeNewType}'`);
                }
            } catch (fsErr) {
                console.warn(`Gagal mengubah nama folder filesystem:`, fsErr.message);
            }
        }

        return res.status(200).json({
            message: 'Berhasil mengubah type dan memperbarui path video serta folder',
            oldType: type,
            newType: trimmedNewType,
            updatedCount: rows.length
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating guide type:', error.stack);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
});

router.delete('/guides/types/:type', requireAuth('ITAdmin'), async (req, res) => {
    const { type } = req.params;
    try {
        const queryText = `
            DELETE FROM content
            WHERE type = $1
            RETURNING id;
        `;
        
        const { rows } = await db.query(queryText, [type]);

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Tidak ada guide dengan type tersebut'
            });
        }

        // Sanitasi nama type folder
        const safeTypeFolder = type.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
        const typeFolderPath = path.join(__dirname, '../public/videos', safeTypeFolder);

        // Hapus folder type dan seluruh isi di dalamnya
        try {
            if (fs.existsSync(typeFolderPath)) {
                fs.rmSync(typeFolderPath, { recursive: true, force: true });
                console.log(`Folder type '${safeTypeFolder}' beserta seluruh isinya berhasil dihapus: ${typeFolderPath}`);
            }
        } catch (dirErr) {
            console.warn(`Gagal menghapus folder type:`, dirErr.message);
        }

        return res.json({
            message: 'Berhasil menghapus guide dan folder type',
            deletedCount: rows.length,
            deletedIds: rows.map(row => row.id)
        });

    } catch (error) {
        console.error('Error deleting guides by type:', error.stack);
        return res.status(500).json({
            error: 'Internal Server Error'
        });
    }
});

router.get('/guides/type/:type', async (req, res) => {
    const { type } = req.params;
    try {
        const queryText = `
        SELECT
            c.id,
            c.title,
            c.important_note AS "importantNote",
            c.function_desc AS "functionDesc",
            c.video_url AS "videoUrl",
            COALESCE (
                json_agg(gs.step_description ORDER BY gs.step_order) FILTER (WHERE gs.step_description IS NOT NULL),
                '[]'
            ) AS steps,
            c.type
        FROM content c
        LEFT JOIN guide_steps gs ON c.id = gs.guide_id
        WHERE c.type = $1 AND TRIM(c.title) <> ''
        GROUP BY c.id
        ORDER BY c.id ASC;
        `;
        const { rows } = await db.query(queryText, [type]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Guide not found' });
        }
        res.json(rows);
    } catch (error) {
        console.error('Error fetching guides by type:', error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    } 
});

// -------------------------------------------------------------
// 2. ROUTE PARAMETER DINAMIS (:id)
// -------------------------------------------------------------

router.get('/guides/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const queryText = `
            SELECT
                c.id,
                c.title,
                c.important_note AS "importantNote",
                c.function_desc AS "functionDesc",
                c.video_url AS "videoUrl",
                COALESCE(
                    json_agg(gs.step_description ORDER BY gs.step_order) FILTER (WHERE gs.step_description IS NOT NULL),
                    '[]'
                ) AS steps,
                c.type
            FROM content c
            LEFT JOIN guide_steps gs ON c.id = gs.guide_id
            WHERE c.id = $1
            GROUP BY c.id;
        `;
        const { rows } = await db.query(queryText, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Guide not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching guide:', error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.delete('/guides/:id', requireAuth('ITAdmin'), async (req, res) => {
    const { id } = req.params;
    const guideId = parseInt(id, 10);

    if (isNaN(guideId)) {
        return res.status(400).json({ error: 'ID tidak valid' });
    }

    try {
        const queryText = `
            DELETE FROM content
            WHERE id = $1
            RETURNING id, video_url AS "videoUrl";
        `;

        const { rows } = await db.query(queryText, [guideId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Guide tidak ditemukan' });
        }

        const videoUrl = rows[0].videoUrl;

        if (videoUrl) {
            let cleanPath = videoUrl.trim();
            cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
            const relativePath = cleanPath.startsWith('public/') ? cleanPath.replace('public/', '') : cleanPath;

            const absoluteFilePath = path.join(__dirname, '../public', relativePath);
            const titleFolderPath = path.dirname(absoluteFilePath); // Folder khusus judul guide

            try {
                // Hapus file video
                if (fs.existsSync(absoluteFilePath)) {
                    fs.unlinkSync(absoluteFilePath);
                    console.log(`File video berhasil dihapus: ${absoluteFilePath}`);
                }

                // Hapus folder khusus judul guide (dan isi pendukungnya jika ada)
                if (fs.existsSync(titleFolderPath)) {
                    fs.rmSync(titleFolderPath, { recursive: true, force: true });
                    console.log(`Folder guide berhasil dihapus: ${titleFolderPath}`);
                }

                // Opsional: Hapus folder kategori di atasnya jika sudah kosong
                const categoryFolderPath = path.dirname(titleFolderPath);
                if (fs.existsSync(categoryFolderPath) && fs.readdirSync(categoryFolderPath).length === 0) {
                    fs.rmdirSync(categoryFolderPath);
                    console.log(`Folder kategori kosong dihapus: ${categoryFolderPath}`);
                }
            } catch (fileErr) {
                console.warn(`Gagal menghapus file/folder video:`, fileErr.message);
            }
        }

        return res.json({
            message: 'Guide berhasil dihapus',
            deletedId: rows[0].id
        });

    } catch (error) {
        console.error('Error deleting guide:', error.stack);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/guides/:id/view', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            'UPDATE content SET viewcount = viewcount + 1 WHERE id = $1 RETURNING viewcount',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        res.json({ views: result.rows[0].viewcount });
    } catch (error) {
        console.error('Error updating view count:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/guides/:id', requireAuth('ITAdmin'), async (req, res) => {
    const { id } = req.params;
    const { title, functionDesc, importantNote, videoUrl, steps } = req.body;

    if (!title || !functionDesc || !importantNote || !videoUrl) {
        return res.status(400).json({ error: 'Semua field utama wajib diisi' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Ambil data guide lama
        const oldGuideQuery = `SELECT title, type, video_url FROM content WHERE id = $1;`;
        const oldGuideResult = await client.query(oldGuideQuery, [id]);

        if (oldGuideResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Guide tidak ditemukan' });
        }

        const oldData = oldGuideResult.rows[0];
        const oldVideoUrl = oldData.video_url;
        let finalVideoUrl = videoUrl;

        // 2. Jika TIDAK ada video baru yang di-upload, tapi TITLE berubah -> Rename & Pindahkan Folder Video
        if (oldVideoUrl === videoUrl && title.trim() !== oldData.title.trim()) {
            const oldRelativePath = oldVideoUrl.startsWith('/') ? oldVideoUrl.slice(1) : oldVideoUrl;
            const oldFilePath = path.join(__dirname, '../public', oldRelativePath);
            const oldFolderPath = path.dirname(oldFilePath);
            const fileName = path.basename(oldFilePath);

            // Sanitasi type dan title baru
            const safeTypeFolder = (oldData.type || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            const newSafeTitleFolder = title.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');

            // Folder dan File Path Tujuan Baru (langsung /videos/<type>/<title>/)
            const newFolderPath = path.join(__dirname, '../public/videos', safeTypeFolder, newSafeTitleFolder);
            const newFilePath = path.join(newFolderPath, fileName);

            // Cek ketersediaan file lama di server
            if (fs.existsSync(oldFilePath)) {
                // Buat folder baru jika belum ada
                if (!fs.existsSync(newFolderPath)) {
                    fs.mkdirSync(newFolderPath, { recursive: true });
                }

                // Pindahkan file video ke folder lokasi baru
                fs.renameSync(oldFilePath, newFilePath);

                // Hapus folder lama (dan induknya jika kosong)
                try {
                    if (fs.existsSync(oldFolderPath)) {
                        fs.rmSync(oldFolderPath, { recursive: true, force: true });
                    }
                } catch (e) {
                    console.warn('Gagal membersihkan folder lama:', e.message);
                }

                // Set URL video baru untuk disimpan ke Database
                finalVideoUrl = `/videos/${safeTypeFolder}/${newSafeTitleFolder}/${fileName}`;
            }
        }

        // 3. Update DB menggunakan finalVideoUrl
        const updateContentQuery = `
            UPDATE content 
            SET 
                title = $1, 
                function_desc = $2, 
                important_note = $3, 
                video_url = $4
            WHERE id = $5
            RETURNING id;
        `;
        await client.query(updateContentQuery, [
            title, 
            functionDesc, 
            importantNote, 
            finalVideoUrl, 
            id
        ]);

        // 4. Update steps
        await client.query('DELETE FROM guide_steps WHERE guide_id = $1', [id]);

        if (Array.isArray(steps)) {
            const cleanSteps = steps.map(s => String(s).trim()).filter(Boolean);
            for (let i = 0; i < cleanSteps.length; i++) {
                await client.query(
                    `INSERT INTO guide_steps (guide_id, step_order, step_description)
                     VALUES ($1, $2, $3);`,
                    [id, i + 1, cleanSteps[i]]
                );
            }
        }

        await client.query('COMMIT');

        // 5. Jika ADA video baru yang di-upload, hapus video & folder lama dari server
        if (oldVideoUrl && oldVideoUrl !== videoUrl) {
            const relativePath = oldVideoUrl.startsWith('/') ? oldVideoUrl.slice(1) : oldVideoUrl;
            const oldFilePath = path.join(__dirname, '../public', relativePath);
            const oldFolderPath = path.dirname(oldFilePath);

            try {
                if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
                if (fs.existsSync(oldFolderPath)) fs.rmSync(oldFolderPath, { recursive: true, force: true });
            } catch (err) {
                console.warn(`Gagal membersihkan file video lama:`, err.message);
            }
        }

        return res.status(200).json({ 
            message: 'Guide berhasil diperbarui',
            id 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating guide:', error.stack);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
});

router.post('/guides', requireAuth('ITAdmin'), async (req, res) => {
    try {
        const { title, functionDesc, importantNote, videoUrl, steps, type } = req.body;

        if (!title || !functionDesc || !importantNote || !videoUrl) {
            return res.status(400).json({ error: 'Semua field wajib diisi' });
        }

        const guideQuery = `
            INSERT INTO content (title, function_desc, important_note, video_url, viewcount, type)
            VALUES ($1, $2, $3, $4, 0, $5)
            RETURNING id
        `;

        const guideResult = await db.query(guideQuery, [title, functionDesc, importantNote, videoUrl, type]);
        const guideId = guideResult.rows[0].id;

        if (steps && Array.isArray(steps) && steps.length > 0) {
            const stepsQuery = `
                INSERT INTO guide_steps (guide_id, step_order, step_description)
                VALUES ($1, $2, $3)
            `;

            for (let i = 0; i < steps.length; i++) {
                if (steps[i].trim()) {
                    await db.query(stepsQuery, [guideId, i + 1, steps[i].trim()]);
                }
            }
        }

        res.status(201).json({
            id: guideId,
            message: 'Guide created successfully'
        });
    } catch (error) {
        console.error('Error creating guide:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/upload-video', requireAuth('ITAdmin'), async (req, res) => {
    try {
        const chunks = [];
        let received = 0;
        let tooLarge = false;

        req.on('data', (chunk) => {
            received += chunk.length;
            if (received > MAX_VIDEO_SIZE) {
                if (!tooLarge) {
                    tooLarge = true;
                    chunks.length = 0;
                    res.status(413).json({ error: 'Ukuran video maksimal 500 MB' });
                }
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            if (tooLarge) return;
            try {
                const buffer = Buffer.concat(chunks);
                const contentType = req.headers['content-type'] || '';

                if (!contentType.includes('multipart/form-data')) {
                    return res.status(400).json({ error: 'Invalid content type' });
                }

                const boundaryMatch = contentType.match(/boundary=([^;]+)/);
                if (!boundaryMatch) {
                    return res.status(400).json({ error: 'Invalid boundary' });
                }

                const boundary = boundaryMatch[1];
                const data = buffer.toString('binary');
                const parts = data.split(`--${boundary}`);

                let videoBuffer = null;
                let videoFilename = '';
                let typeParam = 'default';
                let titleParam = 'untitled';

                // Parsing multipart data
                for (const part of parts) {
                    if (part.includes('name="type"')) {
                        const contentStart = part.indexOf('\r\n\r\n') + 4;
                        const contentEnd = part.lastIndexOf('\r\n');
                        typeParam = part.substring(contentStart, contentEnd).trim() || 'default';
                    }
                    if (part.includes('name="title"')) {
                        const contentStart = part.indexOf('\r\n\r\n') + 4;
                        const contentEnd = part.lastIndexOf('\r\n');
                        titleParam = part.substring(contentStart, contentEnd).trim() || 'untitled';
                    }
                    if (part.includes('filename=')) {
                        const filenameMatch = part.match(/filename="([^"]+)"/);
                        if (filenameMatch) {
                            videoFilename = filenameMatch[1];
                            const contentStart = part.indexOf('\r\n\r\n') + 4;
                            const contentEnd = part.lastIndexOf('\r\n');
                            const content = part.substring(contentStart, contentEnd);
                            videoBuffer = Buffer.from(content, 'binary');
                        }
                    }
                }

                if (!videoBuffer || !videoFilename) {
                    return res.status(400).json({ error: 'No video file provided' });
                }

                const extension = path.extname(videoFilename).toLowerCase();
                if (!ALLOWED_VIDEO_EXTENSIONS.includes(extension) || !looksLikeVideo(videoBuffer, extension)) {
                    return res.status(400).json({
                        error: `File harus berupa video (${ALLOWED_VIDEO_EXTENSIONS.join(', ')})`
                    });
                }

                // Sanitasi nama type & title agar aman untuk nama folder di OS
                const safeTypeFolder = typeParam.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                const safeTitleFolder = titleParam.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');

                // Path direktori langsung: /public/videos/<type>/<safeTitleFolder>/
                const targetDir = path.join(__dirname, '../public/videos', safeTypeFolder, safeTitleFolder);

                // Buat folder secara otomatis jika belum ada
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const timestamp = Date.now();
                const safeFilename = `${timestamp}${extension}`;
                const filepath = path.join(targetDir, safeFilename);

                fs.writeFileSync(filepath, videoBuffer);

                // Path URL relatif yang tersimpan di DB
                const videoUrl = `/videos/${safeTypeFolder}/${safeTitleFolder}/${safeFilename}`;

                res.json({ videoPath: videoUrl });
            } catch (error) {
                console.error('Error processing upload:', error);
                res.status(500).json({ error: 'Failed to process video upload' });
            }
        });
    } catch (error) {
        console.error('Error uploading video:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
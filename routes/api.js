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

const taskLocks = new Map();

function enqueueTask(key, taskFn) {
    const lockKey = String(key);
    const previousTask = taskLocks.get(lockKey) || Promise.resolve();

    const currentTask = previousTask
        .then(() => taskFn())
        .catch((err) => {
            throw err;
        })
        .finally(() => {
            if (taskLocks.get(lockKey) === currentTask) {
                taskLocks.delete(lockKey);
            }
        });

    taskLocks.set(lockKey, currentTask);
    return currentTask;
}

function looksLikeVideo(buf, ext) {
    if (['.mp4', '.m4v', '.mov'].includes(ext)) return buf.length > 12 && buf.toString('latin1', 4, 8) === 'ftyp';
    if (ext === '.webm') return buf.length > 4 && buf.readUInt32BE(0) === 0x1A45DFA3;
    return buf.length > 4 && buf.toString('latin1', 0, 4) === 'OggS';
}

// -------------------------------------------------------------
// 1. ROUTE SPESIFIK (Wajib Diletakkan Sebelum Parameter Dinamis)
// -------------------------------------------------------------

router.get('/guides', async (req, res, next) => {
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
        next(error);
    }
});

router.get('/guides/types', async (req, res, next) => {
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
        next(error);
    }
});

router.put('/guide/types/:type', requireAuth('ITAdmin'), async (req, res, next) => {
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
                    const videosParentDir = path.dirname(newFolderPath);
                    if (!fs.existsSync(videosParentDir)) {
                        fs.mkdirSync(videosParentDir, { recursive: true });
                    }

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
        next(error);
    } finally {
        client.release();
    }
});

router.delete('/guides/types/:type', requireAuth('ITAdmin'), async (req, res, next) => {
    const { type } = req.params;

    // Gunakan db.getClient() sesuai export di db.js
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const queryText = `
            DELETE FROM content
            WHERE type = $1
            RETURNING id;
        `;
        
        const { rows } = await client.query(queryText, [type]);

        if (rows.length === 0) {
            await client.query('ROLLBACK');
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

        await client.query('COMMIT');

        return res.json({
            message: 'Berhasil menghapus guide dan folder type',
            deletedCount: rows.length,
            deletedIds: rows.map(row => row.id)
        });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

router.get('/guides/type/:type', async (req, res, next) => {
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
        next(error);
    } 
});

// -------------------------------------------------------------
// 2. ROUTE PARAMETER DINAMIS (:id)
// -------------------------------------------------------------

router.get('/guides/:id', async (req, res, next) => {
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
        next(error);
    }
});

router.delete('/guides/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    const { id } = req.params;
    const guideId = parseInt(id, 10);

    if (isNaN(guideId)) {
        return res.status(400).json({ error: 'ID tidak valid' });
    }

    enqueueTask(guideId, async () => {
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            const queryText = `
                DELETE FROM content
                WHERE id = $1
                RETURNING id, video_url AS "videoUrl";
            `;

            const { rows } = await client.query(queryText, [guideId]);

            if (rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Guide tidak ditemukan' });
            }

            const videoUrl = rows[0].videoUrl;

            if (videoUrl) {
                let cleanPath = videoUrl.trim();
                cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
                const relativePath = cleanPath.startsWith('public/') ? cleanPath.replace('public/', '') : cleanPath;

                const absoluteFilePath = path.join(__dirname, '../public', relativePath);
                const titleFolderPath = path.dirname(absoluteFilePath);

                try {
                    if (fs.existsSync(absoluteFilePath)) {
                        fs.unlinkSync(absoluteFilePath);
                    }

                    // Hapus folder guide sampai bersih
                    if (fs.existsSync(titleFolderPath)) {
                        fs.rmSync(titleFolderPath, { recursive: true, force: true });
                        console.log(`Folder guide berhasil dibersihkan: ${titleFolderPath}`);
                    }

                    // Hapus folder kategori jika sudah tidak ada isinya lagi
                    const categoryFolderPath = path.dirname(titleFolderPath);
                    if (fs.existsSync(categoryFolderPath) && fs.readdirSync(categoryFolderPath).length === 0) {
                        fs.rmdirSync(categoryFolderPath);
                        console.log(`Folder kategori kosong dihapus: ${categoryFolderPath}`);
                    }
                } catch (fileErr) {
                    console.warn(`Gagal menghapus file/folder video:`, fileErr.message);
                }
            }

            await client.query('COMMIT');

            res.json({
                message: 'Guide berhasil dihapus',
                deletedId: rows[0].id
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }).catch(next);
});

router.post('/guides/:id/view', async (req, res, next) => {
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
        next(error);
    }
});

router.put('/guides/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    const { id } = req.params;
    const guideId = parseInt(id, 10);

    if (isNaN(guideId)) {
        return res.status(400).json({ error: 'ID tidak valid' });
    }

    enqueueTask(`guide_${guideId}`, async () => {
        const { title, functionDesc, importantNote, videoUrl, steps } = req.body;

        if (!title || !functionDesc || !importantNote || !videoUrl) {
            return res.status(400).json({ error: 'Semua field utama wajib diisi' });
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const oldGuideQuery = `
                SELECT title, type, video_url AS "videoUrl" 
                FROM content 
                WHERE id = $1 
                FOR UPDATE;
            `;
            const oldGuideResult = await client.query(oldGuideQuery, [guideId]);

            if (oldGuideResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Guide tidak ditemukan' });
            }

            const oldData = oldGuideResult.rows[0];
            const oldVideoUrl = oldData.videoUrl;

            const safeTypeFolder = (oldData.type || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            const targetTitleFolder = title.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');

            const currentRelPath = videoUrl.startsWith('/') ? videoUrl.slice(1) : videoUrl;
            const fileName = path.basename(currentRelPath);

            const finalVideoUrl = `/videos/${safeTypeFolder}/${targetTitleFolder}/${fileName}`;
            const targetRelPath = finalVideoUrl.startsWith('/') ? finalVideoUrl.slice(1) : finalVideoUrl;

            const targetFilePath = path.join(__dirname, '../public', targetRelPath);
            const targetFolderPath = path.dirname(targetFilePath);

            if (!fs.existsSync(targetFolderPath)) {
                fs.mkdirSync(targetFolderPath, { recursive: true });
            }

            const currentFilePath = path.join(__dirname, '../public', currentRelPath);
            let sourceFilePath = null;

            if (fs.existsSync(currentFilePath)) {
                sourceFilePath = currentFilePath;
            } else if (oldVideoUrl) {
                const oldRelPath = oldVideoUrl.startsWith('/') ? oldVideoUrl.slice(1) : oldVideoUrl;
                const oldFilePath = path.join(__dirname, '../public', oldRelPath);
                if (fs.existsSync(oldFilePath)) {
                    sourceFilePath = oldFilePath;
                }
            }

            if (sourceFilePath && sourceFilePath !== targetFilePath) {
                fs.renameSync(sourceFilePath, targetFilePath);
                console.log(`[File Saved] Video berhasil dipindahkan ke: ${targetFilePath}`);
            }

            if (fs.existsSync(targetFilePath)) {
                const foldersToClean = new Set();

                if (oldVideoUrl) {
                    const oldRel = oldVideoUrl.startsWith('/') ? oldVideoUrl.slice(1) : oldVideoUrl;
                    foldersToClean.add(path.dirname(path.join(__dirname, '../public', oldRel)));
                }
                foldersToClean.add(path.dirname(currentFilePath));

                for (const oldFolder of foldersToClean) {
                    if (oldFolder !== targetFolderPath && fs.existsSync(oldFolder)) {
                        try {
                            fs.rmSync(oldFolder, { recursive: true, force: true });
                            console.log(`[Clean Success] Folder lama dibersihkan: ${oldFolder}`);
                        } catch (e) {
                            console.warn('Gagal menghapus folder lama:', e.message);
                        }
                    }
                }
            } else {
                console.warn(`[Warning] File video target tidak ditemukan di: ${targetFilePath}`);
            }

            const updateContentQuery = `
                UPDATE content 
                SET 
                    title = $1, 
                    function_desc = $2, 
                    important_note = $3, 
                    video_url = $4,
                    updated_at = NOW()
                WHERE id = $5
                RETURNING id;
            `;
            await client.query(updateContentQuery, [
                title, 
                functionDesc, 
                importantNote, 
                finalVideoUrl, 
                guideId
            ]);

            await client.query('DELETE FROM guide_steps WHERE guide_id = $1', [guideId]);

            if (Array.isArray(steps)) {
                const cleanSteps = steps.map(s => String(s).trim()).filter(Boolean);
                for (let i = 0; i < cleanSteps.length; i++) {
                    await client.query(
                        `INSERT INTO guide_steps (guide_id, step_order, step_description)
                         VALUES ($1, $2, $3);`,
                        [guideId, i + 1, cleanSteps[i]]
                    );
                }
            }

            await client.query('COMMIT');

            res.status(200).json({ 
                message: 'Guide berhasil diperbarui',
                id: guideId 
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }).catch(next);
});

router.post('/guides', requireAuth('ITAdmin'), async (req, res, next) => {
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
        next(error);
    }
}); 

router.post('/upload-video', requireAuth('ITAdmin'), async (req, res, next) => {
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

                const safeTypeFolder = typeParam.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                const safeTitleFolder = titleParam.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');

                // Kunci antrean berdasarkan jalur folder target
                const queueKey = `folder_${safeTypeFolder}_${safeTitleFolder}`;

                enqueueTask(queueKey, async () => {
                    const targetDir = path.join(__dirname, '../public/videos', safeTypeFolder, safeTitleFolder);

                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }

                    const timestamp = Date.now();
                    const safeFilename = `${timestamp}${extension}`;
                    const filepath = path.join(targetDir, safeFilename);

                    fs.writeFileSync(filepath, videoBuffer);

                    const videoUrl = `/videos/${safeTypeFolder}/${safeTitleFolder}/${safeFilename}`;
                    return res.json({ videoPath: videoUrl });
                }).catch(next);

            } catch (error) {
                next(error);
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
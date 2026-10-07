import express from 'express';
import db from '../db.js';
import { requireAuth } from '../lib/session.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.mov', '.webm', '.ogv', '.ogg'];
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

// Cek isi file (magic bytes) agar file non-video yang hanya diganti namanya ditolak
function looksLikeVideo(buf, ext) {
    if (['.mp4', '.m4v', '.mov'].includes(ext)) return buf.length > 12 && buf.toString('latin1', 4, 8) === 'ftyp';
    if (ext === '.webm') return buf.length > 4 && buf.readUInt32BE(0) === 0x1A45DFA3;
    return buf.length > 4 && buf.toString('latin1', 0, 4) === 'OggS'; // .ogv / .ogg
}

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
    }catch (error) {
        console.error('Error fetching guides:', error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

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
                ) AS steps
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

    // 1. Validasi input sederhana
    if (!title || !functionDesc || !importantNote || !videoUrl) {
        return res.status(400).json({ error: 'Semua field utama wajib diisi' });
    }

    // Satu koneksi khusus agar BEGIN/COMMIT benar-benar satu transaksi
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 2. Update data utama pada tabel 'content'
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
        const contentResult = await client.query(updateContentQuery, [
            title, 
            functionDesc, 
            importantNote, 
            videoUrl, 
            id
        ]);

        if (contentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Guide tidak ditemukan' });
        }

        // 3. Hapus langkah-langkah (steps) lama milik guide ini
        await client.query('DELETE FROM guide_steps WHERE guide_id = $1', [id]);

        // 4. Insert langkah-langkah (steps) baru jika ada
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
        const { title, functionDesc, importantNote, videoUrl, steps } = req.body;

        if (!title || !functionDesc || !importantNote || !videoUrl) {
            return res.status(400).json({ error: 'Semua field wajib diisi' });
        }

        const guideQuery = `
            INSERT INTO content (title, function_desc, important_note, video_url, viewcount)
            VALUES ($1, $2, $3, $4, 0)
            RETURNING id
        `;

        const guideResult = await db.query(guideQuery, [title, functionDesc, importantNote, videoUrl]);
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
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const videosDir = path.join(__dirname, '../public/videos');

        // Create videos directory if it doesn't exist
        if (!fs.existsSync(videosDir)) {
            fs.mkdirSync(videosDir, { recursive: true });
        }

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

                // Extract boundary from content-type
                const boundaryMatch = contentType.match(/boundary=([^;]+)/);
                if (!boundaryMatch) {
                    return res.status(400).json({ error: 'Invalid boundary' });
                }

                const boundary = boundaryMatch[1];
                const data = buffer.toString('binary');
                const parts = data.split(`--${boundary}`);

                let videoBuffer = null;
                let videoFilename = '';

                for (const part of parts) {
                    if (part.includes('filename=')) {
                        const filenameMatch = part.match(/filename="([^"]+)"/);
                        if (filenameMatch) {
                            videoFilename = filenameMatch[1];
                            const contentStart = part.indexOf('\r\n\r\n') + 4;
                            const contentEnd = part.lastIndexOf('\r\n');
                            const content = part.substring(contentStart, contentEnd);
                            videoBuffer = Buffer.from(content, 'binary');
                            break;
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

                // Save file with timestamp to avoid conflicts
                const timestamp = Date.now();
                const safeFilename = `${timestamp}${extension}`;
                const filepath = path.join(videosDir, safeFilename);

                fs.writeFileSync(filepath, videoBuffer);

                res.json({ videoPath: `/videos/${safeFilename}` });
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

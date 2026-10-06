import express from 'express';
import db from '../db.js';
import { requireAuth } from '../lib/session.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

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
        let filename = '';

        req.on('data', (chunk) => {
            chunks.push(chunk);
        });

        req.on('end', () => {
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

                // Save file with timestamp to avoid conflicts
                const timestamp = Date.now();
                const extension = path.extname(videoFilename);
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

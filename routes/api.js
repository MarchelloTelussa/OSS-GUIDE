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

// =============================================================
// 1. TYPE ROUTES (CRUD)
// =============================================================

// GET all types
router.get('/types', async (req, res, next) => {
    try {
        const queryText = `
            SELECT id, title, description, flow_url AS "flowUrl", created_at, updated_at
            FROM type
            ORDER BY id ASC;
        `;
        const { rows } = await db.query(queryText);
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// GET single type by ID (including nested groups)
router.get('/types/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const queryText = `
            SELECT 
                t.id, 
                t.title, 
                t.description, 
                t.flow_url AS "flowUrl",
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', g.id,
                            'title', g.title,
                            'description', g.description,
                            'groupOrder', g.group_order
                        ) ORDER BY g.group_order ASC
                    ) FILTER (WHERE g.id IS NOT NULL),
                    '[]'
                ) AS groups
            FROM type t
            LEFT JOIN guide_groups g ON t.id = g.type_id
            WHERE t.id = $1
            GROUP BY t.id;
        `;
        const { rows } = await db.query(queryText, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Type not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// POST create type (ITAdmin only)
router.post('/types', requireAuth('ITAdmin'), async (req, res, next) => {
    try {
        const { title, description, flowUrl } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title field is required' });
        }

        const queryText = `
            INSERT INTO type (title, description, flow_url)
            VALUES ($1, $2, $3)
            RETURNING id, title, description, flow_url AS "flowUrl";
        `;
        const { rows } = await db.query(queryText, [
            title.trim(), 
            description || null, 
            flowUrl || null
        ]);

        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// PUT update type (ITAdmin only)
router.put('/types/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    const { id } = req.params;
    const { title, description, flowUrl } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title field is required' });
    }

    try {
        const queryText = `
            UPDATE type
            SET title = $1, description = $2, flow_url = $3
            WHERE id = $4
            RETURNING id, title, description, flow_url AS "flowUrl";
        `;
        const { rows } = await db.query(queryText, [
            title.trim(), 
            description || null, 
            flowUrl || null, 
            id
        ]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Type not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE type (ITAdmin only)
router.delete('/types/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    const { id } = req.params;
    try {
        const queryText = `
            DELETE FROM type
            WHERE id = $1
            RETURNING id;
        `;
        const { rows } = await db.query(queryText, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Type not found' });
        }

        res.json({ message: 'Type successfully deleted', deletedId: rows[0].id });
    } catch (error) {
        next(error);
    }
});

// =============================================================
// 2. GUIDE GROUPS ROUTES (CRUD)
// =============================================================

// GET all guide groups (optional filter by ?typeId=)
router.get('/groups', async (req, res, next) => {
    const { typeId } = req.query;
    try {
        let queryText = `
            SELECT id, type_id AS "typeId", title, description, group_order AS "groupOrder"
            FROM guide_groups
        `;
        const params = [];

        if (typeId) {
            queryText += ` WHERE type_id = $1`;
            params.push(typeId);
        }

        queryText += ` ORDER BY group_order ASC, id ASC;`;

        const { rows } = await db.query(queryText, params);
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// GET single guide group by ID (with nested guides list)
router.get('/groups/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const queryText = `
            SELECT 
                gg.id,
                gg.type_id AS "typeId",
                gg.title,
                gg.description,
                gg.group_order AS "groupOrder",
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', g.id,
                            'title', g.title,
                            'functionDesc', g.function_desc,
                            'viewcount', g.viewcount
                        ) ORDER BY g.id ASC
                    ) FILTER (WHERE g.id IS NOT NULL),
                    '[]'
                ) AS guides
            FROM guide_groups gg
            LEFT JOIN guide g ON gg.id = g.group_id
            WHERE gg.id = $1
            GROUP BY gg.id;
        `;
        const { rows } = await db.query(queryText, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Guide Group not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// POST create guide group (ITAdmin only)
router.post('/groups', requireAuth('ITAdmin'), async (req, res, next) => {
    try {
        const { typeId, title, description, groupOrder } = req.body;

        if (!typeId || !title || !title.trim()) {
            return res.status(400).json({ error: 'typeId and title are required' });
        }

        const queryText = `
            INSERT INTO guide_groups (type_id, title, description, group_order)
            VALUES ($1, $2, $3, $4)
            RETURNING id, type_id AS "typeId", title, description, group_order AS "groupOrder";
        `;
        const { rows } = await db.query(queryText, [
            typeId,
            title.trim(),
            description || null,
            groupOrder || 0
        ]);

        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// PUT update guide group (ITAdmin only)
router.put('/groups/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    const { id } = req.params;
    const { typeId, title, description, groupOrder } = req.body;

    if (!typeId || !title || !title.trim()) {
        return res.status(400).json({ error: 'typeId and title are required' });
    }

    try {
        const queryText = `
            UPDATE guide_groups
            SET type_id = $1, title = $2, description = $3, group_order = $4
            WHERE id = $5
            RETURNING id, type_id AS "typeId", title, description, group_order AS "groupOrder";
        `;
        const { rows } = await db.query(queryText, [
            typeId,
            title.trim(),
            description || null,
            groupOrder || 0,
            id
        ]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Guide Group not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE guide group (ITAdmin only)
router.delete('/groups/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    const { id } = req.params;
    try {
        const queryText = `
            DELETE FROM guide_groups
            WHERE id = $1
            RETURNING id;
        `;
        const { rows } = await db.query(queryText, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Guide Group not found' });
        }

        res.json({ message: 'Guide Group successfully deleted', deletedId: rows[0].id });
    } catch (error) {
        next(error);
    }
});

// =============================================================
// 3. GUIDE ROUTES (CRUD)
// =============================================================

// GET all guides (optional filter by ?groupId=)
router.get('/guides', async (req, res, next) => {
    const { groupId } = req.query;
    try {
        let queryText = `
            SELECT 
                g.id,
                g.group_id AS "groupId",
                g.title,
                g.function_desc AS "functionDesc",
                g.important_note AS "importantNote",
                g.video_url AS "videoUrl",
                g.video_description AS "videoDescription",
                g.viewcount AS "views"
            FROM guide g
        `;
        const params = [];

        if (groupId) {
            queryText += ` WHERE g.group_id = $1`;
            params.push(groupId);
        }

        queryText += ` ORDER BY g.id ASC;`;

        const { rows } = await db.query(queryText, params);
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// GET single guide by ID (with ordered steps)
router.get('/guides/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const queryText = `
            SELECT 
                g.id,
                g.group_id AS "groupId",
                g.title,
                g.function_desc AS "functionDesc",
                g.important_note AS "importantNote",
                g.video_url AS "videoUrl",
                g.video_description AS "videoDescription",
                g.viewcount AS "views",
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', gs.id,
                            'stepOrder', gs.step_order,
                            'stepDescription', gs.step_description
                        ) ORDER BY gs.step_order ASC
                    ) FILTER (WHERE gs.id IS NOT NULL),
                    '[]'
                ) AS steps
            FROM guide g
            LEFT JOIN guide_steps gs ON g.id = gs.guide_id
            WHERE g.id = $1
            GROUP BY g.id;
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

// POST increment viewcount
router.post('/guides/:id/view', async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            'UPDATE guide SET viewcount = viewcount + 1 WHERE id = $1 RETURNING viewcount',
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

// POST create guide (ITAdmin only)
router.post('/guides', requireAuth('ITAdmin'), async (req, res, next) => {
    const client = await db.getClient();
    try {
        const { groupId, title, functionDesc, importantNote, videoUrl, videoDescription, steps } = req.body;

        if (!groupId || !title || !functionDesc) {
            return res.status(400).json({ error: 'groupId, title, and functionDesc are required' });
        }

        await client.query('BEGIN');

        const guideQuery = `
            INSERT INTO guide (group_id, title, function_desc, important_note, video_url, video_description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;
        const guideResult = await client.query(guideQuery, [
            groupId,
            title.trim(),
            functionDesc,
            importantNote || null,
            videoUrl || null,
            videoDescription || null
        ]);
        const guideId = guideResult.rows[0].id;

        if (Array.isArray(steps) && steps.length > 0) {
            const stepsQuery = `
                INSERT INTO guide_steps (guide_id, step_order, step_description)
                VALUES ($1, $2, $3);
            `;
            const cleanSteps = steps.map(s => String(s).trim()).filter(Boolean);

            for (let i = 0; i < cleanSteps.length; i++) {
                await client.query(stepsQuery, [guideId, i + 1, cleanSteps[i]]);
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            id: guideId,
            message: 'Guide created successfully'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

// PUT update guide (ITAdmin only)
router.put('/guides/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    const { id } = req.params;
    const guideId = parseInt(id, 10);

    if (isNaN(guideId)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    const client = await db.getClient();
    try {
        const { groupId, title, functionDesc, importantNote, videoUrl, videoDescription, steps } = req.body;

        if (!groupId || !title || !functionDesc) {
            return res.status(400).json({ error: 'groupId, title, and functionDesc are required' });
        }

        await client.query('BEGIN');

        const updateGuideQuery = `
            UPDATE guide
            SET group_id = $1, title = $2, function_desc = $3, important_note = $4, video_url = $5, video_description = $6
            WHERE id = $7
            RETURNING id;
        `;
        const { rows } = await client.query(updateGuideQuery, [
            groupId,
            title.trim(),
            functionDesc,
            importantNote || null,
            videoUrl || null,
            videoDescription || null,
            guideId
        ]);

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Guide not found' });
        }

        // Replace steps
        await client.query('DELETE FROM guide_steps WHERE guide_id = $1', [guideId]);

        if (Array.isArray(steps) && steps.length > 0) {
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

        res.json({ message: 'Guide updated successfully', id: guideId });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

// DELETE guide (ITAdmin only)
router.delete('/guides/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    const { id } = req.params;
    const guideId = parseInt(id, 10);

    if (isNaN(guideId)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    enqueueTask(guideId, async () => {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const queryText = `
                DELETE FROM guide
                WHERE id = $1
                RETURNING id, video_url AS "videoUrl";
            `;
            const { rows } = await client.query(queryText, [guideId]);

            if (rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Guide not found' });
            }

            const videoUrl = rows[0].videoUrl;

            // Optional video file removal if local file path is tracked
            if (videoUrl) {
                let cleanPath = videoUrl.trim();
                cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
                const absoluteFilePath = path.join(__dirname, '../public', cleanPath);

                try {
                    if (fs.existsSync(absoluteFilePath)) {
                        fs.unlinkSync(absoluteFilePath);
                    }
                } catch (fileErr) {
                    console.warn(`Failed to delete associated video file:`, fileErr.message);
                }
            }

            await client.query('COMMIT');

            res.json({
                message: 'Guide deleted successfully',
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

// =============================================================
// 4. FILE UPLOAD ROUTE (ITAdmin only)
// =============================================================

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
                    res.status(413).json({ error: 'Maximum video upload limit is 500 MB' });
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
                let titleParam = 'untitled';

                for (const part of parts) {
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
                        error: `File must be a supported video format (${ALLOWED_VIDEO_EXTENSIONS.join(', ')})`
                    });
                }

                const safeTitleFolder = titleParam.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
                const targetDir = path.join(__dirname, '../public/videos', safeTitleFolder);

                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const timestamp = Date.now();
                const safeFilename = `${timestamp}${extension}`;
                const filepath = path.join(targetDir, safeFilename);

                fs.writeFileSync(filepath, videoBuffer);

                const videoUrl = `/videos/${safeTitleFolder}/${safeFilename}`;
                return res.json({ videoPath: videoUrl });

            } catch (error) {
                next(error);
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
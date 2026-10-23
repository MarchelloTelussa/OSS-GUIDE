import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/session.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.mov', '.webm', '.ogv', '.ogg'];
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

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

/**
 * Helper untuk menghapus file fisik beserta folder parent-nya jika kosong
 */
function cleanupFileAndParentDir(relPath) {
    if (!relPath) return;

    let cleanPath = relPath.trim();
    cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
    const absolutePath = path.join(__dirname, '../public', cleanPath);

    try {
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);

            // Hapus folder parent (misal folder guide) jika kosong
            const parentDir = path.dirname(absolutePath);
            if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
                fs.rmdirSync(parentDir);

                // Hapus folder grandparent (misal folder type) jika kosong
                const grandParentDir = path.dirname(parentDir);
                if (fs.existsSync(grandParentDir) && fs.readdirSync(grandParentDir).length === 0) {
                    fs.rmdirSync(grandParentDir);
                }
            }
        }
    } catch (err) {
        console.warn('Pembersihan file fisik gagal:', err.message);
    }
}

// =============================================================
// 1. TYPE ROUTES (CRUD)
// =============================================================

// GET all types (termasuk field parent_slug / parentSlug)
router.get('/types', async (req, res, next) => {
    try {
        const queryText = `
            SELECT id, parent_slug AS "parentSlug", title, description, image_url AS "imgUrl", created_at, updated_at
            FROM type
            ORDER BY id ASC;
        `;
        const { rows } = await db.query(queryText);
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// GET single type by ID (termasuk parentSlug & nested groups)
router.get('/types/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const queryText = `
            SELECT 
                t.id, 
                t.parent_slug AS "parentSlug",
                t.title, 
                t.description, 
                t.image_url AS "imgUrl",
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
        const { parentSlug, title, description, imgUrl } = req.body;
        
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title field is required' });
        }

        const trimmedTitle = title.trim();
        const validParentSlug = parentSlug && ['web', 'mobile'].includes(parentSlug) ? parentSlug : 'web';

        // Cek Duplikasi Nama Type
        const checkDuplicate = await db.query(
            `SELECT id FROM type 
            WHERE REPLACE(LOWER(TRIM(title)), ' ', '') = REPLACE(LOWER(TRIM($1)), ' ', '')`,
            [trimmedTitle]
        );

        if (checkDuplicate.rows.length > 0) {
            return res.status(400).json({ error: `Type dengan nama "${trimmedTitle}" sudah ada. Silakan gunakan nama lain.` });
        }

        const queryText = `
            INSERT INTO type (parent_slug, title, description, image_url)
            VALUES ($1, $2, $3, $4)
            RETURNING id, parent_slug AS "parentSlug", title, description, image_url AS "imgUrl";
        `;
        const { rows } = await db.query(queryText, [
            validParentSlug,
            trimmedTitle, 
            description || '', 
            imgUrl || ''
        ]);

        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// PUT update type (ITAdmin only + Auto-Rename Folder & Path Sync)
router.put('/types/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    const { id } = req.params;
    const { parentSlug, title, description, imgUrl } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title field is required' });
    }

    const newTitle = title.trim();
    const validParentSlug = parentSlug && ['web', 'mobile'].includes(parentSlug) ? parentSlug : 'web';

    // Cek Duplikasi Nama Type (abaikan ID yang sedang di-edit)
    const checkDuplicate = await db.query(
        `SELECT id FROM type 
        WHERE REPLACE(LOWER(TRIM(title)), ' ', '') = REPLACE(LOWER(TRIM($1)), ' ', '') 
        AND id != $2`,
        [newTitle, id]
    );

    if (checkDuplicate.rows.length > 0) {
        return res.status(400).json({ error: `Type dengan nama "${newTitle}" sudah digunakan oleh Type lain.` });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Ambil data lama sebelum di-update
        const oldTypeRes = await client.query('SELECT title, image_url FROM type WHERE id = $1', [id]);
        if (oldTypeRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Type not found' });
        }

        const oldTitle = oldTypeRes.rows[0].title;

        // 2. Sanitasi nama folder lama dan baru
        const oldSafeFolder = oldTitle.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
        const newSafeFolder = newTitle.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');

        let finalImgUrl = imgUrl || '';

        // 3. Jika nama Type berubah, ubah nama folder fisik di server
        if (oldSafeFolder !== newSafeFolder) {
            // A. Rename Folder Gambar (/public/img/{old} -> /public/img/{new})
            const oldImgDir = path.join(__dirname, '../public/img', oldSafeFolder);
            const newImgDir = path.join(__dirname, '../public/img', newSafeFolder);

            if (fs.existsSync(oldImgDir)) {
                if (!fs.existsSync(path.dirname(newImgDir))) {
                    fs.mkdirSync(path.dirname(newImgDir), { recursive: true });
                }
                fs.renameSync(oldImgDir, newImgDir);
            }

            // Update path image_url jika gambar masih menggunakan folder lama
            if (finalImgUrl && finalImgUrl.includes(`/img/${oldSafeFolder}/`)) {
                finalImgUrl = finalImgUrl.replace(`/img/${oldSafeFolder}/`, `/img/${newSafeFolder}/`);
            }

            // B. Rename Folder Video (/public/videos/{old} -> /public/videos/{new})
            const oldVideoDir = path.join(__dirname, '../public/videos', oldSafeFolder);
            const newVideoDir = path.join(__dirname, '../public/videos', newSafeFolder);

            if (fs.existsSync(oldVideoDir)) {
                if (!fs.existsSync(path.dirname(newVideoDir))) {
                    fs.mkdirSync(path.dirname(newVideoDir), { recursive: true });
                }
                fs.renameSync(oldVideoDir, newVideoDir);
            }

            // C. Sync seluruh video_url di tabel 'guide' yang terikat dengan Type ini
            const updateGuideVideosQuery = `
                UPDATE guide
                SET video_url = REPLACE(video_url, $1, $2)
                WHERE group_id IN (
                    SELECT id FROM guide_groups WHERE type_id = $3
                ) AND video_url LIKE $4;
            `;
            const oldPathPrefix = `/videos/${oldSafeFolder}/`;
            const newPathPrefix = `/videos/${newSafeFolder}/`;

            await client.query(updateGuideVideosQuery, [
                oldPathPrefix,
                newPathPrefix,
                id,
                `${oldPathPrefix}%`
            ]);
        }

        // 4. Update tabel Type di Database
        const updateTypeQuery = `
            UPDATE type
            SET parent_slug = $1, title = $2, description = $3, image_url = $4
            WHERE id = $5
            RETURNING id, parent_slug AS "parentSlug", title, description, image_url AS "imgUrl";
        `;
        const { rows } = await client.query(updateTypeQuery, [
            validParentSlug,
            newTitle, 
            description || '', 
            finalImgUrl, 
            id
        ]);

        await client.query('COMMIT');

        res.json(rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

// DELETE type (ITAdmin only + File & Folder Cleanup)
router.delete('/types/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    const { id } = req.params;
    try {
        const typeRes = await db.query('SELECT title, image_url FROM type WHERE id = $1', [id]);
        if (typeRes.rows.length === 0) {
            return res.status(404).json({ error: 'Type not found' });
        }

        const { title, image_url } = typeRes.rows[0];

        const videosRes = await db.query(`
            SELECT g.video_url 
            FROM guide g 
            JOIN guide_groups gg ON g.group_id = gg.id 
            WHERE gg.type_id = $1
        `, [id]);

        await db.query('DELETE FROM type WHERE id = $1', [id]);

        if (image_url) cleanupFileAndParentDir(image_url);

        videosRes.rows.forEach(row => {
            if (row.video_url) cleanupFileAndParentDir(row.video_url);
        });

        const safeTypeFolder = title.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
        const imgTypeDir = path.join(__dirname, '../public/img', safeTypeFolder);
        const videoTypeDir = path.join(__dirname, '../public/videos', safeTypeFolder);

        if (fs.existsSync(imgTypeDir)) fs.rmSync(imgTypeDir, { recursive: true, force: true });
        if (fs.existsSync(videoTypeDir)) fs.rmSync(videoTypeDir, { recursive: true, force: true });

        res.json({ message: 'Type successfully deleted', deletedId: id });
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
                            'views', g.viewcount
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
            description || '',
            groupOrder || 0
        ]);

        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
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
        const { groupId, title, functionDesc, importantNote, videoUrl, steps } = req.body;

        if (!groupId || !title || !functionDesc) {
            return res.status(400).json({ error: 'groupId, title, and functionDesc are required' });
        }

        await client.query('BEGIN');

        // 1. Ambil data video_url lama dari database sebelum di-update
        const oldGuideRes = await client.query('SELECT video_url FROM guide WHERE id = $1', [guideId]);
        if (oldGuideRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Guide tidak ditemukan' });
        }
        const oldVideoUrl = oldGuideRes.rows[0].video_url;

        // 2. Update data guide di database
        const updateGuideQuery = `
            UPDATE guide
            SET group_id = $1, title = $2, function_desc = $3, important_note = $4, video_url = $5
            WHERE id = $6
            RETURNING id;
        `;
        const { rows } = await client.query(updateGuideQuery, [
            groupId,
            title.trim(),
            functionDesc,
            importantNote || '',
            videoUrl || '',
            guideId
        ]);

        // 3. Replace steps
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

        // 4. PEMBERSIHAN: Jika ada video baru dan videoUrl lama berbeda, hapus video lama dari server
        if (oldVideoUrl && videoUrl && oldVideoUrl !== videoUrl) {
            cleanupFileAndParentDir(oldVideoUrl);
        }

        res.json({ message: 'Guide updated successfully', id: guideId });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
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
        const { groupId, title, functionDesc, importantNote, videoUrl, steps } = req.body;

        if (!groupId || !title || !functionDesc) {
            return res.status(400).json({ error: 'groupId, title, and functionDesc are required' });
        }

        await client.query('BEGIN');

        const guideQuery = `
            INSERT INTO guide (group_id, title, function_desc, important_note, video_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const guideResult = await client.query(guideQuery, [
            groupId,
            title.trim(),
            functionDesc,
            importantNote || '',
            videoUrl || ''
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
        const { groupId, title, functionDesc, importantNote, videoUrl, steps } = req.body;

        if (!groupId || !title || !functionDesc) {
            return res.status(400).json({ error: 'groupId, title, and functionDesc are required' });
        }

        await client.query('BEGIN');

        const updateGuideQuery = `
            UPDATE guide
            SET group_id = $1, title = $2, function_desc = $3, important_note = $4, video_url = $5
            WHERE id = $6
            RETURNING id;
        `;
        const { rows } = await client.query(updateGuideQuery, [
            groupId,
            title.trim(),
            functionDesc,
            importantNote || '',
            videoUrl || '',
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

// DELETE guide (ITAdmin only + File & Folder Cleanup)
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

            await client.query('COMMIT');

            // Hapus file video fisik beserta foldernya jika ada
            if (videoUrl) {
                cleanupFileAndParentDir(videoUrl);
            }

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
// 4. FILE UPLOAD ROUTES (ITAdmin only)
// =============================================================

// Endpoint Upload Video: /public/videos/{typeName}/{guideTitle}/{filename}
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

        req.on('end', async () => {
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
                let groupIdParam = null;
                let titleParam = 'untitled';

                // Parsing multipart form data secara manual
                for (const part of parts) {
                    if (part.includes('name="groupId"')) {
                        const contentStart = part.indexOf('\r\n\r\n') + 4;
                        const contentEnd = part.lastIndexOf('\r\n');
                        groupIdParam = part.substring(contentStart, contentEnd).trim();
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
                        error: `File must be a supported video format (${ALLOWED_VIDEO_EXTENSIONS.join(', ')})`
                    });
                }

                // -------------------------------------------------------------
                // BUKTI LOGIKA: CARI NAMA TYPE DARI DATABASE BERDASARKAN groupId
                // -------------------------------------------------------------
                let typeNameFound = 'general';
                if (groupIdParam) {
                    const typeQuery = `
                        SELECT t.title 
                        FROM guide_groups gg 
                        JOIN type t ON gg.type_id = t.id 
                        WHERE gg.id = $1;
                    `;
                    const typeResult = await db.query(typeQuery, [groupIdParam]);
                    if (typeResult.rows.length > 0) {
                        typeNameFound = typeResult.rows[0].title;
                    }
                }

                // Sanitasi nama folder agar aman di sistem berkas (Linux/Windows)
                const safeTypeFolder = typeNameFound.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
                const safeTitleFolder = titleParam.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
                
                // Target: /public/videos/{typeName}/{guideTitle}
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

            } catch (error) {
                next(error);
            }
        });
    } catch (error) {
        next(error);
    }
});

// Endpoint Upload Gambar: /public/img/{typeName}/{filename}
router.post('/upload-image', requireAuth('ITAdmin'), async (req, res, next) => {
    try {
        const chunks = [];
        let received = 0;
        let tooLarge = false;

        req.on('data', (chunk) => {
            received += chunk.length;
            if (received > MAX_IMAGE_SIZE) {
                if (!tooLarge) {
                    tooLarge = true;
                    chunks.length = 0;
                    res.status(413).json({ error: 'Ukuran gambar maksimal 10 MB' });
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

                let imageBuffer = null;
                let imageFilename = '';
                let typeNameParam = 'default';

                for (const part of parts) {
                    if (part.includes('name="typeName"')) {
                        const contentStart = part.indexOf('\r\n\r\n') + 4;
                        const contentEnd = part.lastIndexOf('\r\n');
                        typeNameParam = part.substring(contentStart, contentEnd).trim() || 'default';
                    }
                    if (part.includes('filename=')) {
                        const filenameMatch = part.match(/filename="([^"]+)"/);
                        if (filenameMatch) {
                            imageFilename = filenameMatch[1];
                            const contentStart = part.indexOf('\r\n\r\n') + 4;
                            const contentEnd = part.lastIndexOf('\r\n');
                            const content = part.substring(contentStart, contentEnd);
                            imageBuffer = Buffer.from(content, 'binary');
                        }
                    }
                }

                if (!imageBuffer || !imageFilename) {
                    return res.status(400).json({ error: 'File gambar tidak ditemukan' });
                }

                const extension = path.extname(imageFilename).toLowerCase();
                if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
                    return res.status(400).json({
                        error: `Format gambar harus berupa (${ALLOWED_IMAGE_EXTENSIONS.join(', ')})`
                    });
                }

                const safeTypeFolder = typeNameParam.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
                const targetDir = path.join(__dirname, '../public/img', safeTypeFolder);

                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const timestamp = Date.now();
                const safeFilename = `img_${timestamp}${extension}`;
                const filepath = path.join(targetDir, safeFilename);

                fs.writeFileSync(filepath, imageBuffer);

                const imageRelPath = `/img/${safeTypeFolder}/${safeFilename}`;
                return res.json({ imgUrl: imageRelPath });

            } catch (error) {
                next(error);
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
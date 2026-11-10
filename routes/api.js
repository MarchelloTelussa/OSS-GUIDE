import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/session.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logActivity, getActivityLogs } from '../middleware/logger.js';

// Import fungsi sanitasi dari middleware
import { cleanText, cleanRichText } from '../middleware/inputSanitize.js';

const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.mov', '.webm', '.ogv', '.ogg'];
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Synchronize concurrent write/delete tasks per guide
const taskLocks = new Map();

function enqueueTask(key, taskFn) {
    const lockKey = String(key);
    const previousTask = taskLocks.get(lockKey) || Promise.resolve();

    const currentTask = previousTask
        .then(() => taskFn())
        .finally(() => {
            if (taskLocks.get(lockKey) === currentTask) {
                taskLocks.delete(lockKey);
            }
        });

    taskLocks.set(lockKey, currentTask);
    return currentTask;
}

function sanitizeFolderName(str) {
    const sanitized = cleanText(str);
    return (sanitized || 'default')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_');
}

function looksLikeVideo(buf, ext) {
    if (!buf || buf.length < 4) return false;
    if (['.mp4', '.m4v', '.mov'].includes(ext)) {
        return buf.length > 12 && buf.toString('latin1', 4, 8) === 'ftyp';
    }
    if (ext === '.webm') {
        return buf.readUInt32BE(0) === 0x1A45DFA3;
    }
    return buf.toString('latin1', 0, 4) === 'OggS';
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

            const parentDir = path.dirname(absolutePath);
            if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
                fs.rmdirSync(parentDir);

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

/**
 * Custom Binary Multipart Parser (Aman memori & binary safe)
 */
function parseMultipartBuffer(buffer, boundary) {
    const boundaryBuf = Buffer.from(`--${boundary}`);
    const result = { fields: {}, files: {} };
    let start = buffer.indexOf(boundaryBuf);

    while (start !== -1) {
        const nextStart = buffer.indexOf(boundaryBuf, start + boundaryBuf.length);
        if (nextStart === -1) break;

        const part = buffer.subarray(start + boundaryBuf.length, nextStart);
        const headerEnd = part.indexOf('\r\n\r\n');

        if (headerEnd !== -1) {
            const headerStr = part.subarray(0, headerEnd).toString('utf8');
            const body = part.subarray(headerEnd + 4, part.length - 2);

            const nameMatch = headerStr.match(/name="([^"]+)"/);
            const filenameMatch = headerStr.match(/filename="([^"]+)"/);

            if (nameMatch) {
                const fieldName = nameMatch[1];
                if (filenameMatch) {
                    result.files[fieldName] = {
                        filename: filenameMatch[1],
                        data: body
                    };
                } else {
                    result.fields[fieldName] = body.toString('utf8').trim();
                }
            }
        }
        start = nextStart;
    }
    return result;
}

// =============================================================
// 1. TYPE ROUTES (CRUD)
// =============================================================

// GET all types
router.get('/types', async (req, res, next) => {
    /* 
        #swagger.tags = ['Types']
        #swagger.summary = 'Mendapatkan semua kategori Type'
        #swagger.description = 'Mengambil seluruh daftar Type panduan beserta metadata image dan slug.'
        #swagger.responses[200] = {
            description: 'Berhasil mendapatkan daftar Type.',
            schema: [{ id: 1, parentSlug: 'web', title: 'Web App', description: 'Panduan Web', imgUrl: '/img/web/img_1.png' }]
        }
    */
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

// GET single type by ID
router.get('/types/:id', async (req, res, next) => {
    /* 
        #swagger.tags = ['Types']
        #swagger.summary = 'Mendapatkan rincian Type berdasarkan ID'
        #swagger.description = 'Mengambil data Type spesifik beserta daftar Guide Groups yang ada di dalamnya.'
        #swagger.parameters['id'] = { description: 'ID dari Type' }
        #swagger.responses[200] = { description: 'Detail Type ditemukan' }
        #swagger.responses[404] = { description: 'Type tidak ditemukan' }
    */
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
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', g.id,
                                'title', g.title,
                                'description', g.description,
                                'groupOrder', g.group_order
                            ) ORDER BY g.group_order ASC
                        )
                        FROM guide_groups g
                        WHERE g.type_id = t.id
                    ),
                    '[]'::json
                ) AS groups
            FROM type t
            WHERE t.id = $1;
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
    /* 
        #swagger.tags = ['Types']
        #swagger.summary = 'Membuat Type baru (Khusus ITAdmin)'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Data Type baru',
            required: true,
            schema: {
                $parentSlug: 'web',
                $title: 'Frontend Vue.js',
                description: 'Panduan pengembangan aplikasi frontend Vue',
                imgUrl: '/img/frontend_vue.png'
            }
        }
        #swagger.responses[201] = { description: 'Type berhasil dibuat' }
        #swagger.responses[400] = { description: 'Title wajib diisi / Duplicate title' }
        #swagger.responses[401] = { description: 'Unauthorized' }
    */
    try {
        const { parentSlug, title, description, imgUrl } = req.body;
        const sanitizedTitle = cleanText(title);
        const sanitizedDesc = cleanRichText(description || '');

        if (!sanitizedTitle) {
            return res.status(400).json({ error: 'Title field is required' });
        }

        const validParentSlug = parentSlug && ['web', 'mobile', 'email'].includes(parentSlug) ? parentSlug : 'web';

        const checkDuplicate = await db.query(
            `SELECT id FROM type 
            WHERE REPLACE(LOWER(TRIM(title)), ' ', '') = REPLACE(LOWER(TRIM($1)), ' ', '')`,
            [sanitizedTitle]
        );

        if (checkDuplicate.rows.length > 0) {
            return res.status(400).json({ error: `Type dengan nama "${sanitizedTitle}" sudah ada. Silakan gunakan nama lain.` });
        }

        const queryText = `
            INSERT INTO type (parent_slug, title, description, image_url)
            VALUES ($1, $2, $3, $4)
            RETURNING id, parent_slug AS "parentSlug", title, description, image_url AS "imgUrl";
        `;
        const { rows } = await db.query(queryText, [
            validParentSlug,
            sanitizedTitle,
            sanitizedDesc,
            imgUrl || ''
        ]);
        await logActivity(req, `Create Type baru: ${rows[0].title} (ID: ${rows[0].id})`);
        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// PUT update type (ITAdmin only)
router.put('/types/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    /* 
        #swagger.tags = ['Types']
        #swagger.summary = 'Perbarui Type berdasarkan ID (Khusus ITAdmin)'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { description: 'ID Type yang diupdate' }
        #swagger.parameters['body'] = {
            in: 'body',
            required: true,
            schema: {
                $parentSlug: 'web',
                $title: 'Frontend Nuxt 3',
                description: 'Panduan updated',
                imgUrl: '/img/nuxt.png'
            }
        }
        #swagger.responses[200] = { description: 'Type berhasil diperbarui' }
        #swagger.responses[404] = { description: 'Type tidak ditemukan' }
    */
    const { id } = req.params;
    const { parentSlug, title, description, imgUrl } = req.body;

    const sanitizedTitle = cleanText(title);
    const sanitizedDesc = cleanRichText(description || '');

    if (!sanitizedTitle) {
        return res.status(400).json({ error: 'Title field is required' });
    }

    const validParentSlug = parentSlug && ['web', 'mobile', 'email'].includes(parentSlug) ? parentSlug : 'web';

    try {
        const checkDuplicate = await db.query(
            `SELECT id FROM type 
            WHERE REPLACE(LOWER(TRIM(title)), ' ', '') = REPLACE(LOWER(TRIM($1)), ' ', '') 
            AND id != $2`,
            [sanitizedTitle, id]
        );

        if (checkDuplicate.rows.length > 0) {
            return res.status(400).json({ error: `Type dengan nama "${sanitizedTitle}" sudah digunakan oleh Type lain.` });
        }
    } catch (err) {
        return next(err);
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const oldTypeRes = await client.query('SELECT title, image_url FROM type WHERE id = $1', [id]);
        if (oldTypeRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Type not found' });
        }

        const oldTitle = oldTypeRes.rows[0].title;
        const oldSafeFolder = sanitizeFolderName(oldTitle);
        const newSafeFolder = sanitizeFolderName(sanitizedTitle);

        let finalImgUrl = imgUrl || '';

        if (oldSafeFolder !== newSafeFolder) {
            const oldImgDir = path.join(__dirname, '../public/img', oldSafeFolder);
            const newImgDir = path.join(__dirname, '../public/img', newSafeFolder);

            if (fs.existsSync(oldImgDir)) {
                if (!fs.existsSync(path.dirname(newImgDir))) {
                    fs.mkdirSync(path.dirname(newImgDir), { recursive: true });
                }
                fs.renameSync(oldImgDir, newImgDir);
            }

            if (finalImgUrl && finalImgUrl.includes(`/img/${oldSafeFolder}/`)) {
                finalImgUrl = finalImgUrl.replace(`/img/${oldSafeFolder}/`, `/img/${newSafeFolder}/`);
            }

            const oldVideoDir = path.join(__dirname, '../public/videos', oldSafeFolder);
            const newVideoDir = path.join(__dirname, '../public/videos', newSafeFolder);

            if (fs.existsSync(oldVideoDir)) {
                if (!fs.existsSync(path.dirname(newVideoDir))) {
                    fs.mkdirSync(path.dirname(newVideoDir), { recursive: true });
                }
                fs.renameSync(oldVideoDir, newVideoDir);
            }

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

        const updateTypeQuery = `
            UPDATE type
            SET parent_slug = $1, title = $2, description = $3, image_url = $4
            WHERE id = $5
            RETURNING id, parent_slug AS "parentSlug", title, description, image_url AS "imgUrl";
        `;
        const { rows } = await client.query(updateTypeQuery, [
            validParentSlug,
            sanitizedTitle,
            sanitizedDesc,
            finalImgUrl,
            id
        ]);

        await client.query('COMMIT');

        await logActivity(req, `Update Type: "${oldTitle}" menjadi "${rows[0].title}" (ID: ${rows[0].id})`);
        res.json(rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

// DELETE type (ITAdmin only)
router.delete('/types/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    /* 
        #swagger.tags = ['Types']
        #swagger.summary = 'Hapus Type (Khusus ITAdmin)'
        #swagger.description = 'Menghapus Type beserta file fisik gambar & video terkait secara permanen.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { description: 'ID Type yang dihapus' }
        #swagger.responses[200] = { description: 'Type berhasil dihapus' }
        #swagger.responses[404] = { description: 'Type tidak ditemukan' }
    */
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

        const safeTypeFolder = sanitizeFolderName(title);
        const imgTypeDir = path.join(__dirname, '../public/img', safeTypeFolder);
        const videoTypeDir = path.join(__dirname, '../public/videos', safeTypeFolder);

        if (fs.existsSync(imgTypeDir)) fs.rmSync(imgTypeDir, { recursive: true, force: true });
        if (fs.existsSync(videoTypeDir)) fs.rmSync(videoTypeDir, { recursive: true, force: true });

        await logActivity(req, `Delete Type: "${title}" (ID: ${id})`);
        res.json({ message: 'Type successfully deleted', deletedId: id });
    } catch (error) {
        next(error);
    }
});

// =============================================================
// 2. GUIDE GROUPS ROUTES (CRUD)
// =============================================================

router.get('/groups', async (req, res, next) => {
    /* 
        #swagger.tags = ['Guide Groups']
        #swagger.summary = 'Mendapatkan daftar Guide Groups'
        #swagger.description = 'Mengambil seluruh kelompok panduan. Bisa difilter berdasarkan typeId.'
        #swagger.parameters['typeId'] = {
            in: 'query',
            description: 'Filter berdasarkan ID Type',
            required: false,
            type: 'integer'
        }
        #swagger.responses[200] = { description: 'Daftar Guide Groups berhasil diambil' }
    */
    const { typeId } = req.query;
    try {
        let queryText = `
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
                            'functionDesc', g.function_desc
                        ) ORDER BY g.id ASC
                    ) FILTER (WHERE g.id IS NOT NULL),
                    '[]'
                ) AS guides
            FROM guide_groups gg
            LEFT JOIN guide g ON gg.id = g.group_id
        `;
        const params = [];

        if (typeId) {
            queryText += ` WHERE gg.type_id = $1`;
            params.push(typeId);
        }

        queryText += ` GROUP BY gg.id ORDER BY gg.group_order ASC, gg.id ASC;`;

        const { rows } = await db.query(queryText, params);
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

router.get('/groups/:id', async (req, res, next) => {
    /* 
        #swagger.tags = ['Guide Groups']
        #swagger.summary = 'Mendapatkan rincian Guide Group berdasarkan ID'
        #swagger.parameters['id'] = { description: 'ID Guide Group' }
        #swagger.responses[200] = { description: 'Detail Guide Group ditemukan' }
        #swagger.responses[404] = { description: 'Guide Group tidak ditemukan' }
    */
    const { id } = req.params;
    try {
        const queryText = `
            SELECT 
                gg.id,
                gg.type_id AS "typeId",
                gg.title,
                gg.description,
                gg.group_order AS "groupOrder",
                json_build_object(
                    'id', gt.id,
                    'name', gt.title
                ) AS type,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', g.id,
                                'title', g.title,
                                'functionDesc', g.function_desc,
                                'views', g.viewcount
                            ) ORDER BY g.id ASC
                        )
                        FROM guide g
                        WHERE g.group_id = gg.id
                    ),
                    '[]'::json
                ) AS guides
            FROM guide_groups gg
            INNER JOIN type gt ON gg.type_id = gt.id
            WHERE gg.id = $1;
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

router.post('/groups', requireAuth('ITAdmin'), async (req, res, next) => {
    /* 
        #swagger.tags = ['Guide Groups']
        #swagger.summary = 'Membuat Guide Group baru (Khusus ITAdmin)'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['body'] = {
            in: 'body',
            required: true,
            schema: {
                $typeId: 1,
                $title: 'Autentikasi & Otorisasi',
                description: 'Kelompok panduan autentikasi',
                groupOrder: 1
            }
        }
        #swagger.responses[201] = { description: 'Guide Group berhasil dibuat' }
    */
    try {
        const { typeId, title, description, groupOrder } = req.body;

        const sanitizedTitle = cleanText(title);
        const sanitizedDesc = cleanRichText(description || '');

        if (!typeId || !sanitizedTitle) {
            return res.status(400).json({ error: 'typeId and title are required' });
        }

        const queryText = `
            INSERT INTO guide_groups (type_id, title, description, group_order)
            VALUES ($1, $2, $3, $4)
            RETURNING id, type_id AS "typeId", title, description, group_order AS "groupOrder";
        `;
        const { rows } = await db.query(queryText, [
            typeId,
            sanitizedTitle,
            sanitizedDesc,
            groupOrder || 0
        ]);

        await logActivity(req, `Create Group baru: "${rows[0].title}" (ID: ${rows[0].id})`);
        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
});

router.put('/groups/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    /* 
        #swagger.tags = ['Guide Groups']
        #swagger.summary = 'Perbarui Guide Group (Khusus ITAdmin)'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { description: 'ID Group' }
        #swagger.parameters['body'] = {
            in: 'body',
            required: true,
            schema: {
                $typeId: 1,
                $title: 'Autentikasi JWT',
                description: 'Panduan Auth',
                groupOrder: 2
            }
        }
        #swagger.responses[200] = { description: 'Guide Group berhasil diperbarui' }
    */
    const { id } = req.params;
    const { typeId, title, description, groupOrder } = req.body;

    const sanitizedTitle = cleanText(title);
    const sanitizedDesc = cleanRichText(description || '');

    if (!typeId) {
        return res.status(400).json({ error: 'typeId wajib diisi.' });
    }
    if (!sanitizedTitle) {
        return res.status(400).json({ error: 'title wajib diisi.' });
    }

    try {
        const oldGroupRes = await db.query('SELECT title FROM guide_groups WHERE id = $1', [id]);
        const oldTitle = oldGroupRes.rows.length > 0 ? oldGroupRes.rows[0].title : '';

        const queryText = `
            UPDATE guide_groups
            SET type_id = $1, title = $2, description = $3, group_order = $4
            WHERE id = $5
            RETURNING id, type_id AS "typeId", title, description, group_order AS "groupOrder";
        `;
        const { rows } = await db.query(queryText, [typeId, sanitizedTitle, sanitizedDesc, groupOrder || 0, id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Guide Group tidak ditemukan.' });
        }

        if (oldTitle && oldTitle !== rows[0].title) {
            await logActivity(req, `Update Group: "${oldTitle}" menjadi "${rows[0].title}" (ID: ${rows[0].id})`);
        } else {
            await logActivity(req, `Update Group: "${rows[0].title}" (ID: ${rows[0].id})`);
        }

        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

router.delete('/groups/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    /* 
        #swagger.tags = ['Guide Groups']
        #swagger.summary = 'Hapus Guide Group (Khusus ITAdmin)'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { description: 'ID Group yang akan dihapus' }
        #swagger.responses[200] = { description: 'Group berhasil dihapus' }
    */
    const { id } = req.params;
    try {
        const queryText = `
            DELETE FROM guide_groups
            WHERE id = $1
            RETURNING id, title;
        `;
        const { rows } = await db.query(queryText, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Guide Group not found' });
        }

        await logActivity(req, `Delete Group: "${rows[0].title}" (ID: ${rows[0].id})`);
        res.json({ message: 'Guide Group successfully deleted', deletedId: rows[0].id });
    } catch (error) {
        next(error);
    }
});

// =============================================================
// 3. GUIDE ROUTES (CRUD)
// =============================================================

router.get('/guides', async (req, res, next) => {
    /* 
        #swagger.tags = ['Guides']
        #swagger.summary = 'Mendapatkan semua item Guide'
        #swagger.parameters['groupId'] = {
            in: 'query',
            description: 'Filter berdasarkan Group ID',
            required: false,
            type: 'integer'
        }
        #swagger.responses[200] = { description: 'Daftar Guide berhasil diperoleh' }
    */
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

router.get('/guides/:id', async (req, res, next) => {
    /* 
        #swagger.tags = ['Guides']
        #swagger.summary = 'Mendapatkan rincian Guide & Langkah-langkahnya (Steps)'
        #swagger.parameters['id'] = { description: 'ID Guide' }
        #swagger.responses[200] = { description: 'Detail Guide & Steps ditemukan' }
        #swagger.responses[404] = { description: 'Guide tidak ditemukan' }
    */
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

router.post('/guides/:id/view', async (req, res, next) => {
    /* 
        #swagger.tags = ['Guides']
        #swagger.summary = 'Menambah jumlah view (viewcount) Guide'
        #swagger.parameters['id'] = { description: 'ID Guide yang dikunjungi' }
        #swagger.responses[200] = { description: 'Viewcount bertambah' }
    */
    const { id } = req.params;
    try {
        const result = await db.query(
            'UPDATE guide SET viewcount = viewcount + 1 WHERE id = $1 RETURNING viewcount, title',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        await logActivity(req, `View Guide: "${result.rows[0].title}" (ID: ${id})`);
        res.json({ views: result.rows[0].viewcount });
    } catch (error) {
        next(error);
    }
});

// POST create guide
router.post('/guides', requireAuth('ITAdmin'), async (req, res, next) => {
    /* 
        #swagger.tags = ['Guides']
        #swagger.summary = 'Membuat Guide baru beserta Steps (Khusus ITAdmin)'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['body'] = {
            in: 'body',
            required: true,
            schema: {
                $groupId: 1,
                $title: 'Cara Setup Environment Variable',
                $functionDesc: 'Panduan konfigurasi file .env',
                importantNote: 'Pastikan file .env disembunyikan di .gitignore',
                videoUrl: '/videos/web/guide/env.mp4',
                steps: [
                    'Buat file .env di root',
                    'Tambahkan PORT=3000'
                ]
            }
        }
        #swagger.responses[201] = { description: 'Guide berhasil dibuat' }
    */
    const client = await db.getClient();
    try {
        const { groupId, title, functionDesc, importantNote, videoUrl, steps } = req.body;

        const sanitizedTitle = cleanText(title);
        const sanitizedFunctionDesc = cleanRichText(functionDesc || '');
        const sanitizedImportantNote = cleanRichText(importantNote || '');

        if (!groupId || !sanitizedTitle || !sanitizedFunctionDesc) {
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
            sanitizedTitle,
            sanitizedFunctionDesc,
            sanitizedImportantNote,
            videoUrl || ''
        ]);
        const guideId = guideResult.rows[0].id;

        if (Array.isArray(steps) && steps.length > 0) {
            const stepsQuery = `
                INSERT INTO guide_steps (guide_id, step_order, step_description)
                VALUES ($1, $2, $3);
            `;
            const cleanSteps = steps
                .map(s => cleanRichText(String(s)))
                .filter(Boolean);

            for (let i = 0; i < cleanSteps.length; i++) {
                await client.query(stepsQuery, [guideId, i + 1, cleanSteps[i]]);
            }
        }

        await client.query('COMMIT');

        await logActivity(req, `Create Guide baru: "${sanitizedTitle}" (ID: ${guideId})`);
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

// PUT update guide
router.put('/guides/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    /* 
        #swagger.tags = ['Guides']
        #swagger.summary = 'Perbarui Guide & Steps (Khusus ITAdmin)'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { description: 'ID Guide' }
        #swagger.parameters['body'] = {
            in: 'body',
            required: true,
            schema: {
                $groupId: 1,
                $title: 'Cara Setup Environment Variable Update',
                $functionDesc: 'Penjelasan baru',
                importantNote: 'Catatan tambahan',
                videoUrl: '/videos/web/guide/env_v2.mp4',
                steps: ['Langkah 1 revisi', 'Langkah 2 revisi']
            }
        }
        #swagger.responses[200] = { description: 'Guide berhasil diperbarui' }
    */
    const { id } = req.params;
    const guideId = parseInt(id, 10);

    if (isNaN(guideId)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    const client = await db.getClient();
    try {
        const { groupId, title, functionDesc, importantNote, videoUrl, steps } = req.body;

        const sanitizedTitle = cleanText(title);
        const sanitizedFunctionDesc = cleanRichText(functionDesc || '');
        const sanitizedImportantNote = cleanRichText(importantNote || '');

        if (!groupId || !sanitizedTitle || !sanitizedFunctionDesc) {
            return res.status(400).json({ error: 'groupId, title, and functionDesc are required' });
        }

        await client.query('BEGIN');

        const oldGuideRes = await client.query('SELECT title, video_url FROM guide WHERE id = $1', [guideId]);
        if (oldGuideRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Guide tidak ditemukan' });
        }
        const oldTitle = oldGuideRes.rows[0].title;
        const oldVideoUrl = oldGuideRes.rows[0].video_url;

        const updateGuideQuery = `
            UPDATE guide
            SET group_id = $1, title = $2, function_desc = $3, important_note = $4, video_url = $5
            WHERE id = $6
            RETURNING id;
        `;
        await client.query(updateGuideQuery, [
            groupId,
            sanitizedTitle,
            sanitizedFunctionDesc,
            sanitizedImportantNote,
            videoUrl || '',
            guideId
        ]);

        await client.query('DELETE FROM guide_steps WHERE guide_id = $1', [guideId]);

        if (Array.isArray(steps) && steps.length > 0) {
            const cleanSteps = steps
                .map(s => cleanRichText(String(s)))
                .filter(Boolean);

            for (let i = 0; i < cleanSteps.length; i++) {
                await client.query(
                    `INSERT INTO guide_steps (guide_id, step_order, step_description)
                     VALUES ($1, $2, $3);`,
                    [guideId, i + 1, cleanSteps[i]]
                );
            }
        }

        await client.query('COMMIT');

        if (oldVideoUrl && videoUrl && oldVideoUrl !== videoUrl) {
            cleanupFileAndParentDir(oldVideoUrl);
        }

        if (oldTitle && oldTitle !== sanitizedTitle) {
            await logActivity(req, `Update Guide: "${oldTitle}" menjadi "${sanitizedTitle}" (ID: ${guideId})`);
        } else {
            await logActivity(req, `Update Guide: "${sanitizedTitle}" (ID: ${guideId})`);
        }

        res.json({ message: 'Guide updated successfully', id: guideId });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

// DELETE guide
router.delete('/guides/:id', requireAuth('ITAdmin'), async (req, res, next) => {
    /* 
        #swagger.tags = ['Guides']
        #swagger.summary = 'Hapus Guide (Khusus ITAdmin)'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { description: 'ID Guide yang akan dihapus' }
        #swagger.responses[200] = { description: 'Guide dan video terkait berhasil dihapus' }
    */
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
                RETURNING id, title, video_url AS "videoUrl";
            `;
            const { rows } = await client.query(queryText, [guideId]);

            if (rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Guide not found' });
            }

            const deletedTitle = rows[0].title;
            const videoUrl = rows[0].videoUrl;

            await client.query('COMMIT');

            if (videoUrl) {
                cleanupFileAndParentDir(videoUrl);
            }

            await logActivity(req, `Delete Guide: "${deletedTitle}" (ID: ${guideId})`);

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

router.post('/upload-video', requireAuth('ITAdmin'), async (req, res, next) => {
    /* 
        #swagger.tags = ['Uploads']
        #swagger.summary = 'Upload File Video Panduan (Khusus ITAdmin)'
        #swagger.description = 'Upload file video (Maks: 500MB). Disimpan dalam folder terstruktur berdasarkan Type & Title.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.consumes = ['multipart/form-data']
        #swagger.parameters['video'] = {
            in: 'formData',
            type: 'file',
            required: true,
            description: 'File video (mp4, m4v, mov, webm, ogv, ogg)'
        }
        #swagger.parameters['groupId'] = { in: 'formData', type: 'string' }
        #swagger.parameters['title'] = { in: 'formData', type: 'string' }
        #swagger.responses[200] = { description: 'Video berhasil di-upload', schema: { videoPath: '/videos/web/title/123.mp4' } }
        #swagger.responses[413] = { description: 'Ukuran file melebihi batas 500 MB' }
    */
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

                const parsed = parseMultipartBuffer(buffer, boundaryMatch[1]);
                const videoFile = parsed.files['video'] || Object.values(parsed.files)[0];
                const groupIdParam = parsed.fields['groupId'];
                const titleParam = cleanText(parsed.fields['title']) || 'untitled';

                if (!videoFile || !videoFile.filename) {
                    return res.status(400).json({ error: 'No video file provided' });
                }

                const extension = path.extname(videoFile.filename).toLowerCase();
                if (!ALLOWED_VIDEO_EXTENSIONS.includes(extension) || !looksLikeVideo(videoFile.data, extension)) {
                    return res.status(400).json({
                        error: `File must be a supported video format (${ALLOWED_VIDEO_EXTENSIONS.join(', ')})`
                    });
                }

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

                const safeTypeFolder = sanitizeFolderName(typeNameFound);
                const safeTitleFolder = sanitizeFolderName(titleParam);
                
                const targetDir = path.join(__dirname, '../public/videos', safeTypeFolder, safeTitleFolder);

                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const timestamp = Date.now();
                const safeFilename = `${timestamp}${extension}`;
                const filepath = path.join(targetDir, safeFilename);

                fs.writeFileSync(filepath, videoFile.data);

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

router.post('/upload-image', requireAuth('ITAdmin'), async (req, res, next) => {
    /* 
        #swagger.tags = ['Uploads']
        #swagger.summary = 'Upload File Gambar Type (Khusus ITAdmin)'
        #swagger.description = 'Upload gambar cover Type (Maks: 10MB).'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.consumes = ['multipart/form-data']
        #swagger.parameters['image'] = {
            in: 'formData',
            type: 'file',
            required: true,
            description: 'File gambar (png, jpg, jpeg, webp)'
        }
        #swagger.parameters['typeName'] = { in: 'formData', type: 'string' }
        #swagger.responses[200] = { description: 'Gambar berhasil di-upload', schema: { imgUrl: '/img/type_name/img_123.png' } }
        #swagger.responses[413] = { description: 'Ukuran gambar melebihi 10 MB' }
    */
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

                const parsed = parseMultipartBuffer(buffer, boundaryMatch[1]);
                const imageFile = parsed.files['image'] || Object.values(parsed.files)[0];
                const typeNameParam = cleanText(parsed.fields['typeName']) || 'default';

                if (!imageFile || !imageFile.filename) {
                    return res.status(400).json({ error: 'File gambar tidak ditemukan' });
                }

                const extension = path.extname(imageFile.filename).toLowerCase();
                if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
                    return res.status(400).json({
                        error: `Format gambar harus berupa (${ALLOWED_IMAGE_EXTENSIONS.join(', ')})`
                    });
                }

                const safeTypeFolder = sanitizeFolderName(typeNameParam);
                const targetDir = path.join(__dirname, '../public/img', safeTypeFolder);

                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const timestamp = Date.now();
                const safeFilename = `img_${timestamp}${extension}`;
                const filepath = path.join(targetDir, safeFilename);

                fs.writeFileSync(filepath, imageFile.data);

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

// GET /api/admin/logs (Khusus ITAdmin)
router.get('/admin/logs', requireAuth('ITAdmin'), async (req, res, next) => {
    /* 
        #swagger.tags = ['Admin Logs']
        #swagger.summary = 'Mendapatkan log aktivitas sistem (Khusus ITAdmin)'
        #swagger.description = 'Mengambil log aktivitas admin dengan paginasi.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['page'] = { in: 'query', type: 'integer', default: 1 }
        #swagger.parameters['limit'] = { in: 'query', type: 'integer', default: 10 }
        #swagger.responses[200] = { description: 'Daftar log berhasil diambil' }
        #swagger.responses[401] = { description: 'Unauthorized' }
    */
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        const result = await getActivityLogs(page, limit);
        
        res.json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/guides', async (req, res) => {
    try {
        const queryText = `
        SELECT 
            c.id,
            c.title,
            c.function_desc AS "functionDesc"
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

export default router;
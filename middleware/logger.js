import db from '../db.js';

export async function logActivity(req, action) {
    try {
        const userId = req.user ? req.user.id : null;
        const userRole = req.user ? req.user.role : 'Guest';
        const method = req.method;
        const endpoint = req.originalUrl;
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        await db.query(
            `INSERT INTO activity_logs (user_id, user_role, action, method, endpoint, ip_address) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, userRole, action, method, endpoint, ipAddress]
        );
    } catch (err) {
        console.error('[LOGGER ERROR] Gagal mencatat log aktivitas:', err);
    }
}

export async function getActivityLogs(limit = 100) {
    const { rows } = await db.query(`
        SELECT 
            l.id, 
            l.user_id AS "userId", 
            u.username AS "userName", 
            l.user_role AS "userRole", 
            l.action, 
            l.method, 
            l.endpoint, 
            l.ip_address AS "ipAddress", 
            l.created_at AS "createdAt"
        FROM activity_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
        LIMIT $1
    `, [limit]);

    return rows;
}
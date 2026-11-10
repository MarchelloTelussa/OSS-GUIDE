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

export async function getActivityLogs(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    // 1. Ambil total jumlah data log untuk kalkulasi total halaman
    const countResult = await db.query(`SELECT COUNT(*) FROM activity_logs`);
    const totalLogs = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalLogs / limit);

    // 2. Ambil data log sesuai OFFSET & LIMIT
    const { rows: logs } = await db.query(`
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
        LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return {
        logs,
        totalLogs,
        totalPages,
        currentPage: page
    };
}
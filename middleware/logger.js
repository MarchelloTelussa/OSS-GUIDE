import db from '../db.js';

export async function logActivity(req, action) {
    try {
        const userId = req.user ? req.user.id : null;
        const userRole = req.user ? req.user.role : 'Guest';
        const method = req.method;
        const endpoint = req.originalUrl;
        const ipAddress = req.ip;

        await db.query(
            `INSERT INTO activity_logs (user_id, user_role, action, method, endpoint, ip_address) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, userRole, action, method, endpoint, ipAddress]
        );
    } catch (err) {
        console.error('[LOGGER ERROR] Gagal mencatat log aktivitas:', err);
    }
}

export async function getActivityLogs(page = 1, limit = 10, method = 'ALL') {
    const offset = (page - 1) * limit;
    const queryParams = [];
    let whereClause = '';

    // Kondisi filter method
    if (method && method !== 'ALL') {
        queryParams.push(method);
        whereClause = `WHERE l.method = $${queryParams.length}`;
    }

    // 1. Hitung total data log berdasarkan filter
    const countQuery = `SELECT COUNT(*) FROM activity_logs l ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalLogs = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalLogs / limit) || 1;

    // 2. Query data log per halaman
    const limitParamIndex = queryParams.length + 1;
    const offsetParamIndex = queryParams.length + 2;
    queryParams.push(limit, offset);

    const dataQuery = `
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
        ${whereClause}
        ORDER BY l.created_at DESC
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const { rows: logs } = await db.query(dataQuery, queryParams);

    return {
        logs,
        totalLogs,
        totalPages,
        currentPage: page
    };
}
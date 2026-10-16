// lib/session.js
import crypto from 'crypto';
import db from '../db.js';

export const COOKIE_NAME = 'oss_session';
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 jam

export const cookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
});

// 1. Buat Sesi Baru di Database & Kembalikan Session ID
export async function createSession(userId) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + MAX_AGE_MS);

    await db.query(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
        [sessionId, userId, expiresAt]
    );

    return sessionId;
}

// 2. Baca Sesi dari Database & Ambil Data User-nya
export async function readSession(sessionId) {
    if (!sessionId) return null;

    const queryText = `
        SELECT u.id, u.username, u.role, s.expires_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = $1 AND s.expires_at > NOW();
    `;

    const { rows } = await db.query(queryText, [sessionId]);
    return rows[0] || null;
}

// 3. Hapus Sesi dari Database saat Logout
export async function destroySession(sessionId) {
    if (!sessionId) return;
    await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
}

// 4. Helper Parser Cookie
function parseCookies(header = '') {
    return Object.fromEntries(
        header.split(';').map((c) => c.trim()).filter(Boolean).map((c) => {
            const i = c.indexOf('=');
            return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
        })
    );
}

// 5. Session Middleware (Async)
export async function sessionMiddleware(req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies[COOKIE_NAME];

    if (sessionId) {
        req.sessionId = sessionId;
        req.user = await readSession(sessionId);
    } else {
        req.user = null;
    }
    
    next();
}

// 6. Auth Protection Guard
export function requireAuth(role) {
    return (req, res, next) => {
        if (!req.user) {
            // Jika request berasal dari API fetch/AJAX
            return res.status(401).json({ 
                error: 'Sesi Anda telah berakhir atau diakhiri karena login di perangkat lain.',
                code: 'SESSION_TERMINATED'
            });
        }
        if (role && req.user.role !== role) {
            return res.status(403).json({ error: 'Akses ditolak' });
        }
        next();
    };
}

setInterval(async () => {
    try {
        await db.query('DELETE FROM sessions WHERE expires_at < NOW()');
    } catch (err) {
        console.error('Gagal membersihkan sesi kedaluwarsa:', err);
    }
}, 60 * 60 * 1000);

export async function destroyAllUserSessions(userId) {
    if (!userId) return;
    
    try {
        const cleanUserId = parseInt(userId, 10);
        const result = await db.query('DELETE FROM sessions WHERE user_id = $1', [cleanUserId]);
        console.log(`[DEBUG] Menghapus ${result.rowCount} sesi lama milik user_id: ${cleanUserId}`);
    } catch (err) {
        console.error('[ERROR] Gagal hapus sesi lama:', err);
    }
}
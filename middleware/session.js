import jwt from 'jsonwebtoken';
import db from '../db.js'; // Import koneksi database

const JWT_SECRET = process.env.JWT_SECRET || 'ganti_dengan_secret_key_yang_sangat_rahasia_dan_panjang';
export const COOKIE_NAME = 'oss_session';
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 jam

export const cookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
});

export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

function parseCookies(header = '') {
    return Object.fromEntries(
        header.split(';').map((c) => c.trim()).filter(Boolean).map((c) => {
            const i = c.indexOf('=');
            return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
        })
    );
}

export async function sessionMiddleware(req, res, next) {
    try {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies[COOKIE_NAME];

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);

            // Cek token_version aktif user dari database
            const { rows } = await db.query(
                'SELECT token_version FROM users WHERE id = $1',
                [decoded.id]
            );
            const user = rows[0];

            // Jika versi token tidak cocok (karena sudah login di perangkat lain), tolak sesi
            if (!user || user.token_version !== decoded.tokenVersion) {
                req.user = null;
            } else {
                req.user = {
                    id: decoded.id,
                    username: decoded.username,
                    role: decoded.role
                };
            }
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        req.user = null;
        next();
    }
}

export function requireAuth(role) {
    return (req, res, next) => {
        if (!req.user) {
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
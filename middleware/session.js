import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ganti_dengan_secret_key_yang_sangat_rahasia_dan_panjang';
export const COOKIE_NAME = 'oss_session';
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 jam

export const cookieOptions = (req) => {
    // Memeriksa apakah request benar-benar HTTPS (mendukung multi-proxy header)
    const isHttps = req 
        ? req.secure || (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'].includes('https'))
        : false;

    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: isHttps, // HANYA true jika request dipanggil lewat SSL/HTTPS
        path: '/',       // Wajib didefinisikan agar clearCookie cocok 100%
        maxAge: MAX_AGE_MS,
    };
};

export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

function parseCookies(header = '') {
    if (!header) return {};
    return Object.fromEntries(
        header.split(';').map((c) => {
            const trimmed = c.trim();
            const i = trimmed.indexOf('=');
            if (i === -1) return [trimmed, ''];
            return [trimmed.slice(0, i), decodeURIComponent(trimmed.slice(i + 1))];
        })
    );
}

export async function sessionMiddleware(req, res, next) {
    try {
        const rawCookieHeader = req.headers.cookie || '';
        const cookies = parseCookies(rawCookieHeader);
        const token = cookies[COOKIE_NAME];

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Cek token_version aktif user dari database
        const { rows } = await db.query(
            'SELECT token_version FROM users WHERE id = $1',
            [decoded.id]
        );
        const user = rows[0];

        // Jika versi token tidak cocok (karena logout / login di perangkat lain)
        if (!user || Number(user.token_version) !== Number(decoded.tokenVersion)) {
            req.user = null;
        } else {
            req.user = {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role
            };
        }

        next();
    } catch (error) {
        // Jika token expired atau invalid signature, set user null tanpa melempar error crash
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
            return res.status(403).json({ error: 'Akses ditolak. Peran tidak memadai.' });
        }
        next();
    };
}
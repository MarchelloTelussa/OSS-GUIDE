import jwt from 'jsonwebtoken';

// Ambil secret dari environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'ganti_dengan_secret_key_yang_sangat_rahasia_dan_panjang';
export const COOKIE_NAME = 'oss_session';
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 jam

/**
 * Konfigurasi HTTP-Only Cookie
 */
export const cookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
});

/**
 * 1. Membuat Token JWT Baru
 */
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

/**
 * 2. Helper Parser Cookie
 */
function parseCookies(header = '') {
    return Object.fromEntries(
        header.split(';').map((c) => c.trim()).filter(Boolean).map((c) => {
            const i = c.indexOf('=');
            return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
        })
    );
}

/**
 * 3. Middleware Pasif untuk Dekode & Verifikasi JWT
 */
export function sessionMiddleware(req, res, next) {
    try {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies[COOKIE_NAME];

        if (token) {
            // Verifikasi signature JWT
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Rekonstruksi req.user persis seperti struktur lama
            req.user = {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role
            };
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        // Jika token invalid/expired, anggap unauthenticated tanpa bikin server crash
        req.user = null;
        next();
    }
}

/**
 * 4. Auth Protection Guard (Sama persis dengan versi lama)
 */
export function requireAuth(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Sesi Anda telah berakhir atau token tidak valid.',
                code: 'SESSION_TERMINATED'
            });
        }
        if (role && req.user.role !== role) {
            return res.status(403).json({ error: 'Akses ditolak' });
        }
        next();
    };
}
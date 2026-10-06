 import crypto from 'crypto';

export const COOKIE_NAME = 'oss_session';
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 jam

let secret = process.env.SESSION_SECRET;
if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    console.warn('[auth] SESSION_SECRET belum diset di .env — memakai secret acak, semua sesi akan hilang saat server restart.');
}

const sign = (payload) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');

export function createToken(user) {
    const payload = Buffer.from(JSON.stringify({ id: user.id, username: user.username, role: user.role, exp: Date.now() + MAX_AGE_MS })).toString('base64url');
    return `${payload}.${sign(payload)}`;
}

export function readToken(token) {
    if (typeof token !== 'string') return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;

    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        return data.exp > Date.now() ? data : null;
    } catch {
        return null;
    }
}

function parseCookies(header = '') {
    return Object.fromEntries(
        header.split(';').map((c) => c.trim()).filter(Boolean).map((c) => {
            const i = c.indexOf('=');
            return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
        })
    );
}

export const cookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
});

// Mengisi req.user jika cookie sesi valid
export function sessionMiddleware(req, res, next) {
    req.user = readToken(parseCookies(req.headers.cookie)[COOKIE_NAME]);
    next();
}

export function requireAuth(role) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Silakan login terlebih dahulu' });
        if (role && req.user.role !== role) return res.status(403).json({ error: 'Akses ditolak' });
        next();
    };
}

import express from 'express';
import db from '../db.js';
import { verifyPassword, DUMMY_HASH } from '../middleware/password.js';
import { COOKIE_NAME, createSession, destroySession, cookieOptions, requireAuth, destroyAllUserSessions } from '../middleware/session.js';
import { loginRateLimiter, botDetector } from '../middleware/rateLimiter.js'; // 1. Import middleware

const router = express.Router();

router.post('/login', botDetector, loginRateLimiter, async (req, res, next) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    try {
        const { rows } = await db.query(
            'SELECT id, username, password, role FROM users WHERE username = $1',
            [username.trim()]
        );
        const user = rows[0];

        const valid = await verifyPassword(password, user ? user.password : DUMMY_HASH);

        if (!user || !valid) {
            // 3. Tambahkan jumlah kegagalan login jika password/username salah
            if (req.rateLimit) req.rateLimit.increment();
            return res.status(401).json({ error: 'Username atau password salah' });
        }

        // 4. Jika login berhasil, reset counter percobaan
        if (req.rateLimit) req.rateLimit.reset();

        await destroyAllUserSessions(user.id);
        const sessionId = await createSession(user.id);

        res.cookie(COOKIE_NAME, sessionId, cookieOptions());
        res.json({ username: user.username, role: user.role });

    } catch (error) {
        next(error);
    }
});

router.post('/logout', async (req, res, next) => {
    try {
        const cookies = req.headers.cookie ? Object.fromEntries(
            req.headers.cookie.split(';').map(c => {
                const [k, ...v] = c.trim().split('=');
                return [k, decodeURIComponent(v.join('='))];
            })
        ) : {};

        const sessionId = cookies[COOKIE_NAME];

        // Hapus sesi dari database
        if (sessionId) {
            await destroySession(sessionId);
        }

        res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
        res.json({ message: 'Logged out' });
    } catch (error) {
        next(error); // Lempar ke errorHandler terpusat
    }
});

router.get('/me', requireAuth(), (req, res, next) => {
    try {
        res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
    } catch (error) {
        next(error); // Lempar ke errorHandler terpusat
    }
});

export default router;
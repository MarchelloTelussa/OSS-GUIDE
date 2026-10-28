import express from 'express';
import db from '../db.js';
import { verifyPassword, DUMMY_HASH } from '../middleware/password.js';
import { COOKIE_NAME, generateToken, cookieOptions, requireAuth } from '../middleware/session.js';
import { loginRateLimiter, botDetector } from '../middleware/rateLimiter.js';

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
            // Tambahkan jumlah kegagalan login jika password/username salah
            if (req.rateLimit) req.rateLimit.increment();
            return res.status(401).json({ error: 'Username atau password salah' });
        }

        // Jika login berhasil, reset counter percobaan
        if (req.rateLimit) req.rateLimit.reset();

        // 1. Generate JWT Token (payload berisi id, username, role)
        const token = generateToken({
            id: user.id,
            username: user.username,
            role: user.role
        });

        // 2. Set token ke HTTP-Only Cookie
        res.cookie(COOKIE_NAME, token, cookieOptions());
        res.json({ username: user.username, role: user.role });

    } catch (error) {
        next(error);
    }
});

router.post('/logout', (req, res, next) => {
    try {
        // Cukup bersihkan cookie tanpa menyentuh database
        res.clearCookie(COOKIE_NAME, cookieOptions());
        res.json({ message: 'Logged out' });
    } catch (error) {
        next(error);
    }
});

router.get('/me', requireAuth(), (req, res, next) => {
    try {
        res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
    } catch (error) {
        next(error);
    }
});

export default router;
import express from 'express';
import db from '../db.js';
import { verifyPassword, DUMMY_HASH } from '../lib/password.js';
import { COOKIE_NAME, createToken, cookieOptions, requireAuth } from '../lib/session.js';

const router = express.Router();

// Pembatasan percobaan login sederhana (in-memory) per IP
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map();

function tooManyAttempts(ip) {
    const entry = attempts.get(ip);
    if (!entry || entry.resetAt < Date.now()) return false;
    return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
    const entry = attempts.get(ip);
    if (!entry || entry.resetAt < Date.now()) {
        attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
    } else {
        entry.count++;
    }
}

router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }
    if (tooManyAttempts(req.ip)) {
        return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi nanti.' });
    }

    try {
        const { rows } = await db.query(
            'SELECT id, username, password, role FROM users WHERE username = $1',
            [username.trim()]
        );
        const user = rows[0];

        // Tetap verifikasi hash palsu agar waktu respon sama untuk user yang tidak ada
        const valid = await verifyPassword(password, user ? user.password : DUMMY_HASH);

        if (!user || !valid) {
            recordFailure(req.ip);
            return res.status(401).json({ error: 'Username atau password salah' });
        }

        attempts.delete(req.ip);
        res.cookie(COOKIE_NAME, createToken(user), cookieOptions());
        res.json({ username: user.username, role: user.role });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth(), (req, res) => {
    res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

export default router;

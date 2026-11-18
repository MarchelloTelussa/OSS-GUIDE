import express from 'express';
import db from '../db.js';
import { hashPassword, verifyPassword } from '../middleware/password.js';
import { COOKIE_NAME, generateToken, cookieOptions, requireAuth } from '../middleware/session.js';
import { loginRateLimiter, botDetector } from '../middleware/rateLimiter.js';

const router = express.Router();

// Helper: terbitkan sesi lokal (naikkan token_version -> sesi tunggal) & set cookie
async function issueSession(res, req, userId) {
    const { rows } = await db.query(
        `UPDATE users
         SET token_version = token_version + 1
         WHERE id = $1
         RETURNING id, username, role, token_version`,
        [userId]
    );
    const user = rows[0];

    const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        tokenVersion: user.token_version,
    });

    res.cookie(COOKIE_NAME, token, cookieOptions(req));
    return user;
}

router.post('/login', botDetector, loginRateLimiter, async (req, res, next) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const cleanUsername = username.trim();

    try {
        // 1. Cari user di tabel lokal (sumber kebenaran login sekarang)
        const { rows } = await db.query(
            'SELECT id, username, password, role, token_version FROM users WHERE username = $1',
            [cleanUsername]
        );
        const user = rows[0];

        // 2. User tidak ada = belum diberi akses oleh admin
        if (!user) {
            if (req.rateLimit) req.rateLimit.increment();
            return res.status(401).json({
                error: 'Akun Anda belum diberi akses login. Login dibatasi oleh admin — silakan hubungi admin.'
            });
        }

        // 3. User sudah punya password lokal -> verifikasi lokal (scrypt)
        if (user.password) {
            const valid = await verifyPassword(password, user.password);
            if (!valid) {
                if (req.rateLimit) req.rateLimit.increment();
                return res.status(401).json({ error: 'Username atau password salah' });
            }
        } else {
            // 4. User sudah di-grant tapi belum punya password lokal (password NULL).
            //    Validasi SEKALI ke API login HRIS; jika benar, hash & simpan lokal.
            const companyRes = await fetch(process.env.COMPANY_AUTH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ username: cleanUsername, password }),
                signal: AbortSignal.timeout(8000),
            });

            if (!companyRes.ok) {
                const companyData = await companyRes.json().catch(() => ({}));
                if (req.rateLimit) req.rateLimit.increment();
                return res.status(401).json({
                    error: companyData.message || 'Username atau password salah'
                });
            }

            const hashed = await hashPassword(password);
            await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user.id]);
        }

        // 5. Sukses: reset rate limiter, terbitkan sesi lokal
        if (req.rateLimit) req.rateLimit.reset();
        const sessionUser = await issueSession(res, req, user.id);

        return res.json({ username: sessionUser.username, role: sessionUser.role });

    } catch (error) {
        if (error.name === 'TimeoutError' || error.code === 'ECONNREFUSED') {
            console.error('[Auth Error] Gagal terhubung ke API Perusahaan:', error.message);
            return res.status(503).json({
                error: 'Server autentikasi perusahaan sedang tidak dapat dijangkau. Coba lagi nanti.'
            });
        }
        next(error);
    }
});

router.post('/logout', (req, res, next) => {
    try {
        // Ambil opsi pembuatan cookie standar
        const options = cookieOptions(req);
        
        // Hapus properti umur cookie agar tidak mengganggu proses penimpaan/penghapusan
        delete options.maxAge;
        delete options.expires;

        // Pastikan path sesuai dengan saat cookie dibuat (default: '/')
        options.path = '/';

        // Clear cookie dari browser Client
        res.clearCookie(COOKIE_NAME, options);
        
        return res.json({ message: 'Logged out' });
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
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

    const cleanUsername = username.trim();

    try {
        // 1. Hit API Login Perusahaan
        // Sesuaikan key payload (misal: username/email/nik) dengan Swagger perusahaan
        const companyRes = await fetch(process.env.COMPANY_AUTH_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: cleanUsername,
                password: password
            }),
            signal: AbortSignal.timeout(8000) // Batas waktu 8 detik
        });

        const companyData = await companyRes.json().catch(() => ({}));

        // 2. Cek apakah login ditolak oleh server perusahaan
        // (Jika API perusahaan selalu return HTTP 200 dengan flag success: false, tambahkan: || companyData.success === false)
        if (!companyRes.ok) {
            if (req.rateLimit) req.rateLimit.increment();
            return res.status(401).json({ 
                error: companyData.message || 'Username atau password salah' 
            });
        }

        // Reset rate limiter jika berhasil login
        if (req.rateLimit) req.rateLimit.reset();

        // 3. Ekstrak & Mapping Role dari Response JSON Perusahaan
        // Sesuaikan path objek dengan struktur response Swagger (misal: companyData.roleName atau companyData.data?.roleName)
        const rawRole = (
            companyData.roleName || 
            companyData.data?.roleName || 
            companyData.user?.roleName || 
            ''
        ).toString().trim().toLowerCase();

        // Hanya "super admin" yang menjadi "ITAdmin", sisanya (termasuk "IT" biasa) otomatis menjadi "user"
        const mappedRole = rawRole === 'super admin' ? 'ITAdmin' : 'user';

        // 4. JIT Provisioning (UPSERT ke tabel users lokal & increment token_version)
        const upsertQuery = `
            INSERT INTO users (username, password, role, token_version)
            VALUES ($1, NULL, $2, 1)
            ON CONFLICT (username) 
            DO UPDATE SET 
                role = EXCLUDED.role,
                token_version = users.token_version + 1
            RETURNING id, username, role, token_version;
        `;

        const { rows } = await db.query(upsertQuery, [cleanUsername, mappedRole]);
        const user = rows[0];

        // 5. Generate JWT lokal dengan menyertakan tokenVersion terbaru
        const token = generateToken({
            id: user.id,
            username: user.username,
            role: user.role,
            tokenVersion: user.token_version
        });

        // 6. Set HTTP-Only Cookie (membaca header X-Forwarded-Proto dari Nginx)
        res.cookie(COOKIE_NAME, token, cookieOptions(req));

        return res.json({ 
            username: user.username, 
            role: user.role 
        });

    } catch (error) {
        if (error.name === 'TimeoutError' || error.code === 'ECONNREFUSED') {
            console.error('[Auth Error] Gagal terhubung ke API Perusahaan:', error.message);
            return res.status(503).json({ 
                error: 'Server autentikasi perusahaan sedang tidak dapat dijangkau.' 
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
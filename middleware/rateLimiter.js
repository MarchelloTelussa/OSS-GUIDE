// middleware/rateLimiter.js

// In-memory store sederhana untuk rate limit
const loginAttempts = new Map();

// Pembersihan berkala memori (tiap 10 menit)
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of loginAttempts.entries()) {
        if (now > data.resetTime) {
            loginAttempts.delete(ip);
        }
    }
}, 10 * 60 * 1000);

/**
 * Middleware untuk membatasi percobaaan login (Rate Limiting)
 */
export function loginRateLimiter(req, res, next) {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    const WINDOW_MS = 15 * 60 * 1000; // Jendela waktu 15 menit
    const MAX_ATTEMPTS = 5; // Maksimal 5x gagal dalam 15 menit

    const record = loginAttempts.get(clientIp) || { count: 0, resetTime: now + WINDOW_MS };

    if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + WINDOW_MS;
    }

    if (record.count >= MAX_ATTEMPTS) {
        const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
        return res.status(429).json({
            error: `Terlalu banyak percobaan login. Coba lagi dalam ${retryAfterSec} detik.`
        });
    }

    req.rateLimit = {
        increment: () => {
            record.count += 1;
            loginAttempts.set(clientIp, record);
        },
        reset: () => {
            loginAttempts.delete(clientIp);
        }
    };

    next();
}

/**
 * Middleware Heuristic Cek Bot (Analisis Headers & User-Agent)
 */
export function botDetector(req, res, next) {
    const userAgent = req.headers['user-agent'] || '';
    const accept = req.headers['accept'] || '';
    const fetchSite = req.headers['sec-fetch-site'];

    const knownBotPatterns = /python|requests|curl|urllib|httpx|postman|axios/i;
    if (knownBotPatterns.test(userAgent)) {
        return res.status(403).json({ error: 'Akses ditolak: Otomatisasi script terdeteksi.' });
    }

    if (!userAgent || userAgent.length < 10) {
        return res.status(400).json({ error: 'Header browser tidak valid.' });
    }

    next();
}
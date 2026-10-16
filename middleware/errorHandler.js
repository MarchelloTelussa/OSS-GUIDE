export const errorHandler = (err, req, res, next) => {
    // 1. Catat error detail + stack trace hanya di konsol server (Internal Logs)
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
    console.error(err.stack || err);

    // 2. Tentukan HTTP status code (Default: 500 Internal Server Error)
    const statusCode = err.statusCode || 500;

    // 3. Tentukan pesan error yang aman untuk dikirim ke client
    // Jika status 500, gunakan pesan umum agar tidak membocorkan detail teknis/database
    const clientMessage = statusCode === 500 
        ? 'Internal Server Error' 
        : (err.message || 'Terjadi kesalahan pada server');

    // 4. Kirim response JSON yang terstandardisasi
    res.status(statusCode).json({
        success: false,
        error: clientMessage
    });
};
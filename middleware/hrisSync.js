import db from '../db.js';

// URL endpoint master users HRIS (GET, tanpa auth sesuai konfirmasi).
// Fallback: turunkan dari COMPANY_AUTH_API_URL (.../api/auth/login -> .../api/master/users)
function getMasterUsersUrl() {
    if (process.env.HRIS_MASTER_USERS_URL) return process.env.HRIS_MASTER_USERS_URL;
    const authUrl = process.env.COMPANY_AUTH_API_URL || '';
    if (authUrl.includes('/auth/login')) return authUrl.replace('/auth/login', '/master/users');
    return '';
}

const ONE_HOUR_MS = 60 * 60 * 1000;

// Normalisasi berbagai bentuk respons menjadi array record user.
function extractArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.users)) return payload.users;
    if (payload && payload.data && Array.isArray(payload.data.users)) return payload.data.users;
    return [];
}

// Ambil username dari berbagai kemungkinan nama field.
function pickUsername(item) {
    const raw = item?.username ?? item?.userName ?? item?.user_name ?? item?.email ?? null;
    return raw != null ? String(raw).trim() : '';
}

// Ambil roleId dari berbagai kemungkinan nama field (HRIS memakai "id_role").
function pickRoleId(item) {
    const raw = item?.id_role ?? item?.roleId ?? item?.role_id ?? item?.roleID ?? item?.role?.id ?? null;
    if (raw == null || raw === '') return null;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
}

/**
 * Hit API master/users 1x, lalu UPSERT username + role_id ke hris_users_cache.
 * Baris yang tidak lagi muncul di respons akan dihapus agar cache tetap sinkron.
 * Tidak pernah melempar error ke pemanggil (aman dipanggil dari scheduler).
 * @returns {Promise<{ok: boolean, count?: number, error?: string}>}
 */
export async function syncHrisUsers() {
    const url = getMasterUsersUrl();
    if (!url) {
        const msg = 'HRIS_MASTER_USERS_URL / COMPANY_AUTH_API_URL tidak dikonfigurasi';
        console.error('[HRIS Sync]', msg);
        return { ok: false, error: msg };
    }

    const client = await db.getClient();
    try {
        const headers = { Accept: 'application/json' };
        if (process.env.HRIS_API_TOKEN) {
            headers.Authorization = `Bearer ${process.env.HRIS_API_TOKEN}`;
        }
        if (process.env.HRIS_API_KEY) {
            const keyHeader = process.env.HRIS_API_KEY_HEADER || 'apikey';
            headers[keyHeader] = process.env.HRIS_API_KEY;
        }

        const res = await fetch(url, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(30000), // data bisa banyak -> 30s
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} saat mengambil master/users`);
        }

        // Endpoint HRIS me-redirect ke halaman HTML bila apikey tidak valid/absen.
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error('Respons bukan JSON (kemungkinan HRIS_API_KEY salah/kosong atau URL tidak tepat)');
        }

        const payload = await res.json();
        const items = extractArray(payload);

        // Dedup berdasarkan username (menang record terakhir).
        const byUsername = new Map();
        for (const item of items) {
            const username = pickUsername(item);
            if (!username) continue;
            byUsername.set(username, pickRoleId(item));
        }

        await client.query('BEGIN');

        // UPSERT per-chunk (multi-row) agar efisien untuk puluhan ribu baris.
        const entries = Array.from(byUsername.entries());
        const CHUNK = 500;
        let count = 0;
        for (let i = 0; i < entries.length; i += CHUNK) {
            const slice = entries.slice(i, i + CHUNK);
            const values = [];
            const params = [];
            slice.forEach(([username, roleId], idx) => {
                const base = idx * 2;
                values.push(`($${base + 1}, $${base + 2}, now())`);
                params.push(username, roleId);
            });
            await client.query(
                `INSERT INTO hris_users_cache (username, role_id, synced_at)
                 VALUES ${values.join(', ')}
                 ON CONFLICT (username)
                 DO UPDATE SET role_id = EXCLUDED.role_id, synced_at = now()`,
                params
            );
            count += slice.length;
        }

        // Hapus username yang tidak ada lagi di respons HRIS.
        const usernames = Array.from(byUsername.keys());
        if (usernames.length > 0) {
            await client.query(
                'DELETE FROM hris_users_cache WHERE username <> ALL($1::varchar[])',
                [usernames]
            );
        } else {
            // Respons kosong: jangan hapus apa pun (kemungkinan error di sisi HRIS).
            console.warn('[HRIS Sync] Respons master/users kosong, cache tidak diubah.');
        }

        await client.query('COMMIT');
        console.log(`[HRIS Sync] Berhasil sinkron ${count} user HRIS.`);
        return { ok: true, count };
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
        console.error('[HRIS Sync] Gagal sinkron:', err.message);
        return { ok: false, error: err.message };
    } finally {
        client.release();
    }
}

/**
 * Jadwalkan sinkronisasi: sekali saat start (bila cache kosong / stale > 1 jam),
 * lalu setiap 1 jam. Tidak menambah dependency (pakai setInterval).
 */
export async function startHrisSyncScheduler() {
    try {
        const { rows } = await db.query(
            'SELECT COUNT(*)::int AS total, MAX(synced_at) AS last_sync FROM hris_users_cache'
        );
        const total = rows[0]?.total ?? 0;
        const lastSync = rows[0]?.last_sync ? new Date(rows[0].last_sync).getTime() : 0;
        const stale = Date.now() - lastSync > ONE_HOUR_MS;

        if (total === 0 || stale) {
            // Jalankan di background agar tidak memblok startup server.
            syncHrisUsers();
        }
    } catch (err) {
        console.error('[HRIS Sync] Gagal cek status cache saat start:', err.message);
        syncHrisUsers();
    }

    setInterval(() => { syncHrisUsers(); }, ONE_HOUR_MS);
}

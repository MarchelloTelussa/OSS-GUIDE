-- Cache tabel user HRIS (hasil GET /api/master/users)
-- Hanya menyimpan username + role_id. Di-refresh 1x/jam oleh middleware/hrisSync.js.
-- Jalankan manual: psql -U <user> -d <db> -f Essential/hris_users_cache.sql

CREATE TABLE IF NOT EXISTS hris_users_cache (
    username   varchar(100) PRIMARY KEY,
    role_id    integer,
    synced_at  timestamptz NOT NULL DEFAULT now()
);

-- Grant akses & jalur HRIS lama menyisipkan password NULL ke tabel users,
-- jadi kolom password wajib boleh NULL.
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

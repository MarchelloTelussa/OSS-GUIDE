import crypto from 'crypto';

// Format tersimpan: scrypt$N$r$p$salt(base64)$hash(base64)
const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

const scrypt = (password, salt, n, r, p) =>
    new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, KEY_LEN, { N: n, r, p }, (err, key) => (err ? reject(err) : resolve(key)));
    });

export async function hashPassword(password) {
    const salt = crypto.randomBytes(SALT_LEN);
    const key = await scrypt(password, salt, N, R, P);
    return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
    const parts = typeof stored === 'string' ? stored.split('$') : [];
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

    const [, n, r, p, saltB64, hashB64] = parts;
    const expected = Buffer.from(hashB64, 'base64');
    const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), +n, +r, +p);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Hash palsu untuk menyamakan waktu respon saat username tidak ditemukan
export const DUMMY_HASH = await hashPassword('dummy-password-for-timing');

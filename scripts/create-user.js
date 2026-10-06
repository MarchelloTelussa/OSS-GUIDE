// Pemakaian: node scripts/create-user.js <username> <password> [role]
// Role yang dipakai aplikasi: ITAdmin (boleh membuat guide) atau user
import 'dotenv/config';
import db from '../db.js';
import { hashPassword } from '../lib/password.js';

const [username, password, role = 'user'] = process.argv.slice(2);

if (!username || !password) {
    console.error('Pemakaian: node scripts/create-user.js <username> <password> [role]');
    process.exit(1);
}
if (password.length < 8) {
    console.error('Password minimal 8 karakter.');
    process.exit(1);
}

try {
    const hash = await hashPassword(password);
    const { rows } = await db.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id',
        [username, hash, role]
    );
    console.log(`User "${username}" (${role}) dibuat dengan id ${rows[0].id}.`);
} catch (error) {
    console.error(error.code === '23505' ? 'Username sudah dipakai.' : `Gagal: ${error.message}`);
    process.exitCode = 1;
}
process.exit();

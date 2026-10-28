import { CustomDialog } from './dialog.js';

// State privat
let currentUser = null;

// Element DOM
const userLink = document.getElementById('user');

/**
 * Dipanggil 1x saat aplikasi dimuat.
 * Bertanggung jawab mengambil data user, redirect jika tidak valid, dan update UI navbar.
 */
export async function initAuth() {
    try {
        const response = await fetch('/api/auth/me');

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html?reason=kicked';
                return null;
            }
            window.location.href = 'login.html';
            return null;
        }

        currentUser = await response.json();

        // Update UI Navbar khusus user
        if (userLink) {
            const icon = userLink.querySelector('i');
            if (icon) icon.textContent = ` ${currentUser.username}`;
            userLink.title = 'Klik untuk logout';
        }


        return currentUser;
    } catch (err) {
        console.error('Auth check failed:', err);
        window.location.href = 'login.html';
        return null;
    }
}

/**
 * Helper untuk mengambil data pengguna yang aktif tanpa perlu fetch ulang
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Helper untuk cek apakah user memiliki role tertentu
 */
export function hasRole(requiredRole) {
    return currentUser !== null && currentUser.role === requiredRole;
}

// Handler event listener Logout
if (userLink) {
    userLink.addEventListener('click', async (e) => {
        e.preventDefault();

        const isConfirmed = await CustomDialog.showConfirm({
            title: 'Konfirmasi Logout',
            message: 'Logout dari OSS Guide?',
            confirmText: 'Logout',
            cancelText: 'Batal'
        });

        if (!isConfirmed) return;

        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = 'login.html';
        } catch (err) {
            await CustomDialog.showAlert({
                title: 'Gagal Logout',
                message: 'Terjadi kesalahan saat mencoba logout.',
                type: 'danger'
            });
        }
    });
}
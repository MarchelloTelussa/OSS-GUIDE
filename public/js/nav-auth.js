// Mengisi navbar sesuai user yang login: nama, tombol logout, dan menu Add Guide (khusus ITAdmin)
const userLink = document.querySelector('#navUser');
const addGuideLink = document.querySelector('a[href="add-guide.html"]');

export async function getUserInfo() {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) throw new Error('Not authenticated');
        const user = await response.json();

        if (userLink) {
            userLink.querySelector('i').textContent = ` ${user.username}`;
            userLink.title = 'Klik untuk logout';
        }

        // Hilangkan menu Add Guide jika bukan ITAdmin
        if (addGuideLink && user.role !== 'ITAdmin') {
            const li = addGuideLink.closest('li');
            if (li) li.remove();
            else addGuideLink.remove();
        }

        return user; // Mengembalikan data user agar bisa digunakan di fungsi lain
    } catch {
        window.location.href = 'login.html';
        return null;
    }
}

if (userLink) {
    userLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm('Logout dari OSS Guide?')) return;
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = 'login.html';
    });
}

getUserInfo();
// Mengisi navbar sesuai user yang login: nama, tombol logout, dan menu Add Guide (khusus ITAdmin)
const userLink = document.querySelector('#navUser');
const addGuideLink = document.querySelector('a[href="add-guide.html"]');
const manageTypeButton = document.querySelector('#bttnManage');

export async function getUserInfo() {
    try {
        const response = await fetch('/api/auth/me');

        if (!response.ok) {
            // Jika status 401 (sesi hangus/di-kick), lempar URL dengan query parameter
            if (response.status === 401) {
                window.location.href = 'login.html?reason=kicked';
                return null;
            }
            window.location.href = 'login.html';
            return null;
        }

        const user = await response.json();

        if (userLink) {
            userLink.querySelector('i').textContent = ` ${user.username}`;
            userLink.title = 'Klik untuk logout';
        }

        // Hilangkan menu Add Guide jika bukan ITAdmin
        if (addGuideLink && user.role !== 'ITAdmin') {
            const a = addGuideLink.closest('a');
            if (a) a.remove();
            else addGuideLink.remove();
        }

        if (manageTypeButton && user.role !== 'ITAdmin') {
            const button = manageTypeButton.closest('button');
            if (button) button.remove();
            else manageTypeButton.remove();
        }
        return user;
    } catch (err) {
        // Fallback jika terjadi Network Error / Server Down
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
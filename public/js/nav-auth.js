// Mengisi navbar sesuai user yang login: nama, tombol logout, dan menu Add Guide (khusus ITAdmin)
const userLink = document.querySelector('#navUser');
const addGuideLink = document.querySelector('a[href="add-guide.html"]');

try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) throw new Error('Not authenticated');
    const user = await response.json();

    userLink.querySelector('i').textContent = ` ${user.username}`;
    userLink.title = 'Klik untuk logout';
    if (addGuideLink && user.role !== 'ITAdmin') addGuideLink.closest('li').remove();
} catch {
    window.location.href = 'login.html';
}

userLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!confirm('Logout dari OSS Guide?')) return;
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = 'login.html';
});

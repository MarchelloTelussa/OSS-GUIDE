const form = document.querySelector('#loginForm');
const messageDiv = document.querySelector('#message');
const submitBtn = document.querySelector('#submitBtn');

function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.querySelector('#username').value.trim();
    const password = document.querySelector('#password').value;

    if (!username || !password) {
        showMessage('Username dan password wajib diisi', 'error');
        return;
    }

    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Login berhasil! Mengalihkan...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        } else {
            showMessage(result.error || 'Login gagal', 'error');
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Terjadi kesalahan koneksi ke server', 'error');
        submitBtn.disabled = false;
    }
});

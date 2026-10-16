// public/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const messageEl = document.getElementById('message');
    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');

    // Helper Functions
    function showMessage(text, type) {
        if (!messageEl) return;
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
    }

    function hideMessage() {
        if (!messageEl) return;
        messageEl.style.display = 'none';
    }

    // 1. Cek Parameter URL saat halaman dibuka (misal: ?reason=kicked)
    const urlParams = new URLSearchParams(window.location.search);
    const reason = urlParams.get('reason');

    if (reason === 'kicked') {
        showMessage(
            'Sesi Anda diakhiri karena akun ini baru saja login di perangkat lain.',
            'warning'
        );
    } else if (reason === 'expired') {
        showMessage('Sesi Anda telah berakhir. Silakan login kembali.', 'warning');
    }

    // 2. Event Listener Submit Form Login (Cukup 1 Listener Saja)
    let isSubmitting = false;

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Mencegah request ganda jika sedang dalam proses submit
            if (isSubmitting) return;

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            if (!username || !password) {
                showMessage('Username dan password wajib diisi', 'error');
                return;
            }

            // Kunci state submit
            isSubmitting = true;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Memproses...';
            hideMessage();

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage('Login berhasil! Mengalihkan...', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 800);
                } else {
                    showMessage(data.error || 'Login gagal', 'error');
                    isSubmitting = false;
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Login';
                }
            } catch (err) {
                console.error('Error:', err);
                showMessage('Terjadi kesalahan koneksi ke server', 'error');
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        });
    }
});
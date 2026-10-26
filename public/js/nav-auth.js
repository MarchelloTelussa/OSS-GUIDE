// Mengisi navbar sesuai user yang login: nama, tombol logout, dan menu Add Guide (khusus ITAdmin)
const userLink = document.getElementById('user');
const manageTypeButton = document.querySelector('#bttnManage');

const CustomDialog = {
    init() {
        if (document.getElementById('customAlertModal')) return;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'customAlertModal';
        modalDiv.className = 'custom-alert-modal';
        modalDiv.innerHTML = `
            <div class="custom-alert-content">
                <div id="customAlertIcon" class="custom-alert-icon"></div>
                <h3 id="customAlertTitle" class="custom-alert-title">Notifikasi</h3>
                <p id="customAlertMessage" class="custom-alert-message"></p>
                <div id="customAlertActions" class="custom-alert-actions"></div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    },

    showAlert({ title = 'Peringatan', message = '', type = 'warning', buttonText = 'OK' }) {
        this.init();

        return new Promise((resolve) => {
            const modal = document.getElementById('customAlertModal');
            const backdrop = document.getElementById('backdrop');
            const iconContainer = document.getElementById('customAlertIcon');
            const titleElement = document.getElementById('customAlertTitle');
            const messageElement = document.getElementById('customAlertMessage');
            const actionsContainer = document.getElementById('customAlertActions');

            let iconHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
            if (type === 'danger') iconHTML = '<i class="fa-solid fa-circle-xmark"></i>';
            if (type === 'confirm') iconHTML = '<i class="fa-solid fa-circle-question"></i>';

            iconContainer.className = `custom-alert-icon ${type}`;
            iconContainer.innerHTML = iconHTML;

            titleElement.innerText = title;
            messageElement.innerText = message;

            actionsContainer.innerHTML = `
                <button id="btnAlertOk" class="btn-alert btn-alert-primary">${buttonText}</button>
            `;

            backdrop?.classList.add('active');
            modal?.classList.add('active');

            const btnOk = document.getElementById('btnAlertOk');
            btnOk.onclick = () => {
                modal?.classList.remove('active');
                backdrop?.classList.remove('active');
                resolve(true);
            };
        });
    },

    showConfirm({ title = 'Konfirmasi', message = 'Apakah Anda yakin?', confirmText = 'Ya', cancelText = 'Batal' }) {
        this.init();

        return new Promise((resolve) => {
            const modal = document.getElementById('customAlertModal');
            const backdrop = document.getElementById('backdrop');
            const iconContainer = document.getElementById('customAlertIcon');
            const titleElement = document.getElementById('customAlertTitle');
            const messageElement = document.getElementById('customAlertMessage');
            const actionsContainer = document.getElementById('customAlertActions');

            iconContainer.className = 'custom-alert-icon confirm';
            iconContainer.innerHTML = '<i class="fa-solid fa-circle-question"></i>';

            titleElement.innerText = title;
            messageElement.innerText = message;

            actionsContainer.innerHTML = `
                <button id="btnAlertCancel" class="btn-alert btn-alert-secondary">${cancelText}</button>
                <button id="btnAlertConfirm" class="btn-alert btn-alert-danger">${confirmText}</button>
            `;

            backdrop?.classList.add('active');
            modal?.classList.add('active');

            const btnConfirm = document.getElementById('btnAlertConfirm');
            const btnCancel = document.getElementById('btnAlertCancel');

            const close = (result) => {
                modal?.classList.remove('active');
                backdrop?.classList.remove('active');
                resolve(result);
            };

            btnConfirm.onclick = () => close(true);
            btnCancel.onclick = () => close(false);
        });
    }
};

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
            CustomDialog.showAlert({
                title: 'Gagal Logout',
                message: 'Terjadi kesalahan saat mencoba logout.',
                type: 'danger'
            });
        }
    });
}

getUserInfo();
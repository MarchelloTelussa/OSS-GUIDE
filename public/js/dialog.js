export const CustomDialog = {
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

            const cleanup = () => {
                modal?.classList.remove('active');
                backdrop?.classList.remove('active');
                backdrop?.removeEventListener('click', onBackdropClick);
            };

            const onBackdropClick = (e) => {
                e.stopPropagation();
                cleanup();
                resolve(true);
            };

            backdrop?.classList.add('active');
            modal?.classList.add('active');

            backdrop?.addEventListener('click', onBackdropClick, { once: true });

            const btnOk = document.getElementById('btnAlertOk');
            btnOk?.addEventListener('click', (e) => {
                e.stopPropagation();
                cleanup();
                resolve(true);
            }, { once: true });
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

            // Helper untuk membersihkan modal & semua listener
            const cleanup = () => {
                modal?.classList.remove('active');
                backdrop?.classList.remove('active');
                backdrop?.removeEventListener('click', onBackdropClick);
            };

            const onBackdropClick = (e) => {
                e.stopPropagation();
                cleanup();
                resolve(false);
            };

            backdrop?.classList.add('active');
            modal?.classList.add('active');

            // Gunakan listener backdrop yang bersih
            backdrop?.addEventListener('click', onBackdropClick, { once: true });

            const btnConfirm = document.getElementById('btnAlertConfirm');
            const btnCancel = document.getElementById('btnAlertCancel');

            btnConfirm?.addEventListener('click', (e) => {
                e.stopPropagation();
                cleanup();
                resolve(true);
            }, { once: true });

            btnCancel?.addEventListener('click', (e) => {
                e.stopPropagation();
                cleanup();
                resolve(false);
            }, { once: true });
        });
    }
};
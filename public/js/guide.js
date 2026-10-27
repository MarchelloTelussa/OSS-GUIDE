// State Management
const state = {
    groupId: null,
    group: null,       // Object metadata Group (misal: { id, name, typeId })
    type: null,        // Object metadata Type (misal: { id, name })
    guides: [],
    currentGuide: null,
    searchQuery: '',
    existingVideoUrl: '',
    currentUser: null
};

const API_BASE = '/api';

// DOM Selectors
const viewContainer = document.getElementById('viewContainer');
const backdrop = document.getElementById('backdrop');
const detailOverlay = document.getElementById('detailOverlay');
const closeOverlayBtn = document.getElementById('closeOverlay');
const overlayContent = document.getElementById('overlayContent');
const fullscreenBtn = document.getElementById('fullscreen');

// Dynamic Admin Elements References
let guideModal, guideModalTitle, guideForm, guideIdInput, guideTitleInput, 
    guideDescInput, guideNoteInput, guideVideoInput, currentVideoPath, 
    stepsContainer, btnAddStep, btnCancelGuide;

/**
 * Inisialisasi Halaman
 */
async function init() {
    await checkUserAuth();
    setupGlobalEvents();

    const urlParams = new URLSearchParams(window.location.search);
    state.groupId = urlParams.get('groupId');

    if (state.groupId) {
        await fetchGroupDetails(state.groupId);
    } else {
        await fetchAllGuides();
    }

    renderListView();
}

/**
 * Helper untuk menampilkan toast notification
 */
function showToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${escapeHTML(message)}</span>`;

    container.appendChild(toast);

    // Trigger animasi masuk
    setTimeout(() => toast.classList.add('show'), 10);

    // Hapus toast setelah 3 detik
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Custom Dialog System (Auto-Inject DOM via JS)
 */
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
            
            btnOk.addEventListener('click', (e) => {
                e.stopPropagation(); // Mencegah event bubbling ke backdrop
                modal?.classList.remove('active');
                backdrop?.classList.remove('active');
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

            backdrop?.classList.add('active');
            modal?.classList.add('active');

            const btnConfirm = document.getElementById('btnAlertConfirm');
            const btnCancel = document.getElementById('btnAlertCancel');

            const close = (result) => {
                modal?.classList.remove('active');
                backdrop?.classList.remove('active');
                resolve(result);
            };

            btnConfirm.addEventListener('click', (e) => {
                e.stopPropagation(); // Hentikan propagasi agar langsung memicu resolve
                close(true);
            }, { once: true });

            btnCancel.addEventListener('click', (e) => {
                e.stopPropagation();
                close(false);
            }, { once: true });
        });
    }
};

/**
 * Fetch Detail Metadata Group, Type, sekaligus Daftar Guides
 */
async function fetchGroupDetails(groupId) {
    try {
        const response = await fetch(`${API_BASE}/groups/${groupId}`);
        if (!response.ok) throw new Error('Gagal memuat detail group');
        
        const groupData = await response.json();
        
        state.group = groupData;
        state.type = groupData.type; // Berisi { id, name } dari JOIN backend
        
        // Mengisi state.guides dari array nested 'guides' dari backend
        if (Array.isArray(groupData.guides)) {
            state.guides = groupData.guides;
        }
    } catch (error) {
        console.error('Error fetching group details:', error);
        state.group = null;
        state.type = null;
        state.guides = [];
    }
}

/**
 * Verifikasi User & Inject Modal Admin untuk ITAdmin
 */
async function checkUserAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            state.currentUser = await response.json();
        }
    } catch (err) {
        console.warn('Auth check failed:', err);
    }

    if (state.currentUser && state.currentUser.role === 'ITAdmin') {
        injectGuideAdminModal();
    }
}

/**
 * Injeksi DOM Modal Add/Edit Guide (Hanya untuk ITAdmin)
 */
function injectGuideAdminModal() {
    const holder = document.getElementById('adminGuideModalHolder');
    if (!holder) return;

    holder.innerHTML = `
        <div id="guideModal" class="guideModal">
            <h2 id="guideModalTitle">Add Guide</h2>
            <form id="guideForm">
                <input type="hidden" id="guideId">
                <div class="guideFormGrid">
                    <div class="guideFormLeft">
                        <div class="formGroup">
                            <label for="guideTitleInput">Judul Guide *</label>
                            <input type="text" id="guideTitleInput" required placeholder="Masukkan judul guide...">
                        </div>
                        <div class="formGroup">
                            <label for="guideDescInput">Deskripsi Fungsi *</label>
                            <textarea id="guideDescInput" required placeholder="Masukkan deskripsi fungsi..."></textarea>
                        </div>
                        <div class="formGroup">
                            <label for="guideNoteInput">Catatan Penting *</label>
                            <textarea id="guideNoteInput" placeholder="Masukkan catatan penting..."></textarea>
                        </div>
                        <div class="formGroup">
                            <label for="guideVideoInput">Video *</label>
                            <input type="file" id="guideVideoInput" accept="video/*">
                            <small id="currentVideoPath" style="display:block; color: var(--text2); margin-top: 4px;"></small>
                        </div>
                    </div>
                    <div class="guideFormRight">
                        <div class="formGroup">
                            <label>Steps</label>
                            <div id="stepsContainer" class="stepsContainer"></div>
                        </div>
                        <button type="button" id="btnAddStep" class="btnAddStep">+ Tambah Step</button>
                    </div>
                </div>
                <div class="modalActions">
                    <button type="submit" id="btnSubmitGuide" class="btnSubmitGuide">Save Guide</button>
                    <button type="button" id="btnCancelGuide" class="btnCancelGuide">Cancel</button>
                </div>
            </form>
        </div>
    `;

    guideModal = document.getElementById('guideModal');
    guideModalTitle = document.getElementById('guideModalTitle');
    guideForm = document.getElementById('guideForm');
    guideIdInput = document.getElementById('guideId');
    guideTitleInput = document.getElementById('guideTitleInput');
    guideDescInput = document.getElementById('guideDescInput');
    guideNoteInput = document.getElementById('guideNoteInput');
    guideVideoInput = document.getElementById('guideVideoInput');
    currentVideoPath = document.getElementById('currentVideoPath');
    stepsContainer = document.getElementById('stepsContainer');
    btnAddStep = document.getElementById('btnAddStep');
    btnCancelGuide = document.getElementById('btnCancelGuide');

    if (btnAddStep) btnAddStep.addEventListener('click', () => addStepInput());
    if (btnCancelGuide) btnCancelGuide.addEventListener('click', closeGuideModal);
    if (guideForm) guideForm.addEventListener('submit', handleSaveGuide);
}

/**
 * Global Event Listeners
 */
function setupGlobalEvents() {
    if (closeOverlayBtn) closeOverlayBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeAllModalsAndDrawer);

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });
    }
}

/**
 * Fetch Guides berdasarkan Group ID
 */
async function fetchGuidesByGroup(groupId) {
    try {
        const response = await fetch(`${API_BASE}/guides?groupId=${groupId}`);
        if (!response.ok) throw new Error('Gagal memuat daftar guide');
        state.guides = await response.json();
    } catch (error) {
        console.error('Error fetching guides:', error);
        state.guides = [];
    }
}

/**
 * Fetch Semua Guides
 */
async function fetchAllGuides() {
    try {
        const response = await fetch(`${API_BASE}/guides`);
        if (!response.ok) throw new Error('Gagal memuat guide');
        state.guides = await response.json();
    } catch (error) {
        console.error('Error fetching guides:', error);
        state.guides = [];
    }
}

/**
 * RENDER MODE 1: List Mode (Daftar Card Guide)
 */
function renderListView() {
    closeDrawer();

    const isAdmin = state.currentUser && state.currentUser.role === 'ITAdmin';

    // Menentukan nama Type dan Nama Group secara dinamis
    const typeName = state.type?.name ? state.type.name.toUpperCase() : 'GUIDE';
    const groupName = state.group?.title ? state.group.title.toUpperCase() : 'GUIDE LIST';

    viewContainer.innerHTML = `
        <header class="dashboardHeader">
            <h1 class="pageName">${escapeHTML(typeName)}</h1>
        </header>
        <main class="dashboardMain">
            <div class="content">
                <div class="typeContainer">
                    <div class="typeGroup">
                        <div class="typeButton active">
                            <h1>${escapeHTML(groupName)}</h1>
                        </div>
                    </div>
                    <div class="buttonGroup">
                        <div class="backButton">
                            <button id="btnBackDashboard" title="Kembali ke Dashboard"><i class="fa-solid fa-arrow-left"></i></button>
                        </div>
                        ${isAdmin ? `
                            <div class="addGuideButton">
                                <button id="btnAddGuide" title="Tambah Guide"><i class="fa-solid fa-plus"></i></button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="guideCardContainer">
                    ${state.guides.length > 0 
                        ? state.guides.map(guide => `
                            <div class="guideCard" data-id="${guide.id}">
                                <div>
                                    <h2>${escapeHTML(guide.title)}</h2>
                                    <p>${escapeHTML(guide.functionDesc || 'Tidak ada deskripsi.')}</p>
                                </div>
                                <i class="fa-solid fa-chevron-right"></i>
                            </div>
                        `).join('')
                        : `
                            <div class="empty-guide-state">
                                <img src="./img/guideNotFound.png" alt="Guide Not Found" class="empty-guide-img">
                                <h2>Tidak Ada Guide Ditemukan</h2>
                                <p>Maaf, guide tidak tersedia atau belum ditambahkan.</p>
                            </div>
                        `
                    }
                </div>
            </div>
        </main>
    `;

    document.getElementById('btnBackDashboard').addEventListener('click', () => {
        if (document.referrer.includes('index.html')) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    });

    if (isAdmin) {
        document.getElementById('btnAddGuide')?.addEventListener('click', () => openAddGuideModal());
    }

    document.querySelectorAll('.guideCard').forEach(card => {
        card.addEventListener('click', async () => {
            const id = card.getAttribute('data-id');
            await openGuideDetail(id);
        });
    });
}

/**
 * Fetch Detail Guide Lengkap & Masuk Mode Video
 */
async function openGuideDetail(id) {
    try {
        const response = await fetch(`${API_BASE}/guides/${id}`);
        if (!response.ok) throw new Error('Gagal memuat detail guide');

        state.currentGuide = await response.json();
        fetch(`${API_BASE}/guides/${id}/view`, { method: 'POST' }).catch(() => {});

        renderDetailView();
    } catch (error) {
        console.error('Error opening guide detail:', error);
        CustomDialog.showAlert({
            title: 'Gagal Memuat Detail',
            message: 'Gagal memuat detail guide dari server.',
            type: 'danger'
        });
    }
}

/**
 * RENDER MODE 2: Detail Mode (Video Player)
 */
function renderDetailView() {
    const guide = state.currentGuide;
    const isAdmin = state.currentUser && state.currentUser.role === 'ITAdmin';

    viewContainer.innerHTML = `
        <header class="detailHeader">
            <h1>${escapeHTML(guide.title)}</h1>
            <div class="buttonGroup">
                <div class="backButton">
                    <button id="btnBackToList" title="Back to List"><i class="fa-solid fa-arrow-left"></i></button>
                </div>
                <div class="viewButton">
                    <button id="btnViewGuide" title="See Guide Detail"><i class="fa-regular fa-eye"></i></button>
                </div>
                ${isAdmin ? `
                    <div class="editButton">
                        <button id="btnEditGuide" title="Edit Guide"><i class="fa-solid fa-pen-to-square"></i></button>
                    </div>
                    <div class="deleteButton">
                        <button id="btnDeleteGuide" title="Delete Guide"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                ` : ''}
            </div>
        </header>
        <main class="detailMain">
            <video controls autoplay muted loop src="${escapeHTML(guide.videoUrl || '')}"></video>
        </main>
    `;

    document.getElementById('btnBackToList').addEventListener('click', () => {
        renderListView();
    });

    document.getElementById('btnViewGuide').addEventListener('click', () => {
        openDrawer(guide);
    });

    if (isAdmin) {
        document.getElementById('btnEditGuide')?.addEventListener('click', () => {
            openEditGuideModal(guide);
        });

        document.getElementById('btnDeleteGuide')?.addEventListener('click', async () => {
            const isConfirmed = await CustomDialog.showConfirm({
                title: 'Hapus Guide',
                message: `Apakah Anda yakin ingin menghapus guide "${guide.title}"?`,
                confirmText: 'Ya, Hapus',
                cancelText: 'Batal'
            });

            if (isConfirmed) {
                await deleteGuide(guide.id);
            }
        });
    }
}

// =============================================================
// MODAL ADD / EDIT GUIDE LOGIC (ADMIN ONLY)
// =============================================================

function openAddGuideModal() {
    if (!state.groupId) {
        CustomDialog.showAlert({
            title: 'Group Belum Dipilih',
            message: 'Pilih Guide Group terlebih dahulu dari Dashboard.',
            type: 'warning'
        });
        return;
    }

    if (!guideModal) return;

    guideModalTitle.innerText = 'Add Guide';
    guideForm.reset();
    guideIdInput.value = '';
    state.existingVideoUrl = '';
    currentVideoPath.innerText = '';
    stepsContainer.innerHTML = '';

    addStepInput();

    backdrop.classList.add('active');
    guideModal.classList.add('active');
}

function openEditGuideModal(guide) {
    if (!guideModal) return;

    guideModalTitle.innerText = 'Edit Guide';
    guideIdInput.value = guide.id;
    guideTitleInput.value = guide.title;
    guideDescInput.value = guide.functionDesc || '';
    guideNoteInput.value = guide.importantNote || '';

    state.existingVideoUrl = guide.videoUrl || '';
    currentVideoPath.innerText = state.existingVideoUrl ? `Video saat ini: ${state.existingVideoUrl}` : '';

    stepsContainer.innerHTML = '';
    if (guide.steps && guide.steps.length > 0) {
        guide.steps.forEach(step => {
            const val = typeof step === 'string' ? step : step.stepDescription;
            addStepInput(val);
        });
    } else {
        addStepInput();
    }

    backdrop.classList.add('active');
    guideModal.classList.add('active');
}

function closeGuideModal() {
    backdrop?.classList.remove('active');
    guideModal?.classList.remove('active');
}

function closeAllModalsAndDrawer() {
    closeDrawer();
    closeGuideModal();
}

function addStepInput(value = '') {
    if (!stepsContainer) return;
    const stepDiv = document.createElement('div');
    stepDiv.className = 'stepItem';
    stepDiv.innerHTML = `
        <input type="text" class="stepInput" placeholder="Langkah guide..." value="${escapeHTML(value)}">
        <button type="button" class="btnRemoveStep" title="Hapus Step"><i class="fa-solid fa-trash-can"></i></button>
    `;

    stepDiv.querySelector('.btnRemoveStep').addEventListener('click', () => {
        stepDiv.remove();
    });

    stepsContainer.appendChild(stepDiv);
}

async function handleSaveGuide(e) {
    e.preventDefault();

    const isEdit = Boolean(guideIdInput.value);
    const id = guideIdInput.value;
    const title = guideTitleInput.value.trim();
    const functionDesc = guideDescInput.value.trim();
    const importantNote = guideNoteInput.value.trim();
    const videoFile = guideVideoInput.files[0];

    const stepInputs = document.querySelectorAll('.stepInput');
    const steps = Array.from(stepInputs)
        .map(input => input.value.trim())
        .filter(val => val !== '');

    if (!videoFile && !state.existingVideoUrl) {
        CustomDialog.showAlert({
            title: 'Video Diperlukan',
            message: 'Harap pilih file video untuk guide ini.',
            type: 'warning'
        });
        return;
    }

    if (!state.groupId) {
        CustomDialog.showAlert({
            title: 'Group ID Hilang',
            message: 'Group ID tidak valid. Silakan pilih Guide Group terlebih dahulu.',
            type: 'warning'
        });
        return;
    }

    let videoUrl = state.existingVideoUrl;

    try {
        if (videoFile) {
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('title', title);
            formData.append('groupId', state.groupId);

            const uploadRes = await fetch(`${API_BASE}/upload-video`, {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                throw new Error(errData.error || 'Gagal mengunggah video');
            }

            const uploadData = await uploadRes.json();
            videoUrl = uploadData.videoPath;
        }

        const payload = {
            groupId: parseInt(state.groupId, 10),
            title,
            functionDesc,
            importantNote,
            videoUrl,
            steps
        };

        const endpoint = isEdit ? `${API_BASE}/guides/${id}` : `${API_BASE}/guides`;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Gagal menyimpan guide');
        }

        closeGuideModal();

        if (state.groupId) {
            await fetchGuidesByGroup(state.groupId);
        } else {
            await fetchAllGuides();
        }

        if (isEdit) {
            await openGuideDetail(id);
            showToast(`Berhasil memperbarui guide "${title}"`);
        } else {
            renderListView();
            showToast(`Berhasil menambahkan guide "${title}"`);
        }

    } catch (error) {
        console.error('Error saving guide:', error);
        CustomDialog.showAlert({
            title: 'Gagal Menyimpan',
            message: error.message || 'Gagal menyimpan guide ke server.',
            type: 'danger'
        });
    }
}

/**
 * Buka Drawer Overlay Detail (Kanan)
 */
function openDrawer(guide) {
    let stepsHTML = '';
    if (guide.steps && guide.steps.length > 0) {
        stepsHTML = `
            <h3>Steps:</h3>
            <ol>
                ${guide.steps.map(step => `
                    <li>${escapeHTML(typeof step === 'string' ? step : step.stepDescription)}</li>
                `).join('')}
            </ol>
        `;
    }

    overlayContent.innerHTML = `
        <p>${escapeHTML(guide.functionDesc || '')}</p>
        
        ${guide.importantNote ? `
            <div class="noteBox">
                <strong>Important note:</strong> ${escapeHTML(guide.importantNote)}
            </div>
        ` : ''}

        ${stepsHTML}
    `;

    backdrop.classList.add('active');
    detailOverlay.classList.add('active');
}

function closeDrawer() {
    backdrop?.classList.remove('active');
    detailOverlay?.classList.remove('active');
}

async function deleteGuide(id) {
    const guideTitle = state.currentGuide ? state.currentGuide.title : '';

    const isConfirmed = await CustomDialog.showConfirm({
        title: 'Hapus Guide',
        message: `Apakah Anda yakin ingin menghapus guide ${guideTitle ? `"${guideTitle}"` : ''}?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal'
    });

    if (!isConfirmed) return;

    try {
        const response = await fetch(`${API_BASE}/guides/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Gagal menghapus guide');

        state.guides = state.guides.filter(g => g.id !== parseInt(id, 10));
        renderListView();

        // Tampilkan toast notifikasi berhasil hapus
        showToast(`Berhasil menghapus guide ${guideTitle ? `"${guideTitle}"` : ''}`);

    } catch (error) {
        console.error('Error deleting guide:', error);
        CustomDialog.showAlert({
            title: 'Gagal Hapus',
            message: 'Gagal menghapus guide dari server.',
            type: 'danger'
        });
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

document.addEventListener('DOMContentLoaded', init);
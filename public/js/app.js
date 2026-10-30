import { CustomDialog } from './dialog.js';
import { initAuth, hasRole, getCurrentUser } from './auth-state.js';

// State Management
const state = {
    typeParents: [
        { slug: 'web', title: 'Web' },
        { slug: 'mobile', title: 'Mobile' }
    ],
    types: [],
    selectedTypeId: null,
    groups: [],
    searchQuery: '',
    currentUser: null
};

const API_BASE = '/api';
let currentExistingImgUrl = '';

// Dynamic Elements Cache
let elements = {};

/**
 * Initialize Dashboard & Authenticate User
 */
async function init() {
    await initAuth(); // Inject DOM admin terlebih dahulu

    state.currentUser = getCurrentUser();

    if (hasRole('ITAdmin')) {
        injectAdminDOM();
    }
    cacheDOMElements();     // Cache elemen DOM setelah elemen admin ter-inject
    setupEventListeners(); // Pasang event listeners pada seluruh elemen
    await fetchAndRenderTypes();
}


/**
 * Injeksi elemen HTML khusus Admin ke dalam DOM
 */
function injectAdminDOM() {
    // 1. Inject Tombol Manage Types & Lonceng Log Aktivitas (Satu Kontainer)
    const typeManageContainer = document.getElementById('typeManageContainer');
    if (typeManageContainer) {
        typeManageContainer.innerHTML = `
            <button id="btnActivityLog" title="Log Aktivitas Admin"><i class="fa-solid fa-bell fa-lg"></i></button>
            <button id="btnManage" title="Manage Types"><i class="fa-solid fa-folder-plus fa-lg"></i></button>
        `;
    }

    // 2. Inject Modal Modals & Backdrop
    const holder = document.getElementById('adminModalHolder');
    if (holder) {
        holder.innerHTML = `
            <div id="backdrop" class="backdrop"></div>

            <!-- Modal Manage Type -->
            <div id="manageTypeModal" class="typeModal">
                <div class="typeModalHeader">
                    <h2>Manage Type</h2>
                    <button id="closeManageModal" class="closeModalBtn">&times;</button>
                </div>
                <div class="addTypeForm">
                    <select id="newTypeParentSelect" class="selectParent">
                        <option value="web">Web</option>
                        <option value="mobile">Mobile</option>
                    </select>
                    <input type="text" id="newTypeTitleInput" placeholder="Masukkan judul type baru...">
                    <button id="btnSubmitAddType" title="Tambah Type"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div id="typeListManage" class="typeListManage"></div>
            </div>

            <!-- Modal Edit Type Detail -->
            <div id="editTypeModal" class="typeModal">
                <div class="typeModalHeader">
                    <h2>Edit Type Detail</h2>
                    <button id="closeEditModal" class="closeModalBtn">&times;</button>
                </div>
                <form id="editTypeForm" class="editTypeForm">
                    <input type="hidden" id="editTypeId">
                    <div>
                        <label>Title</label>
                        <input type="text" id="editTypeTitle" required>
                    </div>
                    <div>
                        <label>Description</label>
                        <textarea id="editTypeDesc" rows="3" placeholder="Masukkan deskripsi..."></textarea>
                    </div>
                    <div>
                        <label>Parent Application</label>
                        <select id="editTypeParentSelect" class="selectParentInput">
                            <option value="web">Web</option>
                            <option value="mobile">Mobile</option>
                        </select>
                    </div>
                    <div>
                        <label>Upload Gambar / Screenshot Flow</label>
                        <input type="file" id="editTypeImageInput" accept="image/*">
                        <small id="currentImgUrlPath" style="display:block; margin-top: 4px; color: var(--text2);"></small>
                    </div>
                    <button type="submit" class="btnSave">Simpan Perubahan</button>
                </form>
            </div>

            <!-- Modal Manage Guide Groups -->
            <div id="manageGroupModal" class="typeModal">
                <div class="typeModalHeader">
                    <h2>Manage Guide Group</h2>
                    <button id="closeManageGroupModal" class="closeModalBtn">&times;</button>
                </div>
                <div class="addTypeForm">
                    <input type="text" id="newGroupTitleInput" placeholder="Masukkan judul group baru...">
                    <button id="btnSubmitAddGroup" title="Tambah Group"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div id="groupListManage" class="typeListManage"></div>
            </div>

            <!-- Modal Edit Guide Group Detail -->
            <div id="editGroupModal" class="typeModal">
                <div class="typeModalHeader">
                    <h2>Edit Guide Group</h2>
                    <button id="closeEditGroupModal" class="closeModalBtn">&times;</button>
                </div>
                <form id="editGroupForm" class="editTypeForm">
                    <input type="hidden" id="editGroupId">
                    <div>
                        <label>Title</label>
                        <input type="text" id="editGroupTitle" required>
                    </div>
                    <div>
                        <label>Description</label>
                        <textarea id="editGroupDesc" rows="3" placeholder="Masukkan deskripsi group..."></textarea>
                    </div>
                    <div>
                        <label>Order Position</label>
                        <input type="number" id="editGroupOrder" value="0">
                    </div>
                    <button type="submit" class="btnSave">Simpan Perubahan</button>
                </form>
            </div>
        `;
    }
}

/**
 * Cache Element Selectors
 */
function cacheDOMElements() {
    elements = {
        typesContainer: document.getElementById('types'),
        typeName: document.getElementById('typeName'),
        typeDesc: document.getElementById('typeDesc'),
        typeIdentityContainer: document.querySelector('.typeIdentity'),
        typeImageContainer: document.querySelector('.typeImage'),
        guideGroupContainer: document.getElementById('guideGroup'),
        searchBar: document.getElementById('searchBar'),
        searchBtn: document.getElementById('searchBtn'),
        fullscreenBtn: document.getElementById('fullscreen'),

        // Admin Elements (Akan ada jika di-inject)
        btnManage: document.getElementById('btnManage'),
        btnActivityLog: document.getElementById('btnActivityLog'),
        backdrop: document.getElementById('backdrop'),
        manageTypeModal: document.getElementById('manageTypeModal'),
        closeManageModal: document.getElementById('closeManageModal'),
        newTypeTitleInput: document.getElementById('newTypeTitleInput'),
        btnSubmitAddType: document.getElementById('btnSubmitAddType'),
        typeListManage: document.getElementById('typeListManage'),
        newTypeParentSelect: document.getElementById('newTypeParentSelect'),

        editTypeModal: document.getElementById('editTypeModal'),
        closeEditModal: document.getElementById('closeEditModal'),
        editTypeForm: document.getElementById('editTypeForm'),
        editTypeId: document.getElementById('editTypeId'),
        editTypeTitle: document.getElementById('editTypeTitle'),
        editTypeDesc: document.getElementById('editTypeDesc'),
        editTypeImageInput: document.getElementById('editTypeImageInput'),
        currentImgUrlPath: document.getElementById('currentImgUrlPath'),
        editTypeParentSelect: document.getElementById('editTypeParentSelect'),

        manageGroupModal: document.getElementById('manageGroupModal'),
        closeManageGroupModal: document.getElementById('closeManageGroupModal'),
        newGroupTitleInput: document.getElementById('newGroupTitleInput'),
        btnSubmitAddGroup: document.getElementById('btnSubmitAddGroup'),
        groupListManage: document.getElementById('groupListManage'),

        editGroupModal: document.getElementById('editGroupModal'),
        closeEditGroupModal: document.getElementById('closeEditGroupModal'),
        editGroupForm: document.getElementById('editGroupForm'),
        editGroupId: document.getElementById('editGroupId'),
        editGroupTitle: document.getElementById('editGroupTitle'),
        editGroupDesc: document.getElementById('editGroupDesc'),
        editGroupOrder: document.getElementById('editGroupOrder')
    };
}

/**
 * Global Event Listeners
 */
function setupEventListeners() {
    if (elements.searchBtn) elements.searchBtn.addEventListener('click', handleSearch);
    if (elements.searchBar) {
        elements.searchBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    if (elements.fullscreenBtn) {
        elements.fullscreenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleFullscreen();
        });
    }

    // Event listener admin hanya diaktifkan jika elemen ter-inject
    if (elements.btnManage) elements.btnManage.addEventListener('click', openManageModal);
    if (elements.btnActivityLog) elements.btnActivityLog.addEventListener('click', renderActivityLogView);
    if (elements.closeManageModal) elements.closeManageModal.addEventListener('click', closeAllModals);
    if (elements.closeEditModal) elements.closeEditModal.addEventListener('click', closeAllModals);
    if (elements.backdrop) elements.backdrop.addEventListener('click', closeAllModals);

    if (elements.btnSubmitAddType) elements.btnSubmitAddType.addEventListener('click', handleCreateType);
    if (elements.newTypeTitleInput) {
        elements.newTypeTitleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCreateType();
        });
    }

    if (elements.newTypeParentSelect) {
        elements.newTypeParentSelect.addEventListener('change', () => {
            renderManageTypeList();
        });
    }

    if (elements.editTypeForm) elements.editTypeForm.addEventListener('submit', handleUpdateType);

    if (elements.closeManageGroupModal) elements.closeManageGroupModal.addEventListener('click', closeAllModals);
    if (elements.closeEditGroupModal) elements.closeEditGroupModal.addEventListener('click', closeAllModals);
    if (elements.btnSubmitAddGroup) elements.btnSubmitAddGroup.addEventListener('click', handleCreateGroup);
    if (elements.newGroupTitleInput) {
        elements.newGroupTitleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCreateGroup();
        });
    }
    if (elements.editGroupForm) elements.editGroupForm.addEventListener('submit', handleUpdateGroup);
}

/**
 * Render Tampilan Default (Welcome Screen QuantumGuide)
 */
function renderDefaultView() {
    state.selectedTypeId = null;
    
    renderTypeTabs();

    if (elements.typeIdentityContainer) {
        elements.typeIdentityContainer.className = 'typeIdentity default-landing-center';
        elements.typeIdentityContainer.innerHTML = `
            <div class="default-landing-content">
                <h1>Quantum Guide</h1>
                <p>
                    Selamat datang di <strong>QuantumGuide</strong>, pusat dokumentasi dan panduan resmi untuk seluruh ekosistem aplikasi PT Quantum Nusatama. 
                    Platform ini menyediakan panduan langkah demi langkah, serta dokumentasi video untuk membantu Anda mengoperasikan berbagai aplikasi perusahaan secara efisien.
                </p>
                <p>
                    Silakan pilih jenis modul atau aplikasi pada menu di atas untuk mulai menjelajahi panduan penggunaan.
                </p>
                <img src="./img/dashboard.png" alt="QuantumGuide Illustration" class="default-guide-img">
            </div>
        `;
    }

    if (elements.guideGroupContainer) {
        elements.guideGroupContainer.innerHTML = '';
        elements.guideGroupContainer.style.display = 'none';
    }
}

/**
 * Render Tampilan Log Aktivitas saat Lonceng diklik
 */
async function renderActivityLogView() {
    state.selectedTypeId = null;
    renderTypeTabs();

    if (elements.guideGroupContainer) {
        elements.guideGroupContainer.innerHTML = '';
        elements.guideGroupContainer.style.display = 'none';
    }

    if (!elements.typeIdentityContainer) return;

    elements.typeIdentityContainer.className = 'typeIdentity activity-log-view';
    elements.typeIdentityContainer.innerHTML = `
        <div class="logContainerHeader">
            <h2><i class="fa-solid fa-bell"></i> Log Aktivitas Sistem</h2>
            <div class="logHeaderActions">
                <select id="logMethodFilter" class="logFilterSelect">
                    <option value="ALL">Semua Method</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                </select>
                <button id="btnCloseLogView" class="closeModalBtn" title="Tutup Log">&times;</button>
            </div>
        </div>
        <div id="logListContent" class="logListContent">
            <p style="text-align: center; color: var(--text2);">Memuat data log...</p>
        </div>
    `;

    document.getElementById('btnCloseLogView')?.addEventListener('click', renderDefaultView);

    // Event listener untuk filter method
    document.getElementById('logMethodFilter')?.addEventListener('change', (e) => {
        const selectedMethod = e.target.value;
        const rows = document.querySelectorAll('.logTable tbody tr');
        
        rows.forEach(row => {
            const rowMethod = row.getAttribute('data-method');
            if (selectedMethod === 'ALL' || rowMethod === selectedMethod) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    try {
        const response = await fetch(`${API_BASE}/admin/logs`);
        if (!response.ok) throw new Error('Gagal mengambil data log');

        const logs = await response.json();
        const logContent = document.getElementById('logListContent');

        if (!logContent) return;

        if (logs.length === 0) {
            logContent.innerHTML = '<p style="text-align: center; padding: 1rem;">Belum ada riwayat aktivitas.</p>';
            return;
        }

        logContent.innerHTML = `
            <table class="logTable">
                <thead>
                    <tr>
                        <th>Waktu</th>
                        <th>User / Role</th>
                        <th>Aksi</th>
                        <th>Method</th>
                        <th>IP Address</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(log => `
                        <tr data-method="${log.method}">
                            <td>${new Date(log.createdAt).toLocaleString('id-ID')}</td>
                            <td><strong>${escapeHTML(log.userName || 'Guest')}</strong> (${escapeHTML(log.userRole || '-')})</td>
                            <td>${escapeHTML(log.action)}</td>
                            <td><span class="badge-method ${log.method}">${log.method}</span></td>
                            <td>${escapeHTML(log.ipAddress || '-')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading activity logs:', error);
        const logContent = document.getElementById('logListContent');
        if (logContent) {
            logContent.innerHTML = '<p style="text-align: center; color: var(--danger); padding: 1rem;">Gagal memuat log aktivitas.</p>';
        }
    }
}

/**
 * Restore Elemen DOM Asli di typeIdentityContainer saat Type dipilih
 */
function restoreTypeIdentityDOM() {
    if (!elements.typeIdentityContainer) return;

    // Kembalikan class bawaan
    elements.typeIdentityContainer.className = 'typeIdentity';

    // Restorasi struktur HTML internal untuk type
    elements.typeIdentityContainer.innerHTML = `
        <div class="typeDetail">
            <div id="typeName"></div>
            <div id="typeDesc"></div>
        </div>
        <div class="typeImage"></div>
    `;

    // Re-cache elemen-elemen anak agar reference di objek `elements` tetap valid
    elements.typeName = document.getElementById('typeName');
    elements.typeDesc = document.getElementById('typeDesc');
    elements.typeImageContainer = document.querySelector('.typeImage');
}

/**
 * Fetch All Types
 */
async function fetchAndRenderTypes() {
    try {
        const response = await fetch(`${API_BASE}/types`);
        if (!response.ok) throw new Error('Failed to load types');
        
        state.types = await response.json();
        
        if (state.types.length === 0) {
            elements.typesContainer.innerHTML = `
                <div class="typeGroup">
                    <div class="dropdownBtn disabled"><span>No Types Available</span></div>
                </div>
            `;
            return;
        }

        renderTypeTabs();
        
        // Panggil tampilan default saat pertama kali load / refresh
        renderDefaultView();

    } catch (error) {
        console.error('Error fetching types:', error);
        elements.typesContainer.innerHTML = `
            <div class="typeGroup">
                <div class="dropdownBtn disabled"><span>Error Loading Types</span></div>
            </div>
        `;
    }
}

function renderTypeTabs() {
    elements.typesContainer.innerHTML = '';

    state.typeParents.forEach(parent => {
        const dropdown = document.createElement('div');
        dropdown.className = 'typeDropdown';

        const parentTypes = state.types.filter(t => t.parentSlug === parent.slug);
        const isParentActive = parentTypes.some(t => t.id === state.selectedTypeId);

        dropdown.innerHTML = `
            <button class="dropdownBtn ${isParentActive ? 'active' : ''}">
                <span>${escapeHTML(parent.title)}</span>
                <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="dropdownMenu">
                ${parentTypes.length > 0 
                    ? parentTypes.map(type => `
                        <div class="dropdownItem ${type.id === state.selectedTypeId ? 'active' : ''}" data-id="${type.id}">
                            ${escapeHTML(type.title)}
                        </div>
                    `).join('') 
                    : '<div class="dropdownItem disabled">Belum ada type</div>'
                }
            </div>
        `;

        dropdown.querySelectorAll('.dropdownItem[data-id]').forEach(item => {
            item.addEventListener('click', (e) => {
                const typeId = parseInt(e.target.dataset.id, 10);
                if (state.selectedTypeId !== typeId) {
                    selectType(typeId);
                }
            });
        });

        elements.typesContainer.appendChild(dropdown);
    });
}

/**
 * Select Type
 */
async function selectType(typeId) {
    state.selectedTypeId = typeId;
    renderTypeTabs();

    if (elements.guideGroupContainer) {
        elements.guideGroupContainer.style.display = '';
    }

    restoreTypeIdentityDOM();

    try {
        const response = await fetch(`${API_BASE}/types/${typeId}`);
        if (!response.ok) throw new Error('Failed to load type details');

        const typeData = await response.json();

        renderTypeIdentity(typeData);
        renderTypeImage(typeData.imgUrl);
        await fetchAndRenderGuideGroups(typeId);

    } catch (error) {
        console.error('Error selecting type:', error);
    }
}

function renderTypeIdentity(typeData) {
    elements.typeName.innerHTML = `<h1>${escapeHTML(typeData.title)}</h1>`;
    elements.typeDesc.innerHTML = `<p>${escapeHTML(typeData.description || 'No description available for this type.')}</p>`;
}

function renderTypeImage(imgUrl) {
    if (!elements.typeImageContainer) return;

    if (imgUrl) {
        elements.typeImageContainer.innerHTML = `
            <img id="typeImgElement" src="${escapeHTML(imgUrl)}" alt="Type Image" onerror="this.onerror=null; this.src='./img/screenshot.png';">
        `;

        const imgElement = document.getElementById('typeImgElement');
        if (imgElement && elements.typeIdentityContainer) {
            imgElement.onload = function () {
                if (this.naturalHeight > this.naturalWidth) {
                    elements.typeIdentityContainer.classList.add('is-vertical');
                } else {
                    elements.typeIdentityContainer.classList.remove('is-vertical');
                }
            };
        }
    } else {
        if (elements.typeIdentityContainer) {
            elements.typeIdentityContainer.classList.remove('is-vertical');
        }
        elements.typeImageContainer.innerHTML = `
            <p style="padding-top:1rem;">No image available.</p>
        `;
    }
}

async function fetchAndRenderGuideGroups(typeId) {
    try {
        const response = await fetch(`${API_BASE}/groups?typeId=${typeId}`);
        if (!response.ok) throw new Error('Failed to load guide groups');

        state.groups = await response.json();
        renderGuideGroups(state.groups);
    } catch (error) {
        console.error('Error fetching guide groups:', error);
        elements.guideGroupContainer.innerHTML = '<h1>Guide</h1><p>Error loading guide groups.</p>';
    }
}

function renderGuideGroups(groups) {
    const isAdmin = state.currentUser && state.currentUser.role === 'ITAdmin';

    let contentHTML = `
        <div class="guideHeader">
            <div class="guideTitleRow">
                <h1>Guide</h1>
                ${isAdmin ? `
                    <button id="btnManageGroup" class="btnManageGroup" title="Manage Guide Group">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                ` : ''}
            </div>
            <div class="searchContainer" style="position: relative;">
                <input id="searchBar" type="text" placeholder="Cari guide..." autocomplete="off">
                <button id="searchBtn"><i class="fa-solid fa-magnifying-glass"></i></button>
                <div id="searchSuggestions" class="search-suggestions-dropdown" style="display: none;"></div>
            </div>
        </div>
        <div id="groupListContainer"></div>
    `;

    elements.guideGroupContainer.innerHTML = contentHTML;

    const listContainer = document.getElementById('groupListContainer');

    function renderList(filteredGroups) {
        listContainer.innerHTML = '';

        if (filteredGroups.length === 0) {
            listContainer.innerHTML = '<p style="margin-top:1rem;">No guides found.</p>';
            return;
        }

        filteredGroups.forEach((group) => {
            const groupCard = document.createElement('div');
            groupCard.className = 'guideGroup';
            groupCard.innerHTML = `
                <h1>${escapeHTML(group.title)}</h1>
            `;

            groupCard.addEventListener('click', () => handleGuideGroupClick(group));
            listContainer.appendChild(groupCard);
        });
    }

    renderList(groups);
    setupSearchSuggestions(groups);

    if (isAdmin) {
        document.getElementById('btnManageGroup')?.addEventListener('click', openManageGroupModal);
    }
}

// =============================================================
// MODAL CRUD TYPE MANAGEMENT (ADMIN ONLY)
// =============================================================

function openManageModal() {
    renderManageTypeList();
    elements.backdrop?.classList.add('active');
    elements.manageTypeModal?.classList.add('active');
}

function closeAllModals() {
    elements.backdrop?.classList.remove('active');
    elements.manageTypeModal?.classList.remove('active');
    elements.editTypeModal?.classList.remove('active');
    elements.manageGroupModal?.classList.remove('active');
    elements.editGroupModal?.classList.remove('active');
}

function renderManageTypeList() {
    if (!elements.typeListManage) return;
    elements.typeListManage.innerHTML = '';

    const selectedParentSlug = elements.newTypeParentSelect ? elements.newTypeParentSelect.value : 'web';
    const filteredTypes = state.types.filter(type => type.parentSlug === selectedParentSlug);

    if (filteredTypes.length === 0) {
        elements.typeListManage.innerHTML = `<p style="text-align:center;">Belum ada type untuk parent "${escapeHTML(selectedParentSlug)}".</p>`;
        return;
    }

    filteredTypes.forEach((type) => {
        const item = document.createElement('div');
        item.className = 'manageTypeItem';
        item.innerHTML = `
            <div class="manageTypeTitle">${escapeHTML(type.title)}</div>
            <div class="manageTypeActions">
                <button class="btnEdit" title="Edit Detail"><i class="fa-regular fa-pen-to-square"></i></button>
                <button class="btnDelete" title="Hapus Type"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;

        item.querySelector('.btnEdit').addEventListener('click', () => openEditTypeModal(type));
        item.querySelector('.btnDelete').addEventListener('click', () => handleDeleteType(type.id, type.title));

        elements.typeListManage.appendChild(item);
    });
}

async function handleCreateType() {
    const parentSlug = elements.newTypeParentSelect.value;
    const title = elements.newTypeTitleInput.value.trim();

    if (!title) {
        await CustomDialog.showAlert({
            title: 'Input Kosong',
            message: 'Judul Type tidak boleh kosong!',
            type: 'warning'
        });
        return;
    }

    const normalizedInput = title.toLowerCase().replace(/\s+/g, '');
    const isDuplicate = state.types.some(type => {
        const normalizedExisting = type.title.trim().toLowerCase().replace(/\s+/g, '');
        return normalizedExisting === normalizedInput;
    });

    if (isDuplicate) {
        await CustomDialog.showAlert({
            title: 'Nama Duplikat',
            message: `Type dengan nama "${title}" sudah ada. Silakan gunakan nama lain!`,
            type: 'warning'
        });
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/types`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                parentSlug: parentSlug,
                title: title,
                description: "",
                imgUrl: ""
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Gagal menambah Type');
        }

        elements.newTypeTitleInput.value = '';
        await fetchAndRenderTypes();
        renderManageTypeList();
        showToast(`Berhasil menambahkan type "${title}"`);

    } catch (error) {
        console.error('Error creating type:', error);
        await CustomDialog.showAlert({
            title: 'Gagal Tambah Type',
            message: error.message || 'Gagal membuat type.',
            type: 'danger'
        });
    }
}

function openEditTypeModal(type) {
    elements.editTypeId.value = type.id;
    elements.editTypeTitle.value = type.title;
    elements.editTypeTitle.dataset.originalTitle = type.title;
    elements.editTypeDesc.value = type.description || '';
    
    if (elements.editTypeParentSelect) {
        elements.editTypeParentSelect.value = type.parentSlug || 'web';
    }

    currentExistingImgUrl = type.imgUrl || '';
    if (elements.currentImgUrlPath) {
        elements.currentImgUrlPath.innerText = currentExistingImgUrl 
            ? `Path saat ini: ${currentExistingImgUrl}` 
            : 'Belum ada gambar yang diunggah';
    }

    if (elements.editTypeImageInput) elements.editTypeImageInput.value = '';

    elements.manageTypeModal.classList.remove('active');
    elements.editTypeModal.classList.add('active');
}

async function handleUpdateType(e) {
    e.preventDefault();

    const id = elements.editTypeId.value;
    const title = elements.editTypeTitle.value.trim();
    const description = elements.editTypeDesc.value.trim();
    const imageFile = elements.editTypeImageInput?.files ? elements.editTypeImageInput.files[0] : null;
    const parentSlug = elements.editTypeParentSelect ? elements.editTypeParentSelect.value : 'web';
    
    if (!title) {
        await CustomDialog.showAlert({
            title: 'Input Kosong',
            message: 'Judul Type tidak boleh kosong!',
            type: 'warning'
        });
        return;
    }

    const normalizedInput = title.toLowerCase().replace(/\s+/g, '');
    const isDuplicate = state.types.some(type => {
        if (type.id === parseInt(id, 10)) return false;
        const normalizedExisting = type.title.trim().toLowerCase().replace(/\s+/g, '');
        return normalizedExisting === normalizedInput;
    });

    if (isDuplicate) {
        await CustomDialog.showAlert({
            title: 'Nama Duplikat',
            message: `Type dengan nama "${title}" sudah digunakan oleh Type lain. Silakan gunakan nama lain!`,
            type: 'warning'
        });
        return;
    }

    let finalImgUrl = currentExistingImgUrl;

    try {
        if (imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('typeName', title);

            const uploadRes = await fetch(`${API_BASE}/upload-image`, {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                throw new Error(errData.error || 'Gagal mengunggah gambar');
            }

            const uploadData = await uploadRes.json();
            finalImgUrl = uploadData.imgUrl;
        }

        const response = await fetch(`${API_BASE}/types/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                parentSlug,
                title, 
                description, 
                imgUrl: finalImgUrl 
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Gagal memperbarui Type');
        }

        closeAllModals();
        await fetchAndRenderTypes();
        if (state.selectedTypeId == id) selectType(id);
        showToast(`Berhasil memperbarui type "${title}"`);

    } catch (error) {
        console.error('Error updating type:', error);
        await CustomDialog.showAlert({
            title: 'Gagal Update Type',
            message: error.message || 'Gagal mengupdate type.',
            type: 'danger'
        });
    }
}

async function handleDeleteType(id, title) {
    const isConfirmed = await CustomDialog.showConfirm({
        title: 'Hapus Type',
        message: `Apakah Anda yakin ingin menghapus Type "${title}"?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal'
    });

    if (!isConfirmed) return;

    try {
        const response = await fetch(`${API_BASE}/types/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Gagal menghapus Type');

        await fetchAndRenderTypes();
        renderManageTypeList();

        if (state.selectedTypeId == id) {
            state.selectedTypeId = state.types.length > 0 ? state.types[0].id : null;
            if (state.selectedTypeId) selectType(state.selectedTypeId);
        }

        showToast(`Berhasil menghapus type "${title}"`);

    } catch (error) {
        console.error('Error deleting type:', error);
        await CustomDialog.showAlert({
            title: 'Gagal Hapus',
            message: 'Gagal menghapus type dari server.',
            type: 'danger'
        });
    }
}

// =============================================================
// MODAL CRUD GUIDE GROUP MANAGEMENT (ADMIN ONLY)
// =============================================================

function openManageGroupModal() {
    if (!state.selectedTypeId) return;
    renderManageGroupList();
    elements.backdrop?.classList.add('active');
    elements.manageGroupModal?.classList.add('active');
}

function renderManageGroupList() {
    if (!elements.groupListManage) return;
    elements.groupListManage.innerHTML = '';

    if (state.groups.length === 0) {
        elements.groupListManage.innerHTML = '<p style="text-align:center;">Belum ada Guide Group.</p>';
        return;
    }

    state.groups.forEach((group) => {
        const item = document.createElement('div');
        item.className = 'manageTypeItem';
        item.innerHTML = `
            <div class="manageTypeTitle">${escapeHTML(group.title)}</div>
            <div class="manageTypeActions">
                <button class="btnEdit" title="Edit Group"><i class="fa-regular fa-pen-to-square"></i></button>
                <button class="btnDelete" title="Hapus Group"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;

        item.querySelector('.btnEdit').addEventListener('click', () => openEditGroupModal(group));
        item.querySelector('.btnDelete').addEventListener('click', () => handleDeleteGroup(group.id, group.title));

        elements.groupListManage.appendChild(item);
    });
}

async function handleCreateGroup() {
    const title = elements.newGroupTitleInput.value.trim();

    if (!state.selectedTypeId) {
        await CustomDialog.showAlert({
            title: 'Type Belum Dipilih',
            message: 'Pilih Type terlebih dahulu sebelum menambahkan group!',
            type: 'warning'
        });
        return;
    }

    if (!title) {
        await CustomDialog.showAlert({
            title: 'Input Kosong',
            message: 'Judul Guide Group tidak boleh kosong!',
            type: 'warning'
        });
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                typeId: state.selectedTypeId,
                title: title,
                description: "",
                groupOrder: state.groups.length + 1
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Gagal menambah Guide Group');
        }

        elements.newGroupTitleInput.value = '';
        await fetchAndRenderGuideGroups(state.selectedTypeId);
        renderManageGroupList();
        showToast(`Berhasil menambahkan group "${title}"`);

    } catch (error) {
        console.error('Error creating group:', error);
        await CustomDialog.showAlert({
            title: 'Gagal Tambah Group',
            message: error.message || 'Gagal membuat guide group.',
            type: 'danger'
        });
    }
}

function openEditGroupModal(group) {
    elements.editGroupId.value = group.id;
    elements.editGroupTitle.value = group.title;
    elements.editGroupDesc.value = group.description || '';
    elements.editGroupOrder.value = group.groupOrder || 0;

    if (elements.editGroupForm) {
        elements.editGroupForm.dataset.typeId = group.typeId || group.type_id || state.selectedTypeId;
    }

    elements.manageGroupModal.classList.remove('active');
    elements.editGroupModal.classList.add('active');
}

async function handleUpdateGroup(e) {
    e.preventDefault();

    const id = elements.editGroupId.value;
    const title = elements.editGroupTitle.value.trim();
    const description = elements.editGroupDesc.value.trim();
    const groupOrder = parseInt(elements.editGroupOrder.value, 10) || 0;

    const targetTypeId = elements.editGroupForm?.dataset?.typeId || state.selectedTypeId;

    if (!targetTypeId) {
        await CustomDialog.showAlert({
            title: 'Type ID Hilang',
            message: 'Gagal memperbarui: Type ID tidak ditemukan.',
            type: 'danger'
        });
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/groups/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                typeId: parseInt(targetTypeId, 10),
                title,
                description,
                groupOrder
            })
        });

        const responseText = await response.text();
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseErr) {
            throw new Error(`Server Error (${response.status}): Respons bukan format JSON.`);
        }

        if (!response.ok) {
            throw new Error(responseData.error || 'Gagal memperbarui Guide Group');
        }

        closeAllModals();
        await fetchAndRenderGuideGroups(targetTypeId);
        showToast(`Berhasil memperbarui group "${title}"`);

    } catch (error) {
        console.error('Error updating group:', error);
        await CustomDialog.showAlert({
            title: 'Gagal Update Group',
            message: error.message || 'Gagal mengupdate guide group.',
            type: 'danger'
        });
    }
}

async function handleDeleteGroup(id, title) {
    const isConfirmed = await CustomDialog.showConfirm({
        title: 'Hapus Guide Group',
        message: `Apakah Anda yakin ingin menghapus Group "${title}" beserta seluruh guidenya?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal'
    });

    if (!isConfirmed) return;

    try {
        const response = await fetch(`${API_BASE}/groups/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Gagal menghapus Guide Group');

        await fetchAndRenderGuideGroups(state.selectedTypeId);
        renderManageGroupList();
        showToast(`Berhasil menghapus group "${title}"`);

    } catch (error) {
        console.error('Error deleting group:', error);
        await CustomDialog.showAlert({
            title: 'Gagal Hapus',
            message: 'Gagal menghapus group dari server.',
            type: 'danger'
        });
    }
}

// Helpers
function handleSearch() {
    const query = elements.searchBar.value.trim().toLowerCase();
    state.searchQuery = query;

    if (!query) {
        renderGuideGroups(state.groups);
        return;
    }

    const filteredGroups = state.groups.filter(group => {
        const matchGroup = group.title.toLowerCase().includes(query) || 
                           (group.description && group.description.toLowerCase().includes(query));

        const matchGuide = group.guides && group.guides.some(guide => 
            guide.title.toLowerCase().includes(query) ||
            (guide.functionDesc && guide.functionDesc.toLowerCase().includes(query))
        );

        return matchGroup || matchGuide;
    });

    renderGuideGroups(filteredGroups);
}

function updateActiveSuggestion(items, selectedIndex) {
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

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

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setupSearchSuggestions(groups) {
    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('searchBtn');
    const suggestionsBox = document.getElementById('searchSuggestions');

    if (!searchBar || !suggestionsBox) return;

    searchBar.value = '';
    let selectedIndex = -1;

    function showSuggestions() {
        const query = searchBar.value.toLowerCase().trim();
        selectedIndex = -1;

        if (!query) {
            suggestionsBox.style.display = 'none';
            suggestionsBox.innerHTML = '';
            return;
        }

        const matches = [];

        groups.forEach(group => {
            if (group.title.toLowerCase().includes(query) || 
               (group.description && group.description.toLowerCase().includes(query))) {
                matches.push({
                    type: 'group',
                    id: group.id,
                    groupId: group.id,
                    displayText: group.title,
                    groupTitle: group.title
                });
            }

            if (group.guides && Array.isArray(group.guides)) {
                group.guides.forEach(guide => {
                    const matchTitle = guide.title.toLowerCase().includes(query);
                    const matchDesc = guide.functionDesc && guide.functionDesc.toLowerCase().includes(query);

                    if (matchTitle || matchDesc) {
                        matches.push({
                            type: 'guide',
                            id: guide.id,
                            groupId: group.id,
                            displayText: `${group.title} : ${guide.title}`,
                            groupTitle: group.title,
                            guideTitle: guide.title
                        });
                    }
                });
            }
        });

        if (matches.length === 0) {
            suggestionsBox.style.display = 'none';
            suggestionsBox.innerHTML = '';
            return;
        }

        suggestionsBox.innerHTML = matches.map((item, index) => `
            <div class="suggestion-item" 
                 data-type="${item.type}" 
                 data-id="${item.id}" 
                 data-group-id="${item.groupId}" 
                 data-index="${index}">
                <i class="fa-solid ${item.type === 'guide' ? 'fa-file-lines' : 'fa-folder'} icon-search"></i>
                <span class="suggestion-text">${highlightMatch(item.displayText, query)}</span>
            </div>
        `).join('');

        suggestionsBox.style.display = 'block';

        suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const targetType = item.dataset.type;
                const targetId = item.dataset.id;
                const targetGroupId = item.dataset.groupId;

                searchBar.value = '';
                suggestionsBox.style.display = 'none';

                // --- LOGIKA NAVIGASI ---
                if (targetType === 'guide') {
                    // Opsi A: Jika berpindah halaman dengan query parameter
                    window.location.href = `guide.html?groupId=${targetGroupId}&guideId=${targetId}`;
                    
                    // Opsi B: Jika SPA (Single Page Application), panggil fungsi render langsung:
                    // renderSpecificGuide(targetGroupId, targetId);
                } else {
                    window.location.href = `guide.html?groupId=${targetGroupId}`;
                }
            });
        });
    }

    function highlightMatch(text, query) {
        if (!query) return escapeHTML(text);
        
        // Escape regex special characters
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        
        // Split berdasarkan match agar bisa meng-escape teks non-match dan menyisipkan <strong>
        const parts = text.split(regex);
        return parts.map(part => {
            if (part.toLowerCase() === query.toLowerCase()) {
                return `<strong>${escapeHTML(part)}</strong>`;
            }
            return escapeHTML(part);
        }).join('');
    }

    function updateActiveSuggestion(items, index) {
        items.forEach((item, idx) => {
            if (idx === index) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    searchBar.addEventListener('input', showSuggestions);
    searchBar.addEventListener('focus', showSuggestions);

    searchBar.addEventListener('keydown', (e) => {
        const items = suggestionsBox.querySelectorAll('.suggestion-item');
        const isBoxVisible = suggestionsBox.style.display === 'block' && items.length > 0;

        if (e.key === 'ArrowDown') {
            if (!isBoxVisible) return;
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateActiveSuggestion(items, selectedIndex);

        } else if (e.key === 'ArrowUp') {
            if (!isBoxVisible) return;
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateActiveSuggestion(items, selectedIndex);

        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isBoxVisible && selectedIndex >= 0 && items[selectedIndex]) {
                items[selectedIndex].click();
                selectedIndex = -1;
            } else {
                suggestionsBox.style.display = 'none';
                selectedIndex = -1;
                if (typeof handleSearch === 'function') handleSearch();
            }

        } else if (e.key === 'Escape') {
            suggestionsBox.style.display = 'none';
            selectedIndex = -1;
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.searchContainer')) {
            suggestionsBox.style.display = 'none';
            selectedIndex = -1;
        }
    });

    searchBtn?.addEventListener('click', () => {
        suggestionsBox.style.display = 'none';
        selectedIndex = -1;
        if (typeof handleSearch === 'function') handleSearch();
    });
}

function handleGuideGroupClick(group) {
    window.location.href = `guide.html?groupId=${group.id}`;
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
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
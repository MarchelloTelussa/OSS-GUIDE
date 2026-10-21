// State Management
const state = {
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
    await checkUserAuth(); // Inject DOM admin terlebih dahulu
    cacheDOMElements();     // Cache elemen DOM setelah elemen admin ter-inject
    setupEventListeners(); // Pasang event listeners pada seluruh elemen
    await fetchAndRenderTypes();
}

/**
 * Cek Autentikasi User & Inject Modal Admin jika ITAdmin
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

    // Hanya jika role == 'ITAdmin', suntikkan elemen DOM khusus admin
    if (state.currentUser && state.currentUser.role === 'ITAdmin') {
        injectAdminDOM();
    }
}

/**
 * Injeksi elemen HTML khusus Admin ke dalam DOM
 */
function injectAdminDOM() {
    // 1. Inject Tombol Manage Types
    const typeManageContainer = document.getElementById('typeManageContainer');
    if (typeManageContainer) {
        typeManageContainer.innerHTML = `
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
                    <h2>Manage Type Guide</h2>
                    <button id="closeManageModal" class="closeModalBtn">&times;</button>
                </div>
                <div class="addTypeForm">
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
        backdrop: document.getElementById('backdrop'),
        manageTypeModal: document.getElementById('manageTypeModal'),
        closeManageModal: document.getElementById('closeManageModal'),
        newTypeTitleInput: document.getElementById('newTypeTitleInput'),
        btnSubmitAddType: document.getElementById('btnSubmitAddType'),
        typeListManage: document.getElementById('typeListManage'),

        editTypeModal: document.getElementById('editTypeModal'),
        closeEditModal: document.getElementById('closeEditModal'),
        editTypeForm: document.getElementById('editTypeForm'),
        editTypeId: document.getElementById('editTypeId'),
        editTypeTitle: document.getElementById('editTypeTitle'),
        editTypeDesc: document.getElementById('editTypeDesc'),
        editTypeImageInput: document.getElementById('editTypeImageInput'),
        currentImgUrlPath: document.getElementById('currentImgUrlPath'),

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
    if (elements.closeManageModal) elements.closeManageModal.addEventListener('click', closeAllModals);
    if (elements.closeEditModal) elements.closeEditModal.addEventListener('click', closeAllModals);
    if (elements.backdrop) elements.backdrop.addEventListener('click', closeAllModals);

    if (elements.btnSubmitAddType) elements.btnSubmitAddType.addEventListener('click', handleCreateType);
    if (elements.newTypeTitleInput) {
        elements.newTypeTitleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCreateType();
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
 * Fetch All Types
 */
async function fetchAndRenderTypes() {
    try {
        const response = await fetch(`${API_BASE}/types`);
        if (!response.ok) throw new Error('Failed to load types');
        
        state.types = await response.json();
        
        if (state.types.length === 0) {
            elements.typesContainer.innerHTML = '<div class="typeButton"><h1>No Types</h1></div>';
            return;
        }

        renderTypeTabs();
        
        if (!state.selectedTypeId && state.types.length > 0) {
            selectType(state.types[0].id);
        } else {
            renderTypeTabs();
        }
    } catch (error) {
        console.error('Error fetching types:', error);
        elements.typesContainer.innerHTML = '<div class="typeButton"><h1>Error Loading</h1></div>';
    }
}

function renderTypeTabs() {
    elements.typesContainer.innerHTML = '';

    state.types.forEach((type) => {
        const typeTab = document.createElement('div');
        const isActive = type.id === state.selectedTypeId;
        typeTab.className = `typeButton ${isActive ? 'active' : ''}`;
        typeTab.innerHTML = `<h1>${escapeHTML(type.title)}</h1>`;

        typeTab.addEventListener('click', () => {
            if (state.selectedTypeId !== type.id) {
                selectType(type.id);
            }
        });

        elements.typesContainer.appendChild(typeTab);
    });
}

async function selectType(typeId) {
    state.selectedTypeId = typeId;
    renderTypeTabs();

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
            <h1>Guide</h1>
            ${isAdmin ? `
                <button id="btnManageGroup" class="btnManageGroup" title="Manage Guide Group">
                    <i class="fa-solid fa-folder-plus"></i>
                </button>
            ` : ''}
        </div>
    `;

    if (groups.length === 0) {
        contentHTML += '<p style="margin-top:1rem;">No guides available in this group.</p>';
        elements.guideGroupContainer.innerHTML = contentHTML;
        if (isAdmin) document.getElementById('btnManageGroup')?.addEventListener('click', openManageGroupModal);
        return;
    }

    elements.guideGroupContainer.innerHTML = contentHTML;

    groups.forEach((group) => {
        const groupCard = document.createElement('div');
        groupCard.className = 'guideGroup';
        groupCard.innerHTML = `
            <h1>${escapeHTML(group.title)}</h1>
            <i class="fa-solid fa-angle-right fa-xl"></i>
        `;

        groupCard.addEventListener('click', () => handleGuideGroupClick(group));
        elements.guideGroupContainer.appendChild(groupCard);
    });

    if (isAdmin) document.getElementById('btnManageGroup')?.addEventListener('click', openManageGroupModal);
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

    if (state.types.length === 0) {
        elements.typeListManage.innerHTML = '<p style="text-align:center;">Belum ada type.</p>';
        return;
    }

    state.types.forEach((type) => {
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
    const title = elements.newTypeTitleInput.value.trim();
    
    if (!title) {
        alert('Judul Type tidak boleh kosong!');
        return;
    }

    const normalizedInput = title.toLowerCase().replace(/\s+/g, '');

    const isDuplicate = state.types.some(type => {
        const normalizedExisting = type.title.trim().toLowerCase().replace(/\s+/g, '');
        return normalizedExisting === normalizedInput;
    });

    if (isDuplicate) {
        alert(`Peringatan: Type dengan nama "${title}" sudah ada (atau mirip tanpa spasi). Silakan gunakan nama lain!`);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/types`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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

    } catch (error) {
        console.error('Error creating type:', error);
        alert(error.message || 'Gagal membuat type.');
    }
}

function openEditTypeModal(type) {
    elements.editTypeId.value = type.id;
    elements.editTypeTitle.value = type.title;
    elements.editTypeTitle.dataset.originalTitle = type.title;
    elements.editTypeDesc.value = type.description || '';
    
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

    if (!title) {
        alert('Judul Type tidak boleh kosong!');
        return;
    }

    const normalizedInput = title.toLowerCase().replace(/\s+/g, '');

    const isDuplicate = state.types.some(type => {
        if (type.id === parseInt(id, 10)) return false;
        const normalizedExisting = type.title.trim().toLowerCase().replace(/\s+/g, '');
        return normalizedExisting === normalizedInput;
    });

    if (isDuplicate) {
        alert(`Peringatan: Type dengan nama "${title}" sudah digunakan oleh Type lain (atau mirip tanpa spasi). Silakan gunakan nama lain!`);
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
            body: JSON.stringify({ title, description, imgUrl: finalImgUrl })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Gagal memperbarui Type');
        }

        closeAllModals();
        await fetchAndRenderTypes();
        if (state.selectedTypeId == id) selectType(id);

    } catch (error) {
        console.error('Error updating type:', error);
        alert(error.message || 'Gagal mengupdate type.');
    }
}

async function handleDeleteType(id, title) {
    if (!confirm(`Apakah Anda yakin ingin menghapus Type "${title}"?`)) return;

    try {
        const response = await fetch(`${API_BASE}/types/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Gagal menghapus Type');

        await fetchAndRenderTypes();
        renderManageTypeList();

        if (state.selectedTypeId == id) {
            state.selectedTypeId = state.types.length > 0 ? state.types[0].id : null;
            if (state.selectedTypeId) selectType(state.selectedTypeId);
        }

    } catch (error) {
        console.error('Error deleting type:', error);
        alert('Gagal menghapus type.');
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
    if (!title) {
        alert('Judul Guide Group tidak boleh kosong!');
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

        if (!response.ok) throw new Error('Gagal menambah Guide Group');

        elements.newGroupTitleInput.value = '';
        await fetchAndRenderGuideGroups(state.selectedTypeId);
        renderManageGroupList();

    } catch (error) {
        console.error('Error creating group:', error);
        alert('Gagal membuat guide group.');
    }
}

function openEditGroupModal(group) {
    elements.editGroupId.value = group.id;
    elements.editGroupTitle.value = group.title;
    elements.editGroupDesc.value = group.description || '';
    elements.editGroupOrder.value = group.groupOrder || 0;

    elements.manageGroupModal.classList.remove('active');
    elements.editGroupModal.classList.add('active');
}

async function handleUpdateGroup(e) {
    e.preventDefault();

    const id = elements.editGroupId.value;
    const title = elements.editGroupTitle.value.trim();
    const description = elements.editGroupDesc.value.trim();
    const groupOrder = parseInt(elements.editGroupOrder.value, 10) || 0;

    try {
        const response = await fetch(`${API_BASE}/groups/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                typeId: state.selectedTypeId,
                title,
                description,
                groupOrder
            })
        });

        if (!response.ok) throw new Error('Gagal memperbarui Guide Group');

        closeAllModals();
        await fetchAndRenderGuideGroups(state.selectedTypeId);

    } catch (error) {
        console.error('Error updating group:', error);
        alert('Gagal mengupdate guide group.');
    }
}

async function handleDeleteGroup(id, title) {
    if (!confirm(`Apakah Anda yakin ingin menghapus Group "${title}" beserta seluruh guidenya?`)) return;

    try {
        const response = await fetch(`${API_BASE}/groups/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Gagal menghapus Guide Group');

        await fetchAndRenderGuideGroups(state.selectedTypeId);
        renderManageGroupList();

    } catch (error) {
        console.error('Error deleting group:', error);
        alert('Gagal menghapus group.');
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

    const filteredGroups = state.groups.filter(group => 
        group.title.toLowerCase().includes(query) || 
        (group.description && group.description.toLowerCase().includes(query))
    );

    renderGuideGroups(filteredGroups);
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
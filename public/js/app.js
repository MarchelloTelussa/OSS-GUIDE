import { CustomDialog } from './dialog.js';
import { initAuth, hasRole, getCurrentUser } from './auth-state.js';

// State Management
const state = {
    typeParents: [],
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

let currentLogPage = 1;
let currentMethodFilter = 'ALL';
const LOGS_PER_PAGE = 10;

/**
 * Initialize Dashboard & Authenticate User
 */
async function init() {
    await initAuth();

    state.currentUser = getCurrentUser();

    if (hasRole('ITAdmin')) {
        injectAdminDOM();
    }
    cacheDOMElements();
    setupEventListeners();
    await fetchAndRenderTypes();
}

/**
 * Injeksi elemen HTML khusus Admin ke dalam DOM
 */
function injectAdminDOM() {
    const typeManageContainer = document.getElementById('typeManageContainer');
    if (typeManageContainer) {
        typeManageContainer.innerHTML = `
            <button id="btnActivityLog" title="Log Aktivitas Admin"><i class="fa-solid fa-bell fa-lg"></i></button>
            <button id="btnManage" title="Manage Category & Type"><i class="fa-solid fa-folder-plus fa-lg"></i></button>
        `;
    }

    const holder = document.getElementById('adminModalHolder');
    if (holder) {
        holder.innerHTML = `
            <div id="backdrop" class="backdrop"></div>

            <!-- Modal Manage Category & Type (Segmented Pill Tab) -->
            <div id="manageTypeModal" class="typeModal">
                <div class="typeModalHeader">
                    <h2>Manage Category & Type</h2>
                    <button id="closeManageModal" class="closeModalBtn">&times;</button>
                </div>

                <div class="modalPillTabs">
                    <button type="button" class="pillTabBtn active" data-tab="types">Type</button>
                    <button type="button" class="pillTabBtn" data-tab="parents">Parent Category</button>
                </div>

                <!-- TAB 1: MANAGE TYPE -->
                <div id="tabContentTypes" class="modalTabPane active">
                    <div class="addTypeForm">
                        <select id="newTypeParentSelect" class="selectParent"></select>
                        <input type="text" id="newTypeTitleInput" placeholder="Masukkan judul type baru...">
                        <button id="btnSubmitAddType" title="Tambah Type"><i class="fa-solid fa-plus"></i></button>
                    </div>
                    <div id="typeListManage" class="typeListManage"></div>
                </div>

                <!-- TAB 2: MANAGE PARENT SLUG -->
                <div id="tabContentParents" class="modalTabPane" style="display: none;">
                    <div class="addTypeForm">
                        <input type="text" id="newParentTitleInput" placeholder="Masukkan kategori induk baru (misal: Desktop)...">
                        <button id="btnSubmitAddParent" title="Tambah Parent Category"><i class="fa-solid fa-plus"></i></button>
                    </div>
                    <div id="parentListManage" class="typeListManage"></div>
                </div>
            </div>

            <!-- Modal Edit Type -->
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
                        <select id="editTypeParentSelect" class="selectParentInput"></select>
                    </div>
                    <div>
                        <label>Upload Gambar / Screenshot Flow</label>
                        <input type="file" id="editTypeImageInput" accept="image/*">
                        <small id="currentImgUrlPath" style="display:block; margin-top: 4px; color: var(--text2);"></small>
                    </div>
                    <button type="submit" class="btnSave">Simpan Perubahan</button>
                </form>
            </div>

            <!-- Modal Edit Parent Category -->
            <div id="editParentModal" class="typeModal">
                <div class="typeModalHeader">
                    <h2>Edit Parent Category</h2>
                    <button id="closeEditParentModal" class="closeModalBtn">&times;</button>
                </div>
                <form id="editParentForm" class="editTypeForm">
                    <input type="hidden" id="editParentId">
                    <div>
                        <label>Title (Tampilan Menu)</label>
                        <input type="text" id="editParentTitle" required placeholder="Contoh: Web Application">
                    </div>
                    <div>
                        <label>Slug (URL Identifier)</label>
                        <input type="text" id="editParentSlug" required placeholder="Contoh: web">
                    </div>
                    <div>
                        <label>Description (Opsional)</label>
                        <textarea id="editParentDesc" rows="2" placeholder="Masukkan deskripsi kategori..."></textarea>
                    </div>
                    <button type="submit" class="btnSave">Simpan Perubahan</button>
                </form>
            </div>

            <!-- Modal Manage Guide Group -->
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

            <!-- Modal Edit Guide Group -->
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

        // Admin Elements
        btnManage: document.getElementById('btnManage'),
        btnActivityLog: document.getElementById('btnActivityLog'),
        backdrop: document.getElementById('backdrop'),

        // Manage Modal & Tabs
        manageTypeModal: document.getElementById('manageTypeModal'),
        closeManageModal: document.getElementById('closeManageModal'),
        pillTabBtns: document.querySelectorAll('.pillTabBtn'),
        tabContentTypes: document.getElementById('tabContentTypes'),
        tabContentParents: document.getElementById('tabContentParents'),

        // Type Controls
        newTypeParentSelect: document.getElementById('newTypeParentSelect'),
        newTypeTitleInput: document.getElementById('newTypeTitleInput'),
        btnSubmitAddType: document.getElementById('btnSubmitAddType'),
        typeListManage: document.getElementById('typeListManage'),

        // Parent Slug Controls
        newParentTitleInput: document.getElementById('newParentTitleInput'),
        btnSubmitAddParent: document.getElementById('btnSubmitAddParent'),
        parentListManage: document.getElementById('parentListManage'),

        // Edit Type Modal
        editTypeModal: document.getElementById('editTypeModal'),
        closeEditModal: document.getElementById('closeEditModal'),
        editTypeForm: document.getElementById('editTypeForm'),
        editTypeId: document.getElementById('editTypeId'),
        editTypeTitle: document.getElementById('editTypeTitle'),
        editTypeDesc: document.getElementById('editTypeDesc'),
        editTypeImageInput: document.getElementById('editTypeImageInput'),
        currentImgUrlPath: document.getElementById('currentImgUrlPath'),
        editTypeParentSelect: document.getElementById('editTypeParentSelect'),

        // Edit Parent Modal
        editParentModal: document.getElementById('editParentModal'),
        closeEditParentModal: document.getElementById('closeEditParentModal'),
        editParentForm: document.getElementById('editParentForm'),
        editParentId: document.getElementById('editParentId'),
        editParentTitle: document.getElementById('editParentTitle'),
        editParentSlug: document.getElementById('editParentSlug'),
        editParentDesc: document.getElementById('editParentDesc'),

        // Group Modals
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

    // Admin Listeners
    if (elements.btnManage) elements.btnManage.addEventListener('click', openManageModal);
    if (elements.btnActivityLog) elements.btnActivityLog.addEventListener('click', () => renderActivityLogView(1));
    if (elements.closeManageModal) elements.closeManageModal.addEventListener('click', closeAllModals);
    if (elements.closeEditModal) elements.closeEditModal.addEventListener('click', closeAllModals);
    if (elements.closeEditParentModal) elements.closeEditParentModal.addEventListener('click', closeAllModals);
    if (elements.backdrop) elements.backdrop.addEventListener('click', closeAllModals);

    // Pill Tab Switcher
    if (elements.pillTabBtns) {
        elements.pillTabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchManageTab(btn.dataset.tab));
        });
    }

    // Type CRUD Listeners
    if (elements.btnSubmitAddType) elements.btnSubmitAddType.addEventListener('click', handleCreateType);
    if (elements.newTypeTitleInput) {
        elements.newTypeTitleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCreateType();
        });
    }
    if (elements.newTypeParentSelect) {
        elements.newTypeParentSelect.addEventListener('change', renderManageTypeList);
    }
    if (elements.editTypeForm) elements.editTypeForm.addEventListener('submit', handleUpdateType);

    // Parent Slug CRUD Listeners
    if (elements.btnSubmitAddParent) elements.btnSubmitAddParent.addEventListener('click', handleCreateParent);
    if (elements.newParentTitleInput) {
        elements.newParentTitleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCreateParent();
        });
    }
    if (elements.editParentForm) elements.editParentForm.addEventListener('submit', handleUpdateParent);

    // Group CRUD Listeners
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
 * Sinkronisasi opsi dropdown Parent Category pada form Add & Edit Type
 */
function populateParentDropdowns() {
    const selects = [elements.newTypeParentSelect, elements.editTypeParentSelect];

    selects.forEach(selectEl => {
        if (!selectEl) return;
        const currentVal = selectEl.value;
        selectEl.innerHTML = state.typeParents
            .map(p => `<option value="${p.id}" data-slug="${escapeHTML(p.slug)}">${escapeHTML(p.title)}</option>`)
            .join('');

        if (currentVal && state.typeParents.some(p => String(p.id) === String(currentVal))) {
            selectEl.value = currentVal;
        }
    });
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
async function renderActivityLogView(page = 1) {
    currentLogPage = page;
    currentMethodFilter = 'ALL';
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
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                </select>
                <button id="btnCloseLogView" class="closeModalBtn" title="Tutup Log">&times;</button>
            </div>
        </div>

        <div id="logListContent" class="logListContent">
            <p style="text-align: center; color: var(--text2); padding: 1.5rem;">Memuat data log...</p>
        </div>

        <div id="logPaginationContainer" class="logPaginationContainer"></div>
    `;

    document.getElementById('btnCloseLogView')?.addEventListener('click', renderDefaultView);

    document.getElementById('logMethodFilter')?.addEventListener('change', (e) => {
        currentMethodFilter = e.target.value;
        currentLogPage = 1;
        fetchAndRenderLogs(currentLogPage, currentMethodFilter);
    });

    await fetchAndRenderLogs(currentLogPage, currentMethodFilter);
}

function generatePaginationRange(currentPage, totalPages) {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
            range.push(i);
        }
    }

    for (const i of range) {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
                rangeWithDots.push('...');
            }
        }
        rangeWithDots.push(i);
        l = i;
    }

    return rangeWithDots;
}

async function fetchAndRenderLogs(page, method = 'ALL') {
    const logContent = document.getElementById('logListContent');
    const paginationContent = document.getElementById('logPaginationContainer');

    if (logContent) {
        logContent.innerHTML = '<p style="text-align: center; color: var(--text2); padding: 1.5rem;">Memuat data log...</p>';
    }

    try {
        const response = await fetch(`${API_BASE}/admin/logs?page=${page}&limit=${LOGS_PER_PAGE}&method=${method}`);
        if (!response.ok) throw new Error('Gagal mengambil data log');

        const { logs, totalPages, currentPage } = await response.json();

        if (!logContent) return;

        if (!logs || logs.length === 0) {
            logContent.innerHTML = '<p style="text-align: center; padding: 1rem;">Belum ada riwayat aktivitas.</p>';
            if (paginationContent) paginationContent.innerHTML = '';
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

        if (paginationContent) {
            const pageRange = generatePaginationRange(currentPage, totalPages);

            const pageButtons = pageRange.map(item => {
                if (item === '...') {
                    return `<span class="logPageEllipsis">...</span>`;
                }
                return `
                    <button class="logPageBtn ${item === currentPage ? 'active' : ''}" data-page="${item}">
                        ${item}
                    </button>
                `;
            }).join('');

            paginationContent.innerHTML = `
                <div class="logPaginationWrapper">
                    <button class="logPageBtn navBtn" id="btnPrevLog" ${currentPage <= 1 ? 'disabled' : ''} title="Halaman Sebelumnya">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <div class="logPageNumbers">
                        ${pageButtons}
                    </div>
                    <button class="logPageBtn navBtn" id="btnNextLog" ${currentPage >= totalPages ? 'disabled' : ''} title="Halaman Selanjutnya">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            `;

            document.getElementById('btnPrevLog')?.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentLogPage = currentPage - 1;
                    fetchAndRenderLogs(currentLogPage, currentMethodFilter);
                }
            });

            document.getElementById('btnNextLog')?.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentLogPage = currentPage + 1;
                    fetchAndRenderLogs(currentLogPage, currentMethodFilter);
                }
            });

            document.querySelectorAll('.logPageNumbers .logPageBtn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetPage = parseInt(e.currentTarget.getAttribute('data-page'), 10);
                    if (targetPage !== currentPage) {
                        currentLogPage = targetPage;
                        fetchAndRenderLogs(currentLogPage, currentMethodFilter);
                    }
                });
            });
        }
    } catch (error) {
        console.error('Error loading activity logs:', error);
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

    elements.typeIdentityContainer.className = 'typeIdentity';
    elements.typeIdentityContainer.innerHTML = `
        <div class="typeDetail">
            <div id="typeName"></div>
            <div id="typeDesc"></div>
        </div>
        <div class="typeImage"></div>
    `;

    elements.typeName = document.getElementById('typeName');
    elements.typeDesc = document.getElementById('typeDesc');
    elements.typeImageContainer = document.querySelector('.typeImage');
}

/**
 * Fetch Parent Slugs & Types Secara Paralel
 */
async function fetchAndRenderTypes(keepCurrentView = false) {
    try {
        const [parentsRes, typesRes] = await Promise.all([
            fetch(`${API_BASE}/parent-slugs`),
            fetch(`${API_BASE}/types`)
        ]);

        if (!parentsRes.ok || !typesRes.ok) {
            throw new Error('Failed to load categories or types');
        }

        state.typeParents = await parentsRes.json();
        state.types = await typesRes.json();

        populateParentDropdowns();

        if (state.typeParents.length === 0) {
            elements.typesContainer.innerHTML = `
                <div class="typeGroup">
                    <div class="dropdownBtn disabled"><span>No Categories Available</span></div>
                </div>
            `;
            return;
        }

        renderTypeTabs();

        if (!keepCurrentView) {
            renderDefaultView();
        }
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

        const parentTypes = state.types.filter(t => Number(t.parentSlugId) === Number(parent.id));
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

    elements.guideGroupContainer.innerHTML = `
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
            groupCard.innerHTML = `<h1>${escapeHTML(group.title)}</h1>`;

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
// MODAL CONTROL & PILL TAB SWITCHER (ADMIN ONLY)
// =============================================================

function switchManageTab(tabName) {
    elements.pillTabBtns?.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    if (tabName === 'parents') {
        if (elements.tabContentTypes) elements.tabContentTypes.style.display = 'none';
        if (elements.tabContentParents) elements.tabContentParents.style.display = 'block';
        renderManageParentList();
    } else {
        if (elements.tabContentParents) elements.tabContentParents.style.display = 'none';
        if (elements.tabContentTypes) elements.tabContentTypes.style.display = 'block';
        renderManageTypeList();
    }
}

function openManageModal() {
    populateParentDropdowns();
    switchManageTab('types');
    elements.backdrop?.classList.add('active');
    elements.manageTypeModal?.classList.add('active');
}

function closeAllModals() {
    elements.backdrop?.classList.remove('active');
    elements.manageTypeModal?.classList.remove('active');
    elements.editTypeModal?.classList.remove('active');
    elements.editParentModal?.classList.remove('active');
    elements.manageGroupModal?.classList.remove('active');
    elements.editGroupModal?.classList.remove('active');
}

// =============================================================
// MODAL CRUD PARENT CATEGORY (ADMIN ONLY)
// =============================================================

function renderManageParentList() {
    if (!elements.parentListManage) return;
    elements.parentListManage.innerHTML = '';

    if (state.typeParents.length === 0) {
        elements.parentListManage.innerHTML = '<p style="text-align:center;">Belum ada Parent Category.</p>';
        return;
    }

    state.typeParents.forEach((parent) => {
        const item = document.createElement('div');
        item.className = 'manageTypeItem';
        item.innerHTML = `
            <div class="manageTypeTitle">
                ${escapeHTML(parent.title)} 
                <small style="opacity: 0.75; font-weight: 400;">(${parent.typeCount || 0} type)</small>
            </div>
            <div class="manageTypeActions">
                <button class="btnEdit" title="Edit Kategori Induk"><i class="fa-regular fa-pen-to-square"></i></button>
                <button class="btnDelete" title="Hapus Kategori Induk"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;

        item.querySelector('.btnEdit').addEventListener('click', () => openEditParentModal(parent));
        item.querySelector('.btnDelete').addEventListener('click', () => handleDeleteParent(parent));

        elements.parentListManage.appendChild(item);
    });
}

async function handleCreateParent() {
    const title = elements.newParentTitleInput.value.trim();

    if (!title) {
        await CustomDialog.showAlert({
            title: 'Input Kosong',
            message: 'Nama kategori induk tidak boleh kosong!',
            type: 'warning'
        });
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/parent-slugs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Gagal menambah Parent Category');
        }

        elements.newParentTitleInput.value = '';
        await fetchAndRenderTypes(Boolean(state.selectedTypeId));
        renderManageParentList();
        showToast(`Berhasil menambahkan kategori "${data.title}"`);
    } catch (error) {
        console.error('Error creating parent slug:', error);
        await CustomDialog.showAlert({
            title: 'Gagal Tambah Kategori',
            message: error.message || 'Gagal membuat kategori induk.',
            type: 'danger'
        });
    }
}

function openEditParentModal(parent) {
    elements.editParentId.value = parent.id;
    elements.editParentTitle.value = parent.title;
    elements.editParentSlug.value = parent.slug;

    elements.manageTypeModal.classList.remove('active');
    elements.editParentModal.classList.add('active');
}

async function handleUpdateParent(e) {
    e.preventDefault();

    const id = elements.editParentId.value;
    const title = elements.editParentTitle.value.trim();
    const slug = elements.editParentSlug.value.trim();
    const description = elements.editParentDesc.value.trim();

    if (!title || !slug) {
        await CustomDialog.showAlert({
            title: 'Input Tidak Lengkap',
            message: 'Title dan Slug wajib diisi!',
            type: 'warning'
        });
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/parent-slugs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, slug })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Gagal memperbarui Parent Category');
        }

        closeAllModals();
        await fetchAndRenderTypes(Boolean(state.selectedTypeId));
        showToast(`Berhasil memperbarui kategori "${data.title}"`);
    } catch (error) {
        console.error('Error updating parent slug:', error);
        await CustomDialog.showAlert({
            title: 'Gagal Update Kategori',
            message: error.message || 'Gagal mengupdate kategori induk.',
            type: 'danger'
        });
    }
}

async function handleDeleteParent(parent) {
    const typeCount = parent.typeCount || 0;
    const warningMsg = typeCount > 0
        ? `PERINGATAN: Kategori "${parent.title}" masih memiliki ${typeCount} Type di dalamnya. Menghapus kategori ini akan menghapus SELURUH Type, Guide Group, Guide, dan video di bawahnya secara permanen. Lanjutkan?`
        : `Apakah Anda yakin ingin menghapus kategori "${parent.title}"?`;

    const isConfirmed = await CustomDialog.showConfirm({
        title: 'Hapus Parent Category',
        message: warningMsg,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal'
    });

    if (!isConfirmed) return;

    try {
        const response = await fetch(`${API_BASE}/parent-slugs/${parent.id}`, { method: 'DELETE' });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Gagal menghapus Parent Category');
        }

        const wasSelectedTypeDeleted = state.types.some(
            t => Number(t.parentSlugId) === Number(parent.id) && t.id === state.selectedTypeId
        );

        await fetchAndRenderTypes(!wasSelectedTypeDeleted);
        renderManageParentList();
        showToast(`Berhasil menghapus kategori "${parent.title}"`);
    } catch (error) {
        console.error('Error deleting parent slug:', error);
        await CustomDialog.showAlert({
            title: 'Gagal Hapus Kategori',
            message: error.message || 'Gagal menghapus kategori induk dari server.',
            type: 'danger'
        });
    }
}

// =============================================================
// MODAL CRUD TYPE MANAGEMENT (ADMIN ONLY)
// =============================================================

function renderManageTypeList() {
    if (!elements.typeListManage) return;
    elements.typeListManage.innerHTML = '';

    const selectedParentId = elements.newTypeParentSelect ? Number(elements.newTypeParentSelect.value) : null;
    const selectedParentObj = state.typeParents.find(p => Number(p.id) === selectedParentId);
    const filteredTypes = state.types.filter(type => Number(type.parentSlugId) === selectedParentId);

    if (filteredTypes.length === 0) {
        const parentLabel = selectedParentObj ? selectedParentObj.title : 'kategori ini';
        elements.typeListManage.innerHTML = `<p style="text-align:center;">Belum ada type untuk "${escapeHTML(parentLabel)}".</p>`;
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
    const parentSlugId = elements.newTypeParentSelect ? Number(elements.newTypeParentSelect.value) : null;
    const title = elements.newTypeTitleInput.value.trim();

    if (!parentSlugId) {
        await CustomDialog.showAlert({
            title: 'Kategori Belum Dipilih',
            message: 'Buat atau pilih Parent Category terlebih dahulu!',
            type: 'warning'
        });
        return;
    }

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
                parentSlugId,
                title,
                description: '',
                imgUrl: ''
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Gagal menambah Type');
        }

        elements.newTypeTitleInput.value = '';
        await fetchAndRenderTypes(Boolean(state.selectedTypeId));
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
    populateParentDropdowns();

    elements.editTypeId.value = type.id;
    elements.editTypeTitle.value = type.title;
    elements.editTypeTitle.dataset.originalTitle = type.title;
    elements.editTypeDesc.value = type.description || '';

    if (elements.editTypeParentSelect && type.parentSlugId) {
        elements.editTypeParentSelect.value = String(type.parentSlugId);
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
    const parentSlugId = elements.editTypeParentSelect ? Number(elements.editTypeParentSelect.value) : null;

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
                parentSlugId,
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
        await fetchAndRenderTypes(Boolean(state.selectedTypeId));
        if (state.selectedTypeId == id) selectType(Number(id));
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

        const isDeletingActiveType = Number(state.selectedTypeId) === Number(id);
        await fetchAndRenderTypes(!isDeletingActiveType);
        renderManageTypeList();

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
                title,
                description: '',
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
        } catch {
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

// =============================================================
// HELPERS & SEARCH
// =============================================================

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

                if (targetType === 'guide') {
                    window.location.href = `guide.html?groupId=${targetGroupId}&guideId=${targetId}`;
                } else {
                    window.location.href = `guide.html?groupId=${targetGroupId}`;
                }
            });
        });
    }

    function highlightMatch(text, query) {
        if (!query) return escapeHTML(text);
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
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
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
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
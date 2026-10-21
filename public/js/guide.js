// State Management
const state = {
    groupId: null,
    guides: [],
    currentGuide: null,
    searchQuery: ''
};

const API_BASE = '/api';

// DOM Selectors
const viewContainer = document.getElementById('viewContainer');
const backdrop = document.getElementById('backdrop');
const detailOverlay = document.getElementById('detailOverlay');
const closeOverlayBtn = document.getElementById('closeOverlay');
const overlayContent = document.getElementById('overlayContent');
const fullscreenBtn = document.getElementById('fullscreen');

/**
 * Inisialisasi Halaman
 */
async function init() {
    setupGlobalEvents();

    // Ambil groupId dari parameter URL
    const urlParams = new URLSearchParams(window.location.search);
    state.groupId = urlParams.get('groupId');

    if (state.groupId) {
        await fetchGuidesByGroup(state.groupId);
    } else {
        await fetchAllGuides();
    }

    // Default: Tampilkan Mode List
    renderListView();
}

/**
 * Global Event Listeners
 */
function setupGlobalEvents() {
    // Tutup Drawer Overlay
    if (closeOverlayBtn) {
        closeOverlayBtn.addEventListener('click', closeDrawer);
    }
    if (backdrop) {
        backdrop.addEventListener('click', closeDrawer);
    }

    // Toggle Fullscreen
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
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
 * Fetch Semua Guides (Fallback)
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

    const filteredGuides = state.guides.filter(g => 
        g.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        (g.functionDesc && g.functionDesc.toLowerCase().includes(state.searchQuery.toLowerCase()))
    );

    viewContainer.innerHTML = `
        <header class="dashboardHeader">
            <img class="logoHeader" src="./img/logo.png" alt="Logo">
            <h1 class="pageName">GUIDE</h1>
            <div class="searchContainer">
                <input id="searchBar" type="text" placeholder="Cari guide..." value="${escapeHTML(state.searchQuery)}">
                <button id="searchBtn"><i class="fa-solid fa-magnifying-glass"></i></button>
            </div>
        </header>
        <main class="dashboardMain">
            <div class="content">
                <div class="typeContainer">
                    <div class="typeGroup">
                        <div class="typeButton active">
                            <h1>GUIDE LIST</h1>
                        </div>
                    </div>
                    <div class="buttonGroup">
                        <div class="backButton">
                            <button id="btnBackDashboard" title="Kembali ke Dashboard"><i class="fa-solid fa-arrow-left"></i></button>
                        </div>
                        <div class="addGuideButton">
                            <button id="btnAddGuide" title="Tambah Guide"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    </div>
                </div>
                <div class="guideCardContainer">
                    ${filteredGuides.length > 0 
                        ? filteredGuides.map(guide => `
                            <div class="guideCard" data-id="${guide.id}">
                                <div>
                                    <h2>${escapeHTML(guide.title)}</h2>
                                    <p>${escapeHTML(guide.functionDesc || 'Tidak ada deskripsi.')}</p>
                                </div>
                                <i class="fa-solid fa-chevron-right"></i>
                            </div>
                        `).join('')
                        : `<p style="grid-column: 1/-1; padding: 1rem;">Tidak ada guide yang ditemukan.</p>`
                    }
                </div>
            </div>
        </main>
    `;

    // Event Listeners List Mode
    document.getElementById('btnBackDashboard').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('searchBtn');

    const handleSearch = () => {
        state.searchQuery = searchBar.value.trim();
        renderListView();
    };

    searchBtn.addEventListener('click', handleSearch);
    searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Event Listener Card Guide Click -> Masuk Video Mode
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

        // Increment View Count di Backend
        fetch(`${API_BASE}/guides/${id}/view`, { method: 'POST' }).catch(() => {});

        renderDetailView();
    } catch (error) {
        console.error('Error opening guide detail:', error);
        alert('Gagal memuat detail guide.');
    }
}

/**
 * RENDER MODE 2: Detail Mode (Video Player)
 */
function renderDetailView() {
    const guide = state.currentGuide;

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
                <div class="editButton">
                    <button id="btnEditGuide" title="Edit Guide"><i class="fa-solid fa-pen-to-square"></i></button>
                </div>
                <div class="deleteButton">
                    <button id="btnDeleteGuide" title="Delete Guide"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        </header>
        <main class="detailMain">
            <video controls autoplay muted loop src="${escapeHTML(guide.videoUrl || '')}"></video>
        </main>
    `;

    // Event Listeners Video Mode
    document.getElementById('btnBackToList').addEventListener('click', () => {
        renderListView();
    });

    document.getElementById('btnViewGuide').addEventListener('click', () => {
        openDrawer(guide);
    });

    document.getElementById('btnDeleteGuide').addEventListener('click', async () => {
        if (confirm(`Apakah Anda yakin ingin menghapus guide "${guide.title}"?`)) {
            await deleteGuide(guide.id);
        }
    });
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

/**
 * Tutup Drawer Overlay
 */
function closeDrawer() {
    backdrop.classList.remove('active');
    detailOverlay.classList.remove('active');
}

/**
 * Hapus Guide via API
 */
async function deleteGuide(id) {
    try {
        const response = await fetch(`${API_BASE}/guides/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Gagal menghapus guide');

        alert('Guide berhasil dihapus.');
        state.guides = state.guides.filter(g => g.id !== parseInt(id, 10));
        renderListView();
    } catch (error) {
        console.error('Error deleting guide:', error);
        alert('Gagal menghapus guide. Pastikan Anda memiliki hak akses ITAdmin.');
    }
}

/**
 * Sanitasi HTML String (Mencegah XSS)
 */
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

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', init);
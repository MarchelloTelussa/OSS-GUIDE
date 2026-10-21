// State Management
const state = {
    types: [],
    selectedTypeId: null,
    groups: [],
    searchQuery: ''
};

// API Base URL
const API_BASE = '/api';

// DOM Elements
const elements = {
    typesContainer: document.getElementById('types'),
    typeName: document.getElementById('typeName'),
    typeDesc: document.getElementById('typeDesc'),
    typeFlowContainer: document.querySelector('.typeFlow'),
    guideGroupContainer: document.getElementById('guideGroup'),
    searchBar: document.getElementById('searchBar'),
    searchBtn: document.getElementById('searchBtn'),
    fullscreenBtn: document.getElementById('fullscreen')
};

/**
 * Initialize Dashboard
 */
async function init() {
    setupEventListeners();
    await fetchAndRenderTypes();
}

/**
 * Global Event Listeners Setup
 */
function setupEventListeners() {
    // Search Button Click
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener('click', handleSearch);
    }

    // Search Input 'Enter' Key
    if (elements.searchBar) {
        elements.searchBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    // Fullscreen Toggle
    if (elements.fullscreenBtn) {
        elements.fullscreenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleFullscreen();
        });
    }
}

/**
 * Fetch All Types & Render Navigation Tabs
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
        
        // Select first type by default
        selectType(state.types[0].id);
    } catch (error) {
        console.error('Error fetching types:', error);
        elements.typesContainer.innerHTML = '<div class="typeButton"><h1>Error Loading</h1></div>';
    }
}

function renderTypeTabs() {
    elements.typesContainer.innerHTML = '';

    state.types.forEach((type) => {
        const typeTab = document.createElement('div');
        
        // Tambahkan class 'active' jika ID type cocok dengan state.selectedTypeId
        const isActive = type.id === state.selectedTypeId;
        typeTab.className = `typeButton ${isActive ? 'active' : ''}`;
        
        typeTab.innerHTML = `<h1>${escapeHTML(type.title)}</h1>`;

        // Event listener untuk memindahkan state active saat diklik
        typeTab.addEventListener('click', () => {
            if (state.selectedTypeId !== type.id) {
                selectType(type.id);
            }
        });

        elements.typesContainer.appendChild(typeTab);
    });
}

/**
 * Handle Type Tab Selection
* @param {number|string} typeId 
 */
async function selectType(typeId) {
    state.selectedTypeId = typeId;

    // Render ulang tab agar class active berpindah ke tombol yang baru diklik
    renderTypeTabs();

    try {
        const response = await fetch(`${API_BASE}/types/${typeId}`);
        if (!response.ok) throw new Error('Failed to load type details');

        const typeData = await response.json();

        // Update UI
        renderTypeIdentity(typeData);
        renderTypeFlow(typeData.flowUrl);
        await fetchAndRenderGuideGroups(typeId);

    } catch (error) {
        console.error('Error selecting type:', error);
    }
}

/**
 * Render Type Title and Description
 */
function renderTypeIdentity(typeData) {
    elements.typeName.innerHTML = `<h1>${escapeHTML(typeData.title)}</h1>`;
    elements.typeDesc.innerHTML = `<p>${escapeHTML(typeData.description || 'No description available for this type.')}</p>`;
}

/**
 * Render Flow Diagram Image
 */
function renderTypeFlow(flowUrl) {
    if (flowUrl) {
        elements.typeFlowContainer.innerHTML = `
            <h1>Flow</h1>
            <img src="${escapeHTML(flowUrl)}" alt="Flow Diagram" onerror="this.onerror=null; this.src='./img/flow.png';">
        `;
    } else {
        elements.typeFlowContainer.innerHTML = `
            <h1>Flow</h1>
            <p style="padding-top:1rem;">No flow diagram available.</p>
        `;
    }
}

/**
 * Fetch and Render Guide Groups for a Type
 */
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

/**
 * Render Guide Groups Cards
 */
function renderGuideGroups(groups) {
    elements.guideGroupContainer.innerHTML = '<h1>Guide</h1>';

    if (groups.length === 0) {
        elements.guideGroupContainer.innerHTML += '<p style="margin-top:1rem;">No guides available in this group.</p>';
        return;
    }

    groups.forEach((group) => {
        const groupCard = document.createElement('div');
        groupCard.className = 'guideGroup';
        groupCard.style.marginBottom = '0.5rem';
        groupCard.innerHTML = `
            <h1>${escapeHTML(group.title)}</h1>
            <i class="fa-solid fa-angle-right fa-xl"></i>
        `;

        // Handle Guide Group Click (Navigate or Open Guides Modal/List)
        groupCard.addEventListener('click', () => handleGuideGroupClick(group));

        elements.guideGroupContainer.appendChild(groupCard);
    });
}

/**
 * Handle Search Filter
 */
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

/**
 * Action when clicking a Guide Group Card
 */
function handleGuideGroupClick(group) {
    // Redirects to guide list/view page or triggers modal preview
    window.location.href = `guide.html?groupId=${group.id}`;
}

/**
 * Toggle Window Fullscreen Mode
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/**
 * Helper: Escape HTML string to prevent XSS
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Run Initialization on DOM Ready
document.addEventListener('DOMContentLoaded', init);
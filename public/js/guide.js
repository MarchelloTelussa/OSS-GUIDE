import { getUserInfo } from './nav-auth.js';

let data = null;

async function loadGuidePage() {
    const container = document.querySelector('#guide-container');
    if (!container) {
        console.error("Elemen #guide-container tidak ditemukan di HTML!");
        return;
    }

    const user = await getUserInfo();

    if (!data) {
        container.innerHTML = `
            <div class="error-message" style="padding: 50px; text-align: center; color: var(--black);">
                <h2>Guide tidak ditemukan atau gagal memuat data.</h2>
                <p>Pastikan URL memiliki parameter ID yang benar (contoh: <code>?id=1</code>).</p>
            </div>
        `;
        return;
    }

    // Render tombol admin
    const editButtonHTML = (user && user.role === 'ITAdmin') ? `
        <div class="btn-edit">
            <a href="edit.html?id=${data.id}" title="Edit Guide"><i class="fa-solid fa-pen-to-square"></i></a>
        </div>
    ` : '';

    const deleteButtonHTML = (user && user.role === 'ITAdmin') ? `
        <div class="btn-delete">
            <button id="deleteGuideBtn" title="Delete Guide"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    ` : '';

    // Tombol Mata untuk membuka Side Panel Info
    const viewButtonHTML = `
        <div class="btn-view">
            <button id="viewGuideBtn" title="View Info"><i class="fa-regular fa-eye"></i></button>
        </div>
    `;
    const backButtonHTML = `
        <div class="btn-back">
            <a href="index.html" id="backBtn" title="Back button"><i class="fa-solid fa-arrow-left-long"></i></a>
        </div>
    `;

    const stepsList = Array.isArray(data.steps) ? data.steps : [];
    
    container.innerHTML = `
    <div class="guide-wrapper">
        <div class="guide-header">
            <div class="guide-title"> <h1>${data.title}</h1> </div>
            <div class="guide-button">
                ${backButtonHTML}
                ${viewButtonHTML}
                ${editButtonHTML}
                ${deleteButtonHTML}
            </div>
        </div>

        <div class="guide-video"> 
            <video controls autoplay muted loop src="${data.videoUrl}"></video> 
        </div>

        <!-- Backdrop Overlay -->
        <div id="backdrop" class="backdrop"></div>

        <!-- Side Panel Info (Slide in from Right) -->
        <aside id="infoPanel" class="guide-info">
            <button id="closeBtn" class="close-btn">&times;</button>
            <div class="guide-desc"> <h3>${data.functionDesc}</h3> </div>
            <div class="guide-note"> <p> <b>Important note:</b> ${data.importantNote} </p> </div>
            <div class="guide-steps"> 
                <h4>Steps:</h4>
                <ol>${stepsList.map(step => `<li>${step}</li>`).join("")}</ol>
            </div>
        </aside>
    </div>
    `;

    // Inisialisasi event listener setelah elemen dimasukkan ke DOM
    setupPanelEvents();
    setupDeleteEvent();
}

// Fungsi Event Listener untuk Side Panel
function setupPanelEvents() {
    const viewGuideBtn = document.getElementById('viewGuideBtn');
    const infoPanel = document.getElementById('infoPanel');
    const closeBtn = document.getElementById('closeBtn');
    const backdrop = document.getElementById('backdrop');

    function openPanel() {
        if (infoPanel && backdrop) {
            infoPanel.classList.add('open');
            backdrop.classList.add('active');
        }
    }

    function closePanel() {
        if (infoPanel && backdrop) {
            infoPanel.classList.remove('open');
            backdrop.classList.remove('active');
        }
    }

    if (viewGuideBtn) viewGuideBtn.addEventListener('click', openPanel);
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    if (backdrop) backdrop.addEventListener('click', closePanel);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
    });
}

// Attach event listener ke tombol Delete secara dinamis
function setupDeleteEvent() {
    const deleteBtn = document.querySelector('#deleteGuideBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            deleteGuide();
        });
    }
}

async function trackGuideView(guideId) {
    try {
        const response = await fetch(`/api/guides/${guideId}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            const result = await response.json();
            console.log(`Guide views: ${result.views}`);
        }
    } catch (error) {
        console.error('Error tracking view:', error);
    }
}

async function getSpecGuide() {
    let specData = null;
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const guideId = urlParams.get('id');

        if (!guideId) {
            console.error('ID tidak ditemukan dalam parameter URL');
            return null;
        }

        const response = await fetch(`/api/guides/${guideId}`);
        if (!response.ok) return null;
        
        specData = await response.json();
        await trackGuideView(guideId);
    } catch (error) {
        console.error('Error fetching specific guide:', error);
    }
    return specData;
}

function deleteGuide() {
    // Karena 'data' global sudah menyimpan objek guide aktif dari getSpecGuide()
    if (!data || !data.id) {
        console.log('Informasi guide tidak ditemukan');
        return;
    }

    // Cegah modal duplikat
    if (document.getElementById('confDelete')) return;

    // Buat modal overlay
    const overlay = document.createElement("div");
    overlay.id = 'confDelete';
    overlay.className = 'backdrop confirmdel';

    overlay.innerHTML = `
      <div class="confirm_delete_box">
        <div class="confirm_delete_header">
          <h3>Konfirmasi Delete Guide</h3>
          <p>Apakah anda yakin ingin menghapus guide <b>${data.title}</b>?</p>
        </div>
        <div class="button_group">
            <button id="delConfirm" class="button_delete">Ya, Hapus</button>
            <button id="delCancel" class="button_cancel">Batal</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);

    const closeSubModal = () => overlay.remove();
    document.getElementById('delCancel').onclick = closeSubModal;

    // Eksekusi DELETE request
    document.getElementById('delConfirm').onclick = async () => {
        try {
            const response = await fetch(`/api/guides/${data.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Gagal menghapus guide (Status: ${response.status})`);
            }

            const result = await response.json();
            alert(result.message || 'Guide berhasil dihapus');
            
            closeSubModal();
            window.location.href = '/index.html'; 
        } catch (error) {
            console.error('Error deleting guide:', error);
            alert(`Error: ${error.message}`);
        }
    };
}

async function init(){
    data = await getSpecGuide();
    await loadGuidePage();
}

document.addEventListener('DOMContentLoaded', init);

// Fullscreen Button Logic
const fullscreenBtn = document.getElementById('fullscreenBtn');
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error enabling fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });
}
let searchInput = document.querySelector('#main_search_bar');
const searchButton = document.querySelector('#main_search_button');
const typeContainer = document.querySelector('#contTypes');
const cardContainer = document.querySelector('#contCard');
const btn = document.querySelector('#fullscreenBtn');
const bttnadd = document.querySelector('#bttnAdd a');

let currentGuides = [];

function updateAddButtonUrl() {
  if (!bttnadd) return;

  const urlParams = new URLSearchParams(window.location.search);
  const currentType = urlParams.get('type');

  if (currentType) {
    bttnadd.href = `add-guide.html?type=${encodeURIComponent(currentType)}`;
  } else {
    bttnadd.href = 'add-guide.html';
  }
}

function buildCard(cardData) {
  if (!cardData || typeof cardData !== 'object') return;

  const popCard = document.createElement('a');
  popCard.classList.add('card_guide');
  popCard.href = `guide.html?id=${cardData.id}`;
  popCard.innerHTML = `
      <div>
          <h2>${cardData.title || ''}</h2>
          <p>Deskripsi: ${cardData.functionDesc || '-'}</p>
      </div>
      <i class="fa-solid fa-chevron-right"></i>
    `;
  cardContainer.appendChild(popCard);
}

// Menampilkan semua card dari data yang diterima
function renderCards(guides = []) {
  if (!cardContainer) return;
  cardContainer.innerHTML = "";

  if (guides.length === 0) {
    cardContainer.innerHTML = "<p>Tidak ada guide yang ditemukan.</p>";
    return;
  }

  guides.forEach(item => buildCard(item));
}

// Fungsi fetch yang mendukung query berdasarkan 'type'
async function loadGuides(type = null) {
  try {
    // Jika ada type, panggil endpoint filter type, jika tidak panggil endpoint semua guides
    const endpoint = type ? `/api/guides/type/${encodeURIComponent(type)}` : '/api/guides';
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      if (response.status === 404) return []; // Jika 404, kembalikan array kosong
      throw new Error(`Gagal mengambil data (Status: ${response.status})`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Gagal mengambil data: ', error);
    return [];
  }
}

function loadManageType() {
  const triggerBtn = document.getElementById('bttnManage');
  if (!triggerBtn) return;

  // Pasang event listener ke tombol pemicu
  triggerBtn.addEventListener('click', showModal);

  function showModal() {
    // Cek agar modal tidak dirender ganda
    if (document.getElementById('contMngType')) return;

    const overlay = document.createElement("div");
    overlay.id = 'contMngType';
    overlay.className = 'container_manage_type';

    overlay.innerHTML = `
      <div class="manage_type_box">
        <div class="manage_type_header">
          <h3>Judul Modal</h3>
          <button id="modal-close-icon" class="modal-close-btn">&times;</button>
        </div>
        <div id="mngTypeBody" class="manage_type_body">
          <p>Ini konten modal dinamis yang muncul tanpa mengganggu elemen <main>.</p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listener untuk menutup modal
    const closeIcon = document.getElementById('modal-close-icon');
    if (closeIcon) {
      closeIcon.addEventListener('click', hideModal);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hideModal();
    });

    function hideModal() {
      overlay.remove();
    }
  }
}

async function getTypes() {
  try {
    const response = await fetch('/api/guides/types');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const types = await response.json(); 
    return types;
  } catch (error) {
    console.error('Gagal mengambil types: ', error);
    return [];
  }
}

async function buildBttnType() {
  if (!typeContainer) return;

  const types = await getTypes();
  const urlParams = new URLSearchParams(window.location.search);
  
  const currentType = urlParams.get('type') || 'web';

  typeContainer.innerHTML = '';

  types.forEach(type => {
    const button = document.createElement('button');
    button.classList.add('button_type');
    
    if (currentType.toLowerCase() === type.toLowerCase()) {
      button.classList.add('active');
    }

    button.textContent = type.toUpperCase();
    
    button.onclick = () => {
      window.location.href = `/index.html?type=${encodeURIComponent(type)}`;
    };
    
    typeContainer.appendChild(button);
  });
}










async function loadTypeRow() {
  const container = document.getElementById('mngTypeBody');
  if (!container) return;

  container.innerHTML = `
    <tr class="type-row-loading">
      <td colspan="3">Memuat data...</td>
    </tr>
  `;

  try {
    const types = await getTypes();

    if (!types || types.length === 0) {
      container.innerHTML = `
        <tr class="type-row-empty">
          <td colspan="3">Belum ada data tipe.</td>
        </tr>
      `;
      return;
    }

    container.innerHTML = types.map((type, index) => `
      <tr class="type-row" data-id="${type.id || type._id}">
        <td class="col-no">${index + 1}</td>
        <td class="col-name">${type.name || type.type_name}</td>
        <td class="col-action">
          <button class="btn-action btn-edit" onclick="handleEditType('${type.id || type._id}')">Edit</button>
          <button class="btn-action btn-delete" onclick="handleDeleteType('${type.id || type._id}')">Hapus</button>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Gagal memuat tipe:', error);
    container.innerHTML = `
      <tr class="type-row-error">
        <td colspan="3">Gagal mengambil data. Silakan coba lagi.</td>
      </tr>
    `;
  }
}

function handleEditType(id) {
  console.log('Edit tipe ID:', id);
}

function handleDeleteType(id) {
  console.log('Hapus tipe ID:', id);
}
























async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  let selectedType = urlParams.get('type');

  if (!selectedType) {
    selectedType = 'web';
    
    const newUrl = `${window.location.pathname}?type=${selectedType}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }

  currentGuides = await loadGuides(selectedType);

  renderCards(currentGuides);
  buildBttnType();
  updateAddButtonUrl();
  loadManageType();
}

document.addEventListener('DOMContentLoaded', init);

function performSearch() {
  const searchQuery = searchInput.value.toLowerCase().trim();
  const originalPlaceholder = "masukkan nama guide yang anda butuhkan";

  // jika input kosong, tampilkan ulang seluruh guide type aktif
  if (searchQuery === "") {
    searchInput.placeholder = "Input tidak boleh kosong!";
    searchInput.classList.add('error-state');
    renderCards(currentGuides);

    setTimeout(() => {
      searchInput.placeholder = originalPlaceholder;
      searchInput.classList.remove('error-state');
    }, 2500);
    return;
  }
  
  // Filter HANYA dari currentGuides (kategori/type yang sedang di-load)
  const searchMatched = currentGuides.filter(item => {
    return item && item.title && item.title.toLowerCase().includes(searchQuery);
  });

  if (searchMatched.length === 0) {
    searchInput.value = "";
    searchInput.placeholder = "Not found";
    searchInput.classList.add('error-state');
    
    renderCards(currentGuides);

    setTimeout(() => {
      searchInput.placeholder = originalPlaceholder;
      searchInput.classList.remove('error-state');
    }, 2500);
  } else {
    renderCards(searchMatched);
  }
}

if (searchButton) {
  searchButton.addEventListener('click', function(e) {
    e.preventDefault();
    performSearch();
  });
}

if (searchInput) {
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });
}

// Event Listener Fullscreen Button
if (btn) {
  btn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });
}
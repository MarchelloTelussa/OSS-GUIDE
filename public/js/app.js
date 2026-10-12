let searchInput = document.querySelector('#main_search_bar');
const searchButton = document.querySelector('#main_search_button');
const typeContainer = document.querySelector('#contTypes');
const cardContainer = document.querySelector('#cardGuide');

let currentGuides = [];

function buildCard(cardData) {
  if (!cardData || typeof cardData !== 'object') return;

  const popCard = document.createElement('a');
  popCard.classList.add('guide_popular');
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

//new
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
    return []; // Aman mengembalikan array kosong
  }
}

async function buildBttnType() {
  if (!typeContainer) return; // Guard clause

  const types = await getTypes();

  // Clear isi container sebelum render untuk mencegah duplicate button
  typeContainer.innerHTML = '';

  types.forEach(type => {
    const button = document.createElement('button');
    button.classList.add('button_type');
    button.textContent = type.toUpperCase();
    
    button.onclick = () => {
      window.location.href = `/index.html?type=${encodeURIComponent(type)}`;
    };
    
    typeContainer.appendChild(button);
  });
}

// Fungsi utama penjalan alur halaman
async function init() {
  // 1. Ambil parameter 'type' dari URL browser (misal: ?type=web)
  const urlParams = new URLSearchParams(window.location.search);
  const selectedType = urlParams.get('type');

  // 2. Fetch data dari server
  const guides = await loadGuides(selectedType);

  // 3. Render seluruh card ke container
  renderCards(guides);
  buildBttnType();
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
    
    // Tampilkan kembali semua data type aktif jika hasil cari kosong
    renderCards(currentGuides);

    setTimeout(() => {
      searchInput.placeholder = originalPlaceholder;
      searchInput.classList.remove('error-state');
    }, 2500);
  } else {
    // Urutkan berdasarkan views terbanyak jika perlu
    searchMatched.sort((a, b) => (b.views || 0) - (a.views || 0));
    renderCards(searchMatched);
  }
}

// Event Listeners untuk Search
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
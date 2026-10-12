let searchInput = document.querySelector('#main_search_bar');
const searchButton = document.querySelector('#main_search_button');
const typeContainer = document.querySelector('#contTypes');
const cardContainer = document.querySelector('#contCard');
const btn = document.querySelector('#fullscreenBtn');

let currentGuides = [];

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
  if (!typeContainer) return;

  const types = await getTypes();
  const urlParams = new URLSearchParams(window.location.search);
  const currentType = urlParams.get('type');

  typeContainer.innerHTML = '';

  types.forEach(type => {
    const button = document.createElement('button');
    button.classList.add('button_type');
    
    // Tambahkan class 'active' jika tipe tombol cocok dengan URL
    if (currentType && currentType.toLowerCase() === type.toLowerCase()) {
      button.classList.add('active');
    }

    button.textContent = type.toUpperCase();
    
    button.onclick = () => {
      window.location.href = `/index.html?type=${encodeURIComponent(type)}`;
    };
    
    typeContainer.appendChild(button);
  });
}

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const selectedType = urlParams.get('type');

  currentGuides = await loadGuides(selectedType);

  renderCards(currentGuides);
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
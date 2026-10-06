let searchInput = document.querySelector('#main_search_bar');
const searchButton = document.querySelector('#main_search_button');
const cardContainer = document.querySelector('#cardPopularCont');

let database = [];

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

function showPopCard(searchResult = []) {
  cardContainer.innerHTML = "";

  if (searchResult.length === 0) {
    const topFiveCard = database.slice(0, 5);
    topFiveCard.forEach(item => buildCard(item));
  } else {
    searchResult.forEach(item => buildCard(item));
  }
}

async function loadAllGuides() {
  try {
    const response = await fetch('/api/guides');
    if (!response.ok) {
      throw new Error(`Guide tidak ditemukan (Status: ${response.status})`);
    }
    const database = await response.json();
    return database;
  } catch (error) {
    console.error('Gagal mengambil data: ', error);
  }
}

async function init() {
  const rawData = await loadAllGuides();
  database = Array.isArray(rawData) ? rawData.flat(Infinity) : [rawData];
  database.sort((a, b) => (b.views || 0) - (a.views || 0));
  showPopCard();
}


//START//
init();

function performSearch() {
  const searchQuery = searchInput.value.toLowerCase().trim();
  const originalPlaceholder = "masukkan nama guide yang anda butuhkan";

  if (searchQuery === "") {
    searchInput.placeholder = "Input tidak boleh kosong!";
    searchInput.classList.add('error-state');
    showPopCard();

    setTimeout(() => {
      searchInput.placeholder = originalPlaceholder;
      searchInput.classList.remove('error-state');
    }, 2500);
    return;
  }

  const searchMatched = database.filter(item => {
    return item && item.title && item.title.toLowerCase().includes(searchQuery);
  });

  if (searchMatched.length === 0) {
    searchInput.value = "";
    searchInput.placeholder = "Not found";
    searchInput.classList.add('error-state');
    showPopCard();

    setTimeout(() => {
      searchInput.placeholder = originalPlaceholder;
      searchInput.classList.remove('error-state');
    }, 2500);
  } else {
    searchMatched.sort((a, b) => (b.views || 0) - (a.views || 0));
    showPopCard(searchMatched);
  }
}

searchButton.addEventListener('click', function(e) {
  e.preventDefault();
  performSearch();
});

searchInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    performSearch();
  }
});

const btn = document.getElementById('fullscreenBtn');

    btn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        // Request fullscreen for the entire document
        document.documentElement.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        // Exit fullscreen
        document.exitFullscreen();
      }
});
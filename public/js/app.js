import { getAllData } from './api.js';

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

async function init() {
  const rawData = await getAllData();
  
  database = Array.isArray(rawData) ? rawData.flat(Infinity) : [rawData];
  
  showPopCard();
}

init();

searchButton.addEventListener('click', function(e) {
  e.preventDefault();

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
    showPopCard(searchMatched);
  }
});
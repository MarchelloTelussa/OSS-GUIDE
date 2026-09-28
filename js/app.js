let searchInput = document.querySelector('#main_search_bar');
const searchButton = document.querySelector('#main_search_button');
const resultsContainer = document.querySelector('#cardPopularCont');

//START
let database = [];

async function loadData() {
    try { 
        const response = await fetch('/data/guides.json');
        database = await response.json();
        showPopularGuides();
    } catch (error) {
        console.error("Failed to load databse: ", error);
    }
}

loadData();

//Load PopularGuides (belum berdasarakan prioritas hanya berdasarkan urutan palign atas di Json)
function showPopularGuides() {
  const popularItems = database.slice(0, 5); 
  
  popularItems.forEach(function(item) {
    const guideCard = document.createElement('div');
    guideCard.classList.add('guide_popular');
    
    guideCard.innerHTML = `
      <div>
          <h2 style="margin: 0; color: var(--black);">${item.title}</h2>
          <p style="margin: 5px 0 0 0; color: var(--grey); font-size: 14px;">Category: ${item.category}</p>
      </div>
      <i class="fa-solid fa-chevron-right"></i>
    `;
    
    // Inject the generated card into the Popular container
    resultsContainer.appendChild(guideCard);
  });
}

//Search Function
searchButton.addEventListener('click', function(e) {
  e.preventDefault();
  
  const searchQuery = searchInput.value.toLowerCase().trim();
  const originalPlaceholder = searchInput.placeholder;
  resultsContainer.innerHTML = "";

  if (searchQuery === "") {
    searchInput.placeholder = "Input cannot be empty!";
    searchInput.classList.add('error-state');
    showPopularGuides();


    setTimeout(function() {
        searchInput.placeholder = originalPlaceholder;
        searchInput.classList.remove('error-state');
    }, 2500);

    return; 
  }

  const matchedResults = database.filter(function(item) {
    return item.title.toLowerCase().includes(searchQuery);
  });

  if (matchedResults.length === 0) {
    searchInput.value = null;
    searchInput.placeholder = "Not found";
    searchInput.classList.add('error-state');
    showPopularGuides();

    setTimeout(function() {
        searchInput.placeholder = originalPlaceholder;
        searchInput.classList.remove('error-state');
    }, 2500);

    } else {
    matchedResults.forEach(function(item) {
      const resultCard = document.createElement('div');
      
        resultCard.classList.add('guide_popular');
            resultCard.innerHTML = `
            <div>
                <h2 style="margin: 0; color: var(--black);">${item.title}</h2>
                <p style="margin: 5px 0 0 0; color: var(--grey); font-size: 14px;">Category: ${item.category}</p>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
            `;
      
      resultsContainer.appendChild(resultCard);
    });
    }
});
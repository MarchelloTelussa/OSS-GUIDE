const params = new URLSearchParams(window.location.search);

const guideId = params.get("id");

async function loadGuideData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('id');

        if (!targetId) {
            console.error("No guide ID");
            return;
        }

        const response = await fetch('/data/guides.json');
        const database = await response.json();

        const guide = database.find(item => item.id == targetId);

        if (guide) {
            loadGuidePage(guide);
        } else {
            console.error("Guide not found!");
            document.body.innerHTML = "<h1>Guide not found</h1>";
        }

    } catch (error) {
        console.error("Failed to load database: ", error)
    }
}

function loadGuidePage(data) {
    const container = document.querySelector('#guide-container');
    
    container.innerHTML = `
     <div class="guide-note"> <p> <b>Important note:</b> ${data.importantNote} </p> </div>
    <div class="guide-title"> <h1>${data.title}</h1> </div>
    <div class="guide-desc"> <h3>${data.functionDesc}</h3> </div>
    <div class="guide-steps"> <ol> ${data.steps.map(step => ` <li>${step}</li> `).join("")} </ol> </div>
    <div class="guide-video"> <video controls src="${data.videoUrl}" type="video/mp4"></video> </div>
    `;
    
    container.classList.add('container');
}

loadGuideData();

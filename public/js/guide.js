let data = [];
function loadGuidePage() {
    const container = document.querySelector('#guide-container');
    if (!container) {
        console.error("Elemen #guide-container tidak ditemukan di HTML!");
        return;
    }

    if (!data) {
        container.innerHTML = `
            <div class="error-message" style="padding: 20px; text-align: center;">
                <h2>Guide tidak ditemukan atau gagal memuat data.</h2>
                <p>Pastikan URL memiliki parameter ID yang benar (contoh: <code>?id=1</code>).</p>
            </div>
        `;
        return;
    }

    const stepsList = Array.isArray(data.steps) ? data.steps : [];
    container.innerHTML = `
    <div class="guide-title"> <h1>${data.title}</h1> </div>
    <div class="split">
        <div class="left">
            <div class="guide-video"> <video controls src="${data.videoUrl}" type="video/mp4"></video> </div>
        </div>
        <div class ="right">
            <div class="guide-desc"> <h3>${data.functionDesc}</h3> </div>
            <div class="guide-note"> <p> <b>Important note:</b> ${data.importantNote} </p> </div>
            <div class="guide-steps"> <ol>${stepsList.map(step => `<li>${step}</li>`).join("")}</ol> </div>
        </div>
    </div>
    `;

    container.classList.add('container');
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
        } else {
            console.error('Failed to track view:', response.status);
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
        if (!response.ok) {
            if (response.status === 404) {
                console.error("Guide not found!");
            } else {
                console.error(`Error fetching guide (Status: ${response.status})`);
            }
            return null;
        }
        specData = await response.json();

        await trackGuideView(guideId);
    } catch (error) {
        console.error('Error fetching specific guide:', error);
    }
    return specData;
}

async function init(){
data = await getSpecGuide();
loadGuidePage();
}

document.addEventListener('DOMContentLoaded', init);

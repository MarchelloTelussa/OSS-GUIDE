import { getSpecData } from './api.js';

let data = [];

function loadGuidePage() {
    const container = document.querySelector('#guide-container');
    
    container.innerHTML = `
    <div class="guide-title"> <h1>${data.title}</h1> </div>
    <div class="split">
        <div class="left">
            <div class="guide-video"> <video controls src="${data.videoUrl}" type="video/mp4"></video> </div>
            <div class="guide-desc"> <h3>${data.functionDesc}</h3> </div>
        </div>
        <div class ="right">
            <div> <p> <b>Important note:</b> ${data.importantNote} </p> </div>
            <div> <ol> ${data.steps.map(step => ` <li>${step}</li> `).join("")} </ol> </div>
        </div>
    </div>
    `;
    
    container.classList.add('container');
}

async function init(){
data = await getSpecData();
loadGuidePage();
}

init();
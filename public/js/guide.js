import { getSpecData } from './api.js';

let data = [];

function loadGuidePage() {
    const container = document.querySelector('#guide-container');
    
    container.innerHTML = `
    <div class="guide-title"> <h1>${data.title}</h1> </div>
    <div class="split">
        <div class="left">
            <div class="guide-video"> <video controls src="${data.videoUrl}" type="video/mp4"></video> </div>
        </div>
        <div class ="right">
            <div class="guide-desc"> <h3>${data.functionDesc}</h3> </div>
            <div class="guide-note"> <p> <b>Important note:</b> ${data.importantNote} </p> </div>
            <div class="guide-steps"> <ol> ${data.steps.map(step => ` <li>${step}</li> `).join("")} </ol> </div>
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
const title = document.querySelector('#title');
const functionDesc = document.querySelector('#functionDesc');
const importantNote = document.querySelector('#importantNote');
const videoUrl = document.querySelector('#videoPath');

const form = document.querySelector('#editGuideForm');
const stepsContainer = document.querySelector('#stepsContainer');
const editStepBtn = document.querySelector('#editStepBtn'); // Pastikan selektor ini terdefinisi
const messageDiv = document.querySelector('#message');
let stepCount = 0;

// 1. Ambil guideId di luar agar bisa diakses oleh getSpecGuide() dan submit handler
const urlParams = new URLSearchParams(window.location.search);
const guideId = urlParams.get('id');

async function getSpecGuide() {
    if (!guideId) {
        console.error('ID tidak ditemukan dalam parameter URL');
        showMessage('ID Guide tidak valid/tidak ditemukan di URL', 'error');
        return null;
    }

    try {
        const response = await fetch(`/api/guides/${guideId}`);
        if (!response.ok) {
            if (response.status === 404) {
                console.error("Guide not found!");
            } else {
                console.error(`Error fetching guide (Status: ${response.status})`);
            }
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching specific guide:', error);
        return null;
    }
}

// 2. Bungkus proses inisialisasi agar penanganan async lebih aman
async function init() {
    const guideData = await getSpecGuide();

    if (!guideData) {
        showMessage('Gagal memuat data guide dari server', 'error');
        return;
    }

    loadData(guideData);
    loadSteps(guideData);
}

function loadData(data) {
    title.value = data.title || '';
    functionDesc.value = data.functionDesc || '';
    importantNote.value = data.importantNote || '';
    videoUrl.value = data.videoUrl || '';
    if (data.videoUrl) {
        document.querySelector('#videoCurrent').textContent =
            `Video saat ini: ${data.videoUrl}. Pilih file baru untuk menggantinya (kosongkan jika tidak ingin mengganti).`;
    }
}

function loadSteps(data) { 
    try {
        const steps = data.steps || [];
        stepsContainer.innerHTML = ''; 
        stepCount = 0; 

        if (steps.length === 0) {
            addStepField();
            return;
        }

        steps.forEach((step, index) => {
            const stepItem = document.createElement('div');
            stepItem.className = 'step-item';
            stepItem.dataset.stepId = index + 1;
            stepItem.innerHTML = `
                <input type="text" placeholder="Step ${index + 1}" class="step-input" value="${step}">
                <button type="button" class="remove-step-btn">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            stepsContainer.appendChild(stepItem);
            stepCount++;
        });
    } catch (error) {
        console.error('Error loading guide data:', error);
        showMessage('Gagal memuat data guide', 'error');
    }
}

function addStepField() {
    stepCount++;
    const stepItem = document.createElement('div');
    stepItem.className = 'step-item';
    stepItem.dataset.stepId = stepCount;
    stepItem.innerHTML = `
        <input type="text" placeholder="Step ${stepCount}" class="step-input">
        <button type="button" class="remove-step-btn">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    stepsContainer.appendChild(stepItem);
}

// Event delegation untuk hapus step
stepsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-step-btn');
    if (btn) {
        btn.closest('.step-item').remove();
    }
});

if (editStepBtn) {
    editStepBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addStepField();
    });
}

function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
}

const btn = document.getElementById('fullscreenBtn');
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

// Upload file video ke server (disalin ke public/videos), mengembalikan path-nya
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.mov', '.webm', '.ogv', '.ogg'];
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

function validateVideoFile(file) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext) || (file.type && !file.type.startsWith('video/'))) {
        return `File harus berupa video (${ALLOWED_VIDEO_EXTENSIONS.join(', ')})`;
    }
    if (file.size > MAX_VIDEO_SIZE) return 'Ukuran video maksimal 500 MB';
    return null;
}

async function uploadVideo(file) {
    const invalid = validateVideoFile(file);
    if (invalid) {
        showMessage(invalid, 'error');
        return null;
    }
    const formData = new FormData();
    formData.append('video', file);

    const response = await fetch('/api/upload-video', { method: 'POST', body: formData });

    if (response.status === 401 || response.status === 403) {
        window.location.href = 'login.html';
        return null;
    }

    const result = await response.json();
    if (!response.ok) {
        showMessage(result.error || 'Gagal mengunggah video', 'error');
        return null;
    }
    return result.videoPath;
}

// Event handler submit form
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.submitting === 'true') return; // cegah double submit

    if (!guideId) {
        showMessage('ID guide tidak ditemukan. Tidak dapat memperbarui data.', 'error');
        return;
    }

    const titleValue = document.querySelector('#title').value.trim();
    const functionDescValue = document.querySelector('#functionDesc').value.trim();
    const importantNoteValue = document.querySelector('#importantNote').value.trim();
    const videoFile = document.querySelector('#videoFile').files[0];
    let videoUrlValue = document.querySelector('#videoPath').value.trim();

    const steps = Array.from(document.querySelectorAll('.step-input'))
        .map(input => input.value.trim())
        .filter(step => step.length > 0);

    if (!titleValue || !functionDescValue || !importantNoteValue || (!videoFile && !videoUrlValue)) {
        showMessage('Semua field wajib diisi', 'error');
        return;
    }

    form.dataset.submitting = 'true';
    try {
        if (videoFile) {
            videoUrlValue = await uploadVideo(videoFile);
            if (!videoUrlValue) { form.dataset.submitting = 'false'; return; }
        }

        const response = await fetch(`/api/guides/${guideId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title: titleValue, 
                functionDesc: functionDescValue, 
                importantNote: importantNoteValue, 
                videoUrl: videoUrlValue, 
                steps 
            })
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = 'login.html';
            return;
        }

        const result = await response.json();

        if (response.ok) {
            showMessage('Guide berhasil diedit! Mengalihkan...', 'success');
        } else {
            showMessage(result.error || 'Gagal mengedit guide', 'error');
            form.dataset.submitting = 'false';
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Terjadi kesalahan koneksi ke server', 'error');
        form.dataset.submitting = 'false';
    }
});

init();
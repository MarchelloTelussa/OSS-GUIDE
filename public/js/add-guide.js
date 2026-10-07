const form = document.querySelector('#addGuideForm');
const addStepBtn = document.querySelector('#addStepBtn');
const stepsContainer = document.querySelector('#stepsContainer');
const messageDiv = document.querySelector('#message');
let stepCount = 0;

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

// Event delegation untuk tombol hapus step
stepsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-step-btn');
    if (btn) {
        btn.closest('.step-item').remove();
    }
});

addStepBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addStepField();
});

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

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.submitting === 'true') return; // cegah double submit

    const title = document.querySelector('#title').value.trim();
    const functionDesc = document.querySelector('#functionDesc').value.trim();
    const importantNote = document.querySelector('#importantNote').value.trim();
    const videoFile = document.querySelector('#videoFile').files[0];

    const steps = Array.from(document.querySelectorAll('.step-input'))
        .map(input => input.value.trim())
        .filter(step => step.length > 0);

    if (!title || !functionDesc || !importantNote || !videoFile) {
        showMessage('Semua field wajib diisi', 'error');
        return;
    }

    form.dataset.submitting = 'true';
    try {
        const videoUrl = await uploadVideo(videoFile);
        if (!videoUrl) { form.dataset.submitting = 'false'; return; }

        const response = await fetch('/api/guides', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, functionDesc, importantNote, videoUrl, steps })
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = 'login.html';
            return;
        }

        const result = await response.json();

        if (response.ok) {
            showMessage('Guide berhasil dibuat! Mengalihkan...', 'success');
        } else {
            showMessage(result.error || 'Gagal membuat guide', 'error');
            form.dataset.submitting = 'false';
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Terjadi kesalahan koneksi ke server', 'error');
        form.dataset.submitting = 'false';
    }
});

addStepField();

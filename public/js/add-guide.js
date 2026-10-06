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

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.querySelector('#title').value.trim();
    const functionDesc = document.querySelector('#functionDesc').value.trim();
    const importantNote = document.querySelector('#importantNote').value.trim();
    const videoUrl = document.querySelector('#videoPath').value.trim();

    const steps = Array.from(document.querySelectorAll('.step-input'))
        .map(input => input.value.trim())
        .filter(step => step.length > 0);

    if (!title || !functionDesc || !importantNote || !videoUrl) {
        showMessage('Semua field wajib diisi', 'error');
        return;
    }

    try {
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
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Terjadi kesalahan koneksi ke server', 'error');
    }
});

addStepField();

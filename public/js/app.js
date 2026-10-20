let searchInput = document.querySelector('#searchBar');
const searchButton = document.querySelector('#searchBtn');
const typeContainer = document.querySelector('#types');
const fullscreenbtn = document.querySelector('#fullscreen');
const bttnadd = document.querySelector('#bttnAdd a');

let types = [];

function updateAddButtonUrl() {
  if (!bttnadd) return;

  const urlParams = new URLSearchParams(window.location.search);
  const currentType = urlParams.get('type');

  if (currentType) {
    bttnadd.href = `add-guide.html?type=${encodeURIComponent(currentType)}`;
  } else {
    bttnadd.href = 'add-guide.html';
  }
}

async function getTypes() {
  try {
    const response = await fetch('/api/guides/types');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const types = await response.json(); 
    return types;
  } catch (error) {
    console.error('Gagal mengambil types: ', error);
    return [];
  }
}

function loadManageType() {
  const triggerBtn = document.getElementById('bttnManage');
  if (!triggerBtn) return;

  triggerBtn.addEventListener('click', showModal);

  function showModal() {
    if (document.getElementById('contMngType')) return;

    const overlay = document.createElement("div");
    overlay.id = 'contMngType';
    overlay.className = 'container_manage_type';

    overlay.innerHTML = `
      <div class="manage_type_box">
        <div class="manage_type_header">
          <h3>Kelola Tipe Guide</h3>
          <button id="modal-close-icon" class="modal-close-btn">&times;</button>
        </div>

        <div class="add-type-wrapper" style="padding: 12px 16px; display: flex; gap: 8px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
          <input type="text" id="inputAddType" placeholder="Masukkan nama tipe baru..." style="flex: 1; padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 4px;" />
          <button id="btnAddNewType" style="padding: 6px 16px; background: #16a34a; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">+ Tambah</button>
        </div>

        <div class="manage_type_body">
          <table class="type-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">No</th>
                <th>Nama Tipe</th>
                <th style="text-align: right; width: 140px;">Aksi</th>
              </tr>
            </thead>
            <tbody id="mngTypeBody">
              <!-- Baris data di-render oleh loadTypeRow() -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeIcon = document.getElementById('modal-close-icon');
    if (closeIcon) closeIcon.addEventListener('click', hideModal);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hideModal();
    });

    function hideModal() {
      overlay.remove();
    }

    document.getElementById('btnAddNewType').onclick = async () => {
      const inputElem = document.getElementById('inputAddType');
      const newType = inputElem.value.trim().toLowerCase();

      if (!newType) {
        alert('Nama tipe baru tidak boleh kosong!');
        return;
      }

      const allRows = document.querySelectorAll('.type-row');
      let isDuplicate = false;

      allRows.forEach(row => {
        const existingType = row.dataset.type;
        if (existingType && existingType.toLowerCase() === newType.toLowerCase()) {
          isDuplicate = true;
        }
      });

      if (isDuplicate) {
        alert(`Tipe "${newType}" sudah ada! Silakan gunakan nama lain.`);
        inputElem.focus();
        return;
      }

      try {
        const payload = {
          title: ' ',
          functionDesc: ' ',
          importantNote: ' ',
          videoUrl: ' ',
          type: newType,
          steps: [' ']
        };

        const response = await fetch('/api/guides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Gagal menambahkan tipe baru');

        alert(`Berhasil menambahkan tipe baru "${newType}"!`);
        inputElem.value = '';
        
        loadTypeRow();
        buildBttnType();

      } catch (error) {
        console.error('Error adding new type:', error);
        alert(error.message);
      }
    };

    loadTypeRow();
  }
}

async function buildBttnType() {
  if (!typeContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const currentType = urlParams.get('type') || 'web';

  typeContainer.innerHTML = '';

  types.forEach(type => {
    const typeName = typeof type === 'string' ? type : (type.name || type.type);
    const button = document.createElement('button');
    button.classList.add('typeButton');
    
    if (currentType.toLowerCase() === typeName.toLowerCase()) {
      button.classList.add('active');
    }

    button.textContent = typeName.toUpperCase();
    
    button.onclick = () => {
      window.location.href = `/index.html?type=${encodeURIComponent(typeName)}`;
    };
    
    typeContainer.appendChild(button);
  });
}

async function loadTypeRow() {
  const container = document.getElementById('mngTypeBody');
  if (!container) return;

  container.innerHTML = `
    <tr class="type-row-loading">
      <td colspan="3" style="text-align:center;">Memuat data...</td>
    </tr>
  `;

  try {
    const types = await getTypes();
    if (!types || types.length === 0) {
      container.innerHTML = `
        <tr class="type-row-empty">
          <td colspan="3" style="text-align:center;">Belum ada data tipe.</td>
        </tr>
      `;
      return;
    }

    container.innerHTML = types.map((type, index) => {
      const typeName = typeof type === 'string' ? type : (type.name || type.type);
      return `
        <tr class="type-row" id="row-type-${index}" data-index="${index}" data-type="${typeName}">
          <td class="col-no" style="text-align:center;">${index + 1}</td>
          <td class="col-name" id="col-name-${index}">${typeName}</td>
          <td class="col-action" id="col-action-${index}" style="text-align:right;">
            <button class="btn-action btn-edit" data-action="edit">Edit</button>
            <button class="btn-action btn-delete" data-action="delete">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');

    // PASANG EVENT LISTENER MENGGUNAKAN DELEGATION (Aman dari Masalah Scope)
    container.onclick = async (e) => {
      const button = e.target.closest('button');
      if (!button) return;

      const action = button.dataset.action;
      const row = button.closest('.type-row');
      if (!row) return;

      const index = row.dataset.index;
      const currentType = row.dataset.type;

      if (action === 'edit') {
        handleInlineEdit(index, currentType);
      } else if (action === 'delete') {
        handleDeleteType(currentType);
      } else if (action === 'save') {
        handleInlineSave(index, currentType);
      } else if (action === 'cancel') {
        handleInlineCancel(index, currentType);
      }
    };

  } catch (error) {
    console.error('Gagal memuat tipe:', error);
    container.innerHTML = `
      <tr class="type-row-error">
        <td colspan="3" style="text-align:center; color:red;">Gagal mengambil data. Silakan coba lagi.</td>
      </tr>
    `;
  }
}

// FUNGSI-FUNGSI AKSI (Bisa ditaruh di mana saja, tidak akan undefined)

function handleInlineEdit(index, currentType) {
  const nameCell = document.getElementById(`col-name-${index}`);
  const actionCell = document.getElementById(`col-action-${index}`);
  if (!nameCell || !actionCell) return;

  nameCell.innerHTML = `
    <input type="text" id="input-edit-${index}" value="${currentType}" style="width: 100%; padding: 4px 8px; box-sizing: border-box;" />
  `;

  actionCell.innerHTML = `
    <button class="btn-action btn-save" data-action="save" style="background:#2563eb; color:#fff;">Simpan</button>
    <button class="btn-action btn-cancel" data-action="cancel">Batal</button>
  `;

  const inputElem = document.getElementById(`input-edit-${index}`);
  if (inputElem) inputElem.focus();
}

async function handleInlineSave(index, currentType) {
  const inputElem = document.getElementById(`input-edit-${index}`);
  if (!inputElem) return;

  const newType = inputElem.value.trim().toLowerCase();

  if (!newType) {
    alert('Nama tipe tidak boleh kosong!');
    return;
  }

  // Jika nama tidak berubah, batalkan saja
  if (newType.toLowerCase() === currentType.toLowerCase()) {
    handleInlineCancel(index, currentType);
    return;
  }

  // Cek duplikasi lowercase dengan baris lain
  const allRows = document.querySelectorAll('.type-row');
  let isDuplicate = false;

  allRows.forEach(r => {
    if (r.id !== `row-type-${index}`) {
      const otherTypeName = r.dataset.type;
      if (otherTypeName && otherTypeName.toLowerCase() === newType.toLowerCase()) {
        isDuplicate = true;
      }
    }
  });

  if (isDuplicate) {
    alert(`Tipe "${newType}" sudah ada! Silakan gunakan nama lain.`);
    inputElem.focus();
    return;
  }

  // Kirim perubahan ke API
  try {
    const response = await fetch(`api/guide/types/${encodeURIComponent(currentType)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newType })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Gagal mengubah tipe');

    alert('Berhasil mengubah tipe!');
    loadTypeRow();
    buildBttnType();
  } catch (err) {
    alert(err.message);
  }
}

function handleInlineCancel(index, originalType) {
  const nameCell = document.getElementById(`col-name-${index}`);
  const actionCell = document.getElementById(`col-action-${index}`);

  if (nameCell) nameCell.textContent = originalType;
  if (actionCell) {
    actionCell.innerHTML = `
      <button class="btn-action btn-edit" data-action="edit">Edit</button>
      <button class="btn-action btn-delete" data-action="delete">Hapus</button>
    `;
  }
}

function handleDeleteType(typeToDelete) {
  if (document.getElementById('modal-delete-type')) return;

  const overlay = document.createElement('div');
  overlay.id = 'modal-delete-type';
  overlay.className = 'container_manage_type sub-modal';

  overlay.innerHTML = `
    <div class="manage_type_box delete">
      <div class="manage_type_header">
        <h3>Konfirmasi Hapus</h3>
        <button class="modal-close-btn" id="close-del-btn">&times;</button>
      </div>
      <div class="manage_type_body">
        <p>Apakah Anda yakin ingin menghapus semua guide dengan tipe <strong>"${typeToDelete}"</strong>?</p>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
        <button id="cancel-del-btn" style="padding:6px 12px;">Batal</button>
        <button id="confirm-del-btn" style="padding:6px 12px; background:#dc2626; color:#fff; border:none; border-radius:4px;">Hapus</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeSubModal = () => overlay.remove();
  document.getElementById('close-del-btn').onclick = closeSubModal;
  document.getElementById('cancel-del-btn').onclick = closeSubModal;

  document.getElementById('confirm-del-btn').onclick = async () => {
    try {
      const response = await fetch(`/api/guides/types/${encodeURIComponent(typeToDelete)}`, {
        method: 'DELETE'
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textError = await response.text();
        throw new Error(`Server tidak mengembalikan JSON. Status: ${response.status}`);
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal menghapus tipe');

      alert(`Berhasil menghapus ${result.deletedCount} guide!`);
      closeSubModal();
      loadTypeRow();
      buildBttnType();
    } catch (err) {
      alert(err.message);
    }
  };
}

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  let selectedType = urlParams.get('type');

  if (!selectedType) {
    selectedType = 'web';
    const newUrl = `${window.location.pathname}?type=${selectedType}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }

const types = await getTypes();

  buildBttnType();
  updateAddButtonUrl();
  loadManageType();
}

document.addEventListener('DOMContentLoaded', init);

function performSearch() {
  const searchQuery = searchInput.value.toLowerCase().trim();
  const originalPlaceholder = "masukkan nama guide yang anda butuhkan";

  if (searchQuery === "") {
    searchInput.placeholder = "Input tidak boleh kosong!";
    searchInput.classList.add('error-state');

    setTimeout(() => {
      searchInput.placeholder = originalPlaceholder;
      searchInput.classList.remove('error-state');
    }, 2500);
    return;
  }
  
  const searchMatched = t.filter(item => {
    return item && item.title && item.title.toLowerCase().includes(searchQuery);
  });

  if (searchMatched.length === 0) {
    searchInput.value = "";
    searchInput.placeholder = "Not found";
    searchInput.classList.add('error-state');
    
    setTimeout(() => {
      searchInput.placeholder = originalPlaceholder;
      searchInput.classList.remove('error-state');
    }, 2500);
  } else {
    renderCards(searchMatched);
  }
}

if (searchButton) {
  searchButton.addEventListener('click', function(e) {
    e.preventDefault();
    performSearch();
  });
}

if (searchInput) {
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });
}

if (fullscreenbtn) {
  fullscreenbtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });
}

setInterval(async () => {
    try {
        const res = await db.query('DELETE FROM sessions WHERE expires_at < NOW()');
        if (res.rowCount > 0) {
            console.log(`[CLEANUP] Berhasil membersihkan ${res.rowCount} sesi kadaluwarsa.`);
        }
    } catch (err) {
        console.error('[CLEANUP ERROR]', err);
    }
}, 30 * 60 * 1000);
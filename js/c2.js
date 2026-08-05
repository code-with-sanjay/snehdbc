let c2ContentLoaded = false;
let c2IsModalOpen = false;

function loadC2ModalContent() {
  return new Promise((resolve, reject) => {
    if (c2ContentLoaded) { resolve(); return; }
    fetch('modals/c2.html')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(html => {
        document.getElementById('c2').innerHTML = html;
        c2ContentLoaded = true;
        resolve();
      })
      .catch(err => { console.error('Failed to load C2 modal:', err); reject(err); });
  });
}

export function showc2Modal() {
  loadC2ModalContent().then(() => {
    const modal = document.getElementById('c2');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    c2IsModalOpen = true;
    setTimeout(() => c2ToggleSection('dbc'), 50);
  });
}

export function c2CloseModal() {
  const modal = document.getElementById('c2');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
  c2IsModalOpen = false;
  c2CloseAllSections();
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('c2');
  if (e.target === modal) c2CloseModal();
});

export function c2ToggleSection(sectionId) {
  const section = document.querySelector(`.c2-contact-section[data-section="${sectionId}"]`);
  if (!section) return;
  section.classList.toggle('expanded');
}

function c2CloseAllSections() {
  document.querySelectorAll('.c2-contact-section').forEach(section => {
    section.classList.remove('expanded');
  });
}


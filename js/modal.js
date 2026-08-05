// modal.js – dynamic loading with cache
const modalCache = {};

function loadModalContent(modalId, url) {
  return new Promise((resolve, reject) => {
    // If already loaded, just resolve immediately
    if (modalCache[modalId]) { resolve(); return; }
    
    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(html => {
        // 1. Inject the HTML into the DOM
        document.getElementById(modalId).innerHTML = html;
        modalCache[modalId] = true;
        
        // 2. Initialize Lucide icons for this specific newly loaded modal
        if (window.lucide) {
          lucide.createIcons({ root: document.getElementById(modalId) });
        }

        // 3. Run any specific setup scripts (like the career filters)
        if (modalId === 'careers-modal') initCareersFilters();
        
        resolve();
      })
      .catch(err => { 
        console.error(`Failed to load modal ${modalId}:`, err); 
        reject(err); 
      });
  });
}

export function showLegalModal() {
  loadModalContent('legal-modal', 'modals/legal-modal.html')
    .then(() => { document.getElementById('legal-modal').style.display = 'flex'; });
}

export function showCareersModal() {
  loadModalContent('careers-modal', 'modals/careers-modal.html')
    .then(() => { document.getElementById('careers-modal').style.display = 'flex'; });
}

export function showContactModal() {
  loadModalContent('contact-modal', 'modals/contact-modal.html')
    .then(() => { document.getElementById('contact-modal').style.display = 'flex'; });
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

export function toggleAccordion(element) {
  element.classList.toggle('active');
  const content = element.nextElementSibling;
  // ✅ Guard against missing sibling (malformed HTML)
  if (!content) return;
  content.classList.toggle('active');
  
  // Close other accordions – safe with optional chaining
  document.querySelectorAll('.accordion-header').forEach(header => {
    if (header !== element) {
      header.classList.remove('active');
      header.nextElementSibling?.classList.remove('active');
    }
  });
}

export function openLegalSection(sectionTitle) {
  loadModalContent('legal-modal', 'modals/legal-modal.html')
    .then(() => {
      const modal = document.getElementById('legal-modal');
      modal.style.display = 'flex';
      
      // Close all currently open headers – safe optional chaining
      document.querySelectorAll('.accordion-header').forEach(header => {
        header.classList.remove('active');
        header.nextElementSibling?.classList.remove('active');
      });
      
      // Find the requested header, open it, and scroll to it
      const headers = document.querySelectorAll('.accordion-header');
      for (let header of headers) {
        if (header.textContent.trim() === sectionTitle) {
          header.classList.add('active');
          const content = header.nextElementSibling;
          if (content) {
            content.classList.add('active');
            setTimeout(() => { content.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 350);
          }
          break;
        }
      }
    });
}

function initCareersFilters() {
  const chips = document.querySelectorAll('#careers-modal .chip');
  chips.forEach(chip => {
    chip.addEventListener('click', function() {
      // Remove active class from all chips
      chips.forEach(c => c.classList.remove('active'));
      // Add active class to clicked chip
      this.classList.add('active');
      
      const filter = this.dataset.filter;
      const roles = document.querySelectorAll('#careers-modal .role-card');
      
      // Show/hide roles based on the filter
      roles.forEach(role => {
        role.style.display = (filter === 'all' || role.dataset.category === filter) ? 'block' : 'none';
      });
    });
  });
}

export function toggleRoleDetails(headerElement) {
  const roleCard = headerElement.closest('.role-card');
  roleCard.classList.toggle('expanded');
}
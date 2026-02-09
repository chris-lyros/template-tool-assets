/**
 * Progressive UX enhancements for the quote automator UI.
 * Load after existing webflow/javascript.js so functions/elements already exist.
 */

(function initUxEnhancements() {
  document.addEventListener('DOMContentLoaded', () => {
    setupAriaLiveRegions();
    setupEscapeToCloseModals();
    setupStickyGenerateState();
    setupUploadInputRebinding();
  });
})();

function setupAriaLiveRegions() {
  ['generate-feedback', 'register-feedback', 'refine-feedback', 'rename-inline-feedback'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
  });
}

function setupEscapeToCloseModals() {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    const refineOpen = document.getElementById('refine-modal')?.classList.contains('active');
    const registerOpen = document.getElementById('register-template-overlay')?.classList.contains('active');
    const deleteOpen = document.getElementById('delete-modal')?.classList.contains('active');

    if (refineOpen && typeof closeRefineModal === 'function') closeRefineModal();
    if (registerOpen && typeof hideRegisterForm === 'function') hideRegisterForm();
    if (deleteOpen && typeof closeDeleteModal === 'function') closeDeleteModal();
  });
}

function setupStickyGenerateState() {
  const form = document.getElementById('generate-quote-form');
  const button = document.getElementById('generate-quote-btn');
  if (!form || !button) return;

  form.addEventListener('submit', () => {
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = '<span class="spinner"></span> Generating quote…';
  });
}

function setupUploadInputRebinding() {
  const quoteList = document.getElementById('quote-file-list');
  if (!quoteList) return;

  const observer = new MutationObserver(() => {
    const quoteInput = document.getElementById('quote-file-input');
    const templateInput = document.getElementById('template-file-input');

    if (quoteInput && !quoteInput.dataset.uxBound) {
      quoteInput.dataset.uxBound = 'true';
      quoteInput.addEventListener('change', () => {
        if (typeof renderFileList === 'function') renderFileList();
      });
    }

    if (templateInput && !templateInput.dataset.uxBound) {
      templateInput.dataset.uxBound = 'true';
      templateInput.addEventListener('change', (e) => {
        if (e.target.files?.[0] && typeof updateTemplateFilePreview === 'function') {
          updateTemplateFilePreview(e.target.files[0]);
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

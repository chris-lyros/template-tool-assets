/* Quote Automator frontend rebuild: mobile-first, resilient interactions */

const API_BASE = 'https://n8n.lyroshq.com/webhook';
const ENDPOINTS = {
  fetchTemplates: `${API_BASE}/quote-fetch-templates`,
  registerTemplate: `${API_BASE}/quote-register-template`,
  generateQuote: `${API_BASE}/quote-generate`,
  deleteTemplate: `${API_BASE}/quote-delete-template`
};

let authenticatedUserEmail = '';
let uploadedFiles = [];
let templates = [];
let deletingTemplateId = '';

function qs(id) { return document.getElementById(id); }
function escapeHtml(input = '') {
  return String(input).replace(/[&<>'"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(raw) {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString();
}

function showMessage(id, message, type = 'success') {
  const el = qs(id);
  if (!el) return;
  el.className = `feedback-message show ${type}`;
  el.textContent = message;
}

function hideMessage(id) {
  const el = qs(id);
  if (!el) return;
  el.className = 'feedback-message';
  el.textContent = '';
}

function getSessionFromUrl() {
  const p = new URLSearchParams(window.location.search);
  return {
    email: p.get('email') || p.get('user_email') || '',
    token: p.get('token') || ''
  };
}

function setLoadingState(loading) {
  qs('loading-message').style.display = loading ? 'grid' : 'none';
}

function showAccessDenied() {
  setLoadingState(false);
  qs('access-denied-message').style.display = 'grid';
  qs('quote-wrapper').style.display = 'none';
}

function showApp(email) {
  setLoadingState(false);
  qs('access-denied-message').style.display = 'none';
  qs('quote-wrapper').style.display = 'block';
  qs('user-email-display').textContent = email;
}

function bindAccordion() {
  document.querySelectorAll('[data-accordion-trigger]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = btn.closest('[data-accordion]');
      const isOpen = section.classList.contains('is-open');
      document.querySelectorAll('[data-accordion]').forEach((s) => {
        s.classList.remove('is-open');
        s.querySelector('[data-accordion-trigger]').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        section.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

function renderFileList() {
  const container = qs('quote-file-list');
  if (!uploadedFiles.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = uploadedFiles.map((f, idx) => `
    <div class="file-item">
      <span class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
      <span class="file-size">${formatFileSize(f.size)}</span>
      <button type="button" class="btn btn-danger" data-remove-file="${idx}" aria-label="Remove ${escapeHtml(f.name)}">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('[data-remove-file]').forEach((btn) => {
    btn.addEventListener('click', () => {
      uploadedFiles.splice(Number(btn.dataset.removeFile), 1);
      renderFileList();
    });
  });
}

async function loadTemplates() {
  const list = qs('template-list');
  const selector = qs('template-selector');
  list.innerHTML = '<p>Loading templates…</p>';

  try {
    const res = await fetch(ENDPOINTS.fetchTemplates, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: authenticatedUserEmail })
    });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'Failed to load templates');

    templates = data.templates || [];
    if (!templates.length) {
      list.innerHTML = '<p>No templates registered yet.</p>';
      selector.innerHTML = '<option value="">No templates available</option>';
      return;
    }

    selector.innerHTML = '<option value="">Choose a template…</option>' + templates.map((t) => (
      `<option value="${escapeHtml(t.template_id)}">${escapeHtml(t.template_name)}</option>`
    )).join('');

    list.innerHTML = templates.map((t) => `
      <article class="template-item">
        <div class="template-meta">
          <h4>${escapeHtml(t.template_name)}</h4>
          <p>Uploaded ${formatDate(t.created_at)}</p>
        </div>
        <div class="template-actions">
          <a class="btn btn-secondary" href="${escapeHtml(t.google_drive_view_url || t.preview_url || '#')}" target="_blank" rel="noopener">View</a>
          <button type="button" class="btn btn-secondary" data-regenerate="${escapeHtml(t.template_id)}">Use</button>
          <button type="button" class="btn btn-danger" data-delete-template="${escapeHtml(t.template_id)}" data-template-name="${escapeHtml(t.template_name)}">Delete</button>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('[data-regenerate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selector.value = btn.dataset.regenerate;
        showMessage('generate-feedback', 'Template selected. Upload files and generate.', 'success');
      });
    });

    list.querySelectorAll('[data-delete-template]').forEach((btn) => {
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.deleteTemplate, btn.dataset.templateName));
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = '<p>Could not load templates. Please retry shortly.</p>';
  }
}

function openRegisterModal() {
  qs('register-template-overlay').classList.add('active');
  qs('register-template-overlay').setAttribute('aria-hidden', 'false');
}

function closeRegisterModal() {
  qs('register-template-overlay').classList.remove('active');
  qs('register-template-overlay').setAttribute('aria-hidden', 'true');
  qs('template-registration-form').reset();
  hideMessage('register-feedback');
}

function openDeleteModal(templateId, name) {
  deletingTemplateId = templateId;
  qs('delete-template-name').textContent = name;
  qs('delete-confirmation-input').value = '';
  qs('delete-modal').classList.add('active');
  qs('delete-modal').setAttribute('aria-hidden', 'false');
  qs('delete-confirmation-input').focus();
}

function closeDeleteModal() {
  deletingTemplateId = '';
  qs('delete-modal').classList.remove('active');
  qs('delete-modal').setAttribute('aria-hidden', 'true');
}

async function submitTemplateRegistration(e) {
  e.preventDefault();
  const btn = qs('register-template-btn');
  const form = qs('template-registration-form');
  const file = qs('template-file-input').files[0];
  if (!file) return showMessage('register-feedback', 'Please choose a DOCX template file.', 'error');

  btn.disabled = true;
  btn.textContent = 'Registering…';
  hideMessage('register-feedback');

  try {
    const fd = new FormData(form);
    fd.append('user_email', authenticatedUserEmail);
    const res = await fetch(ENDPOINTS.registerTemplate, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'Registration failed');

    showMessage('register-feedback', 'Template registered successfully.', 'success');
    await loadTemplates();
    setTimeout(closeRegisterModal, 700);
  } catch (err) {
    showMessage('register-feedback', err.message || 'Registration failed.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Register';
  }
}

async function submitGenerateQuote(e) {
  e.preventDefault();
  const btn = qs('generate-quote-btn');
  const templateId = qs('template-selector').value;

  if (!templateId) return showMessage('generate-feedback', 'Please choose a template.', 'error');
  if (!uploadedFiles.length) return showMessage('generate-feedback', 'Please upload at least one quote file.', 'error');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 8px 0 0;"></span>Generating…';
  hideMessage('generate-feedback');

  try {
    const fd = new FormData();
    fd.append('user_email', authenticatedUserEmail);
    fd.append('template_id', templateId);
    fd.append('skip_ai_processing', qs('skip-ai-processing').checked ? 'true' : 'false');
    fd.append('text_instructions', qs('text-instructions').value || '');
    uploadedFiles.forEach((file) => fd.append('files', file));

    const res = await fetch(ENDPOINTS.generateQuote, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'Quote generation failed');

    showMessage('generate-feedback', 'Quote generated successfully. Check your email or downloads.', 'success');
  } catch (err) {
    showMessage('generate-feedback', err.message || 'Quote generation failed.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Quote';
  }
}

async function confirmDelete() {
  if (qs('delete-confirmation-input').value.trim() !== 'DELETE') return;
  const btn = qs('confirm-delete-btn');
  btn.disabled = true;
  btn.textContent = 'Deleting…';

  try {
    const res = await fetch(ENDPOINTS.deleteTemplate, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: authenticatedUserEmail, template_id: deletingTemplateId })
    });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'Delete failed');

    closeDeleteModal();
    await loadTemplates();
    showMessage('generate-feedback', 'Template deleted.', 'success');
  } catch (err) {
    showMessage('generate-feedback', err.message || 'Delete failed.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
  }
}

function wireEvents() {
  bindAccordion();
  qs('logout-btn').addEventListener('click', () => window.location.href = 'https://www.lyros.com.au/quote-login');
  qs('open-register-modal').addEventListener('click', openRegisterModal);
  qs('cancel-register').addEventListener('click', closeRegisterModal);
  qs('cancel-delete').addEventListener('click', closeDeleteModal);
  qs('confirm-delete-btn').addEventListener('click', confirmDelete);
  qs('template-registration-form').addEventListener('submit', submitTemplateRegistration);
  qs('generate-quote-form').addEventListener('submit', submitGenerateQuote);

  qs('quote-file-input').addEventListener('change', (e) => {
    uploadedFiles = Array.from(e.target.files || []);
    renderFileList();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeRegisterModal();
    closeDeleteModal();
  });
}

async function init() {
  wireEvents();
  const session = getSessionFromUrl();
  if (!session.email) {
    showAccessDenied();
    return;
  }

  authenticatedUserEmail = session.email;
  showApp(authenticatedUserEmail);
  await loadTemplates();
}

document.addEventListener('DOMContentLoaded', init);

// GLOBAL STATE

let authenticatedUserEmail = '';
let currentAccessToken = '';
let userTemplates = [];
let uploadedFiles = [];
let templateToDelete = null;
let templateToRename = null;

// REFINEMENT STATE
let currentRefinementTemplate = null;
let currentPlaceholders = [];
let manualPlaceholdersToAdd = [];
let templateTextFragments = [];
let autocompleteHighlightIndex = -1;


// PLACEHOLDER PREVIEW UPDATE

function updatePlaceholderPreview() {
    const input = document.getElementById('manual-placeholder-name');
    const preview = document.getElementById('placeholder-preview');
    const previewText = document.getElementById('placeholder-preview-text');
    
    if (!input || !preview || !previewText) return;
    
    const value = input.value.trim();
    
    if (value.length > 0) {
        previewText.textContent = `[${value.toUpperCase()}]`;
        preview.style.display = 'flex';
    } else {
        preview.style.display = 'none';
    }
}


// AUTH & INITIALISATION

function getAccessToken() {
    const storedToken = sessionStorage.getItem('access_token');
    if (storedToken) return storedToken;
    
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('access_token');
}

currentAccessToken = getAccessToken();

if (!currentAccessToken) {
    window.location.href = 'https://www.lyros.com.au/quote-login';
} else {
    fetch('https://n8n.lyroshq.com/webhook/quote-valid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: currentAccessToken })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('loading-message').style.display = 'none';
        
        if (data.status === 'success') {
	sessionStorage.setItem('access_token', currentAccessToken);
	sessionStorage.setItem('user_email', data.user_email);

            authenticatedUserEmail = data.user_email.replace(/^=+/, '');
            document.getElementById('quote-tool-content').style.display = 'block';
            document.getElementById('user-email-display').textContent = authenticatedUserEmail;
            
window.history.replaceState({}, document.title, '/quote-tool');
            loadUserTemplates();
            
            // ✅ Initialize file upload listeners after DOM is visible
            initializeFileUploadListeners();
            initializeFormEventListeners();
        } else {
	sessionStorage.clear();
	document.getElementById('access-denied-message').style.display = 'block';
	setTimeout(() => {
	    window.location.href = 'https://www.lyros.com.au/quote-login';
	}, 2000);
        }
    })
    .catch(error => {
        console.error('Verification Error:', error);
        document.getElementById('loading-message').style.display = 'none';
        document.getElementById('access-denied-message').style.display = 'block';
        sessionStorage.clear();
    });
}


// LOGOUT FUNCTION

function logout() {
    sessionStorage.clear();
    window.location.href = 'https://www.lyros.com.au/quote-login';
}


// ACCORDION LOGIC

function toggleAccordion(header) {
    const allHeaders = document.querySelectorAll('.accordion-header');
    const allContents = document.querySelectorAll('.accordion-content');
    const content = header.nextElementSibling;
    const isActive = header.classList.contains('active');
    
    allHeaders.forEach(h => h.classList.remove('active'));
    allContents.forEach(c => c.classList.remove('active'));
    
    if (!isActive) {
        header.classList.add('active');
        content.classList.add('active');
    }
}


// LOAD USER TEMPLATES

async function loadUserTemplates() {
    const templateList = document.getElementById('template-list');
    const templateSelector = document.getElementById('template-selector');
    
    templateList.innerHTML = '<p style="color: #888; text-align: center; font-size: 12px;">Loading...</p>';
    
    try {
        const response = await fetch('https://n8n.lyroshq.com/webhook/quote-fetch-templates', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ user_email: authenticatedUserEmail })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
	userTemplates = data.templates || [];
	
	if (userTemplates.length === 0) {
	    templateList.innerHTML = `
	        <div class="empty-state">
		<p style="font-size: 32px; margin-bottom: 12px;">📄</p>
		<p style="color: #ddd; font-size: 14px; margin-bottom: 6px; font-weight: 600;">No Templates Yet</p>
		<p style="font-size: 12px; color: #888; margin-bottom: 16px;">Get started by registering your first quote template above</p>
		<button class="btn btn-primary" onclick="showRegisterForm()" style="padding: 10px 20px; font-size: 13px;">
		    + Register Your First Template
		</button>
	        </div>
	    `;
	    templateSelector.innerHTML = '<option value="">No templates available</option>';
	} else {
	    templateList.innerHTML = userTemplates.map(t => `
	        <div class="template-item">
		<div class="template-info">
		    <h4>${t.template_name}</h4>
		    <p>Uploaded: ${formatDate(t.created_at || 'Unknown')}</p>
		</div>
		<div class="template-actions">
		    <a href="${t.google_drive_view_url || t.preview_url}" target="_blank" class="btn btn-secondary btn-view">View</a>
		    <button class="btn btn-edit btn-refine" onclick="openRefineModal('${t.template_id}', '${escapeHtml(t.template_name)}')">✏️ Edit</button>
		    <button class="btn btn-danger btn-delete" onclick="openDeleteModal('${t.template_id}', '${escapeHtml(t.template_name)}')">×</button>
		</div>
	        </div>
	    `).join('');
	    
	    templateSelector.innerHTML = '<option value="">Choose a template...</option>' +
	        userTemplates.map(t => `
		<option value="${t.template_id}">${t.template_name}</option>
	        `).join('');
	}
        } else {
	throw new Error(data.message || 'Failed to load templates');
        }
    } catch (error) {
        console.error('Template Loading Error:', error);
        templateList.innerHTML = `
	<div class="empty-state">
	    <p style="font-size: 32px; margin-bottom: 12px;">⚠️</p>
	    <p style="color: #ef4444; font-size: 14px; margin-bottom: 8px; font-weight: 600;">Unable to Load Templates</p>
	    <p style="font-size: 12px; color: #888; margin-bottom: 12px;">Our support team at <strong style="color: #ddd;">support@lyros.com.au</strong> has been notified.</p>
	    <p style="font-size: 12px; color: #888; margin-bottom: 16px;">For immediate assistance, please call <strong style="color: #10b981;">0466 562 403</strong></p>
	    <div style="display: flex; gap: 8px; justify-content: center;">
	        <button class="btn btn-secondary" onclick="loadUserTemplates()" style="padding: 8px 16px; font-size: 12px;">
		🔄 Try Again
	        </button>
	        <button class="btn btn-secondary" onclick="sendSupportTicket()" style="padding: 8px 16px; font-size: 12px;">
		📧 Email Support
	        </button>
	    </div>
	</div>
        `;
    }
}


// 🔧 REFINEMENT MODAL FUNCTIONS (WITH ALL FIXES)


async function openRefineModal(templateId, templateName) {
    currentRefinementTemplate = { template_id: templateId, template_name: templateName };
    
    // ✅ Set the template name in the inline rename field
    document.getElementById('edit-template-name-input').value = templateName;
    document.getElementById('refine-modal').classList.add('active');

// Reset manual placeholders list
    manualPlaceholdersToAdd = [];
    renderManualPlaceholderList();

    document.getElementById('placeholder-editor-container').innerHTML = 
        '<div style="text-align: center; padding: 40px;"><div class="spinner" style="width: 32px; height: 32px; border-width: 3px; margin: 0 auto;"></div><p style="color: #888; margin-top: 16px; font-size: 13px;">Loading placeholders...</p></div>';
    
    hideMessage('refine-feedback');
    
    // Reset to AI tab and clear badge counts
    switchRefineTab('ai-placeholders');
    document.getElementById('manual-count').textContent = '0';
    
    // • Initialize auto-suggest functionality
    setTimeout(() => {
        initializeAutoSuggest();
    }, 100);
    
    try {
        const response = await fetch('https://n8n.lyroshq.com/webhook/quote-fetch-placeholders', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
	    template_id: templateId,
	    user_email: authenticatedUserEmail
	})
        });
        
        const data = await response.json();
        
        if (data.placeholders && Array.isArray(data.placeholders) && data.placeholders.length > 0) {
	currentPlaceholders = data.placeholders;
	
	// Update AI count WITHOUT parentheses
	document.getElementById('ai-count').textContent = data.placeholders.length;
	
	renderPlaceholderEditor();
        } else {
	// Set count to 0 when no placeholders
	document.getElementById('ai-count').textContent = '0';
	
	document.getElementById('placeholder-editor-container').innerHTML = `
	    <div class="empty-state" style="padding: 40px 20px;">
	        <p style="font-size: 28px; margin-bottom: 12px;">📝</p>
	        <p style="color: #888; font-size: 13px; margin-bottom: 8px;">No placeholders detected in this template</p>
	        <p style="color: #666; font-size: 11px;">Upload a new template or contact support if this seems incorrect</p>
	    </div>
	`;
        }
    } catch (error) {
        console.error('Placeholder Fetch Error:', error);
        document.getElementById('ai-count').textContent = '0';
        
        document.getElementById('placeholder-editor-container').innerHTML = `
	<div class="empty-state" style="padding: 40px 20px;">
	    <p style="font-size: 28px; margin-bottom: 12px;">⚠️</p>
	    <p style="color: #ef4444; font-size: 13px; margin-bottom: 8px;">Failed to load placeholders</p>
	    <p style="color: #888; font-size: 11px;">Please try again or contact support</p>
	</div>
        `;
    }
}

function renderPlaceholderEditor() {
    const container = document.getElementById('placeholder-editor-container');
    
container.innerHTML = `
        <div class="placeholder-editor">
	${currentPlaceholders.map((ph, index) => createPlaceholderRow(ph, index)).join('')}
        </div>
    `;
    
    // Add event listeners for action dropdowns to update preview
    currentPlaceholders.forEach((_, index) => {
        const actionSelect = document.getElementById(`ph-action-${index}`);
        const nameInput = document.getElementById(`ph-name-${index}`);
        
        if (actionSelect) {
	actionSelect.addEventListener('change', () => updatePlaceholderPreview(index));
        }
        
        if (nameInput) {
	nameInput.addEventListener('input', () => updatePlaceholderPreview(index));
        }
    });
}

// 🔧 FIX #1 & #2: Show both Original and Current text, left-aligned
function createPlaceholderRow(ph, index) {
    const action = ph.action || 'no_change';
    const isNoChange = action === 'no_change';
    
    // Get text values
    const originalText = ph.original_text || '';
    const currentText = ph.current_text || originalText;
    const showCurrentColumn = currentText !== originalText;
    
    // Dynamic text-transform based on action
    const textTransform = action === 'hardcode' ? 'none' : 'uppercase';
    
    return `
<div class="placeholder-row ${isNoChange ? 'row-disabled' : ''}" data-index="${index}">
	
	<!-- ✅ COLUMN 1: CURRENT TEXT (moved to first position) -->
	<div class="placeholder-field">
	    ${showCurrentColumn ? `
	        <label>Current Text ⚡</label>
	        <div class="readonly-field multiline current-text-display" style="background: rgba(16, 185, 129, 0.1); border-color: #10b981;">
		${escapeHtml(currentText)}
	        </div>
	        <label style="margin-top: 12px;">Original Text (for reference)</label>
	    ` : '<label>Original Text</label>'}
	    <div class="readonly-field multiline">
	        ${escapeHtml(originalText)}
	    </div>
	</div>
	
	<!-- ✅ COLUMN 2: ACTION -->
	<div class="placeholder-field action-field-highlight">
	    <div class="label-with-tooltip">
	        <label>Action</label>
	        <span class="tooltip tooltip-multiline" data-tooltip="Rename: Replace with [PLACEHOLDER_NAME]\nHardcode: Replace with exact value\nNo Change: Skip this field">?</span>
	    </div>
	    <select id="ph-action-${index}">
	        <option value="no_change" ${action === 'no_change' ? 'selected' : ''}>⚫ No Change</option>
	        <option value="rename" ${action === 'rename' ? 'selected' : ''}>🔧 Rename</option>
	        <option value="hardcode" ${action === 'hardcode' ? 'selected' : ''}>📌 Hardcode</option>
	    </select>
	</div>
	
	<!-- ✅ COLUMN 3: PLACEHOLDER NAME -->
	<div class="placeholder-field">
	    <label>Placeholder Name</label>
	    <input type="text" 
	           id="ph-name-${index}" 
	           value="${escapeHtml(ph.name || '')}" 
	           placeholder="e.g., CLIENT_NAME"
	           ${isNoChange ? 'disabled' : ''}
	           style="text-transform: ${textTransform};" />
	</div>
	
	<!-- ✅ COLUMN 4: PREVIEW RESULT -->
	<div class="placeholder-field">
	    <label>Preview Result</label>
	    <div class="preview-field" id="ph-preview-${index}">
	        ${generatePreview(currentText, ph.name, action)}
	    </div>
	</div>
</div>
    `;
}

function generatePreview(currentText, name, action) {
    if (action === 'no_change') {
        return '<span style="color: #666; font-style: italic;">No changes</span>';
    } else if (action === 'rename') {
        return `<span style="color: #10b981; font-weight: 600;">[${(name || 'PLACEHOLDER').toUpperCase()}]</span>`;
    } else if (action === 'hardcode') {
        const hardcodedValue = name || currentText || '';
        return `<span style="color: #f59e0b; font-family: monospace;">${escapeHtml(hardcodedValue)}</span>`;
    }
    return '';
}

function updatePlaceholderPreview(index) {
    const actionSelect = document.getElementById(`ph-action-${index}`);
    const nameInput = document.getElementById(`ph-name-${index}`);
    const previewDiv = document.getElementById(`ph-preview-${index}`);
    const row = document.querySelector(`.placeholder-row[data-index="${index}"]`);
    
    if (!actionSelect || !previewDiv) return;
    
    const action = actionSelect.value;
    const name = nameInput ? nameInput.value : '';
    const currentText = currentPlaceholders[index].current_text || currentPlaceholders[index].original_text;
    
    // Dynamic text transform based on action
    if (action === 'hardcode') {
        nameInput.style.textTransform = 'none';
    } else {
        nameInput.style.textTransform = 'uppercase';
    }
    
    // Update preview
    previewDiv.innerHTML = generatePreview(currentText, name, action);
    
    // Toggle row disabled state
    if (action === 'no_change') {
        row.classList.add('row-disabled');
        if (nameInput) nameInput.disabled = true;
    } else {
        row.classList.remove('row-disabled');
        if (nameInput) nameInput.disabled = false;
    }
}

// 🔧 FIX #3: Send search_text (current_text) + FIX #4: Don't auto-close
async function confirmRefinePlaceholders() {
    const button = document.getElementById('save-all-refinements-btn');
    const originalText = button.innerHTML;
    
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Saving...';
    hideMessage('refine-feedback');
    
    // Collect AI placeholder refinements
    const aiRefinements = currentPlaceholders
        .map((ph, index) => {
	const actionSelect = document.getElementById(`ph-action-${index}`);
	const nameInput = document.getElementById(`ph-name-${index}`);
	const action = actionSelect ? actionSelect.value : 'no_change';
	
	if (action === 'no_change') {
	    return null;
	}
	
	// 🔧 CRITICAL: Use current_text as search term!
	const searchText = ph.current_text || ph.original_text || '';
	
	return {
	    search_text: searchText,  // What to search for in template
	    original_text: ph.original_text,  // For reference
	    name: nameInput ? nameInput.value.trim().toUpperCase() : ph.name,
	    action: action
	};
        })
        .filter(ph => ph !== null);

// Allow saving with EITHER AI refinements OR manual additions
    const totalChanges = aiRefinements.length + manualPlaceholdersToAdd.length;
    
    if (totalChanges === 0) {
        showMessage('refine-feedback', '⚠️ No changes to save. Please either modify AI placeholders or add manual placeholders.', 'error');
        button.disabled = false;
        button.innerHTML = originalText;
        return;
    }

    // Combine both types of updates
    const combinedUpdates = [
        ...aiRefinements.map(item => ({ ...item, type: 'ai_refinement' })),
        ...manualPlaceholdersToAdd.map(item => ({ ...item, type: 'manual_addition' }))
    ];

    try {
        const response = await fetch('https://n8n.lyroshq.com/webhook/quote-refine-template', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
	    template_id: currentRefinementTemplate.template_id,
	    user_email: authenticatedUserEmail,
	    updates: combinedUpdates  // ðŸ†• Now includes both AI and manual changes
	})
        });

        const result = await response.json();

        if (result.status === 'success') {
	const summary = result.refinement_summary || {};
	
	// Clear manual placeholder list after successful save
	manualPlaceholdersToAdd = [];
	renderManualPlaceholderList();
	updateManualCount();
	
	// 🔧 FIX #4: Updated success message format
	const successHTML = `
	    <div style="padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border: 1px solid #10b981;">
	        <p style="margin: 0 0 12px 0; color: #10b981; font-weight: 600; font-size: 15px;">✅ Template Updated Successfully!</p>
	        <ul style="margin: 0; padding-left: 20px; color: #ddd; font-size: 13px; line-height: 1.8;">
		<li>${summary.renamed_count || 0} placeholders renamed</li>
		<li>${summary.hardcoded_count || 0} values hardcoded</li>
		<li>${summary.manual_added_count || 0} manual placeholders added</li>
		<li><a href="${summary.preview_url || '#'}" target="_blank" style="color: #10b981; text-decoration: underline;">View Updated Template</a></li>
	        </ul>
	    </div>
	`;
	
	showMessage('refine-feedback', successHTML, 'success');
	
	// Reload templates to show updated counts
	await loadUserTemplates();
	
	// Don't auto-close - user can click the link
	
        } else {
	showMessage('refine-feedback', 
	    `⚠️ <strong>Refinement failed:</strong> ${result.message || 'Unknown error'}`, 
	    'error'
	);
        }
    } catch (error) {
        console.error('Refinement Error:', error);
        showMessage('refine-feedback', '⚠️ An error occurred during refinement. Please try again.', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Wrapper function for Save All Changes button
async function saveAllRefinements() {
    console.log('saveAllRefinements() called - triggering confirmRefinePlaceholders()');
    await confirmRefinePlaceholders();
}


// MANUAL PLACEHOLDER FUNCTIONS


function addManualPlaceholder() {
    const searchText = document.getElementById('manual-search-text').value.trim();
    const placeholderName = document.getElementById('manual-placeholder-name').value.trim().toUpperCase();
    const action = document.getElementById('manual-action-select').value;
    
    // Validation
    if (!searchText) {
        showMessage('refine-feedback', 'Please enter text to find in your template', 'error');
        return;
    }
    
    if (action === 'replace' && !placeholderName) {
        showMessage('refine-feedback', 'Please enter a placeholder name', 'error');
        return;
    }
    
    // For hardcode, use the search text as the value
    const finalName = action === 'hardcode' ? searchText : placeholderName;
    
    // Check for duplicates
    const isDuplicate = manualPlaceholdersToAdd.some(item => 
        item.search_text === searchText && item.action === action
    );
    
    if (isDuplicate) {
        showMessage('refine-feedback', 'This entry already exists in your list', 'error');
        return;
    }
    
    // Add to list
    manualPlaceholdersToAdd.push({
        search_text: searchText,
        placeholder_name: finalName,
        action: action,
        type: 'manual_addition'  // For backend to distinguish from AI refinements
    });
    
    // Clear inputs
    document.getElementById('manual-search-text').value = '';
    document.getElementById('manual-placeholder-name').value = '';
    document.getElementById('placeholder-preview').style.display = 'none';
    
    // Update UI
    renderManualPlaceholderList();
    updateManualCount();
    
    const actionText = action === 'replace' ? `placeholder [${finalName}]` : 'fixed text';
    showMessage('refine-feedback', `✅ Added to list: "${searchText.substring(0, 40)}${searchText.length > 40 ? '...' : ''}" → ${actionText}`, 'success');
    
    // Auto-hide success message after 2 seconds
    setTimeout(() => hideMessage('refine-feedback'), 2000);
}

function renderManualPlaceholderList() {
    const container = document.getElementById('manual-placeholder-items');
    
    if (!container) return;  // Safety check
    
    if (manualPlaceholdersToAdd.length === 0) {
        container.innerHTML = `
	<div class="empty-state-small">
	    <p>No manual placeholders added yet</p>
	    <p style="font-size: 10px; margin-top: 4px;">Fill in the form above and click "Add to List"</p>
	</div>
        `;
        return;
    }
    
    container.innerHTML = manualPlaceholdersToAdd.map((item, index) => {
        const isReplace = item.action === 'replace';
        const actionBadge = isReplace 
	? '<span class="action-badge replace">PLACEHOLDER</span>'
	: '<span class="action-badge hardcode">FIXED TEXT</span>';
        
        const displayValue = isReplace 
	? `<div class="item-value placeholder-format">[${item.placeholder_name}]</div>`
	: `<div class="item-value">${escapeHtml(item.placeholder_name.substring(0, 60))}${item.placeholder_name.length > 60 ? '...' : ''}</div>`;
        
        return `
	<div class="manual-placeholder-item">
	    ${actionBadge}
	    <div class="item-details">
	        <div class="item-label">Find:</div>
	        <div class="item-value">${escapeHtml(item.search_text.substring(0, 80))}${item.search_text.length > 80 ? '...' : ''}</div>
	        <div class="item-label">Replace with:</div>
	        ${displayValue}
	    </div>
	    <button class="btn btn-danger btn-sm" onclick="removeManualPlaceholder(${index})" title="Remove this entry">
	        ×
	    </button>
	</div>
        `;
    }).join('');
}

function removeManualPlaceholder(index) {
    manualPlaceholdersToAdd.splice(index, 1);
    renderManualPlaceholderList();
    updateManualCount();
}

function resetManualForm() {
    document.getElementById('manual-search-text').value = '';
    document.getElementById('manual-placeholder-name').value = '';
    document.getElementById('manual-action-select').value = 'replace';
    
    // Hide autocomplete suggestions
    const suggestionsContainer = document.getElementById('autocomplete-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.classList.remove('active');
        suggestionsContainer.innerHTML = '';
    }
    
    // Hide any feedback messages
    hideMessage('refine-feedback');
    
    // Focus back to text area
    document.getElementById('manual-search-text').focus();
}

function updateManualCount() {
    const countElement = document.getElementById('manual-count');
    if (countElement) {
        countElement.textContent = manualPlaceholdersToAdd.length;
    }
}


// FETCH TEMPLATE TEXT FRAGMENTS

async function fetchTemplateTextFragments() {
    if (!currentRefinementTemplate) return;
    
    try {
        const response = await fetch('https://n8n.lyroshq.com/webhook/quote-fetch-template-text', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
	    template_id: currentRefinementTemplate.template_id,
	    user_email: authenticatedUserEmail
	})
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
	templateTextFragments = data.text_fragments || [];
	console.log(`âœ… Loaded ${templateTextFragments.length} text fragments for auto-suggest`);
        } else {
	console.warn('Failed to load text fragments:', data);
	templateTextFragments = [];
        }
    } catch (error) {
        console.error('Error fetching text fragments:', error);
        templateTextFragments = [];
    }
}


// AUTO-SUGGEST FUNCTIONALITY

function initializeAutoSuggest() {
    const input = document.getElementById('manual-search-text');
    const suggestionsContainer = document.getElementById('autocomplete-suggestions');
    
    if (!input || !suggestionsContainer) return;
    
    let debounceTimer;
    
    // Input event - show suggestions
    input.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const query = this.value.trim();
        
        if (query.length < 2) {
	suggestionsContainer.classList.remove('active');
	suggestionsContainer.innerHTML = '';
	return;
        }
        
        debounceTimer = setTimeout(() => {
	showAutoSuggestions(query, suggestionsContainer);
        }, 200);
    });
    
    // Keyboard navigation
    input.addEventListener('keydown', function(e) {
        const suggestions = suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
        
        if (suggestions.length === 0) return;
        
        if (e.key === 'ArrowDown') {
	e.preventDefault();
	autocompleteHighlightIndex = Math.min(autocompleteHighlightIndex + 1, suggestions.length - 1);
	updateHighlight(suggestions);
        } else if (e.key === 'ArrowUp') {
	e.preventDefault();
	autocompleteHighlightIndex = Math.max(autocompleteHighlightIndex - 1, -1);
	updateHighlight(suggestions);
        } else if (e.key === 'Enter' && autocompleteHighlightIndex >= 0) {
	e.preventDefault();
	suggestions[autocompleteHighlightIndex].click();
        } else if (e.key === 'Escape') {
	suggestionsContainer.classList.remove('active');
	suggestionsContainer.innerHTML = '';
        }
    });
    
    // Click outside to close
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
	suggestionsContainer.classList.remove('active');
	suggestionsContainer.innerHTML = '';
        }
    });
}

function showAutoSuggestions(query, container) {
    autocompleteHighlightIndex = -1;
    
    const queryLower = query.toLowerCase();
    const matches = templateTextFragments.filter(text => 
        text.toLowerCase().includes(queryLower)
    );
    
    if (matches.length === 0) {
        container.innerHTML = '<div class="autocomplete-no-results">No matching text found</div>';
        container.classList.add('active');
        return;
    }
    
    // Limit to 8 suggestions
    const limitedMatches = matches.slice(0, 8);
    
    const html = limitedMatches.map(text => {
        // Highlight matching part
        const index = text.toLowerCase().indexOf(queryLower);
        const before = text.substring(0, index);
        const match = text.substring(index, index + query.length);
        const after = text.substring(index + query.length);
        
        return `
	<div class="autocomplete-suggestion" data-value="${escapeHtml(text)}">
	    ${escapeHtml(before)}<strong style="color: #10b981;">${escapeHtml(match)}</strong>${escapeHtml(after)}
	</div>
        `;
    }).join('');
    
    container.innerHTML = html;
    container.classList.add('active');
    
    // Add click handlers
    container.querySelectorAll('.autocomplete-suggestion').forEach(item => {
        item.addEventListener('click', function() {
	document.getElementById('manual-search-text').value = this.getAttribute('data-value');
	container.classList.remove('active');
	container.innerHTML = '';
        });
    });
}

function updateHighlight(suggestions) {
    suggestions.forEach((item, index) => {
        if (index === autocompleteHighlightIndex) {
	item.classList.add('highlighted');
	item.scrollIntoView({ block: 'nearest' });
        } else {
	item.classList.remove('highlighted');
        }
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function closeRefineModal() {
    document.getElementById('refine-modal').classList.remove('active');
    currentRefinementTemplate = null;
    currentPlaceholders = [];
    hideMessage('refine-feedback');
}

// ==========================================
// INLINE TEMPLATE RENAME FUNCTION
// ==========================================

async function saveTemplateNameChange() {
    const newName = document.getElementById('edit-template-name-input').value.trim();
    
    if (!newName) {
        showMessage('rename-inline-feedback', '⚠️ Please enter a template name', 'error');
        return;
    }
    
    if (!currentRefinementTemplate) {
        showMessage('rename-inline-feedback', '⚠️ No template selected', 'error');
        return;
    }
    
    const saveButton = document.querySelector('.btn-save-rename');
    const originalHTML = saveButton.innerHTML;
    
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner" style="width: 12px; height: 12px; border-width: 2px;"></span>';
    hideMessage('rename-inline-feedback');
    
    try {
        const response = await fetch('https://n8n.lyroshq.com/webhook/quote-rename-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: authenticatedUserEmail,
                template_id: currentRefinementTemplate.template_id,
                new_name: newName
            })
        });
        
        const result = await response.json();
        
    if (result.status === 'success') {
            // Update the current refinement template object
            currentRefinementTemplate.template_name = newName;
            
            // Reload templates in background
            loadUserTemplates();
            
            // Auto-hide success message after 2 seconds
            setTimeout(() => hideMessage('rename-inline-feedback'), 2000);
        } else {
            showMessage('rename-inline-feedback', `⚠️ ${result.message || 'Failed to rename template'}`, 'error');
        }
    } catch (error) {
        console.error('Rename Error:', error);
        showMessage('rename-inline-feedback', '⚠️ An error occurred during rename', 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = originalHTML;
    }
}

// TAB SWITCHING FUNCTION

async function switchRefineTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.refine-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to selected tab
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to selected content
    const selectedContent = document.getElementById(`${tabName}-tab`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // ðŸ†• FETCH TEXT FRAGMENTS when switching to manual tab
    if (tabName === 'manual-placeholders' && currentRefinementTemplate) {
        await fetchTemplateTextFragments();
    }
}


// DELETE MODAL

function openDeleteModal(templateId, templateName) {
    templateToDelete = { template_id: templateId, template_name: templateName };
    document.getElementById('delete-template-name').textContent = templateName;
    document.getElementById('delete-confirmation-input').value = '';
    document.getElementById('delete-modal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
    templateToDelete = null;
    document.getElementById('delete-confirmation-input').value = '';
}

async function confirmDeleteTemplate() {
    const confirmInput = document.getElementById('delete-confirmation-input');
    
    if (confirmInput.value !== 'DELETE') {
        confirmInput.style.borderColor = '#ef4444';
        confirmInput.focus();
        return;
    }
    
    const button = document.getElementById('confirm-delete-btn');
    const originalText = button.innerHTML;
    
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Deleting...';
    
    try {
        const response = await fetch('https://n8n.lyroshq.com/webhook/quote-delete-template', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
	    user_email: authenticatedUserEmail,
	    template_id: templateToDelete.template_id
	})
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
	closeDeleteModal();
	loadUserTemplates();
        } else {
	alert('Failed to delete template: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Delete Error:', error);
        alert('An error occurred while deleting the template');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// TEMPLATE REGISTRATION MODAL

function showRegisterForm() {
    document.getElementById('register-template-overlay').classList.add('active');
    hideMessage('register-feedback');
}

function hideRegisterForm() {
    document.getElementById('register-template-overlay').classList.remove('active');
    document.getElementById('template-registration-form').reset();
    document.getElementById('template-file-preview').innerHTML = '';
    
    // Reset upload zone to default state
    const uploadZone = document.getElementById('template-upload-zone');
    uploadZone.innerHTML = `
        <div class="icon">📄</div>
        <p style="font-weight: 600; margin-bottom: 4px;">Click to upload or drag and drop</p>
        <p>DOCX only, up to 10MB</p>
        <input type="file" name="template_file" id="template-file-input" accept=".docx" required>
    `;
        
    hideMessage('register-feedback');
}

// FILE UPLOAD HANDLERS
// Wait for DOM to load before attaching listeners

function initializeFileUploadListeners() {
    const quoteFileInput = document.getElementById('quote-file-input');
    const templateFileInput = document.getElementById('template-file-input');
    
    if (quoteFileInput) {
        quoteFileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                uploadedFiles = Array.from(e.target.files);
                renderFileList();
            }
        });
    }
    
    if (templateFileInput) {
        templateFileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                updateTemplateFilePreview(e.target.files[0]);
            }
        });
    }
}

// Call this after auth succeeds (when DOM is ready)

function renderFileList() {
    const fileListContainer = document.getElementById('quote-file-list');
    
    if (uploadedFiles.length === 0) {
        fileListContainer.innerHTML = '';
        return;
    }
    
    fileListContainer.innerHTML = uploadedFiles.map((file, index) => `
        <div class="file-item">
	<span class="file-name">${file.name}</span>
	<span class="file-size">${formatFileSize(file.size)}</span>
	<button type="button" class="btn-remove" onclick="removeFile(${index})">×</button>
        </div>
    `).join('');
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    renderFileList();
}

function updateTemplateFilePreview(file) {
    const uploadZone = document.getElementById('template-upload-zone');
    const previewContainer = document.getElementById('template-file-preview');
    
    // Show file INSIDE the upload zone with large checkmark
    uploadZone.innerHTML = `
        <div style="padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
	<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
	    <div style="font-size: 40px;">✅</div>
	    <div style="flex: 1;">
	        <p style="margin: 0; color: #10b981; font-weight: 600; font-size: 14px;">File Ready to Upload</p>
	        <p style="margin: 4px 0 0 0; color: #ddd; font-size: 12px;">${file.name}</p>
	        <p style="margin: 4px 0 0 0; color: #888; font-size: 11px;">${formatFileSize(file.size)}</p>
	    </div>
	</div>
	<button type="button" onclick="clearTemplateFile()" 
	        style="width: 100%; padding: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 6px; color: #ef4444; font-size: 12px; cursor: pointer; font-weight: 600;">
	    ✕ Remove File
	</button>
        </div>
        <input type="file" name="template_file" id="template-file-input" accept=".docx" required style="display: none;">
    `;
    
    // Store file reference
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    document.getElementById('template-file-input').files = dataTransfer.files;
    
    previewContainer.innerHTML = '';
}

function clearTemplateFile() {
    const uploadZone = document.getElementById('template-upload-zone');
    uploadZone.innerHTML = `
        <div class="icon">📄</div>
        <p style="font-weight: 600; margin-bottom: 4px;">Click to upload or drag and drop</p>
        <p>DOCX only, up to 10MB</p>
        <input type="file" name="template_file" id="template-file-input" accept=".docx" required>
    `;
}

// TEMPLATE REGISTRATION & FORM EVENT LISTENERS

function initializeFormEventListeners() {
    const templateForm = document.getElementById('template-registration-form');
    const quoteForm = document.getElementById('generate-quote-form');
    const voiceBtn = document.getElementById('voice-record-btn');
    
    if (templateForm) {
        templateForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const button = document.getElementById('register-template-btn');
            const originalText = button.innerHTML;
            
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> Registering...';
            hideMessage('register-feedback');
            
            try {
                const formData = new FormData();
                formData.append('user_email', authenticatedUserEmail);
                formData.append('template_name', document.querySelector('[name="template_name"]').value);
                formData.append('industry', document.querySelector('[name="industry"]').value);
                
                const templateFile = document.getElementById('template-file-input').files[0];
                if (templateFile) {
                    formData.append('template_file', templateFile);
                }
                
                const response = await fetch('https://n8n.lyroshq.com/webhook/quote-register-template', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    showMessage('register-feedback', 
                        '✅ Template registered successfully! Processing in background...', 
                        'success'
                    );
                    
                    setTimeout(() => {
                        hideRegisterForm();
                        loadUserTemplates();
                    }, 2000);
                } else {
                    showMessage('register-feedback', 
                        `⚠️ ${result.message || 'Registration failed'}`, 
                        'error'
                    );
                }
                
            } catch (error) {
                console.error('Registration Error:', error);
                showMessage('register-feedback', '⚠️ An error occurred during registration', 'error');
            } finally {
                button.disabled = false;
                button.innerHTML = originalText;
            }
        });
    }

// GENERATE QUOTE

if (quoteForm) {
        quoteForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const button = document.getElementById('generate-quote-btn');
    const templateSelector = document.getElementById('template-selector');
    const textInstructions = document.getElementById('text-instructions');
    
    if (!templateSelector.value) {
        showMessage('generate-feedback', '⚠️ Please select a template first', 'error');
        return;
    }
    
    if (uploadedFiles.length === 0) {
        showMessage('generate-feedback', '⚠️ Please upload at least one document', 'error');
        return;
    }
    
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Generating Quote...';
    hideMessage('generate-feedback');
    
    try {
        const formData = new FormData();
        formData.append('user_email', authenticatedUserEmail);
        formData.append('template_id', templateSelector.value);
        formData.append('text_instructions', textInstructions.value || '');
        
        uploadedFiles.forEach((file, index) => {
	formData.append(`input_file_${index}`, file);
        });
        
        const response = await fetch('https://n8n.lyroshq.com/webhook/quote-generate', {
	method: 'POST',
	body: formData
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
	const quoteDetails = result.quote_details || {};
	const placeholderSummary = result.placeholder_summary || {};
	
	const successHTML = `
	    <div style="text-align: center; padding: 24px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
	        <h2 style="color: #10b981; margin: 0 0 16px 0; font-size: 20px;">✅ Quote Generated Successfully!</h2>
	        <div style="display: grid; gap: 8px; text-align: left; max-width: 400px; margin: 16px auto;">
		<div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px;">
		    <span style="color: #888; font-size: 13px;">Quote ID:</span>
		    <span style="color: #fff; font-size: 11px; font-weight: 600; font-family: monospace;">${(result.correlation_id || 'N/A').substring(0, 24)}...</span>
		</div>
		<div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px;">
		    <span style="color: #888; font-size: 13px;">Client:</span>
		    <span style="color: #fff; font-size: 13px; font-weight: 600;">${placeholderSummary.client_name || 'Unknown'}</span>
		</div>
		<div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px;">
		    <span style="color: #888; font-size: 13px;">Template:</span>
		    <span style="color: #fff; font-size: 13px; font-weight: 600;">${quoteDetails.template_name || 'N/A'}</span>
		</div>
		<div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px;">
		    <span style="color: #888; font-size: 13px;">Coverage:</span>
		    <span style="color: #10b981; font-size: 13px; font-weight: 600;">${placeholderSummary.coverage_percent || 0}% (${placeholderSummary.filled || 0}/${placeholderSummary.total || 0} fields)</span>
		</div>
	        </div>
	        <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
		<a href="${quoteDetails.google_doc_url}" target="_blank" class="btn btn-primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
		    📄 Open Google Doc
		</a>
		<a href="${quoteDetails.docx_download_url}" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
		    ⬇️ Download DOCX
		</a>
	        </div>
	        <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid #10b981; text-align: left;">
		<p style="margin: 0; font-size: 12px; color: #ddd; line-height: 1.7;">
		    <strong style="color: #10b981;">Highlighting Guide:</strong><br>
		    🟢 Green = High confidence (80%+) - Ready to use<br>
		    🟡 Yellow = Medium confidence (50-79%) - Review recommended<br>
		    🔴 Red = Low confidence or missing - Manual input required
		</p>
	        </div>
	    </div>
	`;
	
	showMessage('generate-feedback', successHTML, 'success');
	
	e.target.reset();
	uploadedFiles = [];
	renderFileList();
	
        } else {
	showMessage('generate-feedback', `
	    <p style="margin: 0 0 12px 0; font-weight: 600;">An error occurred during quote generation.</p>
	    <p style="margin: 0 0 8px 0; font-size: 12px;">Our support team at <strong>support@lyros.com.au</strong> has been notified.</p>
	    <p style="margin: 0; font-size: 12px;">For immediate assistance, please call <strong>0466 562 403</strong></p>
	`, 'error');
        }
        
    } catch (error) {
        console.error('Quote Generation Error:', error);
        showMessage('generate-feedback', `
	<p style="margin: 0 0 12px 0; font-weight: 600;">An error occurred during quote generation.</p>
	<p style="margin: 0 0 8px 0; font-size: 12px;">Our support team at <strong>support@lyros.com.au</strong> has been notified.</p>
	<p style="margin: 0; font-size: 12px;">For immediate assistance, please call <strong>0466 562 403</strong></p>
        `, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
});
    }
    
    if (voiceBtn) {
        voiceBtn.addEventListener('click', function() {
            alert('🎤 Voice recording feature coming soon!');
        });
    }
}

// UTILITY FUNCTIONS

function showMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.innerHTML = message;
    el.className = `feedback-message ${type}`;
    el.style.display = 'block';
}

function hideMessage(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.display = 'none';
    }
}

function formatDate(dateString) {
    if (!dateString || dateString === 'Unknown') return 'Unknown';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
        return 'Unknown';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sendSupportTicket() {
    const subject = 'Quote Tool Support Request';
    const body = `Template Loading Error\n\nUser Email: ${authenticatedUserEmail}\nTimestamp: ${new Date().toISOString()}`;
    window.location.href = `mailto:support@lyros.com.au?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

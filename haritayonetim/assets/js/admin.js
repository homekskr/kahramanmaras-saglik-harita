// =====================================================
// ADMIN PANEL - MAIN JAVASCRIPT
// =====================================================

// Global state
let currentUser = null;
let userRole = null; // RBAC: User role and permissions
let facilities = [];
let filteredFacilities = [];
let editingFacilityId = null;
let locationPickerMap = null;
let locationMarker = null;
let adminMap = null;
let districts = [];
let facilityTypes = [];
let reports = [];
let filteredReports = [];
let currentStatusFilter = 'all';

// Tesis ikonunu getir (Özellikle hastaneler için 'Ⓗ' ikonunu zorunlu yap)
function getFacilityIcon(facility) {
    const typeName = (facility.facility_type_name || facility.type || '').trim().toUpperCase();
    if (typeName === 'HASTANE' || typeName === 'HASTANE EK BİNA') {
        return '<div class="hospital-sign">H</div>';
    }
    return facility.facility_type_icon || '📍';
}

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin panel initializing...');

    // Always setup event listeners first to ensure buttons work
    setupEventListeners();

    try {
        // Check if supabase is initialized
        if (!window.supabase) {
            console.error('Supabase client not found (window.supabase is undefined).');
            showLogin();
            return;
        }

        // Check if user is already logged in
        const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
            console.log('Active session found:', session.user.email);
            currentUser = session.user;
            await loadInitialData().catch(err => console.error('Initial data loading failed:', err));
            showDashboard();
        } else {
            console.log('No active session, showing login.');
            showLogin();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showLogin();
        // Even if session check fails, we already called setupEventListeners()
    }
});

/**
 * Modern Custom Confirm Dialog
 */
function showConfirm(title, message, type = 'primary') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const iconContainer = document.getElementById('confirmIcon');

        titleEl.textContent = title || 'Onay Gerekiyor';
        messageEl.textContent = message;

        // Reset and set button classes
        okBtn.className = 'btn ' + (type === 'danger' ? 'btn-danger' : 'btn-primary');
        iconContainer.style.background = type === 'danger' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(37, 99, 235, 0.1)';
        iconContainer.querySelector('svg').style.color = type === 'danger' ? 'var(--danger)' : 'var(--primary)';

        const handleConfirm = () => {
            modal.classList.remove('active');
            okBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.remove('active');
            okBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        okBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        modal.classList.add('active');
    });
}

// =====================================================
// AUTHENTICATION
// =====================================================

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Password visibility toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle icon
            const icon = togglePassword.querySelector('svg');
            if (type === 'text') {
                icon.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                `;
            } else {
                icon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                `;
            }
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Add facility button
    const addFacilityBtn = document.getElementById('addFacilityBtn');
    if (addFacilityBtn) {
        addFacilityBtn.addEventListener('click', () => openFacilityModal());
    }

    // Excel Export
    document.getElementById('exportExcelBtn')?.addEventListener('click', handleExcelExport);

    // Facility form
    const facilityForm = document.getElementById('facilityForm');
    if (facilityForm) {
        facilityForm.addEventListener('submit', handleSaveFacility);
    }

    // Modal close buttons
    document.getElementById('closeModal')?.addEventListener('click', closeFacilityModal);
    document.getElementById('cancelBtn')?.addEventListener('click', closeFacilityModal);
    document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);

    // Search and filter
    document.getElementById('searchInput')?.addEventListener('input', handleSearch);
    document.getElementById('typeFilter')?.addEventListener('change', handleFilter);
    document.getElementById('refreshBtn')?.addEventListener('click', loadFacilities);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    // Status filter tabs
    document.querySelectorAll('.status-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentStatusFilter = e.target.dataset.status;
            applyCurrentFilters();
        });
    });

    // Phone number formatting
    const phoneInput = document.getElementById('facilityPhone');
    if (phoneInput) {
        ['input', 'keyup', 'paste'].forEach(event => {
            phoneInput.addEventListener(event, formatPhoneNumber);
        });
    }

    // Social media URL formatting
    setupSocialMediaFormatting();

    // Geocoding button
    const geocodeBtn = document.getElementById('geocodeAddressBtn');
    if (geocodeBtn) {
        geocodeBtn.addEventListener('click', findAddressOnMap);
    }

    // Excel import
    document.getElementById('importExcelBtn')?.addEventListener('click', openImportModal);
    document.getElementById('closeImportModal')?.addEventListener('click', closeImportModal);
    document.getElementById('cancelImportBtn')?.addEventListener('click', closeImportModal);
    document.getElementById('downloadTemplateBtn')?.addEventListener('click', downloadTemplate);
    document.getElementById('selectFileBtn')?.addEventListener('click', () => {
        document.getElementById('excelFileInput').click();
    });
    document.getElementById('excelFileInput')?.addEventListener('change', handleFileSelect);
    document.getElementById('startImportBtn')?.addEventListener('click', startImport);

    // Drag and drop
    const uploadArea = document.getElementById('fileUploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleFileDrop);
        uploadArea.addEventListener('click', () => {
            document.getElementById('excelFileInput').click();
        });
    }

    // Report search
    document.getElementById('reportSearchInput')?.addEventListener('input', handleReportSearch);

    // Backup buttons
    document.getElementById('downloadDbBackupBtn')?.addEventListener('click', () => handleDatabaseBackup('json'));
    document.getElementById('downloadSqlBackupBtn')?.addEventListener('click', () => handleDatabaseBackup('sql'));
    document.getElementById('downloadFilesBackupBtn')?.addEventListener('click', handleFilesBackup);

    // Individual table SQL backups
    document.querySelectorAll('.table-backup-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tableName = e.currentTarget.dataset.table;
            handleDatabaseBackup('sql', tableName);
        });
    });
}

// Phone number formatter
function formatPhoneNumber(e) {
    const input = e.target || e;
    const originalValue = input.value;
    let value = originalValue.replace(/\D/g, ''); // Remove non-digits

    // Limit to 11 digits
    if (value.length > 11) {
        value = value.slice(0, 11);
    }

    // Format: 0 XXX XXX XX XX
    let formatted = '';
    if (value.length > 0) {
        formatted = value[0]; // First digit (must be 0)
        if (value.length > 1) {
            formatted += ' ' + value.slice(1, 4); // Area code
        }
        if (value.length > 4) {
            formatted += ' ' + value.slice(4, 7); // First part
        }
        if (value.length > 7) {
            formatted += ' ' + value.slice(7, 9); // Second part
        }
        if (value.length > 9) {
            formatted += ' ' + value.slice(9, 11); // Third part
        }
    }

    // Only update if value changed to avoid cursor issues
    if (input.value !== formatted) {
        input.value = formatted;
    }
}

// =====================================================
// SOCIAL MEDIA URL FORMATTING
// =====================================================

// Setup social media input formatting
function setupSocialMediaFormatting() {
    const socialMediaInputs = {
        facilityFacebook: 'https://facebook.com/',
        facilityInstagram: 'https://instagram.com/',
        facilityTwitter: 'https://x.com/',
        facilityNsosyal: 'https://nsosyal.com/profil/'
    };

    Object.keys(socialMediaInputs).forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            // Don't format on input, only on blur to avoid interfering with typing
            input.addEventListener('blur', function () {
                formatSocialMediaInput(this, socialMediaInputs[inputId]);
            });
        }
    });
}

// Format social media input to full URL
function formatSocialMediaInput(input, baseUrl) {
    let value = input.value.trim();

    if (!value) return; // Don't format empty values

    // If it already looks like a URL, leave it as is
    if (value.startsWith('http://') || value.startsWith('https://')) {
        return;
    }

    // Remove @ symbol if user added it
    value = value.replace(/^@/, '');

    // Add the base URL
    input.value = baseUrl + value;
}

// Extract username from social media URL for display
function extractSocialMediaUsername(url, baseUrl) {
    if (!url) return '';

    // If it's already just a username, return it
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return url;
    }

    // Extract username from URL
    try {
        // Remove trailing slash
        url = url.replace(/\/$/, '');

        // Get the last part of the URL
        const parts = url.split('/');
        return parts[parts.length - 1];
    } catch (e) {
        return url;
    }
}


async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display = 'none';
    submitBtn.querySelector('.btn-loader').style.display = 'inline-flex';
    errorDiv.style.display = 'none';

    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        currentUser = data.user;
        await loadInitialData();
        showDashboard();

    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
        errorDiv.style.display = 'block';

        // Reset button state
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'inline';
        submitBtn.querySelector('.btn-loader').style.display = 'none';
    }
}

async function handleLogout() {
    console.log('Logout button clicked');
    try {
        await window.supabase.auth.signOut();
        currentUser = null;
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Çıkış yapılırken bir hata oluştu', 'error');
    }
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';

    // Reset login button state
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
    }

    // Clear previous errors
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';

    // Update user info
    if (currentUser) {
        document.getElementById('userEmail').textContent = currentUser.email;
    }

    // Load user role and permissions (RBAC)
    loadUserRole();

    // Load facilities
    loadFacilities();
}

// RBAC: Load user role and permissions
async function loadUserRole() {
    try {
        const roleData = await window.db.getUserRole();
        if (roleData.success) {
            userRole = roleData;
            console.log('User role loaded:', userRole);

            // Update UI based on role
            updateUIForRole();
        }
    } catch (error) {
        console.error('Error loading user role:', error);
        userRole = { role: null, allowedFacilityTypes: [] };
    }
}

// RBAC: Update UI elements based on user role
function updateUIForRole() {
    if (!userRole || !userRole.role) return;

    // If facility_manager
    if (userRole.role === 'facility_manager') {
        // 1. Hide non-relevant menu items
        // We only want to show 'Tesisler' (facilities)
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const section = item.getAttribute('data-section');
            if (section && section !== 'facilities') {
                item.style.display = 'none';
            }
        });

        // 2. Hide specific action buttons
        const restrictedButtons = [
            'exportExcelBtn',
            'importExcelBtn',
            'addFacilityBtn'
        ];

        restrictedButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.style.display = 'none';
        });

        // 3. Hide specific buttons/features if strictly limited types
        if (userRole.allowedFacilityTypes.length > 0) {
            const typeSelect = document.getElementById('filterType');
            if (typeSelect) {
                // Filter options to show only allowed types
                const options = Array.from(typeSelect.options);
                options.forEach(option => {
                    if (option.value && !userRole.allowedFacilityTypes.includes(parseInt(option.value))) {
                        option.style.display = 'none';
                    }
                });
            }
        }
    }
}

async function loadInitialData() {
    try {
        // Load both in parallel for better performance
        const [districtsResult, typesResult] = await Promise.all([
            window.db.getDistricts(),
            window.db.getFacilityTypes()
        ]);

        if (districtsResult.success) {
            districts = districtsResult.data;
            populateDistrictOptions();
        }

        if (typesResult.success) {
            facilityTypes = typesResult.data;
            populateTypeOptions();
        }
    } catch (error) {
        console.error('Error in loadInitialData:', error);
    }
}

function populateDistrictOptions() {
    const select = document.getElementById('facilityDistrict');
    if (!select) return;

    select.innerHTML = '<option value="">SEÇİNİZ</option>';
    districts.forEach(d => {
        const option = document.createElement('option');
        option.value = d.id;
        option.textContent = d.name;
        select.appendChild(option);
    });
}

function populateTypeOptions() {
    const select = document.getElementById('facilityType');
    const filterSelect = document.getElementById('typeFilter');

    if (select) {
        select.innerHTML = '<option value="">SEÇİNİZ</option>';
        facilityTypes.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            const iconLabel = (t.name.toUpperCase() === 'HASTANE' || t.name.toUpperCase() === 'HASTANE EK BİNA') ? 'Ⓗ' : (t.icon || '📍');
            option.textContent = `${iconLabel} ${t.name}`;
            select.appendChild(option);
        });
    }

    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">TÜM TÜRLER</option>';
        facilityTypes.forEach(t => {
            const option = document.createElement('option');
            option.value = t.name; // Keep name for filtering since we filter the local array
            const iconLabel = (t.name.toUpperCase() === 'HASTANE' || t.name.toUpperCase() === 'HASTANE EK BİNA') ? 'Ⓗ' : (t.icon || '📍');
            option.textContent = `${iconLabel} ${t.name}`;
            filterSelect.appendChild(option);
        });
    }
}

// =====================================================
// NAVIGATION
// =====================================================

function handleNavigation(e) {
    e.preventDefault();

    const section = e.currentTarget.dataset.section;
    console.log('Navigation clicked:', section);

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');

    // Hide all sections first
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.style.display = 'none';
    });

    // Show appropriate section
    if (section === 'facilities') {
        document.getElementById('facilitiesSection').style.display = 'block';
        document.getElementById('pageTitle').textContent = 'Tesis Yönetimi';
        document.getElementById('pageSubtitle').textContent = 'Sağlık tesislerini ekleyin, düzenleyin veya silin';
        document.getElementById('addFacilityBtn').style.display = 'flex';
        document.getElementById('importExcelBtn').style.display = 'flex';
    } else if (section === 'reports') {
        document.getElementById('reportsSection').style.display = 'block';
        document.getElementById('pageTitle').textContent = 'Hata Bildirimleri';
        document.getElementById('pageSubtitle').textContent = 'Ziyaretçilerden gelen hata bildirimlerini yönetin';
        document.getElementById('addFacilityBtn').style.display = 'none';
        document.getElementById('importExcelBtn').style.display = 'none';
        loadReports();
    } else if (section === 'backup') {
        document.getElementById('backupSection').style.display = 'block';
        document.getElementById('pageTitle').textContent = 'Sistem Yedeği';
        document.getElementById('pageSubtitle').textContent = 'Veritabanı ve dosya yedeği oluşturun';
        document.getElementById('addFacilityBtn').style.display = 'none';
        document.getElementById('importExcelBtn').style.display = 'none';
    }
}

// =====================================================
// FACILITY MANAGEMENT
// =====================================================

async function loadFacilities() {
    try {
        const result = await window.db.getFacilities();

        if (!result.success) throw new Error(result.error);

        let allFacilities = result.data || [];

        // RBAC: Filter facilities based on user role
        if (userRole && userRole.role === 'facility_manager' && userRole.allowedFacilityTypes.length > 0) {
            allFacilities = allFacilities.filter(f =>
                userRole.allowedFacilityTypes.includes(f.facility_type_id)
            );
        }

        facilities = allFacilities;
        // Apply current filters instead of resetting them
        applyCurrentFilters();

    } catch (error) {
        console.error('Error loading facilities:', error);
        showToast('Tesisler yüklenirken bir hata oluştu', 'error');
    }
}

function renderFacilitiesTable() {
    const tbody = document.getElementById('facilitiesTableBody');

    if (filteredFacilities.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="7">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p>Filtrelere uygun tesis bulunamadı</p>
                </td>
            </tr>
        `;
        return;
    }

    // Check if user has permission to change status
    const canChangeStatus = !userRole || userRole.role !== 'facility_manager';
    const isFacilityManager = userRole && userRole.role === 'facility_manager';

    tbody.innerHTML = filteredFacilities.map(facility => {
        // Simplified view for Facility Manager
        if (isFacilityManager) {
            return `
            <tr class="facility-card-simple" style="padding: 12px 16px !important; min-height: auto !important;">
                <td style="display: flex; justify-content: space-between; align-items: center; width: 100%; border: none !important; padding: 0 !important;">
                    <div style="text-align: left; font-weight: 600; font-size: 14px; color: #1e293b; padding-right: 12px; line-height: 1.4;">
                        ${window.utils.escapeHTML(facility.name)}
                    </div>
                    <button class="btn btn-primary btn-sm btn-icon" onclick="editFacility('${facility.id}')" title="Düzenle" style="width: 40px; height: 40px; min-width: 40px; flex-shrink: 0; border-radius: 8px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 20px; height: 20px;">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                </td>
                <!-- Hide other columns -->
                <td style="display:none;"></td>
                <td style="display:none;"></td>
                <td style="display:none;"></td>
                <td style="display:none;"></td>
                <td style="display:none;"></td>
                <td style="display:none;"></td>
            </tr>
            `;
        }

        // Standard view for Admin
        return `
        <tr class="${facility.is_active ? 'status-active' : 'status-passive'}">
            <td><strong>${window.utils.escapeHTML(facility.name)}</strong></td>
            <td>${window.utils.escapeHTML(facility.kurum_kodu) || '-'}</td>
            <td><span style="display:flex; align-items:center; gap:8px;">${getFacilityIcon(facility)} ${window.utils.escapeHTML(facility.facility_type_name || facility.type) || '-'}</span></td>
            <td>${window.utils.escapeHTML(facility.district_name || facility.district) || '-'}</td>
            <td>
                <div style="display:flex; gap:8px;">
                    ${facility.website ? `<a href="${facility.website}" target="_blank" class="btn btn-ghost btn-icon btn-sm" title="Web Sitesi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></a>` : ''}
                    ${facility.email ? `<a href="mailto:${facility.email}" class="btn btn-ghost btn-icon btn-sm" title="${facility.email}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></a>` : ''}
                    ${facility.phone ? `<span class="btn btn-ghost btn-icon btn-sm" title="${facility.phone}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>` : ''}
                </div>
            </td>
            <td>
                <span class="status-badge ${facility.is_active ? 'active' : 'passive'}">
                    ${facility.is_active ? 'Aktif' : 'Pasif'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-ghost btn-icon" onclick="editFacility('${facility.id}')" title="Düzenle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                    ${canChangeStatus ? `
                    <label class="switch" title="${facility.is_active ? 'Pasif Yap' : 'Aktif Yap'}">
                        <input type="checkbox" ${facility.is_active ? 'checked' : ''} onchange="toggleFacilityStatus('${facility.id}', this.checked)">
                        <span class="slider"></span>
                    </label>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

function applyCurrentFilters() {
    const queryInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');

    const query = queryInput ? queryInput.value.toLocaleLowerCase('tr-TR') : '';
    const type = typeFilter ? typeFilter.value.trim().toLocaleUpperCase('tr-TR') : '';

    filteredFacilities = facilities.filter(facility => {
        // 1. Check Smart Search Query (Cross-field search)
        const name = (facility.name || '').toLocaleLowerCase('tr-TR');
        const code = (facility.kurum_kodu || '').toLocaleLowerCase('tr-TR');
        const district = (facility.district_name || facility.district || '').toLocaleLowerCase('tr-TR');
        const address = (facility.address || '').toLocaleLowerCase('tr-TR');
        const phone = (facility.phone || '').toLocaleLowerCase('tr-TR');
        const fType = (facility.facility_type_name || facility.type || '').toLocaleLowerCase('tr-TR');

        const searchPool = `${name} ${code} ${district} ${address} ${phone} ${fType}`;
        const matchesSearch = query === '' || searchPool.includes(query);

        // 2. Check Type Filter
        const facilityType = (facility.facility_type_name || facility.type || '').trim().toLocaleUpperCase('tr-TR');
        const matchesType = type === '' || facilityType === type;

        // 3. Check Status Filter
        let matchesStatus = true;
        if (currentStatusFilter === 'active') {
            matchesStatus = facility.is_active === true;
        } else if (currentStatusFilter === 'passive') {
            matchesStatus = facility.is_active === false;
        }

        return matchesSearch && matchesType && matchesStatus;
    });

    renderFacilitiesTable();
}

function handleSearch(e) {
    applyCurrentFilters();
}

function handleFilter(e) {
    applyCurrentFilters();
}

// =====================================================
// FACILITY MODAL
// =====================================================

function openFacilityModal(facility = null) {
    console.log('Opening facility modal', facility ? 'Edit mode' : 'Add mode');
    const modal = document.getElementById('facilityModal');
    const form = document.getElementById('facilityForm');
    const title = document.getElementById('modalTitle');

    editingFacilityId = facility ? facility.id : null;

    // Check for facility manager restrictions
    const isFacilityManager = userRole && userRole.role === 'facility_manager';

    if (facility) {
        // Edit mode
        title.textContent = 'Tesisi Düzenle';
        document.getElementById('facilityId').value = facility.id;
        document.getElementById('facilityName').value = facility.name;
        document.getElementById('facilityKurumKodu').value = facility.kurum_kodu || '';
        document.getElementById('facilityType').value = facility.facility_type_id || facility.type || '';
        document.getElementById('facilityDistrict').value = facility.district_id || facility.district || '';
        document.getElementById('facilityPhone').value = facility.phone || '';
        document.getElementById('facilityWebsite').value = facility.website || '';
        document.getElementById('facilityEmail').value = facility.email || '';

        // Extract usernames from social media URLs for display
        document.getElementById('facilityFacebook').value = extractSocialMediaUsername(facility.facebook, 'https://facebook.com/');
        document.getElementById('facilityInstagram').value = extractSocialMediaUsername(facility.instagram, 'https://instagram.com/');
        document.getElementById('facilityTwitter').value = extractSocialMediaUsername(facility.twitter, 'https://x.com/');
        document.getElementById('facilityNsosyal').value = extractSocialMediaUsername(facility.nsosyal, 'https://nsosyal.com/profil/');

        document.getElementById('facilityAddress').value = facility.address || '';

        // Trigger phone formatting
        const phoneInput = document.getElementById('facilityPhone');
        if (phoneInput && phoneInput.value) {
            formatPhoneNumber(phoneInput);
        }
        document.getElementById('facilityLat').value = facility.latitude;
        document.getElementById('facilityLng').value = facility.longitude;

        // Handle Photos
        for (let i = 1; i <= 3; i++) {
            const url = facility[`image_${i}`] || '';
            const pendingUrl = facility[`pending_image_${i}`] || '';
            const input = document.getElementById(`facilityImage${i}`);
            const preview = document.querySelector(`.photo-preview[data-slot="${i}"]`);

            // Default: Show active image
            let displayUrl = url;
            let hasPending = !!pendingUrl;

            // Set input value to current URL (so if saved without changes, it stays)
            // If manager has pending, should we put pending URL in input? 
            // If we do, saveFacility logic (newVal !== currentVal) needs to be careful.
            // Let's keep input as active URL, but visual preview shows pending if enabled?
            // User request: "normal admin kullanıcılar tarafından onaylandıktan sonra ön yüzde".
            // So Manager should likely see what they uploaded (pending).

            if (isFacilityManager) {
                if (hasPending) {
                    displayUrl = pendingUrl;
                    // Update input so they see it as "current" state in form
                    input.value = pendingUrl;
                } else {
                    input.value = url;
                }
            } else {
                // Admin sees active image by default in input, but we'll show pending UI
                input.value = url;
            }

            if (preview) {
                // clear previous content (badges etc)
                // PRESERVE THE DELETE BUTTON if it exists, otherwise create it
                // We create it fresh every time to ensure event listeners are clean
                preview.innerHTML = '';

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button'; // Prevent form submission
                deleteBtn.className = 'photo-delete-btn';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.title = 'Fotoğrafı Sil';

                // Use a closure or arrow function to ensure 'i' is correct
                deleteBtn.onclick = function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePhotoDelete(i);
                };

                preview.appendChild(deleteBtn);

                if (displayUrl) {
                    preview.style.backgroundImage = `url(${displayUrl})`;
                    preview.classList.add('has-image');
                } else {
                    preview.style.backgroundImage = 'none';
                    preview.classList.remove('has-image');
                }

                // UI Overlay for Pending Status (Manager) or Approval (Admin)
                if (hasPending) {
                    if (isFacilityManager) {
                        const badge = document.createElement('div');
                        badge.className = 'pending-badge';
                        badge.textContent = 'Onay Bekliyor';
                        badge.style.cssText = 'position: absolute; bottom: 0; left: 0; right: 0; background: orange; color: white; font-size: 10px; padding: 2px; text-align: center;';
                        preview.appendChild(badge);
                    } else {
                        // Admin Controls
                        const adminControls = document.createElement('div');
                        adminControls.className = 'admin-photo-controls';
                        adminControls.style.cssText = 'position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 4px; display: flex; justify-content: space-around;';
                        adminControls.innerHTML = `
                            <button type="button" onclick="approvePhoto('${facility.id}', ${i})" style="font-size:10px; background:#10b981; color:white; border:none; border-radius:4px; padding:2px 6px; cursor:pointer;">Onayla</button>
                            <button type="button" onclick="rejectPhoto('${facility.id}', ${i})" style="font-size:10px; background:#ef4444; color:white; border:none; border-radius:4px; padding:2px 6px; cursor:pointer;">Reddet</button>
                            <button type="button" onclick="viewPendingPhoto('${pendingUrl}')" style="font-size:10px; background:#3b82f6; color:white; border:none; border-radius:4px; padding:2px 6px; cursor:pointer;">Gör</button>
                         `;
                        preview.appendChild(adminControls);

                        // Valid indication that this slot has pending content differs from active
                        preview.style.border = '2px dashed orange';
                    }
                } else {
                    preview.style.border = 'none';
                }
            }
        }

        // Apply restrictions for Facility Managers
        if (isFacilityManager) {
            // Hide all form rows except those containing photos or basic info we want to show/hide
            const formRows = document.querySelectorAll('.modal-body .form-row:not(:last-child)'); // Exclude photos row if it's last
            // Actually, let's target specific elements or groups.
            // A safer approach: Hide everything first, then show what's allowed.
            // Or iterate through inputs and disable them? User asked to "only see name and photos".

            // Disable Name
            document.getElementById('facilityName').disabled = true;

            // Hide other inputs by hiding their parent form-groups or rows
            // We'll iterate all .form-group elements
            const groups = document.querySelectorAll('.modal-body .form-group');
            groups.forEach(group => {
                const label = group.querySelector('label');
                if (!label) return;

                const labelText = label.textContent.trim();
                // Show Name and Photos. Hide others.
                if (labelText.includes('Tesis Adı') || labelText.includes('Tesis Fotoğrafları')) {
                    group.style.display = 'block';
                } else {
                    group.style.display = 'none';
                }
            });

            // Hide location map explicitly if not caught above
            const mapGroup = document.querySelector('.location-picker').closest('.form-group');
            if (mapGroup) mapGroup.style.display = 'none';

        } else {
            // Reset visibility if admin
            const groups = document.querySelectorAll('.modal-body .form-group');
            groups.forEach(group => group.style.display = 'block');
            document.getElementById('facilityName').disabled = false;
        }

    } else {
        // Add mode
        // If facility manager tried to open add mode (though button is hidden), prevent or reset
        if (isFacilityManager) {
            showToast('Yeni tesis ekleme yetkiniz yok.', 'error');
            return;
        }

        title.textContent = 'Yeni Tesis Ekle';
        form.reset();

        // Reset Admin visibility
        const groups = document.querySelectorAll('.modal-body .form-group');
        groups.forEach(group => group.style.display = 'block');
        document.getElementById('facilityName').disabled = false;

        // Clear previews
        document.querySelectorAll('.photo-preview').forEach(p => {
            p.style.backgroundImage = 'none';
            p.classList.remove('has-image');
        });
        // Clear hidden inputs
        for (let i = 1; i <= 3; i++) {
            document.getElementById(`facilityImage${i}`).value = '';
        }
        // Leave coordinates empty - will be filled by geocoding or map click
        document.getElementById('facilityLat').value = '';
        document.getElementById('facilityLng').value = '';
    }

    modal.classList.add('active');

    // Initialize location picker map
    setTimeout(() => {
        initLocationPicker();
        // Setup coordinate input listeners after map is initialized
        setupCoordinateInputListeners();
    }, 100);
}

function closeFacilityModal() {
    const modal = document.getElementById('facilityModal');
    modal.classList.remove('active');

    // Destroy location picker map
    if (locationPickerMap) {
        locationPickerMap.remove();
        locationPickerMap = null;
        locationMarker = null;
    }
}

function editFacility(id) {
    const facility = facilities.find(f => f.id == id);
    if (facility) {
        openFacilityModal(facility);
    }
}

// Geocode address to get coordinates
async function geocodeAddress(address, district) {
    try {
        const query = `${address}, ${district}, Kahramanmaraş, Turkey`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Kahramanmaras-Health-Facilities-Map'
            }
        });
        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}


// Manual geocoding triggered by button
async function findAddressOnMap() {
    const address = document.getElementById('facilityAddress').value.trim();
    const district = document.getElementById('facilityDistrict').value;

    if (!address) {
        showToast('Lütfen önce adres bilgisini girin', 'error');
        return;
    }

    if (!district) {
        showToast('Lütfen önce ilçe seçin', 'error');
        return;
    }

    await performGeocoding(address, district, true);
}

// Common geocoding logic
async function performGeocoding(address, district, showLoadingToast = true) {
    const geocodeBtn = document.getElementById('geocodeAddressBtn');

    // Show loading state
    if (geocodeBtn) {
        geocodeBtn.disabled = true;
        geocodeBtn.innerHTML = `
            <svg class="spinner" viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none" />
            </svg>
            Aranıyor...
        `;
    }

    if (showLoadingToast) {
        showToast('Adres konumu aranıyor...', 'info');
    }

    try {
        const coords = await geocodeAddress(address, district);

        if (coords) {
            // Update coordinate inputs
            document.getElementById('facilityLat').value = coords.lat.toFixed(6);
            document.getElementById('facilityLng').value = coords.lng.toFixed(6);

            // Update map marker and view
            if (locationMarker && locationPickerMap) {
                locationMarker.setLatLng([coords.lat, coords.lng]);
                locationPickerMap.setView([coords.lat, coords.lng], 15);
            }

            showToast('Konum başarıyla bulundu! 📍', 'success');
        } else {
            showToast('Adres konumu bulunamadı. Lütfen haritadan manuel seçin.', 'error');
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        showToast('Konum aranırken bir hata oluştu', 'error');
    } finally {
        // Reset button state
        if (geocodeBtn) {
            geocodeBtn.disabled = false;
            geocodeBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 16px; height: 16px;">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                </svg>
                Adresi Haritada Bul
            `;
        }
    }
}

async function handleSaveFacility(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('saveBtn');
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display = 'none';
    submitBtn.querySelector('.btn-loader').style.display = 'inline-flex';

    try {
        let lat = parseFloat(document.getElementById('facilityLat').value);
        let lng = parseFloat(document.getElementById('facilityLng').value);
        const address = document.getElementById('facilityAddress').value;
        const district = document.getElementById('facilityDistrict').value;

        // Removed automatic geocoding - user must use the button or select from map

        // Final validation - check if we have valid coordinates
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            showToast('Lütfen haritadan bir konum seçin veya koordinatları girin', 'error');
            throw new Error('Koordinatlar eksik');
        }

        // Format social media inputs before saving
        const facebookInput = document.getElementById('facilityFacebook');
        const instagramInput = document.getElementById('facilityInstagram');
        const twitterInput = document.getElementById('facilityTwitter');
        const nsosyalInput = document.getElementById('facilityNsosyal');

        formatSocialMediaInput(facebookInput, 'https://facebook.com/');
        formatSocialMediaInput(instagramInput, 'https://instagram.com/');
        formatSocialMediaInput(twitterInput, 'https://x.com/');
        formatSocialMediaInput(nsosyalInput, 'https://nsosyal.com/profil/');

        const currentFacility = facilities.find(f => f.id == editingFacilityId) || {};

        // Prepare base form data
        const formData = {
            name: document.getElementById('facilityName').value,
            kurum_kodu: document.getElementById('facilityKurumKodu').value || null,
            facility_type_id: document.getElementById('facilityType').value,
            district_id: document.getElementById('facilityDistrict').value,
            phone: document.getElementById('facilityPhone').value,
            website: document.getElementById('facilityWebsite').value,
            email: document.getElementById('facilityEmail').value,
            facebook: facebookInput.value || null,
            instagram: instagramInput.value || null,
            twitter: twitterInput.value || null,
            nsosyal: nsosyalInput.value || null,
            address: address,
            latitude: lat,
            longitude: lng
            // Images will be handled below based on role
        };

        const isFacilityManager = userRole && userRole.role === 'facility_manager';

        // Handle Images Logic
        for (let i = 1; i <= 3; i++) {
            const newVal = document.getElementById(`facilityImage${i}`).value || null;
            const key = `image_${i}`;
            const pendingKey = `pending_image_${i}`;
            const currentVal = currentFacility[key] || null;

            if (isFacilityManager) {
                // Facility Manager Logic
                if (newVal === null) {
                    // Deletion: Apply immediately
                    formData[key] = null;
                    // Also clear any pending
                    formData[pendingKey] = null;
                } else if (newVal !== currentVal) {
                    // Change/Addition: Send to pending
                    formData[pendingKey] = newVal;
                    // Do NOT update main image key (keep current or null)
                    // But we must NOT send the key if we don't want to change it.
                    // However, typical update replaces all fields.
                    // We must ensure we don't overwrite the existing image with null or new value in the main column.
                    // So we effectively exclude 'image_i' from formData, OR set it to currentVal.
                    // Setting to currentVal is safer to respect "no change".
                    formData[key] = currentVal;

                    showToast(`Fotoğraf ${i} onaya gönderildi.`, 'info');
                } else {
                    // No change
                    formData[key] = currentVal;
                }
            } else {
                // Admin Logic: Apply directly
                formData[key] = newVal;
                // If Admin manually updates, clear pending for this slot to avoid confusion
                formData[pendingKey] = null;
            }
        }

        let result;
        if (editingFacilityId) {
            // Update existing facility
            result = await window.db.updateFacility(editingFacilityId, formData);
            showToast('Tesis başarıyla güncellendi', 'success');
        } else {
            // Create new facility
            result = await window.db.createFacility(formData);
            showToast('Tesis başarıyla eklendi', 'success');
        }

        if (!result.success) throw new Error(result.error);

        closeFacilityModal();
        loadFacilities();

    } catch (error) {
        console.error('Error saving facility:', error);

        // Check if error is due to duplicate kurum_kodu
        if (error.message && error.message.includes('kurum_kodu')) {
            showToast('Bu kurum kodu zaten kullanılıyor. Lütfen farklı bir kod girin.', 'error');
        } else {
            showToast('Tesis kaydedilirken bir hata oluştu: ' + error.message, 'error');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'inline';
        submitBtn.querySelector('.btn-loader').style.display = 'none';
    }
}

// =====================================================
// DELETE FACILITY
// =====================================================

async function confirmDeleteFacility(id, name) {
    const confirmed = await showConfirm('Tesisi Sil', `${name} tesisini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`, 'danger');
    if (confirmed) {
        deleteFacility(id);
    }
}

function closeDeleteModal() {
    // This function is now deprecated as we use showConfirm
}

async function deleteFacility(id) {
    try {
        const result = await window.db.deleteFacility(id);

        if (!result.success) throw new Error(result.error);

        showToast('Tesis başarıyla silindi', 'success');
        loadFacilities();

    } catch (error) {
        console.error('Error deleting facility:', error);
        showToast('Tesis silinirken bir hata oluştu', 'error');
    }
}

// =====================================================
// LOCATION PICKER
// =====================================================

function initLocationPicker() {
    if (locationPickerMap) {
        locationPickerMap.remove();
    }

    let lat = parseFloat(document.getElementById('facilityLat').value);
    let lng = parseFloat(document.getElementById('facilityLng').value);

    // Default to Kahramanmaraş center if no coordinates
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        lat = 37.5847;
        lng = 36.9228;
    }

    locationPickerMap = L.map('locationMap').setView([lat, lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(locationPickerMap);

    // Add marker
    locationMarker = L.marker([lat, lng], {
        draggable: true
    }).addTo(locationPickerMap);

    // Update coordinates on marker drag
    locationMarker.on('dragend', function (e) {
        const position = e.target.getLatLng();
        updateCoordinates(position.lat, position.lng);
    });

    // Update coordinates on map click
    locationPickerMap.on('click', function (e) {
        const { lat, lng } = e.latlng;
        locationMarker.setLatLng([lat, lng]);
        updateCoordinates(lat, lng);
    });
}

function updateCoordinates(lat, lng) {
    document.getElementById('facilityLat').value = lat.toFixed(6);
    document.getElementById('facilityLng').value = lng.toFixed(6);
}

// Setup listeners for manual coordinate input
function setupCoordinateInputListeners() {
    const latInput = document.getElementById('facilityLat');
    const lngInput = document.getElementById('facilityLng');

    // Debounce function to avoid too many updates
    let coordinateUpdateTimeout;

    const handleCoordinateChange = () => {
        clearTimeout(coordinateUpdateTimeout);
        coordinateUpdateTimeout = setTimeout(() => {
            const lat = parseFloat(latInput.value);
            const lng = parseFloat(lngInput.value);

            // Only update if both values are valid numbers
            if (!isNaN(lat) && !isNaN(lng) && lat && lng) {
                if (locationPickerMap && locationMarker) {
                    locationMarker.setLatLng([lat, lng]);
                    locationPickerMap.setView([lat, lng], 15);
                }
            }
        }, 500); // Wait 500ms after user stops typing
    };

    latInput.addEventListener('input', handleCoordinateChange);
    lngInput.addEventListener('input', handleCoordinateChange);
}

// =====================================================
// ADMIN MAP
// =====================================================

function initAdminMap() {
    adminMap = L.map('adminMap').setView([37.5847, 36.9228], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(adminMap);

    // Add markers for all facilities
    facilities.forEach(facility => {
        const iconChar = getFacilityIcon(facility);
        const icon = L.divIcon({
            html: `<div class="custom-marker" style="font-size: 1.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${iconChar}</div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        const marker = L.marker([facility.latitude, facility.longitude], { icon })
            .addTo(adminMap);

        marker.bindPopup(`
            <div style="padding: 5px;">
                <strong style="font-size: 1.1rem; color: var(--primary);">${facility.name}</strong><br>
                <span style="display: flex; align-items: center; gap: 5px; margin: 5px 0;">
                    ${iconChar} ${facility.facility_type_name || facility.type || '-'}
                </span>
                <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">${facility.address || '-'}</p>
            </div>
        `);
    });
}

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// =====================================================
// EXCEL IMPORT
// =====================================================

let selectedFile = null;

function openImportModal() {
    const modal = document.getElementById('importModal');
    modal.classList.add('active');
    resetImportModal();
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    modal.classList.remove('active');
    resetImportModal();
}

function resetImportModal() {
    selectedFile = null;
    document.getElementById('selectedFileName').textContent = '';
    document.getElementById('startImportBtn').disabled = true;
    document.getElementById('importProgress').style.display = 'none';
    document.getElementById('importResults').style.display = 'none';
    document.getElementById('excelFileInput').value = '';
}

function downloadTemplate() {
    // Create Excel workbook with SheetJS
    const wb = XLSX.utils.book_new();

    // Define template data with headers and example rows
    const templateData = [
        ['Tesis Adı', 'Kurum Kodu', 'Tür', 'İlçe', 'Adres', 'Telefon', 'E-posta', 'Web Sitesi', 'Facebook', 'Instagram', 'Twitter', 'NSosyal', 'Enlem', 'Boylam', 'Görsel URL'],
        ['Dulkadiroğlu İlçe Sağlık Müdürlüğü', 'KM-001', 'İlçe Sağlık Müdürlüğü', 'Dulkadiroğlu', 'Yavuz Selim Mah. Hacı Bektaşı Veli Caddesi No 4/A', '0 344 123 45 67', 'info@saglik.gov.tr', 'https://kahramanmaras.saglik.gov.tr', 'https://facebook.com/ksmsaglik', 'https://instagram.com/ksmsaglik', 'https://x.com/ksmsaglik', 'https://nsosyal.com/ksmsaglik', '37.5847', '36.9228', ''],
        ['Onikişubat Toplum Sağlığı Merkezi', 'KM-002', 'Toplum Sağlığı Merkezi', 'Onikişubat', 'Merkez Mah. Atatürk Bulvarı No 123', '0 344 234 56 78', 'tsm@saglik.gov.tr', '', '', '', '', '', '37.5750', '36.9370', ''],
        ['Afşin Aile Sağlığı Merkezi', 'KM-003', 'Aile Sağlığı Merkezi', 'Afşin', 'Cumhuriyet Mah. İstiklal Caddesi No 45', '0 344 345 67 89', '', '', '', '', '', '', '37.6850', '36.9150', '']
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
        { wch: 35 }, // Tesis Adı
        { wch: 15 }, // Kurum Kodu
        { wch: 30 }, // Tür
        { wch: 15 }, // İlçe
        { wch: 50 }, // Adres
        { wch: 18 }, // Telefon
        { wch: 25 }, // E-posta
        { wch: 35 }, // Web Sitesi
        { wch: 35 }, // Facebook
        { wch: 35 }, // Instagram
        { wch: 35 }, // Twitter
        { wch: 35 }, // NSosyal
        { wch: 12 }, // Enlem
        { wch: 12 }, // Boylam
        { wch: 35 }  // Görsel URL
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Tesisler');

    // Generate and download XLSX file
    XLSX.writeFile(wb, 'tesisler_sablonu.xlsx');

    showToast('Excel şablonu indiriliyor...', 'success');
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function processFile(file) {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
        showToast('Geçersiz dosya formatı. Lütfen Excel veya CSV dosyası yükleyin.', 'error');
        return;
    }

    selectedFile = file;
    document.getElementById('selectedFileName').textContent = `📄 ${file.name}`;
    document.getElementById('startImportBtn').disabled = false;
}

async function startImport() {
    if (!selectedFile) {
        showToast('Lütfen önce bir dosya seçin', 'error');
        return;
    }

    const importBtn = document.getElementById('startImportBtn');
    importBtn.disabled = true;
    importBtn.querySelector('.btn-text').style.display = 'none';
    importBtn.querySelector('.btn-loader').style.display = 'inline-flex';

    document.getElementById('importProgress').style.display = 'block';
    document.getElementById('importResults').style.display = 'none';

    try {
        // Read file
        const data = await readExcelFile(selectedFile);

        // Parse and validate
        const facilities = parseExcelData(data);

        if (facilities.length === 0) {
            throw new Error('Excel dosyasında geçerli veri bulunamadı');
        }

        // Import facilities
        await importFacilities(facilities);

    } catch (error) {
        console.error('Import error:', error);
        showToast('İçe aktarma sırasında hata oluştu: ' + error.message, 'error');
        document.getElementById('importProgress').style.display = 'none';
    } finally {
        importBtn.disabled = false;
        importBtn.querySelector('.btn-text').style.display = 'inline';
        importBtn.querySelector('.btn-loader').style.display = 'none';
    }
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                resolve(jsonData);
            } catch (error) {
                reject(new Error('Excel dosyası okunamadı'));
            }
        };

        reader.onerror = () => reject(new Error('Dosya okuma hatası'));
        reader.readAsArrayBuffer(file);
    });
}

function parseExcelData(data) {
    const facilities = [];

    // Helper function to normalize Turkish text (convert to proper case)
    const normalizeTurkishText = (text) => {
        if (!text) return text;

        // Turkish character mapping for proper case conversion
        const turkishLower = {
            'I': 'ı', 'İ': 'i', 'Ş': 'ş', 'Ğ': 'ğ', 'Ü': 'ü', 'Ö': 'ö', 'Ç': 'ç'
        };

        // Convert to lowercase first
        let result = text.toLowerCase();

        // Then capitalize first letter of each word
        result = result.split(' ').map(word => {
            if (word.length === 0) return word;
            return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1);
        }).join(' ');

        return result;
    };

    for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // Skip empty rows
        if (!row['Tesis Adı'] || !row['Tür'] || !row['İlçe'] || !row['Adres']) {
            continue;
        }

        const facility = {
            name: row['Tesis Adı']?.trim().toLocaleUpperCase('tr-TR'),
            kurum_kodu: row['Kurum Kodu'] ? String(row['Kurum Kodu']).trim() : null,
            type: row['Tür']?.trim().toLocaleUpperCase('tr-TR'),
            district: row['İlçe']?.trim().toLocaleUpperCase('tr-TR'),
            address: row['Adres']?.trim().toLocaleUpperCase('tr-TR'),
            phone: row['Telefon']?.trim() || null,
            email: row['E-posta']?.trim() || null,
            website: row['Web Sitesi']?.trim() || null,
            facebook: row['Facebook']?.trim() || null,
            instagram: row['Instagram']?.trim() || null,
            twitter: row['Twitter']?.trim() || null,
            nsosyal: row['NSosyal']?.trim() || null,
            latitude: parseFloat(row['Enlem']) || null,
            longitude: parseFloat(row['Boylam']) || null,
            image_url: row['Görsel URL']?.trim() || null,
            rowNumber: i + 2 // Excel row number (1-indexed + header)
        };

        facilities.push(facility);
    }

    return facilities;
}

async function importFacilities(facilitiesToImport) {
    const results = {
        success: [],
        errors: []
    };

    const total = facilitiesToImport.length;
    let processed = 0;

    // Get all districts and types once before the loop for performance
    const districtsResult = await window.db.getDistricts();
    const typesResult = await window.db.getFacilityTypes();

    if (!districtsResult.success || !typesResult.success) {
        showToast('İlçe veya tesis türleri yüklenemedi. İçe aktarma iptal edildi.', 'error');
        return;
    }

    const allDistricts = districtsResult.data;
    const allTypes = typesResult.data;

    for (const facility of facilitiesToImport) {
        try {
            // Validate required fields
            if (!facility.name || !facility.type || !facility.district || !facility.address) {
                throw new Error('Zorunlu alanlar (Tesis Adı, Tür, İlçe, Adres) eksik');
            }

            // Find matching district ID (CASE-INSENSITIVE and TRIMMED)
            const matchedDistrict = allDistricts.find(d =>
                d.name.trim().toLocaleUpperCase('tr-TR') === facility.district.trim().toLocaleUpperCase('tr-TR')
            );

            if (matchedDistrict) {
                facility.district_id = matchedDistrict.id;
            } else {
                throw new Error(`'${facility.district}' isimli ilçe sistemde bulunamadı. Lütfen yazımı kontrol edin.`);
            }

            // Find matching type ID (CASE-INSENSITIVE and TRIMMED)
            const matchedType = allTypes.find(t =>
                t.name.trim().toLocaleUpperCase('tr-TR') === facility.type.trim().toLocaleUpperCase('tr-TR')
            );

            if (matchedType) {
                facility.facility_type_id = matchedType.id;
            } else {
                throw new Error(`'${facility.type}' isimli tesis türü sistemde bulunamadı. Lütfen yazımı kontrol edin.`);
            }

            // If coordinates are missing, try geocoding
            if (!facility.latitude || !facility.longitude) {
                const coords = await geocodeAddress(facility.address, facility.district);
                if (coords) {
                    facility.latitude = coords.lat;
                    facility.longitude = coords.lng;
                } else {
                    // Use default coordinates for Kahramanmaraş
                    facility.latitude = 37.5847;
                    facility.longitude = 36.9228;
                }
            }

            // Store rowNumber for error reporting, then remove it
            const rowNumber = facility.rowNumber;
            const facilityData = { ...facility };
            delete facilityData.rowNumber;
            delete facilityData.district; // Remove string name
            delete facilityData.type;     // Remove string name

            // Create facility
            const result = await window.db.createFacility(facilityData);

            if (!result.success) {
                throw new Error(result.error || 'Kayıt başarısız');
            }

            results.success.push({ ...facility, rowNumber });

        } catch (error) {
            results.errors.push({
                facility: facility,
                error: error.message
            });
        }

        // Update progress
        processed++;
        const progress = Math.round((processed / total) * 100);
        document.getElementById('progressBar').style.width = progress + '%';
        document.getElementById('progressText').textContent = progress + '%';

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Show results
    displayImportResults(results);

    // Reload facilities list
    loadFacilities();
}

function displayImportResults(results) {
    document.getElementById('importProgress').style.display = 'none';
    document.getElementById('importResults').style.display = 'block';

    document.getElementById('successCount').textContent = results.success.length;
    document.getElementById('errorCount').textContent = results.errors.length;

    const errorList = document.getElementById('errorList');
    errorList.innerHTML = '';

    if (results.errors.length > 0) {
        errorList.innerHTML = '<h4 style="font-size: 14px; margin-bottom: 12px; color: var(--danger);">Hatalı Kayıtlar:</h4>';

        results.errors.forEach(item => {
            const errorItem = document.createElement('div');
            errorItem.style.cssText = 'padding: 12px; background: var(--error-bg); border-radius: 6px; margin-bottom: 8px; font-size: 13px;';
            errorItem.innerHTML = `
                <strong>Satır ${item.facility.rowNumber}: ${item.facility.name}</strong><br>
                <span style="color: var(--danger);">Hata: ${item.error}</span>
            `;
            errorList.appendChild(errorItem);
        });
    }

    if (results.success.length > 0) {
        showToast(`${results.success.length} tesis başarıyla içe aktarıldı!`, 'success');
    }
}

// Make functions globally accessible
window.editFacility = editFacility;
window.confirmDeleteFacility = confirmDeleteFacility;
window.handleProcessReport = handleProcessReport;
window.confirmDeleteReport = confirmDeleteReport;

// =====================================================
// REPORT MANAGEMENT
// =====================================================

async function loadReports() {
    try {
        const result = await window.db.getReports();

        if (!result.success) throw new Error(result.error);

        reports = result.data || [];
        filteredReports = [...reports];
        renderReportsTable();

    } catch (error) {
        console.error('Error loading reports:', error);
        showToast('Bildirimler yüklenirken bir hata oluştu', 'error');
    }
}

function renderReportsTable() {
    const tbody = document.getElementById('reportsTableBody');
    if (!tbody) return;

    if (filteredReports.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="6">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    </svg>
                    <p>Henüz bildirim bulunmuyor</p>
                </td>
            </tr>
        `;
        return;
    }

    const typeLabels = {
        'location': '📍 Hatalı Konum',
        'phone': '📞 Hatalı Telefon',
        'email': '📧 Hatalı E-posta',
        'website': '🌐 Hatalı Web Sitesi',
        'address': '🏠 Hatalı Adres',
        'name': '🏷️ Hatalı İsim',
        'closed': '🚫 Kapalı',
        'other': '❓ Diğer'
    };

    const statusLabels = {
        'pending': '<span class="status-badge pending">Beklemede</span>',
        'approved': '<span class="status-badge approved">Onaylandı</span>',
        'rejected': '<span class="status-badge rejected">Reddedildi</span>'
    };

    tbody.innerHTML = filteredReports.map(report => {
        let suggestionDisplay = '';
        if (report.suggested_data && typeof report.suggested_data === 'object') {
            const suggestions = Object.entries(report.suggested_data)
                .map(([key, val]) => `<div class="suggestion-item"><strong>${key}:</strong> <span class="new-val">${val}</span></div>`)
                .join('');
            suggestionDisplay = `<div class="report-suggestions">${suggestions}</div>`;
        }

        return `
            <tr class="${report.status}">
                <td><strong>${report.facility?.name || 'Bilinmiyor'}</strong></td>
                <td>${typeLabels[report.report_type] || report.report_type}</td>
                <td>
                    <div class="report-note-cell">
                        ${report.reporter_note ? `<div class="note-text">${report.reporter_note}</div>` : ''}
                        ${suggestionDisplay}
                    </div>
                </td>
                <td>${statusLabels[report.status] || report.status}</td>
                <td>${new Date(report.created_at).toLocaleDateString('tr-TR')}</td>
                <td>
                    <div class="table-actions">
                        ${report.status === 'pending' ? `
                            <button class="btn btn-ghost btn-icon text-success" onclick="handleProcessReport('${report.id}', 'approved')" title="Onayla ve Güncelle">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                            <button class="btn btn-ghost btn-icon text-danger" onclick="handleProcessReport('${report.id}', 'rejected')" title="Reddet">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        ` : `
                            <button class="btn btn-ghost btn-icon" onclick="confirmDeleteReport('${report.id}')" title="Sil">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function handleReportSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    filteredReports = reports.filter(r =>
        (r.facility?.name || '').toLowerCase().includes(query) ||
        (r.reporter_note || '').toLowerCase().includes(query) ||
        (r.report_type || '').toLowerCase().includes(query)
    );

    renderReportsTable();
}

async function handleProcessReport(reportId, status) {
    const report = reports.find(r => String(r.id) === String(reportId));
    if (!report) return;

    let message = status === 'approved' ? 'Bu bildirimi onaylamak ve önerilen değişiklikleri uygulamak istediğinize emin misiniz?' : 'Bu bildirimi reddetmek istediğinize emin misiniz?';
    if (status === 'approved' && report.report_type === 'closed') {
        message = 'Bu bildirimi onaylamak tesisi PASİF duruma getirecektir. Emin misiniz?';
    }

    const confirmed = await showConfirm(status === 'approved' ? 'Bildirimi Onayla' : 'Bildirimi Reddet', message, status === 'approved' ? 'primary' : 'danger');
    if (!confirmed) return;

    try {
        // 1. If approved and there's suggested data, apply it to the facility
        if (status === 'approved') {
            if (report.suggested_data && Object.keys(report.suggested_data).length > 0) {
                const updateResult = await window.db.updateFacility(report.facility_id, report.suggested_data);
                if (!updateResult.success) throw new Error('Tesis bilgileri güncellenemedi: ' + updateResult.error);
            } else if (report.report_type === 'closed') {
                const updateResult = await window.db.updateFacility(report.facility_id, { is_active: false });
                if (!updateResult.success) throw new Error('Tesis pasif yapılamadı: ' + updateResult.error);
            }
        }

        // 2. Update report status
        const result = await window.db.updateReportStatus(reportId, status);
        if (result.success) {
            showToast(status === 'approved' ? 'Bildirim onaylandı ve tesis güncellendi' : 'Bildirim reddedildi');
            loadReports();
            loadFacilities(); // Refresh facilities to show changes
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error processing report:', error);
        showToast(error.message || 'Bildirim işlenirken hata oluştu', 'error');
    }
}

async function confirmDeleteReport(reportId) {
    const confirmed = await showConfirm('Bildirimi Sil', 'Bu bildirimi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', 'danger');
    if (!confirmed) return;

    try {
        const { error } = await window.supabase
            .from('facility_reports')
            .delete()
            .eq('id', reportId);

        if (error) throw error;

        showToast('Bildirim silindi');
        loadReports();
    } catch (error) {
        console.error('Error deleting report:', error);
        showToast('Bildirim silinirken hata oluştu', 'error');
    }
}

// =====================================================
// STATUS MANAGEMENT
// =====================================================

async function toggleFacilityStatus(id, newStatus) {
    // 1. Optimistic UI update (update locally and re-render immediately)
    const updateLocalState = (arr) => {
        const f = arr.find(item => item.id == id);
        if (f) f.is_active = newStatus;
    };

    updateLocalState(facilities);
    updateLocalState(filteredFacilities);
    renderFacilitiesTable();

    try {
        const result = await window.db.updateFacility(id, { is_active: newStatus });

        if (result.success) {
            showToast(newStatus ? 'Tesis aktif edildi' : 'Tesis pasif edildi');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error toggling facility status:', error);
        showToast('Durum güncellenirken hata oluştu', 'error');
        // Revert by reloading fresh data
        loadFacilities();
    }
}

// =====================================================
// SYSTEM BACKUP
// =====================================================

/**
 * Universal download trigger that doesn't rely on FileSaver.js
 */
function triggerDownload(blob, fileName) {
    if (typeof saveAs !== 'undefined') {
        saveAs(blob, fileName);
        return;
    }

    console.log('FileSaver.js not found, using browser fallback for:', fileName);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

async function handleDatabaseBackup(format = 'json', tableName = null) {
    // Determine which button triggered this (optional for SQL table-specific)
    let btn;
    if (tableName) {
        btn = document.querySelector(`[data-table="${tableName}"]`);
    } else {
        const btnId = format === 'json' ? 'downloadDbBackupBtn' : 'downloadSqlBackupBtn';
        btn = document.getElementById(btnId);
    }

    const originalText = btn ? btn.innerHTML : '';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <svg class="spinner" viewBox="0 0 24 24" style="width: 18px; height: 18px;">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none" />
            </svg>
            ...
        `;
    }

    try {
        const label = tableName ? `${tableName} tablosu` : format.toUpperCase();
        showToast(`${label} yedeği hazırlanıyor...`, 'info');

        // Identify which tables to fetch
        const tableList = tableName ? [tableName] : ['districts', 'facility_types', 'facilities', 'facility_reports'];

        // Fetch data
        const queries = tableList.map(t => window.supabase.from(t).select('*'));
        const results = await Promise.all(queries);

        // Check for errors
        const errors = results.filter(r => r.error).map(r => r.error.message);
        if (errors.length > 0) {
            throw new Error('Veritabanı hatası: ' + errors.join(', '));
        }

        const dataObjects = results.map(r => r.data || []);

        let blob;
        let fileName;
        const dateStr = new Date().toISOString().split('T')[0];

        if (format === 'json') {
            const backupData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                data: {}
            };
            tableList.forEach((t, i) => backupData.data[t] = dataObjects[i]);

            blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            fileName = tableName ? `yedek_${tableName}_${dateStr}.json` : `saglik_harita_yedek_${dateStr}.json`;
        } else {
            // SQL Export
            let sqlOutput = `-- Sağlık Haritası Veritabanı Yedeği\n`;
            sqlOutput += `-- Oluşturma Tarihi: ${new Date().toLocaleString()}\n`;
            if (tableName) sqlOutput += `-- Tablo: ${tableName}\n`;
            sqlOutput += `\n`;

            const generateInserts = (name, data) => {
                if (!data || data.length === 0) return `-- ${name} tablosu boş\n\n`;

                let sql = `-- ${name} tablosu\n`;
                const columns = Object.keys(data[0]);

                data.forEach(row => {
                    const values = columns.map(col => {
                        const val = row[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                        return val;
                    });
                    sql += `INSERT INTO ${name} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
                });
                return sql + '\n';
            };

            tableList.forEach((t, i) => {
                sqlOutput += generateInserts(t, dataObjects[i]);
            });

            blob = new Blob([sqlOutput], { type: 'text/plain' });
            fileName = tableName ? `yedek_${tableName}_${dateStr}.sql` : `saglik_harita_yedek_${dateStr}.sql`;
        }

        triggerDownload(blob, fileName);
        showToast('Yedekleme başarıyla tamamlandı', 'success');
    } catch (error) {
        console.error('Database backup error:', error);
        showToast('Yedek alınırken hata oluştu: ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

async function handleFilesBackup() {
    const btn = document.getElementById('downloadFilesBackupBtn');
    const progressArea = document.getElementById('backupProgressArea');
    const progressBar = document.getElementById('backupProgressBar');
    const progressLabel = document.getElementById('backupProgressLabel');
    const progressPercent = document.getElementById('backupProgressPercent');

    // Only JSZip is strictly required; triggerDownload handles missing saveAs
    if (typeof JSZip === 'undefined') {
        showToast('Dosya sıkıştırma kütüphanesi (JSZip) yüklenemedi. Lütfen internet bağlantınızı kontrol edin.', 'error');
        return;
    }

    const btnText = btn.innerHTML;
    btn.disabled = true;

    progressArea.style.display = 'block';
    updateProgress(0, 'Dosya listesi hazırlanıyor...');

    try {
        const zip = new JSZip();

        // List of files to backup (frontend specific)
        const filesToBackup = [
            { path: '../index.html', name: 'index.html' },
            { path: '../app.js', name: 'app.js' },
            { path: '../sw.js', name: 'sw.js' },
            { path: '../manifest.json', name: 'manifest.json' },
            { path: 'index.html', name: 'haritayonetim/index.html' },
            { path: 'assets/js/admin.js', name: 'haritayonetim/assets/js/admin.js' },
            { path: 'assets/css/admin.css', name: 'haritayonetim/assets/css/admin.css' },
            { path: '../assets/js/config.js', name: 'assets/js/config.js' },
            { path: '../assets/images/hospital-icon.svg', name: 'assets/images/hospital-icon.svg' },
            { path: '../assets/images/icon-192.png', name: 'assets/images/icon-192.png' },
            { path: '../assets/images/icon-512.png', name: 'assets/images/icon-512.png' },
            { path: '../assets/images/logo.png', name: 'assets/images/logo.png' },
            { path: '../assets/kahramanmaras_border.json', name: 'assets/kahramanmaras_border.json' }
        ];

        const totalFiles = filesToBackup.length;

        for (let i = 0; i < totalFiles; i++) {
            const file = filesToBackup[i];
            updateProgress(Math.round((i / totalFiles) * 50), `Dosya indiriliyor: ${file.name}`);

            try {
                const response = await fetch(file.path);
                if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
                const content = await response.blob();
                zip.file(file.name, content);
            } catch (err) {
                console.warn(`Could not backup file: ${file.path}`, err);
            }
        }

        updateProgress(60, 'ZIP arşivi oluşturuluyor...');

        const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
            const percent = 60 + Math.round(metadata.percent * 0.35); // Take 60% to 95%
            updateProgress(percent, 'Dosyalar sıkıştırılıyor...');
        });

        updateProgress(100, 'Tamamlandı!');
        triggerDownload(content, `saglik_harita_dosyalar_${new Date().toISOString().split('T')[0]}.zip`);
        showToast('Dosya yedeği başarıyla indirildi', 'success');

        setTimeout(() => {
            progressArea.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error('Files backup error:', error);
        showToast('Dosya yedeği alınırken hata oluştu: ' + error.message, 'error');
        progressArea.style.display = 'none';
    } finally {
        btn.disabled = false;
        // Restore original HTML
        const downloadIcon = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Dosyaları İndir (.zip)
        `;
        btn.innerHTML = downloadIcon;
    }

    function updateProgress(percent, label) {
        progressBar.style.width = percent + '%';
        progressPercent.textContent = percent + '%';
        progressLabel.textContent = label;
    }
}

// =====================================================
// EXCEL EXPORT
// =====================================================

async function handleExcelExport() {
    const btn = document.getElementById('exportExcelBtn');
    if (!btn) return;

    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `
        <svg class="spinner" viewBox="0 0 24 24" style="width: 18px; height: 18px;">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none" />
        </svg>
        Hazırlanıyor...
    `;

    try {
        if (typeof XLSX === 'undefined') {
            throw new Error('Excel kütüphanesi (SheetJS) yüklenemedi.');
        }

        showToast('Veriler hazırlanıyor...', 'info');

        // Fetch all data
        const [facilitiesRes, districtsRes, typesRes] = await Promise.all([
            window.supabase.from('facilities').select('*'),
            window.supabase.from('districts').select('*'),
            window.supabase.from('facility_types').select('*')
        ]);

        if (facilitiesRes.error) throw facilitiesRes.error;
        if (districtsRes.error) throw districtsRes.error;
        if (typesRes.error) throw typesRes.error;

        const districtsMap = {};
        districtsRes.data.forEach(d => districtsMap[d.id] = d.name);

        const typesMap = {};
        typesRes.data.forEach(t => typesMap[t.id] = t.name);

        const exportData = facilitiesRes.data.map(f => ({
            'Tesis Adı': f.name,
            'Tesis Türü': typesMap[f.type_id] || f.type_id,
            'İlçe': districtsMap[f.district_id] || f.district_id,
            'Adres': f.address || '',
            'Enlem': f.latitude || '',
            'Boylam': f.longitude || '',
            'Kurum Kodu': f.kurum_kodu || '',
            'Telefon': f.phone || '',
            'Hizmet Durumu': f.status || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Tesisler');

        // Set column widths for better readability
        const wscols = [
            { wch: 40 }, // Tesis Adı
            { wch: 30 }, // Tesis Türü
            { wch: 20 }, // İlçe
            { wch: 50 }, // Adres
            { wch: 15 }, // Enlem
            { wch: 15 }, // Boylam
            { wch: 15 }, // Kurum Kodu
            { wch: 20 }, // Telefon
            { wch: 15 }  // Hizmet Durumu
        ];
        worksheet['!cols'] = wscols;

        // Generate and save
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `tesis_listesi_${dateStr}.xlsx`);

        showToast('Excel dosyası başarıyla indirildi', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Dışa aktarma hatası: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Image Compression / Optimization Logic
 * Resizes to 1200px (long edge) and converts to WebP/JPEG
 */
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Use WebP if supported, otherwise JPEG
                const type = 'image/webp';
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, type, 0.82); // 0.82 quality balance
            };
        };
    });
}

/**
 * Upload to Supabase Storage
 */
async function uploadToSupabase(blob, slotId) {
    const fileName = `facility_${Date.now()}_${slotId}.webp`;
    const filePath = `${fileName}`;

    const { data, error } = await window.supabase.storage
        .from('facility-photos')
        .upload(filePath, blob, {
            contentType: 'image/webp',
            upsert: true
        });

    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = window.supabase.storage
        .from('facility-photos')
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
}

/**
 * Approve Pending Photo
 */
async function approvePhoto(facilityId, slot) {
    if (!confirm('Bu fotoğrafı onaylamak istiyor musunuz?')) return;

    try {
        // We need to fetch current pending url first to move it
        const currentFacility = facilities.find(f => f.id == facilityId);
        if (!currentFacility) throw new Error('Tesis bulunamadı');

        const pendingKey = `pending_image_${slot}`;
        const mainKey = `image_${slot}`;
        const pendingUrl = currentFacility[pendingKey];

        if (!pendingUrl) {
            showToast('Onaylanacak fotoğraf bulunamadı.', 'error');
            return;
        }

        const updateData = {
            [mainKey]: pendingUrl,
            [pendingKey]: null
        };

        const result = await window.db.updateFacility(facilityId, updateData);
        if (!result.success) throw new Error(result.error);

        showToast('Fotoğraf onaylandı ve yayına alındı.', 'success');

        // Refresh to update UI
        if (editingFacilityId && editingFacilityId == facilityId) {
            // If modal is open, reload it
            const updated = await window.db.getFacilities(); // refresh cache
            // Re-find facility
            // Ideally loadFacilities would run.
            loadFacilities().then(() => {
                const newFac = facilities.find(f => f.id == facilityId);
                if (newFac) openFacilityModal(newFac); // Refresh modal
            });
        } else {
            loadFacilities();
        }

    } catch (err) {
        console.error(err);
        showToast('Onay işlemi başarısız: ' + err.message, 'error');
    }
}

/**
 * Reject Pending Photo
 */
async function rejectPhoto(facilityId, slot) {
    if (!confirm('Bu fotoğrafı reddetmek istiyor musunuz? Bekleyen fotoğraf silinecektir.')) return;

    try {
        const pendingKey = `pending_image_${slot}`;
        const updateData = {
            [pendingKey]: null
        };

        const result = await window.db.updateFacility(facilityId, updateData);
        if (!result.success) throw new Error(result.error);

        showToast('Fotoğraf reddedildi ve silindi.', 'success');

        // Refresh to update UI
        if (editingFacilityId && editingFacilityId == facilityId) {
            loadFacilities().then(() => {
                const newFac = facilities.find(f => f.id == facilityId);
                if (newFac) openFacilityModal(newFac);
            });
        } else {
            loadFacilities();
        }

    } catch (err) {
        console.error(err);
        showToast('Red işlemi başarısız: ' + err.message, 'error');
    }
}

/**
 * View Pending Photo
 */
function viewPendingPhoto(url) {
    // Reuse lightbox or open in new tab
    if (window.openLightbox) {
        window.openLightbox(url);
    } else {
        window.open(url, '_blank');
    }
}

// Global exposure for onclick handlers
window.approvePhoto = approvePhoto;
window.rejectPhoto = rejectPhoto;
window.viewPendingPhoto = viewPendingPhoto;
window.handlePhotoDelete = handlePhotoDelete;
window.handlePhotoUpload = handlePhotoUpload;
async function handlePhotoUpload(slotId) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment'; // Suggest camera on mobile

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const btn = document.querySelector(`.photo-upload-btn[data-slot="${slotId}"]`);
        const preview = document.querySelector(`.photo-preview[data-slot="${slotId}"]`);
        const input = document.getElementById(`facilityImage${slotId}`);
        const originalText = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-small"></span> Küçültülüyor...';

            const compressedBlob = await compressImage(file);

            btn.innerHTML = '<span class="spinner-small"></span> Yükleniyor...';
            const url = await uploadToSupabase(compressedBlob, slotId);

            // Update UI
            input.value = url;
            preview.style.backgroundImage = `url(${url})`;
            preview.classList.add('has-image');
            btn.innerHTML = '✓ Başarılı';
            btn.classList.add('btn-success');

            setTimeout(() => {
                btn.innerHTML = 'Değiştir';
                btn.classList.remove('btn-success');
                btn.disabled = false;
            }, 2000);

        } catch (err) {
            console.error('Fotoğraf yükleme hatası:', err);
            showToast('Yükleme hatası: ' + err.message, 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    fileInput.click();
}

// =====================================================
// PWA - Service Worker Registration
// =====================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/haritayonetim/sw-admin.js')
            .then((registration) => {
                console.log('Admin SW registered:', registration.scope);
            })
            .catch((error) => {
                console.log('Admin SW registration failed:', error);
            });
    });
}

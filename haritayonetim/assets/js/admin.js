// =====================================================
// ADMIN PANEL - MAIN JAVASCRIPT
// =====================================================

// Global state
let currentUser = null;
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
    // Check if user is already logged in
    const { data: { session } } = await window.supabase.auth.getSession();

    if (session) {
        currentUser = session.user;
        await loadInitialData();
        showDashboard();
    } else {
        showLogin();
    }

    displayFacilities();
    setupEventListeners();
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
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';

    // Update user info
    if (currentUser) {
        document.getElementById('userEmail').textContent = currentUser.email;
    }

    // Load facilities
    loadFacilities();
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
    }
}

// =====================================================
// FACILITY MANAGEMENT
// =====================================================

async function loadFacilities() {
    try {
        const result = await window.db.getFacilities();

        if (!result.success) throw new Error(result.error);

        facilities = result.data || [];
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

    tbody.innerHTML = filteredFacilities.map(facility => `
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
                    <label class="switch" title="${facility.is_active ? 'Pasif Yap' : 'Aktif Yap'}">
                        <input type="checkbox" ${facility.is_active ? 'checked' : ''} onchange="toggleFacilityStatus('${facility.id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
            </td>
        </tr>
    `).join('');
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
    const modal = document.getElementById('facilityModal');
    const form = document.getElementById('facilityForm');
    const title = document.getElementById('modalTitle');

    editingFacilityId = facility ? facility.id : null;

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
        document.getElementById('facilityImage').value = facility.image_url || '';
    } else {
        // Add mode
        title.textContent = 'Yeni Tesis Ekle';
        form.reset();
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
            longitude: lng,
            image_url: document.getElementById('facilityImage').value || null
        };

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

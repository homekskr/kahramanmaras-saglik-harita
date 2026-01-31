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

// Tesis ikonunu getir (Özellikle hastaneler için 'Ⓗ' ikonunu zorunlu yap)
function getFacilityIcon(facility) {
    const typeName = (facility.facility_type_name || facility.type || '').toUpperCase();
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

    // Setup event listeners
    setupEventListeners();
});

// =====================================================
// AUTHENTICATION
// =====================================================

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
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
    // Load districts
    const districtsResult = await window.db.getDistricts();
    if (districtsResult.success) {
        districts = districtsResult.data;
        populateDistrictOptions();
    }

    // Load facility types
    const typesResult = await window.db.getFacilityTypes();
    if (typesResult.success) {
        facilityTypes = typesResult.data;
        populateTypeOptions();
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
            const iconLabel = (t.name.toUpperCase() === 'HASTANE' || t.name.toUpperCase() === 'HASTANE EK BİNA') ? '[H]' : (t.icon || '📍');
            option.textContent = `${iconLabel} ${t.name}`;
            select.appendChild(option);
        });
    }

    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">TÜM TÜRLER</option>';
        facilityTypes.forEach(t => {
            const option = document.createElement('option');
            option.value = t.name; // Keep name for filtering since we filter the local array
            const iconLabel = (t.name.toUpperCase() === 'HASTANE' || t.name.toUpperCase() === 'HASTANE EK BİNA') ? '[H]' : (t.icon || '📍');
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

    // Show facilities section (only section now)
    if (section === 'facilities') {
        document.getElementById('facilitiesSection').style.display = 'block';
        document.getElementById('pageTitle').textContent = 'Tesis Yönetimi';
        document.getElementById('pageSubtitle').textContent = 'Sağlık tesislerini ekleyin, düzenleyin veya silin';
        document.getElementById('addFacilityBtn').style.display = 'flex';
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
                <td colspan="8">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p>Henüz tesis bulunmuyor</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredFacilities.map(facility => `
        <tr>
            <td><strong>${facility.name}</strong></td>
            <td>${facility.kurum_kodu || '-'}</td>
            <td><span style="display:flex; align-items:center; gap:8px;">${getFacilityIcon(facility)} ${facility.facility_type_name || facility.type || '-'}</span></td>
            <td>${facility.district_name || facility.district || '-'}</td>
            <td>
                ${facility.website ? `<a href="${facility.website}" target="_blank" class="btn btn-ghost btn-icon btn-sm" title="Web Sitesi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></a>` : '-'}
            </td>
            <td>
                ${facility.email ? `<a href="mailto:${facility.email}" class="btn btn-ghost btn-icon btn-sm" title="${facility.email}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></a>` : '-'}
            </td>
            <td>${facility.phone || '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-ghost btn-icon" onclick="editFacility('${facility.id}')" title="Düzenle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                    <button class="btn btn-ghost btn-icon text-danger" onclick="confirmDeleteFacility('${facility.id}', '${facility.name.replace(/'/g, "\\'")}')" title="Sil">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>
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
        // 1. Check Search Query
        const name = (facility.name || '').toLocaleLowerCase('tr-TR');
        const district = (facility.district_name || facility.district || '').toLocaleLowerCase('tr-TR');
        const address = (facility.address || '').toLocaleLowerCase('tr-TR');
        const matchesSearch = query === '' || name.includes(query) || district.includes(query) || address.includes(query);

        // 2. Check Type Filter
        const facilityType = (facility.facility_type_name || facility.type || '').trim().toLocaleUpperCase('tr-TR');
        const matchesType = type === '' || facilityType === type;

        return matchesSearch && matchesType;
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

function confirmDeleteFacility(id, name) {
    const modal = document.getElementById('deleteModal');
    document.getElementById('deleteFacilityName').textContent = name;
    modal.classList.add('active');

    // Store facility ID for deletion
    modal.dataset.facilityId = id;

    // Setup delete confirmation
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = () => deleteFacility(id);
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.remove('active');
}

async function deleteFacility(id) {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.disabled = true;
    confirmBtn.querySelector('.btn-text').style.display = 'none';
    confirmBtn.querySelector('.btn-loader').style.display = 'inline-flex';

    try {
        const result = await window.db.deleteFacility(id);

        if (!result.success) throw new Error(result.error);

        showToast('Tesis başarıyla silindi', 'success');
        closeDeleteModal();
        loadFacilities();

    } catch (error) {
        console.error('Error deleting facility:', error);
        showToast('Tesis silinirken bir hata oluştu', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.querySelector('.btn-text').style.display = 'inline';
        confirmBtn.querySelector('.btn-loader').style.display = 'none';
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
        const marker = L.marker([facility.latitude, facility.longitude])
            .addTo(adminMap);

        marker.bindPopup(`
        < strong > ${facility.name}</strong > <br>
            ${facility.type || ''}<br>
                ${facility.address || ''}
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

// =====================================================
// SAĞLIK TESİSLERİ HARİTA UYGULAMASI
// Main Application JavaScript
// =====================================================

// Map Configuration
const KAHRAMANMARAS_CENTER = [37.5847, 36.9228];
const DEFAULT_ZOOM = 12;

// Global Variables
let map;
let markerClusterGroup;
let allFacilities = [];
let filteredFacilities = [];
let districts = [];
let facilityTypes = [];

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Check Supabase configuration
    if (!window.SUPABASE_CONFIG.url || window.SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL_HERE') {
        showStatus('⚠️ Supabase yapılandırması gerekli! config.js dosyasını düzenleyin.', 'error', 10000);
        return;
    }

    initMap();
    await loadInitialData();

    // Setup event listeners
    setupEventListeners();

    // Check for facility parameter in URL (from list page)
    checkURLParameter();
});

// Check URL for facility parameter
function checkURLParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const facilityId = urlParams.get('facility');

    if (facilityId) {
        // Wait a bit for data to load
        setTimeout(() => {
            viewFacility(facilityId);
        }, 500);
    }
}

// =====================================================
// MAP INITIALIZATION
// =====================================================

function initMap() {
    // Initialize map
    map = L.map('map').setView(KAHRAMANMARAS_CENTER, DEFAULT_ZOOM);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Initialize marker cluster group
    markerClusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });

    // Customize zoom control to remove "+" icon
    map.zoomControl.remove();
    L.control.zoom({
        zoomInText: '🔍', // Search/Zoom icon
        zoomOutText: '➖' // Minus icon
    }).addTo(map);

    map.addLayer(markerClusterGroup);

    // Load provincial borders
    loadProvinceBorder();
}

/**
 * Load and display Kahramanmaraş provincial borders
 */
async function loadProvinceBorder() {
    try {
        const response = await fetch('assets/kahramanmaras_border.json');
        if (!response.ok) throw new Error('Sınır verisi yüklenemedi');

        const geojsonData = await response.json();

        // Add GeoJSON to map with custom styling
        const borderStyle = {
            color: "#ff0000", // Red color
            weight: 7,        // Increased thickness (more than 2x the previous 3)
            opacity: 0.8,     // Higher opacity for visibility
            fillColor: "#ff0000",
            fillOpacity: 0.05,
            interactive: false // Don't block clicks to markers
        };

        L.geoJSON(geojsonData, {
            style: borderStyle
        }).addTo(map);

        console.log('İl sınırı başarıyla yüklendi');
    } catch (error) {
        console.error('Sınır yükleme hatası:', error);
    }
}

// =====================================================
// DATA LOADING
// =====================================================

async function loadInitialData() {
    showStatus('Veriler yükleniyor...', 'info');

    try {
        // Load districts and facility types in parallel
        const [districtsResult, typesResult] = await Promise.all([
            window.db.getDistricts(),
            window.db.getFacilityTypes()
        ]);

        if (districtsResult.success) {
            districts = districtsResult.data;
            populateDistrictFilter();
        }

        if (typesResult.success) {
            facilityTypes = typesResult.data;
            populateFacilityTypeFilter();
        }

        // Load all facilities after we have types and districts
        await loadFacilities();
    } catch (error) {
        console.error('Initial data loading error:', error);
        showStatus('Veriler yüklenirken bir hata oluştu', 'error');
    }
}

async function loadFacilities() {
    const result = await window.db.getAllFacilities();

    if (result.success) {
        allFacilities = result.data;
        filteredFacilities = [...allFacilities];
        displayFacilities();
        updateFacilityCount();
        showStatus(`${allFacilities.length} tesis yüklendi`, 'success');
    } else {
        showStatus('Tesisler yüklenirken hata oluştu: ' + result.error, 'error');
    }
}

// =====================================================
// UI POPULATION
// =====================================================

function populateDistrictFilter() {
    const select = document.getElementById('districtFilter');
    select.innerHTML = '<option value="">Tüm İlçeler</option>';

    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district.id;
        option.textContent = district.name;
        select.appendChild(option);
    });
}

function populateFacilityTypeFilter(availableTypeIds = null) {
    const select = document.getElementById('typeFilter');
    const currentVal = select.value;

    // Clear existing options but keep "All"
    select.innerHTML = '<option value="">Tüm Sağlık Tesisi Türleri</option>';

    facilityTypes.forEach(type => {
        // If specific types are requested, check if this type is allowed
        if (availableTypeIds && !availableTypeIds.has(type.id)) {
            return;
        }

        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = `${type.icon} ${type.name}`;
        select.appendChild(option);
    });

    // Restore selection if it's still valid, otherwise reset
    if (availableTypeIds && currentVal && !availableTypeIds.has(parseInt(currentVal))) {
        select.value = "";
    } else {
        select.value = currentVal;
    }
}

function updateFacilityTypeFilter() {
    const districtId = document.getElementById('districtFilter').value;

    if (!districtId) {
        // If no district selected, show all types
        populateFacilityTypeFilter();
        return;
    }

    // Find facilities in this district
    const facilitiesInDistrict = allFacilities.filter(
        f => f.district_id == districtId
    );

    // key: facility_type_id (Set for uniqueness)
    const availableTypeIds = new Set(
        facilitiesInDistrict.map(f => f.facility_type_id)
    );

    populateFacilityTypeFilter(availableTypeIds);
}

function populateFacilityNameFilter() {
    const districtId = document.getElementById('districtFilter').value;
    const typeId = document.getElementById('typeFilter').value;
    const select = document.getElementById('facilityNameFilter');

    select.innerHTML = '<option value="">Tesis Seçiniz</option>';

    // Filter facilities based on selected district and type
    const availableFacilities = allFacilities.filter(facility => {
        const matchesDistrict = !districtId || facility.district_id == districtId;
        const matchesType = !typeId || facility.facility_type_id == typeId;
        return matchesDistrict && matchesType;
    });

    // Sort alphabetically
    availableFacilities.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    // Populate dropdown
    availableFacilities.forEach(facility => {
        const option = document.createElement('option');
        option.value = facility.id;
        option.textContent = facility.name;
        select.appendChild(option);
    });

    // Show count
    if (availableFacilities.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Tesis bulunamadı';
        option.disabled = true;
        select.appendChild(option);
    }
}

// =====================================================
// DISPLAY FACILITIES
// =====================================================

function displayFacilities() {
    // Clear existing markers
    markerClusterGroup.clearLayers();

    // Add markers for each facility
    filteredFacilities.forEach(facility => {
        addFacilityMarker(facility);
    });

    // Auto-zoom to show all filtered facilities
    if (filteredFacilities.length > 0) {
        // Get bounds of all filtered facilities
        const bounds = L.latLngBounds(
            filteredFacilities.map(f => [f.latitude, f.longitude])
        );

        // Fit map to bounds with padding
        map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15
        });
    } else {
        // If no facilities, reset to default view
        map.setView(KAHRAMANMARAS_CENTER, DEFAULT_ZOOM);
    }

    // Update sidebar details (clear if multiple or none)
    if (filteredFacilities.length === 1) {
        renderFacilityDetails(filteredFacilities[0]);
    } else {
        clearFacilityDetails();
    }
}

// Tesis ikonunu getir (Özellikle hastaneler için 'Ⓗ' ikonunu zorunlu yap)
// Tesis ikonunu getir (Özellikle hastaneler için 'Ⓗ' ikonunu zorunlu yap)
function getFacilityIcon(facility) {
    const typeName = (facility.facility_type_name || '').trim().toUpperCase();

    // Hastane Kontrolü
    if (typeName === 'HASTANE' || typeName === 'HASTANE EK BİNA') {
        return '<div class="hospital-sign">H</div>';
    }

    // 112 Acil Sağlık İstasyonu Kontrolü (Hilal İkonlu Ambulans)
    if (typeName.includes('112') || typeName.includes('ACİL SAĞLIK')) {
        return `
            <div class="ambulance-icon-hilal">
                <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#e21c21" d="M490.5 284h-14l-31.4-83.6c-4.6-12.1-16.1-20.4-29-20.4H304v-48c0-17.7-14.3-32-32-32H32c-17.7 0-32 14.3-32 32v240c0 17.7 14.3 32 32 32h21c10.4 34.2 42.1 59.1 79.9 59.1s69.5-24.9 79.9-59.1h145.7c10.4 34.2 42.1 59.1 79.9 59.1s69.5-24.9 79.9-59.1h7.1c10.8 0 19.5-8.7 19.5-19.5V303.5c0-10.8-8.7-19.5-19.5-19.5z"/>
                    <path fill="#fff" d="M304 212h92.5l22.5 60H304v-60zM32 128h240v144H32z"/>
                    <path fill="#e21c21" d="M120 180c0-22.1 17.9-40 40-40s40 17.9 40 40c0 10.4-4 19.8-10.5 26.9 8.2 4.1 14.5 11.5 17 20.6-26-4-46.5-24.5-50.5-50.5 9.1 2.5 16.5 8.8 20.6 17 7.1-6.5 16.5-10.5 26.9-10.5 22.1 0 40 17.9 40 40s-17.9 40-40 40-40-17.9-40-40z" transform="scale(0.8) translate(30,-20)"/>
                    <path fill="#e21c21" d="M110 160c15-15 40-15 55 0s15 40 0 55c-10-10-10-25 0-35s25 0 35 10c15 15 15 40 0 55" transform="translate(20, -10) scale(1.1)"/>
                    <!-- Simple Crescent Path for better visibility -->
                    <path fill="#e21c21" d="M130 145c-25 0-45 20-45 45s20 45 45 45c10 0 20-3 28-9-15-2-28-15-28-36s13-34 28-36c-8-6-18-9-28-9z" transform="translate(-10, 0)"/>
                </svg>
            </div>
        `;
    }

    return facility.facility_type_icon || '📍';
}

function addFacilityMarker(facility) {
    const iconChar = getFacilityIcon(facility);

    // Create custom icon
    const icon = L.divIcon({
        html: `<div class="custom-marker" style="font-size: 2rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${iconChar}</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });

    // Create marker
    const marker = L.marker([facility.latitude, facility.longitude], { icon })
        .bindPopup(createPopupContent(facility));

    // Store facility ID in marker for later retrieval
    marker.facilityId = facility.id;

    // Add to cluster group
    markerClusterGroup.addLayer(marker);
}

function createPopupContent(facility) {
    // Sosyal medya kontrolü
    const hasSocialMedia = facility.facebook || facility.instagram || facility.twitter || facility.nsosyal;

    return `
        <div class="facility-popup">
            <div class="popup-header">
                <span class="popup-icon">${getFacilityIcon(facility)}</span>
                <h3 class="popup-title">${window.utils.escapeHTML(facility.name)}</h3>
            </div>
            <div class="popup-body">
                ${facility.address ? `<div class="popup-info"><strong>📮 Adres:</strong> ${window.utils.escapeHTML(facility.address)}</div>` : ''}
                ${facility.phone ? `<div class="popup-info"><strong>📞 Telefon:</strong> <a href="tel:${facility.phone}">${window.utils.escapeHTML(facility.phone)}</a></div>` : ''}
                ${facility.email ? `<div class="popup-info"><strong>📧 E-posta:</strong> <a href="mailto:${facility.email}">${window.utils.escapeHTML(facility.email)}</a></div>` : ''}
                ${facility.website ? `<div class="popup-info"><strong>🌐 Web:</strong> <a href="${window.utils.escapeHTML(facility.website)}" target="_blank">Siteyi Ziyaret Et</a></div>` : ''}
                ${hasSocialMedia ? `
                <div class="popup-info">
                    <strong>📱 Sosyal Ağ:</strong>
                    <div class="popup-social">
                        ${facility.facebook ? `<a href="${window.utils.escapeHTML(facility.facebook)}" target="_blank" class="social-link" title="Facebook"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>` : ''}
                        ${facility.instagram ? `<a href="${window.utils.escapeHTML(facility.instagram)}" target="_blank" class="social-link" title="Instagram"><svg viewBox="0 0 24 24" width="20" height="20"><defs><linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#FD5949"/><stop offset="50%" style="stop-color:#D6249F"/><stop offset="100%" style="stop-color:#285AEB"/></linearGradient></defs><path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>` : ''}
                        ${facility.twitter ? `<a href="${window.utils.escapeHTML(facility.twitter)}" target="_blank" class="social-link" title="X (Twitter)"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="#000000" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>` : ''}
                        ${facility.nsosyal ? `<a href="${window.utils.escapeHTML(facility.nsosyal)}" target="_blank" class="social-link" title="NSosyal"><svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="11" fill="#00A8E8"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Arial">N</text></svg></a>` : ''}
                    </div>
                </div>` : ''}

                ${(facility.image_1 || facility.image_2 || facility.image_3) ? `
                <div class="popup-gallery">
                    ${[1, 2, 3]
                .filter(i => facility[`image_${i}`])
                .map((i, index, arr) => {
                    const allImages = arr.map(idx => `'${facility[`image_${idx}`]}'`).join(',');
                    return `<img src="${facility[`image_${i}`]}" class="popup-photo" onclick="openLightbox([${allImages}], ${index})" title="Büyütmek için tıklayın">`;
                }).join('')}
                </div>` : ''}

            </div>
            <div class="popup-actions">
                <button class="popup-btn" onclick="getDirections(${facility.latitude}, ${facility.longitude}, '${facility.name}')">
                    🧭 Yol Tarifi
                </button>
                <button class="popup-btn" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}&basemap=satellite', '_blank')" style="background: linear-gradient(135deg, #4285f4 0%, #3367d6 100%);">
                    📍 Harita Detay
                </button>
                <button class="popup-btn" onclick="window.open('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${facility.latitude},${facility.longitude}&heading=0&pitch=0&fov=80', '_blank')" style="background: linear-gradient(135deg, #34a853 0%, #0f9d58 100%);">
                    🏙️ Sokak Görünümü
                </button>
                <button class="popup-btn popup-btn-report" onclick="openReportModal(${facility.id}, '${facility.name.replace(/'/g, "\\'")}')">
                    ⚠️ Hata Bildir
                </button>
            </div>
        </div>
    `;
}

// =====================================================
// LIGHTBOX FONKSİYONLARI (Slider Özelliği ile)
// =====================================================
let currentLightboxImages = [];
let currentLightboxIndex = 0;

function openLightbox(images, index = 0) {
    // Tek resim gelirse diziye çevir
    currentLightboxImages = Array.isArray(images) ? images : [images];
    currentLightboxIndex = index;

    // Varsa eskisini kaldır
    const existing = document.querySelector('.lightbox-overlay');
    if (existing) existing.remove();

    // Yeni lightbox oluştur
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox-overlay';

    // Navigasyon butonları (Birden fazla resim varsa)
    const hasMultiple = currentLightboxImages.length > 1;

    lightbox.innerHTML = `
        <div class="lightbox-content">
            <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
            
            ${hasMultiple ? `
                <button class="lightbox-nav lightbox-prev" onclick="event.stopPropagation(); changeLightboxImage(-1)">&#10094;</button>
                <button class="lightbox-nav lightbox-next" onclick="event.stopPropagation(); changeLightboxImage(1)">&#10095;</button>
            ` : ''}
            
            <div class="lightbox-image-container">
                <img src="${currentLightboxImages[currentLightboxIndex]}" class="lightbox-image" alt="Tesis Resmi">
            </div>
            
            ${hasMultiple ? `
                <div class="lightbox-counter">${currentLightboxIndex + 1} / ${currentLightboxImages.length}</div>
            ` : ''}
        </div>
    `;

    // Kapatma olayları
    lightbox.onclick = function (e) {
        if (e.target.classList.contains('lightbox-overlay') || e.target.classList.contains('lightbox-content')) {
            closeLightbox();
        }
    };

    // Klavye kontrolleri
    const keyListener = function (e) {
        if (e.key === 'Escape') {
            closeLightbox();
            document.removeEventListener('keydown', keyListener);
        } else if (e.key === 'ArrowLeft' && hasMultiple) {
            changeLightboxImage(-1);
        } else if (e.key === 'ArrowRight' && hasMultiple) {
            changeLightboxImage(1);
        }
    };
    document.addEventListener('keydown', keyListener);

    // Dokunmatik (Swipe) Kontrolleri
    let touchStartX = 0;
    let touchEndX = 0;

    lightbox.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        if (!hasMultiple) return;
        const threshold = 50;
        if (touchEndX < touchStartX - threshold) {
            changeLightboxImage(1); // Left swipe -> Next
        }
        if (touchEndX > touchStartX + threshold) {
            changeLightboxImage(-1); // Right swipe -> Prev
        }
    }

    document.body.appendChild(lightbox);

    // Animasyon başlat
    setTimeout(() => {
        lightbox.classList.add('active');
    }, 10);
}

function changeLightboxImage(direction) {
    if (currentLightboxImages.length <= 1) return;

    currentLightboxIndex += direction;

    // Döngüsel geçiş
    if (currentLightboxIndex >= currentLightboxImages.length) {
        currentLightboxIndex = 0;
    } else if (currentLightboxIndex < 0) {
        currentLightboxIndex = currentLightboxImages.length - 1;
    }

    const img = document.querySelector('.lightbox-image');
    const counter = document.querySelector('.lightbox-counter');

    if (img) {
        // Yumuşak geçiş animasyonu (fade)
        img.style.opacity = '0';
        setTimeout(() => {
            img.src = currentLightboxImages[currentLightboxIndex];
            img.onload = () => {
                img.style.opacity = '1';
            };
        }, 150);
    }

    if (counter) {
        counter.textContent = `${currentLightboxIndex + 1} / ${currentLightboxImages.length}`;
    }
}

function closeLightbox() {
    const lightbox = document.querySelector('.lightbox-overlay');
    if (lightbox) {
        lightbox.classList.remove('active');
        setTimeout(() => {
            lightbox.remove();
        }, 300);
    }
}

function renderFacilityDetails(facility) {
    const container = document.getElementById('facilityDetails');
    if (!container) return;

    // Sosyal medya kontrolü
    const hasSocialMedia = facility.facebook || facility.instagram || facility.twitter || facility.nsosyal;

    container.innerHTML = `
        <div class="details-card">
            <div class="details-header">
                <h3 class="details-title">${window.utils.escapeHTML(facility.name)}</h3>
                <span class="details-type-icon">${getFacilityIcon(facility)}</span>
            </div>
            <div class="details-body">
                ${(facility.image_1 || facility.image_2 || facility.image_3) ? `
                <div class="details-gallery">
                    ${[1, 2, 3]
                .filter(i => facility[`image_${i}`])
                .map((i, index, arr) => {
                    const allImages = arr.map(idx => `'${facility[`image_${idx}`]}'`).join(',');
                    return `
                                <div class="gallery-item">
                                    <img src="${facility[`image_${i}`]}" alt="${facility.name}" onclick="openLightbox([${allImages}], ${index})">
                                </div>
                            `;
                }).join('')}
                </div>` : ''}
                <div class="details-info">
                    <strong>📮</strong>
                    <span>${window.utils.escapeHTML(facility.address) || 'Adres bilgisi yok'}</span>
                </div>
                ${facility.phone ? `
                <div class="details-info">
                    <strong>📞</strong>
                    <a href="tel:${facility.phone}">${window.utils.escapeHTML(facility.phone)}</a>
                </div>` : ''}
                ${facility.website ? `
                <div class="details-info">
                    <strong>🌐</strong>
                    <a href="${window.utils.escapeHTML(facility.website)}" target="_blank">Web Sitesi</a>
                </div>` : ''}
                ${facility.email ? `
                <div class="details-info">
                    <strong>📧</strong>
                    <a href="mailto:${facility.email}">${window.utils.escapeHTML(facility.email)}</a>
                </div>` : ''}
                ${hasSocialMedia ? `
                <div class="details-info">
                    <strong>📱</strong>
                    <div class="details-social">
                        ${facility.facebook ? `<a href="${window.utils.escapeHTML(facility.facebook)}" target="_blank" class="social-link" title="Facebook"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>` : ''}
                        ${facility.instagram ? `<a href="${window.utils.escapeHTML(facility.instagram)}" target="_blank" class="social-link" title="Instagram"><svg viewBox="0 0 24 24" width="24" height="24"><defs><linearGradient id="ig-grad-detail" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#FD5949"/><stop offset="50%" style="stop-color:#D6249F"/><stop offset="100%" style="stop-color:#285AEB"/></linearGradient></defs><path fill="url(#ig-grad-detail)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771-4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>` : ''}
                        ${facility.twitter ? `<a href="${window.utils.escapeHTML(facility.twitter)}" target="_blank" class="social-link" title="X (Twitter)"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="#000000" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>` : ''}
                        ${facility.nsosyal ? `<a href="${window.utils.escapeHTML(facility.nsosyal)}" target="_blank" class="social-link" title="NSosyal"><svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="11" fill="#00A8E8"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Arial">N</text></svg></a>` : ''}
                    </div>
                </div>` : ''}
                <button class="report-error-btn" onclick="openReportModal(${facility.id}, '${window.utils.escapeHTML(facility.name).replace(/'/g, "\\'")}')">
                    ⚠️ Bilgilerde Hata Bildir
                </button>
            </div>
            <div class="details-actions">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}" 
                   target="_blank" class="details-btn">
                    🧭 Yol Tarifi
                </a>
                <a href="https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}&basemap=satellite" 
                   target="_blank" class="details-btn" style="background: linear-gradient(135deg, #4285f4 0%, #3367d6 100%);">
                    📍 Harita Detay
                </a>
                <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${facility.latitude},${facility.longitude}&heading=0&pitch=0&fov=80" 
                   target="_blank" class="details-btn" style="background: linear-gradient(135deg, #34a853 0%, #0f9d58 100%);">
                    🏙️ Sokak Görünümü
                </a>
            </div>
        </div>
    `;
}

function clearFacilityDetails() {
    const container = document.getElementById('facilityDetails');
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <span class="icon-large">📍</span>
            <p>Lütfen haritadan veya listeden bir tesis seçin.</p>
        </div>
    `;
}

// =====================================================
// FILTERS & SEARCH
// =====================================================

function applyFilters() {
    const districtId = document.getElementById('districtFilter').value;
    const typeId = document.getElementById('typeFilter').value;
    const facilityId = document.getElementById('facilityNameFilter').value;

    filteredFacilities = allFacilities.filter(facility => {
        const matchesDistrict = !districtId || facility.district_id == districtId;
        const matchesType = !typeId || facility.facility_type_id == typeId;
        const matchesFacility = !facilityId || facility.id == facilityId;
        return matchesDistrict && matchesType && matchesFacility;
    });

    displayFacilities();
    updateFacilityCount();
    showStatus(`${filteredFacilities.length} tesis gösteriliyor`, 'info');

    // Eğer belirli bir tesis seçildiyse, popup'ı aç
    if (facilityId) {
        viewFacility(facilityId);
    }
}

function clearFilters() {
    document.getElementById('districtFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('facilityNameFilter').value = '';
    document.getElementById('searchInput').value = '';

    // Repopulate facility name filter
    populateFacilityNameFilter();

    filteredFacilities = [...allFacilities];
    displayFacilities();
    updateFacilityCount();

    // Reset map view and clear sidebar details
    centerMap();
    clearFacilityDetails();

    showStatus('Filtreler temizlendi', 'info');
}

async function searchFacility() {
    const query = document.getElementById('searchInput').value.trim();

    if (!query) {
        showStatus('Lütfen arama terimi giriniz!', 'error');
        return;
    }

    // Hide suggestions when full search is triggered
    hideSuggestions();

    const result = await window.db.searchFacilities(query);

    if (result.success && result.data.length > 0) {
        filteredFacilities = result.data;
        displayFacilities();
        updateFacilityCount();
        showStatus(`${result.data.length} tesis bulundu`, 'success');
    } else {
        showStatus('Tesis bulunamadı!', 'error');
    }
}

// Live Search Functions
function handleLiveSearch(e) {
    const query = e.target.value.trim().toLocaleLowerCase('tr-TR');

    if (query.length < 3) {
        hideSuggestions();
        // If query is cleared, reset map and clear sidebar
        if (query.length === 0) {
            filteredFacilities = [...allFacilities];
            displayFacilities();
            updateFacilityCount();
            clearFacilityDetails();
        }
        return;
    }

    // Filter local data for live search
    const matches = allFacilities.filter(f =>
        f.name.toLocaleLowerCase('tr-TR').includes(query) ||
        (f.address && f.address.toLocaleLowerCase('tr-TR').includes(query))
    );

    renderSuggestions(matches);

    // Also filter the map markers in real-time
    filteredFacilities = matches;
    displayFacilities();
    updateFacilityCount();
}

function renderSuggestions(matches) {
    const container = document.getElementById('searchSuggestions');
    if (!container) return;

    if (matches.length === 0) {
        container.innerHTML = `
            <div class="suggestion-item">
                <span class="suggestion-icon">❓</span>
                <div class="suggestion-content">
                    <div class="suggestion-name">Sonuç bulunamadı</div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = matches.map(f => `
            <div class="suggestion-item" onclick="selectSuggestion(${f.id})">
                <span class="suggestion-icon">${getFacilityIcon(f)}</span>
                <div class="suggestion-content">
                    <div class="suggestion-name">${window.utils.escapeHTML(f.name)}</div>
                </div>
            </div>
        `).join('');
    }

    container.classList.add('active');
}

function selectSuggestion(facilityId) {
    const facility = allFacilities.find(f => f.id === facilityId);
    if (facility) {
        // Update search input value
        document.getElementById('searchInput').value = facility.name;
        hideSuggestions();

        // Single result view
        filteredFacilities = [facility];
        displayFacilities();
        updateFacilityCount();

        // Focus on map
        viewFacility(facilityId);
    }
}

function hideSuggestions() {
    const container = document.getElementById('searchSuggestions');
    if (container) {
        container.classList.remove('active');
    }
}

// =====================================================
// FACILITY ACTIONS
// =====================================================

function viewFacility(facilityId) {
    const facility = allFacilities.find(f => f.id === parseInt(facilityId));

    if (facility) {
        // First, zoom to the facility location
        map.setView([facility.latitude, facility.longitude], 18);

        // Wait a moment for the map to settle, then find and open the marker
        setTimeout(() => {
            let markerFound = false;

            // Get all markers from the cluster group
            markerClusterGroup.eachLayer(layer => {
                // Check if this is a marker (not a cluster) and match by facility ID
                if (layer instanceof L.Marker && layer.facilityId === facility.id) {
                    // If marker is in a cluster, zoom to show it
                    markerClusterGroup.zoomToShowLayer(layer, () => {
                        layer.openPopup();
                    });
                    markerFound = true;
                }
            });

            if (!markerFound) {
                console.warn('Marker not found for facility:', facility.name);
            }
        }, 300);

        // Show details in sidebar
        renderFacilityDetails(facility);

        // Auto-close sidebar on mobile to show the map
        closeMobileSidebar();

        showStatus('Tesise odaklandı', 'info');
    }
}

function getDirections(lat, lng, name) {
    // Open Google Maps with directions
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
    showStatus('Yol tarifi açılıyor...', 'info');
}

// =====================================================
// MAP CONTROLS
// =====================================================

function centerMap() {
    map.setView(KAHRAMANMARAS_CENTER, DEFAULT_ZOOM);
    showStatus('Harita merkezlendi', 'info');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        showStatus('Tam ekran modu', 'info');
    } else {
        document.exitFullscreen();
        showStatus('Tam ekrandan çıkıldı', 'info');
    }
}

async function refreshData() {
    showStatus('Veriler yenileniyor...', 'info');
    await loadFacilities();
}

// =====================================================
// UTILITIES
// =====================================================

function updateFacilityCount() {
    const count = filteredFacilities.length;
    document.getElementById('facilityCount').textContent = `(${count} Tesis)`;
}

function showStatus(message, type = 'info', duration = 3000) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type} show`;

    setTimeout(() => {
        statusEl.classList.remove('show');
    }, duration);
}

function setupEventListeners() {
    // Live search input listener
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleLiveSearch);

    // Hide suggestions on document click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSuggestions();
        }
    });

    // Enter key for search
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchFacility();
        }
    });

    // Update facility name filter when district or type changes
    document.getElementById('districtFilter').addEventListener('change', () => {
        updateFacilityTypeFilter(); // Filter types based on district
        populateFacilityNameFilter();
    });

    document.getElementById('typeFilter').addEventListener('change', () => {
        populateFacilityNameFilter();
    });

    // Focus map when a specific facility is selected from the dropdown
    document.getElementById('facilityNameFilter').addEventListener('change', (e) => {
        const facilityId = e.target.value;
        if (facilityId) {
            viewFacility(facilityId);
        }
    });

    // Report form submission
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }

    // Dynamic Input transformations
    document.querySelectorAll('.upper-input').forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.toLocaleUpperCase('tr-TR');
        });
    });

    const phoneInput = document.getElementById('suggested-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            if (val.length > 10) val = val.substring(0, 11);

            let masked = "";
            if (val.length > 0) masked += val[0];
            if (val.length > 1) masked += " " + val.substring(1, 4);
            if (val.length > 4) masked += " " + val.substring(4, 7);
            if (val.length > 7) masked += " " + val.substring(7, 9);
            if (val.length > 9) masked += " " + val.substring(9, 11);

            e.target.value = masked.trim();
        });
    }

    // Coordinate (Lat/Lng) masking - Refined
    const coordinateMask = (e) => {
        let val = e.target.value.replace(/[^\d.]/g, ''); // Sadece rakam ve nokta

        // Önce noktaları temizleyip rakamları normalize edelim
        let digits = val.replace(/\./g, '');

        // Maksimum hane sınırlaması (2 tam + 10 ondalık)
        if (digits.length > 12) digits = digits.substring(0, 12);

        if (digits.length > 2) {
            val = digits.substring(0, 2) + '.' + digits.substring(2);
        } else if (digits.length === 2 && e.inputType !== 'deleteContentBackward') {
            // Tam 2 rakam olduğunda otomatik nokta ekle
            val = digits + '.';
        } else {
            val = digits;
        }

        e.target.value = val;
    };

    const latInput = document.getElementById('suggested-latitude');
    const lngInput = document.getElementById('suggested-longitude');
    if (latInput) latInput.addEventListener('input', coordinateMask);
    if (lngInput) lngInput.addEventListener('input', coordinateMask);

    // Email validation (.com.tr pattern)
    const emailInput = document.getElementById('suggested-email');
    if (emailInput) {
        emailInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase();
        });

        emailInput.addEventListener('blur', (e) => {
            const val = e.target.value;
            if (val && !/^[a-z0-9._%+-]+@saglik\.gov\.tr$/.test(val)) {
                showStatus('E-posta adresi formatı uygun değil (Örn: kahramanmaras@saglik.gov.tr)', 'error');
                e.target.style.borderColor = 'var(--danger)';
            } else {
                e.target.style.borderColor = 'var(--border)';
            }
        });
    }
}

// =====================================================
// MOBILE RESPONSIVENESS
// =====================================================

function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuBtn = document.getElementById('mobileMenuBtn');

    const isActive = sidebar.classList.toggle('active');
    overlay.classList.toggle('active', isActive);
    menuBtn.classList.toggle('active', isActive);
}

function closeMobileSidebar() {
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const menuBtn = document.getElementById('mobileMenuBtn');

        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        menuBtn.classList.remove('active');
    }
}

// =====================================================
// ERROR REPORTING FUNCTIONS
// =====================================================

function openReportModal(facilityId, facilityName) {
    document.getElementById('reportFacilityId').value = facilityId;
    document.getElementById('reportFacilityName').textContent = facilityName;
    document.getElementById('reportModal').classList.add('active');
}

function closeReportModal() {
    document.getElementById('reportModal').classList.remove('active');
    document.getElementById('reportForm').reset();
    document.getElementById('suggestionFields').style.display = 'none';
}

function handleReportTypeChange(type) {
    const fieldsContainer = document.getElementById('suggestionFields');
    const allFields = document.querySelectorAll('.suggestion-field');

    // Hide all first
    allFields.forEach(f => f.style.display = 'none');

    if (!type || type === 'other' || type === 'closed') {
        fieldsContainer.style.display = 'none';
        return;
    }

    fieldsContainer.style.display = 'block';

    // Show relevant field
    const targetField = document.getElementById(`field-${type}`);
    if (targetField) {
        targetField.style.display = 'block';
    }
}

async function handleReportSubmit(e) {
    e.preventDefault();

    const facilityId = document.getElementById('reportFacilityId').value;
    const reportType = document.getElementById('reportType').value;
    const reportNote = document.getElementById('reportNote').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Get suggested data
    const suggestedData = {};
    if (reportType === 'name') suggestedData.name = document.getElementById('suggested-name').value;
    if (reportType === 'phone') suggestedData.phone = document.getElementById('suggested-phone').value;
    if (reportType === 'email') suggestedData.email = document.getElementById('suggested-email').value;
    if (reportType === 'website') suggestedData.website = document.getElementById('suggested-website').value;
    if (reportType === 'address') suggestedData.address = document.getElementById('suggested-address').value;
    if (reportType === 'location') {
        suggestedData.latitude = document.getElementById('suggested-latitude').value;
        suggestedData.longitude = document.getElementById('suggested-longitude').value;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Gönderiliyor...';

    const reportData = {
        facility_id: facilityId,
        report_type: reportType,
        reporter_note: reportNote,
        suggested_data: Object.keys(suggestedData).length > 0 ? suggestedData : null,
        status: 'pending'
    };

    const result = await window.db.submitReport(reportData);

    if (result.success) {
        showStatus('Bildiriminiz başarıyla iletildi. Teşekkür ederiz!', 'success');
        closeReportModal();
    } else {
        showStatus('Bildirim gönderilirken bir hata oluştu: ' + result.error, 'error');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Bildirimi Gönder';
}

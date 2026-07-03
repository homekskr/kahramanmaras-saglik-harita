// Liste Sayfası JavaScript

// Global değişkenler
let allFacilities = [];
let filteredFacilities = [];
let districts = [];
let facilityTypes = [];

// Tesis ikonunu getir (Özellikle hastaneler için 'Ⓗ' ikonunu zorunlu yap)
function getFacilityIcon(facility) {
    const typeName = (facility.facility_type_name || '').toUpperCase();

    // Hastane Kontrolü
    if (typeName === 'HASTANE' || typeName === 'HASTANE EK BİNA') {
        return '<div class="hospital-sign">H</div>';
    }

    // 112 Acil Sağlık İstasyonu Kontrolü (Hilal İkonlu Ambulans)
    if (typeName.includes('112') || typeName.includes('ACİL SAĞLIK')) {
        return `
            <div class="ambulance-icon-hilal" style="display: inline-block; width: 24px; height: 24px; vertical-align: middle;">
                <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#e21c21" d="M490.5 284h-14l-31.4-83.6c-4.6-12.1-16.1-20.4-29-20.4H304v-48c0-17.7-14.3-32-32-32H32c-17.7 0-32 14.3-32 32v240c0 17.7 14.3 32 32 32h21c10.4 34.2 42.1 59.1 79.9 59.1s69.5-24.9 79.9-59.1h145.7c10.4 34.2 42.1 59.1 79.9 59.1s69.5-24.9 79.9-59.1h7.1c10.8 0 19.5-8.7 19.5-19.5V303.5c0-10.8-8.7-19.5-19.5-19.5z"/>
                    <path fill="#fff" d="M304 212h92.5l22.5 60H304v-60zM32 128h240v144H32z"/>
                    <path fill="#e21c21" d="M130 145c-25 0-45 20-45 45s20 45 45 45c10 0 20-3 28-9-15-2-28-15-28-36s13-34 28-36c-8-6-18-9-28-9z" transform="translate(-10, 0)"/>
                </svg>
            </div>
        `;
    }

    // facility_type nesnesi içindeki icon'u veya düz icon bilgisini döndür
    return facility.facility_type_icon || (facility.facility_type?.icon) || '📍';
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
    checkURLParameter();
});

// Check URL for parameters (type, district)
function checkURLParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    const districtParam = urlParams.get('district');

    let filterApplied = false;

    // Handle Type Filter from URL
    if (typeParam) {
        const typeAliases = {
            'shm': 'sağlıklı hayat merkezi',
            'asm': 'aile sağlığı merkezi',
            'tsm': 'toplum sağlığı merkezi',
            'ism': 'ilçe sağlık müdürlüğü',
            'hastane': 'hastane',
            '112': '112 acil'
        };

        const lookupVal = typeParam.toLowerCase().trim();
        const mappedName = typeAliases[lookupVal] || lookupVal;

        const foundType = facilityTypes.find(t =>
            t.id == typeParam ||
            t.name.toLocaleLowerCase('tr-TR') === mappedName ||
            t.name.toLocaleLowerCase('tr-TR').includes(mappedName)
        );
        if (foundType) {
            const typeFilter = document.getElementById('typeFilter');
            if (typeFilter) {
                typeFilter.value = foundType.id;
                filterApplied = true;
            }
        }
    }

    // Handle District Filter from URL
    if (districtParam) {
        const foundDistrict = districts.find(d =>
            d.id == districtParam ||
            d.name.toLocaleLowerCase('tr-TR') === districtParam.toLocaleLowerCase('tr-TR')
        );
        if (foundDistrict) {
            const districtFilter = document.getElementById('districtFilter');
            if (districtFilter) {
                districtFilter.value = foundDistrict.id;
                filterApplied = true;
            }
        }
    }

    if (filterApplied) {
        // Trigger the cascade updates and apply filters
        updateTypeFilter();
        updateFacilityFilter();
        applyFilters();
    }
}

// Veri yükleme
async function loadData() {
    try {
        // Tesisleri yükle
        const { data: facilities, error: facilitiesError } = await window.supabase
            .from('facilities')
            .select(`
                *,
                district:districts(id, name),
                facility_type:facility_types(id, name, icon)
            `)
            .order('name');

        if (facilitiesError) throw facilitiesError;

        // Veriyi düzenle
        allFacilities = facilities.map(f => ({
            ...f,
            district_name: f.district?.name || 'Bilinmiyor',
            district_id: f.district?.id,
            facility_type_name: f.facility_type?.name || 'Bilinmiyor',
            facility_type_id: f.facility_type?.id,
            facility_type_icon: f.facility_type?.icon || 'Ⓗ'
        }));

        // Hastane ikonlarını zorunlu olarak 'Ⓗ' yap
        allFacilities = allFacilities.map(f => ({
            ...f,
            facility_type_icon: getFacilityIcon(f)
        }));

        filteredFacilities = [...allFacilities];

        // İlçeleri yükle
        const { data: districtsData, error: districtsError } = await supabase
            .from('districts')
            .select('*')
            .order('name');

        if (districtsError) throw districtsError;
        districts = districtsData;

        // Tesis türlerini yükle
        const { data: typesData, error: typesError } = await supabase
            .from('facility_types')
            .select('*')
            .order('name');

        if (typesError) throw typesError;
        facilityTypes = typesData;

        // UI'ı doldur
        populateFilters();
        renderTable();
        updateResultsCount();

    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        showError('Veriler yüklenirken bir hata oluştu.');
    }
}

// Filtreleri doldur
function populateFilters() {
    const districtFilter = document.getElementById('districtFilter');
    const typeFilter = document.getElementById('typeFilter');
    const facilityFilter = document.getElementById('facilityFilter');

    // İlçeler
    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district.id;
        option.textContent = district.name;
        districtFilter.appendChild(option);
    });

    // Tesis türleri
    facilityTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        // Dropdown'larda HTML desteklenmediği için [H] şeklinde gösterelim
        const iconLabel = (type.name.toUpperCase() === 'HASTANE' || type.name.toUpperCase() === 'HASTANE EK BİNA') ? '[H]' : (type.icon || '📍');
        option.textContent = `${iconLabel} ${type.name}`;
        typeFilter.appendChild(option);
    });

    // Tesis adları
    const sortedFacilities = [...allFacilities].sort((a, b) =>
        a.name.localeCompare(b.name, 'tr')
    );

    sortedFacilities.forEach(facility => {
        const option = document.createElement('option');
        option.value = facility.id;
        option.textContent = facility.name;
        facilityFilter.appendChild(option);
    });
}

// Event listener'lar
function setupEventListeners() {
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');
    const searchInput = document.getElementById('searchInput');
    const districtFilter = document.getElementById('districtFilter');
    const typeFilter = document.getElementById('typeFilter');
    const facilityFilter = document.getElementById('facilityFilter');

    applyBtn.addEventListener('click', applyFilters);
    clearBtn.addEventListener('click', clearFilters);

    // Cascade filtering - update dependent dropdowns and auto-filter
    districtFilter.addEventListener('change', () => {
        updateTypeFilter();
        updateFacilityFilter();
        applyFilters(); // Otomatik filtrele
    });

    typeFilter.addEventListener('change', () => {
        updateFacilityFilter();
        applyFilters(); // Otomatik filtrele
    });

    facilityFilter.addEventListener('change', () => {
        applyFilters(); // Otomatik filtrele
    });

    // Akıllı arama - debounced
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 300);
    });
}

// Tür filtresini güncelle (seçili ilçeye göre)
function updateTypeFilter() {
    const districtId = document.getElementById('districtFilter').value;
    const typeFilter = document.getElementById('typeFilter');
    const currentTypeId = typeFilter.value;

    // Seçili ilçeye göre mevcut türleri bul
    let availableTypes = facilityTypes;

    if (districtId) {
        const facilitiesInDistrict = allFacilities.filter(f => f.district_id == districtId);
        const typeIds = [...new Set(facilitiesInDistrict.map(f => f.facility_type_id))];
        availableTypes = facilityTypes.filter(t => typeIds.includes(t.id));
    }

    // Dropdown'ı yeniden doldur
    typeFilter.innerHTML = '<option value="">Tüm Türler</option>';
    availableTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        const iconLabel = (type.name.toUpperCase() === 'HASTANE' || type.name.toUpperCase() === 'HASTANE EK BİNA') ? 'Ⓗ' : (type.icon || '📍');
        option.textContent = `${iconLabel} ${type.name}`;
        if (type.id == currentTypeId) option.selected = true;
        typeFilter.appendChild(option);
    });
}

// Tesis filtresini güncelle (seçili ilçe ve türe göre)
function updateFacilityFilter() {
    const districtId = document.getElementById('districtFilter').value;
    const typeId = document.getElementById('typeFilter').value;
    const facilityFilter = document.getElementById('facilityFilter');
    const currentFacilityId = facilityFilter.value;

    // Seçili ilçe ve türe göre mevcut tesisleri bul
    let availableFacilities = allFacilities.filter(facility => {
        const matchesDistrict = !districtId || facility.district_id == districtId;
        const matchesType = !typeId || facility.facility_type_id == typeId;
        return matchesDistrict && matchesType;
    });

    // Alfabetik sırala
    availableFacilities.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    // Dropdown'ı yeniden doldur
    facilityFilter.innerHTML = '<option value="">Tesis Seçiniz</option>';

    if (availableFacilities.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Tesis bulunamadı';
        option.disabled = true;
        facilityFilter.appendChild(option);
    } else {
        availableFacilities.forEach(facility => {
            const option = document.createElement('option');
            option.value = facility.id;
            option.textContent = facility.name;
            if (facility.id == currentFacilityId) option.selected = true;
            facilityFilter.appendChild(option);
        });
    }
}

// Filtreleri uygula
function applyFilters() {
    const districtId = document.getElementById('districtFilter').value;
    const typeId = document.getElementById('typeFilter').value;
    const facilityId = document.getElementById('facilityFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();

    filteredFacilities = allFacilities.filter(facility => {
        const matchesDistrict = !districtId || facility.district_id == districtId;
        const matchesType = !typeId || facility.facility_type_id == typeId;
        const matchesFacility = !facilityId || facility.id == facilityId;

        const matchesSearch = !searchQuery ||
            facility.name.toLowerCase().includes(searchQuery) ||
            facility.district_name.toLowerCase().includes(searchQuery) ||
            facility.facility_type_name.toLowerCase().includes(searchQuery) ||
            (facility.address && facility.address.toLowerCase().includes(searchQuery));

        return matchesDistrict && matchesType && matchesFacility && matchesSearch;
    });

    renderTable();
    updateResultsCount();
}

// Filtreleri temizle
function clearFilters() {
    document.getElementById('districtFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('facilityFilter').value = '';
    document.getElementById('searchInput').value = '';

    // Tüm dropdown'ları yeniden doldur
    updateTypeFilter();
    updateFacilityFilter();

    filteredFacilities = [...allFacilities];
    renderTable();
    updateResultsCount();
}

// Tabloyu render et
function renderTable() {
    const tbody = document.getElementById('facilitiesTableBody');

    if (filteredFacilities.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <p>Aradığınız kriterlere uygun tesis bulunamadı.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredFacilities.map(facility => `
        <tr>
            <td>${facility.district_name}</td>
            <td>${facility.facility_type_icon} ${facility.facility_type_name}</td>
            <td><strong>${facility.name}</strong></td>
            <td>${facility.address || 'Adres bilgisi yok'}</td>
            <td class="action-column">
                <button class="map-btn" onclick="showOnMap(${facility.id})">
                    🗺️ Haritada Göster
                </button>
            </td>
        </tr>
    `).join('');
}

// Sonuç sayısını güncelle
function updateResultsCount() {
    document.getElementById('resultsCount').textContent = filteredFacilities.length;
}

// Haritada göster
function showOnMap(facilityId) {
    window.location.href = `/?facility=${facilityId}`;
}

// Hata göster
function showError(message) {
    const tbody = document.getElementById('facilitiesTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="5">
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <p>${message}</p>
                </div>
            </td>
        </tr>
    `;
}

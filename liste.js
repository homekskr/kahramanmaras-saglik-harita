// Liste Sayfası JavaScript

// Global değişkenler
let allFacilities = [];
let filteredFacilities = [];
let districts = [];
let facilityTypes = [];

// Tesis ikonunu getir (Özellikle hastaneler için 'Ⓗ' ikonunu zorunlu yap)
function getFacilityIcon(facility) {
    const typeName = (facility.facility_type_name || '').toUpperCase();
    if (typeName === 'HASTANE' || typeName === 'HASTANE EK BİNA') {
        return '<div class="hospital-sign">H</div>';
    }
    // facility_type nesnesi içindeki icon'u veya düz icon bilgisini döndür
    return facility.facility_type_icon || (facility.facility_type?.icon) || '📍';
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
});

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
        const iconLabel = (type.name.toUpperCase() === 'HASTANE' || type.name.toUpperCase() === 'HASTANE EK BİNA') ? '[H]' : (type.icon || '📍');
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

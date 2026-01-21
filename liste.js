// Liste Sayfası JavaScript

// Global değişkenler
let allFacilities = [];
let filteredFacilities = [];
let districts = [];
let facilityTypes = [];

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
});

// Veri yükleme
async function loadData() {
    try {
        // Tesisleri yükle
        const { data: facilities, error: facilitiesError } = await supabase
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
            facility_type_icon: f.facility_type?.icon || '🏥'
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
        option.textContent = `${type.icon || '🏥'} ${type.name}`;
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

    applyBtn.addEventListener('click', applyFilters);
    clearBtn.addEventListener('click', clearFilters);

    // Akıllı arama - debounced
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 300);
    });
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

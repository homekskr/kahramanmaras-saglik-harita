// =====================================================
// SUPABASE CONFIGURATION
// =====================================================

// IMPORTANT: Supabase bilgilerinizi buraya girin
// Supabase Dashboard > Settings > API

// Expose to window for app.js access
window.SUPABASE_CONFIG = {
    // Supabase Project URL
    url: 'https://kttsqaleekacfyseqlmf.supabase.co',

    // Supabase Anon/Public Key
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dHNxYWxlZWthY2Z5c2VxbG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzA0MjIsImV4cCI6MjA4NDI0NjQyMn0.g3oOl4Ohg4CtM2DmbTqhkYMoAyyCBMjxLjAe_amob88'
};

// =====================================================
// SUPABASE CLIENT INITIALIZATION
// =====================================================

// Check if supabase library is loaded
if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    // Supabase library is loaded, create client
    const supabaseLib = window.supabase;

    // Create client and assign to window
    window.supabase = supabaseLib.createClient(
        window.SUPABASE_CONFIG.url,
        window.SUPABASE_CONFIG.anonKey
    );

    console.log('Supabase client initialized successfully');
} else {
    console.error('Supabase library not loaded yet');
}

// =====================================================
// DATABASE FUNCTIONS
// =====================================================

/**
 * Tüm ilçeleri getir
 */
async function getDistricts() {
    try {
        const { data, error } = await window.supabase
            .from('districts')
            .select('*')
            .order('name');

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('İlçeler yüklenirken hata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Tüm tesis türlerini getir
 */
async function getFacilityTypes() {
    try {
        const { data, error } = await window.supabase
            .from('facility_types')
            .select('*')
            .order('display_order');

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Tesis türleri yüklenirken hata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Tüm tesisleri getir (detaylı bilgilerle)
 */
async function getAllFacilities() {
    try {
        const { data, error } = await window.supabase
            .from('facilities_full')
            .select('*');

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Tesisler yüklenirken hata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * İlçeye göre tesisleri getir
 */
async function getFacilitiesByDistrict(districtId) {
    try {
        const { data, error } = await window.supabase
            .from('facilities_full')
            .select('*')
            .eq('district_id', districtId);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Tesisler yüklenirken hata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Tür göre tesisleri getir
 */
async function getFacilitiesByType(typeId) {
    try {
        const { data, error } = await window.supabase
            .from('facilities_full')
            .select('*')
            .eq('facility_type_id', typeId);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Tesisler yüklenirken hata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Tüm tesisleri getir (admin paneli için)
 */
async function getFacilities() {
    try {
        const { data, error } = await window.supabase
            .from('facilities_full')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Tesisler yüklenirken hata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Tesis ara (isim veya adrese göre)
 */
async function searchFacilities(query) {
    try {
        const { data, error } = await window.supabase
            .from('facilities_full')
            .select('*')
            .or(`name.ilike.%${query}%,address.ilike.%${query}%`);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Arama sırasında hata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Yeni tesis ekle
 */
async function addFacility(facilityData) {
    try {
        const { data, error } = await window.supabase
            .from('facilities')
            .insert([facilityData])
            .select();

        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Tesis eklenirken hata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Tesis güncelle
 */
async function updateFacility(facilityId, updates) {
    try {
        const { data, error } = await window.supabase
            .from('facilities')
            .update(updates)
            .eq('id', facilityId)
            .select();

        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Tesis güncellenirken hata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Tesis sil (Hard delete)
 */
async function deleteFacility(facilityId) {
    try {
        const { error } = await window.supabase
            .from('facilities')
            .delete()
            .eq('id', facilityId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Tesis silinirken hata:', error);
        return { success: false, error: error.message };
    }
}

// =====================================================
// GEOCODING FUNCTIONS (Nominatim - OpenStreetMap)
// =====================================================

/**
 * Adres → Koordinat dönüşümü (Geocoding)
 * Ücretsiz Nominatim API kullanır
 */
async function geocodeAddress(address) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Kahramanmaraş, Türkiye')}&limit=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Saglik-Tesisleri-Harita-App'
            }
        });

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                success: true,
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        } else {
            return {
                success: false,
                error: 'Adres bulunamadı'
            };
        }
    } catch (error) {
        console.error('Geocoding hatası:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Koordinat → Adres dönüşümü (Reverse Geocoding)
 */
async function reverseGeocode(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Saglik-Tesisleri-Harita-App'
            }
        });

        const data = await response.json();

        if (data && data.display_name) {
            return {
                success: true,
                address: data.display_name,
                details: data.address
            };
        } else {
            return {
                success: false,
                error: 'Adres bulunamadı'
            };
        }
    } catch (error) {
        console.error('Reverse geocoding hatası:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// =====================================================
/**
 * Hata bildirimi gönder
 */
async function submitReport(reportData) {
    try {
        const { data, error } = await window.supabase
            .from('facility_reports')
            .insert([reportData])
            .select();

        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Bildirim gönderilirken hata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Tüm bildirimleri getir (admin paneli için)
 */
async function getReports() {
    try {
        const { data, error } = await window.supabase
            .from('facility_reports')
            .select(`
                *,
                facility:facilities(name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Bildirimler yüklenirken hata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Bildirimi işle (Onayla/Reddet)
 */
async function updateReportStatus(reportId, status) {
    try {
        const { data, error } = await window.supabase
            .from('facility_reports')
            .update({
                status: status,
                processed_at: new Date().toISOString()
            })
            .eq('id', reportId)
            .select();

        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Bildirim güncellenirken hata:', error);
        return { success: false, error: error.message };
    }
}

// EXPORT
// =====================================================

// Global scope'a ekle
window.db = {
    getDistricts,
    getFacilityTypes,
    getAllFacilities,
    getFacilitiesByDistrict,
    getFacilitiesByType,
    searchFacilities,
    getFacilities, // Use the new getFacilities function for admin panel
    createFacility: addFacility, // Alias for admin panel
    addFacility,
    updateFacility,
    deleteFacility,
    geocodeAddress,
    reverseGeocode,
    submitReport,
    getReports,
    updateReportStatus
};

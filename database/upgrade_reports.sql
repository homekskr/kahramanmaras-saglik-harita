-- =====================================================
-- DATABASE UPDATE: Hata Bildirim Sistemi Revizyonu
-- Tarih: 2026-02-03
-- =====================================================

-- 1. facility_reports tablosuna suggested_data kolonunu ekle
-- Bu kolon önerilen yeni bilgileri JSON formatında tutacak
ALTER TABLE facility_reports ADD COLUMN IF NOT EXISTS suggested_data JSONB;

-- 2. Eğer varsa eski kısıtlamaları kaldır veya güncelle
-- (Su an için gerek yok ama genişletilebilir)

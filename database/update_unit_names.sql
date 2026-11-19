-- =====================================================
-- ASM BİRİMLERİNİ YENİ FORMATLA GÜNCELLEME MİGRASYONU
-- Format: 46.XX.YYY [İLÇE ADI] [YYY] NOLU AİLE HEKİMLİĞİ BİRİMİ
-- Örnek: 46.01.001 AFŞİN 001 NOLU AİLE HEKİMLİĞİ BİRİMİ
-- =====================================================

-- 1. İlçe kodları referans fonksiyonu veya doğrudan UPDATE
UPDATE facility_units
SET unit_code = 
    CASE 
        -- Zaten tam formatlanmışsa dokunma
        WHEN unit_code ILIKE '%AİLE HEKİMLİĞİ BİRİMİ%' THEN unit_code

        -- 46.XX.YY formatı için ilçe kodlarına göre dönüştür
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('01', '1') THEN 
            trim(unit_code) || ' AFŞİN ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'

        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('02', '2') THEN 
            trim(unit_code) || ' ANDIRIN ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'

        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('03', '3') THEN 
            trim(unit_code) || ' ÇAĞLAYANCERİT ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'

        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('04', '4') THEN 
            trim(unit_code) || ' EKİNÖZÜ ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'

        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('05', '5') THEN 
            trim(unit_code) || ' ELBİSTAN ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'

        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('06', '6') THEN 
            trim(unit_code) || ' GÖKSUN ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'

        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('07', '7') THEN 
            trim(unit_code) || ' NURHAK ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'

        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('08', '8') THEN 
            trim(unit_code) || ' PAZARCIK ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'

        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('09', '9') THEN 
            trim(unit_code) || ' TÜRKOĞLU ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'

        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) = '10' THEN 
            trim(unit_code) || ' ONİKİŞUBAT ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'

        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) = '11' THEN 
            trim(unit_code) || ' DULKADİROĞLU ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'

        -- Eğer kod yukarıdaki şablona uymuyorsa bağlı olduğu tesisin ilçesini kullanarak tamamla
        ELSE unit_code
    END
WHERE unit_code NOT ILIKE '%AİLE HEKİMLİĞİ BİRİMİ%';

-- 2. Kontrol için sonuçları listele
SELECT id, facility_id, unit_code 
FROM facility_units 
ORDER BY unit_code
LIMIT 20;

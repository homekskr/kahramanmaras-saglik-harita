-- =====================================================
-- ASM BİRİMLERİNDEN 46.XX.YYY KODLARINI KALDIRMA MİGRASYONU
-- Hedef Format: [İLÇE ADI] [YYY] NOLU AİLE HEKİMLİĞİ BİRİMİ
-- Örnek: AFŞİN 001 NOLU AİLE HEKİMLİĞİ BİRİMİ
-- =====================================================

-- 1. Başında '46.xx.yyy ' veya '46.xx.yy ' olan kayıtların başındaki kodu temizle
UPDATE facility_units
SET unit_code = regexp_replace(trim(unit_code), '^46\.\d{1,2}\.\d{1,3}\s+', '', 'i')
WHERE unit_code ~* '^46\.\d{1,2}\.\d{1,3}\s+';

-- 2. Eğer henüz sadece 46.xx.yyy şeklinde olan kayıtlar varsa onları da ilçe ve no ile formatla (başında 46 kodu olmadan)
UPDATE facility_units
SET unit_code = 
    CASE 
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('01', '1') THEN 
            'AFŞİN ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('02', '2') THEN 
            'ANDIRIN ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('03', '3') THEN 
            'ÇAĞLAYANCERİT ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('04', '4') THEN 
            'EKİNÖZÜ ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('05', '5') THEN 
            'ELBİSTAN ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('06', '6') THEN 
            'GÖKSUN ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('07', '7') THEN 
            'NURHAK ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('08', '8') THEN 
            'PAZARCIK ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) IN ('09', '9') THEN 
            'TÜRKOĞLU ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) = '10' THEN 
            'ONİKİŞUBAT ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'
        WHEN split_part(trim(unit_code), '.', 1) = '46' AND split_part(trim(unit_code), '.', 2) = '11' THEN 
            'DULKADİROĞLU ' || split_part(trim(unit_code), '.', 3) || ' NOLU AİLE HEKİMLİĞİ BİRİMİ'
        ELSE unit_code
    END
WHERE unit_code ~ '^46\.\d{1,2}\.\d{1,3}$';

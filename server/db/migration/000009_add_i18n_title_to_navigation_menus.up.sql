-- Add title_id and title_en columns to navigation_menus table
ALTER TABLE navigation_menus
ADD COLUMN title_id VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN title_en VARCHAR(100) NOT NULL DEFAULT '';

-- Populate default values for initial seeded navigation menus
UPDATE navigation_menus SET title_id = 'Beranda', title_en = 'Home' WHERE id = '10000000-0000-0000-0000-000000000101';
UPDATE navigation_menus SET title_id = 'Tautan', title_en = 'Links' WHERE id = '10000000-0000-0000-0000-000000000102';
UPDATE navigation_menus SET title_id = 'Administrasi', title_en = 'Administration' WHERE id = '10000000-0000-0000-0000-000000000103';
UPDATE navigation_menus SET title_id = 'Pengaturan', title_en = 'Settings' WHERE id = '10000000-0000-0000-0000-000000000104';

UPDATE navigation_menus SET title_id = 'Ringkasan', title_en = 'Overview' WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE navigation_menus SET title_id = 'Tautan Saya', title_en = 'My Links' WHERE id = '10000000-0000-0000-0000-000000000002';
UPDATE navigation_menus SET title_id = 'Analitik', title_en = 'Analytics' WHERE id = '10000000-0000-0000-0000-000000000003';
UPDATE navigation_menus SET title_id = 'Ringkasan Admin', title_en = 'Overview' WHERE id = '10000000-0000-0000-0000-000000000004';
UPDATE navigation_menus SET title_id = 'Manajemen Pengguna', title_en = 'Users Lifecycle' WHERE id = '10000000-0000-0000-0000-000000000005';
UPDATE navigation_menus SET title_id = 'Peran & Akses (RBAC)', title_en = 'Roles & RBAC' WHERE id = '10000000-0000-0000-0000-000000000006';
UPDATE navigation_menus SET title_id = 'Manajemen Menu', title_en = 'Menu Builder' WHERE id = '10000000-0000-0000-0000-000000000007';
UPDATE navigation_menus SET title_id = 'Kontrol Tautan Global', title_en = 'Global Link Control' WHERE id = '10000000-0000-0000-0000-000000000008';
UPDATE navigation_menus SET title_id = 'Log Audit Security', title_en = 'Audit Trail Logs' WHERE id = '10000000-0000-0000-0000-000000000009';
UPDATE navigation_menus SET title_id = 'Konfigurasi Sistem', title_en = 'System Config' WHERE id = '10000000-0000-0000-0000-000000000010';
UPDATE navigation_menus SET title_id = 'Profil Akun', title_en = 'Account Profile' WHERE id = '10000000-0000-0000-0000-000000000011';

-- Fallback for any other menu items where title_id or title_en might be empty
UPDATE navigation_menus SET title_id = title WHERE title_id = '';
UPDATE navigation_menus SET title_en = title WHERE title_en = '';

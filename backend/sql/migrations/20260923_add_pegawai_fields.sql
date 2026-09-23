/* 
====================================================================
 DATABASE MIGRATION - LUAR JENDELA CREATRIP
 Tanggal: 23 September 2026
 Fitur: Kolom No. HP dan Status pada Tabel Users untuk Manajemen Pegawai
====================================================================
*/

-- 1. Tambahkan kolom phone jika belum ada
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `phone` VARCHAR(30) NULL AFTER `email`;

-- 2. Tambahkan kolom status jika belum ada (aktif / nonaktif)
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `status` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif' AFTER `role`;

-- 3. Pastikan user yang sudah ada berstatus aktif
UPDATE `users` SET `status` = 'aktif' WHERE `status` IS NULL OR `status` = '';

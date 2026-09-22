/* 
====================================================================
 DATABASE MIGRATION - LUAR JENDELA CREATRIP
 Tanggal: 22 September 2026
 Cocok untuk: MariaDB / MySQL (phpMyAdmin, CLI, DBeaver)
====================================================================
*/

-- 1. Jadikan plat nomor armada opsional (boleh NULL)
ALTER TABLE `fleets` MODIFY COLUMN `license_plate` VARCHAR(50) NULL DEFAULT NULL;

-- 2. Hapus index UNIQUE pada plat nomor agar bisa input tanpa nomor polisi
ALTER TABLE `fleets` DROP INDEX IF EXISTS `license_plate`;

-- 3. Tambahkan kolom tanggal pulang (end_date) pada tabel reservasi jika belum ada
ALTER TABLE `reservations` ADD COLUMN IF NOT EXISTS `end_date` DATE NULL AFTER `usage_date`;

-- 4. Samakan end_date reservasi lama dengan usage_date
UPDATE `reservations` SET `end_date` = `usage_date` WHERE `end_date` IS NULL;

-- 5. Tambahkan kolom link pembayaran Midtrans (snap_redirect_url) pada invoice jika belum ada
ALTER TABLE `invoices` ADD COLUMN IF NOT EXISTS `snap_redirect_url` VARCHAR(500) NULL AFTER `snap_token`;

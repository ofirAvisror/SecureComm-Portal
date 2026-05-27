const fs = require('fs');
const path = require('path');

const policyPath = path.join(__dirname, 'password-policy.json');
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

let commonPasswords = new Set();
if (policy.blockCommonPasswords && policy.commonPasswordsFile) {
  const dictPath = path.join(__dirname, policy.commonPasswordsFile);
  if (fs.existsSync(dictPath)) {
    const lines = fs.readFileSync(dictPath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim().toLowerCase())
      .filter(Boolean);
    commonPasswords = new Set(lines);
  }
}

module.exports = {
  passwordPolicy: policy,
  commonPasswords
};

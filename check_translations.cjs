const fs = require('fs');
const content = fs.readFileSync('src/i18n/translations.ts', 'utf8');

const enMatch = content.match(/en:\s*\{([\s\S]*?)\n  \},\n  fa:/);
const faMatch = content.match(/fa:\s*\{([\s\S]*?)\n  \},\n  ps:/);
const psMatch = content.match(/ps:\s*\{([\s\S]*?)\n  \}/);

function extractKeys(text) {
  if (!text) return [];
  const regex = /^\s*([a-zA-Z0-9_]+):/gm;
  let keys = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

const enKeys = extractKeys(enMatch[1]);
const faKeys = extractKeys(faMatch[1]);
const psKeys = extractKeys(psMatch[1]);

console.log(`Total EN keys: ${enKeys.length}`);
console.log(`Total FA keys: ${faKeys.length}`);
console.log(`Total PS keys: ${psKeys.length}`);

const faMissing = enKeys.filter(k => !faKeys.includes(k));
const psMissing = enKeys.filter(k => !psKeys.includes(k));

console.log('FA Missing:', faMissing);
console.log('PS Missing:', psMissing);

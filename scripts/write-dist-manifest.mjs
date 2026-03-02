import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('manifest.json', 'utf8');
const manifest = JSON.parse(raw);

const stripDistPrefix = (value) => String(value || '').replace(/^dist\//, '');

manifest.content_scripts = (manifest.content_scripts || []).map((entry) => ({
  ...entry,
  js: Array.isArray(entry.js) ? entry.js.map(stripDistPrefix) : entry.js,
  css: Array.isArray(entry.css) ? entry.css.map(stripDistPrefix) : entry.css,
}));

if (manifest.action?.default_popup) {
  manifest.action.default_popup = stripDistPrefix(manifest.action.default_popup);
}

writeFileSync('dist/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

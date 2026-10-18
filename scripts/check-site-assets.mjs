import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

// Check the publish directory, not the working tree: stale local artwork must
// never conceal an omitted clean-build export. Include both playback modes.
export function checkSiteAssets(directory) {
  const root = path.resolve(directory), checked = new Set();
  const pages = [], stylesheets = [];
  const cssURLs = text => [...text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g)].map(match => match[1] ?? match[2] ?? match[3].trim());
  function walk(folder) {
    for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, item.name);
      if (item.isDirectory()) walk(file);
      else if (item.name.endsWith('.html')) pages.push(file);
      else if (item.name.endsWith('.css')) stylesheets.push(file);
    }
  }
  walk(root);
  if (!pages.length) throw new Error('No built HTML pages to verify.');
  const sources = [];
  for (const page of pages) {
    const relative = path.relative(root, page).split(path.sep).join('/');
    const document = new JSDOM(fs.readFileSync(page, 'utf8')).window.document;
    const refs = [];
    for (const element of document.querySelectorAll('[src], [srcset], [data-animated], [data-still], link[href], a[href]')) {
      for (const key of ['src', 'data-animated', 'data-still']) {
        if (element.hasAttribute(key)) refs.push(element.getAttribute(key));
      }
      if (element.hasAttribute('srcset')) {
        refs.push(...element.getAttribute('srcset').split(',').map(item => item.trim().split(/\s+/)[0]));
      }
      if (element.tagName === 'LINK' || (element.tagName === 'A' && /\.svg(?:[?#]|$)/i.test(element.getAttribute('href')))) refs.push(element.getAttribute('href'));
    }
    for (const style of document.querySelectorAll('style, [style]')) refs.push(...cssURLs(style.tagName === 'STYLE' ? style.textContent : style.getAttribute('style')));
    sources.push({ relative, refs });
  }
  for (const file of stylesheets) sources.push({ relative: path.relative(root, file).split(path.sep).join('/'), refs: cssURLs(fs.readFileSync(file, 'utf8')) });
  for (const { relative, refs } of sources) {
    for (const ref of refs) {
      if (!ref || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(ref)) continue;
      if (ref.startsWith('/')) throw new Error(`Asset must support nested routes: ${relative} references ${ref}`);
      const url = new URL(ref, `https://built.invalid/${relative}`);
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0) {
        throw new Error(`Missing built asset: ${relative} references ${ref}`);
      }
      if (file.endsWith('.svg') && !checked.has(file)) {
        const svg = new JSDOM(fs.readFileSync(file, 'utf8'), { contentType: 'image/svg+xml' }).window.document;
        if (svg.documentElement.localName !== 'svg') throw new Error(`Invalid built SVG: ${file}`);
      }
      checked.add(file);
    }
  }
  console.log(`Built asset check: PASS (${pages.length} HTML pages, ${checked.size} local assets including animated/still SVGs).`);
  return { pages: pages.length, assets: checked.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkSiteAssets(process.argv[2] || path.resolve(import.meta.dirname, '../dist'));
}

#!/usr/bin/env node
// Moves files inside one package with `git mv` and rewrites every relative path that
// pointed at them, so a layered layout can become a modular one without changing code.
//
//   node tools/move-modules.js --root ecommerce-server --map tools/maps/commerce.json [--dry-run]
//
// The map is a JSON object of { "old/path.js": "new/path.js" } relative to --root. A key
// may also be a directory ("core/cart": "modules/cart/core"); every file under it moves.
//
// What gets rewritten:
//   * Any quoted relative path ('./x', '../y/z.js') in a .js file of the package that
//     resolves (Node-style: exact, .js, or /index.js) to a file in the package. This covers
//     require(), require.resolve() and path.join(__dirname, '../x.js'). Paths are recomputed
//     both when the target moves and when the file containing them moves.
//   * In Markdown files and CODEOWNERS/OWNERSHIP files anywhere in the repo: relative links
//     that resolve to a moved file, and literal "<package>/<old path>" mentions.
// Paths built from several path.join() segments are not detected; the tool lists every
// such __dirname usage in moved files so they can be checked by hand.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes('--dry-run');
const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const root = path.resolve(opt('--root') || '.');
const mapFile = opt('--map');
if (!mapFile) { console.error('Missing --map <file.json>'); process.exit(1); }
const rawMap = JSON.parse(fs.readFileSync(path.resolve(mapFile), 'utf8'));

const SKIP = new Set(['node_modules', '.git', 'logs', 'coverage', 'dist', 'build']);
function walk(dir, pred, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, out); else if (pred(p)) out.push(p);
  }
  return out;
}
const toPosix = (p) => p.split(path.sep).join('/');

// ---- expand the map into absolute file moves ----
const moves = new Map(); // oldAbs -> newAbs
for (const [from, to] of Object.entries(rawMap)) {
  const src = path.join(root, from);
  if (!fs.existsSync(src)) { console.error(`Map source does not exist: ${from}`); process.exit(1); }
  if (fs.statSync(src).isDirectory()) {
    for (const f of walk(src, () => true)) moves.set(f, path.join(root, to, path.relative(src, f)));
  } else {
    moves.set(src, path.join(root, to));
  }
}
const newOf = (abs) => moves.get(abs) || abs;
const targets = new Set([...moves.values()]);
for (const t of targets) {
  if (fs.existsSync(t) && !moves.has(t)) { console.error(`Destination already exists: ${toPosix(path.relative(root, t))}`); process.exit(1); }
}

// Resolves a relative spec the way require() does and remembers which form matched,
// so the rewritten spec keeps the same style ('../models' stays a folder import).
function resolveSpec(fromDir, spec) {
  const base = path.resolve(fromDir, spec);
  const forms = [['exact', base], ['ext', base + '.js'], ['index', path.join(base, 'index.js')]];
  for (const [kind, c] of forms) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return { file: c, kind };
  }
  return null;
}
function buildSpec(fromDir, hit) {
  const newTarget = newOf(hit.file);
  let dest = newTarget;
  if (hit.kind === 'ext') dest = newTarget.replace(/\.js$/, '');
  if (hit.kind === 'index') dest = path.dirname(newTarget);
  let rel = toPosix(path.relative(fromDir, dest)) || '.';
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

// ---- rewrite JS files in the package ----
const jsFiles = walk(root, (p) => p.endsWith('.js'));
const literal = /(['"`])(\.{1,2}\/[^'"`\n$]*)\1/g;
const edits = new Map(); // oldAbs -> new content
let jsRewrites = 0;
const manual = [];
for (const file of jsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const oldDir = path.dirname(file);
  const newDir = path.dirname(newOf(file));
  const out = src.replace(literal, (whole, q, spec) => {
    const hit = resolveSpec(oldDir, spec);
    if (!hit) return whole;
    if (!moves.has(hit.file) && oldDir === newDir) return whole;
    const next = buildSpec(newDir, hit);
    if (next === spec) return whole;
    jsRewrites += 1;
    return `${q}${next}${q}`;
  });
  if (moves.has(file) && /__dirname/.test(src)) manual.push(toPosix(path.relative(repo, file)));
  if (out !== src) edits.set(file, out);
}

// ---- rewrite docs and ownership files across the repo ----
const pkgName = toPosix(path.relative(repo, root));
const docFiles = walk(repo, (p) => /\.md$/i.test(p) || /(^|[\\/])(CODEOWNERS|OWNERSHIP)(\.md)?$/.test(p));
const pairs = [...moves].map(([o, n]) => [toPosix(path.relative(repo, o)), toPosix(path.relative(repo, n))]);
for (const [from, to] of Object.entries(rawMap)) {
  if (fs.statSync(path.join(root, from)).isDirectory() || fs.existsSync(path.join(root, from)) === false) {
    pairs.push([toPosix(path.relative(repo, path.join(root, from))) + '/', toPosix(path.relative(repo, path.join(root, to))) + '/']);
  }
}
pairs.sort((a, b) => b[0].length - a[0].length);
let docRewrites = 0;
for (const file of docFiles) {
  const src = fs.readFileSync(file, 'utf8');
  let out = src.replace(/\]\((\.{1,2}\/[^)#\s]+)(#[^)]*)?\)/g, (whole, link, hash = '') => {
    const hit = resolveSpec(path.dirname(file), link);
    if (!hit || !moves.has(hit.file)) return whole;
    let rel = toPosix(path.relative(path.dirname(newOf(file)), newOf(hit.file)));
    if (!rel.startsWith('.')) rel = './' + rel;
    docRewrites += 1;
    return `](${rel}${hash})`;
  });
  for (const [o, n] of pairs) {
    // Match "pkg/old/path" at a word boundary; a leading "/" (CODEOWNERS style) is allowed.
    const re = new RegExp(`(^|[^\\w.-])${o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`, 'g');
    out = out.replace(re, (m, pre) => { docRewrites += 1; return pre + n; });
  }
  if (out !== src) edits.set(file, out);
}

console.log(`${moves.size} files to move in ${pkgName}; ${jsRewrites} JS path rewrites; ${docRewrites} doc rewrites in ${[...edits.keys()].filter((f) => !f.endsWith('.js')).length} doc files.`);
if (manual.length) {
  console.log('Check these moved files by hand (they use __dirname):');
  for (const m of manual) console.log('  ' + m);
}
if (dryRun) {
  for (const [o, n] of moves) console.log(`  ${toPosix(path.relative(root, o))} -> ${toPosix(path.relative(root, n))}`);
  process.exit(0);
}

// ---- apply: write rewritten contents, then git mv ----
for (const [file, content] of edits) fs.writeFileSync(file, content);
for (const [o, n] of moves) {
  fs.mkdirSync(path.dirname(n), { recursive: true });
  execFileSync('git', ['mv', o, n], { cwd: repo });
}
// remove directories left empty by the move
for (const dir of new Set([...moves.keys()].map((o) => path.dirname(o))).values()) {
  let d = dir;
  while (d.startsWith(root) && d !== root && fs.existsSync(d) && fs.readdirSync(d).length === 0) {
    fs.rmdirSync(d);
    d = path.dirname(d);
  }
}
console.log('Done.');

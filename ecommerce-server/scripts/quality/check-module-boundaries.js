// Enforces module boundaries: code inside one module may use another module only
// through that module's public entry point (its index.js), never its internal files.
//
//   node scripts/quality/check-module-boundaries.js <modulesDir>          check (exit 1 on violations)
//   node scripts/quality/check-module-boundaries.js <modulesDir> --fix    rewrite violations
//
// --fix adds each needed member to the target module's index.js as a lazy getter and
// rewrites the require:  require('../notifications/emailService')
//                   ->  require('../notifications').emailService
// A lazy getter loads the file only when the member is read, so each file still loads
// at the same moment as before and the returned object is identical.
// Code outside the modules folder (app/server wiring, models, migrations, scripts,
// tests) is not checked.
const fs = require('node:fs');
const path = require('node:path');

const modulesDir = path.resolve(process.argv[2] || 'modules');
const fix = process.argv.includes('--fix');
if (!fs.existsSync(modulesDir)) {
  console.error(`Modules folder not found: ${modulesDir}`);
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.js')) files.push(full);
  }
})(modulesDir);

const moduleOf = (file) => path.relative(modulesDir, file).split(path.sep)[0];
const toPosix = (p) => p.split(path.sep).join('/');
function resolve(fromDir, spec) {
  const base = path.resolve(fromDir, spec);
  return [base, `${base}.js`, path.join(base, 'index.js')]
    .find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null;
}

const REQUIRE = /require\(\s*(['"])(\.{1,2}\/[^'"]+)\1\s*\)/g;
const violations = [];
const needed = new Map(); // module -> Map(memberName -> relative file inside module)

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const from = moduleOf(file);
  const out = src.replace(REQUIRE, (whole, quote, spec) => {
    const target = resolve(path.dirname(file), spec);
    if (!target || !target.startsWith(modulesDir + path.sep)) return whole;
    const to = moduleOf(target);
    const inside = toPosix(path.relative(path.join(modulesDir, to), target));
    if (to === from || inside === 'index.js') return whole;
    violations.push(`${toPosix(path.relative(modulesDir, file))}: requires ${to}/${inside}`);
    if (!fix) return whole;
    const member = path.basename(inside, '.js');
    if (!needed.has(to)) needed.set(to, new Map());
    const members = needed.get(to);
    if (members.has(member) && members.get(member) !== inside) {
      throw new Error(`Two files named ${member} are used from module ${to}; rename one before fixing`);
    }
    members.set(member, inside);
    let entry = toPosix(path.relative(path.dirname(file), path.join(modulesDir, to)));
    if (!entry.startsWith('.')) entry = `./${entry}`;
    return `require(${quote}${entry}${quote}).${member}`;
  });
  if (fix && out !== src) fs.writeFileSync(file, out);
}

if (fix) {
  for (const [mod, members] of needed) {
    const indexFile = path.join(modulesDir, mod, 'index.js');
    const existing = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : null;
    const current = new Map();
    if (existing) {
      for (const m of existing.matchAll(/get (\w+)\(\) \{ return require\('\.\/([^']+)'\); \}/g)) current.set(m[1], `${m[2]}.js`);
    }
    for (const [k, v] of members) current.set(k, v);
    const lines = [...current].sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `  get ${k}() { return require('./${v.replace(/\.js$/, '')}'); },`);
    const body = [
      `// Public entry point of the ${mod} module. Other modules must require this file,`,
      '// not the files inside the module. Members load lazily when first read.',
      'module.exports = {',
      ...lines,
      '};',
      '',
    ].join('\n');
    fs.writeFileSync(indexFile, body);
  }
  console.log(`Rewrote ${violations.length} cross-module requires through ${needed.size} module entry points.`);
  process.exit(0);
}

if (violations.length) {
  console.error('Module boundary violations (require the module, not its internal files):');
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log(`Module boundaries respected across ${new Set(files.map(moduleOf)).size} modules.`);

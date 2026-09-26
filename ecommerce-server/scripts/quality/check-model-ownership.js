// Checks that modules only write the models they own, per <modulesDir>/model-ownership.json.
//
//   node scripts/quality/check-model-ownership.js <modulesDir> <modelsDir>
//
// A write is a static Sequelize call on a model, such as Order.create(...) or
// models.Order.update(...). Reads are allowed everywhere. Instance writes
// (order.update(...)) cannot be attributed statically and are not checked.
// It also fails when a model has no owner, when the ownership file names a model
// that does not exist, and when a module imports a name the model registry does
// not export (that import is undefined at runtime).
const fs = require('node:fs');
const path = require('node:path');

const modulesDir = path.resolve(process.argv[2] || 'modules');
const modelsDir = path.resolve(process.argv[3] || 'models');
const ownership = JSON.parse(fs.readFileSync(path.join(modulesDir, 'model-ownership.json'), 'utf8'));
const WRITES = 'create|bulkCreate|update|destroy|upsert|increment|decrement|restore|findOrCreate|truncate';

const models = fs.readdirSync(modelsDir)
  .filter((f) => f.endsWith('.js') && f !== 'index.js')
  .map((f) => path.basename(f, '.js'));
const problems = [];
for (const model of models) {
  if (!ownership.owners[model]) problems.push(`model ${model} has no owner in model-ownership.json`);
}
for (const name of Object.keys(ownership.owners)) {
  if (!models.includes(name)) problems.push(`model-ownership.json lists ${name}, but there is no models/${name}.js`);
}

// Names the registry exports; importing anything else yields undefined at runtime.
const registry = fs.readFileSync(path.join(modelsDir, 'index.js'), 'utf8');
const exportBlock = registry.match(/module\.exports\s*=\s*\{([\s\S]*?)\}/);
const exported = new Set(exportBlock
  ? exportBlock[1].split(',').map((s) => s.split(':')[0].trim()).filter(Boolean)
  : models);
const REGISTRY_IMPORT = /(?:^|[^\w.])(?:const|let|var)\s*\{([^{}]*)\}\s*=\s*require\(\s*['"][./]*models(?:\/index)?['"]\s*\)/g;

const shared = ownership.sharedTransactionDomain || { modules: [], models: [] };
const allowed = (mod, model) => (ownership.owners[model] || []).includes(mod)
  || (shared.modules.includes(mod) && shared.models.includes(model))
  || (ownership.exceptions || []).some((e) => e.module === mod && e.model === model);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.js')) files.push(full);
  }
})(modulesDir);

let writes = 0;
for (const file of files) {
  const mod = path.relative(modulesDir, file).split(path.sep)[0];
  const rel = path.relative(modulesDir, file).split(path.sep).join('/');
  const src = fs.readFileSync(file, 'utf8');
  for (const match of src.matchAll(REGISTRY_IMPORT)) {
    for (const name of match[1].split(',').map((s) => s.split(':')[0].trim()).filter(Boolean)) {
      if (!exported.has(name)) problems.push(`${rel} imports ${name} from the model registry, which does not export it`);
    }
  }
  for (const model of models) {
    const re = new RegExp(`(?<![\\w.])(?:models\\.)?${model}\\.(${WRITES})\\(`, 'g');
    for (const match of src.matchAll(re)) {
      writes += 1;
      if (!allowed(mod, model)) {
        const line = src.slice(0, match.index).split('\n').length;
        problems.push(`${rel}:${line} writes ${model}.${match[1]}() but ${model} belongs to ${ownership.owners[model].join(' or ')}`);
      }
    }
  }
}

if (problems.length) {
  console.error('Model ownership problems (ask the owning module to write, or record an exception with a reason):');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`Model ownership respected: ${writes} writes to ${models.length} models.`);

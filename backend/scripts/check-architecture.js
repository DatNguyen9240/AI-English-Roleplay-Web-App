const fs = require('fs');
const path = require('path');

const enginesRoot = path.resolve(__dirname, '..', 'src', 'engines');
const violations = [];

for (const file of walk(enginesRoot)) {
  const owner = relativeEngine(file);
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
    const importPath = match[1];
    if (!importPath.startsWith('.')) continue;
    const resolved = path.resolve(path.dirname(file), importPath);
    if (!resolved.startsWith(enginesRoot)) continue;
    const dependency = relativeEngine(resolved);
    if (dependency && dependency !== owner) {
      violations.push(`${path.relative(process.cwd(), file)} (${owner}) imports ${dependency} implementation`);
    }
  }
}

if (violations.length) {
  console.error('Architecture boundary violations:\n' + violations.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('Architecture boundary check passed.');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function relativeEngine(filePath) {
  const relative = path.relative(enginesRoot, filePath);
  return relative && !relative.startsWith('..') ? relative.split(path.sep)[0] : null;
}

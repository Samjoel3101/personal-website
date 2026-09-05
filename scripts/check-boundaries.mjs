// Enforces CLAUDE.md rule 2: src/world, src/physics, src/content and
// src/core must run in Node with no DOM and no WebGL. A `three` import, or an
// import reaching into a rendering/DOM-facing layer, breaks that and was
// previously only caught by a human noticing.
import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const guardedDirs = ['src/world', 'src/physics', 'src/content', 'src/core'];
const forbiddenDirs = ['src/render', 'src/ui', 'src/audio', 'src/input', 'src/game', 'src/assets'];
const importRe = /\bimport\s+(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]/g;

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (entry.endsWith('.js')) files.push(full);
  }
  return files;
}

function violation(filePath, specifier) {
  if (specifier === 'three' || specifier.startsWith('three/')) return `imports '${specifier}'`;
  if (!specifier.startsWith('.')) return null;

  const resolved = path.relative(rootDir, path.resolve(path.dirname(filePath), specifier));
  const hit = forbiddenDirs.find((dir) => resolved === dir || resolved.startsWith(`${dir}/`));
  return hit ? `imports '${specifier}' → reaches into ${hit}` : null;
}

let failures = [];

for (const guarded of guardedDirs) {
  const dir = path.join(rootDir, guarded);
  for (const filePath of walk(dir)) {
    const source = readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(importRe)) {
      const specifier = match[1] ?? match[2];
      const reason = violation(filePath, specifier);
      if (reason) failures.push(`${path.relative(rootDir, filePath)}: ${reason}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Layer boundary violation — the world model must stay renderer- and DOM-free:\n');
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(
    '\nSee CLAUDE.md rule 2. Move the logic that needs three/DOM into src/render, src/ui, src/audio, src/input, src/game or src/assets, and pass the result in as data.'
  );
  process.exit(1);
}

console.log(`Boundaries OK — ${guardedDirs.join(', ')} stay renderer- and DOM-free.`);

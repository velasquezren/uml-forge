// Marca cada carpeta de salida con su sistema de modulos, para que Node
// interprete correctamente los .js de dist/esm y de dist/cjs. Ver ADR 0010.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const targets = [
  { dir: 'dist/esm', content: { type: 'module' } },
  { dir: 'dist/cjs', content: { type: 'commonjs' } },
];

for (const target of targets) {
  writeFileSync(
    path.join(packageRoot, target.dir, 'package.json'),
    `${JSON.stringify(target.content, null, 2)}\n`,
    'utf8',
  );
}

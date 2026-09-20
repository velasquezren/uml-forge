// Verifica que los presets compartidos existen, son coherentes entre si y
// aplican de verdad el rigor que documenta el ADR 0002.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(here, '..');
const tsc = path.join(packageRoot, 'node_modules', '.bin', 'tsc');

const PRESETS = ['base.json', 'library.json', 'react-library.json', 'vite.json', 'nest.json'];

/** Ejecuta tsc sobre un proyecto de sonda y devuelve su resultado. */
function compileProbe(project) {
  return spawnSync(tsc, ['--noEmit', '-p', path.join(here, project)], { encoding: 'utf8' });
}

/** Lee un preset como JSON. */
function readPreset(name) {
  return JSON.parse(readFileSync(path.join(packageRoot, name), 'utf8'));
}

for (const project of ['base', 'library', 'nest']) {
  test(`el preset ${project} compila su sonda sin errores`, () => {
    const result = compileProbe(project);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  });
}

test('noUncheckedIndexedAccess sigue activo en el preset base', () => {
  const result = compileProbe('strictness');
  assert.notEqual(result.status, 0, 'la sonda negativa deberia fallar y ha compilado');
  assert.match(result.stdout, /TS2322/);
});

test('todos los presets son JSON valido y declaran su nombre', () => {
  for (const preset of PRESETS) {
    const parsed = readPreset(preset);
    assert.equal(typeof parsed.display, 'string', `${preset} no declara "display"`);
  }
});

test('ningun preset activa exactOptionalPropertyTypes', () => {
  for (const preset of PRESETS) {
    const options = readPreset(preset).compilerOptions ?? {};
    assert.ok(
      !('exactOptionalPropertyTypes' in options),
      `${preset} activa exactOptionalPropertyTypes, prohibido por el ADR 0002`,
    );
  }
});

test('el preset base activa el rigor documentado', () => {
  const options = readPreset('base.json').compilerOptions ?? {};
  for (const flag of ['strict', 'noUncheckedIndexedAccess', 'noImplicitOverride']) {
    assert.equal(options[flag], true, `base.json no activa ${flag}`);
  }
});

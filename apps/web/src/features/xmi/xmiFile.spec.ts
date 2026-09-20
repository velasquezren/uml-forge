import { describe, expect, it } from 'vitest';
import { exportXmi } from '@uml-forge/xmi';
import type { UMLModel } from '@uml-forge/uml-core';
import { decodeXmlBuffer, readXmiFile, xmiFileName } from './xmiFile';

const model: UMLModel = {
  id: '10000000-0000-0000-0000-000000000001',
  name: 'Clinica Veterinaria',
  createdAt: '2026-08-30T00:00:00.000Z',
  updatedAt: '2026-08-30T00:00:00.000Z',
  classes: [
    {
      id: '30000000-0000-0000-0000-000000000001',
      name: 'Mascota',
      isAbstract: false,
      isInterface: false,
      stereotypes: [],
      position: { x: 120, y: 80 },
      attributes: [
        {
          id: '40000000-0000-0000-0000-000000000001',
          name: 'nombre',
          type: 'String',
          visibility: 'private',
          multiplicity: '1',
          isStatic: false,
          isDerived: false,
          isUnique: false,
          isNullable: false,
          isIdentifier: false,
          defaultValue: null,
        },
      ],
      operations: [],
    },
  ],
  enums: [
    {
      id: '20000000-0000-0000-0000-000000000001',
      name: 'Especie',
      literals: ['PERRO', 'GATO'],
      position: { x: 400, y: 80 },
    },
  ],
  relationships: [],
};

/** Fichero de prueba: en jsdom `File.text()` no siempre esta disponible. */
function fakeFile(name: string, content: string, size?: number): File {
  const file = new File([content], name, { type: 'application/xml' });
  // El caso del fichero demasiado grande no necesita gastar 10 MB de memoria.
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

describe('xmiFileName', () => {
  it('convierte el nombre del proyecto en un fichero .xmi seguro', () => {
    expect(xmiFileName('Clinica Veterinaria')).toBe('clinica-veterinaria.xmi');
    expect(xmiFileName('Gestión de Envíos 2026')).toBe('gestion-de-envios-2026.xmi');
    expect(xmiFileName('***')).toBe('modelo.xmi');
  });
});

describe('readXmiFile', () => {
  it('importa un documento exportado por la propia aplicacion', async () => {
    const exported = exportXmi(model);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const result = await readXmiFile(fakeFile('modelo.xmi', exported.value), 'Repuesto');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.model.name).toBe('Clinica Veterinaria');
    expect(result.model.classes).toHaveLength(1);
    expect(result.model.enums).toHaveLength(1);
    // Las coordenadas del lienzo sobreviven al viaje de ida y vuelta
    expect(result.model.classes[0]?.position).toEqual({ x: 120, y: 80 });
    expect(result.model.enums[0]?.position).toEqual({ x: 400, y: 80 });
  });

  it('informa del error sin lanzar cuando el fichero no es XMI valido', async () => {
    const result = await readXmiFile(fakeFile('roto.xmi', '<xmi:XMI></xmi:XMI>'), 'Repuesto');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('uml:Model');
  });

  it('rechaza ficheros desmesurados antes de intentar parsearlos', async () => {
    const result = await readXmiFile(fakeFile('enorme.xmi', '<x/>', 50 * 1024 * 1024), 'Repuesto');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('10 MB');
  });
});

describe('decodeXmlBuffer', () => {
  it('respeta la codificacion declarada por Enterprise Architect', () => {
    // "Duenos" con enne en windows-1252: la enne es el byte 0xF1.
    const bytes = new Uint8Array([
      ...new TextEncoder().encode('<?xml version="1.0" encoding="windows-1252"?><a name="Due'),
      0xf1,
      ...new TextEncoder().encode('os"/>'),
    ]);

    const decoded = decodeXmlBuffer(bytes.buffer);

    expect(decoded).toContain('Due\u00f1os');
  });

  it('lee como UTF-8 cuando no hay declaracion', () => {
    const buffer = new TextEncoder().encode('<a name="Duenos"/>').buffer;

    expect(decodeXmlBuffer(buffer)).toBe('<a name="Duenos"/>');
  });
});

import { describe, expect, it } from 'vitest';
import { createId, type UMLModel } from '@uml-forge/uml-core';
import { eaId, eaPackageId, uuidFromEaId } from '../src/ea-ids.js';
import { readXmiVersion } from '../src/metadata.js';
import { importXmi } from '../src/parser.js';
import { exportXmi } from '../src/serializer.js';
import { sampleModel } from './fixtures.js';

/** Modelo con UUID v4 reales, que son los que produce el editor. */
function liveModel(): UMLModel {
  const order = createId();
  const line = createId();
  const candidate = createId();
  const now = '2026-09-27T10:00:00.000Z';
  const end = { name: '', role: '', multiplicity: '1', navigable: true };
  return {
    id: createId(),
    name: 'Pedidos',
    createdAt: now,
    updatedAt: now,
    enums: [],
    classes: [
      {
        id: order,
        name: 'Order',
        isAbstract: false,
        isInterface: false,
        stereotypes: [],
        position: { x: -200, y: -80 },
        attributes: [
          {
            id: createId(),
            name: 'owner',
            type: candidate,
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
      { ...emptyClass(line, 'OrderLine'), position: { x: 200, y: 200 } },
      { ...emptyClass(candidate, 'Candidate'), position: { x: 500, y: 0 } },
    ],
    relationships: [
      {
        id: createId(),
        kind: 'composition',
        name: 'contiene',
        sourceId: order,
        targetId: line,
        sourceEnd: { ...end, role: 'order' },
        targetEnd: { ...end, role: 'lines', multiplicity: '1..*', navigable: true },
      },
      {
        id: createId(),
        kind: 'association',
        name: '',
        sourceId: order,
        targetId: candidate,
        sourceEnd: { ...end, navigable: false },
        targetEnd: { ...end, multiplicity: '0..1' },
      },
      {
        id: createId(),
        kind: 'dependency',
        name: 'usa',
        sourceId: line,
        targetId: candidate,
        sourceEnd: end,
        targetEnd: end,
      },
    ],
  };
}

function emptyClass(id: string, name: string): UMLModel['classes'][number] {
  return {
    id,
    name,
    isAbstract: false,
    isInterface: false,
    stereotypes: [],
    position: { x: 0, y: 0 },
    attributes: [],
    operations: [],
  };
}

function exported(model: UMLModel, revision?: number): string {
  const result = exportXmi(model, revision === undefined ? undefined : { revision });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe('Diagrama nativo de Enterprise Architect', () => {
  it('coloca el diagrama dentro del paquete que contiene las clases', () => {
    const xml = exported(sampleModel);
    const packageId = eaPackageId(sampleModel.id);

    expect(xml).toContain(`<packagedElement xmi:type="uml:Package" xmi:id="${packageId}"`);
    expect(xml).toContain(`<model package="${packageId}" localID="1" owner="${packageId}"/>`);
    expect(xml).toContain('<xmi:Documentation exporter="Enterprise Architect"');
  });

  it('cada objeto del diagrama apunta a un elemento que existe en el documento', () => {
    const xml = exported(liveModel());
    const ids = new Set([...xml.matchAll(/xmi:id="([^"]+)"/gu)].map((m) => m[1]));
    const subjects = [...xml.matchAll(/subject="([^"]+)"/gu)].map((m) => m[1]);

    expect(subjects).toHaveLength(3);
    for (const subject of subjects) {
      expect(ids.has(subject)).toBe(true);
    }
  });

  it('no repite ningun xmi:id y todos tienen la forma de Enterprise Architect', () => {
    const xml = exported(liveModel());
    const ids = [...xml.matchAll(/xmi:id="([^"]+)"/gu)].map((m) => m[1] ?? '');

    expect(new Set(ids).size).toBe(ids.length);
    const foreign = ids.filter((id) => !/^(EAID_|EAPK_|EAJava_|EA\w+Package$)/u.test(id));
    expect(foreign).toEqual([]);
  });

  it('traslada al primer cuadrante las coordenadas negativas del lienzo', () => {
    const xml = exported(liveModel());
    const lefts = [...xml.matchAll(/Left=(-?\d+);Top=(-?\d+)/gu)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);
    expect(lefts.every(([x, y]) => (x ?? -1) >= 0 && (y ?? -1) >= 0)).toBe(true);
  });

  it('declara el rombo de la composicion en el extremo del todo', () => {
    const xml = exported(liveModel());
    expect(xml).toContain('ea_type="Aggregation" subtype="Strong"');
    expect(xml).toMatch(
      /<source xmi:idref="EAID_\w+">\s*<model [^>]*name="Order"\/>[\s\S]*?aggregation="composite"/u,
    );
  });
});

describe('Ida y vuelta sin perdidas', () => {
  const model = liveModel();
  const result = importXmi(exported(model), { autoLayout: false });

  it('conserva los identificadores del modelo, clases y relaciones', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(model.id);
    expect(result.value.name).toBe('Pedidos');
    expect(result.value.classes.map((c) => c.id).sort()).toEqual(
      model.classes.map((c) => c.id).sort(),
    );
    expect(result.value.relationships.map((r) => r.id).sort()).toEqual(
      model.relationships.map((r) => r.id).sort(),
    );
  });

  it('una clase llamada Candidate sigue siendo una referencia y no una fecha', () => {
    if (!result.ok) return;
    const order = result.value.classes.find((c) => c.name === 'Order');
    const candidate = result.value.classes.find((c) => c.name === 'Candidate');
    expect(order?.attributes[0]?.type).toBe(candidate?.id);
  });

  it('conserva dependencias, navegabilidad y posiciones exactas', () => {
    if (!result.ok) return;
    const dependency = result.value.relationships.find((r) => r.kind === 'dependency');
    expect(dependency?.name).toBe('usa');

    const association = result.value.relationships.find((r) => r.kind === 'association');
    expect(association?.sourceEnd.navigable).toBe(false);
    expect(association?.targetEnd.navigable).toBe(true);
    expect(association?.targetEnd.multiplicity).toBe('0..1');

    const composition = result.value.relationships.find((r) => r.kind === 'composition');
    expect(composition?.targetEnd.multiplicity).toBe('1..*');
    expect(composition?.targetEnd.role).toBe('lines');

    const order = result.value.classes.find((c) => c.name === 'Order');
    expect(order?.position).toEqual({ x: -200, y: -80 });
  });
});

describe('Identificadores y metadatos', () => {
  it('recupera el UUID original de un EAID_ y descarta los que no lo son', () => {
    const id = createId();
    expect(uuidFromEaId(eaId(id))).toBe(id);
    expect(uuidFromEaId(eaPackageId(id))).toBe(id);
    expect(uuidFromEaId('EAID_OWNER0001')).toBeNull();
    // Los derivados tambien son UUID validos para el metamodelo.
    expect(uuidFromEaId(eaId(`${id}-src`))).not.toBeNull();
  });

  it('lee la revision con la que se exporto el fichero', () => {
    const model = liveModel();
    const info = readXmiVersion(exported(model, 7));
    expect(info?.revision).toBe(7);
    expect(info?.modelId).toBe(model.id);
    expect(readXmiVersion('<xmi:XMI/>')).toBeNull();
  });

  it('orienta una asociacion bidireccional de EA por sus extremos src y dst', () => {
    const xml = `<?xml version="1.0"?>
<xmi:XMI xmi:version="2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1">
  <uml:Model xmi:type="uml:Model" name="EA_Model">
    <packagedElement xmi:type="uml:Package" xmi:id="EAPK_P" name="Tienda">
      <packagedElement xmi:type="uml:Class" xmi:id="EAID_A" name="Cliente">
        <ownedAttribute xmi:type="uml:Property" xmi:id="EAID_dst1" name="pedidos" association="EAID_R">
          <type xmi:idref="EAID_B"/>
          <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="-1"/>
          <lowerValue xmi:type="uml:LiteralInteger" value="0"/>
        </ownedAttribute>
      </packagedElement>
      <packagedElement xmi:type="uml:Class" xmi:id="EAID_B" name="Pedido">
        <ownedAttribute xmi:type="uml:Property" xmi:id="EAID_src1" name="cliente" association="EAID_R">
          <type xmi:idref="EAID_A"/>
        </ownedAttribute>
      </packagedElement>
      <packagedElement xmi:type="uml:Association" xmi:id="EAID_R">
        <memberEnd xmi:idref="EAID_dst1"/>
        <memberEnd xmi:idref="EAID_src1"/>
      </packagedElement>
    </packagedElement>
  </uml:Model>
</xmi:XMI>`;
    const result = importXmi(xml, { autoLayout: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.name).toBe('Tienda');
    const cliente = result.value.classes.find((c) => c.name === 'Cliente');
    const association = result.value.relationships[0];
    expect(association?.sourceId).toBe(cliente?.id);
    expect(association?.targetEnd.multiplicity).toBe('0..*');
    expect(cliente?.attributes).toEqual([]);
  });
});

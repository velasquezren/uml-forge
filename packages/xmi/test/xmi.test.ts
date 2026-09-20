import { describe, it, expect } from 'vitest';
import type { UMLModel } from '@uml-forge/uml-core';
import { autoLayout } from '../src/autolayout.js';
import {
  invalidXmlError,
  missingModelError,
  parseError,
  unsupportedVersionError,
} from '../src/errors.js';
import {
  IdMapper,
  normalizeMultiplicity,
  normalizeType,
  normalizeVisibility,
  toArray,
} from '../src/parser-helpers.js';
import { importXmi } from '../src/parser.js';
import { exportXmi } from '../src/serializer.js';
import { sampleModel } from './fixtures.js';

describe('OMG XMI 2.1 Serializer and Parser', () => {
  it('exporta a XMI 2.1 e importa de vuelta preservando la estructura del modelo (Roundtrip)', () => {
    const exportResult = exportXmi(sampleModel);
    expect(exportResult.ok).toBe(true);
    if (!exportResult.ok) return;

    const xml = exportResult.value;
    expect(xml).toContain('xmi:version="2.1"');
    expect(xml).toContain('name="Hospital Management"');
    expect(xml).toContain('name="Person"');
    expect(xml).toContain('name="Doctor"');
    expect(xml).toContain('name="ShiftType"');
    expect(xml).toContain('name="Schedulable"');

    const importResult = importXmi(xml, { autoLayout: false });
    expect(importResult.ok).toBe(true);
    if (!importResult.ok) return;

    const imported = importResult.value;
    expect(imported.name).toBe('Hospital Management');
    expect(imported.classes).toHaveLength(3);
    expect(imported.enums).toHaveLength(1);
    expect(imported.relationships).toHaveLength(3);

    const docClass = imported.classes.find((c) => c.name === 'Doctor');
    expect(docClass).toBeDefined();
    expect(docClass?.attributes.some((a) => a.name === 'licenseNumber')).toBe(true);

    const personClass = imported.classes.find((c) => c.name === 'Person');
    expect(personClass?.isAbstract).toBe(true);
    expect(personClass?.operations.some((op) => op.name === 'getFullName')).toBe(true);
  });

  it('conserva las coordenadas del lienzo de clases y enumeraciones en el roundtrip', () => {
    const exportResult = exportXmi(sampleModel);
    expect(exportResult.ok).toBe(true);
    if (!exportResult.ok) return;

    const importResult = importXmi(exportResult.value);
    expect(importResult.ok).toBe(true);
    if (!importResult.ok) return;

    const person = importResult.value.classes.find((c) => c.name === 'Person');
    expect(person?.position).toEqual({ x: 100, y: 50 });

    const shift = importResult.value.enums.find((e) => e.name === 'ShiftType');
    expect(shift?.position).toEqual({ x: 700, y: 250 });
  });

  it('coloca tambien las enumeraciones cuando el documento no trae coordenadas', () => {
    const withoutPositions: UMLModel = {
      ...sampleModel,
      classes: sampleModel.classes.map((c) => ({ ...c, position: { x: 0, y: 0 } })),
      enums: sampleModel.enums.map((e) => ({ ...e, position: { x: 0, y: 0 } })),
    };

    const layouted = autoLayout(withoutPositions);
    const shift = layouted.enums.find((e) => e.name === 'ShiftType');
    const doctor = layouted.classes.find((c) => c.name === 'Doctor');

    expect(shift).toBeDefined();
    expect(shift!.position.x).toBeGreaterThan(0);
    // Las enumeraciones caen por debajo de la capa mas profunda de clases
    expect(shift!.position.y).toBeGreaterThan(doctor!.position.y);
  });

  it('calcula autolayout jerarquico sin superposicion cuando las posiciones son cero', () => {
    const modelWithZeros: UMLModel = {
      ...sampleModel,
      classes: sampleModel.classes.map((c) => ({ ...c, position: { x: 0, y: 0 } })),
    };

    const layouted = autoLayout(modelWithZeros);
    expect(layouted.classes).toHaveLength(3);
    expect(layouted.enums).toHaveLength(1);
    expect(layouted.classes.every((c) => c.position.x > 0 && c.position.y > 0)).toBe(true);

    // Doctor (capa 1) debe tener coordenada Y superior a Person (capa 0)
    const person = layouted.classes.find((c) => c.name === 'Person');
    const doctor = layouted.classes.find((c) => c.name === 'Doctor');
    expect(doctor!.position.y).toBeGreaterThan(person!.position.y);
  });

  it('importa tolerante ante dialectos XMI externos con asociaciones y atributos sin ID UUID', () => {
    const foreignXmi = `<?xml version="1.0" encoding="UTF-8"?>
<XMI xmi.version="2.1" xmlns:uml="http://www.omg.org/spec/UML/20090901">
  <Model name="ECommerce">
    <packagedElement xmi:type="uml:Class" xmi:id="C1" name="Customer">
      <ownedAttribute name="email" type="String" visibility="private"/>
      <ownedOperation name="processOrder">
        <ownedParameter name="orderId" direction="in" type="String"/>
        <ownedParameter name="status" direction="out" type="String"/>
        <ownedParameter name="context" direction="inout" type="String"/>
      </ownedOperation>
    </packagedElement>
    <packagedElement xmi:type="uml:Class" xmi:id="C2" name="Address">
      <ownedAttribute name="city" type="String"/>
    </packagedElement>
    <packagedElement xmi:type="uml:Association" xmi:id="A1" name="customer_address">
      <ownedEnd type="C1" role="customer" navigable="true"/>
      <ownedEnd type="C2" role="address" aggregation="composite" navigable="true"/>
    </packagedElement>
  </Model>
</XMI>`;

    const result = importXmi(foreignXmi);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.name).toBe('ECommerce');
    expect(result.value.classes).toHaveLength(2);
    expect(result.value.relationships).toHaveLength(1);
    expect(result.value.relationships[0]?.kind).toBe('composition');
  });

  it('devuelve error descriptivo ante XML malformado o sin modelo', () => {
    const invalidXml = '<xmi:XMI><unclosed></xmi:XMI>';
    const res1 = importXmi(invalidXml);
    expect(res1.ok).toBe(false);

    const emptyXml = '<?xml version="1.0"?><xmi:XMI></xmi:XMI>';
    const res2 = importXmi(emptyXml);
    expect(res2.ok).toBe(false);
    if (!res2.ok) {
      expect(res2.error.code).toBe('missing_model');
    }
  });

  it('cubre utilidades auxiliares y mapeos de tipos', () => {
    const idMapper = new IdMapper();
    const id1 = idMapper.toUuid('custom_id');
    const id2 = idMapper.toUuid('custom_id');
    expect(id1).toBe(id2);
    expect(idMapper.toUuid(undefined)).toBeDefined();

    expect(normalizeVisibility('+')).toBe('public');
    expect(normalizeVisibility('-')).toBe('private');
    expect(normalizeVisibility('#')).toBe('protected');
    expect(normalizeVisibility('other')).toBe('package');
    expect(normalizeVisibility(undefined)).toBe('package');

    expect(normalizeMultiplicity(0, 1)).toBe('0..1');
    expect(normalizeMultiplicity(0, '*')).toBe('0..*');
    expect(normalizeMultiplicity(1, '*')).toBe('1..*');
    expect(normalizeMultiplicity(1, 1)).toBe('1');
    expect(normalizeMultiplicity(2, 5)).toBe('2..5');
    expect(normalizeMultiplicity(0, -1)).toBe('0..*');
    expect(normalizeMultiplicity(1, -1)).toBe('1..*');
    expect(normalizeMultiplicity(undefined, '*')).toBe('*');

    expect(normalizeType(undefined, idMapper)).toBe('String');
    expect(normalizeType('varchar(255)', idMapper)).toBe('String');
    expect(normalizeType('char', idMapper)).toBe('String');
    expect(normalizeType('integer', idMapper)).toBe('Integer');
    expect(normalizeType('int', idMapper)).toBe('Integer');
    expect(normalizeType('long', idMapper)).toBe('Long');
    expect(normalizeType('double', idMapper)).toBe('Double');
    expect(normalizeType('float', idMapper)).toBe('Double');
    expect(normalizeType('real', idMapper)).toBe('Double');
    expect(normalizeType('boolean', idMapper)).toBe('Boolean');
    expect(normalizeType('bool', idMapper)).toBe('Boolean');
    expect(normalizeType('date', idMapper)).toBe('Date');
    expect(normalizeType('datetime', idMapper)).toBe('DateTime');
    expect(normalizeType('timestamp', idMapper)).toBe('DateTime');
    expect(normalizeType('uuid', idMapper)).toBe('UUID');
    expect(normalizeType('text', idMapper)).toBe('Text');
    expect(normalizeType('clob', idMapper)).toBe('Text');

    expect(toArray(undefined)).toEqual([]);
    expect(toArray(5)).toEqual([5]);
    expect(toArray([1, 2])).toEqual([1, 2]);

    expect(invalidXmlError('msg').code).toBe('invalid_xml');
    expect(unsupportedVersionError('1.0').code).toBe('unsupported_version');
    expect(missingModelError().code).toBe('missing_model');
    expect(parseError('msg').code).toBe('parse_error');
  });
});

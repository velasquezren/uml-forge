import { describe, expect, it } from 'vitest';
import { importXmi } from '../src/parser.js';
import { exportXmi } from '../src/serializer.js';
import { enterpriseArchitectXmi } from './ea-fixture.js';
import { sampleModel } from './fixtures.js';

describe('Interoperabilidad con Enterprise Architect', () => {
  describe('importacion de un XMI exportado por Enterprise Architect', () => {
    const result = importXmi(enterpriseArchitectXmi, { autoLayout: false });

    it('encuentra las clases aunque esten dentro de un paquete', () => {
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.classes.map((c) => c.name).sort()).toEqual(['Animal', 'Owner', 'Pet']);
      expect(result.value.enums).toHaveLength(1);
    });

    it('resuelve los tipos declarados con xmi:idref', () => {
      if (!result.ok) return;

      const owner = result.value.classes.find((c) => c.name === 'Owner');
      expect(owner?.attributes.find((a) => a.name === 'fullName')?.type).toBe('String');

      const pet = result.value.classes.find((c) => c.name === 'Pet');
      const petId = pet?.id;
      // Un parametro tipado con otra clase apunta a su identificador.
      expect(owner?.operations[0]?.parameters[0]?.type).toBe(petId);
    });

    it('no confunde el extremo de la asociacion con un atributo de la clase', () => {
      if (!result.ok) return;

      const owner = result.value.classes.find((c) => c.name === 'Owner');
      expect(owner?.attributes.map((a) => a.name)).toEqual(['fullName']);
    });

    it('reconstruye la asociacion con su direccion, cardinalidades y roles', () => {
      if (!result.ok) return;

      const owner = result.value.classes.find((c) => c.name === 'Owner');
      const pet = result.value.classes.find((c) => c.name === 'Pet');
      const association = result.value.relationships.find((r) => r.name === 'tiene');

      expect(association).toBeDefined();
      expect(association?.kind).toBe('composition');
      expect(association?.sourceId).toBe(owner?.id);
      expect(association?.targetId).toBe(pet?.id);
      // El -1 de Enterprise Architect es el infinito de UML.
      expect(association?.targetEnd.multiplicity).toBe('0..*');
      expect(association?.targetEnd.role).toBe('pets');
      expect(association?.sourceEnd.multiplicity).toBe('1');
      expect(association?.sourceEnd.role).toBe('owner');
    });

    it('traduce la herencia declarada dentro de la clase hija', () => {
      if (!result.ok) return;

      const pet = result.value.classes.find((c) => c.name === 'Pet');
      const animal = result.value.classes.find((c) => c.name === 'Animal');
      const generalization = result.value.relationships.find((r) => r.kind === 'generalization');

      expect(generalization?.sourceId).toBe(pet?.id);
      expect(generalization?.targetId).toBe(animal?.id);
      expect(animal?.isAbstract).toBe(true);
    });
  });

  describe('exportacion legible por Enterprise Architect', () => {
    const exported = exportXmi(sampleModel);

    it('declara los espacios de nombres de la OMG para XMI 2.1', () => {
      expect(exported.ok).toBe(true);
      if (!exported.ok) return;

      expect(exported.value).toContain('xmlns:uml="http://schema.omg.org/spec/UML/2.1"');
      expect(exported.value).toContain('xmlns:xmi="http://schema.omg.org/spec/XMI/2.1"');
    });

    it('declara los tipos primitivos y los referencia por identificador', () => {
      if (!exported.ok) return;

      expect(exported.value).toContain(
        '<packagedElement xmi:type="uml:PrimitiveType" xmi:id="umlforge-primitive-String" name="String"/>',
      );
      expect(exported.value).toContain('type="umlforge-primitive-String"');
      // Nunca el nombre del tipo en crudo, que es lo que ignora la herramienta.
      expect(exported.value).not.toContain('type="String"');
    });

    it('declara los dos extremos de cada asociacion en memberEnd', () => {
      if (!exported.ok) return;

      const association = sampleModel.relationships.find(
        (r) => r.kind !== 'generalization' && r.kind !== 'realization',
      );
      expect(association).toBeDefined();
      expect(exported.value).toContain(`<memberEnd xmi:idref="${association!.id}-src"/>`);
      expect(exported.value).toContain(`<memberEnd xmi:idref="${association!.id}-tgt"/>`);
      expect(exported.value).toContain(`association="${association!.id}"`);
    });

    it('conserva los limites exactos de una cardinalidad n..m', () => {
      const model = {
        ...sampleModel,
        relationships: sampleModel.relationships.map((relationship) =>
          relationship.kind === 'aggregation'
            ? {
                ...relationship,
                targetEnd: { ...relationship.targetEnd, multiplicity: '2..5' },
              }
            : relationship,
        ),
      };

      const result = exportXmi(model);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toContain('<lowerValue xmi:type="uml:LiteralInteger" value="2"/>');
      expect(result.value).toContain(
        '<upperValue xmi:type="uml:LiteralUnlimitedNatural" value="5"/>',
      );
    });

    it('vuelve a importar su propia exportacion sin perder la asociacion', () => {
      if (!exported.ok) return;

      const reimported = importXmi(exported.value, { autoLayout: false });
      expect(reimported.ok).toBe(true);
      if (!reimported.ok) return;

      const original = sampleModel.relationships.find((r) => r.kind === 'aggregation');
      const roundTripped = reimported.value.relationships.find((r) => r.kind === 'aggregation');

      expect(roundTripped).toBeDefined();
      expect(roundTripped?.sourceEnd.multiplicity).toBe(original?.sourceEnd.multiplicity);
      expect(roundTripped?.targetEnd.multiplicity).toBe(original?.targetEnd.multiplicity);
      expect(roundTripped?.targetEnd.role).toBe(original?.targetEnd.role);
    });
  });
});

import { ok, type Result, type UMLModel } from '@uml-forge/uml-core';
import type { XmiError } from './errors.js';
import type { XmiExportOptions } from './types.js';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Exporta un modelo UML a una representacion XML compatible con el estandar OMG XMI 2.1. */
export function exportXmi(
  model: UMLModel,
  options?: Partial<XmiExportOptions>,
): Result<string, XmiError> {
  const exporter = options?.exporter || 'UML Forge';
  const exporterVersion = options?.exporterVersion || '1.0.0';

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://www.eclipse.org/uml2/3.0.0/UML">',
    `  <xmi:Documentation exporter="${escapeXml(exporter)}" exporterVersion="${escapeXml(exporterVersion)}"/>`,
    `  <uml:Model xmi:type="uml:Model" xmi:id="${model.id}" name="${escapeXml(model.name)}">`,
  ];

  // Agrupar relaciones de herencia e implementacion por clase origen
  const generalizationsBySource = new Map<string, string[]>();
  const realizationsBySource = new Map<string, string[]>();

  for (const rel of model.relationships) {
    if (rel.kind === 'generalization') {
      const list = generalizationsBySource.get(rel.sourceId) ?? [];
      list.push(rel.targetId);
      generalizationsBySource.set(rel.sourceId, list);
    } else if (rel.kind === 'realization') {
      const list = realizationsBySource.get(rel.sourceId) ?? [];
      list.push(rel.targetId);
      realizationsBySource.set(rel.sourceId, list);
    }
  }

  // 1. Clases e Interfaces
  for (const c of model.classes) {
    const typeTag = c.isInterface ? 'uml:Interface' : 'uml:Class';
    const abstractAttr = c.isAbstract && !c.isInterface ? ' isAbstract="true"' : '';
    lines.push(
      `    <packagedElement xmi:type="${typeTag}" xmi:id="${c.id}" name="${escapeXml(c.name)}"${abstractAttr}>`,
    );

    // Atributos
    for (const attr of c.attributes) {
      const isStatic = attr.isStatic ? ' isStatic="true"' : '';
      const isUnique = attr.isUnique ? ' isUnique="true"' : '';
      const isReadOnly = attr.isDerived ? ' isReadOnly="true"' : '';
      lines.push(
        `      <ownedAttribute xmi:type="uml:Property" xmi:id="${attr.id}" name="${escapeXml(attr.name)}" visibility="${attr.visibility}" type="${escapeXml(attr.type)}"${isStatic}${isUnique}${isReadOnly}>`,
      );
      if (attr.defaultValue) {
        lines.push(
          `        <defaultValue xmi:type="uml:LiteralString" value="${escapeXml(attr.defaultValue)}"/>`,
        );
      }
      lines.push(
        `        <lowerValue xmi:type="uml:LiteralInteger" value="${attr.multiplicity.startsWith('0') ? '0' : '1'}"/>`,
      );
      lines.push(
        `        <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="${attr.multiplicity.includes('*') ? '*' : '1'}"/>`,
      );
      lines.push('      </ownedAttribute>');
    }

    // Operaciones
    for (const op of c.operations) {
      const isAbstract = op.isAbstract ? ' isAbstract="true"' : '';
      const isStatic = op.isStatic ? ' isStatic="true"' : '';
      lines.push(
        `      <ownedOperation xmi:type="uml:Operation" xmi:id="${op.id}" name="${escapeXml(op.name)}" visibility="${op.visibility}"${isAbstract}${isStatic}>`,
      );

      if (op.returnType) {
        lines.push(
          `        <ownedParameter xmi:type="uml:Parameter" xmi:id="${op.id}-return" direction="return" type="${escapeXml(op.returnType)}"/>`,
        );
      }
      for (const p of op.parameters) {
        lines.push(
          `        <ownedParameter xmi:type="uml:Parameter" xmi:id="${p.id}" name="${escapeXml(p.name)}" direction="${p.direction}" type="${escapeXml(p.type)}"/>`,
        );
      }
      lines.push('      </ownedOperation>');
    }

    // Generalizaciones
    for (const targetId of generalizationsBySource.get(c.id) ?? []) {
      lines.push(
        `      <generalization xmi:type="uml:Generalization" xmi:id="${c.id}-gen-${targetId}" general="${targetId}"/>`,
      );
    }

    // Realizaciones
    for (const targetId of realizationsBySource.get(c.id) ?? []) {
      lines.push(
        `      <interfaceRealization xmi:type="uml:InterfaceRealization" xmi:id="${c.id}-real-${targetId}" supplier="${targetId}" contract="${targetId}"/>`,
      );
    }

    lines.push('    </packagedElement>');
  }

  // 2. Enumeraciones
  for (const e of model.enums) {
    lines.push(
      `    <packagedElement xmi:type="uml:Enumeration" xmi:id="${e.id}" name="${escapeXml(e.name)}">`,
    );
    for (const lit of e.literals) {
      lines.push(
        `      <ownedLiteral xmi:type="uml:EnumerationLiteral" xmi:id="${e.id}-lit-${lit}" name="${escapeXml(lit)}"/>`,
      );
    }
    lines.push('    </packagedElement>');
  }

  // 3. Asociaciones, Agregaciones y Composiciones
  for (const rel of model.relationships) {
    if (rel.kind === 'generalization' || rel.kind === 'realization') continue;

    let agg = 'none';
    if (rel.kind === 'composition') agg = 'composite';
    if (rel.kind === 'aggregation') agg = 'shared';

    lines.push(
      `    <packagedElement xmi:type="uml:Association" xmi:id="${rel.id}" name="${escapeXml(rel.name)}">`,
    );
    lines.push(
      `      <ownedEnd xmi:type="uml:Property" xmi:id="${rel.id}-src" type="${rel.sourceId}" role="${escapeXml(rel.sourceEnd.role)}" navigable="${rel.sourceEnd.navigable}">`,
    );
    lines.push(
      `        <lowerValue xmi:type="uml:LiteralInteger" value="${rel.sourceEnd.multiplicity.startsWith('0') ? '0' : '1'}"/>`,
    );
    lines.push(
      `        <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="${rel.sourceEnd.multiplicity.includes('*') ? '*' : '1'}"/>`,
    );
    lines.push('      </ownedEnd>');
    lines.push(
      `      <ownedEnd xmi:type="uml:Property" xmi:id="${rel.id}-tgt" type="${rel.targetId}" role="${escapeXml(rel.targetEnd.role)}" aggregation="${agg}" navigable="${rel.targetEnd.navigable}">`,
    );
    lines.push(
      `        <lowerValue xmi:type="uml:LiteralInteger" value="${rel.targetEnd.multiplicity.startsWith('0') ? '0' : '1'}"/>`,
    );
    lines.push(
      `        <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="${rel.targetEnd.multiplicity.includes('*') ? '*' : '1'}"/>`,
    );
    lines.push('      </ownedEnd>');
    lines.push('    </packagedElement>');
  }

  lines.push('  </uml:Model>');

  // 4. Extension de posiciones 2D en el lienzo
  lines.push('  <xmi:Extension extender="UMLForge">');
  lines.push('    <diagramElements>');
  for (const c of model.classes) {
    lines.push(`      <element xmi:idref="${c.id}" x="${c.position.x}" y="${c.position.y}"/>`);
  }
  lines.push('    </diagramElements>');
  lines.push('  </xmi:Extension>');
  lines.push('</xmi:XMI>');

  return ok(lines.join('\n'));
}

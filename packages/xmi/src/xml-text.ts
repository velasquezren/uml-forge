import { parseMultiplicity } from '@uml-forge/uml-core';

/** Escapa los cinco caracteres que XML no admite en texto ni en atributos. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&apos;');
}

/** Convierte un nombre en un identificador XML valido para elementos derivados. */
export function toXmlId(value: string): string {
  const clean = value.replace(/[^A-Za-z0-9_.-]/gu, '_');
  return /^[A-Za-z_]/u.test(clean) ? clean : `_${clean}`;
}

/** Limites de una multiplicidad tal como los escribe XMI: `*` para el infinito. */
export function multiplicityBounds(multiplicity: string): { lower: string; upper: string } {
  const bounds = parseMultiplicity(multiplicity);
  if (bounds === null) {
    return { lower: '1', upper: '1' };
  }
  return {
    lower: String(bounds.lower),
    upper: bounds.upper === Number.POSITIVE_INFINITY ? '*' : String(bounds.upper),
  };
}

/** Escribe `lowerValue` y `upperValue`, que es como XMI expresa la cardinalidad. */
export function multiplicityLines(multiplicity: string, indent: string): string[] {
  const { lower, upper } = multiplicityBounds(multiplicity);
  return [
    `${indent}<lowerValue xmi:type="uml:LiteralInteger" value="${lower}"/>`,
    `${indent}<upperValue xmi:type="uml:LiteralUnlimitedNatural" value="${upper}"/>`,
  ];
}

import { isId } from '@uml-forge/uml-core';

/**
 * Identificadores al estilo de Enterprise Architect. La herramienta escribe sus
 * GUID como `EAID_XXXXXXXX_XXXX_XXXX_XXXX_XXXXXXXXXXXX` (elementos) y
 * `EAPK_...` (paquetes), y al importar los traduce a `{XXXXXXXX-XXXX-...}`.
 * Un identificador con otra forma lo trata como ajeno y no puede enlazar el
 * diagrama con sus elementos, por eso todo lo exportado usa esta forma.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const EA_ID_PATTERN =
  /^EA(?:ID|PK)_([0-9A-F]{8})_([0-9A-F]{4})_([0-9A-F]{4})_([0-9A-F]{4})_([0-9A-F]{12})$/iu;

/**
 * GUID de 32 cifras hexadecimales. Un UUID se conserva tal cual; cualquier otra
 * semilla (extremos de asociacion, literales, parametros de retorno) se
 * convierte de forma determinista, de modo que exportar dos veces el mismo
 * modelo produce los mismos identificadores.
 */
function guidHex(seed: string): string {
  if (UUID_PATTERN.test(seed)) {
    return seed.replace(/-/gu, '').toUpperCase();
  }
  const hex = hashHex(seed).split('');
  // Se marca como UUID version 5 y variante RFC 4122 para que al volver a
  // importarlo el metamodelo lo acepte como identificador valido.
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16);
  return hex.join('').toUpperCase();
}

/** FNV-1a de 128 bits repartido en cuatro carriles de 32 bits con semillas distintas. */
function hashHex(seed: string): string {
  const lanes = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];
  return lanes
    .map((offset, lane) => {
      let hash = offset ^ lane;
      for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
      }
      hash ^= hash >>> 15;
      hash = Math.imul(hash, 0x2c1b3c6d);
      hash ^= hash >>> 12;
      return (hash >>> 0).toString(16).padStart(8, '0');
    })
    .join('');
}

function grouped(hex: string, separator: string): string {
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join(separator);
}

/** `EAID_...` de un elemento, atributo, operacion, relacion o diagrama. */
export function eaId(seed: string): string {
  return `EAID_${grouped(guidHex(seed), '_')}`;
}

/** `EAPK_...` de un paquete. Comparte GUID con el `EAID_` de su elemento. */
export function eaPackageId(seed: string): string {
  return `EAPK_${grouped(guidHex(seed), '_')}`;
}

/** GUID con llaves, como lo guarda Enterprise Architect en `ea_guid`. */
export function eaGuid(seed: string): string {
  return `{${grouped(guidHex(seed), '-')}}`;
}

/** Identificador corto de objeto de diagrama (`DUID`): ocho cifras hexadecimales. */
export function eaDiagramUid(seed: string): string {
  return guidHex(`${seed}-duid`).slice(0, 8);
}

/**
 * Recupera el UUID original de un `EAID_`/`EAPK_`, o null si el identificador
 * no tiene esa forma o no seria un UUID valido para el metamodelo.
 */
export function uuidFromEaId(raw: string): string | null {
  const match = EA_ID_PATTERN.exec(raw);
  if (match === null) {
    return null;
  }
  const uuid = match.slice(1, 6).join('-').toLowerCase();
  return isId(uuid) ? uuid : null;
}

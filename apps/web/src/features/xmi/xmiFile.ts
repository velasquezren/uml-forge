import { exportXmi, importXmi } from '@uml-forge/xmi';
import type { UMLModel } from '@uml-forge/uml-core';

/** Extensiones que acepta el selector de ficheros al importar. */
export const XMI_ACCEPT = '.xmi,.xml,application/xml,text/xml';

/** Tamanno maximo admitido, suficiente para cualquier modelo de clases realista. */
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

/** Convierte un nombre de proyecto en un nombre de fichero seguro. */
export function xmiFileName(modelName: string): string {
  const slug = modelName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-zA-Z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase();
  return `${slug || 'modelo'}.xmi`;
}

/**
 * Serializa el modelo y lo entrega al navegador como descarga. Se hace en el
 * cliente porque el modelo vivo esta en el documento Yjs, no en la base de datos
 * (ADR 0024), asi que la exportacion tambien funciona sin conexion.
 */
export function downloadModelAsXmi(model: UMLModel): { ok: true } | { ok: false; error: string } {
  const result = exportXmi(model, { exporter: 'UML Forge', exporterVersion: '1.0.0' });
  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  const blob = new Blob([result.value], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = xmiFileName(model.name);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return { ok: true };
}

/**
 * Decodifica respetando la declaracion del prologo XML. Enterprise Architect
 * exporta en `windows-1252`, de modo que leer siempre como UTF-8 destroza los
 * acentos de los nombres de clases y atributos.
 */
export function decodeXmlBuffer(buffer: ArrayBuffer): string {
  const head = new TextDecoder('utf-8').decode(buffer.slice(0, 200));
  const declared = /encoding=["']([\w-]+)["']/iu.exec(head)?.[1]?.toLowerCase();

  if (declared === undefined || declared === 'utf-8' || declared === 'utf8') {
    return new TextDecoder('utf-8').decode(buffer);
  }

  try {
    return new TextDecoder(declared).decode(buffer);
  } catch {
    // Codificacion que el navegador no conoce: mejor UTF-8 que nada.
    return new TextDecoder('utf-8').decode(buffer);
  }
}

/** Lee un fichero XMI del disco y lo traduce a un modelo del metamodelo. */
export async function readXmiFile(
  file: File,
  fallbackName: string,
): Promise<{ ok: true; model: UMLModel } | { ok: false; error: string }> {
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'El fichero supera los 10 MB admitidos' };
  }

  let content: string;
  try {
    content = decodeXmlBuffer(await readAsArrayBuffer(file));
  } catch {
    return { ok: false, error: 'No se pudo leer el fichero seleccionado' };
  }

  const result = importXmi(content, { fallbackName });
  return result.ok ? { ok: true, model: result.value } : { ok: false, error: result.error.message };
}

/** Lectura binaria con `FileReader`, soportada por todos los navegadores. */
function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el fichero'));
    reader.onload = () => {
      const result = reader.result;
      // `instanceof` no sirve: el buffer puede venir de otro contexto de ejecucion.
      resolve(result === null || typeof result === 'string' ? new ArrayBuffer(0) : result);
    };
    reader.readAsArrayBuffer(file);
  });
}

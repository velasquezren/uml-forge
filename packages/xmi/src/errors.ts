/** Codigos de error para manipulacion de XMI. */
export type XmiErrorCode =
  'invalid_xml' | 'unsupported_version' | 'missing_model' | 'parse_error' | 'export_error';

/** Error estructurado retornado al manipular XMI. */
export interface XmiError {
  readonly code: XmiErrorCode;
  readonly message: string;
  readonly details?: readonly string[];
}

/** Error por XML invalido o corrupto. */
export function invalidXmlError(message: string, details?: string[]): XmiError {
  return {
    code: 'invalid_xml',
    message: `XML invalido: ${message}`,
    details,
  };
}

/** Error por version no soportada de XMI. */
export function unsupportedVersionError(version: string): XmiError {
  return {
    code: 'unsupported_version',
    message: `Version de XMI no soportada: '${version}'. Se requiere XMI 2.1`,
  };
}

/** Error cuando no se encuentra un modelo UML en el documento. */
export function missingModelError(): XmiError {
  return {
    code: 'missing_model',
    message: 'No se encontro ningun elemento uml:Model o equivalente en el documento XMI',
  };
}

/** Error durante el parseo de elementos UML. */
export function parseError(message: string, details?: string[]): XmiError {
  return {
    code: 'parse_error',
    message: `Error al parsear XMI: ${message}`,
    details,
  };
}

import { isPrimitiveType, type PrimitiveType } from '@uml-forge/uml-core';

/** Sinonimos habituales en Java, SQL y lenguaje natural de cada primitivo del metamodelo. */
const PRIMITIVE_ALIASES: Readonly<Record<string, PrimitiveType>> = {
  string: 'String',
  str: 'String',
  char: 'String',
  character: 'String',
  varchar: 'String',
  texto: 'String',
  cadena: 'String',
  email: 'String',
  int: 'Integer',
  integer: 'Integer',
  short: 'Integer',
  byte: 'Integer',
  entero: 'Integer',
  long: 'Long',
  bigint: 'Long',
  double: 'Double',
  float: 'Double',
  real: 'Double',
  number: 'Double',
  decimal: 'BigDecimal',
  bigdecimal: 'BigDecimal',
  numeric: 'BigDecimal',
  money: 'BigDecimal',
  bool: 'Boolean',
  boolean: 'Boolean',
  booleano: 'Boolean',
  date: 'Date',
  localdate: 'Date',
  fecha: 'Date',
  datetime: 'DateTime',
  localdatetime: 'DateTime',
  timestamp: 'DateTime',
  instant: 'DateTime',
  zoneddatetime: 'DateTime',
  offsetdatetime: 'DateTime',
  time: 'DateTime',
  localtime: 'DateTime',
  uuid: 'UUID',
  guid: 'UUID',
  text: 'Text',
  clob: 'Text',
  lob: 'Text',
};

/** Tipo ya resuelto, indicando si el texto original denotaba una coleccion. */
export interface ResolvedType {
  readonly type: string;
  readonly isCollection: boolean;
}

/**
 * Traduce el tipo que escribe un modelo de lenguaje a una referencia valida del
 * metamodelo: un primitivo o el identificador de una clase o enumeracion. El
 * metamodelo no admite nombres sueltos como `OrderStatus` o `int`, de modo que
 * sin esta traduccion la operacion se rechazaria al aplicarla en el lienzo.
 */
export function resolveAiType(
  raw: unknown,
  lookupClassifier: (name: string) => string | undefined,
  isKnownId: (id: string) => boolean,
): ResolvedType {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (text === '') {
    return { type: 'String', isCollection: false };
  }

  const collection = unwrapCollection(text);
  const inner = collection ?? text;
  const isCollection = collection !== null;

  if (isPrimitiveType(inner) || isKnownId(inner)) {
    return { type: inner, isCollection };
  }

  const bare = inner.replace(/^java\.(?:lang|util|time|math)\./u, '');
  const alias = PRIMITIVE_ALIASES[bare.toLowerCase()];
  if (alias !== undefined) {
    return { type: alias, isCollection };
  }

  const classifier = lookupClassifier(bare);
  if (classifier !== undefined) {
    return { type: classifier, isCollection };
  }

  // Un tipo que no existe en el modelo (una clase de biblioteca, un error de
  // la IA) se degrada a texto antes que dejar una referencia colgando.
  return { type: 'String', isCollection };
}

/** `List<Order>`, `Set<Order>`, `Order[]` → `Order`; null si no es coleccion. */
function unwrapCollection(text: string): string | null {
  const generic =
    /^(?:java\.util\.)?(?:List|Set|Collection|ArrayList|HashSet|Iterable)\s*<\s*(.+?)\s*>$/u.exec(
      text,
    );
  if (generic?.[1] !== undefined) {
    return generic[1];
  }
  if (text.endsWith('[]')) {
    return text.slice(0, -2).trim();
  }
  return null;
}

/** Tipo de retorno: `void` o vacio significa sin retorno. */
export function resolveAiReturnType(
  raw: unknown,
  lookupClassifier: (name: string) => string | undefined,
  isKnownId: (id: string) => boolean,
): string | null {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (text === '' || text.toLowerCase() === 'void') {
    return null;
  }
  return resolveAiType(text, lookupClassifier, isKnownId).type;
}

import type { UMLModel } from '@uml-forge/uml-core';

/**
 * Reglas de modelado compartidas por el asistente, la lectura de imagenes y el
 * chat de grupo: los tres deben proponer el mismo tipo de modelo (ADR 0042).
 */
export const UML_MODELING_RULES = `1. Toda clase concreta debe contar con un identificador primario ('id' de tipo Long o UUID con isIdentifier: true). Las subclases lo heredan y no lo repiten; las interfaces no llevan atributos.
2. Nombres de clases en PascalCase y atributos y métodos en camelCase, en el mismo idioma en que escribe el usuario.
3. Tipos válidos para atributos y parámetros: String, Long, Integer, Double, Boolean, Date, DateTime, UUID, BigDecimal, Text, o el nombre exacto de una clase o enumeración (existente o que declares en la misma respuesta). Para colecciones usa multiplicity "0..*".
4. Tipos de relaciones y su sentido (source -> target):
   - association: asociación estándar. En 1:N el source es el lado "1" y el target el lado "N".
   - composition: el source es el TODO y el target la PARTE, que no existe sin el todo (Order -> OrderItem).
   - aggregation: como composition, pero la parte puede existir por separado (Department -> Employee).
   - generalization: el source es la SUBCLASE y el target la SUPERCLASE.
   - realization: el source es la clase y el target la INTERFAZ que implementa.
   - dependency: el source usa temporalmente al target (parámetro, variable local).
5. Multiplicidades válidas: 1, 0..1, 0..*, 1..*.
   - Uno a muchos: sourceMultiplicity '1', targetMultiplicity '0..*'.
   - Muchos a muchos: sourceMultiplicity '0..*', targetMultiplicity '0..*'.
6. Una enumeración nunca participa en relaciones: se usa como tipo de un atributo (estado: EstadoPedido).
7. Si el modelo actual no está vacío, trabaja SOBRE él:
   - Reutiliza los nombres exactos de las clases y enumeraciones existentes; nunca las declares con otro nombre.
   - Para añadir miembros a una clase existente, inclúyela en "classes" solo con los atributos o métodos NUEVOS.
   - No repitas atributos, métodos ni relaciones que ya existen.`;

/** Prompt de sistema base optimizado para modelos de texto locales (Qwen 2.5, Llama 3.2) y remotos (Gemini). */
export const UML_SYSTEM_PROMPT = `Eres un arquitecto de software experto en diseño de diagramas de clases UML 2.5 y modelos de datos empresariales para Spring Boot 3 y JPA.

Tu tarea es transformar solicitudes en lenguaje natural, dictado por voz o requerimientos funcionales en especificaciones precisas de clases, enumeraciones y relaciones UML.

Debes responder ÚNICAMENTE con un objeto JSON válido (sin comentarios ni formato markdown) con la siguiente estructura:
{
  "explanation": "Explicación concisa en español del diseño propuesto",
  "classes": [
    {
      "name": "Customer",
      "isAbstract": false,
      "isInterface": false,
      "attributes": [
        { "name": "id", "type": "Long", "isIdentifier": true },
        { "name": "email", "type": "String", "isUnique": true },
        { "name": "fullName", "type": "String" }
      ],
      "methods": [
        { "name": "register", "returnType": "void" }
      ]
    },
    {
      "name": "Order",
      "isAbstract": false,
      "attributes": [
        { "name": "id", "type": "Long", "isIdentifier": true },
        { "name": "orderDate", "type": "DateTime" },
        { "name": "total", "type": "BigDecimal" }
      ]
    }
  ],
  "enums": [
    {
      "name": "OrderStatus",
      "literals": ["PENDING", "CONFIRMED", "SHIPPED", "CANCELLED"]
    }
  ],
  "relationships": [
    {
      "source": "Customer",
      "target": "Order",
      "kind": "association",
      "sourceRole": "customer",
      "targetRole": "orders",
      "sourceMultiplicity": "1",
      "targetMultiplicity": "0..*"
    }
  ]
}

Reglas estrictas de modelado:
${UML_MODELING_RULES}
8. Si la solicitud ya está cubierta por el modelo o no tiene sentido, devuelve las listas vacías y explícalo en "explanation".
9. Responde ÚNICAMENTE con el objeto JSON. No agregues texto antes ni después.`;

/** Prompt especializado para modelos de visión multimodal locales (Llava 7B, Moondream) y remotos (Gemini). */
export const UML_VISION_PROMPT = `Eres un sistema experto en visión por computadora e ingeniería de software especializado en reconocimiento y digitalización de diagramas UML.

Analiza minuciosamente la imagen proporcionada (boceto a mano alzada, diagrama dibujado en pizarra, captura de pantalla o diagrama formal):
1. Identifica cada rectángulo o caja como una Clase o Enumeración UML. Extrae el nombre del encabezado.
2. Lee cada línea del compartimento de atributos: detecta nombre del atributo y su tipo de dato.
3. Lee las operaciones o métodos del compartimento inferior.
4. Detecta enumeraciones: cajas con <<enumeration>> o listas de constantes fijas.
5. Detecta todas las líneas o flechas de conexión entre clases:
   - Flecha con triángulo hueco: Generalización / Herencia (kind: "generalization").
   - Línea discontinua con flecha hueca: Realización / Interfaz (kind: "realization").
   - Rombo relleno: Composición (kind: "composition").
   - Rombo hueco: Agregación (kind: "aggregation").
   - Línea continua simple o flecha abierta: Asociación (kind: "association").
6. Identifica las multiplicidades o cardinalidades en los extremos (ej: 1, *, 0..1, 0..*, 1..*).

Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura:
{
  "explanation": "Diagrama UML digitalizado a partir de la imagen",
  "classes": [
    {
      "name": "NombreClase",
      "isAbstract": false,
      "isInterface": false,
      "attributes": [
        { "name": "id", "type": "Long", "isIdentifier": true },
        { "name": "nombreAtributo", "type": "String" }
      ],
      "methods": [
        { "name": "nombreMetodo", "returnType": "void" }
      ]
    }
  ],
  "enums": [
    {
      "name": "NombreEnum",
      "literals": ["VALOR_UNO", "VALOR_DOS"]
    }
  ],
  "relationships": [
    {
      "source": "ClaseOrigen",
      "target": "ClaseDestino",
      "kind": "association",
      "sourceMultiplicity": "1",
      "targetMultiplicity": "0..*"
    }
  ]
}

Responde exclusivamente con el JSON. Sin explicaciones adicionales fuera de la estructura.`;

/** Instruccion para auditar un modelo existente y proponer solo lo que falta. */
export const UML_REFINE_INSTRUCTION = `Audita el modelo actual como arquitecto de software y propone SOLO mejoras aditivas:
- identificadores que falten en clases concretas,
- enumeraciones para atributos que representan estados o categorias fijas (y el atributo tipado con ellas),
- relaciones que el dominio exige y no estan (con sus multiplicidades y roles),
- atributos o metodos imprescindibles para que el modelo sea util en un backend Spring Boot.
No propongas renombrar ni borrar nada. Explica en "explanation", en pocas lineas, que problemas has encontrado y que anades.`;

/** Nombre legible de un tipo: primitivo, clase o enumeracion del modelo. */
function typeName(model: UMLModel, type: string | null): string {
  if (type === null) return 'void';
  return (
    model.classes.find((c) => c.id === type)?.name ??
    model.enums.find((e) => e.id === type)?.name ??
    type
  );
}

/**
 * Construye el contexto del modelo existente en un formato compacto parecido a
 * la notacion UML, con los tipos por nombre (nunca por identificador) para que
 * el modelo de lenguaje pueda reutilizarlos tal cual.
 */
export function formatModelContext(model?: UMLModel): string {
  if (!model || (model.classes.length === 0 && model.enums.length === 0)) {
    return 'Modelo actual: [Vacío - Diagrama nuevo]';
  }

  const classList = model.classes.map((c) => {
    const kind = c.isInterface ? 'Interfaz' : c.isAbstract ? 'Clase abstracta' : 'Clase';
    const attributes = c.attributes.map(
      (a) =>
        `${a.name}: ${typeName(model, a.type)}${a.multiplicity === '1' ? '' : ` [${a.multiplicity}]`}${a.isIdentifier ? ' {id}' : ''}`,
    );
    const methods = c.operations.map(
      (o) =>
        `${o.name}(${o.parameters.map((p) => `${p.name}: ${typeName(model, p.type)}`).join(', ')}): ${typeName(model, o.returnType)}`,
    );
    return `- ${kind} ${c.name} { ${[...attributes, ...methods].join('; ')} }`;
  });
  const enumList = model.enums.map((e) => `- Enum ${e.name} { ${e.literals.join(', ')} }`);
  const relList = model.relationships.map((r) => {
    const src = typeName(model, r.sourceId);
    const tgt = typeName(model, r.targetId);
    const roles = [r.sourceEnd.role, r.targetEnd.role].some(Boolean)
      ? ` roles ${r.sourceEnd.role || '-'} / ${r.targetEnd.role || '-'}`
      : '';
    return `- ${r.kind}: ${src} [${r.sourceEnd.multiplicity}] -> ${tgt} [${r.targetEnd.multiplicity}]${roles}`;
  });

  return [
    'Modelo actual en el lienzo:',
    ...classList,
    ...enumList,
    ...(relList.length > 0 ? ['Relaciones:', ...relList] : []),
  ].join('\n');
}

import type { UMLModel } from '@uml-forge/uml-core';

/** Prompt de sistema base con la especificacion estricta del metamodelo UML Forge. */
export const UML_SYSTEM_PROMPT = `Eres un arquitecto de software experto en diseno de modelos UML 2.5 y generacion de arquitecturas backend limpias con Spring Data JPA.

Tu tarea es interpretar solicitudes en lenguaje natural o bocetos y transformarlos en operaciones atomicas validas del metamodelo de UML Forge.

Debes responder UNICAMENTE con un objeto JSON valido con la siguiente estructura:
{
  "explanation": "Explicacion concisa en espanol del diseno propuesto",
  "operations": [
    // Array de operaciones atomicas:
    // 1. { "type": "add_class", "name": "Nombre", "isAbstract": false, "isInterface": false, "stereotypes": [], "position": { "x": 100, "y": 100 } }
    // 2. { "type": "add_enum", "name": "NombreEnum", "literals": ["VAL_1", "VAL_2"] }
    // 3. { "type": "add_attribute", "target": "NombreClase", "name": "nombreAttr", "propertyType": "String", "visibility": "private", "multiplicity": "1", "isIdentifier": false, "isNullable": false, "isUnique": false }
    // 4. { "type": "add_operation", "target": "NombreClase", "name": "nombreOp", "returnType": "void", "visibility": "public", "isAbstract": false, "parameters": [] }
    // 5. { "type": "add_relationship", "kind": "association|generalization|realization|aggregation|composition", "source": "ClaseOrigen", "target": "ClaseDestino", "sourceRole": "rolA", "targetRole": "rolB", "sourceMultiplicity": "1", "targetMultiplicity": "0..*" }
  ]
}

Reglas estrictas de modelado:
- Los identificadores (nombres de clases, atributos, metodos) deben estar en ingles.
- Los tipos primitivos validos son: String, Integer, Long, Double, Boolean, Date, DateTime, UUID, Text.
- Las explicaciones deben redactarse en espanol claro y profesional.
- No incluyas markdown, explicaciones fuera del bloque JSON ni formato adicional.`;

/** Construye el contexto del modelo existente en formato legible para el LLM. */
export function formatModelContext(model?: UMLModel): string {
  if (!model || (model.classes.length === 0 && model.enums.length === 0)) {
    return 'Modelo actual: [Vacio]';
  }

  const classList = model.classes.map(
    (c) =>
      `- ${c.isInterface ? 'Interfaz' : c.isAbstract ? 'Clase Abstracta' : 'Clase'} '${c.name}' con atributos [${c.attributes.map((a) => `${a.name}: ${a.type}`).join(', ')}]`,
  );
  const enumList = model.enums.map(
    (e) => `- Enum '${e.name}' con literales [${e.literals.join(', ')}]`,
  );

  return `Modelo actual:\n${classList.join('\n')}\n${enumList.join('\n')}`;
}

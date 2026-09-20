---
name: fase-01-metamodelo
description: Referencia de packages/uml-core, el metamodelo UML 2.5 ya construido. API exportada, lenguaje de 16 operaciones, validador, mapeo Yjs y JSON Schema. Leer antes de cualquier fase que toque el modelo, para no reinventar tipos que ya existen.
---

# packages/uml-core (ya construido)

Unica fuente de verdad de los tipos UML. **Ni la PWA ni la API los redefinen.**
Todo se define con esquemas Zod y los tipos TypeScript se derivan con `z.infer`.

Se publica en doble formato: `import` resuelve a `dist/esm` y `require` a
`dist/cjs`, porque `apps/api` es CommonJS. Por eso **todas las importaciones
relativas del codigo fuente llevan extension `.js`**.

## Metamodelo

```
Visibility     = 'public' | 'private' | 'protected' | 'package'
PrimitiveType  = 'String' | 'Integer' | 'Long' | 'Double' | 'BigDecimal'
               | 'Boolean' | 'Date' | 'DateTime' | 'UUID' | 'Text'
TypeReference  = PrimitiveType | UUID de una clase o enumeracion del modelo

UMLParameter    { id, name, type, direction: 'in'|'out'|'inout'|'return' }
UMLOperation    { id, name, returnType: TypeReference|null, visibility,
                  isAbstract, isStatic, parameters }
UMLProperty     { id, name, type, visibility, multiplicity, isStatic, isDerived,
                  isUnique, isNullable, isIdentifier, defaultValue: string|null }
UMLClass        { id, name, isAbstract, isInterface, stereotypes,
                  attributes, operations, position: { x, y } }
UMLEnum         { id, name, literals }
RelationshipKind= 'association'|'aggregation'|'composition'
                | 'generalization'|'realization'|'dependency'
UMLEnd          { name, multiplicity, navigable, role }
UMLRelationship { id, kind, name, sourceId, targetId, sourceEnd, targetEnd }
UMLModel        { id, name, classes, enums, relationships, createdAt, updatedAt }
```

Reglas duras ya implementadas:

- Todo elemento nace con un UUID v4 estable, generado con `crypto.randomUUID()`.
  **Nunca se identifica por nombre.**
- `multiplicity` valida contra `1`, `0..1`, `1..*`, `0..*`, `*`, `n` y `n..m`.
- `returnType: null` significa operacion sin valor de retorno (`void` al generar).
- `createdAt` y `updatedAt` son cadenas ISO 8601.

## Lenguaje de operaciones

Union discriminada por `type` con 16 variantes. Es lo que emite la IA, lo que
viaja en la cola offline y lo que se aplica sobre el documento Yjs. **Ningun
productor devuelve un modelo completo, solo operaciones incrementales.**

```
addClass         { class }              updateClass    { id, changes }
deleteClass      { id }                 setPosition    { classId, position }
addAttribute     { classId, attribute } updateAttribute{ id, changes }
deleteAttribute  { id }
addOperation     { classId, operation } updateOperation{ id, changes }
deleteOperation  { id }
addRelationship  { relationship }       updateRelationship { id, changes }
deleteRelationship { id }
addEnum          { enum }               updateEnum     { id, changes }
deleteEnum       { id }
```

Los payloads de entrada llevan valores por defecto: `visibility: 'private'` en
atributos y `'public'` en operaciones, `multiplicity: '1'`, `isNullable: true`,
`defaultValue: null`, `stereotypes: []`, `position: { x: 0, y: 0 }`, extremos de
relacion `{ name: '', multiplicity: '1', navigable: true, role: '' }`. El `id` es
siempre obligatorio: quien emite la operacion lo genera.

Cuidado con los nombres: `UmlOperation` es una operacion del lenguaje;
`UMLOperation` es un metodo de una clase del modelo.

## API exportada

| Simbolo                                                                                                                                                 | Que hace                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `UMLModelSchema`, `UMLClassSchema`, ...                                                                                                                 | Esquemas Zod del metamodelo                          |
| `UmlOperationSchema`, `UmlOperation`, `UmlOperationInput`                                                                                               | Lenguaje de operaciones                              |
| `UML_OPERATION_TYPES`                                                                                                                                   | Lista de los 16 discriminantes                       |
| `parseOperation(raw)`                                                                                                                                   | Valida y normaliza una operacion de fuente no fiable |
| `applyOperation(model, op, { now })`                                                                                                                    | Puro e inmutable                                     |
| `applyOperations(model, ops, { now })`                                                                                                                  | Atomico: si una falla, ninguna se aplica             |
| `validateModel(model)`, `isValidModel(model)`                                                                                                           | Lista completa de problemas                          |
| `toYDoc(model)`, `writeModel(doc, model)`                                                                                                               | Modelo a CRDT                                        |
| `fromYDoc(doc)`, `hasModel(doc)`                                                                                                                        | CRDT a modelo                                        |
| `applyOperationToYDoc(doc, op, { now, origin })`                                                                                                        | Operacion directa sobre el CRDT                      |
| `applyOperationsToYDoc(doc, ops, opts)`                                                                                                                 | Lote atomico sobre el CRDT                           |
| `umlOperationJsonSchema()`, `umlOperationListJsonSchema()`, `umlModelJsonSchema()`                                                                      | JSON Schema para salida estructurada de LLM          |
| `createEmptyModel`, `findClass`, `findEnum`, `findAttribute`, `findOperation`, `findRelationship`, `findClassByName`, `typeExists`, `collectElementIds` | Utilidades de modelo                                 |
| `parseMultiplicity`, `isCollection`, `isRequired`                                                                                                       | Interpretacion de multiplicidades                    |
| `ROOT_CLASSES`, `ROOT_ENUMS`, `ROOT_RELATIONSHIPS`, `ROOT_META`                                                                                         | Claves del Y.Doc                                     |

## Nada lanza excepciones

Todo devuelve `Result<T, UmlError>`:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

`UmlError` lleva `code` de un catalogo cerrado, `message` en espanol, `elementId`
y `path`. Codigos: `invalid_payload`, `class_not_found`, `enum_not_found`,
`relationship_not_found`, `attribute_not_found`, `operation_not_found`,
`duplicate_id`, `duplicate_name`, `dangling_reference`, `unknown_type`,
`cyclic_inheritance`, `invalid_multiplicity`, `invalid_generalization`,
`invalid_realization`, `invalid_document`.

**El modulo de sincronizacion decide `applied` / `skipped_duplicate` / `conflict`
a partir de estos codigos, no analizando cadenas de texto.**

## Forma del documento Yjs

- Cuatro raices: `classes`, `enums`, `relationships` y `meta`.
- Las tres colecciones son `Y.Map` **indexadas por identificador**, no `Y.Array`:
  dos usuarios que crean clases a la vez escriben en claves distintas.
- Cada clase es un `Y.Map`; sus `attributes` y `operations` son `Y.Array` de
  `Y.Map`, porque ahi el orden si es informacion visible.
- La posicion vive en un mapa anidado `position` dentro de la clase, de modo que
  arrastrar una clase no toca ningun otro nodo.
- `fromYDoc` devuelve las colecciones **ordenadas por identificador** para que la
  reconstruccion sea determinista.

`applyOperationToYDoc` no reimplementa reglas: reconstruye el modelo, delega la
validacion en `applyOperation` y solo entonces escribe mutaciones nativas en una
transaccion.

## Politicas ya decididas

- **Borrado en cascada**: borrar una clase se lleva sus relaciones, los atributos
  de cualquier clase tipados con ella y los parametros que la usaban; el tipo de
  retorno de las operaciones que la devolvian pasa a `null`. Igual con enums.
- **Herencia**: una realizacion debe apuntar a una interfaz; una clase no
  generaliza una interfaz, la realiza; los ciclos se rechazan al aplicar.
- **Fusion**: dos clases creadas sin conexion con el mismo nombre **sobreviven
  las dos** tras la fusion. El CRDT no puede saber que son la misma.
  `validateModel` lo reporta como `duplicate_name` y lo resuelve la politica de
  conflictos de la Fase 5. Hay una prueba que fija ese comportamiento.

## Estado

Completada. 98 pruebas, cobertura de sentencias 95,43 por ciento, umbral
configurado al 80 en las cuatro metricas.

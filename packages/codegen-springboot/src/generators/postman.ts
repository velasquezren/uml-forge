import type { AnalyzedEntity, AnalyzedModel, CodegenOptions, GeneratedFile } from '../types.js';
import { entityBasePath } from './controller.js';
import { buildRequestBody, idVariableName, referencedTargets } from './postman-samples.js';

/** Esquema de coleccion que entienden Postman y Newman. */
const COLLECTION_SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

/** Carpeta del proyecto generado donde viven los ficheros de Postman. */
export const POSTMAN_DIR = 'postman';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface PostmanRequestItem {
  readonly name: string;
  readonly event: { listen: 'test'; script: { type: 'text/javascript'; exec: string[] } }[];
  readonly request: {
    readonly method: HttpMethod;
    readonly header: { key: string; value: string }[];
    readonly body?: { mode: 'raw'; raw: string; options: { raw: { language: 'json' } } };
    readonly url: { raw: string; host: string[]; path: string[] };
    readonly description: string;
  };
}

interface PostmanFolder {
  readonly name: string;
  readonly description: string;
  readonly item: PostmanRequestItem[];
}

/** Datos de una peticion antes de darle la forma de Postman. */
interface RequestSpec {
  readonly name: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly description: string;
  readonly tests: string[];
  readonly body?: string;
}

function request(spec: RequestSpec): PostmanRequestItem {
  const segments = spec.path.split('/').filter((s) => s.length > 0);
  return {
    name: spec.name,
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: spec.tests } }],
    request: {
      method: spec.method,
      header: spec.body === undefined ? [] : [{ key: 'Content-Type', value: 'application/json' }],
      ...(spec.body === undefined
        ? {}
        : { body: { mode: 'raw', raw: spec.body, options: { raw: { language: 'json' } } } }),
      url: { raw: `{{baseUrl}}/${segments.join('/')}`, host: ['{{baseUrl}}'], path: segments },
      description: spec.description,
    },
  };
}

function expectStatus(code: number, label: string): string {
  return `pm.test('Responde ${code} ${label}', function () { pm.response.to.have.status(${code}); });`;
}

/**
 * Orden de alta: cada entidad va despues de las que referencia, para que su
 * cuerpo pueda enviar el id ya creado. Los ciclos se rompen dejando sin
 * referencia a la entidad que cierra el ciclo.
 */
export function creationOrder(model: AnalyzedModel): AnalyzedEntity[] {
  const ordered: AnalyzedEntity[] = [];
  const visiting = new Set<AnalyzedEntity>();
  const visit = (entity: AnalyzedEntity): void => {
    if (ordered.includes(entity) || visiting.has(entity)) return;
    visiting.add(entity);
    referencedTargets(entity, model).forEach((target) => visit(target.entity));
    visiting.delete(entity);
    ordered.push(entity);
  };
  Array.from(model.entities.values())
    .filter((e) => !e.isAbstract && !e.isInterface)
    .forEach(visit);
  return ordered;
}

function entityFolder(
  entity: AnalyzedEntity,
  model: AnalyzedModel,
  position: number,
  availableIds: ReadonlySet<string>,
): PostmanFolder {
  const name = entity.javaClassName;
  const base = entityBasePath(entity);
  const idVar = idVariableName(entity);
  const byId = `${base}/{{${idVar}}}`;
  const sameId = `pm.test('Devuelve el registro pedido', function () { pm.expect(String(pm.response.json().id)).to.eql(String(pm.collectionVariables.get('${idVar}'))); });`;

  return {
    name: `${position}. ${name}`,
    description: `CRUD de ${name} en \`${base}\`.`,
    item: [
      request({
        name: `Crear ${name}`,
        method: 'POST',
        path: base,
        description: `Da de alta un ${name} y guarda su id en la variable \`${idVar}\`.`,
        body: buildRequestBody(entity, model, 'create', availableIds),
        tests: [
          expectStatus(201, 'Created'),
          'const body = pm.response.json();',
          "pm.test('Devuelve el id generado', function () { pm.expect(body.id).to.be.a('number'); });",
          `pm.collectionVariables.set('${idVar}', body.id);`,
        ],
      }),
      request({
        name: `Listar ${name}`,
        method: 'GET',
        path: base,
        description: `Devuelve todos los registros de ${name}.`,
        tests: [
          expectStatus(200, 'OK'),
          "pm.test('Devuelve una lista', function () { pm.expect(pm.response.json()).to.be.an('array'); });",
        ],
      }),
      request({
        name: `Obtener ${name} por id`,
        method: 'GET',
        path: byId,
        description: `Devuelve el ${name} creado en este recorrido. Responde 404 si no existe.`,
        tests: [expectStatus(200, 'OK'), sameId],
      }),
      request({
        name: `Actualizar ${name}`,
        method: 'PUT',
        path: byId,
        description: `Sustituye el ${name} completo: los campos que no se envien quedan a null.`,
        body: buildRequestBody(entity, model, 'update', availableIds),
        tests: [expectStatus(200, 'OK'), sameId],
      }),
    ],
  };
}

function cleanupFolder(order: readonly AnalyzedEntity[], position: number): PostmanFolder {
  const items = [...order].reverse().flatMap((entity) => {
    const byId = `${entityBasePath(entity)}/{{${idVariableName(entity)}}}`;
    return [
      request({
        name: `Eliminar ${entity.javaClassName}`,
        method: 'DELETE',
        path: byId,
        description: `Borra el ${entity.javaClassName} creado. Responde 204 sin cuerpo.`,
        tests: [expectStatus(204, 'No Content')],
      }),
      request({
        name: `Comprobar que ${entity.javaClassName} ya no existe`,
        method: 'GET',
        path: byId,
        description: 'Tras el borrado, la busqueda por id responde 404.',
        tests: [expectStatus(404, 'Not Found')],
      }),
    ];
  });
  return {
    name: `${position}. Limpieza`,
    description: 'Borra lo creado en orden inverso, para no romper claves ajenas.',
    item: items,
  };
}

/** Genera la coleccion y el entorno local de Postman del backend (ADR 0043). */
export function generatePostmanFiles(
  options: CodegenOptions,
  analyzed: AnalyzedModel,
): GeneratedFile[] {
  const order = creationOrder(analyzed);
  const created = new Set<string>();
  const folders: PostmanFolder[] = order.map((entity, index) => {
    const folder = entityFolder(entity, analyzed, index + 1, created);
    created.add(idVariableName(entity));
    return folder;
  });

  const checks: PostmanFolder = {
    name: '0. Comprobaciones',
    description: 'Confirma que el backend esta arrancado antes de probar el CRUD.',
    item: [
      request({
        name: 'Documentacion OpenAPI',
        method: 'GET',
        path: '/v3/api-docs',
        description: 'La misma especificacion que muestra Swagger UI en /swagger-ui.html.',
        tests: [
          expectStatus(200, 'OK'),
          "pm.test('Publica las rutas de la API', function () { pm.expect(pm.response.json()).to.have.property('paths'); });",
        ],
      }),
    ],
  };

  const collection = {
    info: {
      _postman_id: analyzed.rawModel.id,
      name: `${options.applicationName} API`,
      description:
        `Peticiones del backend ${options.applicationName} generado por UML Forge.\n\n` +
        'Ejecuta la coleccion completa con el Runner: las carpetas estan en el orden en que ' +
        'deben correr. Guia completa en postman/README.md.',
      schema: COLLECTION_SCHEMA,
    },
    item:
      order.length > 0 ? [checks, ...folders, cleanupFolder(order, order.length + 1)] : [checks],
    variable: [
      { key: 'baseUrl', value: `http://localhost:${options.serverPort}` },
      ...order.map((entity) => ({ key: idVariableName(entity), value: '' })),
    ],
  };

  const environment = {
    name: `${options.applicationName} local`,
    values: [
      {
        key: 'baseUrl',
        value: `http://localhost:${options.serverPort}`,
        type: 'default',
        enabled: true,
      },
    ],
    _postman_variable_scope: 'environment',
  };

  return [
    {
      path: `${POSTMAN_DIR}/${options.artifactId}.postman_collection.json`,
      content: `${JSON.stringify(collection, null, 2)}\n`,
    },
    {
      path: `${POSTMAN_DIR}/${options.artifactId}.postman_environment.json`,
      content: `${JSON.stringify(environment, null, 2)}\n`,
    },
  ];
}

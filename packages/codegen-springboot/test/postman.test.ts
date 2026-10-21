import { describe, expect, it } from 'vitest';
import { generateSpringBootProject } from '../src/generator.js';
import type { UMLModel } from '../src/types.js';
import {
  compositionCascadeModel,
  enumsModel,
  manyToManyModel,
  selfReferenceModel,
} from './models/index.js';

interface PostmanItem {
  name: string;
  item?: PostmanItem[];
  request?: { method: string; url: { raw: string }; body?: { raw: string } };
}

interface PostmanCollection {
  info: { name: string; schema: string };
  item: PostmanItem[];
  variable: { key: string; value: string }[];
}

function project(model: UMLModel): Map<string, string> {
  const result = generateSpringBootProject(model, { artifactId: 'demo', database: 'h2' });
  if (!result.ok) throw new Error(result.error.message);
  return new Map(result.value.map((file) => [file.path, file.content]));
}

function collectionOf(model: UMLModel): PostmanCollection {
  const raw = project(model).get('postman/demo.postman_collection.json') ?? '';
  return JSON.parse(raw) as PostmanCollection;
}

function findRequest(collection: PostmanCollection, name: string): PostmanItem | undefined {
  return collection.item.flatMap((folder) => folder.item ?? []).find((i) => i.name === name);
}

describe('coleccion de Postman del backend generado (ADR 0043)', () => {
  it('genera coleccion v2.1, entorno local y guia', () => {
    const files = project(compositionCascadeModel);
    const collection = collectionOf(compositionCascadeModel);
    const environment = JSON.parse(files.get('postman/demo.postman_environment.json') ?? '') as {
      values: { key: string; value: string }[];
    };

    expect(collection.info.schema).toContain('/collection/v2.1.0/');
    expect(environment.values).toContainEqual(
      expect.objectContaining({ key: 'baseUrl', value: 'http://localhost:8080' }),
    );
    expect(files.get('postman/README.md')).toContain('Run collection');
    expect(files.get('README.md')).toContain('postman/README.md');
  });

  it('crea antes la entidad referenciada y borra en orden inverso', () => {
    const names = collectionOf(compositionCascadeModel).item.map((folder) => folder.name);
    expect(names).toEqual(['0. Comprobaciones', '1. Order', '2. OrderItem', '3. Limpieza']);

    const cleanup = collectionOf(compositionCascadeModel).item[3]?.item?.map((i) => i.name);
    expect(cleanup?.[0]).toBe('Eliminar OrderItem');
    expect(cleanup?.[2]).toBe('Eliminar Order');
  });

  it('usa las rutas reales de los controladores', () => {
    const create = findRequest(collectionOf(compositionCascadeModel), 'Crear OrderItem');
    expect(create?.request?.method).toBe('POST');
    expect(create?.request?.url.raw).toBe('{{baseUrl}}/api/order-items');
  });

  it('referencia el padre por id desde el lado propietario', () => {
    const collection = collectionOf(compositionCascadeModel);
    const itemBody = findRequest(collection, 'Crear OrderItem')?.request?.body?.raw ?? '';
    const orderBody = findRequest(collection, 'Crear Order')?.request?.body?.raw ?? '';

    expect(itemBody).toContain('"id": {{orderId}}');
    expect(orderBody).not.toContain('items');
  });

  it('envia muchos a muchos como lista de referencias', () => {
    const body = findRequest(collectionOf(manyToManyModel), 'Crear Student')?.request?.body?.raw;
    expect(body).toMatch(/"courses": \[\s*\{\s*"id": \{\{courseId\}\}/);
  });

  it('deja vacia la autorreferencia y rellena las enumeraciones', () => {
    const category = findRequest(collectionOf(selfReferenceModel), 'Crear Category');
    expect(category?.request?.body?.raw).not.toContain('parent');

    const task = findRequest(collectionOf(enumsModel), 'Crear TaskItem')?.request?.body?.raw ?? '';
    expect(JSON.parse(task)).toMatchObject({ status: 'TODO', priority: 'LOW' });
  });

  it('corta los ciclos de JSON y mantiene la sesion abierta al serializar', () => {
    const files = project(compositionCascadeModel);
    const item = files.get('src/main/java/com/example/demo/model/OrderItem.java') ?? '';
    const order = files.get('src/main/java/com/example/demo/model/Order.java') ?? '';

    expect(item).toContain(
      '@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "items"})',
    );
    expect(order).toContain(
      '@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "order"})',
    );
    expect(files.get('src/main/resources/application.properties')).toContain(
      'spring.jpa.open-in-view=true',
    );
  });

  it('no lleva emojis en la guia', () => {
    const guide = project(manyToManyModel).get('postman/README.md') ?? '';
    expect(guide).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { generationFailedError, unsupportedTypeError } from '../src/errors.js';
import {
  generateSpringBootProject,
  resolveDefaultOptions,
  writeProjectToDisk,
} from '../src/generator.js';
import { mapUmlTypeToJava } from '../src/generators/type-helper.js';
import { analyzeModel } from '../src/analyzer.js';
import {
  pluralize,
  sanitizeJavaIdentifier,
  sanitizePackageName,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  toScreamingSnakeCase,
} from '../src/naming.js';
import type { UMLModel } from '../src/types.js';
import {
  compositionCascadeModel,
  enumsModel,
  interfaceRealizationModel,
  manyToManyModel,
  selfReferenceModel,
  singleInheritanceModel,
} from './models/index.js';

describe('Spring Boot Codegen Generator', () => {
  it('genera correctamente el modelo 1 (herencia simple con clase abstracta)', () => {
    const result = generateSpringBootProject(singleInheritanceModel);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileMap = new Map(result.value.map((f) => [f.path, f.content]));

    expect(fileMap.has('pom.xml')).toBe(true);
    expect(fileMap.has('src/main/resources/application.properties')).toBe(true);

    const personContent = fileMap.get(
      'src/main/java/com/example/single_inheritance_model/model/Person.java',
    );
    expect(personContent).toBeDefined();
    expect(personContent).toContain('public abstract class Person');
    expect(personContent).toContain('@Inheritance(strategy = InheritanceType.JOINED)');
    expect(personContent).toContain('@Id');

    const studentContent = fileMap.get(
      'src/main/java/com/example/single_inheritance_model/model/Student.java',
    );
    expect(studentContent).toBeDefined();
    expect(studentContent).toContain('public class Student extends Person');
    expect(studentContent).not.toContain('@Id');

    const teacherContent = fileMap.get(
      'src/main/java/com/example/single_inheritance_model/model/Teacher.java',
    );
    expect(teacherContent).toBeDefined();
    expect(teacherContent).toContain('public class Teacher extends Person');
  });

  it('genera correctamente el modelo 2 (realizacion de interfaces multiples)', () => {
    const result = generateSpringBootProject(interfaceRealizationModel);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileMap = new Map(result.value.map((f) => [f.path, f.content]));

    const auditable = fileMap.get(
      'src/main/java/com/example/interface_realization_model/model/Auditable.java',
    );
    expect(auditable).toContain('public interface Auditable');
    expect(auditable).toContain('String getAuditLog();');

    const printable = fileMap.get(
      'src/main/java/com/example/interface_realization_model/model/Printable.java',
    );
    expect(printable).toContain('public interface Printable');
    expect(printable).toContain('String printSummary();');

    const report = fileMap.get(
      'src/main/java/com/example/interface_realization_model/model/Report.java',
    );
    expect(report).toContain('implements Serializable, Auditable, Printable');
    expect(report).toContain('public String getAuditLog()');
    expect(report).toContain('public String printSummary()');
  });

  it('genera correctamente el modelo 3 (relacion muchos a muchos)', () => {
    const result = generateSpringBootProject(manyToManyModel);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileMap = new Map(result.value.map((f) => [f.path, f.content]));

    const student = fileMap.get('src/main/java/com/example/many_to_many_model/model/Student.java');
    expect(student).toContain('@ManyToMany');
    expect(student).toContain('@JoinTable');
    expect(student).toContain('List<Course>');

    const course = fileMap.get('src/main/java/com/example/many_to_many_model/model/Course.java');
    expect(course).toContain('@ManyToMany(mappedBy = "courses")');
    expect(course).toContain('List<Student>');
  });

  it('genera correctamente el modelo 4 (autorreferencia recursiva)', () => {
    const result = generateSpringBootProject(selfReferenceModel);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileMap = new Map(result.value.map((f) => [f.path, f.content]));

    const category = fileMap.get(
      'src/main/java/com/example/self_reference_model/model/Category.java',
    );
    expect(category).toContain('@ManyToOne');
    expect(category).toContain('private Category parent;');
    expect(category).toContain('@OneToMany(mappedBy = "parent"');
    expect(category).toContain('private List<Category> children');
  });

  it('genera correctamente el modelo 5 (composicion y borrado en cascada)', () => {
    const result = generateSpringBootProject(compositionCascadeModel);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileMap = new Map(result.value.map((f) => [f.path, f.content]));

    const order = fileMap.get(
      'src/main/java/com/example/composition_cascade_model/model/Order.java',
    );
    expect(order).toContain(
      '@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)',
    );
    expect(order).toContain('List<OrderItem>');

    const item = fileMap.get(
      'src/main/java/com/example/composition_cascade_model/model/OrderItem.java',
    );
    expect(item).toContain('@ManyToOne');
    expect(item).toContain('private Order order;');
  });

  it('genera correctamente el modelo 6 (enumeraciones)', () => {
    const result = generateSpringBootProject(enumsModel);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileMap = new Map(result.value.map((f) => [f.path, f.content]));

    const taskStatus = fileMap.get('src/main/java/com/example/enums_model/model/TaskStatus.java');
    expect(taskStatus).toContain('public enum TaskStatus');
    expect(taskStatus).toContain('TODO');
    expect(taskStatus).toContain('IN_PROGRESS');

    const priorityLevel = fileMap.get(
      'src/main/java/com/example/enums_model/model/PriorityLevel.java',
    );
    expect(priorityLevel).toContain('public enum PriorityLevel');
    expect(priorityLevel).toContain('URGENT');

    const taskItem = fileMap.get('src/main/java/com/example/enums_model/model/TaskItem.java');
    expect(taskItem).toContain('@Enumerated(EnumType.STRING)');
    expect(taskItem).toContain('private TaskStatus status;');
    expect(taskItem).toContain('private PriorityLevel priority;');
  });

  it('soporta opciones personalizadas y base de datos H2', () => {
    const result = generateSpringBootProject(singleInheritanceModel, {
      database: 'h2',
      groupId: 'org.myorg',
      artifactId: 'custom-app',
      packageName: 'org.myorg.custom',
      serverPort: 9090,
      description: 'Custom app description',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileMap = new Map(result.value.map((f) => [f.path, f.content]));
    const props = fileMap.get('src/main/resources/application.properties');
    expect(props).toContain('server.port=9090');
    expect(props).toContain('jdbc:h2:mem');
  });

  it('escribe archivos en disco correctamente con writeProjectToDisk', async () => {
    const result = generateSpringBootProject(singleInheritanceModel);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'disk-write-test-'));
    try {
      await writeProjectToDisk(result.value, tmpDir);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('soporta relaciones 1 a 1 bidireccionales y operaciones con parametros', () => {
    const oneToOneModel: UMLModel = {
      id: 'a0000007-0000-0000-0000-000000000001',
      name: 'One To One Model',
      createdAt: '2026-08-30T20:00:00.000Z',
      updatedAt: '2026-08-30T20:00:00.000Z',
      enums: [
        {
          id: 'f0000007-0000-0000-0000-000000000001',
          name: 'EmptyEnum',
          literals: [],
          position: { x: 0, y: 0 },
        },
      ],
      classes: [
        {
          id: 'b0000007-0000-0000-0000-000000000003',
          name: 'EmptyInterface',
          isAbstract: true,
          isInterface: true,
          stereotypes: ['interface'],
          position: { x: 0, y: 0 },
          attributes: [],
          operations: [],
        },
        {
          id: 'b0000007-0000-0000-0000-000000000004',
          name: 'ServiceWithOps',
          isAbstract: true,
          isInterface: true,
          stereotypes: ['interface'],
          position: { x: 0, y: 0 },
          attributes: [],
          operations: [
            {
              id: 'e0000007-0000-0000-0000-000000000009',
              name: 'isActive',
              returnType: 'Boolean',
              visibility: 'public',
              isAbstract: true,
              isStatic: false,
              parameters: [
                {
                  id: 'p0000007-0000-0000-0000-000000000001',
                  name: 'checkDate',
                  type: 'Date',
                  direction: 'in',
                },
              ],
            },
            {
              id: 'e0000007-0000-0000-0000-000000000010',
              name: 'calculateTax',
              returnType: 'Double',
              visibility: 'public',
              isAbstract: true,
              isStatic: false,
              parameters: [],
            },
          ],
        },
        {
          id: 'b0000007-0000-0000-0000-000000000001',
          name: 'UserProfile',
          isAbstract: false,
          isInterface: false,
          stereotypes: [],
          position: { x: 50, y: 50 },
          attributes: [
            {
              id: 'c0000007-0000-0000-0000-000000000001',
              name: 'bio',
              type: 'Text',
              visibility: 'private',
              multiplicity: '0..1',
              isStatic: false,
              isDerived: false,
              isUnique: false,
              isNullable: true,
              isIdentifier: false,
              defaultValue: null,
            },
            {
              id: 'c0000007-0000-0000-0000-000000000002',
              name: 'rating',
              type: 'BigDecimal',
              visibility: 'private',
              multiplicity: '1',
              isStatic: false,
              isDerived: false,
              isUnique: false,
              isNullable: false,
              isIdentifier: false,
              defaultValue: null,
            },
            {
              id: 'c0000007-0000-0000-0000-000000000003',
              name: 'active',
              type: 'Boolean',
              visibility: 'private',
              multiplicity: '1',
              isStatic: false,
              isDerived: false,
              isUnique: false,
              isNullable: false,
              isIdentifier: false,
              defaultValue: null,
            },
            {
              id: 'c0000007-0000-0000-0000-000000000004',
              name: 'userUuid',
              type: 'UUID',
              visibility: 'private',
              multiplicity: '1',
              isStatic: false,
              isDerived: false,
              isUnique: true,
              isNullable: false,
              isIdentifier: false,
              defaultValue: null,
            },
            {
              id: 'c0000007-0000-0000-0000-000000000005',
              name: 'createdDate',
              type: 'DateTime',
              visibility: 'private',
              multiplicity: '1',
              isStatic: false,
              isDerived: false,
              isUnique: false,
              isNullable: false,
              isIdentifier: false,
              defaultValue: null,
            },
          ],
          operations: [
            {
              id: 'e0000007-0000-0000-0000-000000000001',
              name: 'computeScore',
              returnType: 'Integer',
              visibility: 'public',
              isAbstract: false,
              isStatic: false,
              parameters: [
                {
                  id: 'p0000007-0000-0000-0000-000000000002',
                  name: 'factor',
                  type: 'Double',
                  direction: 'in',
                },
              ],
            },
            {
              id: 'e0000007-0000-0000-0000-000000000002',
              name: 'resetStatus',
              returnType: null,
              visibility: 'public',
              isAbstract: false,
              isStatic: false,
              parameters: [],
            },
          ],
        },
        {
          id: 'b0000007-0000-0000-0000-000000000002',
          name: 'Account',
          isAbstract: false,
          isInterface: false,
          stereotypes: [],
          position: { x: 350, y: 50 },
          attributes: [
            {
              id: 'c0000007-0000-0000-0000-000000000006',
              name: 'username',
              type: 'String',
              visibility: 'private',
              multiplicity: '1',
              isStatic: false,
              isDerived: false,
              isUnique: true,
              isNullable: false,
              isIdentifier: false,
              defaultValue: null,
            },
          ],
          operations: [],
        },
      ],
      relationships: [
        {
          id: 'd0000007-0000-0000-0000-000000000001',
          kind: 'composition',
          name: 'profile_account',
          sourceId: 'b0000007-0000-0000-0000-000000000001',
          targetId: 'b0000007-0000-0000-0000-000000000002',
          sourceEnd: { name: '', role: 'profile', multiplicity: '1', navigable: true },
          targetEnd: { name: '', role: 'account', multiplicity: '1', navigable: true },
        },
        {
          id: 'd0000007-0000-0000-0000-000000000002',
          kind: 'realization',
          name: '',
          sourceId: 'b0000007-0000-0000-0000-000000000001',
          targetId: 'b0000007-0000-0000-0000-000000000004',
          sourceEnd: { name: '', role: '', multiplicity: '1', navigable: true },
          targetEnd: { name: '', role: '', multiplicity: '1', navigable: true },
        },
      ],
    };

    const result = generateSpringBootProject(oneToOneModel);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileMap = new Map(result.value.map((f) => [f.path, f.content]));
    const profile = fileMap.get(
      'src/main/java/com/example/one_to_one_model/model/UserProfile.java',
    );
    expect(profile).toContain('@OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)');
    expect(profile).toContain('public Integer computeScore(Double factor)');
    expect(profile).toContain('public void resetStatus()');
    expect(profile).toContain('public Boolean isActive(LocalDate checkDate)');
    expect(profile).toContain('public Double calculateTax()');
  });

  it('cubre utilidades de nombrado, mapeo y errores', () => {
    expect(pluralize('city')).toBe('cities');
    expect(pluralize('box')).toBe('boxes');
    expect(pluralize('user')).toBe('users');

    expect(sanitizeJavaIdentifier('class')).toBe('classVal');
    expect(sanitizeJavaIdentifier('normal')).toBe('normal');

    expect(sanitizePackageName('com.class.123')).toBe('com.classpkg.123');
    expect(toKebabCase('MyLongName')).toBe('my-long-name');
    expect(toPascalCase('')).toBe('GeneratedClass');
    expect(toCamelCase('Item')).toBe('item');
    expect(toScreamingSnakeCase('helloWorld')).toBe('HELLO_WORLD');

    const err1 = unsupportedTypeError('CustomType', 'MyClass');
    expect(err1.code).toBe('unsupported_type');

    const err2 = generationFailedError('Failed', ['detail']);
    expect(err2.code).toBe('generation_failed');

    const opts = resolveDefaultOptions(singleInheritanceModel);
    const analyzed = analyzeModel(singleInheritanceModel, opts);

    expect(mapUmlTypeToJava('Float', analyzed).javaType).toBe('Double');
    expect(mapUmlTypeToJava('long', analyzed).javaType).toBe('Long');
    expect(mapUmlTypeToJava('int', analyzed).javaType).toBe('Integer');
    expect(mapUmlTypeToJava('boolean', analyzed).javaType).toBe('Boolean');
    expect(mapUmlTypeToJava('void', analyzed).javaType).toBe('void');
    expect(mapUmlTypeToJava(null, analyzed).javaType).toBe('void');
    expect(mapUmlTypeToJava('b0000001-0000-0000-0000-000000000001', analyzed).javaType).toBe(
      'Person',
    );
  });

  it('rechaza modelos UML no validos', () => {
    const invalidModel = {
      ...singleInheritanceModel,
      classes: [
        {
          ...singleInheritanceModel.classes[0]!,
          name: '', // Nombre invalido
        },
      ],
    };

    const result = generateSpringBootProject(invalidModel);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_model');
    }
  });
});

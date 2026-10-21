import { describe, expect, it } from 'vitest';
import { generateSpringBootProject } from '../src/generator.js';
import { toPascalCase } from '../src/naming.js';
import { enumsModel } from './models/index.js';

function files(database: 'h2' | 'postgresql', name = enumsModel.name) {
  const result = generateSpringBootProject({ ...enumsModel, name }, { database });
  if (!result.ok) throw new Error(result.error.message);
  return new Map(result.value.map((file) => [file.path, file]));
}

describe('proyecto generado listo para Windows (ADR 0038)', () => {
  it('incluye Maven Wrapper con los finales de linea de cada sistema', () => {
    const project = files('h2');
    const sh = project.get('mvnw');
    const cmd = project.get('mvnw.cmd');

    expect(sh?.executable).toBe(true);
    expect(sh?.content.startsWith('#!/bin/sh')).toBe(true);
    expect(sh?.content).not.toContain('\r\n');
    expect(cmd?.content).toContain('\r\n');
    expect(project.get('.mvn/wrapper/maven-wrapper.properties')?.content).toContain(
      'apache-maven-3.9.9-bin.zip',
    );
    expect(project.get('.gitattributes')?.content).toContain('*.cmd text eol=crlf');
  });

  it('exige Java 17 y publica Swagger', () => {
    const pom = files('h2').get('pom.xml')?.content ?? '';
    expect(pom).toContain('<java.version>17</java.version>');
    expect(pom).toContain('springdoc-openapi-starter-webmvc-ui');
  });

  it('con PostgreSQL lee la conexion del entorno y ofrece un perfil h2', () => {
    const project = files('postgresql');
    const props = project.get('src/main/resources/application.properties')?.content ?? '';
    expect(props).toContain('${DB_URL:jdbc:postgresql://localhost:5432/');
    expect(props).toContain('${DB_PASSWORD:postgres}');
    expect(project.get('src/main/resources/application-h2.properties')?.content).toContain(
      'jdbc:h2:mem:',
    );
  });

  it('escapa el nombre del modelo dentro del pom', () => {
    const pom = files('h2', 'Pedidos & Envios <2026>').get('pom.xml')?.content ?? '';
    expect(pom).toContain('Pedidos &amp; Envios &lt;2026&gt;');
  });

  it('el README no lleva emojis y explica el arranque en Windows', () => {
    const readme = files('postgresql').get('README.md')?.content ?? '';
    expect(readme).toContain('mvnw.cmd spring-boot:run');
    expect(/\p{Extended_Pictographic}/u.test(readme)).toBe(false);
  });

  it('quita las tildes de los nombres en lugar de partir la palabra', () => {
    expect(toPascalCase('Categoría')).toBe('Categoria');
    expect(toPascalCase('Clínica Veterinaria')).toBe('ClinicaVeterinaria');
    expect(toPascalCase('año')).toBe('Ano');
  });
});

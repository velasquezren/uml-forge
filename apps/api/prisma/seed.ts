import { PrismaClient, ProjectRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as Y from 'yjs';
import { toYDoc, validateModel, type UMLModel } from '@uml-forge/uml-core';
import { compositionCascadeModel } from './seed-models/composition-cascade.ts';
import { manyToManyModel } from './seed-models/many-to-many.ts';
import { singleInheritanceModel } from './seed-models/single-inheritance.ts';
import { veterinaryModel } from './seed-models/veterinary.ts';

/** Proyectos de demostracion que se crean para el usuario semilla. */
const sampleProjects: Array<{
  name: string;
  description: string;
  model: UMLModel;
}> = [
  {
    name: 'Clinica Veterinaria',
    description:
      'Gestion de duenos y mascotas con tipos enumerados de especies y relacion de composicion.',
    model: veterinaryModel,
  },
  {
    name: 'Plataforma E-Commerce y Pedidos',
    description:
      'Modelo de ordenes y lineas de pedido con cascada de composicion para Spring Boot.',
    model: compositionCascadeModel,
  },
  {
    name: 'Sistema de Gestion Academica (Herencia)',
    description:
      'Jerarquia de personas, docentes y estudiantes con herencia simple y atributos protegidos.',
    model: singleInheritanceModel,
  },
  {
    name: 'Inscripciones Cursos y Estudiantes (N:M)',
    description: 'Relacion muchos a muchos entre estudiantes y asignaturas universitarias.',
    model: manyToManyModel,
  },
];

async function main() {
  const databaseUrl =
    process.env['DATABASE_URL'] ??
    'postgresql://umlforge:umlforge@localhost:5432/umlforge?schema=public';

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    process.stdout.write('Iniciando seed de la base de datos UML Forge...\n');

    // 1. Limpiar registros previos
    await prisma.generationJob.deleteMany();
    await prisma.operationLog.deleteMany();
    await prisma.modelSnapshot.deleteMany();
    await prisma.yDocState.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    // 2. Crear contrasena simple con Argon2id: 'password123'
    const passwordHash = await argon2.hash('password123', {
      type: argon2.argon2id,
    });

    // 3. Crear usuarios con correos y contrasenas sencillos
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@admin.com',
        name: 'Administrador UML Forge',
        passwordHash,
      },
    });

    const demoUser = await prisma.user.create({
      data: {
        email: 'demo@umlforge.dev',
        name: 'Usuario Demo',
        passwordHash,
      },
    });

    const testUser = await prisma.user.create({
      data: {
        email: 'user@user.com',
        name: 'Usuario Test',
        passwordHash,
      },
    });

    process.stdout.write(`Usuarios creados:\n`);
    process.stdout.write(` - ${adminUser.email} / password123 (Administrador)\n`);
    process.stdout.write(` - ${demoUser.email} / password123 (Demo)\n`);
    process.stdout.write(` - ${testUser.email} / password123 (Test)\n`);

    // 4. Crear proyectos y sincronizar estado inicial de Yjs
    for (const projectData of sampleProjects) {
      // Un modelo semilla invalido se escribiria igual en el documento Yjs y
      // solo fallaria al leerlo, dejando el proyecto vacio en el editor.
      const modelErrors = validateModel(projectData.model);
      if (modelErrors.length > 0) {
        throw new Error(
          `El modelo semilla "${projectData.name}" no es valido: ` +
            modelErrors.map((error) => error.message).join('; '),
        );
      }

      const ydoc = toYDoc(projectData.model);
      const encodedState = Buffer.from(Y.encodeStateAsUpdate(ydoc));

      const createdProject = await prisma.project.create({
        data: {
          name: projectData.name,
          description: projectData.description,
          ownerId: adminUser.id,
          members: {
            create: [
              {
                userId: demoUser.id,
                role: ProjectRole.EDITOR,
              },
              {
                userId: testUser.id,
                role: ProjectRole.VIEWER,
              },
            ],
          },
          ydocState: {
            create: {
              state: encodedState,
              version: 1,
            },
          },
        },
      });

      // Crear snapshot inicial
      await prisma.modelSnapshot.create({
        data: {
          projectId: createdProject.id,
          name: 'Version Inicial',
          description: 'Modelo semilla precargado',
          state: encodedState,
          createdById: adminUser.id,
        },
      });

      process.stdout.write(
        `Proyecto creado: "${createdProject.name}" (ID: ${createdProject.id})\n`,
      );
    }

    process.stdout.write('\nSeed completado con exito.\n');
  } catch (error) {
    process.stderr.write(`Error durante el seed: ${String(error)}\n`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void main();

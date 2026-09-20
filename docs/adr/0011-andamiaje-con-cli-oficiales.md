# 0011. El andamiaje se crea con las CLI oficiales

Fecha: 2026-08-29
Estado: Aceptado
Ambito: Fase 2 en adelante. No se aplica retroactivamente a lo ya construido.

## Contexto

Escribir de memoria los ficheros que genera una CLI oficial es una fuente
silenciosa de desviaciones: se omite una opcion del `tsconfig` que la plantilla
si trae, se escribe una version de `package.json` que no corresponde a la que la
herramienta usaria hoy, o se reproduce una estructura de proyecto que quedo
obsoleta hace dos versiones mayores. El resultado compila, pero deja de parecerse
al proyecto que cualquier otra persona obtendria ejecutando la misma orden, y las
diferencias solo aparecen mucho despues, al actualizar.

## Decision

**El andamiaje se genera siempre con la CLI oficial correspondiente. Esta
prohibido escribir a mano los ficheros que esa CLI produce.**

| Andamiaje               | Orden                                                             |
| ----------------------- | ----------------------------------------------------------------- |
| `apps/api`              | `@nestjs/cli new` con `--skip-git --skip-install`                 |
| `apps/web`              | `pnpm create vite` con plantilla `react-ts`                       |
| Componentes de interfaz | `shadcn init`, y `shadcn add <componente>` uno por uno            |
| Base de datos           | `prisma init`                                                     |
| Arbol de rutas          | lo genera `@tanstack/router-plugin`; el `routeTree` no se escribe |

Despues de cada ejecucion viene un paso de **adaptacion al monorepo**, que si es
trabajo propio y se reporta explicitamente:

- eliminar el `.git` y el fichero de bloqueo que la CLI haya creado por su cuenta;
- alinear el `package.json` con los workspaces (nombre `@uml-forge/...`, scripts
  `typecheck`, `lint`, `test`, `build`, dependencias con `workspace:*`);
- apuntar el `tsconfig.json` al preset compartido `@uml-forge/tsconfig`;
- apuntar la configuracion de ESLint a `@uml-forge/eslint-config`.

Si una CLI genera algo que **contradice la especificacion del proyecto**, no se
sobrescribe sin avisar: se reporta la contradiccion y se espera decision.

### Que se sigue escribiendo a mano

Solo el codigo de dominio, que ninguna herramienta puede generar:

- `packages/uml-core`: metamodelo, operaciones, validacion, mapeo Yjs;
- `packages/codegen-springboot`: el generador y sus plantillas;
- `packages/xmi`: serializador y parser;
- los nodos y aristas UML del lienzo;
- la capa de sincronizacion y de conflictos;
- la interfaz propia construida sobre los componentes de shadcn.

## Consecuencias

- El proyecto se parece al que produciria cualquier otra persona con las mismas
  ordenes, lo que facilita actualizar y facilita defenderlo.
- Cada fase a partir de la 2 reporta que ordenes se ejecutaron, con que version
  de la herramienta, y que se cambio despues.
- La Fase 0 y la Fase 1 quedan como estan. La Fase 0 es configuracion de
  monorepo, para la que no existe una CLI oficial equivalente; la Fase 1 es
  codigo de dominio puro.
- La regla queda tambien en `CLAUDE.md`, para que aplique en sesiones futuras
  sin depender de que alguien recuerde este ADR.

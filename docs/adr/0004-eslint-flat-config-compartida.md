# 0004. Configuracion ESLint 9 flat compartida

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

Tres de las reglas inviolables del proyecto son verificables por herramienta:
prohibicion de `any`, prohibicion de `@ts-ignore` y ausencia de `console.log` en
codigo de produccion. Dejarlas a la disciplina del autor garantiza que se
incumplan.

## Decision

Un paquete `@uml-forge/eslint-config` en JavaScript ESM que exporta tres
configuraciones planas componibles:

- `@uml-forge/eslint-config/base`: recomendadas de ESLint mas
  `recommendedTypeChecked` de typescript-eslint, con `projectService: true`.
- `@uml-forge/eslint-config/react`: la base mas `eslint-plugin-react-hooks`
  (`recommended-latest`) y `eslint-plugin-react-refresh` (`vite`).
- `@uml-forge/eslint-config/nest`: la base mas los globales de Node y las
  excepciones que exigen los decoradores de Nest.

Reglas que hacen cumplir el reglamento del proyecto:

| Regla                                            | Valor                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any`             | `error`                                                                          |
| `@typescript-eslint/ban-ts-comment`              | `ts-ignore: true`, `ts-nocheck: true`, `ts-expect-error: allow-with-description` |
| `no-console`                                     | `error`, desactivada solo en tests, configuraciones y scripts                    |
| `@typescript-eslint/no-floating-promises`        | `error`                                                                          |
| `@typescript-eslint/consistent-type-imports`     | `error`                                                                          |
| `@typescript-eslint/switch-exhaustiveness-check` | `error`                                                                          |

La ultima regla es deliberada: el lenguaje de operaciones del metamodelo es una
union discriminada y el compilador debe rechazar cualquier `switch` que olvide un
caso al anadirse una operacion nueva.

`eslint-config-prettier` se aplica siempre al final para que ESLint no discuta
con Prettier sobre formato.

## Consecuencias

- El paquete se escribe en JavaScript, no en TypeScript: una configuracion de
  ESLint debe poder cargarse sin un paso previo de compilacion.
- El analisis con informacion de tipos exige que cada workspace tenga su propio
  `tsconfig.json`; `projectService` lo localiza automaticamente.
- Los ficheros `.js` sueltos se excluyen del analisis con tipos mediante
  `disableTypeChecked`.

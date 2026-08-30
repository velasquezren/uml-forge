# 0002. Presets de TypeScript compartidos

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

Cinco paquetes y dos aplicaciones con destinos de compilacion distintos: la PWA
es ESM sobre Vite, la API es CommonJS sobre SWC, y los paquetes compartidos son
librerias ESM con declaraciones de tipos. Sin una base comun, cada workspace
acabaria con opciones de rigor distintas.

## Decision

Un paquete `@uml-forge/tsconfig` con cinco presets que heredan de `base.json`:

| Preset               | Destino                      | Aporta                                    |
| -------------------- | ---------------------------- | ----------------------------------------- |
| `base.json`          | Comun a todo                 | Rigor, modulos ESNext, resolucion Bundler |
| `library.json`       | Paquetes compartidos         | `declaration` y `declarationMap`          |
| `react-library.json` | Paquetes compartidos con JSX | `jsx` y librerias del DOM                 |
| `vite.json`          | `apps/web`                   | DOM, WebWorker, tipos de Vite, `noEmit`   |
| `nest.json`          | `apps/api`                   | CommonJS y decoradores                    |

Rigor activado en `base.json`: `strict`, `noUncheckedIndexedAccess`,
`noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`,
`noUnusedLocals`, `noUnusedParameters` y `useUnknownInCatchVariables`.

`exactOptionalPropertyTypes` queda deliberadamente **desactivado**. Genera
friccion continua con React Hook Form y con tipos de terceros que declaran
propiedades opcionales admitiendo `undefined` explicito, y en este dominio no
aporta seguridad real: la distincion entre "propiedad ausente" y "propiedad con
valor `undefined`" no tiene significado en el metamodelo UML.

### Ningun preset declara rutas de salida

`outDir` y `rootDir` no aparecen en ningun preset compartido. TypeScript resuelve
las rutas relativas de un fichero heredado **contra el fichero que las declara**,
no contra el que hereda: un `"outDir": "dist"` escrito en `library.json` apuntaria
a `packages/tsconfig/dist` para todos los consumidores. Cada workspace declara sus
propias rutas de salida en su `tsconfig.json`.

Esto se detecto durante la Fase 0 al ejecutar las sondas de verificacion, y es la
razon de que esas sondas existan.

### Los presets se verifican, no se suponen

`packages/tsconfig/test/` contiene cuatro proyectos de sonda y una bateria de
pruebas que comprueba, en cada ejecucion de `pnpm typecheck` y `pnpm test`:

- que los presets `base`, `library` y `nest` compilan codigo real sin errores;
- que una sonda negativa que viola `noUncheckedIndexedAccess` **sigue fallando**,
  lo que demuestra que el rigor esta activo y no solo escrito;
- que ningun preset reintroduce `exactOptionalPropertyTypes`.

## Consecuencias

- `noUncheckedIndexedAccess` obliga a comprobar los accesos por indice en las
  colecciones del metamodelo (atributos, operaciones, literales de enumeracion),
  que es exactamente donde interesa.
- Los presets se referencian por nombre de paquete
  (`"extends": "@uml-forge/tsconfig/library.json"`), sin rutas relativas fragiles.
- El paquete no declara `exports` en su `package.json` a proposito, para que
  TypeScript resuelva los ficheros `.json` por ruta directa.

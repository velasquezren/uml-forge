# Registros de decisiones de arquitectura

Cada fichero documenta una decision tomada durante la construccion de UML Forge.
Formato: contexto, decision, alternativas descartadas y consecuencias.
Los ADR no se editan una vez aceptados: si una decision cambia, se escribe uno
nuevo que sustituya al anterior y se marca el antiguo como sustituido.

| ADR                                            | Titulo                                                           | Estado   |
| ---------------------------------------------- | ---------------------------------------------------------------- | -------- |
| [0001](0001-monorepo-pnpm-turborepo.md)        | Monorepo con pnpm workspaces y Turborepo                         | Aceptado |
| [0002](0002-presets-typescript-compartidos.md) | Presets de TypeScript compartidos                                | Aceptado |
| [0003](0003-fijacion-de-versiones.md)          | Fijacion de lineas mayores y prohibicion de versiones candidatas | Aceptado |
| [0004](0004-eslint-flat-config-compartida.md)  | Configuracion ESLint 9 flat compartida                           | Aceptado |
| [0005](0005-compilacion-real-con-maven.md)     | Compilacion real con Maven del codigo generado                   | Aceptado |
| [0006](0006-sin-dependencias-redundantes.md)   | Sin dependencias redundantes con la plataforma                   | Aceptado |

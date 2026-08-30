// Configuracion ESLint para la API NestJS (CommonJS, decoradores, entorno Node).
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { baseConfig } from './base.js';

export const nestConfig = tseslint.config(...baseConfig, {
  languageOptions: {
    globals: { ...globals.node },
  },
  rules: {
    // Los modulos y filtros de Nest son clases sin miembros propios por diseno.
    '@typescript-eslint/no-extraneous-class': 'off',
    // Los decoradores de Nest usan interfaces vacias como marcadores.
    '@typescript-eslint/no-empty-object-type': 'off',
  },
});

export default nestConfig;

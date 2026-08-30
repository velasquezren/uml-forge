// Configuracion ESLint para los paquetes de interfaz (React 19 sobre Vite).
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { baseConfig } from './base.js';

export const reactConfig = tseslint.config(
  ...baseConfig,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker },
    },
  },
  reactHooks.configs['recommended-latest'],
  reactRefresh.configs.vite,
);

export default reactConfig;

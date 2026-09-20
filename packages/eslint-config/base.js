// Configuracion ESLint base del monorepo.
// Incluye las reglas con informacion de tipos y hace cumplir las prohibiciones
// del proyecto: nada de "any", nada de "@ts-ignore" y nada de console en produccion.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/** Rutas que ninguna configuracion del monorepo debe analizar. */
export const ignores = [
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/node_modules/**',
  '**/dev-dist/**',
  '**/*.tsbuildinfo',
  '**/routeTree.gen.ts',
];

/** Ficheros considerados de prueba o de utilidad, donde se relajan algunas reglas. */
export const toolingFiles = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.config.ts',
  '**/*.config.js',
  '**/*.config.mjs',
  '**/scripts/**',
  '**/test/**',
  '**/tests/**',
];

export const baseConfig = tseslint.config(
  { ignores },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      // Reglas inviolables del proyecto.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
        },
      ],
      'no-console': 'error',

      // Calidad general.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // Los ficheros JavaScript sueltos no tienen proyecto TypeScript asociado.
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: toolingFiles,
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  prettier,
);

export default baseConfig;

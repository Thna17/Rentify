import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', '.angular/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.base],
    plugins: { '@angular-eslint': angular.tsPlugin },
    processor: angular.processInlineTemplates,
    rules: {
      'eqeqeq': ['error', 'always'],
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },
  {
    files: ['**/*.html'],
    languageOptions: { parser: angular.templateParser },
    plugins: { '@angular-eslint/template': angular.templatePlugin },
    rules: { '@angular-eslint/template/no-negated-async': 'error' },
  },
);

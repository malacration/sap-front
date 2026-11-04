const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const angular = require('@angular-eslint/eslint-plugin');
const template = require('@angular-eslint/eslint-plugin-template');
const templateParser = require('@angular-eslint/template-parser');

module.exports = [
  { ignores: ['dist/**', 'node_modules/**', '.angular/**', 'summernote/**', 'src/assets/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tsParser, sourceType: 'module', ecmaVersion: 'latest' },
    plugins: { '@typescript-eslint': tsPlugin, '@angular-eslint': angular, '@angular-eslint/template': template },
    processor: '@angular-eslint/template/extract-inline-html',
  },
  {
    files: ['src/**/*.html'],
    languageOptions: { parser: templateParser },
    plugins: { '@angular-eslint/template': template },
    rules: { '@angular-eslint/template/banana-in-box': 'error' },
  },
];

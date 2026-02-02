import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow any type in test files and legacy code during migration
      '@typescript-eslint/no-explicit-any': ['error', {
        ignoreRestArgs: true,
      }],
      // Allow empty interfaces with comments
      '@typescript-eslint/no-empty-object-type': ['error', {
        allowInterfaces: 'with-single-extends',
      }],
      // Relax react-refresh rules
      'react-refresh/only-export-components': ['warn', {
        allowConstantExport: true,
        allowExportNames: ['router', 'highlightText', 'confirm', 'confirmDelete', 'confirmCancel', 'confirmSave', 'useConfirmDialog', 'ConfirmDialog', 'GlobalConfirmDialog'],
      }],
    },
  },
  // Allow any in test files
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  // Allow any in service layer files during migration
  {
    files: [
      'src/services/**/*.ts',
      'src/stores/**/*.ts',
      'supabase/functions/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Downgrade to warning for services
      '@typescript-eslint/no-require-imports': 'warn',
    },
  },
])

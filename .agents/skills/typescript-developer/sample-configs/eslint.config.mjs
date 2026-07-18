// @ts-check

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
                projectService: false,
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            'no-console': ['error', { allow: ['error', 'info', 'warn'] }]
        }
    }
);

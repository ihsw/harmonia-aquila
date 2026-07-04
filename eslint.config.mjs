// @ts-check

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import bpEslintConfig from '@blueprintjs/eslint-config';
import stylistic from '@stylistic/eslint-plugin';

export default defineConfig(
    js.configs.recommended,
    stylistic.configs.recommended,
    tseslint.configs.strictTypeChecked,
    bpEslintConfig,
    {
        "rules": {
            "header/header": [0],
            "no-console": ["error", {
                "allow": ["warn", "assert", "debug", "info", "error", "table"]
            }]
        }
    }
);

// @ts-check

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import bpEslintConfig from '@blueprintjs/eslint-config';

export default defineConfig(
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    bpEslintConfig,
    {
        "rules": {
            "header/header": [0]
        }
    }
);

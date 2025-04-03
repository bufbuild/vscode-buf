import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig(
  globalIgnores([
    ".vscode-test",
    ".vscode-dist",
    "node_modules",
    "out",
    "test-workspaces",
  ]),
  tseslint.config(
    {
      files: ["scripts/**/*.mjs"],
      languageOptions: {
        globals: globals.node,
      }
    }
  ),
  tseslint.config({
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      unicorn: eslintPluginUnicorn,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "variable",
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
      ],
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase",
        },
      ],
    },
  })
);

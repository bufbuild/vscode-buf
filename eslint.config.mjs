import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginUnicorn from 'eslint-plugin-unicorn';

export default tseslint.config({
  ignores: [".vscode-dist"],
  extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
  plugins: {
    "unicorn": eslintPluginUnicorn,
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
        "case": "kebabCase"
      }
    ]
  }
});
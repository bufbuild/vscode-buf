import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config({
  ignores: [".vscode-dist"],
  extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  }
});
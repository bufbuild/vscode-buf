import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config({
  ignores: [".vscode-dist"],
  extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
});

// export default {
//   "parser": "@typescript-eslint/parser",
//   "parserOptions": {
//     "ecmaVersion": 6,
//     "sourceType": "module"
//   },
//   "plugins": ["@typescript-eslint"],
//   "rules": {
//     "@typescript-eslint/naming-convention": "warn",
//     "@typescript-eslint/semi": "warn",
//     "curly": "warn",
//     "eqeqeq": "warn",
//     "no-throw-literal": "warn",
//     "semi": "off"
//   }
// }

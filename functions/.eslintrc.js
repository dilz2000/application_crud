module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "google"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
    ecmaVersion: 2022,
  },
  ignorePatterns: [
    "/lib/**/*",
    ".eslintrc.js"
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "comma-dangle": ["error", "only-multiline"],
    "object-curly-spacing": ["error", "always"],
    "require-jsdoc": 0,
    "max-len": 0
  },
};
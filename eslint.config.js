import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const offline = (name) => ({ name, message: "The showcase is offline-only; use the local mock data layer." });

export default tseslint.config(
  { ignores: ["dist", "node_modules", "test-results", "playwright-report"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The demo must never reach a network. Make it a lint error, not a convention.
      "no-restricted-globals": ["error", offline("fetch"), offline("XMLHttpRequest"), offline("WebSocket"), offline("EventSource")],
    },
  },
  { files: ["scripts/**/*.mjs"], extends: [js.configs.recommended], languageOptions: { globals: globals.node } },
);

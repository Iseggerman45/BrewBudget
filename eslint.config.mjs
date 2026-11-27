import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Effects synchronize URL state and async data loading with React state.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["electron/**/*.cjs", "desktop/**/*.cjs"],
    rules: {
      // Electron's main process uses CommonJS by design.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "dist/**",
  ]),
]);

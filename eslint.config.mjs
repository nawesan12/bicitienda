import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Referencia de diseño del handoff: prototipos, no código nuestro.
    "design_handoff_rodar_digital/**",
    "design_handoff_bicitienda_mdq/**",
    // Base de datos local de PGlite.
    ".data/**",
  ]),
]);

export default eslintConfig;

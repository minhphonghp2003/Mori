import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Vietnamese copy uses straight quotes in JSX text
      "react/no-unescaped-entities": "off",
      // React Compiler advisory rule — the compiler is not enabled in this project
      "react-hooks/purity": "off",
      // Providers hydrate Redux from localStorage in mount effects (the
      // canonical pattern) — advisory rule, compiler not enabled
      "react-hooks/set-state-in-effect": "off",
      // Design prototype uses plain <img> everywhere with unoptimized images
      "@next/next/no-img-element": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;

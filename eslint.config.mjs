import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Keep the pure domain layer free of framework / IO imports.
  // src/lib/core/** must not reach into Next, React, Supabase, or app code.
  {
    files: ["src/lib/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next", "next/*"], message: "core must stay framework-free" },
            { group: ["react", "react-*"], message: "core must stay framework-free" },
            { group: ["server-only"], message: "core must stay framework-free" },
            {
              group: ["@supabase/*", "@/lib/db/*", "@/app/*"],
              message: "core must not perform IO — inject data instead",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

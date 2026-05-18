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
  ]),
  // Isolation rule: the admin surface must NEVER import from the tenant
  // axios client or tenant auth context. Enforced statically by ESLint.
  {
    files: [
      "src/lib/api/admin-client.ts",
      "src/lib/api/admin-auth.ts",
      "src/contexts/AdminAuthContext.tsx",
      "src/app/admin/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "./client",
                "../client",
                "@/lib/api/client",
                "@/contexts/AuthContext",
                "*/contexts/AuthContext",
                "@/lib/api/auth",
              ],
              message:
                "Admin surface must not import from the tenant client/context. Use admin-client / admin-auth / AdminAuthContext instead.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;

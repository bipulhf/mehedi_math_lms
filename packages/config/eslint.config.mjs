import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "packages/db/src/migrations/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false
        }
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "off"
    }
  },
  {
    // Service workers shipped as static assets: worker scope, plus the
    // firebase global that the compat scripts install via importScripts.
    files: ["**/public/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        firebase: "readonly"
      }
    }
  }
];

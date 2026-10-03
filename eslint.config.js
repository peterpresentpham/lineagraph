import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";
import eslintPluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

// One flat config for the whole pnpm workspace (apps/*, packages/*): a shared base, then
// path-scoped overrides for each runtime shape (Next.js RSC, Vite SPA, Node server/CLI,
// framework-agnostic React library). See CLAUDE.md for the summary and rationale.
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/node_modules/**",
      "apps/web/next-env.d.ts",
      "packages/core/drizzle/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Base rules for every TS/TSX file in the workspace.
    files: ["**/*.{ts,tsx}"],
    plugins: { import: eslintPluginImport, prettier: prettierPlugin },
    settings: {
      "import/resolver": {
        typescript: {
          project: ["apps/*/tsconfig.json", "packages/*/tsconfig.json"],
          // Each workspace package has its own tsconfig on purpose; this isn't a misconfiguration.
          noWarnOnMultipleProjects: true,
        },
      },
    },
    rules: {
      ...eslintConfigPrettier.rules, // defer all formatting to Prettier; no duplicate style rules here
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      "no-use-before-define": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/no-named-as-default": "error",
      "import/no-unresolved": "warn",
      "no-debugger": "warn",
    },
  },
  {
    // Browser/React code: the Next.js web app, the Vite admin app, and the shared UI library.
    files: [
      "apps/web/**/*.{ts,tsx}",
      "apps/admin/src/**/*.{ts,tsx}",
      "packages/ui/src/**/*.{ts,tsx}",
    ],
    plugins: {
      ...eslintPluginReact.configs.flat.recommended.plugins,
      ...reactHooks.configs["recommended-latest"].plugins,
    },
    languageOptions: {
      ...eslintPluginReact.configs.flat.recommended.languageOptions,
      globals: globals.browser,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...eslintPluginReact.configs.flat.recommended.rules,
      ...reactHooks.configs["recommended-latest"].rules,
      // New JSX transform + TypeScript make these two irrelevant.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-pascal-case": "warn",
      "no-console": ["warn", { allow: ["debug", "warn", "error"] }],
    },
  },
  {
    // Fast Refresh boundary check only matters for the Vite dev server; off like upstream,
    // since both admin and ui routinely export a hook/helper alongside a component.
    files: ["apps/admin/src/**/*.{ts,tsx}"],
    plugins: { "react-refresh": reactRefresh },
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Node server/CLI code: no browser globals, no React rules, console output is the UI.
    files: ["apps/api/**/*.ts", "apps/scripts/**/*.ts", "packages/core/**/*.ts"],
    languageOptions: { globals: globals.node },
    rules: { "no-console": "off" },
  },
);

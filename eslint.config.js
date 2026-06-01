import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  // Глобальные игноры. env.d.ts генерируется Astro — не линтуем.
  {
    ignores: ["dist/**", ".astro/**", "node_modules/**", "src/env.d.ts"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Astro: рекомендованные правила + доступность для .astro
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs["jsx-a11y-recommended"],

  // Браузерные/DOM-глобали для клиентского и конфигурационного кода
  {
    files: ["**/*.{ts,tsx,astro,mjs,js}"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        HTMLElement: "readonly",
        MouseEvent: "readonly",
        Node: "readonly",
        Blob: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Image: "readonly",
        requestAnimationFrame: "readonly",
      },
    },
  },

  // label-кнопки CSS-драйвера (мобильное меню) имеют aria-label и for —
  // accessible name есть; правило не учитывает aria-label, поэтому отключаем.
  {
    files: ["**/*.astro"],
    rules: {
      "astro/jsx-a11y/label-has-associated-control": "off",
    },
  },

  // Отключает правила, конфликтующие с Prettier (всегда последним)
  eslintConfigPrettier,
];

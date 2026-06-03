/// <reference path="../.astro/types.d.ts" />

// TypeScript 6 (ts2882) требует декларацию для side-effect импортов без своих типов.
// У @fontsource-variable/inter нет .d.ts — импортируется только ради CSS-побочного эффекта.
declare module "@fontsource-variable/inter";

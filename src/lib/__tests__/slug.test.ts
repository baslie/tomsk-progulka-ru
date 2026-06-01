import { describe, it, expect } from "vitest";
import { transliterate, generateSlug } from "@/lib/slug";

describe("transliterate", () => {
  it("транслитерирует кириллицу в латиницу", () => {
    expect(transliterate("Привет")).toBe("Privet");
    expect(transliterate("Томск")).toBe("Tomsk");
  });

  it("корректно обрабатывает многобуквенные и пустые соответствия", () => {
    expect(transliterate("ёжик")).toBe("yozhik");
    expect(transliterate("щука")).toBe("shchuka");
    expect(transliterate("объезд")).toBe("obezd"); // ъ → "", е → "e"
    expect(transliterate("конь")).toBe("kon"); // ь → ""
  });

  it("оставляет латиницу и прочие символы без изменений", () => {
    expect(transliterate("ABC-123")).toBe("ABC-123");
  });
});

describe("generateSlug", () => {
  it("приводит к нижнему регистру и заменяет небуквенно-цифровое на дефис", () => {
    // й → "y" и ы → "y", поэтому «Северный» → "severnyy".
    expect(generateSlug("Геокупол — Северный парк")).toBe("geokupol-severnyy-park");
  });

  it("обрезает ведущие и хвостовые дефисы", () => {
    expect(generateSlug("  Тропа!  ")).toBe("tropa");
    expect(generateSlug("---Лес---")).toBe("les");
  });

  it("ограничивает длину 200 символами", () => {
    expect(generateSlug("a".repeat(300)).length).toBe(200);
  });
});

import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatDistance,
  getTrackColor,
  formatDateRu,
  TRACK_COLORS,
} from "@/lib/constants";

describe("formatDuration", () => {
  it("показывает только минуты, когда меньше часа", () => {
    expect(formatDuration(45)).toBe("45 мин");
    expect(formatDuration(0)).toBe("0 мин");
  });

  it("показывает только часы, когда минут нет", () => {
    expect(formatDuration(60)).toBe("1 ч");
    expect(formatDuration(120)).toBe("2 ч");
  });

  it("показывает часы и минуты", () => {
    expect(formatDuration(90)).toBe("1 ч 30 мин");
    expect(formatDuration(125)).toBe("2 ч 5 мин");
  });
});

describe("formatDistance", () => {
  it("переводит дистанцию меньше 1 км в метры", () => {
    expect(formatDistance(0.5)).toBe("500 м");
    expect(formatDistance(0.123)).toBe("123 м");
  });

  it("показывает 1 знак после запятой для дистанции < 10 км", () => {
    expect(formatDistance(5.4)).toBe("5.4 км");
    expect(formatDistance(1)).toBe("1.0 км");
  });

  it("округляет до целого для дистанции >= 10 км", () => {
    expect(formatDistance(10)).toBe("10 км");
    expect(formatDistance(12.7)).toBe("13 км");
  });
});

describe("getTrackColor", () => {
  it("возвращает цвет по индексу", () => {
    expect(getTrackColor(0)).toBe(TRACK_COLORS[0]);
    expect(getTrackColor(1)).toBe(TRACK_COLORS[1]);
  });

  it("циклически обходит палитру по модулю", () => {
    expect(getTrackColor(TRACK_COLORS.length)).toBe(TRACK_COLORS[0]);
    expect(getTrackColor(TRACK_COLORS.length + 2)).toBe(TRACK_COLORS[2]);
  });
});

describe("formatDateRu", () => {
  it("форматирует дату на русском", () => {
    expect(formatDateRu("2026-06-01")).toBe("1 июня 2026 г.");
  });

  it("принимает объект Date", () => {
    expect(formatDateRu(new Date("2026-01-15"))).toBe("15 января 2026 г.");
  });
});

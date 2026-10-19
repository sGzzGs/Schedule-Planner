// Created at: 2026-10-16 02:01
import { describe, it, expect } from "vitest";
import { calculateEasterSunday } from "@core/calendar/easter.js";
import { formatDateISO } from "@core/calendar/dateUtils.js";

describe("core/calendar/easter.js - Algoritmo Canônico de Páscoa", () => {
  const table = [
    { year: 2024, expected: "2024-03-31" },
    { year: 2025, expected: "2025-04-20" },
    { year: 2026, expected: "2026-04-05" },
    { year: 2027, expected: "2027-03-28" },
    { year: 2028, expected: "2028-04-16" },
    { year: 2029, expected: "2029-04-01" },
    { year: 2030, expected: "2030-04-21" },
    { year: 2035, expected: "2035-03-25" },
    { year: 2040, expected: "2040-04-01" }
  ];

  for (const { year, expected } of table) {
    it(`deve calcular corretamente o Domingo de Páscoa de ${year} como ${expected}`, () => {
      const easterDate = calculateEasterSunday(year);
      expect(formatDateISO(easterDate)).toBe(expected);
      expect(easterDate.getDay()).toBe(0); // Domingo
    });
  }
});

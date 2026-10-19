// Created at: 2026-10-16 02:01
import { describe, it, expect } from "vitest";
import {
  formatDateISO,
  formatDateBR,
  formatDateShort,
  isoToDDMMAAAA,
  parseDateInputToISO,
  parseDateKey,
  isLeapYear,
  getISOWeek,
  deriveSemesterYear,
  deriveSemesterCode,
  timeToMinutes,
  minutesToHHMM,
  parseCargaHorariaToMinutes,
  formatDateExtensoBR
} from "@core/calendar/dateUtils.js";

describe("core/calendar/dateUtils.js - Utilitários de Data e Tempo", () => {
  it("deve formatar data para ISO, BR e formato curto", () => {
    const d = new Date(2026, 2, 15, 12, 0, 0); // 15/03/2026
    expect(formatDateISO(d)).toBe("2026-03-15");
    expect(formatDateBR(d)).toBe("15/03/2026");
    expect(formatDateShort(d)).toBe("15/03");
  });

  it("deve converter ISO para DD/MM/AAAA", () => {
    expect(isoToDDMMAAAA("2026-10-25")).toBe("25/10/2026");
    expect(isoToDDMMAAAA("")).toBe("");
  });

  it("deve fazer parse de entradas nos formatos BR e ISO", () => {
    expect(parseDateInputToISO("05/04/2026")).toBe("2026-04-05");
    expect(parseDateInputToISO("2026-04-05")).toBe("2026-04-05");
    expect(parseDateInputToISO("invalido")).toBeNull();
  });

  it("deve identificar anos bissextos corretamente", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });

  it("deve derivar semestres em texto e código", () => {
    const sem1 = new Date(2026, 4, 10); // Maio/2026
    const sem2 = new Date(2026, 8, 10); // Setembro/2026

    expect(deriveSemesterYear(sem1)).toBe("1º Sem / 2026");
    expect(deriveSemesterYear(sem2)).toBe("2º Sem / 2026");

    expect(deriveSemesterCode(sem1)).toBe("01/2026");
    expect(deriveSemesterCode(sem2)).toBe("02/2026");
  });

  it("deve converter entre minutos e formato HH:MM", () => {
    expect(timeToMinutes("04:00")).toBe(240);
    expect(timeToMinutes("01:30")).toBe(90);
    expect(minutesToHHMM(240)).toBe("04:00");
    expect(minutesToHHMM(90)).toBe("01:30");
  });

  it("deve converter cargas horárias em formatos variados para minutos", () => {
    expect(parseCargaHorariaToMinutes(40)).toBe(2400);
    expect(parseCargaHorariaToMinutes("80")).toBe(4800);
    expect(parseCargaHorariaToMinutes("120h")).toBe(7200);
    expect(parseCargaHorariaToMinutes("01:30")).toBe(90);
  });

  it("deve formatar data por extenso no padrão paulistano", () => {
    const d = new Date(2026, 9, 16); // 16 de Outubro de 2026
    expect(formatDateExtensoBR(d)).toBe("São Paulo, 16 de outubro de 2026");
  });
});

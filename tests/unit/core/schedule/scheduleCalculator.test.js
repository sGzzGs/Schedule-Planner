// Created at: 2026-10-16 02:02
import { describe, it, expect } from "vitest";
import { calculateSchedule } from "@core/schedule/scheduleCalculator.js";

describe("core/schedule/scheduleCalculator.js - Motor Puro de Cronograma", () => {
  it("deve calcular 10 aulas de 4h para 40h totais (Seg a Qui)", () => {
    const config = {
      dataInicioStr: "2026-03-02",
      cargaHorariaTotal: 40,
      horasPorDia: "04:00",
      diasSemana: [1, 2, 3, 4],
      tipoAulaPadrao: "pratica"
    };

    const res = calculateSchedule(config);
    expect(res).not.toBeNull();
    expect(res.aulas.length).toBe(10);
    expect(res.minutosPreenchidos).toBe(2400);
    expect(res.aulas[0].dataKey).toBe("2026-03-02");
    expect(res.aulas[9].dataKey).toBe("2026-03-17");
    expect(res.vigencia).toBe("17/03/2026");
    expect(res.vigenciaCompleta).toBe("02/03/2026 a 17/03/2026");
    expect(res.semAno).toBe("1º Sem / 2026");
  });

  it("deve respeitar a função isDateBlockedFn e pular feriados", () => {
    const blockedDates = new Set(["2026-04-21", "2026-05-01"]);
    const isDateBlocked = (dateKey) => blockedDates.has(dateKey);

    const config = {
      dataInicioStr: "2026-04-16",
      cargaHorariaTotal: 40,
      horasPorDia: "04:00",
      diasSemana: [1, 2, 3, 4, 5]
    };

    const res = calculateSchedule(config, isDateBlocked);
    const keys = res.aulas.map(a => a.dataKey);

    expect(keys).not.toContain("2026-04-21");
    expect(keys).not.toContain("2026-05-01");
    expect(res.aulas.length).toBe(10);
  });

  it("deve calcular transição multi-ano (2026 para 2027)", () => {
    const holidays = new Set([
      "2026-12-25",
      "2027-01-01"
    ]);

    const config = {
      dataInicioStr: "2026-12-15",
      cargaHorariaTotal: 80, // 20 aulas de 4h
      horasPorDia: "04:00",
      diasSemana: [1, 2, 3, 4]
    };

    const res = calculateSchedule(config, (d) => holidays.has(d));
    expect(res.aulas.length).toBe(20);
    expect(res.aulas[0].ano).toBe(2026);
    expect(res.aulas[19].ano).toBe(2027);

    const keys = res.aulas.map(a => a.dataKey);
    expect(keys).not.toContain("2026-12-25");
    expect(keys).not.toContain("2027-01-01");
  });

  it("deve respeitar inclusão e exclusão manual de datas", () => {
    const config = {
      dataInicioStr: "2026-03-02",
      cargaHorariaTotal: 16, // 4 aulas normais
      horasPorDia: "04:00",
      diasSemana: [1, 2, 3, 4],
      manualDateOverrides: {
        "2026-03-03": "remove", // Exclui a terça
        "2026-03-07": "add"      // Adiciona o sábado
      }
    };

    const res = calculateSchedule(config);
    const keys = res.aulas.map(a => a.dataKey);

    expect(keys).not.toContain("2026-03-03");
    expect(keys).toContain("2026-03-07");
    expect(res.aulas.length).toBe(4);
  });
});

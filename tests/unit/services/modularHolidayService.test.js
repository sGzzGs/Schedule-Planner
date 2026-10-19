// Created at: 2026-10-16 02:13
import { describe, it, expect, beforeEach } from "vitest";
import { HolidayService } from "@services/holidays/HolidayService.js";

describe("services/holidays/HolidayService.js - Serviço Modular de Feriados", () => {
  let service;
  let mockStorage;

  beforeEach(() => {
    const store = new Map();
    mockStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    };
    service = new HolidayService(mockStorage);
  });

  it("deve carregar legendas padrão oficiais", () => {
    const legendas = service.getLegendas();
    expect(legendas.length).toBeGreaterThanOrEqual(6);
    expect(legendas.some(l => l.id === "feriado")).toBe(true);
  });

  it("deve calcular datas fixas e móveis para 2026", () => {
    expect(service.isBlocked("2026-01-01")).toBe(true); // Confraternização Universal
    expect(service.isBlocked("2026-04-03")).toBe(true); // Sexta-feira Santa
    expect(service.isBlocked("2026-06-04")).toBe(true); // Corpus Christi
    expect(service.isBlocked("2026-03-10")).toBe(false); // Dia útil comum
  });

  it("deve suportar desbloqueio de dia oficial", () => {
    expect(service.isBlocked("2026-01-25")).toBe(true); // Aniversário SP
    service.desbloquearDiaOficial("2026-01-25");
    expect(service.isBlocked("2026-01-25")).toBe(false);

    service.restaurarDiaOficial("2026-01-25");
    expect(service.isBlocked("2026-01-25")).toBe(true);
  });

  it("deve adicionar e remover personalizações do usuário", () => {
    service.adicionarCustomizacao({
      data: "2026-08-14",
      descricao: "Treinamento Pedagógico",
      categoria_id: "personalizado",
      bloqueia_aula: true
    });

    expect(service.isBlocked("2026-08-14")).toBe(true);
    const info = service.getDateInfo("2026-08-14");
    expect(info.descricao).toBe("Treinamento Pedagógico");

    service.removerCustomizacao("2026-08-14");
    expect(service.isBlocked("2026-08-14")).toBe(false);
  });

  it("deve gerar calendário anual com 12 meses", () => {
    const cal = service.getYearCalendar(2027);
    expect(cal.ano).toBe(2027);
    expect(cal.meses.length).toBe(12);
    expect(cal.totalEventos).toBeGreaterThan(15);
  });
});

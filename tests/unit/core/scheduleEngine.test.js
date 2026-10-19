// Created at: 2026-10-16 01:54
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function initScheduleEnvironment() {
  const rootDir = path.resolve(__dirname, "../../../");
  const rawHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
  const cleanHtml = rawHtml
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  document.documentElement.innerHTML = cleanHtml;

  // Carregar holidayService
  const holidayCode = fs.readFileSync(path.join(rootDir, "js/holidayService.js"), "utf-8");
  new Function("window", "document", "localStorage", holidayCode)(window, document, localStorage);

  // Carregar app.js
  const appCode = fs.readFileSync(path.join(rootDir, "js/app.js"), "utf-8");
  new Function("window", "document", "localStorage", appCode)(window, document, localStorage);

  return {
    calculateSchedule: window.calculateSchedule,
    holidayService: window.holidayService,
    timeToMinutes: window.timeToMinutes,
    minutesToHHMM: window.minutesToHHMM,
    parseDateInputToISO: window.parseDateInputToISO,
    isoToDDMMAAAA: window.isoToDDMMAAAA
  };
}

describe("ScheduleEngine - Motor de Cronograma Letivo e Dias Úteis", () => {
  let calculateSchedule;
  let holidayService;

  beforeEach(() => {
    window.localStorage.clear();
    const env = initScheduleEnvironment();
    calculateSchedule = env.calculateSchedule;
    holidayService = env.holidayService;
  });

  describe("1. Distribuição Regular de Aulas e Carga Horária", () => {
    it("deve calcular exatamente 10 aulas de 4h para uma disciplina de 40h (Seg a Qui)", () => {
      const formData = {
        dataInicioStr: "2026-03-02", // Segunda-feira
        cargaHorariaTotal: 40,
        horasPorDia: "04:00",
        horasPorAula: "01:00",
        aulasPorDia: 4,
        diasSemana: [1, 2, 3, 4], // Seg, Ter, Qua, Qui
        tipoAulaPadrao: "pratica"
      };

      const result = calculateSchedule(formData);

      expect(result).not.toBeNull();
      expect(result.aulas.length).toBe(10);
      expect(result.totalAulas).toBe(10);
      expect(result.minutosPreenchidos).toBe(40 * 60);

      // Primeira aula: 02/03/2026 (Seg)
      expect(result.aulas[0].dataKey).toBe("2026-03-02");
      // 10ª aula: Sem feriados em março, 2 semanas (8 aulas) + 2 dias = 17/03/2026 (Ter)
      expect(result.aulas[9].dataKey).toBe("2026-03-17");
      expect(result.vigencia).toBe("17/03/2026");
    });

    it("deve calcular exatamente 20 aulas de 4h para uma disciplina de 80h", () => {
      const formData = {
        dataInicioStr: "2026-08-03", // Segunda-feira em agosto (sem feriados em SP)
        cargaHorariaTotal: 80,
        horasPorDia: "04:00",
        horasPorAula: "01:00",
        aulasPorDia: 4,
        diasSemana: [1, 2, 3, 4],
        tipoAulaPadrao: "pratica"
      };

      const result = calculateSchedule(formData);

      expect(result).not.toBeNull();
      expect(result.aulas.length).toBe(20);
      expect(result.minutosPreenchidos).toBe(80 * 60);
      expect(result.aulas[0].dataKey).toBe("2026-08-03");
      // 20 aulas em 4 dias/sem = exatamente 5 semanas (termina quinta-feira da 5ª semana: 03/09/2026)
      expect(result.aulas[19].dataKey).toBe("2026-09-03");
    });
  });

  describe("2. Bloqueio Automático e Rígido de Feriados", () => {
    it("não deve agendar aulas no feriado de Tiradentes (21/04) nem no Dia do Trabalho (01/05)", () => {
      const formData = {
        dataInicioStr: "2026-04-16", // Quinta-feira
        cargaHorariaTotal: 40, // 10 aulas
        horasPorDia: "04:00",
        horasPorAula: "01:00",
        aulasPorDia: 4,
        diasSemana: [1, 2, 3, 4, 5], // Seg a Sex
        tipoAulaPadrao: "teoria"
      };

      const result = calculateSchedule(formData);

      expect(result).not.toBeNull();
      const chavesAulas = result.aulas.map(a => a.dataKey);

      // Feriados oficiais não podem ter aulas
      expect(chavesAulas).not.toContain("2026-04-21"); // Tiradentes
      expect(chavesAulas).not.toContain("2026-05-01"); // Dia do Trabalho

      // Garante que a carga total de 40h foi atendida postergando para dias úteis subsequentes
      expect(result.aulas.length).toBe(10);
      expect(result.minutosPreenchidos).toBe(40 * 60);
    });

    it("não deve agendar aulas em feriados móveis calculados (Corpus Christi)", () => {
      // Corpus Christi em 2026 é 04/06/2026, com emendas 05/06 e 06/06
      const formData = {
        dataInicioStr: "2026-06-01", // Segunda
        cargaHorariaTotal: 40,
        horasPorDia: "04:00",
        horasPorAula: "01:00",
        aulasPorDia: 4,
        diasSemana: [1, 2, 3, 4, 5],
        tipoAulaPadrao: "pratica"
      };

      const result = calculateSchedule(formData);
      const chavesAulas = result.aulas.map(a => a.dataKey);

      expect(chavesAulas).not.toContain("2026-06-04"); // Quinta de Corpus Christi
      expect(chavesAulas).not.toContain("2026-06-05"); // Emenda Sexta
    });
  });

  describe("3. Resolução de Cronograma Multi-Ano (Transição 2026 -> 2027)", () => {
    it("deve transitar sem perda entre anos letivos respeitando feriados de ambos os anos", () => {
      const formData = {
        dataInicioStr: "2026-12-01", // Terça-feira
        cargaHorariaTotal: 120, // 30 aulas de 4h
        horasPorDia: "04:00",
        horasPorAula: "01:00",
        aulasPorDia: 4,
        diasSemana: [1, 2, 3, 4], // Seg a Qui
        tipoAulaPadrao: "pratica"
      };

      const result = calculateSchedule(formData);

      expect(result).not.toBeNull();
      expect(result.aulas.length).toBe(30);

      // Primeira aula em 2026
      expect(result.aulas[0].dataKey).toBe("2026-12-01");
      expect(result.aulas[0].ano).toBe(2026);

      // Última aula deve cruzar para 2027
      const ultimaAula = result.aulas[result.aulas.length - 1];
      expect(ultimaAula.ano).toBe(2027);

      const chavesAulas = result.aulas.map(a => a.dataKey);

      // Feriados de 2026 bloqueados
      expect(chavesAulas).not.toContain("2026-12-21"); // Formatura CAI
      expect(chavesAulas).not.toContain("2026-12-22"); // Confraternização Escolar
      expect(chavesAulas).not.toContain("2026-12-25"); // Natal

      // Feriados de 2027 bloqueados
      expect(chavesAulas).not.toContain("2027-01-01"); // Confraternização Universal
      expect(chavesAulas).not.toContain("2027-01-25"); // Aniversário de SP
      expect(chavesAulas).not.toContain("2027-02-08"); // Segunda de Carnaval
      expect(chavesAulas).not.toContain("2027-02-09"); // Terça de Carnaval
    });
  });

  describe("4. Validação e Casos Limite", () => {
    it("deve retornar emptyReason 'no_days_selected' quando nenhum dia da semana estiver ativo", () => {
      const formData = {
        dataInicioStr: "2026-03-02",
        cargaHorariaTotal: 40,
        horasPorDia: "04:00",
        diasSemana: []
      };

      const result = calculateSchedule(formData);

      expect(result.totalAulas).toBe(0);
      expect(result.aulas.length).toBe(0);
      expect(result.emptyReason).toBe("no_days_selected");
    });

    it("deve retornar null se dataInicioStr estiver vazia", () => {
      const formData = {
        dataInicioStr: "",
        cargaHorariaTotal: 40,
        diasSemana: [1, 2]
      };

      const result = calculateSchedule(formData);
      expect(result).toBeNull();
    });
  });

  describe("5. Agrupamento Mensal Sequencial para Folha A4", () => {
    it("deve organizar as aulas em blocos mensais contendo o nome do mês e total de aulas", () => {
      const formData = {
        dataInicioStr: "2026-03-02",
        cargaHorariaTotal: 80, // Cruza março e abril
        horasPorDia: "04:00",
        diasSemana: [1, 2, 3, 4]
      };

      const result = calculateSchedule(formData);

      expect(result.mesesSequenciais.length).toBeGreaterThanOrEqual(2);
      expect(result.mesesSequenciais[0].nomeMes).toBe("Março");
      expect(result.mesesSequenciais[1].nomeMes).toBe("Abril");
      expect(result.mesesSequenciais[0].diasPratica.length).toBeGreaterThan(0);
    });
  });
});

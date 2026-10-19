// Created at: 2026-10-16 01:52
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function initCompensacao() {
  const rootDir = path.resolve(__dirname, "../../../");
  const rawHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
  // Remove links de stylesheet externos para evitar que o happy-dom tente requisitar rede
  const cleanHtml = rawHtml
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  document.documentElement.innerHTML = cleanHtml;

  // Carregar holidayService
  const holidayCode = fs.readFileSync(path.join(rootDir, "js/holidayService.js"), "utf-8");
  new Function("window", "document", "localStorage", holidayCode)(window, document, localStorage);

  // Carregar compensacao.js
  const compCode = fs.readFileSync(path.join(rootDir, "js/compensacao.js"), "utf-8");
  new Function("window", "document", "localStorage", compCode)(window, document, localStorage);

  return {
    CompState: window.CompState,
    compCalcularFrequenciaAteHoje: window.compCalcularFrequenciaAteHoje,
    compObterStatusFlagAluno: window.compObterStatusFlagAluno,
    compCalcularValoresVariaveis: window.compCalcularValoresVariaveis,
    compFormatarHorasParaHHMM: window.compFormatarHorasParaHHMM
  };
}

describe("Regras Críticas de Compensação de Ausências (SENAI)", () => {
  let CompState;
  let compCalcularFrequenciaAteHoje;
  let compObterStatusFlagAluno;
  let compCalcularValoresVariaveis;
  let compFormatarHorasParaHHMM;

  beforeEach(() => {
    window.localStorage.clear();
    const env = initCompensacao();
    CompState = env.CompState;
    compCalcularFrequenciaAteHoje = env.compCalcularFrequenciaAteHoje;
    compObterStatusFlagAluno = env.compObterStatusFlagAluno;
    compCalcularValoresVariaveis = env.compCalcularValoresVariaveis;
    compFormatarHorasParaHHMM = env.compFormatarHorasParaHHMM;

    // Resetar estado de teste
    CompState.turmaInfo.chTotal = 80;
    CompState.diasLetivos = ["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-09"];
    CompState.dataSimuladaHoje = "2026-03-10"; // Referência após os dias letivos
    CompState.alunos = ["Aluno Teste"];
    CompState.faltasPorAluno = {};
    CompState.ultimasFaltasImpressas = {};
    CompState.manualFlagAlunos = {};
  });

  describe("1. Fórmula Institucional de Frequência e Percentual de Faltas", () => {
    it("deve computar 100% de frequência e 0% de faltas para aluno sem ausências", () => {
      CompState.faltasPorAluno["Aluno Teste"] = {};
      const { faltasAteHoje, freqPercent, pctFaltas } = compCalcularFrequenciaAteHoje("Aluno Teste", 80);

      expect(faltasAteHoje).toBe(0);
      expect(freqPercent).toBe(100);
      expect(pctFaltas).toBe(0);
    });

    it("deve aplicar arredondamento para baixo (Math.floor) na frequência", () => {
      // 15h de falta em 40h total -> (40 - 15) / 40 = 25/40 = 62.5% -> 62%
      CompState.turmaInfo.chTotal = 40;
      CompState.faltasPorAluno["Aluno Teste"] = { "2026-03-02": 15 };
      const { freqPercent, pctFaltas } = compCalcularFrequenciaAteHoje("Aluno Teste", 40);

      expect(freqPercent).toBe(62);
      expect(pctFaltas).toBe(38); // Math.round(15/40*100) = 38%
    });

    it("deve limitar a frequência ao piso de 0% caso faltas excedam a carga horária", () => {
      CompState.faltasPorAluno["Aluno Teste"] = { "2026-03-02": 100 };
      const { freqPercent, pctFaltas } = compCalcularFrequenciaAteHoje("Aluno Teste", 80);

      expect(freqPercent).toBe(0);
      expect(pctFaltas).toBe(100);
    });
  });

  describe("2. Disparador do Alerta Crítico de Faltas (Regra dos 25%)", () => {
    it("deve ativar estado 'danger' quando faltas atingirem ou superarem 25% da carga horária", () => {
      // 80h total * 25% = 20h de faltas
      CompState.faltasPorAluno["Aluno Teste"] = { "2026-03-02": 20 };
      const status = compObterStatusFlagAluno("Aluno Teste", 80);

      expect(status.ativa).toBe(true);
      expect(status.tipo).toBe("danger");
      expect(status.motivo).toContain("25% da carga");
    });

    it("deve ativar estado 'warning' quando faltas estiverem entre 10% e 24%", () => {
      // 80h * 15% = 12h de faltas
      CompState.faltasPorAluno["Aluno Teste"] = { "2026-03-02": 12 };
      const status = compObterStatusFlagAluno("Aluno Teste", 80);

      expect(status.ativa).toBe(true);
      expect(status.tipo).toBe("warning");
      expect(status.motivo).toContain("10% de faltas atingido");
    });

    it("deve ativar estado 'warning' por 2 faltas consecutivas mesmo abaixo de 10%", () => {
      // 80h total: 2 faltas de 2h = 4h (5% da carga horária, abaixo dos 10%)
      CompState.faltasPorAluno["Aluno Teste"] = {
        "2026-03-02": 2,
        "2026-03-03": 2
      };
      const status = compObterStatusFlagAluno("Aluno Teste", 80);

      expect(status.ativa).toBe(true);
      expect(status.tipo).toBe("warning");
      expect(status.motivo).toContain("consecutivas");
    });

    it("deve desligar a flag automaticamente se todas as faltas já foram impressas", () => {
      CompState.faltasPorAluno["Aluno Teste"] = { "2026-03-02": 20 };
      CompState.ultimasFaltasImpressas["Aluno Teste"] = 20;

      const status = compObterStatusFlagAluno("Aluno Teste", 80);
      expect(status.ativa).toBe(false);
      expect(status.tipo).toBeNull();
    });

    it("deve respeitar override manual explícito de ativação e desativação", () => {
      CompState.faltasPorAluno["Aluno Teste"] = { "2026-03-02": 20 }; // Seria danger
      CompState.manualFlagAlunos["Aluno Teste"] = false; // Desligado manualmente

      expect(compObterStatusFlagAluno("Aluno Teste", 80).ativa).toBe(false);

      CompState.faltasPorAluno["Aluno Teste"] = {}; // Sem faltas
      CompState.manualFlagAlunos["Aluno Teste"] = true; // Ligado manualmente

      const status = compObterStatusFlagAluno("Aluno Teste", 80);
      expect(status.ativa).toBe(true);
      expect(status.tipo).toBe("warning");
    });
  });

  describe("3. Classificação Automática das Situações Discentes (Mutuamente Exclusivas)", () => {
    it("deve marcar 'situacao_tender_nao_cert' quando frequência >= 75%", () => {
      CompState.faltasPorAluno["Aluno Teste"] = { "2026-03-02": 10 }; // 80h - 10h = 70h (87.5% -> 87%)
      const valores = compCalcularValoresVariaveis("Aluno Teste");

      expect(valores["situacao_tender_nao_cert"]).toBe(true);
      expect(valores["situacao_nao_cert"]).toBe(false);
      expect(valores["situacao_nao_cert_excesso"]).toBe(false);
      expect(valores["porcentagem_frequencia"]).toBe("87%");
    });

    it("deve marcar 'situacao_nao_cert' quando frequência estiver entre 40% e 74%", () => {
      // 80h total, 30h de faltas -> 50h presentes (50/80 = 62.5% -> 62%)
      CompState.faltasPorAluno["Aluno Teste"] = { "2026-03-02": 30 };
      const valores = compCalcularValoresVariaveis("Aluno Teste");

      expect(valores["situacao_tender_nao_cert"]).toBe(false);
      expect(valores["situacao_nao_cert"]).toBe(true);
      expect(valores["situacao_nao_cert_excesso"]).toBe(false);
      expect(valores["porcentagem_frequencia"]).toBe("62%");
    });

    it("deve marcar 'situacao_nao_cert_excesso' quando frequência for inferior a 40%", () => {
      // 80h total, 55h de faltas -> 25h presentes (25/80 = 31.25% -> 31%)
      CompState.faltasPorAluno["Aluno Teste"] = { "2026-03-02": 55 };
      const valores = compCalcularValoresVariaveis("Aluno Teste");

      expect(valores["situacao_tender_nao_cert"]).toBe(false);
      expect(valores["situacao_nao_cert"]).toBe(false);
      expect(valores["situacao_nao_cert_excesso"]).toBe(true);
      expect(valores["porcentagem_frequencia"]).toBe("31%");
    });
  });

  describe("4. Formatação Canônica de Horas (HH:MM)", () => {
    it("deve formatar valores numéricos de horas para HH:MM", () => {
      expect(compFormatarHorasParaHHMM(0)).toBe("00:00");
      expect(compFormatarHorasParaHHMM(4)).toBe("04:00");
      expect(compFormatarHorasParaHHMM(12.5)).toBe("12:30");
      expect(compFormatarHorasParaHHMM(40)).toBe("40:00");
    });
  });
});

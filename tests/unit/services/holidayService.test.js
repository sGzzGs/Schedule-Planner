// Created at: 2026-10-16 01:50
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carregamento resiliente do script clássico no ambiente happy-dom
function loadHolidayService() {
  const filePath = path.resolve(__dirname, "../../../js/holidayService.js");
  const scriptContent = fs.readFileSync(filePath, "utf-8");

  // Executar no escopo de window
  const fn = new Function("window", "document", "localStorage", scriptContent);
  fn(window, window.document, window.localStorage);

  return {
    HolidayService: window.HolidayService,
    holidayService: window.holidayService
  };
}

describe("HolidayService - Motor Universal de Feriados SENAI", () => {
  let HolidayService;
  let holidayService;

  beforeEach(() => {
    window.localStorage.clear();
    const loaded = loadHolidayService();
    HolidayService = loaded.HolidayService;
    holidayService = loaded.holidayService;
  });

  describe("1. Algoritmo Canônico de Páscoa (Meeus/Jones/Butcher)", () => {
    const pascoaEsperada = {
      2024: "2024-03-31",
      2025: "2025-04-20",
      2026: "2026-04-05",
      2027: "2027-03-28",
      2028: "2028-04-16",
      2029: "2029-04-01",
      2030: "2030-04-21"
    };

    for (const [ano, dataEsperada] of Object.entries(pascoaEsperada)) {
      it(`deve calcular a Páscoa de ${ano} como ${dataEsperada}`, () => {
        const pascoa = HolidayService.calcularDomingoPascoa(Number(ano));
        const key = HolidayService.formatDateKey(pascoa);
        expect(key).toBe(dataEsperada);
      });
    }
  });

  describe("2. Feriados Móveis Institucionais Derivados", () => {
    it("deve calcular corretamente os feriados móveis de 2026", () => {
      const y2026 = holidayService.getYearData(2026);
      expect(y2026.datasMap.has("2026-02-14")).toBe(true); // Sábado Carnaval (-50)
      expect(y2026.datasMap.has("2026-02-16")).toBe(true); // Segunda Carnaval (-48)
      expect(y2026.datasMap.has("2026-02-17")).toBe(true); // Terça Carnaval (-47)
      expect(y2026.datasMap.has("2026-04-03")).toBe(true); // Sexta Santa (-2)
      expect(y2026.datasMap.has("2026-04-04")).toBe(true); // Sábado de Aleluia (-1)
      expect(y2026.datasMap.has("2026-06-04")).toBe(true); // Corpus Christi (+60)
      expect(y2026.datasMap.has("2026-06-05")).toBe(true); // Emenda Sexta (+61)
      expect(y2026.datasMap.has("2026-06-06")).toBe(true); // Emenda Sábado (+62)
    });

    it("deve calcular corretamente os feriados móveis para o ano seguinte (2027)", () => {
      const y2027 = holidayService.getYearData(2027);
      expect(y2027.datasMap.has("2027-02-09")).toBe(true); // Terça Carnaval
      expect(y2027.datasMap.has("2027-03-26")).toBe(true); // Sexta Santa
      expect(y2027.datasMap.has("2027-05-27")).toBe(true); // Corpus Christi
    });
  });

  describe("3. Feriados Fixos e Bloqueio de Aulas", () => {
    it("deve identificar datas fixas nacionais e estaduais (SP) como bloqueadas", () => {
      expect(holidayService.isBlocked("2026-01-01")).toBe(true); // Confraternização Universal
      expect(holidayService.isBlocked("2026-01-25")).toBe(true); // Aniv. São Paulo
      expect(holidayService.isBlocked("2026-04-21")).toBe(true); // Tiradentes
      expect(holidayService.isBlocked("2026-05-01")).toBe(true); // Dia do Trabalho
      expect(holidayService.isBlocked("2026-07-09")).toBe(true); // Rev. Constitucionalista
      expect(holidayService.isBlocked("2026-09-07")).toBe(true); // Independência
      expect(holidayService.isBlocked("2026-10-12")).toBe(true); // N. Sra Aparecida
      expect(holidayService.isBlocked("2026-11-02")).toBe(true); // Finados
      expect(holidayService.isBlocked("2026-11-15")).toBe(true); // Proclamação da República
      expect(holidayService.isBlocked("2026-11-20")).toBe(true); // Consciência Negra
      expect(holidayService.isBlocked("2026-12-25")).toBe(true); // Natal
    });

    it("não deve bloquear dias úteis regulares sem feriado", () => {
      expect(holidayService.isBlocked("2026-03-10")).toBe(false);
      expect(holidayService.isBlocked("2026-08-18")).toBe(false);
    });
  });

  describe("4. Customizações do Usuário (Adicionar/Remover/Restaurar)", () => {
    it("deve permitir adicionar um recesso customizado e bloqueá-lo", () => {
      const dataRecesso = "2026-08-10";
      expect(holidayService.isBlocked(dataRecesso)).toBe(false);

      holidayService.adicionarCustomizacao({
        data: dataRecesso,
        descricao: "Recesso Institucional Extra",
        categoria_id: "recesso",
        bloqueia_aula: true
      });

      expect(holidayService.isBlocked(dataRecesso)).toBe(true);
      const info = holidayService.getDateInfo(dataRecesso);
      expect(info.descricao).toBe("Recesso Institucional Extra");
    });

    it("deve permitir desbloquear um feriado oficial e torná-lo dia letivo", () => {
      const feriadoSp = "2026-01-25";
      expect(holidayService.isBlocked(feriadoSp)).toBe(true);

      holidayService.desbloquearDiaOficial(feriadoSp);
      expect(holidayService.isBlocked(feriadoSp)).toBe(false);
    });

    it("deve restaurar padrão e reverter alterações", () => {
      holidayService.adicionarCustomizacao({
        data: "2026-08-10",
        descricao: "Teste",
        categoria_id: "recesso",
        bloqueia_aula: true
      });
      holidayService.desbloquearDiaOficial("2026-01-25");

      holidayService.restaurarPadrao();

      expect(holidayService.isBlocked("2026-08-10")).toBe(false);
      expect(holidayService.isBlocked("2026-01-25")).toBe(true);
    });
  });

  describe("5. Estruturação do Calendário Anual (12 Meses)", () => {
    it("deve gerar a estrutura de 12 meses com contagem de eventos", () => {
      const cal2026 = holidayService.getYearCalendar(2026);
      expect(cal2026.meses.length).toBe(12);
      expect(cal2026.totalEventos).toBeGreaterThan(15);
      expect(cal2026.ano).toBe(2026);
    });

    it("deve carregar os feriados oficiais de 2027 incluindo a data específica 2027-04-04", () => {
      const y2027 = holidayService.getYearData(2027);
      expect(y2027.datasMap.has("2027-04-04")).toBe(true);
      const ev = y2027.datasMap.get("2027-04-04");
      expect(ev.descricao).toContain("Sábado de Aleluia");
      expect(ev.categoriaId).toBe("emenda");
    });

    it("deve classificar Formatura CAI como formatura CAI/CT com cor #00B050", () => {
      const y2026 = holidayService.getYearData(2026);
      const formJunho = y2026.datasMap.get("2026-06-24");
      expect(formJunho).toBeDefined();
      expect(formJunho.categoriaId).toBe("formatura");
      expect(formJunho.corTema).toBe("#00B050");
    });

    it("deve salvar, atualizar e excluir feriados via salvarOuAtualizarFeriado e excluirFeriado", () => {
      const dataTeste = "2026-08-25";
      holidayService.salvarOuAtualizarFeriado({
        data: dataTeste,
        descricao: "Conselho de Classe",
        categoria_id: "ponto_facultativo"
      });

      expect(holidayService.isBlocked(dataTeste)).toBe(true);
      let info = holidayService.getDateInfo(dataTeste);
      expect(info.descricao).toBe("Conselho de Classe");
      expect(info.categoriaId).toBe("ponto_facultativo");

      // Atualização
      holidayService.salvarOuAtualizarFeriado({
        data: dataTeste,
        descricao: "Conselho Alterado",
        categoria_id: "formatura"
      });
      info = holidayService.getDateInfo(dataTeste);
      expect(info.descricao).toBe("Conselho Alterado");
      expect(info.categoriaId).toBe("formatura");

      // Exclusão
      holidayService.excluirFeriado(dataTeste);
      expect(holidayService.isBlocked(dataTeste)).toBe(false);
    });
  });
});

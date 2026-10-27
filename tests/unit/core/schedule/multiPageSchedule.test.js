// Created at: 2026-10-27 14:20
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function initScheduleEnvironment() {
  const rootDir = path.resolve(__dirname, "../../../..");
  const rawHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
  const cleanHtml = rawHtml
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  document.documentElement.innerHTML = cleanHtml;

  const holidayCode = fs.readFileSync(path.join(rootDir, "js/holidayService.js"), "utf-8");
  new Function("window", "document", "localStorage", holidayCode)(window, document, localStorage);

  const appCode = fs.readFileSync(path.join(rootDir, "js/app.js"), "utf-8");
  new Function("window", "document", "localStorage", appCode)(window, document, localStorage);

  return {
    calculateSchedule: window.calculateSchedule,
    renderScheduleHTML: window.renderScheduleHTML,
    changeCronogramaPage: window.changeCronogramaPage
  };
}

describe("Cronograma Multi-Páginas & Ajustes de Impressão (SCO56-d)", () => {
  let env;

  beforeEach(() => {
    window.localStorage.clear();
    env = initScheduleEnvironment();
  });

  it("deve calcular mais de 8 meses e alocar todas as aulas em múltiplas folhas sem corte", () => {
    // Configuração simulando turma longa (ex: 800 horas com 1 encontro semanal de 18:20 ou múltiplos meses)
    const formData = {
      dataInicioStr: "2026-09-01",
      cargaHorariaTotal: 300, // Carga distribuída ao longo de 10 meses
      horasPorDia: "04:00",
      diasSemana: [5], // Apenas sextas-feiras (aprox. 4 a 5 aulas por mês -> ~16-20h/mês -> > 10 meses)
      tipoAulaPadrao: "pratica",
      ambientePratica: "L08",
      codigoTurma: "TURMA_LONGA_01"
    };

    const calcResult = env.calculateSchedule(formData);
    expect(calcResult).not.toBeNull();
    expect(calcResult.mesesSequenciais.length).toBeGreaterThan(8);
    expect(calcResult.totalPages).toBeGreaterThanOrEqual(2);
    expect(calcResult.minutosPreenchidos).toBe(calcResult.totalCargaMinutos);
    expect(calcResult.aulasQueCouberam).toBe(calcResult.totalAulas);
  });

  it("deve renderizar a estrutura multi-folhas com numeração dinâmica de páginas e barra de navegação", () => {
    const formData = {
      dataInicioStr: "2026-09-01",
      cargaHorariaTotal: 300,
      horasPorDia: "04:00",
      diasSemana: [5],
      tipoAulaPadrao: "pratica",
      ambientePratica: "L08",
      codigoTurma: "INFOBAS_2606S",
      nomeCurso: "Informática Básica",
      docente: "Leonardo Gabriel",
      coordenador: "Carlos José Júnior"
    };

    const calcResult = env.calculateSchedule(formData);
    const html = env.renderScheduleHTML(formData, calcResult);

    // Deve conter a barra de paginação com setas
    expect(html).toContain("cron-pagination-bar");
    expect(html).toContain("btn-cron-prev");
    expect(html).toContain("btn-cron-next");
    expect(html).toContain("Folha Anterior");
    expect(html).toContain("Próxima Folha");

    // Deve conter múltiplas páginas A4
    expect(html).toContain('data-page="1"');
    expect(html).toContain('data-page="2"');

    // Deve conter a numeração correta nos rodapés
    expect(html).toContain(`1 de ${calcResult.totalPages}`);
    expect(html).toContain(`2 de ${calcResult.totalPages}`);
  });

  it("deve alternar a página ativa ao chamar changeCronogramaPage", () => {
    const formData = {
      dataInicioStr: "2026-09-01",
      cargaHorariaTotal: 300,
      horasPorDia: "04:00",
      diasSemana: [5],
      tipoAulaPadrao: "pratica",
      ambientePratica: "L08"
    };

    const calcResult = env.calculateSchedule(formData);
    const target = document.getElementById("cronograma-render-target");
    target.innerHTML = env.renderScheduleHTML(formData, calcResult);

    const page1 = target.querySelector('.page-a4[data-page="1"]');
    const page2 = target.querySelector('.page-a4[data-page="2"]');

    expect(page1.classList.contains("active-page")).toBe(true);
    expect(page2.classList.contains("hidden-preview-page")).toBe(true);

    // Avança para a página 2
    env.changeCronogramaPage(1);
    expect(page1.classList.contains("hidden-preview-page")).toBe(true);
    expect(page2.classList.contains("active-page")).toBe(true);

    // Retorna para a página 1
    env.changeCronogramaPage(-1);
    expect(page1.classList.contains("active-page")).toBe(true);
    expect(page2.classList.contains("hidden-preview-page")).toBe(true);
  });

  it("deve verificar que as assinaturas no verso da compensação foram elevadas em 10px", () => {
    const rootDir = path.resolve(__dirname, "../../../..");
    const compCode = fs.readFileSync(path.join(rootDir, "js/compensacao.js"), "utf-8");

    // Deve conter translateY(10px) para não cortar caracteres na impressão física
    expect(compCode).toContain("transform: translateY(10px);");
    expect(compCode).not.toContain("transform: translateY(20px);");
  });

  it("deve verificar que o botão dos 3 pontos possui dimensões e hitbox ampliadas", () => {
    const rootDir = path.resolve(__dirname, "../../../..");
    const cssCode = fs.readFileSync(path.join(rootDir, "css/style.css"), "utf-8");

    expect(cssCode).toContain("min-width: 32px;");
    expect(cssCode).toContain("min-height: 32px;");
    expect(cssCode).toContain("touch-action: manipulation;");
  });
});

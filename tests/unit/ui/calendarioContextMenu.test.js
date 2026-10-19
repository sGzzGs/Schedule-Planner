// Created at: 2026-10-19 14:25
import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadCalendarModule() {
  const holidayServicePath = path.resolve(__dirname, "../../../js/holidayService.js");
  const holidayServiceCode = fs.readFileSync(holidayServicePath, "utf-8");

  const calendarioPath = path.resolve(__dirname, "../../../js/calendario.js");
  const calendarioCode = fs.readFileSync(calendarioPath, "utf-8");

  const combinedCode = `
    ${holidayServiceCode}
    ${calendarioCode}
  `;

  const fn = new Function("window", "document", "localStorage", combinedCode);
  fn(window, window.document, window.localStorage);

  return {
    holidayService: window.holidayService,
    calInit: window.calInit,
    calRenderizar: window.calRenderizar,
    calAbrirMenuMinimalista: window.calAbrirMenuMinimalista,
    calFecharMenuMinimalista: window.calFecharMenuMinimalista,
    calSalvarDiaMenu: window.calSalvarDiaMenu,
    calExcluirDiaMenu: window.calExcluirDiaMenu,
    calToggleSliderDropdown: window.calToggleSliderDropdown,
    calSelecionarTipoDropdown: window.calSelecionarTipoDropdown
  };
}

describe("calendario.js - Menu Minimalista Warm Timber e Botão Direito", () => {
  let mod;

  beforeEach(() => {
    window.localStorage.clear();
    document.body.innerHTML = `
      <div id="tab-calendario"></div>
    `;
    mod = loadCalendarModule();
  });

  it("deve renderizar a grade anual com a nova barra de legendas e 6 cores", () => {
    mod.calRenderizar();
    const container = document.getElementById("tab-calendario");
    expect(container).not.toBeNull();

    // Checar legendas
    expect(container.textContent).toContain("Feriados");
    expect(container.textContent).toContain("Emenda de Feriado");
    expect(container.textContent).toContain("Ponto Facultativo");
    expect(container.textContent).toContain("Formatura CAI/CT");
    expect(container.textContent).toContain("Férias FIC");
    expect(container.textContent).toContain("A Decidir");

    // Verificar se células de dia foram renderizadas
    const dayCells = container.querySelectorAll(".day-cell[data-date]");
    expect(dayCells.length).toBe(365);
  });

  it("deve abrir o menu minimalista de contexto com campos de descrição e dropdown", () => {
    mod.calRenderizar();
    mod.calAbrirMenuMinimalista("2026-04-21", 200, 200);

    const card = document.getElementById("cal-minimalist-card");
    expect(card).not.toBeNull();
    expect(card.textContent).toContain("21 de Abril de 2026");

    const descInput = document.getElementById("cal-min-desc-input");
    expect(descInput).not.toBeNull();
    expect(descInput.value).toBe("Tiradentes");

    const trigger = document.getElementById("cal-dropdown-trigger");
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toContain("Feriados");

    // O feriado existe, então deve exibir o botão de lixeira
    const deleteBtn = card.querySelector('button[title*="Excluir"]');
    expect(deleteBtn).not.toBeNull();
  });

  it("deve permitir alterar o tipo e salvar via menu minimalista", () => {
    mod.calRenderizar();
    mod.calAbrirMenuMinimalista("2026-04-21", 200, 200);

    // Mudar tipo para Ponto Facultativo
    mod.calSelecionarTipoDropdown("ponto_facultativo", "Ponto Facultativo", "#808080");
    const descInput = document.getElementById("cal-min-desc-input");
    descInput.value = "Tiradentes Facultativo";

    mod.calSalvarDiaMenu();

    // Menu deve fechar
    expect(document.getElementById("cal-minimalist-card")).toBeNull();

    // Data deve ter sido atualizada no serviço
    const info = mod.holidayService.getDateInfo("2026-04-21");
    expect(info.descricao).toBe("Tiradentes Facultativo");
    expect(info.categoriaId).toBe("ponto_facultativo");
  });

  it("deve excluir o feriado via botão de lixeira no menu minimalista", () => {
    mod.calRenderizar();
    mod.calAbrirMenuMinimalista("2026-01-01", 100, 100);

    expect(mod.holidayService.isBlocked("2026-01-01")).toBe(true);
    mod.calExcluirDiaMenu();

    expect(document.getElementById("cal-minimalist-card")).toBeNull();
    expect(mod.holidayService.isBlocked("2026-01-01")).toBe(false);
  });

  it("deve animar a abertura do slider dropdown de tipos", () => {
    mod.calAbrirMenuMinimalista("2026-05-01", 150, 150);
    const options = document.getElementById("cal-dropdown-options");
    expect(options.classList.contains("open")).toBe(false);

    mod.calToggleSliderDropdown();
    expect(options.classList.contains("open")).toBe(true);

    mod.calToggleSliderDropdown();
    expect(options.classList.contains("open")).toBe(false);
  });
});

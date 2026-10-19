// Created at: 2026-10-17 14:38
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TopBarView } from "../../../src/ui/topbar/TopBarView.js";

describe("TopBarView (UI TopBar)", () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="topbar-root">
        <nav class="app-tab-bar">
          <button class="app-tab active" data-tab="tab-cronograma" aria-selected="true">Cronograma</button>
          <button class="app-tab" data-tab="tab-compensacao" aria-selected="false">Compensação</button>
          <button class="app-tab" data-tab="tab-calendario" aria-selected="false">Calendário</button>
        </nav>
        <span class="stitch-version-pill">v3</span>
        <div id="version-popup" style="display: none;"></div>
        <select id="presetSelect"></select>
        <button id="btn-salvar-modelo"></button>
        <button id="btn-deletar-modelo"></button>
        <button id="btn-export-pdf"></button>
        <div id="tab-cronograma" class="page-active"></div>
        <div id="tab-compensacao"></div>
        <div id="tab-calendario"></div>
      </div>
    `;
    root = document.getElementById("topbar-root");
  });

  it("deve inicializar e permitir a transição entre abas", () => {
    const onTabChange = vi.fn();
    const topBar = new TopBarView({ root, onTabChange });
    topBar.init();

    const tabCompensacao = root.querySelector('.app-tab[data-tab="tab-compensacao"]');
    tabCompensacao.click();

    expect(topBar.currentTab).toBe("tab-compensacao");
    expect(onTabChange).toHaveBeenCalledWith("tab-compensacao", "tab-cronograma");

    const pageComp = root.querySelector("#tab-compensacao");
    expect(pageComp.classList.contains("page-active")).toBe(true);

    const tabCronograma = root.querySelector('.app-tab[data-tab="tab-cronograma"]');
    expect(tabCronograma.classList.contains("active")).toBe(false);
    expect(tabCompensacao.classList.contains("active")).toBe(true);
  });

  it("deve preencher a lista de modelos salvos e refletir seleção", () => {
    const onSelectModel = vi.fn();
    const topBar = new TopBarView({ root, onSelectModel });
    topBar.init();

    topBar.populatePresets({ "TURMA-A": {}, "TURMA-B": {} }, "TURMA-B");

    const select = root.querySelector("#presetSelect");
    expect(select.options.length).toBe(2);
    expect(select.value).toBe("SAVED_TURMA-B");
    expect(topBar.getSelectedModel()).toBe("SAVED_TURMA-B");

    // Mudança de modelo dispara callback
    select.value = "SAVED_TURMA-A";
    select.dispatchEvent(new Event("change"));
    expect(onSelectModel).toHaveBeenCalledWith("SAVED_TURMA-A");
  });

  it("deve exibir mensagem apropriada quando não houver modelos", () => {
    const topBar = new TopBarView({ root });
    topBar.init();

    topBar.populatePresets({});
    const select = root.querySelector("#presetSelect");
    expect(select.options.length).toBe(1);
    expect(select.options[0].textContent).toContain("Nenhum modelo salvo");
  });

  it("deve acionar callbacks de salvar e deletar modelo", () => {
    const onSaveModel = vi.fn();
    const onDeleteModel = vi.fn();
    const topBar = new TopBarView({ root, onSaveModel, onDeleteModel });
    topBar.init();
    topBar.populatePresets({ "TURMA-X": {} });

    root.querySelector("#btn-salvar-modelo").click();
    expect(onSaveModel).toHaveBeenCalled();

    root.querySelector("#btn-deletar-modelo").click();
    expect(onDeleteModel).toHaveBeenCalledWith("SAVED_TURMA-X");
  });

  it("deve acionar exportação para PDF e controlar estado de carregamento", async () => {
    let exportCalled = false;
    const onExportPdf = vi.fn(async () => {
      exportCalled = true;
    });

    const topBar = new TopBarView({ root, onExportPdf });
    topBar.init();

    const btnPdf = root.querySelector("#btn-export-pdf");
    btnPdf.click();

    expect(onExportPdf).toHaveBeenCalled();
    // Após a finalização assíncrona, deve voltar ao estado habilitado
    await Promise.resolve();
    expect(btnPdf.disabled).toBe(false);
    expect(btnPdf.textContent).toContain("Baixar PDF");
  });

  it("deve alternar a visibilidade do popup de versão ao clicar no pill", () => {
    const topBar = new TopBarView({ root });
    topBar.init();

    const pill = root.querySelector(".stitch-version-pill");
    const popup = root.querySelector("#version-popup");

    expect(popup.style.display).toBe("none");
    pill.click();
    expect(popup.style.display).toBe("block");
    pill.click();
    expect(popup.style.display).toBe("none");
  });
});

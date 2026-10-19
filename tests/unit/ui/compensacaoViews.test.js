// Created at: 2026-10-19 13:40
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DiscenteTableView } from "../../../src/ui/compensacao/DiscenteTableView.js";
import { CompensacaoModalView } from "../../../src/ui/compensacao/CompensacaoModalView.js";

describe("DiscenteTableView (UI Compensação)", () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="compensacao-root">
        <button id="comp-nav-tab-compensacao" class="is-active"></button>
        <button id="comp-nav-tab-fisico"></button>
        <input id="comp-aluno-input" />
        <button id="comp-btn-add-alunos"></button>
        <div id="comp-diary-body"></div>
      </div>
    `;
    root = document.getElementById("compensacao-root");
  });

  it("deve renderizar estado vazio quando não houver alunos", () => {
    const view = new DiscenteTableView({ root });
    view.init();
    view.render({ alunos: [] });

    expect(root.querySelector(".comp-empty-state")).not.toBeNull();
    expect(root.querySelector(".comp-empty-state").textContent).toContain("Nenhum aluno cadastrado");
  });

  it("deve renderizar tabela de discentes com presenças, faltas e percentuais de frequência", () => {
    const onToggleFalta = vi.fn();
    const onToggleFlag = vi.fn();
    const onOpenReposicao = vi.fn();
    const onRemoveAluno = vi.fn();

    const view = new DiscenteTableView({
      root,
      onToggleFalta,
      onToggleFlag,
      onOpenReposicao,
      onRemoveAluno
    });
    view.init();

    const state = {
      alunos: ["Aluno Beta", "Aluno Alpha"],
      diasLetivos: ["2026-04-14", "2026-04-15"],
      chTotal: 40,
      faltasPorAluno: {
        "Aluno Alpha": { "2026-04-14": 4 }
      },
      manualFlagAlunos: {}
    };

    view.render(state);

    const table = root.querySelector("#attendance-grid-table");
    expect(table).not.toBeNull();

    // Na subvisão 'compensacao', deve ordenar alfabeticamente: Alpha primeiro, depois Beta
    const rows = table.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
    expect(rows[0].dataset.aluno).toBe("Aluno Alpha");
    expect(rows[1].dataset.aluno).toBe("Aluno Beta");

    // Aluno Alpha teve 4h de falta em 40h -> 90% frequência
    expect(rows[0].textContent).toContain("4h");
    expect(rows[0].textContent).toContain("90%");

    // Aluno Beta teve 0h de falta em 40h -> 100% frequência
    expect(rows[1].textContent).toContain("0h");
    expect(rows[1].textContent).toContain("100%");

    // Clicar no botão de presença de Alpha dispara toggle
    const presenceBtn = rows[0].querySelector('.comp-cell-presence[data-dia="2026-04-14"]');
    presenceBtn.click();
    expect(onToggleFalta).toHaveBeenCalledWith("Aluno Alpha", "2026-04-14");

    // Clicar no botão de flag dispara onToggleFlag
    const flagBtn = rows[0].querySelector(".comp-flag-btn");
    flagBtn.click();
    expect(onToggleFlag).toHaveBeenCalledWith("Aluno Alpha");

    // Clicar no botão de reposição dispara onOpenReposicao
    const repoBtn = rows[0].querySelector(".comp-action-reposicao-btn");
    repoBtn.click();
    expect(onOpenReposicao).toHaveBeenCalledWith("Aluno Alpha");

    // Clicar no botão de remoção dispara onRemoveAluno
    const removeBtn = rows[0].querySelector(".comp-action-remove-btn");
    removeBtn.click();
    expect(onRemoveAluno).toHaveBeenCalledWith("Aluno Alpha");
  });

  it("deve permitir adicionar múltiplos alunos via input com vírgula ou quebra de linha", () => {
    const onAddAlunos = vi.fn();
    const view = new DiscenteTableView({ root, onAddAlunos });
    view.init();

    const input = root.querySelector("#comp-aluno-input");
    const btnAdd = root.querySelector("#comp-btn-add-alunos");

    input.value = "Carlos Silva, Daniel Santos, Eduardo Costa";
    btnAdd.click();

    expect(onAddAlunos).toHaveBeenCalledWith(["Carlos Silva", "Daniel Santos", "Eduardo Costa"]);
    expect(input.value).toBe("");
  });

  it("deve alternar para subvisão de Diário Físico e manter ordem manual", () => {
    const onSubViewChange = vi.fn();
    const view = new DiscenteTableView({ root, onSubViewChange });
    view.init();

    view.setSubView("fisico");
    expect(view.subView).toBe("fisico");
    expect(onSubViewChange).toHaveBeenCalledWith("fisico");
    expect(root.querySelector("#comp-nav-tab-fisico").classList.contains("is-active")).toBe(true);
    expect(root.querySelector("#comp-nav-tab-compensacao").classList.contains("is-active")).toBe(false);
  });

  it("deve restaurar largura padrão de 200px no duplo clique do redimensionador", () => {
    const onWidthChange = vi.fn();
    const view = new DiscenteTableView({ root, onWidthChange });
    view.init();
    view.render({ alunos: ["Aluno 1"], diasLetivos: ["2026-04-14"] });

    const resizer = root.querySelector("#comp-col-resizer-aluno");
    resizer.dispatchEvent(new MouseEvent("dblclick"));

    expect(view.colWidth).toBe(200);
    expect(onWidthChange).toHaveBeenCalledWith(200);
  });
});

describe("CompensacaoModalView (UI Compensação)", () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="modal-comp-root">
        <div id="comp-modal-reposicao-edit" style="display: none;">
          <h3 id="reposicao-modal-title"></h3>
          <span id="reposicao-modal-subtitle"></span>
          <span id="comp-modal-coord-aluno-nome"></span>
          <button id="comp-modal-tab-btn-reposicao" class="is-active"></button>
          <button id="comp-modal-tab-btn-coordenacao"></button>
          <div id="comp-modal-tab-content-reposicao">
            <table><tbody id="comp-modal-reposicao-tbody"></tbody></table>
            <button id="comp-modal-reposicao-btn-add-row"></button>
            <button id="comp-modal-reposicao-btn-limpar"></button>
            <span id="comp-modal-reposicao-total-previsto"></span>
            <span id="comp-modal-reposicao-total-faltas"></span>
            <span id="comp-modal-reposicao-total-realizado"></span>
          </div>
          <div id="comp-modal-tab-content-coordenacao" hidden>
            <button id="comp-modal-coord-btn-tristate" class="state-none"></button>
            <span id="comp-modal-coord-tristate-text"></span>
            <textarea id="comp-modal-coord-obs-textarea"></textarea>
            <span id="comp-modal-coord-char-counter"></span>
            <div id="comp-modal-coord-obs-alerta-overflow" style="display: none;"></div>
            <span id="comp-modal-preview-line-1"></span>
            <span id="comp-modal-preview-line-2"></span>
          </div>
          <button id="comp-modal-reposicao-btn-print"></button>
          <button id="comp-modal-reposicao-btn-print-blank"></button>
          <button id="comp-modal-reposicao-close"></button>
          <button id="comp-modal-reposicao-btn-cancel"></button>
        </div>
      </div>
    `;
    root = document.getElementById("modal-comp-root");
  });

  it("deve abrir com os dados do aluno e permitir alternância de abas", () => {
    const modalView = new CompensacaoModalView({ root });
    modalView.init();

    modalView.open("Marcos Vinicius");

    const modalEl = root.querySelector("#comp-modal-reposicao-edit");
    expect(modalEl.style.display).toBe("flex");
    expect(root.querySelector("#reposicao-modal-subtitle").textContent).toContain("Marcos Vinicius");
    expect(root.querySelector("#comp-modal-coord-aluno-nome").textContent).toBe("Marcos Vinicius");

    // Alternar para aba Coordenação
    modalView.switchTab("coordenacao");
    expect(root.querySelector("#comp-modal-tab-content-reposicao").hidden).toBe(true);
    expect(root.querySelector("#comp-modal-tab-content-coordenacao").hidden).toBe(false);
  });

  it("deve adicionar linhas na tabela de reposição e recalcular totais de horas", () => {
    const modalView = new CompensacaoModalView({ root });
    modalView.init();
    modalView.open("Aluno Teste");

    modalView.clearRows();
    modalView.addRow({ dataPrevista: "15/04", chPrevista: "4", chFalta: "4", chRealizada: "4" });
    modalView.addRow({ dataPrevista: "16/04", chPrevista: "4", chFalta: "4", chRealizada: "2" });

    const rows = root.querySelectorAll("#comp-modal-reposicao-tbody tr");
    expect(rows.length).toBe(2);

    expect(root.querySelector("#comp-modal-reposicao-total-previsto").textContent).toBe("8h00");
    expect(root.querySelector("#comp-modal-reposicao-total-faltas").textContent).toBe("8h00");
    expect(root.querySelector("#comp-modal-reposicao-total-realizado").textContent).toBe("6h00");
  });

  it("deve ciclar botão tri-state de deferimento da coordenação", () => {
    const modalView = new CompensacaoModalView({ root });
    modalView.init();
    modalView.open("Aluno Teste");

    expect(modalView.triState).toBe("none");

    modalView.cycleTriState();
    expect(modalView.triState).toBe("sim");
    expect(root.querySelector("#comp-modal-coord-tristate-text").textContent).toContain("Sim [X]");

    modalView.cycleTriState();
    expect(modalView.triState).toBe("nao");
    expect(root.querySelector("#comp-modal-coord-tristate-text").textContent).toContain("Não [X]");

    modalView.cycleTriState();
    expect(modalView.triState).toBe("none");
  });

  it("deve atualizar contador de caracteres e alertar overflow acima de 805 caracteres", () => {
    const modalView = new CompensacaoModalView({ root });
    modalView.init();
    modalView.open("Aluno Teste");

    modalView.updateCoordObs("Parecer favorável de reposição.");
    expect(root.querySelector("#comp-modal-coord-char-counter").textContent).toContain("31 / 805");
    expect(root.querySelector("#comp-modal-coord-obs-alerta-overflow").style.display).toBe("none");

    // Texto longo excedendo 805 caracteres
    const longText = "A".repeat(810);
    modalView.updateCoordObs(longText);
    expect(root.querySelector("#comp-modal-coord-obs-alerta-overflow").style.display).toBe("block");
  });

  it("deve acionar callbacks de impressão oficial e impressão em branco", () => {
    const onPrintOficial = vi.fn();
    const onPrintBlank = vi.fn();

    const modalView = new CompensacaoModalView({
      root,
      onPrintOficial,
      onPrintBlank
    });
    modalView.init();
    modalView.open("Aluno Exemplo");

    root.querySelector("#comp-modal-reposicao-btn-print").click();
    expect(onPrintOficial).toHaveBeenCalledWith("Aluno Exemplo", expect.objectContaining({
      aluno: "Aluno Exemplo"
    }));

    root.querySelector("#comp-modal-reposicao-btn-print-blank").click();
    expect(onPrintBlank).toHaveBeenCalled();
  });
});

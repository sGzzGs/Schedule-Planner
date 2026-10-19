// Created at: 2026-10-19 13:35
/**
 * @fileoverview Visualizador e gerenciador da tabela de discentes e chamada da Aba Compensação.
 * Renderiza grade de presença/falta, resizer de coluna, alertas de 25% e ações por aluno.
 */

import { calculateAttendance, evaluateAbsenceAlert } from "../../core/compensation/compensationRules.js";

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class DiscenteTableView {
  /**
   * @param {Object} [options]
   * @param {HTMLElement} [options.root=document]
   * @param {(aluno: string, dataKey: string) => void} [options.onToggleFalta]
   * @param {(nomes: string[]) => void} [options.onAddAlunos]
   * @param {(aluno: string) => void} [options.onRemoveAluno]
   * @param {(aluno: string) => void} [options.onOpenReposicao]
   * @param {(aluno: string) => void} [options.onToggleFlag]
   * @param {(width: number) => void} [options.onWidthChange]
   * @param {(subView: 'compensacao'|'fisico') => void} [options.onSubViewChange]
   */
  constructor(options = {}) {
    this.root = options.root || (typeof document !== "undefined" ? document : null);
    this.onToggleFalta = options.onToggleFalta || (() => {});
    this.onAddAlunos = options.onAddAlunos || (() => {});
    this.onRemoveAluno = options.onRemoveAluno || (() => {});
    this.onOpenReposicao = options.onOpenReposicao || (() => {});
    this.onToggleFlag = options.onToggleFlag || (() => {});
    this.onWidthChange = options.onWidthChange || (() => {});
    this.onSubViewChange = options.onSubViewChange || (() => {});

    this.subView = "compensacao";
    this.colWidth = 200;

    this._bindElements();
  }

  _bindElements() {
    if (!this.root) return;

    this.container = this.root.querySelector("#comp-diary-body");
    this.btnNavComp = this.root.querySelector("#comp-nav-tab-compensacao");
    this.btnNavFis = this.root.querySelector("#comp-nav-tab-fisico");
    this.inputAluno = this.root.querySelector("#comp-aluno-input");
    this.btnAddAluno = this.root.querySelector("#comp-btn-add-alunos");
  }

  /**
   * Inicializa ouvintes da barra de ferramentas e discentes.
   */
  init() {
    this._bindElements();
    this._initToolbar();
  }

  _initToolbar() {
    if (this.btnNavComp) {
      this.btnNavComp.addEventListener("click", () => {
        this.setSubView("compensacao");
      });
    }

    if (this.btnNavFis) {
      this.btnNavFis.addEventListener("click", () => {
        this.setSubView("fisico");
      });
    }

    if (this.btnAddAluno && this.inputAluno) {
      const handleAdd = () => {
        const val = this.inputAluno.value.trim();
        if (!val) return;
        const nomes = val
          .split(/[\n,;]+/)
          .map((n) => n.trim())
          .filter(Boolean);
        if (nomes.length > 0) {
          this.onAddAlunos(nomes);
          this.inputAluno.value = "";
        }
      };

      this.btnAddAluno.addEventListener("click", handleAdd);
      this.inputAluno.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleAdd();
      });
    }
  }

  /**
   * Alterna a sub-visão (Compensação alfabética vs Diário Físico manual).
   * @param {'compensacao'|'fisico'} mode
   */
  setSubView(mode) {
    this.subView = mode;
    if (this.btnNavComp) {
      this.btnNavComp.classList.toggle("is-active", mode === "compensacao");
    }
    if (this.btnNavFis) {
      this.btnNavFis.classList.toggle("is-active", mode === "fisico");
    }
    this.onSubViewChange(mode);
  }

  /**
   * Renderiza a tabela de chamada e discentes.
   * @param {Object} state - Estado com alunos, diasLetivos, faltasPorAluno, chTotal, etc.
   */
  render(state = {}) {
    this._bindElements();
    if (!this.container) return;

    const alunos = Array.isArray(state.alunos) ? state.alunos : [];
    const dias = Array.isArray(state.diasLetivos) ? state.diasLetivos : [];
    const chTotal = state.chTotal || 40;
    const faltasPorAluno = state.faltasPorAluno || {};
    const manualFlags = state.manualFlagAlunos || {};
    const colWidth = state.colAlunoWidth || this.colWidth;
    this.colWidth = colWidth;

    if (alunos.length === 0) {
      this.container.innerHTML = `
        <div class="comp-empty-state" style="padding: 32px; text-align: center; color: #8D7B6F;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 12px;">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          <p>Nenhum aluno cadastrado nesta turma.</p>
        </div>
      `;
      return;
    }

    // Ordenação conforme a subvisão
    const alunosLista = this.subView === "fisico"
      ? (state.ordemFisicaAlunos && state.ordemFisicaAlunos.length ? state.ordemFisicaAlunos : [...alunos])
      : [...alunos].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

    let headersHtml = `
      <th class="col-aluno" id="comp-th-col-aluno" style="width: ${colWidth}px; min-width: 120px;">
        <div class="comp-th-aluno-content"><span>Discente</span></div>
        <div class="comp-col-resizer" id="comp-col-resizer-aluno" title="Arraste para redimensionar (Duplo clique para 200px)"></div>
      </th>
    `;

    dias.forEach((d) => {
      const parts = d.split("-");
      const diaMes = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
      headersHtml += `
        <th class="col-date" data-dia="${d}" title="Data: ${d}" style="text-align: center; min-width: 38px;">
          <div>${diaMes}</div>
        </th>
      `;
    });

    headersHtml += `
      <th class="col-summary" style="text-align: center; min-width: 60px;">Faltas</th>
      <th class="col-summary" style="text-align: center; min-width: 60px;">Freq.</th>
      <th class="col-summary" style="text-align: center; min-width: 90px;">Ações</th>
    `;

    let rowsHtml = "";
    alunosLista.forEach((aluno) => {
      const alunoFaltas = faltasPorAluno[aluno] || {};
      let totalFaltasHoras = 0;

      let cellsHtml = "";
      dias.forEach((d) => {
        const val = Number(alunoFaltas[d]) || 0;
        const isFalta = val > 0;
        if (isFalta) totalFaltasHoras += val;

        const cellSymbol = isFalta ? "|" : ".";
        const cellClass = isFalta ? "is-absent" : "is-present";

        cellsHtml += `
          <td style="text-align: center; padding: 2px;" data-dia="${d}">
            <button type="button" class="comp-cell-presence ${cellClass}" data-aluno="${escapeHtml(aluno)}" data-dia="${d}">
              ${cellSymbol}
            </button>
          </td>
        `;
      });

      const att = calculateAttendance(chTotal, totalFaltasHoras);
      const alertStatus = evaluateAbsenceAlert({
        absencePercent: att.absencePercent,
        absencesHours: totalFaltasHoras,
        manualState: manualFlags[aluno] !== undefined ? manualFlags[aluno] : null
      });

      let flagColor = "#10B981"; // ok (verde)
      let flagIcon = "fa-circle-check";
      if (alertStatus.type === "danger") {
        flagColor = "#EF4444"; // perigo (vermelho)
        flagIcon = "fa-triangle-exclamation";
      } else if (alertStatus.type === "warning") {
        flagColor = "#F59E0B"; // aviso (amarelo)
        flagIcon = "fa-triangle-exclamation";
      }

      rowsHtml += `
        <tr data-aluno="${escapeHtml(aluno)}">
          <td class="col-aluno-cell" style="width: ${colWidth}px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              <span class="student-name-text" title="${escapeHtml(aluno)}">${escapeHtml(aluno)}</span>
              <button type="button" class="comp-flag-btn" data-aluno="${escapeHtml(aluno)}" title="Alerta de compensação" style="border: none; background: transparent; color: ${flagColor}; cursor: pointer;">
                <i class="fa-solid ${flagIcon}"></i>
              </button>
            </div>
          </td>
          ${cellsHtml}
          <td style="text-align: center; font-weight: 700; font-size: 11px;">${totalFaltasHoras}h</td>
          <td style="text-align: center; font-weight: 700; font-size: 11px;">${att.attendancePercent !== undefined ? att.attendancePercent : att.frequenciaPct}%</td>
          <td style="text-align: center;">
            <div style="display: flex; justify-content: center; gap: 4px;">
              <button type="button" class="comp-action-reposicao-btn" data-aluno="${escapeHtml(aluno)}" title="Termo de Reposição" style="border: none; background: transparent; cursor: pointer; color: #0284C7;">
                <i class="fa-solid fa-file-signature"></i>
              </button>
              <button type="button" class="comp-action-remove-btn" data-aluno="${escapeHtml(aluno)}" title="Remover Aluno" style="border: none; background: transparent; cursor: pointer; color: #9CA3AF;">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    this.container.innerHTML = `
      <section class="stitch-attendance-datagrid">
        <div class="stitch-table-scroll">
          <table class="stitch-table" id="attendance-grid-table">
            <thead><tr>${headersHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </section>
    `;

    this._attachTableEvents();
  }

  _attachTableEvents() {
    if (!this.container) return;

    // 1. Alternância de Presença/Falta
    const presenceBtns = this.container.querySelectorAll(".comp-cell-presence");
    presenceBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const aluno = btn.dataset.aluno;
        const dia = btn.dataset.dia;
        if (aluno && dia) this.onToggleFalta(aluno, dia);
      });
    });

    // 2. Alerta / Flag
    const flagBtns = this.container.querySelectorAll(".comp-flag-btn");
    flagBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const aluno = btn.dataset.aluno;
        if (aluno) this.onToggleFlag(aluno);
      });
    });

    // 3. Abrir Reposição
    const repoBtns = this.container.querySelectorAll(".comp-action-reposicao-btn");
    repoBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const aluno = btn.dataset.aluno;
        if (aluno) this.onOpenReposicao(aluno);
      });
    });

    // 4. Remover Aluno
    const removeBtns = this.container.querySelectorAll(".comp-action-remove-btn");
    removeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const aluno = btn.dataset.aluno;
        if (aluno) this.onRemoveAluno(aluno);
      });
    });

    // 5. Redimensionador de coluna
    const resizer = this.container.querySelector("#comp-col-resizer-aluno");
    if (resizer) {
      resizer.addEventListener("dblclick", () => {
        this.colWidth = 200;
        this.onWidthChange(200);
      });

      let startX = 0;
      let startW = 0;

      const onMouseMove = (e) => {
        const delta = e.clientX - startX;
        const newW = Math.max(120, Math.min(450, startW + delta));
        this.colWidth = newW;
        const th = this.container.querySelector("#comp-th-col-aluno");
        if (th) th.style.width = `${newW}px`;
        const cells = this.container.querySelectorAll(".col-aluno-cell");
        cells.forEach((c) => (c.style.width = `${newW}px`));
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        this.onWidthChange(this.colWidth);
      };

      resizer.addEventListener("mousedown", (e) => {
        e.preventDefault();
        startX = e.clientX;
        startW = this.colWidth;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    }
  }
}

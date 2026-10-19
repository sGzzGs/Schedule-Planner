// Created at: 2026-10-19 13:38
/**
 * @fileoverview Gerenciador do Modal de Reposição e Ficha Oficial de Compensação de Ausências.
 * Suporta quadro dinâmico de reposição, parecer da coordenação (6 linhas) e impressão oficial.
 */

import { Modal } from "../common/Modal.js";

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class CompensacaoModalView {
  /**
   * @param {Object} [options]
   * @param {HTMLElement} [options.root=document]
   * @param {(aluno: string, payload: Object) => void} [options.onPrintOficial]
   * @param {() => void} [options.onPrintBlank]
   * @param {(aluno: string, payload: Object) => void} [options.onSave]
   * @param {() => void} [options.onClose]
   */
  constructor(options = {}) {
    this.root = options.root || (typeof document !== "undefined" ? document : null);
    this.onPrintOficial = options.onPrintOficial || (() => {});
    this.onPrintBlank = options.onPrintBlank || (() => {});
    this.onSave = options.onSave || (() => {});
    this.onClose = options.onClose || (() => {});

    this.currentAluno = null;
    this.currentTab = "reposicao";
    this.triState = "none"; // 'none' | 'sim' | 'nao'

    this._bindElements();
  }

  _bindElements() {
    if (!this.root) return;

    this.modalEl = this.root.querySelector("#comp-modal-reposicao-edit");
    this.subtitleEl = this.root.querySelector("#reposicao-modal-subtitle");
    this.coordAlunoName = this.root.querySelector("#comp-modal-coord-aluno-nome");

    this.tabBtnReposicao = this.root.querySelector("#comp-modal-tab-btn-reposicao");
    this.tabBtnCoord = this.root.querySelector("#comp-modal-tab-btn-coordenacao");
    this.tabContentReposicao = this.root.querySelector("#comp-modal-tab-content-reposicao");
    this.tabContentCoord = this.root.querySelector("#comp-modal-tab-content-coordenacao");

    this.tbodyReposicao = this.root.querySelector("#comp-modal-reposicao-tbody");
    this.btnAddRow = this.root.querySelector("#comp-modal-reposicao-btn-add-row");
    this.btnCarregarFaltas = this.root.querySelector("#comp-modal-reposicao-btn-carregar-faltas");
    this.btnLimpar = this.root.querySelector("#comp-modal-reposicao-btn-limpar");

    this.lblTotalPrevisto = this.root.querySelector("#comp-modal-reposicao-total-previsto");
    this.lblTotalFaltas = this.root.querySelector("#comp-modal-reposicao-total-faltas");
    this.lblTotalRealizado = this.root.querySelector("#comp-modal-reposicao-total-realizado");

    this.btnTriState = this.root.querySelector("#comp-modal-coord-btn-tristate");
    this.txtTriState = this.root.querySelector("#comp-modal-coord-tristate-text");
    this.textareaCoordObs = this.root.querySelector("#comp-modal-coord-obs-textarea");
    this.lblCharCounter = this.root.querySelector("#comp-modal-coord-char-counter");
    this.alertOverflow = this.root.querySelector("#comp-modal-coord-obs-alerta-overflow");

    this.btnPrintOficial = this.root.querySelector("#comp-modal-reposicao-btn-print");
    this.btnPrintBlank = this.root.querySelector("#comp-modal-reposicao-btn-print-blank");
    this.btnClose = this.root.querySelector("#comp-modal-reposicao-close");
    this.btnCancel = this.root.querySelector("#comp-modal-reposicao-btn-cancel");
  }

  /**
   * Inicializa os ouvintes do modal de compensação.
   */
  init() {
    this._bindElements();
    if (!this.modalEl) return;

    if (this.tabBtnReposicao) {
      this.tabBtnReposicao.addEventListener("click", () => this.switchTab("reposicao"));
    }
    if (this.tabBtnCoord) {
      this.tabBtnCoord.addEventListener("click", () => this.switchTab("coordenacao"));
    }

    if (this.btnAddRow) {
      this.btnAddRow.addEventListener("click", () => this.addRow());
    }
    if (this.btnLimpar) {
      this.btnLimpar.addEventListener("click", () => this.clearRows());
    }

    if (this.btnTriState) {
      this.btnTriState.addEventListener("click", () => this.cycleTriState());
    }

    if (this.textareaCoordObs) {
      this.textareaCoordObs.addEventListener("input", () => {
        this.updateCoordObs(this.textareaCoordObs.value);
      });
    }

    if (this.btnPrintOficial) {
      this.btnPrintOficial.addEventListener("click", () => {
        const payload = this.getFormData();
        this.onPrintOficial(this.currentAluno, payload);
      });
    }

    if (this.btnPrintBlank) {
      this.btnPrintBlank.addEventListener("click", () => {
        this.onPrintBlank();
      });
    }

    const closeHandler = () => this.close();
    if (this.btnClose) this.btnClose.addEventListener("click", closeHandler);
    if (this.btnCancel) this.btnCancel.addEventListener("click", closeHandler);
  }

  /**
   * Alterna entre a aba do Quadro de Reposição e o Parecer da Coordenação.
   * @param {'reposicao'|'coordenacao'} tab
   */
  switchTab(tab) {
    this.currentTab = tab;
    if (this.tabBtnReposicao) this.tabBtnReposicao.classList.toggle("is-active", tab === "reposicao");
    if (this.tabBtnCoord) this.tabBtnCoord.classList.toggle("is-active", tab === "coordenacao");
    if (this.tabContentReposicao) this.tabContentReposicao.hidden = tab !== "reposicao";
    if (this.tabContentCoord) this.tabContentCoord.hidden = tab !== "coordenacao";
  }

  /**
   * Abre o modal com os dados do aluno especificado.
   * @param {string} aluno
   * @param {Object} [options]
   */
  open(aluno, options = {}) {
    if (!this.modalEl || !aluno) return;

    this.currentAluno = aluno;
    if (this.subtitleEl) {
      this.subtitleEl.textContent = `Discente: ${aluno} • Por padrão os campos saem vazios para impressão`;
    }
    if (this.coordAlunoName) {
      this.coordAlunoName.textContent = aluno;
    }

    this.switchTab("reposicao");
    this.clearRows();

    // Se fornecidas linhas iniciais ou faltas
    if (Array.isArray(options.linhasReposicao) && options.linhasReposicao.length > 0) {
      options.linhasReposicao.forEach((l) => this.addRow(l));
    } else {
      // Adicionar linha vazia inicial por padrão
      this.addRow();
    }

    this.setTriState(options.deferimento || "none");
    if (this.textareaCoordObs) {
      this.textareaCoordObs.value = options.observacaoCoord || "";
      this.updateCoordObs(options.observacaoCoord || "");
    }

    Modal.open(this.modalEl, {
      onClose: () => this.onClose()
    });
  }

  /**
   * Adiciona uma linha na grade de reposição.
   * @param {Object} [data]
   */
  addRow(data = {}) {
    if (!this.tbodyReposicao) return;

    const tr = document.createElement("tr");
    const rowIdx = this.tbodyReposicao.children.length + 1;

    tr.innerHTML = `
      <td style="text-align: center;">${rowIdx}</td>
      <td><input type="text" class="input-prevista" value="${escapeHtml(data.dataPrevista || "")}" style="width: 100%;" placeholder="dd/mm" /></td>
      <td><input type="number" class="input-ch-prevista" value="${escapeHtml(data.chPrevista || "")}" style="width: 100%; text-align: center;" placeholder="h" /></td>
      <td><input type="text" class="input-falta" value="${escapeHtml(data.dataFalta || "")}" style="width: 100%;" placeholder="dd/mm" /></td>
      <td><input type="number" class="input-ch-falta" value="${escapeHtml(data.chFalta || "")}" style="width: 100%; text-align: center;" placeholder="h" /></td>
      <td><input type="text" class="input-realizada" value="${escapeHtml(data.dataRealizada || "")}" style="width: 100%;" placeholder="dd/mm" /></td>
      <td><input type="number" class="input-ch-realizada" value="${escapeHtml(data.chRealizada || "")}" style="width: 100%; text-align: center;" placeholder="h" /></td>
      <td><input type="text" class="input-conteudo" value="${escapeHtml(data.conteudo || "")}" style="width: 100%;" placeholder="Conteúdo reposto..." /></td>
      <td style="text-align: center;">
        <button type="button" class="btn-remove-row" style="border: none; background: transparent; color: #dc322f; cursor: pointer;">&times;</button>
      </td>
    `;

    tr.querySelector(".btn-remove-row")?.addEventListener("click", () => {
      tr.remove();
      this.recalculateTotals();
    });

    const inputsCH = tr.querySelectorAll("input[type='number']");
    inputsCH.forEach((inp) => {
      inp.addEventListener("input", () => this.recalculateTotals());
    });

    this.tbodyReposicao.appendChild(tr);
    this.recalculateTotals();
  }

  clearRows() {
    if (this.tbodyReposicao) {
      this.tbodyReposicao.innerHTML = "";
      this.recalculateTotals();
    }
  }

  recalculateTotals() {
    if (!this.tbodyReposicao) return;

    let totPrev = 0;
    let totFalt = 0;
    let totReal = 0;

    const rows = this.tbodyReposicao.querySelectorAll("tr");
    rows.forEach((tr) => {
      const chP = Number(tr.querySelector(".input-ch-prevista")?.value) || 0;
      const chF = Number(tr.querySelector(".input-ch-falta")?.value) || 0;
      const chR = Number(tr.querySelector(".input-ch-realizada")?.value) || 0;
      totPrev += chP;
      totFalt += chF;
      totReal += chR;
    });

    if (this.lblTotalPrevisto) this.lblTotalPrevisto.textContent = `${totPrev}h00`;
    if (this.lblTotalFaltas) this.lblTotalFaltas.textContent = `${totFalt}h00`;
    if (this.lblTotalRealizado) this.lblTotalRealizado.textContent = `${totReal}h00`;
  }

  cycleTriState() {
    const states = ["none", "sim", "nao"];
    const nextIdx = (states.indexOf(this.triState) + 1) % states.length;
    this.setTriState(states[nextIdx]);
  }

  setTriState(state) {
    this.triState = state;
    if (!this.btnTriState) return;

    this.btnTriState.className = `comp-coord-tristate-button state-${state}`;
    if (this.txtTriState) {
      if (state === "sim") this.txtTriState.textContent = "Deferido (Sim [X] • Não [ ])";
      else if (state === "nao") this.txtTriState.textContent = "Indeferido (Sim [ ] • Não [X])";
      else this.txtTriState.textContent = "Não Definido (Ambos Desmarcados)";
    }
  }

  updateCoordObs(text = "") {
    const chars = text.length;
    if (this.lblCharCounter) {
      this.lblCharCounter.textContent = `${chars} / 805 caracteres`;
    }
    const isOverflow = chars > 805;
    if (this.alertOverflow) {
      this.alertOverflow.style.display = isOverflow ? "block" : "none";
    }

    // Dividir em até 6 linhas de ~135 caracteres
    const maxCharsPerLine = 135;
    for (let i = 1; i <= 6; i++) {
      const lineEl = this.root.querySelector(`#comp-modal-preview-line-${i}`);
      if (lineEl) {
        const start = (i - 1) * maxCharsPerLine;
        const slice = text.slice(start, start + maxCharsPerLine).trim();
        lineEl.textContent = slice || `(Linha ${i} vazia)`;
        lineEl.style.color = slice ? "inherit" : "var(--text-secondary)";
      }
    }
  }

  getFormData() {
    const linhas = [];
    if (this.tbodyReposicao) {
      const rows = this.tbodyReposicao.querySelectorAll("tr");
      rows.forEach((tr) => {
        linhas.push({
          dataPrevista: tr.querySelector(".input-prevista")?.value || "",
          chPrevista: tr.querySelector(".input-ch-prevista")?.value || "",
          dataFalta: tr.querySelector(".input-falta")?.value || "",
          chFalta: tr.querySelector(".input-ch-falta")?.value || "",
          dataRealizada: tr.querySelector(".input-realizada")?.value || "",
          chRealizada: tr.querySelector(".input-ch-realizada")?.value || "",
          conteudo: tr.querySelector(".input-conteudo")?.value || ""
        });
      });
    }

    return {
      aluno: this.currentAluno,
      deferimento: this.triState,
      observacaoCoord: this.textareaCoordObs?.value || "",
      linhas
    };
  }

  close() {
    if (this.modalEl) {
      Modal.close(this.modalEl);
    }
    this.currentAluno = null;
    this.onClose();
  }
}

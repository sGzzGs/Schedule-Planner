// Created at: 2026-10-17 14:40
/**
 * @fileoverview Modal de opções individuais de cada dia/aula do Cronograma.
 * Permite ajustar carga horária, ambiente e divisão teoria/prática.
 */

import { Modal } from "../common/Modal.js";
import { timeToMinutes, minutesToHHMM } from "../../core/calendar/dateUtils.js";

export class DayOptionsModalView {
  /**
   * @param {Object} [options]
   * @param {HTMLElement} [options.root=document]
   * @param {(dateKey: string, customOptions: Object) => void} [options.onSave]
   * @param {(dateKey: string) => void} [options.onReset]
   * @param {() => void} [options.onClose]
   */
  constructor(options = {}) {
    this.root = options.root || (typeof document !== "undefined" ? document : null);
    this.onSave = options.onSave || (() => {});
    this.onReset = options.onReset || (() => {});
    this.onClose = options.onClose || (() => {});

    this.currentDateKey = null;
    this.currentAula = null;

    this._bindElements();
  }

  _bindElements() {
    if (!this.root) return;

    this.modalEl = this.root.querySelector("#day-options-modal");
    this.titleEl = this.root.querySelector("#modal-day-title");
    this.subtitleEl = this.root.querySelector("#modal-day-subtitle");

    this.inputAmbiente = this.root.querySelector("#modal-input-ambiente");
    this.inputHoras = this.root.querySelector("#modal-input-horas");
    this.groupSingleAmbiente = this.root.querySelector("#group-single-ambiente");

    this.toggleSplit = this.root.querySelector("#modal-toggle-split");
    this.splitContent = this.root.querySelector("#modal-split-content");

    this.inputTeoriaHoras = this.root.querySelector("#modal-split-teoria-horas");
    this.inputTeoriaAmb = this.root.querySelector("#modal-split-teoria-amb");
    this.inputPraticaHoras = this.root.querySelector("#modal-split-pratica-horas");
    this.inputPraticaAmb = this.root.querySelector("#modal-split-pratica-amb");

    this.btnSave = this.root.querySelector("#btn-save-day-options");
    this.btnReset = this.root.querySelector("#btn-reset-day-options");
    this.btnClose = this.root.querySelector("#btn-close-day-options");
  }

  /**
   * Inicializa ouvintes do modal.
   */
  init() {
    this._bindElements();
    if (!this.modalEl) return;

    if (this.toggleSplit) {
      this.toggleSplit.addEventListener("change", () => {
        this._updateSplitVisibility(this.toggleSplit.checked);
      });
    }

    if (this.btnSave) {
      this.btnSave.addEventListener("click", () => this.save());
    }

    if (this.btnReset) {
      this.btnReset.addEventListener("click", () => this.reset());
    }

    if (this.btnClose) {
      this.btnClose.addEventListener("click", () => this.close());
    }
  }

  _updateSplitVisibility(isSplit) {
    if (this.splitContent) {
      this.splitContent.style.display = isSplit ? "block" : "none";
    }
    if (this.groupSingleAmbiente) {
      this.groupSingleAmbiente.style.display = isSplit ? "none" : "block";
    }
  }

  /**
   * Abre o modal preenchendo com os dados da aula.
   * @param {Object} aula - Objeto da aula calculada
   * @param {Object} [custom={}] - Customizações pré-existentes
   * @param {Object} [formDataPadrao={}] - Metadados de fallback do formulário
   */
  open(aula, custom = {}, formDataPadrao = {}) {
    if (!this.modalEl || !aula) return;

    this.currentAula = aula;
    this.currentDateKey = aula.dataKey;

    const defaultAmbTeoria = formDataPadrao.ambienteTeoria || "S01";
    const defaultAmbPratica = formDataPadrao.ambientePratica || "L01";
    const defaultMinutosDia = timeToMinutes(formDataPadrao.horasPorDia) || 240;

    if (this.titleEl) {
      const dataStr = aula.diaStr ? `${aula.diaStr}/${String(aula.mesIdx + 1).padStart(2, "0")}/${aula.ano}` : aula.dataKey;
      const semNome = aula.diaSemanaNome || "";
      this.titleEl.textContent = `Configurar Aula - ${dataStr} ${semNome ? `(${semNome})` : ""}`.trim();
    }

    if (this.subtitleEl) {
      const statusText = aula.isInactive ? "Inativo" : `${aula.diaStr || ""} ${aula.mesNome || ""}`.trim();
      this.subtitleEl.textContent = `Aula: ${statusText} • Padrão da turma: ${formDataPadrao.horasPorDia || "04:00"}`;
    }

    // 1. Ambiente
    if (this.inputAmbiente) {
      this.inputAmbiente.value = custom.ambiente || aula.ambiente || (aula.tipo === "teoria" ? defaultAmbTeoria : defaultAmbPratica);
    }

    // 2. Horas
    if (this.inputHoras) {
      this.inputHoras.value = minutesToHHMM(aula.minutos || defaultMinutosDia);
    }

    // 3. Divisão Teoria e Prática
    const isSplit = !!custom.isSplit || !!aula.isSplit;
    if (this.toggleSplit) {
      this.toggleSplit.checked = isSplit;
    }
    this._updateSplitVisibility(isSplit);

    // Ordem
    const ordem = custom.ordem || aula.ordem || "teoria-pratica";
    const radios = this.root.querySelectorAll("input[name='splitOrder']");
    radios.forEach((r) => {
      r.checked = r.value === ordem;
    });

    // Campos Teoria
    const curTeoriaMin = custom.teoriaMinutos !== undefined
      ? custom.teoriaMinutos
      : aula.teoriaMinutos || Math.floor((aula.minutos || defaultMinutosDia) / 2);
    if (this.inputTeoriaHoras) this.inputTeoriaHoras.value = minutesToHHMM(curTeoriaMin);
    if (this.inputTeoriaAmb) this.inputTeoriaAmb.value = custom.teoriaAmbiente || aula.teoriaAmbiente || defaultAmbTeoria;

    // Campos Prática
    const curPraticaMin = custom.praticaMinutos !== undefined
      ? custom.praticaMinutos
      : aula.praticaMinutos || Math.ceil((aula.minutos || defaultMinutosDia) / 2);
    if (this.inputPraticaHoras) this.inputPraticaHoras.value = minutesToHHMM(curPraticaMin);
    if (this.inputPraticaAmb) this.inputPraticaAmb.value = custom.praticaAmbiente || aula.praticaAmbiente || defaultAmbPratica;

    Modal.open(this.modalEl, {
      onClose: () => this.onClose()
    });
  }

  /**
   * Salva as opções configuradas no modal e fecha.
   */
  save() {
    if (!this.currentDateKey) return;

    const isSplit = !!this.toggleSplit?.checked;
    const horasStr = this.inputHoras?.value || "04:00";
    const singleAmb = this.inputAmbiente?.value?.trim() || "";

    let customOptions = {};

    if (isSplit) {
      const ordemRadio = this.root.querySelector("input[name='splitOrder']:checked");
      const ordem = ordemRadio ? ordemRadio.value : "teoria-pratica";
      const tHorasStr = this.inputTeoriaHoras?.value || "02:00";
      const pHorasStr = this.inputPraticaHoras?.value || "02:00";
      const tAmb = this.inputTeoriaAmb?.value?.trim() || "S01";
      const pAmb = this.inputPraticaAmb?.value?.trim() || "L01";

      const tMin = timeToMinutes(tHorasStr);
      const pMin = timeToMinutes(pHorasStr);
      const totalMin = tMin + pMin;

      customOptions = {
        tipo: "misto",
        isSplit: true,
        ordem,
        minutos: totalMin,
        ambiente: ordem === "pratica-teoria" ? `${pAmb}/${tAmb}` : `${tAmb}/${pAmb}`,
        teoriaMinutos: tMin,
        teoriaAmbiente: tAmb,
        praticaMinutos: pMin,
        praticaAmbiente: pAmb
      };
    } else {
      const minutos = timeToMinutes(horasStr);
      const prevTipo = this.currentAula?.tipo === "teoria" ? "teoria" : "pratica";

      customOptions = {
        tipo: prevTipo,
        isSplit: false,
        minutos,
        ambiente: singleAmb
      };
    }

    const key = this.currentDateKey;
    this.close();
    this.onSave(key, customOptions);
  }

  /**
   * Restaura a aula para os valores padrão do formulário.
   */
  reset() {
    if (!this.currentDateKey) return;
    const key = this.currentDateKey;
    this.close();
    this.onReset(key);
  }

  /**
   * Fecha o modal.
   */
  close() {
    if (this.modalEl) {
      Modal.close(this.modalEl);
    }
    this.currentDateKey = null;
    this.currentAula = null;
    this.onClose();
  }
}

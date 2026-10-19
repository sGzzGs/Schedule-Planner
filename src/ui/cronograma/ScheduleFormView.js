// Created at: 2026-10-17 14:38
/**
 * @fileoverview Gerenciador do painel lateral de parâmetros e formulário do Cronograma.
 * Controla inputs, botões de dias da semana, horários rápidos e sincronização reativa.
 */

import { timeToMinutes, minutesToHHMM } from "../../core/calendar/dateUtils.js";

export const HORARIOS_PADRAO = [
  { label: "Manhã: 08:00 - 12:00 (04:00)", valor: "08:00|12:00|Manhã|04:00" },
  { label: "Tarde: 13:00 - 17:00 (04:00)", valor: "13:00|17:00|Tarde|04:00" },
  { label: "Noite: 18:00 - 22:00 (04:00)", valor: "18:00|22:00|Noite|04:00" },
  { label: "Noite: 18:20 - 22:00 (03:40)", valor: "18:20|22:00|Noite|03:40" },
  { label: "Sábado: 07:30 - 16:30 (08:00)", valor: "07:30|16:30|Sábado|08:00" }
];

export class ScheduleFormView {
  /**
   * @param {Object} [options]
   * @param {HTMLElement} [options.root=document]
   * @param {(formData: Object) => void} [options.onFormChange]
   * @param {Array<{label: string, valor: string}>} [options.horariosPadrao]
   */
  constructor(options = {}) {
    this.root = options.root || (typeof document !== "undefined" ? document : null);
    this.onFormChange = options.onFormChange || (() => {});
    this.horariosPadrao = options.horariosPadrao || HORARIOS_PADRAO;
    this.currentDays = [1, 2, 3, 4]; // Seg, Ter, Qua, Qui padrão
    this._debounceTimer = null;

    this._bindElements();
  }

  _bindElements() {
    if (!this.root) return;

    this.inputs = {
      nomeCurso: this.root.querySelector("#nomeCurso"),
      codigoTurma: this.root.querySelector("#codigoTurma"),
      escola: this.root.querySelector("#escola"),
      unidadeCurricular: this.root.querySelector("#unidadeCurricular"),
      editorAmbienteTeoria: this.root.querySelector("#editorAmbienteTeoria"),
      editorAmbientePratica: this.root.querySelector("#editorAmbientePratica"),
      docente: this.root.querySelector("#docente"),
      coordenador: this.root.querySelector("#coordenador"),
      horaInicio: this.root.querySelector("#horaInicio"),
      horaFim: this.root.querySelector("#horaFim"),
      cargaHorariaTotal: this.root.querySelector("#cargaHorariaTotal"),
      horasPorAula: this.root.querySelector("#horasPorAula"),
      aulasPorDia: this.root.querySelector("#aulasPorDia"),
      horasPorDia: this.root.querySelector("#horasPorDia"),
      dataInicioStr: this.root.querySelector("#dataInicioStr")
    };

    this.dayButtons = this.root.querySelectorAll(".day-btn");
    this.horarioSelect = this.root.querySelector("#horarioPresetSelect");
  }

  /**
   * Inicializa ouvintes e preenche seletores rápidos.
   */
  init() {
    this._bindElements();
    this._initHorariosDropdown();
    this._initDayButtons();
    this._initInputListeners();
  }

  _initHorariosDropdown() {
    if (!this.horarioSelect) return;

    this.horarioSelect.innerHTML = '<option value="">-- Selecione um Horário Sugerido --</option>';
    this.horariosPadrao.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.valor;
      opt.textContent = item.label;
      this.horarioSelect.appendChild(opt);
    });

    this.horarioSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) return;
      const [inicio, fim] = val.split("|");
      if (this.inputs.horaInicio && inicio) this.inputs.horaInicio.value = inicio;
      if (this.inputs.horaFim && fim) this.inputs.horaFim.value = fim;
      this._updateCalculatedHoursPerDay();
      this._notifyChange();
    });
  }

  _initDayButtons() {
    if (!this.dayButtons) return;

    this.dayButtons.forEach((btn) => {
      const dayNum = Number(btn.dataset.day);
      btn.classList.toggle("active", this.currentDays.includes(dayNum));

      btn.addEventListener("click", () => {
        const idx = this.currentDays.indexOf(dayNum);
        if (idx === -1) {
          this.currentDays.push(dayNum);
        } else {
          this.currentDays.splice(idx, 1);
        }
        btn.classList.toggle("active", this.currentDays.includes(dayNum));
        this._notifyChange();
      });
    });
  }

  _initInputListeners() {
    const triggerRecalcInputs = [
      this.inputs.horaInicio,
      this.inputs.horaFim,
      this.inputs.horasPorDia,
      this.inputs.cargaHorariaTotal,
      this.inputs.dataInicioStr,
      this.inputs.editorAmbienteTeoria,
      this.inputs.editorAmbientePratica
    ];

    triggerRecalcInputs.forEach((input) => {
      if (!input) return;
      input.addEventListener("input", () => {
        if (input === this.inputs.horaInicio || input === this.inputs.horaFim) {
          this._updateCalculatedHoursPerDay();
        }
        this._debounceNotify();
      });
      input.addEventListener("change", () => {
        this._notifyChange();
      });
    });

    // Inputs textuais leves
    const textInputs = [
      this.inputs.nomeCurso,
      this.inputs.codigoTurma,
      this.inputs.escola,
      this.inputs.unidadeCurricular,
      this.inputs.docente,
      this.inputs.coordenador
    ];

    textInputs.forEach((input) => {
      if (!input) return;
      input.addEventListener("input", () => {
        this._debounceNotify();
      });
    });
  }

  _updateCalculatedHoursPerDay() {
    const hInicio = this.inputs.horaInicio?.value;
    const hFim = this.inputs.horaFim?.value;
    if (!hInicio || !hFim || !this.inputs.horasPorDia) return;

    const minInicio = timeToMinutes(hInicio);
    const minFim = timeToMinutes(hFim);
    if (minFim > minInicio) {
      const diff = minFim - minInicio;
      this.inputs.horasPorDia.value = minutesToHHMM(diff);
    }
  }

  _debounceNotify() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._notifyChange();
    }, 200);
  }

  _notifyChange() {
    const data = this.getFormData();
    this.onFormChange(data);
  }

  /**
   * Extrai os dados atuais de todos os campos do formulário.
   * @returns {Object}
   */
  getFormData() {
    const val = (el, fallback = "") => (el ? el.value.trim() : fallback);

    return {
      nomeCurso: val(this.inputs.nomeCurso),
      codigoTurma: val(this.inputs.codigoTurma),
      escola: val(this.inputs.escola),
      unidadeCurricular: val(this.inputs.unidadeCurricular),
      ambienteTeoria: val(this.inputs.editorAmbienteTeoria, "S01"),
      ambientePratica: val(this.inputs.editorAmbientePratica, "L01"),
      docente: val(this.inputs.docente),
      coordenador: val(this.inputs.coordenador),
      horaInicio: val(this.inputs.horaInicio, "13:00"),
      horaFim: val(this.inputs.horaFim, "17:00"),
      cargaHorariaTotal: val(this.inputs.cargaHorariaTotal, "120"),
      horasPorAula: val(this.inputs.horasPorAula, "01:00"),
      aulasPorDia: parseInt(val(this.inputs.aulasPorDia, "4"), 10) || 4,
      horasPorDia: val(this.inputs.horasPorDia, "04:00"),
      dataInicioStr: val(this.inputs.dataInicioStr, ""),
      diasSemana: [...this.currentDays]
    };
  }

  /**
   * Preenche os campos do formulário com um conjunto de dados.
   * @param {Object} data
   */
  setFormData(data = {}) {
    const setVal = (input, v) => {
      if (input && v !== undefined && v !== null) input.value = v;
    };

    setVal(this.inputs.nomeCurso, data.nomeCurso);
    setVal(this.inputs.codigoTurma, data.codigoTurma);
    setVal(this.inputs.escola, data.escola);
    setVal(this.inputs.unidadeCurricular, data.unidadeCurricular);
    setVal(this.inputs.editorAmbienteTeoria, data.ambienteTeoria);
    setVal(this.inputs.editorAmbientePratica, data.ambientePratica);
    setVal(this.inputs.docente, data.docente);
    setVal(this.inputs.coordenador, data.coordenador);
    setVal(this.inputs.horaInicio, data.horaInicio);
    setVal(this.inputs.horaFim, data.horaFim);
    setVal(this.inputs.cargaHorariaTotal, data.cargaHorariaTotal);
    setVal(this.inputs.horasPorAula, data.horasPorAula);
    setVal(this.inputs.aulasPorDia, data.aulasPorDia);
    setVal(this.inputs.horasPorDia, data.horasPorDia);
    setVal(this.inputs.dataInicioStr, data.dataInicioStr);

    if (Array.isArray(data.diasSemana)) {
      this.currentDays = [...data.diasSemana];
      if (this.dayButtons) {
        this.dayButtons.forEach((btn) => {
          const dayNum = Number(btn.dataset.day);
          btn.classList.toggle("active", this.currentDays.includes(dayNum));
        });
      }
    }
  }

  /**
   * Reseta o formulário para valores limpos.
   */
  resetForm() {
    this.setFormData({
      nomeCurso: "",
      codigoTurma: "",
      escola: "",
      unidadeCurricular: "",
      ambienteTeoria: "",
      ambientePratica: "",
      docente: "",
      coordenador: "",
      horaInicio: "13:00",
      horaFim: "17:00",
      cargaHorariaTotal: "",
      horasPorAula: "01:00",
      aulasPorDia: 4,
      horasPorDia: "",
      dataInicioStr: "",
      diasSemana: []
    });
    if (this.horarioSelect) this.horarioSelect.value = "";
    this._notifyChange();
  }
}

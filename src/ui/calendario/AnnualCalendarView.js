// Created at: 2026-10-19 13:42
/**
 * @fileoverview Visualizador do Calendário Anual Escolar (12 Meses).
 * Renderiza grade anual, feriados, recessos e encontros letivos da turma.
 */

export class AnnualCalendarView {
  /**
   * @param {Object} [options]
   * @param {HTMLElement} [options.root=document]
   * @param {Object} [options.holidayService]
   * @param {number} [options.anoInicial=2026]
   * @param {number} [options.anoTurma=2026]
   * @param {(ano: number) => void} [options.onYearChange]
   * @param {(dateKey: string, info: Object) => void} [options.onDayClick]
   * @param {() => void} [options.onOpenCustomModal]
   * @param {() => void} [options.onPrint]
   */
  constructor(options = {}) {
    this.root = options.root || (typeof document !== "undefined" ? document : null);
    this.holidayService = options.holidayService || null;
    this.anoExibido = options.anoInicial || 2026;
    this.anoTurma = options.anoTurma || 2026;

    this.onYearChange = options.onYearChange || (() => {});
    this.onDayClick = options.onDayClick || (() => {});
    this.onOpenCustomModal = options.onOpenCustomModal || (() => {});
    this.onPrint = options.onPrint || (() => {});

    this._bindElements();
  }

  _bindElements() {
    if (!this.root) return;
    this.container = this.root.querySelector("#tab-calendario");
  }

  init() {
    this._bindElements();
  }

  setYear(ano) {
    this.anoExibido = Number(ano) || 2026;
    this.onYearChange(this.anoExibido);
  }

  /**
   * Renderiza os 12 meses do calendário escolar.
   * @param {Map<string, Object>} [aulasMap=new Map()]
   */
  render(aulasMap = new Map()) {
    this._bindElements();
    if (!this.container) return;

    if (!this.holidayService) {
      this.container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #8D7B6F;">
          Motor de feriados não carregado.
        </div>`;
      return;
    }

    const calData = this.holidayService.getYearCalendar(this.anoExibido);
    const diasSemanaSiglas = ["D", "S", "T", "Q", "Q", "S", "S"];

    // 1. Cabeçalho de Navegação de Ano e Ações
    const htmlHeader = `
      <header class="cal-top-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <h2 style="font-size: 20px; font-weight: 700; margin: 0; color: #4A2A1A;">Calendário Escolar Anual</h2>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <div class="cal-year-nav" style="display: flex; align-items: center; background: #FAF8F3; border: 1px solid #E8E2D5; border-radius: 9999px; padding: 2px 8px;">
            <button type="button" id="cal-btn-prev-year" class="cal-btn-nav" title="Ano Anterior" style="border: none; background: transparent; cursor: pointer; padding: 4px 6px;">
              &larr;
            </button>
            <span id="cal-label-year" style="font-weight: 800; padding: 0 8px; color: #4A2A1A;">${this.anoExibido}</span>
            <button type="button" id="cal-btn-next-year" class="cal-btn-nav" title="Próximo Ano" style="border: none; background: transparent; cursor: pointer; padding: 4px 6px;">
              &rarr;
            </button>
          </div>
          <button type="button" id="cal-btn-ano-turma" class="btn btn-sm" style="background: #4A2A1A; color: #fff; border-radius: 9999px; padding: 4px 12px;">
            Ano da Turma (${this.anoTurma})
          </button>
          <button type="button" id="cal-btn-custom-modal" class="btn btn-sm" style="background: #7B32D9; color: #fff; border-radius: 9999px; padding: 4px 12px;">
            Adicionar / Remover Dia
          </button>
          <button type="button" id="cal-btn-print" class="btn btn-sm" style="background: #FAF8F3; border: 1px solid #E8E2D5; border-radius: 9999px; padding: 4px 12px;">
            Imprimir (A4)
          </button>
        </div>
      </header>
    `;

    // 2. Barra de Legendas
    const htmlLegendas = `
      <div class="cal-legend-bar" style="background: #fff; border: 1px solid #E8E2D5; border-radius: 12px; padding: 10px 16px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 14px; font-size: 11px;">
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #1A73E8; border-radius: 50%;"></span> Encontros da Turma</span>
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #FF0000; border-radius: 50%;"></span> Feriados</span>
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #FFC000; border-radius: 50%;"></span> Emenda de Feriado</span>
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #808080; border-radius: 50%;"></span> Ponto Facultativo</span>
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #00B050; border-radius: 50%;"></span> Formatura CAI/CT</span>
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #FFFF00; border: 1px solid #D4B200; border-radius: 50%;"></span> Férias FIC</span>
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; background: #00B0F0; border-radius: 50%;"></span> A Decidir</span>
      </div>
    `;

    // 3. Matriz dos 12 Meses
    let htmlMeses = '<div class="cal-months-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">';

    calData.meses.forEach((mes) => {
      let diasHtml = "";
      const totalDias = mes.totalDias;
      const offsetInicio = mes.diaSemanaInicio;

      for (let c = 0; c < offsetInicio; c++) {
        diasHtml += '<div class="day-cell day-empty" style="min-height: 28px;"></div>';
      }

      for (let diaAtual = 1; diaAtual <= totalDias; diaAtual++) {
        const diaItem = mes.dias[diaAtual - 1];
        const dateKey = diaItem.dateKey;
        const ev = diaItem.evento;
        const hasEvent = !!ev;
        const aulaTurma = aulasMap.get(dateKey);

        let bgStyle = "";
        let colorStyle = "";
        let borderStyle = "";

        if (hasEvent && ev) {
          const cat = ev.categoria_id || "feriado";
          if (cat === "feriado") {
            bgStyle = "background: rgba(255, 0, 0, 0.15); font-weight: bold; border: 1.5px solid #FF0000;";
            colorStyle = "color: #D32F2F;";
          } else if (cat === "emenda") {
            bgStyle = "background: rgba(255, 192, 0, 0.18); font-weight: bold; border: 1.5px solid #FFC000;";
            colorStyle = "color: #B38600;";
          } else if (cat === "ponto_facultativo") {
            bgStyle = "background: rgba(128, 128, 128, 0.16); font-weight: bold; border: 1.5px solid #808080;";
            colorStyle = "color: #595959;";
          } else if (cat === "formatura") {
            bgStyle = "background: rgba(0, 176, 80, 0.16); font-weight: bold; border: 1.5px solid #00B050;";
            colorStyle = "color: #008A3E;";
          } else if (cat === "ferias_fic") {
            bgStyle = "background: rgba(255, 255, 0, 0.22); font-weight: bold; border: 1.5px solid #D4B200;";
            colorStyle = "color: #8A7300;";
          } else if (cat === "a_decidir") {
            bgStyle = "background: rgba(0, 176, 240, 0.16); font-weight: bold; border: 1.5px solid #00B0F0;";
            colorStyle = "color: #0086B8;";
          } else {
            bgStyle = "background: rgba(255, 0, 0, 0.15); font-weight: bold; border: 1.5px solid #FF0000;";
            colorStyle = "color: #D32F2F;";
          }
        }

        if (aulaTurma) {
          borderStyle = "border-bottom: 3px solid #1A73E8;";
        }

        const titleText = [
          dateKey,
          ev ? ev.descricao : "",
          aulaTurma ? `Aula: ${aulaTurma.tipo || "Encontro"}` : ""
        ]
          .filter(Boolean)
          .join(" • ");

        diasHtml += `
          <button type="button" class="day-cell" data-date="${dateKey}" title="${titleText}" style="min-height: 28px; display: flex; align-items: center; justify-content: center; font-size: 11px; border: none; cursor: pointer; border-radius: 4px; ${bgStyle} ${colorStyle} ${borderStyle}">
            ${diaAtual}
          </button>
        `;
      }

      htmlMeses += `
        <div class="cal-month-card" style="background: #fff; border: 1px solid #E8E2D5; border-radius: 12px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-weight: 800; font-size: 13px; color: #4A2A1A; margin-bottom: 8px; text-align: center;">
            ${mes.nomeMes}
          </div>
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center; font-size: 10px; font-weight: 700; color: #8D7B6F; margin-bottom: 4px;">
            ${diasSemanaSiglas.map((s) => `<div>${s}</div>`).join("")}
          </div>
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;">
            ${diasHtml}
          </div>
        </div>
      `;
    });

    htmlMeses += "</div>";

    this.container.innerHTML = `
      <div class="cal-annual-wrapper">
        ${htmlHeader}
        ${htmlLegendas}
        ${htmlMeses}
      </div>
    `;

    this._attachListeners();
  }

  _attachListeners() {
    if (!this.container) return;

    this.container.querySelector("#cal-btn-prev-year")?.addEventListener("click", () => {
      this.setYear(this.anoExibido - 1);
    });

    this.container.querySelector("#cal-btn-next-year")?.addEventListener("click", () => {
      this.setYear(this.anoExibido + 1);
    });

    this.container.querySelector("#cal-btn-ano-turma")?.addEventListener("click", () => {
      this.setYear(this.anoTurma);
    });

    this.container.querySelector("#cal-btn-custom-modal")?.addEventListener("click", () => {
      this.onOpenCustomModal();
    });

    this.container.querySelector("#cal-btn-print")?.addEventListener("click", () => {
      this.onPrint();
    });

    const dayBtns = this.container.querySelectorAll(".day-cell[data-date]");
    dayBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const dateKey = btn.dataset.date;
        if (dateKey) this.onDayClick(dateKey, {});
      });
    });
  }
}

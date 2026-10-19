// Created at: 2026-10-17 14:41
/**
 * @fileoverview Visualizador de prévia do Cronograma.
 * Gerencia a renderização dos cards interativos de aula e a tabela oficial A4 para impressão/PDF.
 */

import { minutesToHHMM, timeToMinutes } from "../../core/calendar/dateUtils.js";

export class SchedulePreviewView {
  /**
   * @param {Object} [options]
   * @param {HTMLElement} [options.root=document]
   * @param {(lesson: Object, index: number) => void} [options.onChipClick]
   * @param {(lesson: Object, index: number) => void} [options.onChipMenuClick]
   * @param {(lesson: Object, index: number, event: MouseEvent) => void} [options.onChipContextMenu]
   */
  constructor(options = {}) {
    this.root = options.root || (typeof document !== "undefined" ? document : null);
    this.onChipClick = options.onChipClick || (() => {});
    this.onChipMenuClick = options.onChipMenuClick || (() => {});
    this.onChipContextMenu = options.onChipContextMenu || (() => {});

    this._bindElements();
  }

  _bindElements() {
    if (!this.root) return;

    this.chipsContainer = this.root.querySelector("#interactive-days-grid");
    this.renderTarget = this.root.querySelector("#cronograma-render-target");
    this.badgeAulas = this.root.querySelector("#ch-progress-badge");
    this.metricAulasCount = this.root.querySelector("#cron-metric-aulas-count");
    this.metricAulasStatus = this.root.querySelector("#cron-metric-aulas-status");
    this.metricChValue = this.root.querySelector("#cron-metric-ch-value");
    this.metricChStatus = this.root.querySelector("#cron-metric-ch-status");
  }

  /**
   * Atualiza as métricas de resumo de carga horária e encontros.
   * @param {Array<Object>} activeLessons
   * @param {Object} scheduleResult
   */
  renderMetrics(activeLessons = [], scheduleResult = null) {
    if (!this.root || !scheduleResult) return;

    const totalAulasAtivas = (activeLessons || []).filter((l) => !l.isInactive).length;
    const { horasPreenchidasFormatadas, totalCargaFormatada, minutosPreenchidos, totalCargaMinutos } = scheduleResult;

    if (this.badgeAulas) {
      this.badgeAulas.textContent = `${totalAulasAtivas} Aulas`;
    }

    if (this.metricAulasCount) {
      this.metricAulasCount.textContent = `${totalAulasAtivas} Encontros`;
    }

    if (this.metricAulasStatus) {
      if (minutosPreenchidos > 0 && minutosPreenchidos >= totalCargaMinutos) {
        this.metricAulasStatus.style.color = "#047857";
        this.metricAulasStatus.innerHTML = `<i class="fa-regular fa-circle-check" style="font-size: 10px;"></i> Totalmente alocado`;
      } else {
        this.metricAulasStatus.style.color = "#B45309";
        this.metricAulasStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size: 10px;"></i> Distribuição pendente`;
      }
    }

    if (this.metricChValue) {
      this.metricChValue.textContent = `${horasPreenchidasFormatadas || "00:00"} / ${totalCargaFormatada || "00:00"}`;
    }

    if (this.metricChStatus) {
      if (minutosPreenchidos > totalCargaMinutos) {
        const diffStr = minutesToHHMM(minutosPreenchidos - totalCargaMinutos);
        this.metricChStatus.style.color = "#B45309";
        this.metricChStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size: 10px;"></i> +${diffStr} excedente`;
      } else if (minutosPreenchidos === totalCargaMinutos && totalCargaMinutos > 0) {
        this.metricChStatus.style.color = "#047857";
        this.metricChStatus.innerHTML = `<i class="fa-regular fa-circle-check" style="font-size: 10px;"></i> Carga exata atendida`;
      } else {
        const diffStr = minutesToHHMM(Math.max(0, (totalCargaMinutos || 0) - (minutosPreenchidos || 0)));
        this.metricChStatus.style.color = "#B45309";
        this.metricChStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size: 10px;"></i> ${diffStr} pendente`;
      }
    }
  }

  /**
   * Renderiza os cards interativos no container de dias.
   * @param {Array<Object>} activeLessons
   * @param {Object} scheduleResult
   * @param {Object} [formDataPadrao={}]
   */
  renderChips(activeLessons = [], scheduleResult = null, formDataPadrao = {}) {
    this._bindElements();
    this.renderMetrics(activeLessons, scheduleResult);

    if (!this.chipsContainer) return;

    if (!activeLessons || activeLessons.length === 0) {
      if (scheduleResult && scheduleResult.emptyReason === "no_days_selected") {
        this.chipsContainer.innerHTML = `<div style="color: #8C7769; font-size: 12px; grid-column: 1/-1; text-align: center; padding: 24px; background: rgba(255,255,255,0.7); border-radius: 12px; border: 1px dashed #DFD7BF;">Selecione os dias da semana com aula no painel lateral para distribuir as aulas.</div>`;
      } else {
        this.chipsContainer.innerHTML = `<div style="color: #8C7769; font-size: 12px; grid-column: 1/-1; text-align: center; padding: 24px; background: rgba(255,255,255,0.7); border-radius: 12px; border: 1px dashed #DFD7BF;">Nenhuma aula calculada para os parâmetros atuais.</div>`;
      }
      return;
    }

    const horaInicioVal = formDataPadrao.horaInicio || "13:00";
    const horaFimVal = formDataPadrao.horaFim || "17:00";
    const horasPorDiaStr = formDataPadrao.horasPorDia || "04:00";
    const minutosDiaPadrao = timeToMinutes(horasPorDiaStr) || 240;

    let html = "";
    let aulaCounter = 0;

    activeLessons.forEach((aula, idx) => {
      const isInactive = !!aula.isInactive;
      if (!isInactive) aulaCounter++;

      const isSplit = !!aula.isSplit;
      const isTeoria = aula.tipo === "teoria";
      const isPratica = aula.tipo === "pratica";

      let borderClass = "is-pratica";
      let badgeClass = "stitch-badge-pratica";
      let badgeText = "Prática";

      if (isInactive) {
        borderClass = "is-inactive";
        badgeClass = "stitch-badge-inactive";
        badgeText = "Inativo";
      } else if (isSplit) {
        borderClass = "is-misto";
        badgeClass = "stitch-badge-misto";
        badgeText = aula.ordem === "pratica-teoria" ? "Prática / Teoria" : "Teoria / Prática";
      } else if (isTeoria) {
        borderClass = "is-teoria";
        badgeClass = "stitch-badge-teoria";
        badgeText = "Teoria";
      }

      const horasDiaStr = minutesToHHMM(aula.minutos || minutosDiaPadrao);
      const isDifferentHours = !isInactive && aula.minutos !== minutosDiaPadrao;

      let ambDisplay = aula.ambiente || "";
      if (isSplit) {
        const pStr = `${aula.praticaAmbiente} (${minutesToHHMM(aula.praticaMinutos)})`;
        const tStr = `${aula.teoriaAmbiente} (${minutesToHHMM(aula.teoriaMinutos)})`;
        ambDisplay = aula.ordem === "pratica-teoria" ? `${pStr} • ${tStr}` : `${tStr} • ${pStr}`;
      }

      const ambColor = isInactive ? "#4B5563" : isTeoria ? "#047857" : isPratica ? "#1D4ED8" : "#6D28D9";
      const horarioDisplay = aula.horaInicio && aula.horaFim ? `${aula.horaInicio} - ${aula.horaFim}` : `${horaInicioVal} - ${horaFimVal}`;

      html += `
        <div class="lesson-chip stitch-lesson-card ${borderClass}" data-index="${idx}" data-datekey="${aula.dataKey}">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; font-weight: 800; color: #8C7769; background: #F5EFE6; padding: 1px 6px; border-radius: 6px;">${isInactive ? "✕" : aulaCounter}</span>
              <span style="font-size: 12px; font-weight: 700; color: #3A1E11;">${aula.diaStr}/${String(aula.mesIdx + 1).padStart(2, "0")} (${aula.diaSemanaNome})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="stitch-badge-pill ${badgeClass}">${badgeText}</span>
              <button type="button" class="chip-menu-btn" title="Configurar este dia" data-index="${idx}" data-datekey="${aula.dataKey}" style="border: none; background: transparent; color: #8C7769; cursor: pointer; padding: 2px 4px; font-size: 13px; font-weight: bold;">⋮</button>
            </div>
          </div>
          <div style="font-size: 12px; color: #8C7769; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Horário:</span>
              <strong style="color: #4E2A18; font-weight: 600;">${horarioDisplay}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Ambiente:</span>
              <strong style="color: ${ambColor}; font-weight: 700;">${ambDisplay}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>C.H.:</span>
              <strong style="color: #4E2A18; font-weight: 600;">${horasDiaStr} ${isDifferentHours ? "⚠️" : ""}</strong>
            </div>
          </div>
        </div>
      `;
    });

    this.chipsContainer.innerHTML = html;
    this._attachChipListeners(activeLessons);
  }

  _attachChipListeners(activeLessons) {
    if (!this.chipsContainer) return;

    const chips = this.chipsContainer.querySelectorAll(".lesson-chip");
    chips.forEach((chip) => {
      const idx = Number(chip.dataset.index);
      const aula = activeLessons[idx];
      if (!aula) return;

      const menuBtn = chip.querySelector(".chip-menu-btn");
      if (menuBtn) {
        menuBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.onChipMenuClick(aula, idx);
        });
      }

      chip.addEventListener("click", () => {
        this.onChipClick(aula, idx);
      });

      chip.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.onChipContextMenu(aula, idx, e);
      });
    });
  }

  /**
   * Renderiza a folha oficial A4 com tabelas de meses e cabeçalho institucional.
   * @param {Object} formData
   * @param {Object} calcResult
   */
  renderOfficialTable(formData = {}, calcResult = null) {
    this._bindElements();
    if (!this.renderTarget) return;

    if (!calcResult || calcResult.emptyReason === "no_days_selected") {
      this.renderTarget.innerHTML = `
        <div style="padding: 48px 24px; text-align: center; color: var(--text-secondary); background: var(--bg-surface); border-radius: 8px; border: 1.5px dashed var(--border-color); margin: 32px auto; max-width: 650px;">
          <h2 style="font-size: 17px; margin: 0 0 8px 0; color: var(--text-primary); font-weight: 800;">Selecione os Dias da Semana Ativos</h2>
          <p style="font-size: 13px; line-height: 1.5; color: var(--text-secondary); margin: 0;">Para gerar o cronograma oficial e calcular a distribuição das aulas, marque ao menos um dia da semana no painel lateral à esquerda.</p>
        </div>
      `;
      return;
    }

    const {
      nomeCurso = "",
      codigoTurma = "",
      escola = "",
      unidadeCurricular = "",
      docente = "",
      coordenador = "",
      cargaHorariaTotal = 40
    } = formData;

    const { vigencia = "-", semAno = "-", mesesSequenciais = [] } = calcResult;
    const numCols = 25;
    const totalBlocos = 8;
    let monthTablesHTML = "";

    for (let slot = 0; slot < totalBlocos; slot++) {
      const mData = mesesSequenciais[slot] || null;
      const nomeMes = mData ? mData.nomeMes : "";
      const dTeoria = mData ? mData.diasTeoria : [];
      const dPratica = mData ? mData.diasPratica : [];
      const dAmb = mData ? mData.ambientes : [];

      let rowTeoria = "";
      let rowPratica = "";
      let rowAmbiente = "";

      for (let c = 0; c < numCols; c++) {
        const t = dTeoria[c] || "";
        const p = dPratica[c] || "";
        const a = dAmb[c] || "";
        const isSplitAmb = a && a.includes("/");

        rowTeoria += `<td class="a4-cell a4-cell-teoria ${t ? "has-val" : ""}">${t}</td>`;
        rowPratica += `<td class="a4-cell a4-cell-pratica ${p ? "has-val" : ""}">${p}</td>`;
        rowAmbiente += `<td class="a4-cell ${a ? "has-val" : ""} ${isSplitAmb ? "a4-cell-split" : ""}">${a}</td>`;
      }

      monthTablesHTML += `
        <table class="a4-month-table">
          <thead>
            <tr>
              <th class="a4-th-label">Aulas/Mês</th>
              <th class="a4-th-monthname" colspan="${numCols}">${nomeMes}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="a4-row-teoria">Dias de Teoria</td>
              ${rowTeoria}
            </tr>
            <tr>
              <td class="a4-row-pratica">Dias de Prática</td>
              ${rowPratica}
            </tr>
            <tr>
              <td class="a4-row-ambiente">Ambiente</td>
              ${rowAmbiente}
            </tr>
          </tbody>
        </table>
      `;
    }

    const schoolHeading = escola ? `<h2>ESCOLA SENAI “${escola}”</h2>` : `<h2>ESCOLA SENAI</h2>`;

    this.renderTarget.innerHTML = `
      <div class="page-a4">
        <header class="a4-header">
          <img src="logo_senai_oficial.png" alt="SENAI" class="senai-logo-img">
          <div class="a4-school-title">
            ${schoolHeading}
            <h1>Cronograma de Aulas</h1>
          </div>
        </header>

        <table class="a4-meta-table">
          <tbody>
            <tr>
              <td class="col-left"><div class="meta-field"><span class="meta-lbl">Curso:</span><span class="meta-val">${nomeCurso}</span></div></td>
              <td class="col-right"><div class="meta-field"><span class="meta-lbl">Turma:</span><span class="meta-val">${codigoTurma}</span></div></td>
            </tr>
            <tr>
              <td class="col-left"><div class="meta-field"><span class="meta-lbl">Unidade Curricular:</span><span class="meta-val">${unidadeCurricular || nomeCurso}</span></div></td>
              <td class="col-right"><div class="meta-field"><span class="meta-lbl">Carga Horária:</span><span class="meta-val">${calcResult.cargaHorariaFormatada || (cargaHorariaTotal + " horas")}</span></div></td>
            </tr>
            <tr>
              <td class="col-left"><div class="meta-field"><span class="meta-lbl">COORDENADOR:</span><span class="meta-val">${coordenador}</span></div></td>
              <td class="col-right"><div class="meta-field"><span class="meta-lbl">Sem / Ano:</span><span class="meta-val">${semAno}</span></div></td>
            </tr>
            <tr>
              <td class="col-left"><div class="meta-field"><span class="meta-lbl">PROFESSOR / RESPONSÁVEL:</span><span class="meta-val">${docente}</span></div></td>
              <td class="col-right"><div class="meta-field"><span class="meta-lbl">Vigência:</span><span class="meta-val">${vigencia}</span></div></td>
            </tr>
          </tbody>
        </table>

        <main class="a4-months-container">
          ${monthTablesHTML}
        </main>

        <footer class="a4-footer">
          <table class="a4-signatures-table">
            <tbody>
              <tr>
                <td class="col-elab">Elaborador:<br><strong>${docente}</strong></td>
                <td class="col-data1">Data:<br>&nbsp;</td>
                <td class="col-aprov">Aprovador:<br><strong>${coordenador}</strong></td>
                <td class="col-data2">Data:<br>&nbsp;</td>
              </tr>
            </tbody>
          </table>
          <div class="a4-footer-info">
            <span class="code">FR-1.02 – 66A (V.00)</span>
            <span class="legend-coral">Legenda: &nbsp;&nbsp; S – Sala &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; O – Oficina &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; L – Laboratório</span>
            <span class="page-num">1 de 1</span>
          </div>
        </footer>
      </div>
    `;
  }
}

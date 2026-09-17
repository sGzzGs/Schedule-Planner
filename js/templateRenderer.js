/**
 * templateRenderer.js
 * Renderizador de alta fidelidade para o modelo oficial SENAI FR-1.02-66A (V.00)
 * e modo alternativo de calendário anual (ExemploExcel.png).
 */

import { ESCOLA_PADRAO } from "./state.js";

export class TemplateRenderer {
  static render(state, scheduleResult, holidayService) {
    if (!scheduleResult || !scheduleResult.success) {
      return `
        <div class="schedule-error-banner">
          <h3>⚠️ Configuração Incompleta</h3>
          <p>${scheduleResult ? scheduleResult.error : "Aguardando preenchimento dos campos obrigatórios."}</p>
        </div>
      `;
    }

    const modo = state.modoVisualizacao || "oficial";
    if (modo === "calendario") {
      return TemplateRenderer.renderCalendarMode(state, scheduleResult, holidayService);
    }
    return TemplateRenderer.renderOfficialTableMode(state, scheduleResult);
  }

  /**
   * Renderiza o layout idêntico aos PDFs oficiais anexados:
   * FR-1.02 - 66A (V.00) com blocos de Aulas/Mês, Dias de Teoria, Dias de Prática e Ambiente.
   */
  static renderOfficialTableMode(state, scheduleResult) {
    const {
      nomeCurso = "",
      codigoTurma = "",
      unidadeCurricular = "",
      coordenador = "Carlos José Júnior",
      docente = "Leonardo Gabriel Matos da Silva",
      elaborador = "Leonardo Gabriel Matos da Silva",
      aprovador = "Carlos José Júnior",
      cargaHorariaTotal = 40
    } = state;

    const unidadeEscolar = ESCOLA_PADRAO;

    const {
      vigenciaCurta,
      semAno,
      mesesSequenciais = []
    } = scheduleResult;

    const dataHojeBR = new Date().toLocaleDateString("pt-BR");

    // Construir os 6 blocos mensais da folha oficial
    let monthsHtml = "";
    const totalSlots = 6;

    for (let slot = 0; slot < totalSlots; slot++) {
      const mesData = mesesSequenciais[slot] || null;
      monthsHtml += TemplateRenderer.renderOfficialMonthRow(mesData);
    }

    return `
      <div class="fr-document-page official-v00">
        <!-- CABEÇALHO SENAI OFICIAL FR-1.02 - 66A (V.00) -->
        <header class="fr-v00-header">
          <div class="v00-header-main">
            <div class="v00-school-title">
              <h2>${TemplateRenderer.escape(unidadeEscolar)}</h2>
              <h1>Cronograma de Aulas</h1>
            </div>
            <div class="v00-approval-box">
              <div class="v00-approval-row">
                <span class="v00-label">Elaborador:</span>
                <span class="v00-sign-val">${TemplateRenderer.escape(elaborador || docente)}</span>
                <span class="v00-label">Data:</span>
                <span class="v00-date-val">${dataHojeBR}</span>
              </div>
              <div class="v00-approval-row">
                <span class="v00-label">Aprovador:</span>
                <span class="v00-sign-val">${TemplateRenderer.escape(aprovador || coordenador)}</span>
                <span class="v00-label">Data:</span>
                <span class="v00-date-val">${dataHojeBR}</span>
              </div>
            </div>
          </div>

          <div class="v00-header-sub">
            <span class="v00-code">FR-1.02 – 66A (V.00)</span>
            <span class="v00-legend">Legenda: <strong>SL</strong> – Sala &nbsp; <strong>OF</strong> – Oficina &nbsp; <strong>LB</strong> – Laboratório</span>
            <span class="v00-page">1 de 1</span>
          </div>
        </header>

        <!-- GRADE DE METADADOS DO CURSO E TURMA -->
        <section class="v00-meta-section">
          <div class="v00-meta-row">
            <div class="v00-meta-col flex-2">
              <span class="v00-m-label">Curso:</span>
              <span class="v00-m-val highlight">${TemplateRenderer.escape(nomeCurso)}</span>
            </div>
            <div class="v00-meta-col flex-1">
              <span class="v00-m-label">Turma:</span>
              <span class="v00-m-val bold">${TemplateRenderer.escape(codigoTurma)}</span>
            </div>
          </div>

          <div class="v00-meta-row">
            <div class="v00-meta-col flex-2">
              <span class="v00-m-label">Unidade Curricular:</span>
              <span class="v00-m-val">${TemplateRenderer.escape(unidadeCurricular || nomeCurso)}</span>
            </div>
            <div class="v00-meta-col flex-1">
              <span class="v00-m-label">Carga Horária:</span>
              <span class="v00-m-val bold">${cargaHorariaTotal}h</span>
            </div>
          </div>

          <div class="v00-meta-row">
            <div class="v00-meta-col flex-2">
              <span class="v00-m-label">COORDENADOR:</span>
              <span class="v00-m-val">${TemplateRenderer.escape(coordenador)}</span>
            </div>
            <div class="v00-meta-col flex-1">
              <span class="v00-m-label">Sem / Ano:</span>
              <span class="v00-m-val bold">${semAno}</span>
            </div>
          </div>

          <div class="v00-meta-row">
            <div class="v00-meta-col flex-2">
              <span class="v00-m-label">PROFESSOR / RESPONSÁVEL:</span>
              <span class="v00-m-val">${TemplateRenderer.escape(docente)}</span>
            </div>
            <div class="v00-meta-col flex-1">
              <span class="v00-m-label">Vigência:</span>
              <span class="v00-m-val bold">${vigenciaCurta}</span>
            </div>
          </div>
        </section>

        <!-- TABELAS DE AULAS / MÊS (6 BLOCOS OFICIAIS) -->
        <main class="v00-tables-container">
          ${monthsHtml}
        </main>
      </div>
    `;
  }

  /**
   * Renderiza uma tabela de mês individual no padrão oficial FR-1.02-66A
   */
  static renderOfficialMonthRow(mesData) {
    const nomeMes = mesData ? mesData.nomeMes : "";
    const diasTeoria = mesData ? mesData.diasTeoria : [];
    const diasPratica = mesData ? mesData.diasPratica : [];
    const ambientes = mesData ? mesData.ambientes : [];

    const numCols = 23; // Capacidade para até 23 dias letivos no mês

    let teoriaCells = "";
    let praticaCells = "";
    let ambienteCells = "";

    for (let c = 0; c < numCols; c++) {
      const tVal = diasTeoria[c] || "";
      const pVal = diasPratica[c] || "";
      const aVal = ambientes[c] || "";

      teoriaCells += `<td class="v00-cell">${tVal}</td>`;
      praticaCells += `<td class="v00-cell ${pVal ? "has-val" : ""}">${pVal}</td>`;
      ambienteCells += `<td class="v00-cell ${aVal ? "has-val" : ""}">${aVal}</td>`;
    }

    return `
      <div class="v00-month-table-wrapper">
        <table class="v00-month-table">
          <thead>
            <tr>
              <th class="v00-th-month" colspan="${numCols + 1}">
                <span class="v00-month-title">Aulas/Mês ${nomeMes ? `<strong>${nomeMes}</strong>` : ""}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="v00-row-label">Dias de Teoria</td>
              ${teoriaCells}
            </tr>
            <tr>
              <td class="v00-row-label">Dias de Prática</td>
              ${praticaCells}
            </tr>
            <tr>
              <td class="v00-row-label">Ambiente</td>
              ${ambienteCells}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Renderiza o modo calendário anual visual (conforme ExemploExcel.png)
   */
  static renderCalendarMode(state, scheduleResult, holidayService) {
    const {
      nomeCurso = "",
      codigoTurma = "",
      unidadeCurricular = "",
      docente = "",
      ambiente = "",
      turno = "Noite",
      horaInicio = "18:45",
      horaFim = "22:45",
      cargaHorariaTotal = 40
    } = state;

    const unidadeEscolar = ESCOLA_PADRAO;
    const horario = `${horaInicio} às ${horaFim}`;

    const {
      vigenciaCompleta,
      semAno,
      totalAulas,
      cargaHorariaTeoria,
      cargaHorariaPratica,
      mesesMap
    } = scheduleResult;

    const ano = scheduleResult.dataInicio ? scheduleResult.dataInicio.getFullYear() : 2026;

    const nomesMeses = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];

    let monthsGridHtml = "";
    for (let m = 0; m < 12; m++) {
      monthsGridHtml += TemplateRenderer.renderCalendarMonthCard(m, ano, nomesMeses[m], mesesMap[m], holidayService);
    }

    return `
      <div class="fr-document-page calendar-mode">
        <header class="fr-header">
          <div class="fr-header-top">
            <div class="fr-logo-container">
              <svg class="fr-senai-logo" viewBox="0 0 200 45" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="45" rx="4" fill="#005caa"/>
                <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-weight="900" font-size="24" fill="#ffffff" letter-spacing="3">SENAI</text>
              </svg>
              <div class="fr-school-title">
                <span class="fr-school-network">SERVIÇO NACIONAL DE APRENDIZAGEM INDUSTRIAL</span>
                <span class="fr-school-name">${TemplateRenderer.escape(unidadeEscolar)}</span>
              </div>
            </div>
            <div class="fr-doc-meta">
              <span class="fr-doc-type">CRONOGRAMA DE AULAS</span>
              <span class="fr-doc-code">FR-1.02-66A</span>
            </div>
          </div>

          <div class="fr-meta-grid">
            <div class="fr-meta-cell col-span-5">
              <span class="fr-meta-label">CURSO:</span>
              <span class="fr-meta-value highlight-text">${TemplateRenderer.escape(nomeCurso)}</span>
            </div>
            <div class="fr-meta-cell col-span-3">
              <span class="fr-meta-label">TURMA:</span>
              <span class="fr-meta-value badge-turma">${TemplateRenderer.escape(codigoTurma)}</span>
            </div>
            <div class="fr-meta-cell col-span-4">
              <span class="fr-meta-label">UNIDADE CURRICULAR:</span>
              <span class="fr-meta-value">${TemplateRenderer.escape(unidadeCurricular || nomeCurso)}</span>
            </div>

            <div class="fr-meta-cell col-span-4">
              <span class="fr-meta-label">DOCENTE:</span>
              <span class="fr-meta-value">${TemplateRenderer.escape(docente)}</span>
            </div>
            <div class="fr-meta-cell col-span-2">
              <span class="fr-meta-label">TURNO:</span>
              <span class="fr-meta-value">${TemplateRenderer.escape(turno)}</span>
            </div>
            <div class="fr-meta-cell col-span-3">
              <span class="fr-meta-label">HORÁRIO:</span>
              <span class="fr-meta-value">${TemplateRenderer.escape(horario)}</span>
            </div>
            <div class="fr-meta-cell col-span-3">
              <span class="fr-meta-label">C.H. TOTAL:</span>
              <span class="fr-meta-value badge-ch">${cargaHorariaTotal} h</span>
            </div>

            <div class="fr-meta-cell col-span-4">
              <span class="fr-meta-label">VIGÊNCIA:</span>
              <span class="fr-meta-value font-bold">${vigenciaCompleta}</span>
            </div>
            <div class="fr-meta-cell col-span-4">
              <span class="fr-meta-label">SEM / ANO:</span>
              <span class="fr-meta-value font-bold">${semAno}</span>
            </div>
            <div class="fr-meta-cell col-span-4">
              <span class="fr-meta-label">AMBIENTE PEDAGÓGICO:</span>
              <span class="fr-meta-value">${TemplateRenderer.escape(ambiente)}</span>
            </div>
          </div>
        </header>

        <main class="fr-calendar-section">
          <div class="fr-months-grid">
            ${monthsGridHtml}
          </div>
        </main>

        <footer class="fr-footer">
          <div class="fr-summary-and-legend">
            <div class="fr-totals-box">
              <div class="fr-totals-title">RESUMO DE CARGA HORÁRIA</div>
              <div class="fr-totals-grid">
                <div class="fr-total-item">
                  <span class="fr-total-label">Teoria:</span>
                  <span class="fr-total-num">${cargaHorariaTeoria}h</span>
                </div>
                <div class="fr-total-item">
                  <span class="fr-total-label">Prática:</span>
                  <span class="fr-total-num">${cargaHorariaPratica}h</span>
                </div>
                <div class="fr-total-item highlight">
                  <span class="fr-total-label">Total Geral:</span>
                  <span class="fr-total-num">${cargaHorariaTotal}h</span>
                </div>
                <div class="fr-total-item">
                  <span class="fr-total-label">Total Aulas:</span>
                  <span class="fr-total-num">${totalAulas}</span>
                </div>
              </div>
            </div>

            <div class="fr-legend-box">
              <div class="fr-legend-title">LEGENDA</div>
              <div class="fr-legend-items">
                <div class="fr-legend-item">
                  <span class="legend-swatch class-day"></span>
                  <span>Dia Letivo</span>
                </div>
                <div class="fr-legend-item">
                  <span class="legend-swatch holiday"></span>
                  <span>Feriado / Recesso</span>
                </div>
                <div class="fr-legend-item">
                  <span class="legend-swatch vacation"></span>
                  <span>Férias Escolares</span>
                </div>
                <div class="fr-legend-item">
                  <span class="legend-swatch non-school"></span>
                  <span>Domingo</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    `;
  }

  static renderCalendarMonthCard(mesIdx, ano, nomeMes, mesData, holidayService) {
    const firstDay = new Date(ano, mesIdx, 1);
    const lastDay = new Date(ano, mesIdx + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const totalHorasMes = mesData ? mesData.totalHoras : 0;
    const diasLetivosSet = mesData ? mesData.diasLetivosSet : new Set();

    let gridCells = "";
    for (let i = 0; i < startWeekday; i++) {
      gridCells += `<div class="cal-cell empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(ano, mesIdx, d, 12, 0, 0);
      const diaSemana = dateObj.getDay();
      const isClassDay = diasLetivosSet.has(d);
      const holidayInfo = holidayService.getDateInfo(dateObj);

      let cellClass = "cal-cell day";
      if (isClassDay) {
        cellClass += " is-class-day";
      } else if (holidayInfo) {
        if (holidayInfo.tipo === "ferias") {
          cellClass += " is-vacation";
        } else {
          cellClass += " is-holiday";
        }
      } else if (diaSemana === 0) {
        cellClass += " is-sunday";
      }

      gridCells += `
        <div class="${cellClass}">
          <span class="day-number">${d}</span>
        </div>
      `;
    }

    const totalCells = startWeekday + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
      gridCells += `<div class="cal-cell empty"></div>`;
    }

    const legendText = holidayService.getMonthLegends(mesIdx, ano);

    return `
      <div class="fr-month-card ${totalHorasMes > 0 ? "has-classes" : ""}">
        <div class="fr-month-header">
          <span class="month-name">${nomeMes}/${ano}</span>
          ${totalHorasMes > 0 ? `<span class="month-hours-tag">${totalHorasMes}h</span>` : ""}
        </div>
        <div class="fr-cal-weekdays">
          <span class="sun">D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
        </div>
        <div class="fr-cal-grid">
          ${gridCells}
        </div>
        <div class="fr-month-legend-text">
          ${legendText || "&nbsp;"}
        </div>
      </div>
    `;
  }

  static escape(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Created at: 2026-10-09 13:26
/**
 * calendario.js
 * Controlador da Aba 3: Calendário Escolar Anual (Motor Universal de Feriados SENAI).
 *
 * Funcionalidades:
 * - Grade Anual de 12 Meses (Quick Glance).
 * - Seletor instantâneo de ano com lazy loading ultra-rápido (<1ms) e cache pré-aquecido (2 anos).
 * - Preenchimento cromático conforme os 6 slots de legenda da base universal SENAI.
 * - Destaque roxo forte, preenchimento sólido e borda espessa em negrito para dias adicionados pelo usuário.
 * - Modal "Adicionar / Remover Dia do Calendário" com gestão de adições e desbloqueio de feriados oficiais.
 * - Tooltips dinâmicos com descrição do evento, categoria e aulas correspondentes da turma ativa.
 */

let _calAnoExibido = 2026;
let _calTooltipEl = null;

/**
 * Inicialização do módulo de Calendário
 */
function calInit() {
  const anoCronograma = calObterAnoTurmaAtiva();
  _calAnoExibido = anoCronograma || new Date().getFullYear();

  calCriarTooltipElemento();
  calRenderizar();
}

/**
 * Retorna o ano de início da turma configurada na Aba 1
 */
function calObterAnoTurmaAtiva() {
  if (typeof activeLessons !== "undefined" && Array.isArray(activeLessons) && activeLessons.length > 0) {
    return activeLessons[0].ano;
  }
  const elDataInicio = document.getElementById("dataInicio");
  if (elDataInicio && elDataInicio.value) {
    const ano = parseInt(elDataInicio.value.slice(0, 4), 10);
    if (!isNaN(ano)) return ano;
  }
  return new Date().getFullYear();
}

/**
 * Altera o ano exibido e atualiza a interface instantaneamente
 */
function calMudarAno(novoAno) {
  const anoNum = parseInt(novoAno, 10);
  if (isNaN(anoNum) || anoNum < 1900 || anoNum > 2100) return;
  _calAnoExibido = anoNum;
  calRenderizar();
}

/**
 * Cria o elemento singleton do tooltip flutuante
 */
function calCriarTooltipElemento() {
  if (document.getElementById("cal-floating-tooltip")) return;

  _calTooltipEl = document.createElement("div");
  _calTooltipEl.id = "cal-floating-tooltip";
  _calTooltipEl.className = "cal-tooltip";
  document.body.appendChild(_calTooltipEl);
}

/**
 * Mapeia os dias com aulas ativas da turma da Aba 1
 */
function calObterMapaAulasTurma(ano) {
  const mapaAulas = new Map();
  if (typeof activeLessons !== "undefined" && Array.isArray(activeLessons)) {
    for (const aula of activeLessons) {
      if (aula.ano === ano && !aula.isInactive) {
        mapaAulas.set(aula.dataKey, aula);
      }
    }
  }
  return mapaAulas;
}

/**
 * Renderização completa da Aba de Calendário
 */
function calRenderizar() {
  const container = document.getElementById("tab-calendario");
  if (!container) return;

  if (typeof holidayService === "undefined") {
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">Motor de feriados não carregado.</div>`;
    return;
  }

  const calData = holidayService.getYearCalendar(_calAnoExibido);
  const aulasMap = calObterMapaAulasTurma(_calAnoExibido);
  const anoTurma = calObterAnoTurmaAtiva();

  const diasSemanaSiglas = ["D", "S", "T", "Q", "Q", "S", "S"];

  // 1. Barra de Controles Superior
  const htmlTopBar = `
    <div class="cal-topbar-card">
      <div class="cal-header-title-group">
        <div class="cal-header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <div>
          <h2 class="cal-header-title">Calendário Escolar</h2>
          <span class="cal-header-subtitle">Visão panorâmica de 12 meses • Motor Universal SENAI (Páscoa e Feriados Móveis)</span>
        </div>
      </div>

      <div class="cal-controls-group">
        <!-- Seletor de Ano -->
        <div class="cal-year-picker">
          <button type="button" class="cal-year-nav-btn" onclick="calMudarAno(${_calAnoExibido - 1})" title="Ano anterior">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <input type="number" class="cal-year-input" value="${_calAnoExibido}" min="1900" max="2100" onchange="calMudarAno(this.value)" title="Digite um ano">
          <button type="button" class="cal-year-nav-btn" onclick="calMudarAno(${_calAnoExibido + 1})" title="Próximo ano">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <button type="button" class="btn btn-secondary btn-sm" onclick="calMudarAno(${anoTurma})" title="Saltar para o ano configurado na turma">
          Ano da Turma (${anoTurma})
        </button>

        <button type="button" class="btn btn-secondary btn-sm" onclick="calMudarAno(${new Date().getFullYear()})" title="Ir para o ano civil corrente">
          Ano Atual
        </button>

        <button type="button" class="btn btn-primary btn-sm" onclick="calAbrirModalCustomizacao()" style="font-weight: 700; background: #7c3aed; border-color: #6d28d9;" title="Adicionar ou remover dias e recessos do calendário">
          + Adicionar / Remover Dia
        </button>

        <button type="button" class="btn btn-secondary btn-sm cal-btn-print" onclick="calImprimirCalendario()" style="font-weight: 700; display: inline-flex; align-items: center; gap: 5px;" title="Imprimir calendário escolar anual dos 12 meses em folha A4 Paisagem (Landscape)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          <span>Imprimir (A4)</span>
        </button>
      </div>
    </div>
  `;

  // 2. Barra de Legendas Oficiais
  const htmlLegendas = `
    <div class="cal-legend-card">
      <div class="cal-legend-items">
        <span class="cal-legend-item" title="Feriados Oficiais">
          <span class="cal-legend-badge badge-cor-1"></span>
          Feriados (cor 1)
        </span>
        <span class="cal-legend-item" title="Emendas de Feriados">
          <span class="cal-legend-badge badge-cor-2"></span>
          Emenda de Feriado (cor 2)
        </span>
        <span class="cal-legend-item" title="Pontos Facultativos e Carnaval">
          <span class="cal-legend-badge badge-cor-3"></span>
          Ponto Facultativo (cor 3)
        </span>
        <span class="cal-legend-item" title="Formaturas Institucionais SENAI">
          <span class="cal-legend-badge badge-cor-4"></span>
          Formatura CAI/CT (cor 4)
        </span>
        <span class="cal-legend-item" title="Férias e Recessos Docentes">
          <span class="cal-legend-badge badge-cor-5"></span>
          Férias FIC (cor 5)
        </span>
        <span class="cal-legend-item" title="Eventos a Decidir">
          <span class="cal-legend-badge badge-cor-6"></span>
          A Decidir (cor 6)
        </span>
        <span class="cal-legend-item" title="Dias adicionados manualmente pelo usuário (em roxo com borda reforçada)" style="color: #7c3aed;">
          <span class="cal-legend-badge badge-cor-user"></span>
          Adicionado pelo Usuário
        </span>
        <span class="cal-legend-item" title="Dias com aulas letivas ativas calculadas para a turma da Aba 1">
          <span class="cal-legend-badge badge-cor-aula"></span>
          Aula Ativa da Turma
        </span>
      </div>

      <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">
        Páscoa em ${_calAnoExibido}: ${HolidayService.formatDateKey(calData.pascoa).split("-").reverse().join("/")}
      </div>
    </div>
  `;

  // 3. Grid dos 12 Meses
  let htmlMeses = `<div class="cal-months-grid">`;

  for (const mes of calData.meses) {
    const totalEventosMes = mes.eventosMes.length;
    const badgeTexto = totalEventosMes > 0 ? `${totalEventosMes} evento${totalEventosMes > 1 ? "s" : ""}` : "0 eventos";

    htmlMeses += `
      <div class="cal-month-card">
        <div class="cal-month-header">
          <span class="cal-month-title">${mes.nomeMes}</span>
          <span class="cal-month-badge">${badgeTexto}</span>
        </div>

        <table class="cal-days-table">
          <thead>
            <tr class="cal-week-header">
              ${diasSemanaSiglas.map(s => `<th>${s}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
    `;

    let diaAtual = 1;
    const totalDias = mes.totalDias;
    const offsetInicio = mes.diaSemanaInicio;
    let linhasHtml = "";

    while (diaAtual <= totalDias) {
      linhasHtml += "<tr>";
      for (let col = 0; col < 7; col++) {
        if ((diaAtual === 1 && col < offsetInicio) || diaAtual > totalDias) {
          linhasHtml += `<td class="cal-day-cell"></td>`;
        } else {
          const diaItem = mes.dias[diaAtual - 1];
          const hasEvent = diaItem.temEvento;
          const ev = diaItem.eventInfo;
          const aulaTurma = aulasMap.get(diaItem.data);

          let classesBox = ["cal-day-box"];
          if (col === 0) classesBox.push("cal-day-sun");

          let dataAttrs = `data-date="${diaItem.data}" data-day="${diaAtual}" data-weekday="${col}" data-month="${mes.nomeMes}"`;

          if (hasEvent && ev) {
            classesBox.push("cal-event-day");

            // Se foi adicionado pelo usuário: estilo ROXO FORTE
            if (ev.isCustom) {
              classesBox.push("cal-user-added");
              classesBox.push("cal-cor-user");
              dataAttrs += ` data-has-event="true" data-is-custom="true" data-desc="${encodeURIComponent(ev.descricao || '')}" data-cat="${encodeURIComponent(ev.nomeCategoria || 'Personalizado')}" data-cor="cor-user"`;
            } else {
              const corClass = (ev.corTema || "cor 1").replace(" ", "-");
              classesBox.push(`cal-${corClass}`);
              dataAttrs += ` data-has-event="true" data-is-custom="false" data-desc="${encodeURIComponent(ev.descricao || '')}" data-cat="${encodeURIComponent(ev.nomeCategoria || '')}" data-cor="${encodeURIComponent(ev.corTema || '')}"`;
            }
          }

          if (aulaTurma) {
            classesBox.push("cal-class-day");
            if (!hasEvent) classesBox.push("cal-class-only");
            dataAttrs += ` data-has-lesson="true" data-lesson-num="${aulaTurma.numAula || ''}" data-lesson-tipo="${aulaTurma.tipo || ''}" data-lesson-amb="${aulaTurma.ambiente || ''}" data-lesson-hours="${aulaTurma.horas || ''}"`;
          }

          linhasHtml += `
            <td class="cal-day-cell">
              <div class="${classesBox.join(" ")}" ${dataAttrs} onmouseenter="calOnMouseEnterDay(this, event)" onmouseleave="calOnMouseLeaveDay()" onclick="calOnClickDay(this)">
                ${diaAtual}
              </div>
            </td>
          `;

          diaAtual++;
        }
      }
      linhasHtml += "</tr>";
    }

    htmlMeses += linhasHtml;
    htmlMeses += `
          </tbody>
        </table>
      </div>
    `;
  }

  htmlMeses += `</div>`;

  container.innerHTML = `
    <div class="cal-main-container">
      ${htmlTopBar}
      ${htmlLegendas}
      ${htmlMeses}
    </div>
  `;
}

/**
 * Manipulador de evento: MouseEnter em um dia da grade
 */
function calOnMouseEnterDay(el, event) {
  if (!_calTooltipEl) calCriarTooltipElemento();

  const hasEvent = el.dataset.hasEvent === "true";
  const hasLesson = el.dataset.hasLesson === "true";

  if (!hasEvent && !hasLesson) {
    _calTooltipEl.style.display = "none";
    return;
  }

  const dateStr = el.dataset.date;
  const day = el.dataset.day;
  const month = el.dataset.month;
  const weekdayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const weekdayName = weekdayNames[parseInt(el.dataset.weekday, 10)] || "";

  let tooltipHtml = `
    <div class="cal-tooltip-header">${day} de ${month} • ${weekdayName} (${dateStr.split("-").reverse().join("/")})</div>
  `;

  if (hasEvent) {
    const desc = decodeURIComponent(el.dataset.desc || "");
    const cat = decodeURIComponent(el.dataset.cat || "");
    const cor = decodeURIComponent(el.dataset.cor || "");
    const isCustom = el.dataset.isCustom === "true";

    tooltipHtml += `
      <div class="cal-tooltip-title">${desc}</div>
      <div class="cal-tooltip-category">
        <span class="cal-legend-badge badge-${cor.replace(" ", "-")}"></span>
        <span>${isCustom ? "★ Adicionado pelo Usuário" : cat}</span>
      </div>
    `;
  }

  if (hasLesson) {
    const num = el.dataset.lessonNum;
    const tipo = el.dataset.lessonTipo;
    const amb = el.dataset.lessonAmb;
    const horas = el.dataset.lessonHours;

    tooltipHtml += `
      <div class="cal-tooltip-lesson">
        ✓ Aula ${num ? `nº ${num}` : ""} (${horas}h) • ${tipo.toUpperCase()} • Amb: ${amb || "L01"}
      </div>
    `;
  }

  _calTooltipEl.innerHTML = tooltipHtml;
  _calTooltipEl.style.display = "flex";

  const rect = el.getBoundingClientRect();
  const tooltipWidth = 260;
  let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipWidth / 2);
  let top = rect.top + window.scrollY - 85;

  if (left < 10) left = 10;
  if (left + tooltipWidth > window.innerWidth - 10) left = window.innerWidth - tooltipWidth - 10;
  if (top < 10) top = rect.bottom + window.scrollY + 8;

  _calTooltipEl.style.left = `${left}px`;
  _calTooltipEl.style.top = `${top}px`;
}

/**
 * Manipulador de evento: MouseLeave
 */
function calOnMouseLeaveDay() {
  if (_calTooltipEl) {
    _calTooltipEl.style.display = "none";
  }
}

/**
 * Clique em um dia: Abre menu de ação rápida
 */
function calOnClickDay(el) {
  const dateKey = el.dataset.date;
  if (!dateKey) return;
  calAbrirModalCustomizacao(dateKey);
}

/**
 * Modal Unificado: Adicionar ou Remover Dia do Calendário
 */
function calAbrirModalCustomizacao(dataPreenchida = "") {
  let modal = document.getElementById("cal-modal-custom");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "cal-modal-custom";
    modal.className = "day-modal-backdrop";
    document.body.appendChild(modal);
  }

  const mods = holidayService.getTodasModificacoesUsuario();
  const temAdicionais = mods.adicionais && mods.adicionais.length > 0;
  const temRemovidos = mods.removidos && mods.removidos.length > 0;

  modal.innerHTML = `
    <div class="day-modal-card" style="max-width: 580px; max-height: 88vh; display: flex; flex-direction: column;" role="dialog" aria-modal="true">
      <div class="day-modal-header">
        <div class="day-modal-title-group">
          <div class="day-modal-icon" style="background: rgba(124, 58, 237, 0.15); color: #7c3aed;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div>
            <h3 class="day-modal-title">Adicionar / Remover Dia do Calendário</h3>
            <span class="day-modal-subtitle">Personalize feriados, recessos e desbloqueios da sua escola</span>
          </div>
        </div>
        <button type="button" class="day-modal-close" onclick="calFecharModalCustomizacao()">&times;</button>
      </div>

      <!-- Barra de Abas do Modal -->
      <div style="display: flex; gap: 8px; padding: 10px 20px; border-bottom: 1px solid var(--border-color); background: var(--bg-surface);">
        <button type="button" id="cal-modal-tab-btn-add" class="btn btn-secondary btn-sm" style="font-weight: 700; background: rgba(124, 58, 237, 0.15); color: #7c3aed; border-color: #7c3aed;" onclick="calAlternarAbaModal('add')">
          + Adicionar Dia / Férias
        </button>
        <button type="button" id="cal-modal-tab-btn-rem" class="btn btn-secondary btn-sm" style="font-weight: 600;" onclick="calAlternarAbaModal('rem')">
          Remover / Desbloquear Feriado
        </button>
        <button type="button" id="cal-modal-tab-btn-lista" class="btn btn-secondary btn-sm" style="font-weight: 600;" onclick="calAlternarAbaModal('lista')">
          Minhas Modificações (${mods.adicionais.length + mods.removidos.length})
        </button>
      </div>

      <div class="day-modal-body" style="padding: 16px 20px; overflow-y: auto; flex: 1;">
        
        <!-- SEÇÃO 1: ADICIONAR DIA / PERÍODO -->
        <div id="cal-modal-sec-add">
          <div class="form-group" style="margin-bottom: 12px;">
            <label style="font-weight: 700; font-size: 12px;">Tipo de Inclusão:</label>
            <div style="display: flex; gap: 14px; margin-top: 4px;">
              <label style="font-size: 12px; display: flex; align-items: center; gap: 5px; cursor: pointer;">
                <input type="radio" name="cal-custom-tipo" value="pontual" checked onchange="calToggleModoPeriodo(false)"> Data Pontual
              </label>
              <label style="font-size: 12px; display: flex; align-items: center; gap: 5px; cursor: pointer;">
                <input type="radio" name="cal-custom-tipo" value="periodo" onchange="calToggleModoPeriodo(true)"> Período Contínuo (Recesso/Férias)
              </label>
            </div>
          </div>

          <div class="form-row" style="margin-bottom: 12px;">
            <div class="form-group" style="flex: 1;">
              <label for="cal-input-data-inicio" style="font-weight: 700; font-size: 12px;">Data Inicial:</label>
              <input type="date" id="cal-input-data-inicio" class="input-control" value="${dataPreenchida || `${_calAnoExibido}-01-01`}" style="font-size: 12px;">
            </div>
            <div class="form-group" id="cal-group-data-fim" style="flex: 1; display: none;">
              <label for="cal-input-data-fim" style="font-weight: 700; font-size: 12px;">Data Final:</label>
              <input type="date" id="cal-input-data-fim" class="input-control" value="${dataPreenchida || `${_calAnoExibido}-01-01`}" style="font-size: 12px;">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 12px;">
            <label for="cal-input-descricao" style="font-weight: 700; font-size: 12px;">Descrição do Evento / Motivo:</label>
            <input type="text" id="cal-input-descricao" class="input-control" placeholder="Ex: Semana de Planejamento, Férias Docentes..." style="font-size: 12px;">
          </div>

          <div style="font-size: 11.5px; color: #7c3aed; background: rgba(124, 58, 237, 0.08); padding: 9px 12px; border-radius: 6px; border-left: 3px solid #7c3aed; line-height: 1.4;">
            ★ Dias adicionados pelo usuário serão destacados na grade com preenchimento <strong>roxo forte, em negrito e borda espessa</strong>.
          </div>
        </div>

        <!-- SEÇÃO 2: REMOVER / DESBLOQUEAR FERIADO OFICIAL -->
        <div id="cal-modal-sec-rem" style="display: none;">
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">
            Se a sua unidade escolar for funcionar em uma data que consta como feriado ou emenda oficial, informe a data abaixo para desbloqueá-la como dia útil regular de aula.
          </p>

          <div class="form-group" style="margin-bottom: 12px;">
            <label for="cal-input-data-remover" style="font-weight: 700; font-size: 12px;">Data a Desbloquear / Tornar Dia Útil:</label>
            <input type="date" id="cal-input-data-remover" class="input-control" value="${dataPreenchida || `${_calAnoExibido}-01-01`}" style="font-size: 12px;">
          </div>

          <button type="button" class="btn btn-warning btn-sm" onclick="calExecutarDesbloqueio()" style="font-weight: 700;">
            Desbloquear Feriado Oficial nesta Data
          </button>
        </div>

        <!-- SEÇÃO 3: LISTA DE MODIFICAÇÕES ATIVAS DO USUÁRIO -->
        <div id="cal-modal-sec-lista" style="display: none;">
          ${(!temAdicionais && !temRemovidos) ? `
            <div style="text-align: center; padding: 24px 10px; color: var(--text-secondary); font-size: 12px; font-style: italic;">
              Nenhuma personalização cadastrada. O calendário está utilizando a base oficial pura.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${mods.adicionais.map(ad => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 6px;">
                  <div>
                    <strong style="color: #7c3aed; font-size: 12px;">+ ${ad.data.split('-').reverse().join('/')}</strong>
                    <span style="font-size: 12px; color: var(--text-primary); margin-left: 6px;">${ad.descricao}</span>
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" style="color: #ef4444; padding: 2px 6px; font-size: 11px;" onclick="calExcluirCustomizacao('${ad.data}')" title="Excluir esta adição">
                    ✕
                  </button>
                </div>
              `).join('')}

              ${mods.removidos.map(rm => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px;">
                  <div>
                    <strong style="color: #ef4444; font-size: 12px;">✕ Desbloqueado: ${rm.split('-').reverse().join('/')}</strong>
                    <span style="font-size: 11px; color: var(--text-secondary); margin-left: 6px;">(Feriado oficial desativado)</span>
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" style="color: #10b981; padding: 2px 6px; font-size: 11px;" onclick="calRestaurarOficial('${rm}')" title="Restaurar feriado oficial">
                    Restaurar
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>

      </div>

      <div class="day-modal-footer" style="padding: 10px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="calRestaurarPadrao()" style="color: #ef4444;" title="Limpar todas as modificações e restaurar base oficial">
          Restaurar Base Oficial
        </button>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="calFecharModalCustomizacao()">Fechar</button>
          <button type="button" id="cal-modal-btn-salvar" class="btn btn-primary btn-sm" onclick="calSalvarCustomizacao()" style="font-weight: 700; background: #7c3aed; border-color: #6d28d9;">
            Salvar Adição
          </button>
        </div>
      </div>
    </div>
  `;

  calToggleModoPeriodo(false);
  modal.style.display = "flex";
}

function calAlternarAbaModal(aba) {
  const secAdd = document.getElementById("cal-modal-sec-add");
  const secRem = document.getElementById("cal-modal-sec-rem");
  const secLista = document.getElementById("cal-modal-sec-lista");
  const btnAdd = document.getElementById("cal-modal-tab-btn-add");
  const btnRem = document.getElementById("cal-modal-tab-btn-rem");
  const btnLista = document.getElementById("cal-modal-tab-btn-lista");
  const btnSalvar = document.getElementById("cal-modal-btn-salvar");

  if (secAdd) secAdd.style.display = aba === "add" ? "block" : "none";
  if (secRem) secRem.style.display = aba === "rem" ? "block" : "none";
  if (secLista) secLista.style.display = aba === "lista" ? "block" : "none";

  if (btnSalvar) btnSalvar.style.display = aba === "add" ? "inline-flex" : "none";

  if (btnAdd) {
    btnAdd.style.background = aba === "add" ? "rgba(124, 58, 237, 0.15)" : "";
    btnAdd.style.color = aba === "add" ? "#7c3aed" : "";
    btnAdd.style.borderColor = aba === "add" ? "#7c3aed" : "";
  }
  if (btnRem) {
    btnRem.style.background = aba === "rem" ? "rgba(124, 58, 237, 0.15)" : "";
    btnRem.style.color = aba === "rem" ? "#7c3aed" : "";
    btnRem.style.borderColor = aba === "rem" ? "#7c3aed" : "";
  }
  if (btnLista) {
    btnLista.style.background = aba === "lista" ? "rgba(124, 58, 237, 0.15)" : "";
    btnLista.style.color = aba === "lista" ? "#7c3aed" : "";
    btnLista.style.borderColor = aba === "lista" ? "#7c3aed" : "";
  }
}

function calToggleModoPeriodo(isPeriodo) {
  const grpFim = document.getElementById("cal-group-data-fim");
  if (grpFim) {
    grpFim.style.display = isPeriodo ? "block" : "none";
  }
}

function calFecharModalCustomizacao() {
  const modal = document.getElementById("cal-modal-custom");
  if (modal) modal.style.display = "none";
}

function calSalvarCustomizacao() {
  const elDataInicio = document.getElementById("cal-input-data-inicio");
  const elDataFim = document.getElementById("cal-input-data-fim");
  const elDesc = document.getElementById("cal-input-descricao");
  const radios = document.getElementsByName("cal-custom-tipo");

  let isPeriodo = false;
  for (const r of radios) {
    if (r.checked && r.value === "periodo") isPeriodo = true;
  }

  const dtInicio = elDataInicio ? elDataInicio.value : "";
  const dtFim = elDataFim ? elDataFim.value : "";
  const desc = (elDesc && elDesc.value.trim()) ? elDesc.value.trim() : "Evento Personalizado";

  if (!dtInicio) {
    alert("Informe a data.");
    return;
  }

  if (isPeriodo && dtFim) {
    holidayService.adicionarPeriodoRecesso(dtInicio, dtFim, desc, "personalizado");
  } else {
    holidayService.adicionarCustomizacao({
      data: dtInicio,
      descricao: desc,
      categoria_id: "personalizado",
      bloqueia_aula: true
    });
  }

  calFecharModalCustomizacao();
  calRenderizar();

  if (typeof updateSchedule === "function") {
    updateSchedule();
  }
}

function calExecutarDesbloqueio() {
  const elDataRem = document.getElementById("cal-input-data-remover");
  const dt = elDataRem ? elDataRem.value : "";
  if (!dt) {
    alert("Informe a data a desbloquear.");
    return;
  }

  holidayService.desbloquearDiaOficial(dt);
  calFecharModalCustomizacao();
  calRenderizar();

  if (typeof updateSchedule === "function") {
    updateSchedule();
  }
}

function calExcluirCustomizacao(dateKey) {
  holidayService.removerCustomizacao(dateKey);
  calRenderizar();
  calAbrirModalCustomizacao();
  if (typeof updateSchedule === "function") {
    updateSchedule();
  }
}

function calRestaurarOficial(dateKey) {
  holidayService.restaurarDiaOficial(dateKey);
  calRenderizar();
  calAbrirModalCustomizacao();
  if (typeof updateSchedule === "function") {
    updateSchedule();
  }
}

function calRestaurarPadrao() {
  if (confirm("Deseja realmente limpar todas as personalizações locais de feriados e restaurar a base oficial?")) {
    holidayService.restaurarPadrao();
    calFecharModalCustomizacao();
    calRenderizar();
    if (typeof updateSchedule === "function") {
      updateSchedule();
    }
  }
}

// ==========================================================================
// IMPRESSÃO OFICIAL DO CALENDÁRIO ANUAL EM A4 PAISAGEM (LANDSCAPE)
// ==========================================================================

/**
 * Gera o documento HTML oficial formatado para impressão em página A4 Paisagem estrita (297mm x 210mm).
 */
function calGerarHtmlImpressao(ano) {
  const y = Number(ano) || _calAnoExibido;
  const calData = holidayService.getYearCalendar(y);
  const pascoaStr = calData.pascoa ? calData.pascoa.toLocaleDateString("pt-BR") : "";
  const escolaNome = document.getElementById("escola")?.value?.trim() || "SENAI - SERVIÇO NACIONAL DE APRENDIZAGEM INDUSTRIAL";
  const turmaCodigo = document.getElementById("codigoTurma")?.value?.trim() || "";
  const cursoNome = document.getElementById("nomeCurso")?.value?.trim() || "";
  const docenteNome = document.getElementById("docente")?.value?.trim() || "";

  const nomesMeses = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
  ];
  const siglasDias = ["D", "S", "T", "Q", "Q", "S", "S"];

  let htmlMeses = "";
  for (let m = 0; m < 12; m++) {
    const mesObj = calData.meses[m];
    const primeiroDiaSemana = mesObj.diaSemanaInicio;
    const totalDias = mesObj.totalDias;

    let cellsHtml = "";
    // Células vazias antes do dia 1
    for (let vazio = 0; vazio < primeiroDiaSemana; vazio++) {
      cellsHtml += `<div class="print-day-cell empty"></div>`;
    }

    // Dias do mês
    for (let d = 1; d <= totalDias; d++) {
      const diaObj = mesObj.dias[d - 1];
      const isSun = (primeiroDiaSemana + d - 1) % 7 === 0;
      let corClass = "";

      if (diaObj.temEvento && diaObj.eventInfo) {
        if (diaObj.isCustom) {
          corClass = "cor-user";
        } else {
          const cat = diaObj.eventInfo.categoriaId;
          if (cat === "feriado") corClass = "cor-1";
          else if (cat === "emenda") corClass = "cor-2";
          else if (cat === "ponto_facultativo") corClass = "cor-3";
          else if (cat === "formatura") corClass = "cor-4";
          else if (cat === "ferias_fic") corClass = "cor-5";
          else corClass = "cor-6";
        }
      } else if (isSun) {
        corClass = "is-sunday";
      }

      cellsHtml += `<div class="print-day-cell ${corClass}" title="${diaObj.temEvento ? diaObj.eventInfo.descricao : ''}">${d}</div>`;
    }

    // Preenche até múltiplo de 7 (35 ou 42 células) para alinhamento uniforme da grade
    const totalRenderizado = primeiroDiaSemana + totalDias;
    const totalMeta = totalRenderizado > 35 ? 42 : 35;
    for (let sobra = totalRenderizado; sobra < totalMeta; sobra++) {
      cellsHtml += `<div class="print-day-cell empty"></div>`;
    }

    htmlMeses += `
      <div class="print-month-card">
        <div class="print-month-title">${nomesMeses[m]}</div>
        <div class="print-weekdays-row">
          ${siglasDias.map(s => `<div class="print-weekday-label">${s}</div>`).join("")}
        </div>
        <div class="print-days-grid" style="grid-template-rows: repeat(${totalMeta / 7}, 1fr);">
          ${cellsHtml}
        </div>
      </div>
    `;
  }

  const agora = new Date();
  const dataEmissao = agora.toLocaleDateString("pt-BR") + " " + agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let metaTurmaHtml = "";
  if (turmaCodigo || cursoNome) {
    metaTurmaHtml = `
      <div><strong>Turma:</strong> ${turmaCodigo || "—"} | <strong>Curso:</strong> ${cursoNome || "—"}</div>
      ${docenteNome ? `<div><strong>Docente:</strong> ${docenteNome}</div>` : ""}
    `;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Calendário Escolar ${y} - SENAI</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      width: 297mm;
      height: 210mm;
      max-height: 210mm;
      padding: 6mm 9mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #003366;
      padding-bottom: 4px;
      margin-bottom: 5px;
    }
    .print-header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .senai-logo-text {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #e30613;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1;
    }
    .print-title {
      font-size: 13px;
      font-weight: 800;
      color: #003366;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }
    .print-subtitle {
      font-size: 9px;
      color: #475569;
      font-weight: 600;
      line-height: 1.2;
    }
    .print-header-meta {
      text-align: right;
      font-size: 8.5px;
      color: #475569;
      line-height: 1.3;
    }
    .print-grid-months {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 5px 7px;
      flex: 1;
      margin-bottom: 5px;
      min-height: 0;
    }
    .print-month-card {
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }
    .print-month-title {
      background: #003366;
      color: #ffffff;
      text-align: center;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 0;
      letter-spacing: 0.5px;
      line-height: 1.1;
    }
    .print-weekdays-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      padding: 1px 0;
      text-align: center;
    }
    .print-weekday-label {
      font-size: 7.5px;
      font-weight: 700;
      color: #475569;
      line-height: 1.1;
    }
    .print-days-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      flex: 1;
      padding: 1px 1px;
      gap: 1px;
      align-content: stretch;
    }
    .print-day-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 600;
      color: #0f172a;
      border-radius: 2px;
      line-height: 1;
    }
    .print-day-cell.is-sunday {
      color: #94a3b8;
    }
    .print-day-cell.empty {
      background: transparent;
    }
    .print-day-cell.cor-1 {
      background: #dc2626 !important;
      color: #ffffff !important;
      font-weight: 800 !important;
    }
    .print-day-cell.cor-2 {
      background: #ea580c !important;
      color: #ffffff !important;
      font-weight: 800 !important;
    }
    .print-day-cell.cor-3 {
      background: #0284c7 !important;
      color: #ffffff !important;
      font-weight: 800 !important;
    }
    .print-day-cell.cor-4 {
      background: #7c3aed !important;
      color: #ffffff !important;
      font-weight: 800 !important;
    }
    .print-day-cell.cor-5 {
      background: #059669 !important;
      color: #ffffff !important;
      font-weight: 800 !important;
    }
    .print-day-cell.cor-6 {
      background: #475569 !important;
      color: #ffffff !important;
      font-weight: 800 !important;
    }
    .print-day-cell.cor-user {
      background: #7c3aed !important;
      color: #ffffff !important;
      font-weight: 900 !important;
      border: 1px solid #4c1d95 !important;
    }
    .print-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 3px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      line-height: 1.2;
    }
    .print-legend-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 12px;
      align-items: center;
    }
    .print-legend-pill {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 8px;
      font-weight: 600;
      color: #1e293b;
    }
    .print-swatch {
      width: 9px;
      height: 9px;
      border-radius: 2px;
      display: inline-block;
      flex-shrink: 0;
    }
    .print-footer-info {
      color: #64748b;
      font-size: 7.5px;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="print-header-brand">
      <div class="senai-logo-text">SENAI</div>
      <div style="border-left: 2px solid #cbd5e1; padding-left: 10px;">
        <div class="print-title">CALENDÁRIO ESCOLAR / INSTITUCIONAL • ${y}</div>
        <div class="print-subtitle">${escolaNome}</div>
      </div>
    </div>
    <div class="print-header-meta">
      ${metaTurmaHtml}
      <div><strong>Emissão:</strong> ${dataEmissao} | <strong>Páscoa:</strong> ${pascoaStr}</div>
    </div>
  </div>

  <div class="print-grid-months">
    ${htmlMeses}
  </div>

  <div class="print-footer">
    <div class="print-legend-row">
      <div class="print-legend-pill">
        <span class="print-swatch" style="background:#dc2626;"></span>
        <span>Feriados (cor 1)</span>
      </div>
      <div class="print-legend-pill">
        <span class="print-swatch" style="background:#ea580c;"></span>
        <span>Emenda (cor 2)</span>
      </div>
      <div class="print-legend-pill">
        <span class="print-swatch" style="background:#0284c7;"></span>
        <span>Ponto Facultativo (cor 3)</span>
      </div>
      <div class="print-legend-pill">
        <span class="print-swatch" style="background:#7c3aed;"></span>
        <span>Formatura (cor 4)</span>
      </div>
      <div class="print-legend-pill">
        <span class="print-swatch" style="background:#059669;"></span>
        <span>Férias FIC (cor 5)</span>
      </div>
      <div class="print-legend-pill">
        <span class="print-swatch" style="background:#475569;"></span>
        <span>A Decidir (cor 6)</span>
      </div>
      <div class="print-legend-pill">
        <span class="print-swatch" style="background:#7c3aed; border:1px solid #4c1d95;"></span>
        <span>Adicionado Usuário</span>
      </div>
    </div>
    <div class="print-footer-info">
      SENAI SP • Documento gerado eletronicamente em conformidade com a folha oficial A4 Paisagem.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Aciona o diálogo de impressão nativo do navegador para o Calendário Anual A4 Paisagem
 */
async function calImprimirCalendario(ano) {
  const y = Number(ano) || _calAnoExibido;
  const htmlDoc = calGerarHtmlImpressao(y);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlDoc);
  doc.close();

  await new Promise((r) => setTimeout(r, 250));

  try {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  } catch (err) {
    console.error("Erro na impressão do calendário:", err);
    window.print();
  } finally {
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 4000);
  }
}

if (typeof window !== "undefined") {
  window.calImprimirCalendario = calImprimirCalendario;
  window.calGerarHtmlImpressao = calGerarHtmlImpressao;
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    calInit();
  });
}

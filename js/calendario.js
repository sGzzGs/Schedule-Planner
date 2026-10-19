// Created at: 2026-10-19 14:24
/**
 * calendario.js
 * Controlador da Aba 3: Calendário Escolar Anual (Motor Universal de Feriados SENAI).
 *
 * Funcionalidades:
 * - Grade Anual de 12 Meses com layout panorâmico Warm Timber.
 * - Suporte nativo aos anos 2026 e 2027 com novo catálogo cromático oficial.
 * - Estilo translúcido nos dias com bordas sólidas.
 * - Menu minimalista de contexto (acionado por botão direito ou clique direto na célula).
 * - Slider dropdown suave com bolinhas coloridas preenchidas e ícone de lixeira para exclusão.
 * - Tooltips dinâmicos e impressão A4 Paisagem oficial.
 */

let _calAnoExibido = 2026;
let _calTooltipEl = null;

const DICIONARIO_TIPOS_CALENDARIO = [
  { id: "feriado", label: "Feriados", cor: "#FF0000" },
  { id: "emenda", label: "Emenda de Feriado", cor: "#FFC000" },
  { id: "ponto_facultativo", label: "Ponto Facultativo", cor: "#808080" },
  { id: "formatura", label: "Formatura CAI/CT", cor: "#00B050" },
  { id: "ferias_fic", label: "Férias FIC", cor: "#FFFF00" },
  { id: "a_decidir", label: "A Decidir", cor: "#00B0F0" }
];

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
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: #8D7B6F;">Motor de feriados não carregado.</div>`;
    return;
  }

  const isCoord = Boolean(
    typeof window !== 'undefined' &&
    window.authService &&
    window.authService.currentUser &&
    window.authService.currentUser.role === 'coordenacao'
  );

  const calData = holidayService.getYearCalendar(_calAnoExibido);
  const aulasMap = calObterMapaAulasTurma(_calAnoExibido);
  const anoTurma = calObterAnoTurmaAtiva();

  // 1. Cabeçalho de Navegação e Ações
  const htmlTopBar = `
    <header class="bg-white border border-[#E8E2D5] rounded-2xl px-6 py-4 shadow-warm-sm flex flex-wrap items-center justify-between gap-4" data-purpose="top-navigation">
      <div class="flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-xl bg-[#FAF6EE] border border-[#E8E2D5] flex items-center justify-center text-[#4A2A1A] shadow-inner">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold tracking-tight text-[#4A2A1A]">Calendário Escolar</h1>
          </div>
        </div>
      </div>
      <!-- Controles de Ano e Ações -->
      <div class="flex items-center flex-wrap gap-2.5">
        <div class="flex items-center bg-[#FAF8F3] border border-[#E8E2D5] rounded-full px-2 py-1 shadow-inner">
          <button type="button" class="w-7 h-7 rounded-full flex items-center justify-center text-[#4A2A1A] hover:bg-white transition" title="Ano Anterior" onclick="calMudarAno(${_calAnoExibido - 1})">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          </button>
          <span class="px-3 text-sm font-bold tracking-wider text-[#4A2A1A]">${_calAnoExibido}</span>
          <button type="button" class="w-7 h-7 rounded-full flex items-center justify-center text-[#4A2A1A] hover:bg-white transition" title="Próximo Ano" onclick="calMudarAno(${_calAnoExibido + 1})">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          </button>
        </div>
        <button type="button" class="px-4 py-2 bg-[#4A2A1A] text-white rounded-full text-xs font-bold hover:bg-[#361E12] transition shadow-sm" onclick="calMudarAno(${anoTurma})">
          Ano da Turma (${anoTurma})
        </button>
        <button type="button" id="cal-btn-gerenciar-dia" style="${isCoord ? '' : 'opacity: 0.45; cursor: not-allowed; filter: grayscale(0.6);'}" class="px-4 py-2 bg-[#4A2A1A] text-white rounded-full text-xs font-bold hover:bg-[#361E12] transition shadow-sm flex items-center gap-1.5" title="${isCoord ? 'Adicionar ou remover dias letivos/feriados' : 'Acesso restrito à Coordenação'}" onclick="calAbrirModalNovoDia()">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          Adicionar / Gerenciar Dia
        </button>
        <button type="button" class="px-4 py-2 bg-[#FAF8F3] text-[#4A2A1A] border border-[#E8E2D5] rounded-full text-xs font-bold hover:bg-white transition shadow-sm flex items-center gap-1.5" onclick="calImprimirCalendario()">
          <svg class="w-3.5 h-3.5 text-[#8D7B6F]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          Imprimir (A4)
        </button>
      </div>
    </header>
  `;

  // 2. Barra de Legendas com as 6 novas cores e bubbles
  const htmlLegendas = `
    <div class="bg-white border border-[#E8E2D5] rounded-2xl px-5 py-3 shadow-warm-sm flex flex-wrap items-center justify-between gap-3 text-xs" data-purpose="calendar-legend">
      <div class="w-full flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <!-- Encontros Letivos -->
        <div class="flex items-center flex-shrink-0 md:pr-4 md:border-r border-[#E8E2D5]">
          <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FAF8F3] border border-[#F0ECE3] shadow-xs">
            <span class="w-3.5 h-1 rounded-full bg-[#1A73E8] flex-shrink-0"></span>
            <span class="font-bold text-[#4A2A1A] text-xs tracking-tight">Encontros Letivos</span>
          </div>
        </div>
        <!-- 6 Categorias Oficiais com Bubbles -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 w-full font-medium text-[#4A2A1A]">
          ${DICIONARIO_TIPOS_CALENDARIO.map(tipo => `
            <div class="flex items-center gap-2 p-1.5 rounded-xl bg-[#FAF8F3] border border-[#F0ECE3]">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background: ${tipo.cor};"></span>
              <span class="truncate text-[11px] font-semibold">${tipo.label}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  // 3. Matriz dos 12 Meses
  let htmlMeses = "";
  let totalFeriados = 0;
  let totalRecessos = 0;

  for (const mes of calData.meses) {
    const totalEventosMes = mes.eventosMes.length;
    const badgeTexto = totalEventosMes > 0 ? `${totalEventosMes} evento${totalEventosMes > 1 ? "s" : ""}` : "0 eventos";

    for (const ev of mes.eventosMes) {
      if (ev.categoriaId === "feriado") {
        totalFeriados++;
      } else {
        totalRecessos++;
      }
    }

    let diasHtml = "";
    let diaAtual = 1;
    const totalDias = mes.totalDias;
    const offsetInicio = mes.diaSemanaInicio;

    // Espaços vazios antes do dia 1
    for (let c = 0; c < offsetInicio; c++) {
      diasHtml += `<div class="day-cell day-empty"></div>`;
    }

    while (diaAtual <= totalDias) {
      const col = (offsetInicio + diaAtual - 1) % 7;
      const diaItem = mes.dias[diaAtual - 1];
      const hasEvent = diaItem.temEvento;
      const ev = diaItem.eventInfo;
      const aulaTurma = aulasMap.get(diaItem.data);

      let cellClasses = ["day-cell"];
      let dataAttrs = `data-date="${diaItem.data}" data-day="${diaAtual}" data-weekday="${col}" data-month="${mes.nomeMes}"`;

      if (hasEvent && ev) {
        const catId = ev.categoriaId || "feriado";
        if (catId === "feriado") cellClasses.push("highlight-feriado", "font-bold");
        else if (catId === "emenda") cellClasses.push("highlight-emenda", "font-bold");
        else if (catId === "ponto_facultativo") cellClasses.push("highlight-ponto_facultativo", "font-bold");
        else if (catId === "formatura") cellClasses.push("highlight-formatura", "font-bold");
        else if (catId === "ferias_fic") cellClasses.push("highlight-ferias_fic", "font-bold");
        else if (catId === "a_decidir") cellClasses.push("highlight-a_decidir", "font-bold");
        else cellClasses.push("highlight-feriado", "font-bold");

        dataAttrs += ` data-has-event="true" data-cat-id="${catId}" data-desc="${encodeURIComponent(ev.descricao || '')}" data-cat="${encodeURIComponent(ev.nomeCategoria || '')}" data-cor="${encodeURIComponent(ev.corTema || '')}"`;
      }

      if (aulaTurma) {
        cellClasses.push("has-active-lesson");
        if (!hasEvent) {
          cellClasses.push("font-bold", "text-[#1A73E8]");
        }
        dataAttrs += ` data-has-lesson="true" data-lesson-num="${aulaTurma.numAula || ''}" data-lesson-tipo="${aulaTurma.tipo || ''}" data-lesson-amb="${aulaTurma.ambiente || ''}" data-lesson-hours="${aulaTurma.horas || ''}"`;
      }

      diasHtml += `
        <div class="${cellClasses.join(" ")}" ${dataAttrs}
             onmouseenter="calOnMouseEnterDay(this, event)"
             onmouseleave="calOnMouseLeaveDay()"
             onclick="calOnClickDay(this, event)"
             oncontextmenu="calOnContextMenuDay(this, event)">
          ${diaAtual}
        </div>
      `;

      diaAtual++;
    }

    htmlMeses += `
      <div class="bg-white border border-[#E8E2D5] rounded-2xl p-4 shadow-warm-sm hover:shadow-warm-card transition" data-purpose="month-card">
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-[#F0ECE3]">
          <h2 class="font-bold text-base text-[#4A2A1A]">${mes.nomeMes}</h2>
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${totalEventosMes > 0 ? 'bg-[#FAF6EE] text-[#4A2A1A] border border-[#E8E2D5]' : 'bg-[#FAF6EE] text-[#8D7B6F] border border-[#E8E2D5]'}">${badgeTexto}</span>
        </div>
        <div class="grid grid-cols-7 gap-y-1 text-center text-xs font-semibold text-[#8D7B6F] mb-1.5">
          <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
        </div>
        <div class="grid grid-cols-7 gap-y-1 text-center text-xs">
          ${diasHtml}
        </div>
      </div>
    `;
  }

  const totalDiasLetivos = aulasMap.size > 0 ? aulasMap.size : 200;

  // 4. Barra de Estatísticas do Calendário
  const htmlFooter = `
    <div class="bg-white border border-[#E8E2D5] rounded-2xl p-4 shadow-warm-sm flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-[#4A2A1A]" data-purpose="calendar-summary-footer">
      <div class="flex items-center gap-6 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Dias Letivos Previstos: <strong class="text-[#4A2A1A]">${totalDiasLetivos} dias</strong></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-[#FF0000]"></span>
          <span>Feriados: <strong class="text-[#4A2A1A]">${totalFeriados} dias</strong></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-[#00B050]"></span>
          <span>Recessos &amp; Eventos: <strong class="text-[#4A2A1A]">${totalRecessos} dias</strong></span>
        </div>
      </div>
      <div class="text-[#8D7B6F]">
        Ano Exibido: <span class="font-semibold text-[#4A2A1A]">${_calAnoExibido}</span> • Botão direito no dia para editar/excluir
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="cal-stitch-container">
      ${htmlTopBar}
      ${htmlLegendas}
      <main class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-purpose="twelve-month-calendar-grid">
        ${htmlMeses}
      </main>
      ${htmlFooter}
    </div>
  `;
}

/**
 * Tooltip dinâmico em hover
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

    tooltipHtml += `
      <div class="cal-tooltip-title">${desc}</div>
      <div class="cal-tooltip-category">
        <span class="cal-color-bubble" style="background: ${cor};"></span>
        <span>${cat}</span>
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

function calOnMouseLeaveDay() {
  if (_calTooltipEl) {
    _calTooltipEl.style.display = "none";
  }
}

/**
 * Clique comum no dia
 */
function calOnClickDay(el, event) {
  if (event) {
    event.stopPropagation();
  }
  const dateKey = el.dataset.date;
  if (!dateKey) return;
  const rect = el.getBoundingClientRect();
  calAbrirMenuMinimalista(dateKey, rect.left + rect.width / 2, rect.bottom + 6);
}

/**
 * Clique com o botão direito no dia
 */
function calOnContextMenuDay(el, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const isCoord = Boolean(
    typeof window !== 'undefined' &&
    window.authService &&
    window.authService.currentUser &&
    window.authService.currentUser.role === 'coordenacao'
  );
  if (typeof window !== 'undefined' && window.authService && !isCoord) {
    if (typeof window.compMostrarToast === 'function') {
      window.compMostrarToast('Acesso Restrito', 'Necessária Autenticação de Coordenação.', 'warning');
    } else if (typeof window.showToast === 'function') {
      window.showToast('Necessária Autenticação de Coordenação.');
    } else if (typeof alert === 'function') {
      alert('Necessária Autenticação de Coordenação.');
    }
    if (typeof window.authService?.abrirModalLogin === 'function') {
      window.authService.abrirModalLogin();
    }
    return;
  }
  const dateKey = el.dataset.date;
  if (!dateKey) return;
  calAbrirMenuMinimalista(dateKey, event.clientX, event.clientY);
}

/**
 * Controle e Gerenciamento do Modal Oficial Stitch: Adicionar / Remover Dia do Calendário
 */
let _calAbaAtivaGerenciar = 'add';

function calAbrirModalNovoDia(dataPrefill) {
  const isCoord = Boolean(
    typeof window !== 'undefined' &&
    window.authService &&
    window.authService.currentUser &&
    window.authService.currentUser.role === 'coordenacao'
  );
  if (typeof window !== 'undefined' && window.authService && !isCoord) {
    if (typeof window.compMostrarToast === 'function') {
      window.compMostrarToast('Acesso Restrito', 'Necessária Autenticação de Coordenação.', 'warning');
    } else if (typeof window.showToast === 'function') {
      window.showToast('Necessária Autenticação de Coordenação.');
    } else if (typeof alert === 'function') {
      alert('Necessária Autenticação de Coordenação.');
    }
    if (typeof window.authService?.abrirModalLogin === 'function') {
      window.authService.abrirModalLogin();
    }
    return;
  }
  const modal = document.getElementById('cal-modal-gerenciar-dia');
  if (!modal) {
    const hojeKey = HolidayService.formatDateKey(new Date());
    calAbrirMenuMinimalista(hojeKey, window.innerWidth / 2, window.innerHeight / 2, true);
    return;
  }

  const hoje = dataPrefill || HolidayService.formatDateKey(new Date());
  const inputIni = document.getElementById('cal-data-inicial');
  const inputFim = document.getElementById('cal-data-final');
  const inputDesc = document.getElementById('cal-descricao-evento');
  const inputRemover = document.getElementById('cal-data-remover');

  if (inputIni) inputIni.value = hoje;
  if (inputFim) inputFim.value = hoje;
  if (inputRemover) inputRemover.value = hoje;

  // Pré-preenchimento de descrição caso exista
  const dateInfo = holidayService.getDateInfo(hoje);
  if (inputDesc) {
    inputDesc.value = (dateInfo && dateInfo.descricao) ? dateInfo.descricao : '';
  }

  calAlternarAbaGerenciar('add');
  calAtualizarBadgeModificacoes();

  modal.style.display = 'flex';
}

function calFecharModalNovoDia() {
  const modal = document.getElementById('cal-modal-gerenciar-dia');
  if (modal) modal.style.display = 'none';
}

function calAlternarAbaGerenciar(aba) {
  _calAbaAtivaGerenciar = aba;

  const btnAdd = document.getElementById('cal-tab-btn-add');
  const btnRemove = document.getElementById('cal-tab-btn-remove');
  const btnMods = document.getElementById('cal-tab-btn-modificacoes');

  const contentAdd = document.getElementById('cal-content-add');
  const contentRemove = document.getElementById('cal-content-remove');
  const contentMods = document.getElementById('cal-content-modificacoes');

  const btnSalvar = document.getElementById('cal-btn-salvar-adicao');

  const activeClasses = ['bg-purple-50', 'text-purple-700', 'border-purple-200', 'font-bold'];
  const inactiveClasses = ['bg-timber-50', 'text-timber-500', 'border-timber-200/80', 'font-medium'];

  function setBtnState(btn, isActive) {
    if (!btn) return;
    if (isActive) {
      btn.classList.remove(...inactiveClasses);
      btn.classList.add(...activeClasses);
    } else {
      btn.classList.remove(...activeClasses);
      btn.classList.add(...inactiveClasses);
    }
  }

  setBtnState(btnAdd, aba === 'add');
  setBtnState(btnRemove, aba === 'remove');
  setBtnState(btnMods, aba === 'modificacoes');

  if (contentAdd) contentAdd.style.display = aba === 'add' ? 'block' : 'none';
  if (contentRemove) contentRemove.style.display = aba === 'remove' ? 'block' : 'none';
  if (contentMods) contentMods.style.display = aba === 'modificacoes' ? 'block' : 'none';

  if (btnSalvar) {
    if (aba === 'add') {
      btnSalvar.style.display = 'inline-flex';
      btnSalvar.textContent = 'Salvar Adição';
    } else if (aba === 'remove') {
      btnSalvar.style.display = 'inline-flex';
      btnSalvar.textContent = 'Desbloquear Dia';
    } else {
      btnSalvar.style.display = 'none';
    }
  }

  if (aba === 'modificacoes') {
    calRenderizarListaModificacoes();
  }
}

function calMudarTipoInclusao(tipo) {
  const wrapFim = document.getElementById('cal-wrap-data-final');
  if (wrapFim) {
    wrapFim.style.display = tipo === 'continuo' ? 'block' : 'none';
  }
}

function calAtualizarBadgeModificacoes() {
  const mods = holidayService.getTodasModificacoesUsuario();
  const total = (mods.adicionais ? mods.adicionais.length : 0) + (mods.removidos ? mods.removidos.length : 0);
  const badge = document.getElementById('cal-badge-total-mods');
  if (badge) badge.textContent = total;
}

function calRenderizarListaModificacoes() {
  const container = document.getElementById('cal-lista-modificacoes');
  if (!container) return;

  const mods = holidayService.getTodasModificacoesUsuario();
  const adicionais = mods.adicionais || [];
  const removidos = mods.removidos || [];

  if (adicionais.length === 0 && removidos.length === 0) {
    container.innerHTML = '<div class="p-4 text-center text-timber-400 italic bg-timber-50 rounded-xl">Nenhuma modificação manual registrada. O calendário segue a base oficial.</div>';
    return;
  }

  let listHtml = '';
  function formatIso(iso) {
    if (!iso) return '';
    const parts = iso.split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : iso;
  }

  adicionais.forEach(item => {
    listHtml += `
      <div class="flex items-center justify-between p-3 bg-white border border-timber-200 rounded-xl shadow-xs">
        <div>
          <span class="font-bold text-timber-800">${formatIso(item.data)}</span>
          <span class="text-timber-600 ml-2">${item.descricao || 'Feriado Customizado'}</span>
          <span class="inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Adicionado</span>
        </div>
        <button type="button" onclick="calExcluirModificacao('${item.data}')" class="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded" title="Remover modificação">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
        </button>
      </div>
    `;
  });

  removidos.forEach(dateKey => {
    listHtml += `
      <div class="flex items-center justify-between p-3 bg-white border border-timber-200 rounded-xl shadow-xs">
        <div>
          <span class="font-bold text-timber-800">${formatIso(dateKey)}</span>
          <span class="text-timber-600 ml-2">Dia Desbloqueado para Aula</span>
          <span class="inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">Desbloqueado</span>
        </div>
        <button type="button" onclick="calExcluirModificacao('${dateKey}')" class="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded" title="Restaurar padrão oficial">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
        </button>
      </div>
    `;
  });

  container.innerHTML = listHtml;
}

function calExcluirModificacao(dateKey) {
  holidayService.restaurarDiaOficial(dateKey);
  holidayService.customizations.itensAdicionais = holidayService.customizations.itensAdicionais.filter(i => i.data !== dateKey);
  holidayService.saveCustomizations();
  calAtualizarBadgeModificacoes();
  calRenderizarListaModificacoes();
  calRenderizar();
}

function calConfirmarAdicaoModal() {
  if (_calAbaAtivaGerenciar === 'add') {
    const inputIni = document.getElementById('cal-data-inicial');
    const inputFim = document.getElementById('cal-data-final');
    const inputDesc = document.getElementById('cal-descricao-evento');
    const radioContinuo = document.querySelector('input[name="cal_tipo_inclusao"][value="continuo"]');
    const isContinuo = radioContinuo ? radioContinuo.checked : false;

    const dtIniStr = inputIni ? inputIni.value : '';
    const desc = (inputDesc ? inputDesc.value : '').trim() || 'Férias / Recesso';

    if (!dtIniStr) {
      alert('Por favor, informe a data inicial.');
      return;
    }

    if (isContinuo) {
      const dtFimStr = inputFim ? inputFim.value : '';
      if (!dtFimStr) {
        alert('Por favor, informe a data final do período.');
        return;
      }

      let cur = new Date(dtIniStr + 'T12:00:00');
      const end = new Date(dtFimStr + 'T12:00:00');

      if (cur > end) {
        alert('A data inicial não pode ser posterior à data final.');
        return;
      }

      while (cur <= end) {
        const k = HolidayService.formatDateKey(cur);
        holidayService.salvarOuAtualizarFeriado({
          data: k,
          descricao: desc,
          categoria_id: 'ferias_fic'
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      holidayService.salvarOuAtualizarFeriado({
        data: dtIniStr,
        descricao: desc,
        categoria_id: 'feriado'
      });
    }

    calFecharModalNovoDia();
    calRenderizar();
    if (typeof window.showToast === 'function') {
      window.showToast('Data(s) adicionada(s) ao calendário com sucesso!');
    }
  } else if (_calAbaAtivaGerenciar === 'remove') {
    const inputRemover = document.getElementById('cal-data-remover');
    const dtRemover = inputRemover ? inputRemover.value : '';
    if (!dtRemover) {
      alert('Por favor, selecione a data a desbloquear.');
      return;
    }

    holidayService.desbloquearDiaOficial(dtRemover);
    calFecharModalNovoDia();
    calRenderizar();
    if (typeof window.showToast === 'function') {
      window.showToast('Dia desbloqueado para aulas com sucesso!');
    }
  }
}

function calRestaurarBaseOficialConfirm() {
  if (confirm('Deseja realmente restaurar a base oficial de feriados e eventos do SENAI? Todas as inclusões e exclusões manuais serão resetadas.')) {
    holidayService.restaurarPadrao();
    calFecharModalNovoDia();
    calRenderizar();
    if (typeof window.showToast === 'function') {
      window.showToast('Base oficial do calendário restaurada com sucesso!');
    }
  }
}

// ==========================================================================
// MENU MINIMALISTA DE CONTEXTO (WARM TIMBER)
// ==========================================================================

let _calMenuCurrentDate = null;
let _calMenuSelectedCatId = "feriado";

/**
 * Abre o menu minimalista flutuante próximo ao cursor ou centralizado
 */
function calAbrirMenuMinimalista(dateKey, posX, posY, isCentered = false) {
  const isCoord = Boolean(
    typeof window !== 'undefined' &&
    window.authService &&
    window.authService.currentUser &&
    window.authService.currentUser.role === 'coordenacao'
  );
  if (typeof window !== 'undefined' && window.authService && !isCoord) {
    if (typeof window.compMostrarToast === 'function') {
      window.compMostrarToast('Acesso Restrito', 'Necessária Autenticação de Coordenação.', 'warning');
    } else if (typeof window.showToast === 'function') {
      window.showToast('Necessária Autenticação de Coordenação.');
    } else if (typeof alert === 'function') {
      alert('Necessária Autenticação de Coordenação.');
    }
    if (typeof window.authService?.abrirModalLogin === 'function') {
      window.authService.abrirModalLogin();
    }
    return;
  }
  calFecharMenuMinimalista();

  _calMenuCurrentDate = dateKey;
  const dateInfo = dateKey ? holidayService.getDateInfo(dateKey) : null;
  const hasExisting = !!(dateInfo && dateInfo.descricao);

  _calMenuSelectedCatId = hasExisting ? (dateInfo.categoriaId || "feriado") : "feriado";
  const descInicial = hasExisting ? dateInfo.descricao : "";

  // Data formatada para exibição no topo do menu
  let dataDisplay = "Novo Feriado / Evento";
  if (dateKey) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    const diaSemanaNomes = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    dataDisplay = `${d} de ${mesesNomes[m - 1]} de ${y} • ${diaSemanaNomes[dateObj.getDay()]}`;
  }

  // Obter item ativo do dropdown
  const catAtiva = DICIONARIO_TIPOS_CALENDARIO.find(t => t.id === _calMenuSelectedCatId) || DICIONARIO_TIPOS_CALENDARIO[0];

  // Backdrop invisível ou translúcido
  const backdrop = document.createElement("div");
  backdrop.id = "cal-minimalist-backdrop";
  backdrop.className = "cal-minimalist-backdrop";
  backdrop.onclick = calFecharMenuMinimalista;
  document.body.appendChild(backdrop);

  // Card do menu
  const card = document.createElement("div");
  card.id = "cal-minimalist-card";
  card.className = "cal-minimalist-card";

  card.innerHTML = `
    <!-- Top Header do Menu -->
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 12px;">
      <div>
        <div style="font-size: 13px; font-weight: 800; color: #4A2A1A; line-height: 1.3;">${dataDisplay}</div>
        <div style="font-size: 11px; color: #8D7B6F; margin-top: 2px;">
          ${hasExisting ? "Editar ou excluir feriado deste dia" : "Definir novo feriado ou evento"}
        </div>
      </div>
      <button type="button" onclick="calFecharMenuMinimalista()" style="background: transparent; border: none; font-size: 18px; line-height: 1; color: #8D7B6F; cursor: pointer; padding: 2px;" title="Fechar">&times;</button>
    </div>

    <!-- Campo Data (se aberto pelo topo sem dia específico) -->
    ${!dateKey ? `
      <div style="margin-bottom: 12px;">
        <label for="cal-min-date-input" style="display: block; font-size: 11px; font-weight: 700; color: #4A2A1A; margin-bottom: 4px;">Data:</label>
        <input type="date" id="cal-min-date-input" value="${_calAnoExibido}-01-01" style="width: 100%; box-sizing: border-box; background: #FFFFFF; border: 1px solid #E8E2D5; border-radius: 8px; padding: 7px 10px; font-size: 12px; font-family: inherit; color: #4A2A1A; outline: none;">
      </div>
    ` : ""}

    <!-- Campo Descrição -->
    <div style="margin-bottom: 12px;">
      <label for="cal-min-desc-input" style="display: block; font-size: 11px; font-weight: 700; color: #4A2A1A; margin-bottom: 4px;">Descrição:</label>
      <input type="text" id="cal-min-desc-input" value="${descInicial}" placeholder="Ex: Feriado, Recesso Escolar..." style="width: 100%; box-sizing: border-box; background: #FFFFFF; border: 1px solid #E8E2D5; border-radius: 8px; padding: 7px 10px; font-size: 12px; font-family: inherit; color: #4A2A1A; outline: none;">
    </div>

    <!-- Slider Dropdown do Tipo -->
    <div style="margin-bottom: 16px;">
      <label style="display: block; font-size: 11px; font-weight: 700; color: #4A2A1A; margin-bottom: 4px;">Tipo:</label>
      <div class="cal-slider-dropdown-wrap">
        <button type="button" id="cal-dropdown-trigger" class="cal-slider-dropdown-btn" onclick="calToggleSliderDropdown(event)">
          <span style="display: flex; align-items: center; gap: 8px;">
            <span id="cal-selected-bubble" class="cal-color-bubble" style="background: ${catAtiva.cor};"></span>
            <span id="cal-selected-label">${catAtiva.label}</span>
          </span>
          <svg style="width: 14px; height: 14px; color: #8D7B6F;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>

        <div id="cal-dropdown-options" class="cal-slider-dropdown-options">
          ${DICIONARIO_TIPOS_CALENDARIO.map(tipo => `
            <div class="cal-dropdown-item" onclick="calSelecionarTipoDropdown('${tipo.id}', '${tipo.label}', '${tipo.cor}')">
              <span class="cal-color-bubble" style="background: ${tipo.cor};"></span>
              <span style="font-weight: 600;">${tipo.label}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <!-- Rodapé de Ações (Warm Timber) -->
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 10px; border-top: 1px solid #E8E2D5;">
      ${hasExisting ? `
        <button type="button" onclick="calExcluirDiaMenu()" title="Excluir este feriado / tornar dia útil" style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; background: #FDF2F2; border: 1px solid #FCA5A5; color: #DC2626; cursor: pointer; transition: background 0.15s;">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </button>
      ` : `<div></div>`}

      <div style="display: flex; gap: 8px; flex: 1; justify-content: flex-end;">
        <button type="button" onclick="calFecharMenuMinimalista()" style="padding: 7px 12px; background: transparent; color: #8D7B6F; border: 1px solid #E8E2D5; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;">
          Cancelar
        </button>
        <button type="button" onclick="calSalvarDiaMenu()" style="padding: 7px 16px; background: #4A2A1A; color: #FFFFFF; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.15s;">
          Salvar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(card);

  // Posicionamento inteligente na tela
  const cardWidth = 310;
  const cardHeight = 240;

  let left, top;

  if (isCentered) {
    left = Math.max(16, (window.innerWidth - cardWidth) / 2);
    top = Math.max(16, (window.innerHeight - cardHeight) / 2);
  } else {
    left = posX - (cardWidth / 2);
    top = posY + 8;

    if (left + cardWidth > window.innerWidth - 16) {
      left = window.innerWidth - cardWidth - 16;
    }
    if (left < 16) left = 16;

    if (top + cardHeight > window.innerHeight - 16) {
      top = posY - cardHeight - 16;
      if (top < 16) top = 16;
    }
  }

  card.style.left = `${left}px`;
  card.style.top = `${top}px`;

  // Foco no campo de descrição
  setTimeout(() => {
    const inputDesc = document.getElementById("cal-min-desc-input");
    if (inputDesc) inputDesc.focus();
  }, 50);
}

/**
 * Alterna a abertura com animação suave do slider dropdown
 */
function calToggleSliderDropdown(event) {
  if (event) event.stopPropagation();
  const opts = document.getElementById("cal-dropdown-options");
  if (opts) {
    opts.classList.toggle("open");
  }
}

/**
 * Seleciona um tipo no dropdown
 */
function calSelecionarTipoDropdown(id, label, cor) {
  _calMenuSelectedCatId = id;

  const lbl = document.getElementById("cal-selected-label");
  const bbl = document.getElementById("cal-selected-bubble");
  const opts = document.getElementById("cal-dropdown-options");

  if (lbl) lbl.textContent = label;
  if (bbl) bbl.style.background = cor;
  if (opts) opts.classList.remove("open");
}

/**
 * Salva a alteração ou novo feriado a partir do menu minimalista
 */
function calSalvarDiaMenu() {
  let targetDate = _calMenuCurrentDate;
  if (!targetDate) {
    const dateInput = document.getElementById("cal-min-date-input");
    targetDate = dateInput ? dateInput.value : null;
  }

  if (!targetDate) {
    alert("Informe uma data válida.");
    return;
  }

  const descInput = document.getElementById("cal-min-desc-input");
  const desc = descInput && descInput.value.trim() ? descInput.value.trim() : "Feriado / Evento";

  holidayService.salvarOuAtualizarFeriado({
    data: targetDate,
    descricao: desc,
    categoria_id: _calMenuSelectedCatId
  });

  calFecharMenuMinimalista();
  calRenderizar();

  if (typeof updateSchedule === "function") {
    updateSchedule();
  }
}

/**
 * Exclui o feriado do dia selecionado via ícone de lixeira
 */
function calExcluirDiaMenu() {
  if (!_calMenuCurrentDate) return;

  holidayService.excluirFeriado(_calMenuCurrentDate);

  calFecharMenuMinimalista();
  calRenderizar();

  if (typeof updateSchedule === "function") {
    updateSchedule();
  }
}

/**
 * Fecha e remove o menu minimalista e seu backdrop
 */
function calFecharMenuMinimalista() {
  const card = document.getElementById("cal-minimalist-card");
  if (card && card.parentNode) {
    card.parentNode.removeChild(card);
  }
  const backdrop = document.getElementById("cal-minimalist-backdrop");
  if (backdrop && backdrop.parentNode) {
    backdrop.parentNode.removeChild(backdrop);
  }
}

// ==========================================================================
// IMPRESSÃO OFICIAL DO CALENDÁRIO ANUAL EM A4 PAISAGEM (LANDSCAPE)
// ==========================================================================

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
    for (let vazio = 0; vazio < primeiroDiaSemana; vazio++) {
      cellsHtml += `<div class="print-day-cell empty"></div>`;
    }

    for (let d = 1; d <= totalDias; d++) {
      const diaObj = mesObj.dias[d - 1];
      const isSun = (primeiroDiaSemana + d - 1) % 7 === 0;
      let corStyle = "";

      if (diaObj.temEvento && diaObj.eventInfo) {
        const cat = diaObj.eventInfo.categoriaId;
        const matched = DICIONARIO_TIPOS_CALENDARIO.find(t => t.id === cat);
        const cor = matched ? matched.cor : "#FF0000";
        corStyle = `background: ${cor} !important; color: #FFFFFF !important; font-weight: 800 !important;`;
      } else if (isSun) {
        corStyle = "color: #94a3b8;";
      }

      cellsHtml += `<div class="print-day-cell" style="${corStyle}" title="${diaObj.temEvento ? diaObj.eventInfo.descricao : ''}">${d}</div>`;
    }

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
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      background: #FAF8F3;
      color: #4A2A1A;
      width: 297mm; height: 210mm; max-height: 210mm;
      padding: 6mm 9mm; margin: 0 auto;
      display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
    }
    .print-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4A2A1A; padding-bottom: 4px; margin-bottom: 5px; }
    .senai-logo-text { font-size: 26px; font-weight: 900; letter-spacing: 1px; color: #FF0000; font-family: Arial, sans-serif; line-height: 1; }
    .print-title { font-size: 13px; font-weight: 800; color: #4A2A1A; text-transform: uppercase; }
    .print-subtitle { font-size: 9px; color: #8D7B6F; font-weight: 600; }
    .print-grid-months { display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(3, 1fr); gap: 5px 7px; flex: 1; margin-bottom: 5px; }
    .print-month-card { border: 1px solid #E8E2D5; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; background: #ffffff; }
    .print-month-title { background: #4A2A1A; color: #ffffff; text-align: center; font-size: 9.5px; font-weight: 800; text-transform: uppercase; padding: 2px 0; }
    .print-weekdays-row { display: grid; grid-template-columns: repeat(7, 1fr); background: #FAF8F3; border-bottom: 1px solid #E8E2D5; padding: 1px 0; text-align: center; }
    .print-weekday-label { font-size: 7.5px; font-weight: 700; color: #8D7B6F; }
    .print-days-grid { display: grid; grid-template-columns: repeat(7, 1fr); flex: 1; padding: 1px; gap: 1px; }
    .print-day-cell { display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 600; color: #4A2A1A; border-radius: 2px; }
    .print-footer { border-top: 1px solid #E8E2D5; padding-top: 3px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; }
    .print-legend-row { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; }
    .print-legend-pill { display: flex; align-items: center; gap: 4px; font-size: 8px; font-weight: 600; color: #4A2A1A; }
    .print-swatch { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
  </style>
</head>
<body>
  <div class="print-header">
    <div style="display: flex; align-items: center; gap: 12px;">
      <div class="senai-logo-text">SENAI</div>
      <div style="border-left: 2px solid #E8E2D5; padding-left: 10px;">
        <div class="print-title">CALENDÁRIO ESCOLAR / INSTITUCIONAL • ${y}</div>
        <div class="print-subtitle">${escolaNome}</div>
      </div>
    </div>
    <div style="text-align: right; font-size: 8.5px; color: #8D7B6F;">
      ${metaTurmaHtml}
      <div><strong>Emissão:</strong> ${dataEmissao}</div>
    </div>
  </div>

  <div class="print-grid-months">
    ${htmlMeses}
  </div>

  <div class="print-footer">
    <div class="print-legend-row">
      ${DICIONARIO_TIPOS_CALENDARIO.map(tipo => `
        <div class="print-legend-pill">
          <span class="print-swatch" style="background: ${tipo.cor};"></span>
          <span>${tipo.label}</span>
        </div>
      `).join("")}
    </div>
    <div style="color: #8D7B6F; font-size: 7.5px;">
      SENAI SP • Documento gerado eletronicamente em conformidade com o calendário oficial.
    </div>
  </div>
</body>
</html>`;
}

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

// Exposição global
if (typeof window !== "undefined") {
  window.calInit = calInit;
  window.calRenderizar = calRenderizar;
  window.calMudarAno = calMudarAno;
  window.calOnClickDay = calOnClickDay;
  window.calOnContextMenuDay = calOnContextMenuDay;
  window.calAbrirMenuMinimalista = calAbrirMenuMinimalista;
  window.calFecharMenuMinimalista = calFecharMenuMinimalista;
  window.calToggleSliderDropdown = calToggleSliderDropdown;
  window.calSelecionarTipoDropdown = calSelecionarTipoDropdown;
  window.calSalvarDiaMenu = calSalvarDiaMenu;
  window.calExcluirDiaMenu = calExcluirDiaMenu;
  window.calImprimirCalendario = calImprimirCalendario;
  window.calGerarHtmlImpressao = calGerarHtmlImpressao;
  window.calAbrirModalNovoDia = calAbrirModalNovoDia;
  window.calFecharModalNovoDia = calFecharModalNovoDia;
  window.calAlternarAbaGerenciar = calAlternarAbaGerenciar;
  window.calMudarTipoInclusao = calMudarTipoInclusao;
  window.calConfirmarAdicaoModal = calConfirmarAdicaoModal;
  window.calRestaurarBaseOficialConfirm = calRestaurarBaseOficialConfirm;
  window.calExcluirModificacao = calExcluirModificacao;
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    calInit();
  });
}

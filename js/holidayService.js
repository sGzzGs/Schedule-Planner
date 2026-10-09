// Created at: 2026-10-09 13:26
/**
 * holidayService.js
 * Motor Universal de Feriados, Emendas e Eventos Institucionais (SENAI).
 *
 * Características:
 * - Algoritmo Canônico de Páscoa (Meeus/Jones/Butcher) para feriados móveis.
 * - Projeção determinística de datas fixas para qualquer ano (passado, presente e futuro).
 * - Avaliação sob demanda (Lazy Loading) com Cache/Memoização por Ano (Map<ano, YearData>).
 * - Pré-aquecimento automático do cache (ano vigente + ano seguinte).
 * - Suporte nativo a resolução multi-ano (transições de ano fiscal/letivo).
 * - Resiliência offline completa (fallback embutido de feriados_base_completa_calendario_senai.json).
 * - Suporte a personalizações (adição de feriados/recessos em roxo forte e remoção/desbloqueio de feriados oficiais).
 * - Compatível tanto com navegador (global window.HolidayService) quanto com ambientes modulares/Node.js.
 */

// BASE EMBUTIDA UNIVERSAL (Fallback de segurança caso fetch('./feriados_base_completa_calendario_senai.json') falhe em file:///)
const BASE_UNIVERSAL_EMBUTIDA = {
  versao: "2.0",
  descricao: "Base universal dinâmica de feriados, emendas e eventos para cronograma escolar SENAI",
  legendas: [
    { id: "feriado", nome: "Feriados", cor_tema: "cor 1", bloqueia_aula: true },
    { id: "emenda", nome: "Emenda de Feriado", cor_tema: "cor 2", bloqueia_aula: true },
    { id: "ponto_facultativo", nome: "Ponto Facultativo", cor_tema: "cor 3", bloqueia_aula: true },
    { id: "formatura", nome: "Formatura CAI/CT", cor_tema: "cor 4", bloqueia_aula: true },
    { id: "ferias_fic", nome: "Férias FIC", cor_tema: "cor 5", bloqueia_aula: true },
    { id: "a_decidir", nome: "A Decidir", cor_tema: "cor 6", bloqueia_aula: true }
  ],
  itens: [
    { dia: 1, mes: 1, movel: false, offset_pascoa_dias: null, categoria_id: "feriado", emenda_original: false, descricao: "Confraternização Universal" },
    { dia: 25, mes: 1, movel: false, offset_pascoa_dias: null, categoria_id: "feriado", emenda_original: true, descricao: "Aniversário de São Paulo" },
    { dia: null, mes: 3, movel: true, offset_pascoa_dias: -50, categoria_id: "ponto_facultativo", emenda_original: false, descricao: "Sábado de Carnaval" },
    { dia: null, mes: 3, movel: true, offset_pascoa_dias: -48, categoria_id: "ponto_facultativo", emenda_original: false, descricao: "Segunda de Carnaval" },
    { dia: null, mes: 3, movel: true, offset_pascoa_dias: -47, categoria_id: "ponto_facultativo", emenda_original: false, descricao: "Terça de Carnaval" },
    { dia: null, mes: 4, movel: true, offset_pascoa_dias: -2, categoria_id: "feriado", emenda_original: true, descricao: "Sexta-feira Santa/Paixão" },
    { dia: null, mes: 4, movel: true, offset_pascoa_dias: -1, categoria_id: "emenda", emenda_original: false, descricao: "Sábado de Aleluia (Emenda Sexta-feira Santa)" },
    { dia: 21, mes: 4, movel: false, offset_pascoa_dias: null, categoria_id: "feriado", emenda_original: true, descricao: "Tiradentes" },
    { dia: 1, mes: 5, movel: false, offset_pascoa_dias: null, categoria_id: "feriado", emenda_original: false, descricao: "Dia do Trabalho" },
    { dia: null, mes: 6, movel: true, offset_pascoa_dias: 60, categoria_id: "feriado", emenda_original: true, descricao: "Corpus Christi" },
    { dia: null, mes: 6, movel: true, offset_pascoa_dias: 61, categoria_id: "emenda", emenda_original: false, descricao: "Emenda de feriado - Corpus Christi (Sexta)" },
    { dia: null, mes: 6, movel: true, offset_pascoa_dias: 62, categoria_id: "emenda", emenda_original: false, descricao: "Emenda de feriado - Corpus Christi (Sábado)" },
    { dia: 24, mes: 6, movel: false, offset_pascoa_dias: null, categoria_id: "formatura", emenda_original: false, descricao: "Formatura CAI" },
    { dia: 9, mes: 7, movel: false, offset_pascoa_dias: null, categoria_id: "feriado", emenda_original: true, descricao: "Revolução Constitucionalista de 1932" },
    { dia: 7, mes: 9, movel: false, offset_pascoa_dias: null, categoria_id: "feriado", emenda_original: true, descricao: "Independência" },
    { dia: 12, mes: 10, movel: false, offset_pascoa_dias: null, categoria_id: "feriado", emenda_original: false, descricao: "Padroeira do Brasil" },
    { dia: 13, mes: 10, movel: false, offset_pascoa_dias: null, categoria_id: "ponto_facultativo", emenda_original: false, descricao: "Dia dos Professores - Antecipado" },
    { dia: 2, mes: 11, movel: false, offset_pascoa_dias: null, categoria_id: "feriado", emenda_original: false, descricao: "Dia de Finados." },
    { dia: 15, mes: 11, movel: false, offset_pascoa_dias: null, categoria_id: "feriado", emenda_original: false, descricao: "Proclamação da República" },
    { dia: 20, mes: 11, movel: false, offset_pascoa_dias: null, categoria_id: "feriado", emenda_original: false, descricao: "Consciência Negra" },
    { dia: 21, mes: 12, movel: false, offset_pascoa_dias: null, categoria_id: "formatura", emenda_original: false, descricao: "Formatura CAI" },
    { dia: 22, mes: 12, movel: false, offset_pascoa_dias: null, categoria_id: "ponto_facultativo", emenda_original: false, descricao: "Confraternização Escolar" },
    { dia: 25, mes: 12, movel: false, offset_pascoa_dias: null, categoria_id: "feriado", emenda_original: false, descricao: "Natal" },
    { dia: 31, mes: 12, movel: false, offset_pascoa_dias: null, categoria_id: "ponto_facultativo", emenda_original: false, descricao: "Véspera de Ano Novo" }
  ],
  excecoes_anuais: {
    "2026": {
      remover: [],
      adicionar: [
        { data: "2026-07-13", data_fim: "2026-07-18", descricao: "Férias de Julho / Férias FIC", categoria_id: "ferias_fic" }
      ]
    },
    "2027": {
      remover: [
        "2027-03-27",
        "2027-05-29"
      ],
      adicionar: [
        { data: "2027-04-19", descricao: "Folga Institucional / Emenda Tiradentes", categoria_id: "emenda" },
        { data: "2027-04-20", descricao: "Folga Institucional / Emenda Tiradentes", categoria_id: "emenda" },
        { data: "2027-06-05", descricao: "Folga Institucional", categoria_id: "emenda" },
        { data: "2027-07-10", descricao: "Folga Institucional", categoria_id: "emenda" }
      ]
    },
    "2028": {
      remover: [
        "2028-04-15",
        "2028-06-17",
        "2028-09-09"
      ],
      adicionar: [
        { data: "2028-04-03", descricao: "Folga Institucional", categoria_id: "emenda" },
        { data: "2028-04-04", descricao: "Folga Institucional", categoria_id: "emenda" },
        { data: "2028-04-20", descricao: "Folga Institucional / Emenda Tiradentes", categoria_id: "emenda" },
        { data: "2028-06-05", descricao: "Folga Institucional", categoria_id: "emenda" },
        { data: "2028-06-06", descricao: "Folga Institucional", categoria_id: "emenda" },
        { data: "2028-06-24", descricao: "Formatura CAI", categoria_id: "formatura" },
        { data: "2028-07-10", descricao: "Folga Institucional", categoria_id: "emenda" },
        { data: "2028-07-11", descricao: "Folga Institucional", categoria_id: "emenda" }
      ]
    }
  }
};

class HolidayService {
  constructor() {
    this.baseData = BASE_UNIVERSAL_EMBUTIDA;
    this.yearCache = new Map(); // ano (number) => { datasMap: Map<string, Object>, eventos: Array, pascoa: Date }
    this.storageKey = "senai_custom_holidays_v1";
    this.customizations = this.loadCustomizations();
    this.isLoaded = false;

    // Pré-aquecimento do cache com o ano vigente e o ano seguinte
    this.preaquecerCache();
  }

  /**
   * Pré-carrega no cache o ano corrente e o ano seguinte
   */
  preaquecerCache(anoBase) {
    const y = anoBase ? Number(anoBase) : new Date().getFullYear();
    this.getYearData(y);
    this.getYearData(y + 1);
  }

  /**
   * Inicialização com tentativa de carregar o JSON externo ou usar a base embutida
   */
  async init(jsonPath = "./feriados_base_completa_calendario_senai.json") {
    if (typeof fetch === "function") {
      try {
        const response = await fetch(jsonPath);
        if (response.ok) {
          const loaded = await response.json();
          if (loaded && loaded.itens && Array.isArray(loaded.itens)) {
            this.baseData = loaded;
            this.clearCache();
            this.preaquecerCache();
          }
        }
      } catch (e) {
        // Fallback silencioso para BASE_UNIVERSAL_EMBUTIDA em file:/// ou offline
      }
    }
    this.isLoaded = true;
    return this;
  }

  /**
   * Limpa o cache de anos computados (usado ao carregar novos dados ou editar customizações)
   */
  clearCache() {
    this.yearCache.clear();
  }

  /**
   * Algoritmo de Páscoa (Meeus/Jones/Butcher)
   * Retorna Date correspondente ao Domingo de Páscoa do ano fornecido às 12:00:00
   */
  static calcularDomingoPascoa(ano) {
    const y = Number(ano);
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Março, 4 = Abril
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mes - 1, dia, 12, 0, 0);
  }

  /**
   * Converte objeto Date ou string para chave YYYY-MM-DD
   */
  static formatDateKey(date) {
    if (!date) return "";
    if (typeof date === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
      const parts = date.split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        }
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
      return date;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /**
   * Carrega personalizações locais do usuário do localStorage
   */
  loadCustomizations() {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Erro ao ler customizações locais de feriados:", e);
    }
    return { itensAdicionais: [], itensRemovidos: [] };
  }

  /**
   * Salva personalizações locais do usuário no localStorage
   */
  saveCustomizations() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(this.storageKey, JSON.stringify(this.customizations));
      }
    } catch (e) {
      console.warn("Erro ao salvar customizações de feriados:", e);
    }
    this.clearCache();
    this.preaquecerCache();
  }

  /**
   * Obtém a definição de uma legenda por ID
   */
  getLegendById(categoriaId) {
    if (categoriaId === "personalizado" || categoriaId === "custom_user") {
      return {
        id: "personalizado",
        nome: "Adicionado pelo Usuário",
        cor_tema: "cor user",
        bloqueia_aula: true
      };
    }
    const found = this.baseData.legendas.find(l => l.id === categoriaId);
    if (found) return found;
    return {
      id: categoriaId || "a_decidir",
      nome: categoriaId || "Evento",
      cor_tema: "cor 6",
      bloqueia_aula: true
    };
  }

  /**
   * Lista todas as legendas disponíveis
   */
  getLegendas() {
    return this.baseData.legendas || [];
  }

  /**
   * Calcula e armazena em cache (Lazy Memoization) os feriados e eventos de um ano Y
   */
  getYearData(ano) {
    const y = Number(ano);
    if (this.yearCache.has(y)) {
      return this.yearCache.get(y);
    }

    const datasMap = new Map();
    const eventos = [];
    const pascoa = HolidayService.calcularDomingoPascoa(y);

    // 1. Processar itens universais da base (Móveis e Fixos)
    for (const item of this.baseData.itens) {
      const leg = this.getLegendById(item.categoria_id);
      let dataItem;

      if (item.movel && item.offset_pascoa_dias !== null) {
        // Feriado Móvel projetado a partir do Domingo de Páscoa
        dataItem = new Date(
          pascoa.getFullYear(),
          pascoa.getMonth(),
          pascoa.getDate() + item.offset_pascoa_dias,
          12, 0, 0
        );
      } else if (!item.movel && item.dia && item.mes) {
        // Feriado Fixo projetado no ano solicitado
        dataItem = new Date(y, item.mes - 1, item.dia, 12, 0, 0);
      }

      if (dataItem) {
        const key = HolidayService.formatDateKey(dataItem);
        const objEvento = {
          data: key,
          dia: dataItem.getDate(),
          mes: dataItem.getMonth() + 1,
          ano: dataItem.getFullYear(),
          descricao: item.descricao,
          categoriaId: item.categoria_id,
          corTema: leg.cor_tema,
          nomeCategoria: leg.nome,
          bloqueiaAula: leg.bloqueia_aula !== false,
          movel: !!item.movel,
          emendaOriginal: !!item.emenda_original,
          isCustom: false
        };

        datasMap.set(key, objEvento);
        eventos.push(objEvento);
      }
    }

    // 2. Gerar emendas dinâmicas para feriados fixos institucionais (emenda_original: true)
    // Regra SENAI:
    // - Feriado na Terça-feira -> Emenda na Segunda-feira (dia - 1)
    // - Feriado na Quinta-feira -> Emenda na Sexta-feira (dia + 1) e no Sábado (dia + 2)
    const legEmenda = this.getLegendById("emenda");
    for (const item of this.baseData.itens) {
      if (!item.movel && item.emenda_original && item.dia && item.mes) {
        const d = new Date(y, item.mes - 1, item.dia, 12, 0, 0);
        const dayOfWeek = d.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb

        if (dayOfWeek === 2) {
          // Terça-feira: emenda na Segunda
          const seg = new Date(y, item.mes - 1, item.dia - 1, 12, 0, 0);
          const keySeg = HolidayService.formatDateKey(seg);
          if (!datasMap.has(keySeg)) {
            const ev = {
              data: keySeg,
              dia: seg.getDate(),
              mes: seg.getMonth() + 1,
              ano: seg.getFullYear(),
              descricao: `Emenda de feriado - ${item.descricao}`,
              categoriaId: "emenda",
              corTema: legEmenda.cor_tema,
              nomeCategoria: legEmenda.nome,
              bloqueiaAula: legEmenda.bloqueia_aula !== false,
              movel: false,
              emendaOriginal: true,
              isCustom: false
            };
            datasMap.set(keySeg, ev);
            eventos.push(ev);
          }
        } else if (dayOfWeek === 4) {
          // Quinta-feira: emenda na Sexta e Sábado
          const sex = new Date(y, item.mes - 1, item.dia + 1, 12, 0, 0);
          const sab = new Date(y, item.mes - 1, item.dia + 2, 12, 0, 0);

          [sex, sab].forEach(dataEmenda => {
            const keyEmenda = HolidayService.formatDateKey(dataEmenda);
            if (!datasMap.has(keyEmenda)) {
              const ev = {
                data: keyEmenda,
                dia: dataEmenda.getDate(),
                mes: dataEmenda.getMonth() + 1,
                ano: dataEmenda.getFullYear(),
                descricao: `Emenda de feriado - ${item.descricao}`,
                categoriaId: "emenda",
                corTema: legEmenda.cor_tema,
                nomeCategoria: legEmenda.nome,
                bloqueiaAula: legEmenda.bloqueia_aula !== false,
                movel: false,
                emendaOriginal: true,
                isCustom: false
              };
              datasMap.set(keyEmenda, ev);
              eventos.push(ev);
            }
          });
        }
      }
    }

    // 3. Aplicar exceções institucionais anuais configuradas para o ano (excecoes_anuais)
    if (this.baseData.excecoes_anuais && this.baseData.excecoes_anuais[y]) {
      const exc = this.baseData.excecoes_anuais[y];

      // A. Remoções oficiais de exceção
      if (Array.isArray(exc.remover)) {
        for (const remKey of exc.remover) {
          if (datasMap.has(remKey)) {
            datasMap.delete(remKey);
          }
          for (let i = eventos.length - 1; i >= 0; i--) {
            if (eventos[i].data === remKey) {
              eventos.splice(i, 1);
            }
          }
        }
      }

      // B. Adições oficiais de exceção (datas pontuais ou intervalos de recesso)
      if (Array.isArray(exc.adicionar)) {
        for (const itemAdd of exc.adicionar) {
          if (!itemAdd.data) continue;
          const leg = this.getLegendById(itemAdd.categoria_id);
          const pushData = (dStr) => {
            const [ey, em, ed] = dStr.split("-").map(Number);
            const ev = {
              data: dStr,
              dia: ed,
              mes: em,
              ano: ey,
              descricao: itemAdd.descricao || "Folga Institucional",
              categoriaId: itemAdd.categoria_id || "emenda",
              corTema: leg.cor_tema,
              nomeCategoria: leg.nome,
              bloqueiaAula: itemAdd.bloqueia_aula !== false,
              movel: false,
              emendaOriginal: false,
              isCustom: false
            };
            datasMap.set(dStr, ev);
            eventos.push(ev);
          };

          if (itemAdd.data_fim) {
            const [sy, sm, sd] = itemAdd.data.split("-").map(Number);
            const [fy, fm, fd] = itemAdd.data_fim.split("-").map(Number);
            let curr = new Date(sy, sm - 1, sd, 12, 0, 0);
            const end = new Date(fy, fm - 1, fd, 12, 0, 0);
            while (curr <= end) {
              const k = HolidayService.formatDateKey(curr);
              pushData(k);
              curr.setDate(curr.getDate() + 1);
            }
          } else {
            pushData(itemAdd.data);
          }
        }
      }
    }

    // 4. Aplicar itens customizados adicionados pelo usuário (destacados em roxo)
    if (this.customizations && Array.isArray(this.customizations.itensAdicionais)) {
      for (const custom of this.customizations.itensAdicionais) {
        if (!custom.data) continue;
        const [cy, cm, cd] = custom.data.split("-").map(Number);
        if (cy === y) {
          const leg = this.getLegendById(custom.categoria_id);
          const objEvento = {
            data: custom.data,
            dia: cd,
            mes: cm,
            ano: cy,
            descricao: custom.descricao || "Evento Personalizado",
            categoriaId: custom.categoria_id || "personalizado",
            corTema: "cor user", // Slot especial roxo forte
            nomeCategoria: custom.categoria_id === "personalizado" ? "Adicionado pelo Usuário" : (leg.nome || "Personalizado"),
            bloqueiaAula: custom.bloqueia_aula !== undefined ? custom.bloqueia_aula : true,
            movel: false,
            emendaOriginal: false,
            isCustom: true
          };
          datasMap.set(custom.data, objEvento);
          eventos.push(objEvento);
        }
      }
    }

    // 4. Aplicar remoções / desbloqueios customizados do usuário
    if (this.customizations && Array.isArray(this.customizations.itensRemovidos)) {
      for (const remKey of this.customizations.itensRemovidos) {
        if (datasMap.has(remKey)) {
          datasMap.delete(remKey);
        }
      }
      // Também remove da lista de eventos daquele ano
      for (let i = eventos.length - 1; i >= 0; i--) {
        if (this.customizations.itensRemovidos.includes(eventos[i].data)) {
          eventos.splice(i, 1);
        }
      }
    }

    // Ordenar eventos cronologicamente
    eventos.sort((a, b) => a.data.localeCompare(b.data));

    const yearResult = {
      ano: y,
      datasMap,
      eventos,
      pascoa
    };

    this.yearCache.set(y, yearResult);
    return yearResult;
  }

  /**
   * Consulta rápida O(1): Retorna se a data bloqueia aula regular
   */
  isBlocked(dateOrKey) {
    const key = HolidayService.formatDateKey(dateOrKey);
    if (!key) return false;
    const ano = parseInt(key.slice(0, 4), 10);
    if (isNaN(ano)) return false;

    const yData = this.getYearData(ano);
    const info = yData.datasMap.get(key);
    return !!(info && info.bloqueiaAula);
  }

  /**
   * Retorna os metadados completos de um dia bloqueado ou feriado (ou null se for dia letivo comum)
   */
  getDateInfo(dateOrKey) {
    const key = HolidayService.formatDateKey(dateOrKey);
    if (!key) return null;
    const ano = parseInt(key.slice(0, 4), 10);
    if (isNaN(ano)) return null;

    const yData = this.getYearData(ano);
    return yData.datasMap.get(key) || null;
  }

  /**
   * Retorna o resumo completo de calendário para a Aba 3 (Calendário Anual)
   */
  getYearCalendar(ano) {
    const y = Number(ano);
    const yData = this.getYearData(y);
    const meses = [];

    const nomesMeses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    for (let m = 0; m < 12; m++) {
      const primeiroDia = new Date(y, m, 1);
      const ultimoDia = new Date(y, m + 1, 0);
      const totalDias = ultimoDia.getDate();
      const diaSemanaInicio = primeiroDia.getDay();

      const dias = [];

      for (let d = 1; d <= totalDias; d++) {
        const dateObj = new Date(y, m, d, 12, 0, 0);
        const key = HolidayService.formatDateKey(dateObj);
        const eventInfo = yData.datasMap.get(key) || null;

        dias.push({
          dia: d,
          diaSemana: dateObj.getDay(),
          data: key,
          temEvento: !!eventInfo,
          eventInfo: eventInfo,
          isCustom: eventInfo ? !!eventInfo.isCustom : false
        });
      }

      const eventosMes = yData.eventos.filter(ev => ev.mes === (m + 1));

      meses.push({
        mesIdx: m,
        nomeMes: nomesMeses[m],
        ano: y,
        diaSemanaInicio,
        totalDias,
        dias,
        eventosMes
      });
    }

    return {
      ano: y,
      pascoa: yData.pascoa,
      legendas: this.getLegendas(),
      eventosAno: yData.eventos,
      totalEventos: yData.eventos.length,
      meses
    };
  }

  /**
   * Adiciona um evento/feriado/férias customizado pelo usuário
   */
  adicionarCustomizacao(item) {
    if (!item || !item.data) return false;
    this.customizations.itensRemovidos = this.customizations.itensRemovidos.filter(k => k !== item.data);
    this.customizations.itensAdicionais = this.customizations.itensAdicionais.filter(i => i.data !== item.data);
    this.customizations.itensAdicionais.push(item);
    this.saveCustomizations();
    return true;
  }

  /**
   * Adiciona um intervalo de recesso/férias de uma data inicial até a final
   */
  adicionarPeriodoRecesso(inicioStr, fimStr, descricao, categoriaId = "personalizado") {
    const [sy, sm, sd] = inicioStr.split("-").map(Number);
    const [ey, em, ed] = fimStr.split("-").map(Number);
    let curr = new Date(sy, sm - 1, sd, 12, 0, 0);
    const end = new Date(ey, em - 1, ed, 12, 0, 0);

    while (curr <= end) {
      const key = HolidayService.formatDateKey(curr);
      this.adicionarCustomizacao({
        data: key,
        descricao: descricao || "Recesso / Férias Personalizado",
        categoria_id: categoriaId,
        bloqueia_aula: true
      });
      curr.setDate(curr.getDate() + 1);
    }
  }

  /**
   * Remove/desbloqueia um dia de feriado oficial (tornando-o dia útil letivo)
   */
  desbloquearDiaOficial(dataKey) {
    if (!dataKey) return false;
    this.customizations.itensAdicionais = this.customizations.itensAdicionais.filter(i => i.data !== dataKey);
    if (!this.customizations.itensRemovidos.includes(dataKey)) {
      this.customizations.itensRemovidos.push(dataKey);
    }
    this.saveCustomizations();
    return true;
  }

  /**
   * Restaura um dia oficial que havia sido desbloqueado
   */
  restaurarDiaOficial(dataKey) {
    if (!dataKey) return false;
    this.customizations.itensRemovidos = this.customizations.itensRemovidos.filter(k => k !== dataKey);
    this.saveCustomizations();
    return true;
  }

  /**
   * Remove uma data adicionada pelo usuário
   */
  removerCustomizacao(dataKey) {
    if (!dataKey) return false;
    this.customizations.itensAdicionais = this.customizations.itensAdicionais.filter(i => i.data !== dataKey);
    this.saveCustomizations();
    return true;
  }

  /**
   * Retorna todas as customizações ativas do usuário
   */
  getTodasModificacoesUsuario() {
    return {
      adicionais: this.customizations.itensAdicionais || [],
      removidos: this.customizations.itensRemovidos || []
    };
  }

  /**
   * Restaura todas as customizações do usuário para a base oficial
   */
  restaurarPadrao() {
    this.customizations = { itensAdicionais: [], itensRemovidos: [] };
    this.saveCustomizations();
  }

  /**
   * Aplica um conjunto completo de modificações do usuário (importação de perfil)
   */
  aplicarModificacoesUsuario(mods) {
    if (!mods || typeof mods !== "object") return false;
    const add = Array.isArray(mods.adicionais) ? mods.adicionais : (Array.isArray(mods.itensAdicionais) ? mods.itensAdicionais : []);
    const rem = Array.isArray(mods.removidos) ? mods.removidos : (Array.isArray(mods.itensRemovidos) ? mods.itensRemovidos : []);
    this.customizations = {
      itensAdicionais: [...add],
      itensRemovidos: [...rem]
    };
    this.saveCustomizations();
    return true;
  }
}

// Instância Singleton Canônica Global
const holidayService = new HolidayService();

// Exposição universal (Browser e Node.js)
if (typeof window !== "undefined") {
  window.HolidayService = HolidayService;
  window.holidayService = holidayService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { HolidayService, holidayService, BASE_UNIVERSAL_EMBUTIDA };
}

// Created at: 2026-10-19 14:18
/**
 * holidayService.js
 * Motor Universal de Feriados, Emendas e Eventos Institucionais (SENAI).
 *
 * Características:
 * - Base limpa e direta para os anos 2026 e 2027 sem lógicas legadas de offset ou código morto.
 * - Catálogo cromático oficial com 6 categorias e suporte a customizações no LocalStorage.
 * - Suporte a adição, edição rápida e exclusão de feriados com botão direito.
 * - Compatível tanto com navegador (global window.HolidayService) quanto com ambientes modulares/Node.js.
 */

const BASE_UNIVERSAL_EMBUTIDA = {
  versao: "3.0",
  descricao: "Base oficial de feriados, emendas e eventos para cronograma escolar SENAI (2026-2027)",
  legendas: [
    { id: "feriado", nome: "Feriados", cor: "#FF0000", cor_tema: "#FF0000", bloqueia_aula: true },
    { id: "emenda", nome: "Emenda de Feriado", cor: "#FFC000", cor_tema: "#FFC000", bloqueia_aula: true },
    { id: "ponto_facultativo", nome: "Ponto Facultativo", cor: "#808080", cor_tema: "#808080", bloqueia_aula: true },
    { id: "formatura", nome: "Formatura CAI/CT", cor: "#00B050", cor_tema: "#00B050", bloqueia_aula: true },
    { id: "ferias_fic", nome: "Férias FIC", cor: "#FFFF00", cor_tema: "#FFFF00", bloqueia_aula: true },
    { id: "a_decidir", nome: "A Decidir", cor: "#00B0F0", cor_tema: "#00B0F0", bloqueia_aula: true }
  ],
  anos: {
    "2026": [
      { data: "2026-01-01", descricao: "Confraternização Universal", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-01-25", descricao: "Aniversário de São Paulo", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-02-14", descricao: "Sábado de Carnaval", tipo: "recesso", categoria_id: "ponto_facultativo" },
      { data: "2026-02-16", descricao: "Segunda de Carnaval", tipo: "recesso", categoria_id: "ponto_facultativo" },
      { data: "2026-02-17", descricao: "Terça de Carnaval", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-04-03", descricao: "Sexta-feira Santa/Paixão", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-04-04", descricao: "Emenda de feriado Sexta-feira Santa/Paixão - Sábado de Aleluia", tipo: "emenda", categoria_id: "emenda" },
      { data: "2026-04-20", descricao: "Emenda de feriado - Tiradentes", tipo: "emenda", categoria_id: "emenda" },
      { data: "2026-04-21", descricao: "Tiradentes", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-05-01", descricao: "Dia do Trabalho", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-06-04", descricao: "Corpus Christi", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-06-05", descricao: "Emenda de feriado - Corpus Christi", tipo: "emenda", categoria_id: "emenda" },
      { data: "2026-06-06", descricao: "Emenda de feriado - Corpus Christi", tipo: "emenda", categoria_id: "emenda" },
      { data: "2026-06-24", descricao: "Formatura CAI", tipo: "formatura", categoria_id: "formatura" },
      { data: "2026-07-09", descricao: "Revolução Constitucionalista de 1932", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-07-10", descricao: "Emenda de feriado - Ver. Const. de 1932", tipo: "emenda", categoria_id: "emenda" },
      { data: "2026-07-11", descricao: "Emenda de feriado - Ver. Const. de 1932", tipo: "emenda", categoria_id: "emenda" },
      { data: "2026-09-07", descricao: "Independência", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-10-12", descricao: "Padroeira do Brasil", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-10-13", descricao: "Dia dos Professores - Antecipado", tipo: "recesso", categoria_id: "ponto_facultativo" },
      { data: "2026-11-02", descricao: "Dia de Finados.", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-11-15", descricao: "Proclamação da República", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-11-20", descricao: "Consciência Negra", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-12-21", descricao: "Formatura CAI", tipo: "formatura", categoria_id: "formatura" },
      { data: "2026-12-22", descricao: "Confraternização Escolar", tipo: "recesso", categoria_id: "ponto_facultativo" },
      { data: "2026-12-25", descricao: "Natal", tipo: "feriado", categoria_id: "feriado" },
      { data: "2026-12-31", descricao: "Véspera de Ano Novo", tipo: "recesso", categoria_id: "ponto_facultativo" }
    ],
    "2027": [
      { data: "2027-01-01", descricao: "Confratenização Universal", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-01-25", descricao: "Aniversário de São Paulo", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-02-06", descricao: "Sábado de Carnaval", tipo: "recesso", categoria_id: "ponto_facultativo" },
      { data: "2027-02-08", descricao: "Segunda de Carnaval", tipo: "recesso", categoria_id: "ponto_facultativo" },
      { data: "2027-02-09", descricao: "Terça de Carnaval", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-03-26", descricao: "Sexta-feira Santa/Paixão", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-04-04", descricao: "Emenda de feriado Sexta-feira Santa/Paixão - Sábado de Aleluia", tipo: "emenda", categoria_id: "emenda" },
      { data: "2027-04-20", descricao: "Emenda de feriado - Tiradentes", tipo: "emenda", categoria_id: "emenda" },
      { data: "2027-04-21", descricao: "Tiradentes", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-05-01", descricao: "Dia do Trabalho", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-05-27", descricao: "Corpus Christi", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-06-05", descricao: "Emenda de feriado - Corpus Christi", tipo: "emenda", categoria_id: "emenda" },
      { data: "2027-06-06", descricao: "Emenda de feriado - Corpus Christi", tipo: "emenda", categoria_id: "emenda" },
      { data: "2027-06-24", descricao: "Formatura CAI", tipo: "formatura", categoria_id: "formatura" },
      { data: "2027-07-09", descricao: "Revolução Constitucionalista de 1932", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-07-10", descricao: "Emenda de feriado - Ver. Const. de 1932", tipo: "emenda", categoria_id: "emenda" },
      { data: "2027-07-11", descricao: "Emenda de feriado - Ver. Const. de 1932", tipo: "emenda", categoria_id: "emenda" },
      { data: "2027-09-07", descricao: "Independência", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-10-12", descricao: "Padroeira do Brasil", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-10-13", descricao: "Dia dos Professores - Antecipado", tipo: "recesso", categoria_id: "ponto_facultativo" },
      { data: "2027-11-02", descricao: "Dia de Finados.", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-11-15", descricao: "Proclamação da República", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-11-20", descricao: "Consciência Negra", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-12-21", descricao: "Formatura CAI", tipo: "formatura", categoria_id: "formatura" },
      { data: "2027-12-22", descricao: "Confraternização Escolar", tipo: "recesso", categoria_id: "ponto_facultativo" },
      { data: "2027-12-25", descricao: "Natal", tipo: "feriado", categoria_id: "feriado" },
      { data: "2027-12-31", descricao: "Véspera de Ano Novo", tipo: "recesso", categoria_id: "ponto_facultativo" }
    ]
  }
};

class HolidayService {
  constructor() {
    this.baseData = BASE_UNIVERSAL_EMBUTIDA;
    this.yearCache = new Map();
    this.storageKey = "senai_custom_holidays_v1";
    this.customizations = this.loadCustomizations();
    this.isLoaded = false;

    // Pré-aquecimento do cache
    this.preaquecerCache();
  }

  preaquecerCache(anoBase) {
    const y = anoBase ? Number(anoBase) : new Date().getFullYear();
    this.getYearData(y);
    this.getYearData(y + 1);
  }

  async init(jsonPath = "./feriados_base_completa_calendario_senai.json") {
    if (typeof fetch === "function") {
      try {
        const response = await fetch(jsonPath);
        if (response.ok) {
          const loaded = await response.json();
          if (loaded && (loaded.anos || loaded.itens)) {
            this.baseData = loaded;
            this.clearCache();
            this.preaquecerCache();
          }
        }
      } catch (_) {
        // Fallback silencioso para BASE_UNIVERSAL_EMBUTIDA
      }
    }
    this.isLoaded = true;
    return this;
  }

  clearCache() {
    this.yearCache.clear();
  }

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
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mes - 1, dia, 12, 0, 0);
  }

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

  getLegendById(categoriaId) {
    const list = this.baseData.legendas || BASE_UNIVERSAL_EMBUTIDA.legendas;
    const found = list.find(l => l.id === categoriaId);
    if (found) return found;

    const normal = String(categoriaId || "").toLowerCase();
    if (normal.includes("feriado")) return list.find(l => l.id === "feriado") || list[0];
    if (normal.includes("emenda")) return list.find(l => l.id === "emenda") || list[1];
    if (normal.includes("facultativo") || normal.includes("recesso")) return list.find(l => l.id === "ponto_facultativo") || list[2];
    if (normal.includes("formatura")) return list.find(l => l.id === "formatura") || list[3];
    if (normal.includes("ferias") || normal.includes("férias")) return list.find(l => l.id === "ferias_fic") || list[4];
    if (normal.includes("decidir")) return list.find(l => l.id === "a_decidir") || list[5];

    return {
      id: categoriaId || "a_decidir",
      nome: categoriaId || "Evento",
      cor: "#00B0F0",
      cor_tema: "#00B0F0",
      bloqueia_aula: true
    };
  }

  getLegendas() {
    return this.baseData.legendas || BASE_UNIVERSAL_EMBUTIDA.legendas;
  }

  getYearData(ano) {
    const y = Number(ano);
    if (this.yearCache.has(y)) {
      return this.yearCache.get(y);
    }

    const datasMap = new Map();
    const eventos = [];
    const pascoa = HolidayService.calcularDomingoPascoa(y);

    // Carregar itens oficiais do ano
    let itensAno = [];
    if (this.baseData.anos && Array.isArray(this.baseData.anos[String(y)])) {
      itensAno = this.baseData.anos[String(y)];
    } else if (BASE_UNIVERSAL_EMBUTIDA.anos && Array.isArray(BASE_UNIVERSAL_EMBUTIDA.anos[String(y)])) {
      itensAno = BASE_UNIVERSAL_EMBUTIDA.anos[String(y)];
    }

    for (const item of itensAno) {
      if (!item.data) continue;
      const leg = this.getLegendById(item.categoria_id || item.tipo);
      const [iy, im, id] = item.data.split("-").map(Number);

      const objEvento = {
        data: item.data,
        dia: id,
        mes: im,
        ano: iy,
        descricao: item.descricao,
        categoriaId: leg.id,
        corTema: leg.cor || leg.cor_tema,
        nomeCategoria: leg.nome,
        bloqueiaAula: leg.bloqueia_aula !== false,
        isCustom: false
      };

      datasMap.set(item.data, objEvento);
      eventos.push(objEvento);
    }

    // Aplicar itens adicionados ou editados pelo usuário
    if (this.customizations && Array.isArray(this.customizations.itensAdicionais)) {
      for (const custom of this.customizations.itensAdicionais) {
        if (!custom.data) continue;
        const [cy, cm, cd] = custom.data.split("-").map(Number);
        if (cy === y) {
          const leg = this.getLegendById(custom.categoria_id || custom.tipo);
          const objEvento = {
            data: custom.data,
            dia: cd,
            mes: cm,
            ano: cy,
            descricao: custom.descricao || "Evento Personalizado",
            categoriaId: leg.id,
            corTema: leg.cor || leg.cor_tema,
            nomeCategoria: leg.nome,
            bloqueiaAula: custom.bloqueia_aula !== undefined ? custom.bloqueia_aula : true,
            isCustom: true
          };

          datasMap.set(custom.data, objEvento);

          // Atualizar ou adicionar na lista de eventos
          const idx = eventos.findIndex(e => e.data === custom.data);
          if (idx >= 0) {
            eventos[idx] = objEvento;
          } else {
            eventos.push(objEvento);
          }
        }
      }
    }

    // Aplicar remoções / exclusões do usuário
    if (this.customizations && Array.isArray(this.customizations.itensRemovidos)) {
      for (const remKey of this.customizations.itensRemovidos) {
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

  isBlocked(dateOrKey) {
    const key = HolidayService.formatDateKey(dateOrKey);
    if (!key) return false;
    const ano = parseInt(key.slice(0, 4), 10);
    if (isNaN(ano)) return false;

    const yData = this.getYearData(ano);
    const info = yData.datasMap.get(key);
    return !!(info && info.bloqueiaAula);
  }

  getDateInfo(dateOrKey) {
    const key = HolidayService.formatDateKey(dateOrKey);
    if (!key) return null;
    const ano = parseInt(key.slice(0, 4), 10);
    if (isNaN(ano)) return null;

    const yData = this.getYearData(ano);
    return yData.datasMap.get(key) || null;
  }

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
   * Salva ou atualiza um feriado (usado pelo menu do botão direito e clique)
   */
  salvarOuAtualizarFeriado({ data, descricao, categoria_id }) {
    if (!data) return false;
    const key = HolidayService.formatDateKey(data);
    this.customizations.itensRemovidos = this.customizations.itensRemovidos.filter(k => k !== key);
    this.customizations.itensAdicionais = this.customizations.itensAdicionais.filter(i => i.data !== key);

    this.customizations.itensAdicionais.push({
      data: key,
      descricao: (descricao || "").trim() || "Feriado / Recesso",
      categoria_id: categoria_id || "feriado",
      bloqueia_aula: true
    });

    this.saveCustomizations();
    return true;
  }

  /**
   * Exclui ou remove um feriado do calendário
   */
  excluirFeriado(dataKey) {
    if (!dataKey) return false;
    const key = HolidayService.formatDateKey(dataKey);
    this.customizations.itensAdicionais = this.customizations.itensAdicionais.filter(i => i.data !== key);
    if (!this.customizations.itensRemovidos.includes(key)) {
      this.customizations.itensRemovidos.push(key);
    }
    this.saveCustomizations();
    return true;
  }

  adicionarCustomizacao(item) {
    if (!item || !item.data) return false;
    return this.salvarOuAtualizarFeriado({
      data: item.data,
      descricao: item.descricao,
      categoria_id: item.categoria_id
    });
  }

  desbloquearDiaOficial(dataKey) {
    return this.excluirFeriado(dataKey);
  }

  restaurarDiaOficial(dataKey) {
    if (!dataKey) return false;
    const key = HolidayService.formatDateKey(dataKey);
    this.customizations.itensRemovidos = this.customizations.itensRemovidos.filter(k => k !== key);
    this.saveCustomizations();
    return true;
  }

  removerCustomizacao(dataKey) {
    return this.excluirFeriado(dataKey);
  }

  isDiaOficial(dateKey) {
    if (!dateKey) return false;
    const key = HolidayService.formatDateKey(dateKey);
    const [y] = key.split("-").map(Number);
    let itensAno = [];
    if (this.baseData && this.baseData.anos && Array.isArray(this.baseData.anos[String(y)])) {
      itensAno = this.baseData.anos[String(y)];
    } else if (BASE_UNIVERSAL_EMBUTIDA.anos && Array.isArray(BASE_UNIVERSAL_EMBUTIDA.anos[String(y)])) {
      itensAno = BASE_UNIVERSAL_EMBUTIDA.anos[String(y)];
    }
    return itensAno.some(item => item.data === key);
  }

  aplicarModificacoesUsuario(mods) {
    if (!mods) return;
    const adicionais = Array.isArray(mods.adicionais)
      ? mods.adicionais
      : (Array.isArray(mods.itensAdicionais) ? mods.itensAdicionais : []);
    const removidos = Array.isArray(mods.removidos)
      ? mods.removidos
      : (Array.isArray(mods.itensRemovidos) ? mods.itensRemovidos : []);

    this.customizations = {
      itensAdicionais: [...adicionais],
      itensRemovidos: [...removidos]
    };
    this.saveCustomizations();
  }

  getTodasModificacoesUsuario() {
    return {
      adicionais: this.customizations.itensAdicionais || [],
      removidos: this.customizations.itensRemovidos || []
    };
  }

  restaurarPadrao() {
    this.customizations = { itensAdicionais: [], itensRemovidos: [] };
    this.saveCustomizations();
  }
}

const holidayService = new HolidayService();

if (typeof window !== "undefined") {
  window.HolidayService = HolidayService;
  window.holidayService = holidayService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { HolidayService, holidayService, BASE_UNIVERSAL_EMBUTIDA };
}

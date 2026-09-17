/**
 * holidayService.js
 * Gerenciamento e indexação de feriados, emendas, recessos e períodos de férias.
 */

export class HolidayService {
  constructor() {
    this.ano = 2026;
    this.feriadosMap = new Map(); // "YYYY-MM-DD" => { descricao, tipo }
    this.periodosFerias = []; // [ { descricao, inicio, fim } ]
    this.feriadosPorMes = {}; // mesIndex (0-11) => [ { dia, descricao, tipo, data } ]
    this.isLoaded = false;
  }

  /**
   * Dados embutidos de fallback caso o arquivo seja aberto via file:// sem servidor web
   */
  getDefaultData() {
    return {
      ano: 2026,
      feriados: [
        { data: "2026-01-01", descricao: "Confraternização Universal", tipo: "feriado" },
        { data: "2026-01-25", descricao: "Aniversário de São Paulo", tipo: "feriado" },
        { data: "2026-02-14", descricao: "Sábado de Carnaval", tipo: "recesso" },
        { data: "2026-02-16", descricao: "Segunda de Carnaval", tipo: "recesso" },
        { data: "2026-02-17", descricao: "Terça de Carnaval", tipo: "feriado" },
        { data: "2026-04-03", descricao: "Sexta-feira Santa/Paixão", tipo: "feriado" },
        { data: "2026-04-04", descricao: "Sábado de Aleluia (Emenda)", tipo: "emenda" },
        { data: "2026-04-20", descricao: "Emenda de feriado - Tiradentes", tipo: "emenda" },
        { data: "2026-04-21", descricao: "Tiradentes", tipo: "feriado" },
        { data: "2026-05-01", descricao: "Dia do Trabalho", tipo: "feriado" },
        { data: "2026-06-04", descricao: "Corpus Christi", tipo: "feriado" },
        { data: "2026-06-05", descricao: "Emenda de feriado - Corpus Christi", tipo: "emenda" },
        { data: "2026-06-06", descricao: "Emenda de feriado - Corpus Christi", tipo: "emenda" },
        { data: "2026-06-24", descricao: "Formatura CAI", tipo: "evento_interno" },
        { data: "2026-07-09", descricao: "Revolução Constitucionalista de 1932", tipo: "feriado" },
        { data: "2026-07-10", descricao: "Emenda de feriado - Rev. Const.", tipo: "emenda" },
        { data: "2026-07-11", descricao: "Emenda de feriado - Rev. Const.", tipo: "emenda" },
        { data: "2026-09-07", descricao: "Independência do Brasil", tipo: "feriado" },
        { data: "2026-10-12", descricao: "Padroeira do Brasil", tipo: "feriado" },
        { data: "2026-10-13", descricao: "Dia dos Professores - Antecipado", tipo: "recesso" },
        { data: "2026-11-02", descricao: "Dia de Finados", tipo: "feriado" },
        { data: "2026-11-15", descricao: "Proclamação da República", tipo: "feriado" },
        { data: "2026-11-20", descricao: "Consciência Negra", tipo: "feriado" },
        { data: "2026-12-21", descricao: "Formatura CAI", tipo: "evento_interno" },
        { data: "2026-12-22", descricao: "Confraternização Escolar", tipo: "evento_interno" },
        { data: "2026-12-25", descricao: "Natal", tipo: "feriado" },
        { data: "2026-12-31", descricao: "Véspera de Ano Novo", tipo: "recesso" }
      ],
      periodosFerias: [
        { descricao: "Recesso de Janeiro", inicio: "2026-01-02", fim: "2026-01-14" },
        { descricao: "Férias de Julho", inicio: "2026-07-13", fim: "2026-07-18" },
        { descricao: "Recesso de Fim de Ano", inicio: "2026-12-23", fim: "2026-12-31" }
      ]
    };
  }

  /**
   * Carrega os dados do JSON ou utiliza fallback
   */
  async loadHolidays(jsonPath = "./Feriados.json") {
    let data;
    try {
      const response = await fetch(jsonPath);
      if (response.ok) {
        data = await response.json();
      } else {
        data = this.getDefaultData();
      }
    } catch (err) {
      console.warn("Carregando base de feriados local embutida:", err);
      data = this.getDefaultData();
    }

    this.processData(data);
    this.isLoaded = true;
    return data;
  }

  /**
   * Processa e indexa o JSON de feriados e férias
   */
  processData(data) {
    this.ano = data.ano || 2026;
    this.feriadosMap.clear();
    this.periodosFerias = data.periodosFerias || [];
    this.feriadosPorMes = {};

    for (let m = 0; m < 12; m++) {
      this.feriadosPorMes[m] = [];
    }

    // 1. Processar feriados e emendas pontuais
    if (data.feriados && Array.isArray(data.feriados)) {
      for (const item of data.feriados) {
        this.feriadosMap.set(item.data, {
          descricao: item.descricao,
          tipo: item.tipo || "feriado"
        });

        const [y, m, d] = item.data.split("-").map(Number);
        const mesIdx = m - 1;
        if (this.feriadosPorMes[mesIdx]) {
          this.feriadosPorMes[mesIdx].push({
            dia: d,
            descricao: item.descricao,
            tipo: item.tipo,
            data: item.data
          });
        }
      }
    }

    // 2. Processar períodos de férias / recessos prolongados
    for (const periodo of this.periodosFerias) {
      const [startYear, startMonth, startDay] = periodo.inicio.split("-").map(Number);
      const [endYear, endMonth, endDay] = periodo.fim.split("-").map(Number);

      let curr = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
      const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);

      while (curr <= end) {
        const key = this.formatDateKey(curr);
        // Se ainda não tiver um feriado com maior prioridade cadastrado:
        if (!this.feriadosMap.has(key)) {
          this.feriadosMap.set(key, {
            descricao: periodo.descricao,
            tipo: "ferias"
          });
        }

        const mesIdx = curr.getMonth();
        const dia = curr.getDate();
        // Adicionar à legenda do mês se ainda não estiver presente
        const jaAdicionado = this.feriadosPorMes[mesIdx].some(
          f => f.descricao === periodo.descricao && f.tipo === "ferias"
        );
        if (!jaAdicionado) {
          this.feriadosPorMes[mesIdx].push({
            dia: `${startDay}/${startMonth} a ${endDay}/${endMonth}`,
            descricao: periodo.descricao,
            tipo: "ferias",
            data: key
          });
        }

        curr.setDate(curr.getDate() + 1);
      }
    }
  }

  formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /**
   * Retorna informações sobre a data (se é feriado, recesso, emenda, férias ou dia normal)
   */
  getDateInfo(date) {
    const key = this.formatDateKey(date);
    if (this.feriadosMap.has(key)) {
      return this.feriadosMap.get(key);
    }
    return null;
  }

  /**
   * Retorna a lista de eventos formatada para o rodapé do mês no modelo Excel/SENAI
   */
  getMonthLegends(monthIndex, year) {
    const eventos = this.feriadosPorMes[monthIndex] || [];
    if (eventos.length === 0) return "";

    const mesesAbrev = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const mesStr = mesesAbrev[monthIndex];

    return eventos
      .map(ev => {
        if (typeof ev.dia === "number") {
          const diaFormatado = String(ev.dia).padStart(2, "0");
          return `${diaFormatado}/${mesStr}-> ${ev.descricao}`;
        }
        return `${ev.descricao}`;
      })
      .join(" ");
  }
}

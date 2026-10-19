// Created at: 2026-10-19 14:20
/**
 * @fileoverview Serviço modular de feriados, emendas e eventos do SENAI (2026-2027).
 */

import { calculateEasterSunday } from "../../core/calendar/easter.js";
import { formatDateISO, parseDateKey } from "../../core/calendar/dateUtils.js";
import { HOLIDAY_LEGENDS, BASE_YEARS } from "./holidayBaseData.js";

const STORAGE_CUSTOM_KEY = "senai_custom_holidays_v1";

export class HolidayService {
  constructor(storage = (typeof window !== "undefined" ? window.localStorage : null)) {
    this.storage = storage;
    this.yearCache = new Map();
    this.customizations = this.loadCustomizations();

    const currentYear = new Date().getFullYear();
    this.getYearData(currentYear);
    this.getYearData(currentYear + 1);
  }

  loadCustomizations() {
    try {
      if (this.storage) {
        const raw = this.storage.getItem(STORAGE_CUSTOM_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            itensAdicionais: Array.isArray(parsed.itensAdicionais) ? parsed.itensAdicionais : (Array.isArray(parsed.adicionais) ? parsed.adicionais : []),
            itensRemovidos: Array.isArray(parsed.itensRemovidos) ? parsed.itensRemovidos : (Array.isArray(parsed.removidos) ? parsed.removidos : [])
          };
        }
      }
    } catch (_) {}
    return { itensAdicionais: [], itensRemovidos: [] };
  }

  saveCustomizations() {
    try {
      if (this.storage) {
        this.storage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(this.customizations));
      }
    } catch (_) {}
    this.yearCache.clear();
  }

  getLegendas() {
    return HOLIDAY_LEGENDS;
  }

  getYearData(year) {
    const y = Number(year);
    if (this.yearCache.has(y)) {
      return this.yearCache.get(y);
    }

    const pascoa = calculateEasterSunday(y);
    const eventos = [];
    const datasMap = new Map();
    const legendsMap = new Map(HOLIDAY_LEGENDS.map(l => [l.id, l]));

    const rawList = BASE_YEARS[String(y)] || [];
    for (const item of rawList) {
      if (!item.data) continue;
      const [iy, im, id] = item.data.split("-").map(Number);
      const leg = legendsMap.get(item.categoria_id) || { bloqueia_aula: true, cor_tema: "#00B0F0", cor: "#00B0F0", nome: "Evento" };

      const ev = {
        data: item.data,
        dia: id,
        mes: im,
        ano: iy,
        descricao: item.descricao,
        categoria_id: item.categoria_id,
        bloqueia_aula: leg.bloqueia_aula,
        cor_tema: leg.cor || leg.cor_tema,
        origem: "base"
      };
      eventos.push(ev);
      datasMap.set(item.data, ev);
    }

    // Remoções do usuário
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

    // Adições / Edições do usuário
    for (const add of this.customizations.itensAdicionais) {
      if (add.data && add.data.startsWith(String(y))) {
        const [cy, cm, cd] = add.data.split("-").map(Number);
        const leg = legendsMap.get(add.categoria_id) || { bloqueia_aula: true, cor_tema: "#00B0F0", cor: "#00B0F0", nome: "Personalizado" };
        const ev = {
          data: add.data,
          dia: cd,
          mes: cm,
          ano: cy,
          descricao: add.descricao || "Evento Personalizado",
          categoria_id: add.categoria_id,
          bloqueia_aula: add.bloqueia_aula !== undefined ? add.bloqueia_aula : true,
          cor_tema: leg.cor || leg.cor_tema,
          origem: "usuario"
        };
        datasMap.set(add.data, ev);
        const idx = eventos.findIndex(e => e.data === add.data);
        if (idx >= 0) eventos[idx] = ev;
        else eventos.push(ev);
      }
    }

    eventos.sort((a, b) => a.data.localeCompare(b.data));

    const result = {
      ano: y,
      datasMap,
      eventos,
      pascoa
    };

    this.yearCache.set(y, result);
    return result;
  }

  isBlocked(dateOrKey) {
    const key = typeof dateOrKey === "string" ? dateOrKey : formatDateISO(dateOrKey);
    if (!key) return false;
    const y = parseInt(key.slice(0, 4), 10);
    const data = this.getYearData(y);
    const ev = data.datasMap.get(key);
    return !!(ev && ev.bloqueia_aula);
  }

  getDateInfo(dateOrKey) {
    const key = typeof dateOrKey === "string" ? dateOrKey : formatDateISO(dateOrKey);
    if (!key) return null;
    const y = parseInt(key.slice(0, 4), 10);
    const data = this.getYearData(y);
    return data.datasMap.get(key) || null;
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
        const dt = new Date(y, m, d, 12, 0, 0);
        const key = formatDateISO(dt);
        const ev = yData.datasMap.get(key) || null;

        dias.push({
          dia: d,
          diaSemana: dt.getDay(),
          dateKey: key,
          data: key,
          evento: ev,
          temEvento: !!ev,
          eventInfo: ev
        });
      }

      const eventosMes = yData.eventos.filter(e => e.mes === (m + 1));

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

  salvarOuAtualizarFeriado({ data, descricao, categoria_id }) {
    if (!data) return false;
    const key = typeof data === "string" ? data : formatDateISO(data);
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

  excluirFeriado(dataKey) {
    if (!dataKey) return false;
    const key = typeof dataKey === "string" ? dataKey : formatDateISO(dataKey);
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
    this.customizations.itensRemovidos = this.customizations.itensRemovidos.filter(k => k !== dataKey);
    this.saveCustomizations();
    return true;
  }

  removerCustomizacao(dataKey) {
    return this.excluirFeriado(dataKey);
  }
}

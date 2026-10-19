// Created at: 2026-10-16 02:02
/**
 * @fileoverview Motor puro de cálculo de cronograma letivo, dias úteis e distribuição de aulas.
 * 100% livre de referências a DOM, window ou storage.
 */

import {
  formatDateISO,
  formatDateBR,
  formatDateShort,
  parseDateInputToISO,
  getISOWeek,
  timeToMinutes,
  minutesToHHMM,
  parseCargaHorariaToMinutes,
  MONTH_NAMES_PT
} from "../calendar/dateUtils.js";

/**
 * @typedef {Object} ScheduleLesson
 * @property {number} numAula
 * @property {Date} data
 * @property {string} dataKey - YYYY-MM-DD
 * @property {string} diaStr - DD
 * @property {number} diaSemana - 0 a 6
 * @property {number} mesIdx - 0 a 11
 * @property {number} ano
 * @property {number} horas
 * @property {number} minutos
 * @property {'teoria'|'pratica'} tipo
 * @property {string} ambiente
 * @property {boolean} isInactive
 * @property {boolean} [isSplit]
 * @property {number} [teoriaMinutos]
 * @property {number} [praticaMinutos]
 * @property {string} [teoriaAmbiente]
 * @property {string} [praticaAmbiente]
 */

/**
 * Calcula o cronograma letivo de aulas com base nas regras de calendário e bloqueios de feriados.
 *
 * @param {Object} config - Configurações do formulário do cronograma.
 * @param {(dateKey: string) => boolean} [isDateBlockedFn] - Função avaliadora de feriados/recessos.
 * @returns {Object|null}
 */
export function calculateSchedule(config, isDateBlockedFn = () => false) {
  if (!config) return null;

  const {
    dataInicioStr,
    cargaHorariaTotal,
    horasPorDia = "04:00",
    diasSemana = [1, 2, 3, 4],
    regraFrequencia = "todas",
    tipoAulaPadrao = "pratica",
    ambienteTeoria = "S01",
    ambientePratica = "L01",
    manualDateOverrides = {},
    inactiveDates = new Set(),
    lessonCustomizations = {}
  } = config;

  const isoInicio = parseDateInputToISO(dataInicioStr);
  if (!isoInicio) return null;

  const totalCargaMinutos = parseCargaHorariaToMinutes(cargaHorariaTotal);
  const cargaHorariaNum = totalCargaMinutos / 60;
  const totalCargaFormatada = minutesToHHMM(totalCargaMinutos);
  const cargaHorariaFormatada = (totalCargaMinutos % 60 === 0)
    ? `${cargaHorariaNum} horas`
    : `${totalCargaFormatada} horas`;

  const hasManualAdd = Object.values(manualDateOverrides).some(v => v === "add");
  const hasActiveDays = Array.isArray(diasSemana) && diasSemana.length > 0;

  if (!hasActiveDays && !hasManualAdd) {
    return {
      aulas: [],
      totalAulas: 0,
      aulasQueCouberam: 0,
      minutosPreenchidos: 0,
      totalCargaMinutos,
      horasPreenchidasFormatadas: "00:00",
      totalCargaFormatada,
      cargaHorariaTotal: cargaHorariaNum,
      cargaHorariaFormatada,
      vigencia: "-",
      semAno: "-",
      mesesSequenciais: [],
      emptyReason: "no_days_selected"
    };
  }

  const [startYear, startMonth, startDay] = isoInicio.split("-").map(Number);
  let curr = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);

  const inactiveSet = inactiveDates instanceof Set ? inactiveDates : new Set(inactiveDates || []);
  const novasAulas = [];
  let minutosRestantes = totalCargaMinutos;
  const minutosDia = timeToMinutes(horasPorDia) || 240;
  const maxLoop = 730;
  let loopCount = 0;

  while (minutosRestantes > 0 && loopCount < maxLoop) {
    loopCount++;
    const diaSemana = curr.getDay();
    const dateKey = formatDateISO(curr);

    const isManuallyRemoved = manualDateOverrides[dateKey] === "remove";
    const isInactive = inactiveSet.has(dateKey);

    if (!isManuallyRemoved && !isInactive) {
      const isManuallyAdded = manualDateOverrides[dateKey] === "add";
      const isBlocked = isDateBlockedFn(dateKey);
      const isWeekValid = regraFrequencia === "todas"
        ? true
        : (regraFrequencia === "pares" ? getISOWeek(curr) % 2 === 0 : getISOWeek(curr) % 2 !== 0);

      const isStandardClassDay = diaSemana !== 0 && diasSemana.includes(diaSemana) && !isBlocked && isWeekValid;

      if (isManuallyAdded || isStandardClassDay) {
        const custom = lessonCustomizations[dateKey];
        const isSplit = custom ? !!custom.isSplit : false;
        const duracaoMinutos = custom ? (custom.minutos || minutosDia) : minutosDia;
        const minutosDestaAula = Math.min(duracaoMinutos, minutosRestantes);
        const tipo = custom ? (custom.tipo || tipoAulaPadrao) : tipoAulaPadrao;
        const ambiente = custom
          ? (custom.ambiente || (tipo === "teoria" ? ambienteTeoria : ambientePratica))
          : (tipo === "teoria" ? ambienteTeoria : ambientePratica);

        const diaNum = curr.getDate();
        const diaStr = String(diaNum).padStart(2, "0");

        novasAulas.push({
          numAula: novasAulas.length + 1,
          data: new Date(curr),
          dataKey: dateKey,
          dia: diaNum,
          diaStr,
          diaSemana,
          mesIdx: curr.getMonth(),
          ano: curr.getFullYear(),
          minutos: minutosDestaAula,
          horas: minutosDestaAula / 60,
          tipo,
          ambiente,
          isInactive: false,
          isSplit
        });

        minutosRestantes -= minutosDestaAula;
      }
    }

    curr.setDate(curr.getDate() + 1);
  }

  if (novasAulas.length === 0) {
    return {
      aulas: [],
      totalAulas: 0,
      aulasQueCouberam: 0,
      minutosPreenchidos: 0,
      totalCargaMinutos,
      horasPreenchidasFormatadas: "00:00",
      totalCargaFormatada,
      cargaHorariaTotal: cargaHorariaNum,
      cargaHorariaFormatada,
      vigencia: "-",
      semAno: "-",
      mesesSequenciais: [],
      emptyReason: "no_valid_days"
    };
  }

  const primeiraData = novasAulas[0].data;
  const ultimaData = novasAulas[novasAulas.length - 1].data;
  const vigenciaCurta = formatDateBR(ultimaData);
  const vigenciaCompleta = `${formatDateBR(primeiraData)} a ${formatDateBR(ultimaData)}`;
  const semAno = `${primeiraData.getMonth() + 1 <= 6 ? "1º Sem" : "2º Sem"} / ${primeiraData.getFullYear()}`;

  // Agrupamento sequencial de meses para folha oficial A4
  const mesesSequenciais = [];
  let lastKey = null;
  let currMes = null;

  for (const a of novasAulas) {
    const k = `${a.ano}-${a.mesIdx}`;
    if (k !== lastKey) {
      lastKey = k;
      currMes = {
        nomeMes: MONTH_NAMES_PT[a.mesIdx],
        mesIdx: a.mesIdx,
        ano: a.ano,
        diasTeoria: [],
        diasPratica: [],
        ambientes: []
      };
      mesesSequenciais.push(currMes);
    }

    if (a.tipo === "teoria") {
      currMes.diasTeoria.push(a.diaStr);
      currMes.diasPratica.push("");
    } else {
      currMes.diasTeoria.push("");
      currMes.diasPratica.push(a.diaStr);
    }
    currMes.ambientes.push(a.ambiente);
  }

  const capacidadeColunas = Math.min(8, mesesSequenciais.length) * 25;
  let colunasConsumidas = 0;
  let minutosPreenchidos = 0;
  let aulasQueCouberam = 0;

  for (const a of novasAulas) {
    if (colunasConsumidas + 1 <= capacidadeColunas) {
      colunasConsumidas++;
      minutosPreenchidos += a.minutos;
      aulasQueCouberam++;
    } else {
      break;
    }
  }

  return {
    aulas: novasAulas,
    totalAulas: novasAulas.length,
    aulasQueCouberam,
    minutosPreenchidos,
    totalCargaMinutos,
    horasPreenchidasFormatadas: minutesToHHMM(minutosPreenchidos),
    totalCargaFormatada,
    cargaHorariaTotal: cargaHorariaNum,
    cargaHorariaFormatada,
    vigencia: vigenciaCurta,
    vigenciaCompleta,
    semAno,
    mesesSequenciais
  };
}

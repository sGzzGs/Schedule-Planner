/**
 * scheduleEngine.js
 * Motor de agendamento de aulas, validação de calendário e dedução de métricas do cronograma.
 */

export class ScheduleEngine {
  static getISOWeek(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  }

  static formatDateBR(date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  static formatDateShort(date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${d}/${m}`;
  }

  static formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  static deriveSemesterYear(startDate, endDate) {
    const startMonth = startDate.getMonth() + 1;
    const year = startDate.getFullYear();
    const sem = startMonth <= 6 ? "01" : "02";
    return `${sem}/${year}`;
  }

  static calculateSchedule(config, holidayService) {
    const {
      dataInicioStr,
      cargaHorariaTotal = 40,
      horasPorDia = 4,
      diasSemana = [1, 2, 3, 4],
      regraFrequencia = "todas",
      tipoAulaPadrao = "pratica", // "pratica", "teoria", "misto"
      percentualTeoria = 0,
      ambiente = "L01"
    } = config;

    if (!dataInicioStr) {
      return { success: false, error: "Data de início não informada." };
    }

    const [startYear, startMonth, startDay] = dataInicioStr.split("-").map(Number);
    let curr = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);

    const aulas = [];
    let horasRestantes = Number(cargaHorariaTotal);
    const chTotalTeoria = Math.round((Number(cargaHorariaTotal) * Number(percentualTeoria)) / 100);
    const chTotalPratica = Number(cargaHorariaTotal) - chTotalTeoria;

    let horasTeoriaAcumuladas = 0;
    let horasPraticaAcumuladas = 0;

    let maxDiasLoop = 730;
    let diasProcessados = 0;

    while (horasRestantes > 0 && diasProcessados < maxDiasLoop) {
      diasProcessados++;
      const diaSemana = curr.getDay();
      const isSelectedDay = diasSemana.includes(diaSemana);

      if (diaSemana !== 0 && isSelectedDay) {
        const weekNum = ScheduleEngine.getISOWeek(curr);
        let semanaValida = true;
        if (regraFrequencia === "pares") semanaValida = (weekNum % 2 === 0);
        if (regraFrequencia === "impares") semanaValida = (weekNum % 2 !== 0);

        if (semanaValida) {
          const infoData = holidayService.getDateInfo(curr);
          const isBlocked = infoData && (
            infoData.tipo === "feriado" ||
            infoData.tipo === "recesso" ||
            infoData.tipo === "emenda" ||
            infoData.tipo === "ferias" ||
            infoData.tipo === "evento_interno"
          );

          if (!isBlocked) {
            const horasDestaAula = Math.min(Number(horasPorDia), horasRestantes);
            let isTeoria = false;
            let isPratica = true;

            if (tipoAulaPadrao === "teoria") {
              isTeoria = true;
              isPratica = false;
              horasTeoriaAcumuladas += horasDestaAula;
            } else if (tipoAulaPadrao === "pratica") {
              isTeoria = false;
              isPratica = true;
              horasPraticaAcumuladas += horasDestaAula;
            } else {
              // Misto baseado no percentual de teoria
              if (horasTeoriaAcumuladas < chTotalTeoria) {
                isTeoria = true;
                isPratica = false;
                horasTeoriaAcumuladas += horasDestaAula;
              } else {
                isTeoria = false;
                isPratica = true;
                horasPraticaAcumuladas += horasDestaAula;
              }
            }

            const aulaObj = {
              numAula: aulas.length + 1,
              data: new Date(curr),
              dataISO: ScheduleEngine.formatDateISO(curr),
              dataBR: ScheduleEngine.formatDateBR(curr),
              dataShort: ScheduleEngine.formatDateShort(curr),
              dia: curr.getDate(),
              diaFormatado: String(curr.getDate()).padStart(2, "0"),
              diaSemana: diaSemana,
              mesIdx: curr.getMonth(),
              ano: curr.getFullYear(),
              horas: horasDestaAula,
              isTeoria,
              isPratica,
              ambiente: ambiente
            };

            aulas.push(aulaObj);
            horasRestantes -= horasDestaAula;
          }
        }
      }

      curr.setDate(curr.getDate() + 1);
    }

    if (aulas.length === 0) {
      return { success: false, error: "Nenhum dia letivo encontrado para os parâmetros selecionados." };
    }

    const dataPrimeiraAula = aulas[0].data;
    const dataUltimaAula = aulas[aulas.length - 1].data;

    const vigenciaInicio = ScheduleEngine.formatDateBR(dataPrimeiraAula);
    const vigenciaFim = ScheduleEngine.formatDateBR(dataUltimaAula);
    const vigenciaCurta = ScheduleEngine.formatDateShort(dataUltimaAula); // Ex: "03/06", "25/06", "28/07"
    const vigenciaCompleta = `${vigenciaInicio} a ${vigenciaFim}`;
    const semAno = ScheduleEngine.deriveSemesterYear(dataPrimeiraAula, dataUltimaAula);

    // Agrupar aulas por mês de forma sequencial (apenas os meses que tiveram aulas)
    const nomesMesesPT = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const mesesSequenciais = [];
    let currentMesKey = null;
    let currentMesObj = null;

    for (const aula of aulas) {
      const key = `${aula.ano}-${aula.mesIdx}`;
      if (key !== currentMesKey) {
        currentMesKey = key;
        currentMesObj = {
          nomeMes: nomesMesesPT[aula.mesIdx],
          mesIdx: aula.mesIdx,
          ano: aula.ano,
          aulas: [],
          diasTeoria: [],
          diasPratica: [],
          ambientes: []
        };
        mesesSequenciais.push(currentMesObj);
      }

      currentMesObj.aulas.push(aula);
      if (aula.isTeoria) {
        currentMesObj.diasTeoria.push(aula.diaFormatado);
      } else {
        currentMesObj.diasPratica.push(aula.diaFormatado);
      }
      currentMesObj.ambientes.push(aula.ambiente);
    }

    // Mapa de todos os 12 meses do ano para o modo calendário visual
    const mesesMap = {};
    for (let m = 0; m < 12; m++) {
      mesesMap[m] = {
        mesIdx: m,
        ano: dataPrimeiraAula.getFullYear(),
        aulas: [],
        diasLetivosSet: new Set(),
        totalHoras: 0
      };
    }
    for (const aula of aulas) {
      const m = aula.mesIdx;
      if (mesesMap[m]) {
        mesesMap[m].aulas.push(aula);
        mesesMap[m].diasLetivosSet.add(aula.dia);
        mesesMap[m].totalHoras += aula.horas;
      }
    }

    return {
      success: true,
      aulas,
      totalAulas: aulas.length,
      cargaHorariaTotal: Number(cargaHorariaTotal),
      cargaHorariaTeoria: horasTeoriaAcumuladas,
      cargaHorariaPratica: horasPraticaAcumuladas,
      dataInicio: dataPrimeiraAula,
      dataTermino: dataUltimaAula,
      vigenciaCurta,
      vigenciaCompleta,
      semAno,
      mesesSequenciais,
      mesesMap
    };
  }
}

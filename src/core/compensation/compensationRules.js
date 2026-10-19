// Created at: 2026-10-16 02:01
/**
 * @fileoverview Regras puras de negócio para apuração de faltas, limites institucionais e compensação de ausências (SENAI).
 * Não depende de DOM, window ou armazenamento.
 */

/**
 * @typedef {Object} AttendanceMetrics
 * @property {number} attendancePercent - Percentual de assiduidade escolar arredondado para baixo (0 a 100).
 * @property {number} absencePercent - Percentual de faltas sobre a carga horária (0 a 100).
 */

/**
 * Calcula a assiduidade e percentual de faltas discente segundo a fórmula institucional SENAI.
 * Fórmula: Math.floor(((CH_Total - Faltas) / CH_Total) * 100)
 *
 * @param {number} chTotal - Carga horária total do curso em horas (ex: 80).
 * @param {number} absencesHours - Total de horas ausentes acumuladas (ex: 20).
 * @returns {AttendanceMetrics}
 */
export function calculateAttendance(chTotal, absencesHours) {
  const ch = Number(chTotal) || 40;
  const faltas = Math.max(0, Number(absencesHours) || 0);

  let freqPercent = Math.floor(((ch - faltas) / ch) * 100);
  if (freqPercent < 0) freqPercent = 0;
  if (freqPercent > 100) freqPercent = 100;

  let pctFaltas = Math.min(100, Math.round((faltas / ch) * 100));
  if (pctFaltas < 0) pctFaltas = 0;

  return {
    attendancePercent: freqPercent,
    absencePercent: pctFaltas
  };
}

/**
 * @typedef {Object} AlertEvaluationParams
 * @property {number} absencePercent - Percentual de faltas do discente (0 a 100).
 * @property {number} [absencesHours=0] - Total de horas ausentes do aluno.
 * @property {number} [lastPrintedAbsences=0] - Quantidade de horas-falta já formalizadas na última ficha impressa.
 * @property {number} [consecutiveAbsences=0] - Número de faltas em dias consecutivos de aula.
 * @property {boolean|null} [manualState=null] - Override manual do usuário (true, false ou null).
 */

/**
 * @typedef {Object} AlertEvaluationResult
 * @property {boolean} active - Se o alerta está ativo para emissão de ficha ou atenção.
 * @property {'warning'|'danger'|null} type - 'danger' (vermelho: >= 25%), 'warning' (amarelo: >= 10% ou 2 consecutivas) ou null.
 * @property {string} reason - Justificativa legível do motivo do alerta.
 */

/**
 * Avalia a necessidade de alerta de ausência para um discente.
 *
 * @param {AlertEvaluationParams} params
 * @returns {AlertEvaluationResult}
 */
export function evaluateAbsenceAlert({
  absencePercent,
  absencesHours = 0,
  lastPrintedAbsences = 0,
  consecutiveAbsences = 0,
  manualState = null
}) {
  // Override manual explícito de desativação
  if (manualState === false) {
    return { active: false, type: null, reason: "" };
  }

  // Override manual explícito de ativação
  if (manualState === true) {
    const type = absencePercent >= 25 ? "danger" : "warning";
    return {
      active: true,
      type,
      reason: "Flag ativada manualmente pelo usuário"
    };
  }

  // Se não há faltas ou todas as faltas já foram formalizadas e impressas
  if (absencesHours === 0 || absencesHours <= lastPrintedAbsences) {
    return { active: false, type: null, reason: "" };
  }

  // Regra 1: Faltas >= 25% -> Triângulo Vermelho de Perigo (Crítico)
  if (absencePercent >= 25) {
    return {
      active: true,
      type: "danger",
      reason: `Excesso crítico de faltas (${absencePercent}% ≥ 25% da carga). Emissão urgente necessária!`
    };
  }

  // Regra 2: Faltas >= 10% -> Ponto de Exclamação Amarelo
  if (absencePercent >= 10) {
    return {
      active: true,
      type: "warning",
      reason: `Limite de 10% de faltas atingido (${absencePercent}%). Termo de ciência pendente!`
    };
  }

  // Regra 3: Duas ou mais faltas consecutivas em dias de aula letivos
  if (consecutiveAbsences >= 2) {
    return {
      active: true,
      type: "warning",
      reason: "Duas ou mais faltas em aulas consecutivas. Termo de ciência pendente!"
    };
  }

  return { active: false, type: null, reason: "" };
}

/**
 * @typedef {Object} StudentSituation
 * @property {boolean} tenderNaoCert - Frequência >= 75%.
 * @property {boolean} naoCert - Frequência entre 40% e 74% (passível de compensação).
 * @property {boolean} naoCertExcesso - Frequência < 40% (excesso irrecuperável).
 */

/**
 * Classifica a situação do discente de acordo com os limites regimentais SENAI.
 * As opções são mutuamente exclusivas.
 *
 * @param {number} attendancePercent - Percentual de frequência (0 a 100).
 * @returns {StudentSituation}
 */
export function classifyStudentSituation(attendancePercent) {
  const freq = Math.max(0, Math.min(100, Math.round(Number(attendancePercent) || 0)));

  return {
    tenderNaoCert: freq >= 75,
    naoCert: freq >= 40 && freq < 75,
    naoCertExcesso: freq < 40
  };
}

/**
 * Pura: Remove faltas cadastradas em dias que não são mais dias letivos válidos.
 * Garante que alterações na data de início ou dias da semana não gerem dados órfãos.
 *
 * @param {Record<string, number>} absencesMap - Mapa de faltas { [dataISO]: horas }.
 * @param {string[]} validClassDates - Array de strings ISO de dias letivos válidos.
 * @returns {Record<string, number>} Novo mapa sem faltas órfãs.
 */
export function purgeOrphanAbsences(absencesMap, validClassDates) {
  if (!absencesMap || typeof absencesMap !== "object") return {};
  const validSet = new Set(validClassDates || []);
  const sanitized = {};

  for (const [dateKey, hours] of Object.entries(absencesMap)) {
    if (validSet.has(dateKey) && typeof hours === "number" && hours > 0) {
      sanitized[dateKey] = hours;
    }
  }

  return sanitized;
}

/**
 * Converte valor numérico de horas (inteiro ou decimal) para string "HH:MM".
 * @param {number} hours - Horas (ex: 4, 12.5, 0).
 * @returns {string} Formato "HH:MM" (ex: "04:00", "12:30", "00:00").
 */
export function formatHoursToHHMM(hours) {
  const hNum = Number(hours) || 0;
  const totalMin = Math.round(hNum * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

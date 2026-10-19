// Created at: 2026-10-16 02:02
/**
 * @fileoverview Store centralizada da aplicação (Hub de Registros SENAI).
 * Gerencia o estado de navegação, cronograma, turmas e compensações.
 */

import { createStore } from "./createStore.js";

/**
 * @typedef {Object} ScheduleFormState
 * @property {string} curso
 * @property {string} turma
 * @property {string} docente
 * @property {string} dataInicioStr
 * @property {number} cargaHorariaTotal
 * @property {string} horasPorDia
 * @property {string} horasPorAula
 * @property {number} aulasPorDia
 * @property {number[]} diasSemana
 * @property {'pratica'|'teoria'|'misto'} tipoAulaPadrao
 * @property {string} ambienteTeoria
 * @property {string} ambientePratica
 */

/**
 * @typedef {Object} TurmaDataState
 * @property {string[]} alunos
 * @property {string[]} ordemFisicaAlunos
 * @property {Record<string, Record<string, number>>} faltasPorAluno
 * @property {Record<string, Record<string, any>>} overrides
 * @property {Record<string, Record<string, string>>} observacoesPorDia
 * @property {Record<string, boolean>} manualFlagAlunos
 * @property {Record<string, boolean>} evadidosPorAluno
 * @property {Record<string, any>} coordenacaoPorAluno
 * @property {Record<string, number>} ultimasFaltasImpressas
 */

/**
 * @typedef {Object} AppState
 * @property {'tab-cronograma'|'tab-compensacao'|'tab-calendario'} activeTab
 * @property {ScheduleFormState} scheduleForm
 * @property {Object|null} scheduleResult
 * @property {Record<string, 'add'|'remove'>} manualDateOverrides
 * @property {string[]} inactiveDateKeys
 * @property {Record<string, TurmaDataState>} turmasCompensacao
 * @property {string} activeTurma
 * @property {string|null} activeStudent
 * @property {'compensacao'|'diario'} subViewDiario
 * @property {number} colAlunoWidth
 * @property {string} parecerCoordenacao
 * @property {number} calendarYear
 */

const initialState = {
  activeTab: "tab-cronograma",
  scheduleForm: {
    curso: "",
    turma: "",
    docente: "",
    dataInicioStr: "2026-03-02",
    cargaHorariaTotal: 40,
    horasPorDia: "04:00",
    horasPorAula: "01:00",
    aulasPorDia: 4,
    diasSemana: [1, 2, 3, 4],
    tipoAulaPadrao: "pratica",
    ambienteTeoria: "S01",
    ambientePratica: "L01"
  },
  scheduleResult: null,
  manualDateOverrides: {},
  inactiveDateKeys: [],
  turmasCompensacao: {},
  activeTurma: "",
  activeStudent: null,
  subViewDiario: "compensacao",
  colAlunoWidth: 200,
  parecerCoordenacao: "",
  calendarYear: 2026
};

export const appStore = createStore(initialState);

// ============================================================================
// ACTIONS CANÔNICAS (MUTADORES DETERMINÍSTICOS)
// ============================================================================

export const AppActions = {
  /**
   * Altera a aba ativa de navegação.
   * @param {'tab-cronograma'|'tab-compensacao'|'tab-calendario'} tabId
   */
  setActiveTab(tabId) {
    appStore.setState({ activeTab: tabId });
  },

  /**
   * Atualiza parcialmente os campos do formulário de cronograma.
   * @param {Partial<ScheduleFormState>} fields
   */
  updateScheduleForm(fields) {
    appStore.setState(prev => ({
      scheduleForm: { ...prev.scheduleForm, ...fields }
    }));
  },

  /**
   * Armazena o resultado do cálculo do cronograma.
   * @param {Object|null} result
   */
  setScheduleResult(result) {
    appStore.setState({ scheduleResult: result });
  },

  /**
   * Seleciona ou cria uma turma ativa para a aba de compensação.
   * @param {string} turmaCode
   */
  setActiveTurma(turmaCode) {
    const code = (turmaCode || "").trim();
    appStore.setState(prev => {
      const turmas = { ...prev.turmasCompensacao };
      if (code && !turmas[code]) {
        turmas[code] = {
          alunos: [],
          ordemFisicaAlunos: [],
          faltasPorAluno: {},
          overrides: {},
          observacoesPorDia: {},
          manualFlagAlunos: {},
          evadidosPorAluno: {},
          coordenacaoPorAluno: {},
          ultimasFaltasImpressas: {}
        };
      }
      return {
        activeTurma: code,
        turmasCompensacao: turmas,
        activeStudent: turmas[code]?.alunos[0] || null
      };
    });
  },

  /**
   * Atualiza a lista de alunos de uma turma.
   * @param {string} turmaCode
   * @param {string[]} alunos
   */
  setTurmaAlunos(turmaCode, alunos) {
    appStore.setState(prev => {
      const turma = prev.turmasCompensacao[turmaCode] || {
        faltasPorAluno: {},
        overrides: {},
        observacoesPorDia: {},
        manualFlagAlunos: {},
        evadidosPorAluno: {},
        coordenacaoPorAluno: {},
        ultimasFaltasImpressas: {}
      };

      const updatedTurmas = {
        ...prev.turmasCompensacao,
        [turmaCode]: {
          ...turma,
          alunos: [...alunos],
          ordemFisicaAlunos: [...alunos]
        }
      };

      return {
        turmasCompensacao: updatedTurmas,
        activeStudent: prev.activeStudent || alunos[0] || null
      };
    });
  },

  /**
   * Registra ou remove faltas de um discente em uma data ISO específica.
   * @param {string} turmaCode
   * @param {string} aluno
   * @param {string} dataKey - YYYY-MM-DD
   * @param {number} horas - Quantidade de horas (0 para remover).
   */
  setAlunoFalta(turmaCode, aluno, dataKey, horas) {
    appStore.setState(prev => {
      const turma = prev.turmasCompensacao[turmaCode];
      if (!turma) return {};

      const faltasAluno = { ...(turma.faltasPorAluno[aluno] || {}) };
      if (horas > 0) {
        faltasAluno[dataKey] = horas;
      } else {
        delete faltasAluno[dataKey];
      }

      return {
        turmasCompensacao: {
          ...prev.turmasCompensacao,
          [turmaCode]: {
            ...turma,
            faltasPorAluno: {
              ...turma.faltasPorAluno,
              [aluno]: faltasAluno
            }
          }
        }
      };
    });
  },

  /**
   * Define o discente ativo para inspeção e edição.
   * @param {string|null} aluno
   */
  setActiveStudent(aluno) {
    appStore.setState({ activeStudent: aluno });
  },

  /**
   * Alterna a sub-visão do diário ('compensacao' ou 'diario').
   * @param {'compensacao'|'diario'} subView
   */
  setSubViewDiario(subView) {
    appStore.setState({ subViewDiario: subView });
  },

  /**
   * Ajusta a largura da coluna de discentes (entre 75px e 450px).
   * @param {number} width
   */
  setColAlunoWidth(width) {
    const w = Math.max(75, Math.min(450, Number(width) || 200));
    appStore.setState({ colAlunoWidth: w });
  },

  /**
   * Atualiza o ano de exibição no calendário anual.
   * @param {number} year
   */
  setCalendarYear(year) {
    appStore.setState({ calendarYear: Number(year) || 2026 });
  }
};

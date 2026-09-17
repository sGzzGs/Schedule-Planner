/**
 * state.js
 * Gerenciamento centralizado de estado, presets oficiais e persistência.
 */

export const ESCOLA_PADRAO = 'ESCOLA SENAI "Humberto Reis Costa"';

export const HORARIO_PRESETS = [
  { label: "Noite (18:45 às 22:45)", inicio: "18:45", fim: "22:45", turno: "Noite" },
  { label: "Tarde (13:15 às 17:15)", inicio: "13:15", fim: "17:15", turno: "Tarde" },
  { label: "Tarde (13:30 às 17:30)", inicio: "13:30", fim: "17:30", turno: "Tarde" },
  { label: "Manhã (07:30 às 11:30)", inicio: "07:30", fim: "11:30", turno: "Manhã" },
  { label: "Manhã (08:00 às 12:00)", inicio: "08:00", fim: "12:00", turno: "Manhã" },
  { label: "Sábado Integral (08:00 às 17:00)", inicio: "08:00", fim: "17:00", turno: "Sábado" },
  { label: "Sábado Manhã (08:00 às 12:00)", inicio: "08:00", fim: "12:00", turno: "Sábado" },
  { label: "Sábado Tarde (13:00 às 17:00)", inicio: "13:00", fim: "17:00", turno: "Sábado" }
];

export const PRESETS = {
  FUPYTHON_2602NG: {
    nomeCurso: "Fundamentos do Python 1",
    codigoTurma: "FUPYTHON_2602NG",
    unidadeCurricular: "Fundamentos do Python 1",
    unidadeEscolar: ESCOLA_PADRAO,
    coordenador: "Carlos José Júnior",
    docente: "Leonardo Gabriel Matos da Silva",
    elaborador: "Leonardo Gabriel Matos da Silva",
    aprovador: "Carlos José Júnior",
    ambiente: "L08",
    turno: "Noite",
    horaInicio: "18:45",
    horaFim: "22:45",
    dataInicioStr: "2026-05-18",
    cargaHorariaTotal: 30,
    horasPorDia: 4,
    diasSemana: [1, 2, 3, 4], // Seg, Ter, Qua, Qui
    regraFrequencia: "todas",
    tipoAulaPadrao: "pratica",
    percentualTeoria: 0,
    modoVisualizacao: "oficial"
  },
  JAVA_2602TG: {
    nomeCurso: "Programação JAVA",
    codigoTurma: "JAVA_2602TG",
    unidadeCurricular: "Lógica de Programação / Orientação a Objeto / Interface de Programação API",
    unidadeEscolar: ESCOLA_PADRAO,
    coordenador: "Carlos José Júnior",
    docente: "Leonardo Gabriel Matos da Silva",
    elaborador: "Leonardo Gabriel Matos da Silva",
    aprovador: "Carlos José Júnior",
    ambiente: "L01",
    turno: "Tarde",
    horaInicio: "13:15",
    horaFim: "17:15",
    dataInicioStr: "2026-04-14",
    cargaHorariaTotal: 120,
    horasPorDia: 4,
    diasSemana: [1, 2, 3, 4], // Seg, Ter, Qua, Qui
    regraFrequencia: "todas",
    tipoAulaPadrao: "pratica",
    percentualTeoria: 0,
    modoVisualizacao: "oficial"
  },
  PYTHONFW_2601NG: {
    nomeCurso: "Programação em Python com Framework",
    codigoTurma: "PYTHONFW_2601NG",
    unidadeCurricular: "Programação em Python com Framework",
    unidadeEscolar: ESCOLA_PADRAO,
    coordenador: "Carlos José Júnior",
    docente: "Leonardo Gabriel Matos da Silva",
    elaborador: "Leonardo Gabriel Matos da Silva",
    aprovador: "Carlos José Júnior",
    ambiente: "L01",
    turno: "Noite",
    horaInicio: "18:45",
    horaFim: "22:45",
    dataInicioStr: "2026-07-29",
    cargaHorariaTotal: 80,
    horasPorDia: 4,
    diasSemana: [1, 2, 3, 4], // Seg, Ter, Qua, Qui
    regraFrequencia: "todas",
    tipoAulaPadrao: "pratica",
    percentualTeoria: 0,
    modoVisualizacao: "oficial"
  },
  GOOANTIG_2604NGv2: {
    nomeCurso: "Desenvolvimento de Aplicações com IA Generativa utilizando Google Antigravity",
    codigoTurma: "GOOANTIG_2604NG",
    unidadeCurricular: "Desenvolvimento de Aplicações com IA Generativa utilizando Google Antigravity",
    unidadeEscolar: ESCOLA_PADRAO,
    coordenador: "Carlos José Júnior",
    docente: "Leonardo Gabriel Matos da Silva",
    elaborador: "Leonardo Gabriel Matos da Silva",
    aprovador: "Carlos José Júnior",
    ambiente: "L01",
    turno: "Noite",
    horaInicio: "18:45",
    horaFim: "22:45",
    dataInicioStr: "2026-07-06",
    cargaHorariaTotal: 40,
    horasPorDia: 4,
    diasSemana: [1, 2, 3, 4, 5], // Seg a Sex
    regraFrequencia: "todas",
    tipoAulaPadrao: "pratica",
    percentualTeoria: 0,
    modoVisualizacao: "oficial"
  }
};

const STORAGE_KEY = "senai_cronograma_state_v3";

export class StateManager {
  constructor() {
    this.state = this.loadState();
    this.listeners = [];
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.unidadeEscolar = ESCOLA_PADRAO; // Sempre fixa
        return parsed;
      }
    } catch (e) {
      console.warn("Erro ao ler localStorage:", e);
    }
    return { ...PRESETS.FUPYTHON_2602NG };
  }

  saveState() {
    try {
      this.state.unidadeEscolar = ESCOLA_PADRAO;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Erro ao salvar no localStorage:", e);
    }
  }

  get() {
    return { ...this.state, unidadeEscolar: ESCOLA_PADRAO };
  }

  set(updates) {
    this.state = { ...this.state, ...updates, unidadeEscolar: ESCOLA_PADRAO };
    this.saveState();
    this.notify();
  }

  loadPreset(presetKey) {
    if (PRESETS[presetKey]) {
      this.state = { ...PRESETS[presetKey] };
      this.saveState();
      this.notify();
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.get());
    }
  }
}

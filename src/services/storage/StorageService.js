// Created at: 2026-10-16 02:14
/**
 * @fileoverview Serviço unificado de persistência, sanitização e backup (LocalStorage / Memória).
 * Isola o acesso a armazenamento de toda a aplicação.
 */

export const STORAGE_KEYS = {
  MODELS: "SENAI_SAVED_MODELS",
  HORARIOS: "SENAI_CUSTOM_HORARIOS",
  TURMAS: "SENAI_COMP_TURMAS_DATA",
  PARECER: "SENAI_COMP_COORD_PARECER",
  CONTEUDO: "SENAI_COMP_CONTEUDO_DATA",
  COL_WIDTH: "SENAI_COMP_COL_ALUNO_WIDTH",
  HOLIDAYS: "senai_custom_holidays_v1",
  THEME: "theme",
  SIDEBAR_WIDTH: "senai_panels_sidebar_width"
};

export class StorageService {
  /**
   * @param {Storage|null} [storage] - Objeto storage (padrão: window.localStorage ou fallback em memória).
   */
  constructor(storage = (typeof window !== "undefined" ? window.localStorage : null)) {
    this.memoryStore = new Map();
    this.storage = storage;
  }

  /**
   * Recupera um item parseado de JSON com fallback seguro.
   * @template T
   * @param {string} key
   * @param {T} [defaultValue=null]
   * @returns {T}
   */
  get(key, defaultValue = null) {
    try {
      if (this.storage) {
        const item = this.storage.getItem(key);
        return item !== null ? JSON.parse(item) : defaultValue;
      }
    } catch (_) {}
    return this.memoryStore.has(key) ? this.memoryStore.get(key) : defaultValue;
  }

  /**
   * Grava um valor serializado em JSON com proteção contra falhas.
   * @param {string} key
   * @param {any} value
   * @returns {boolean}
   */
  set(key, value) {
    try {
      if (this.storage) {
        this.storage.setItem(key, JSON.stringify(value));
        return true;
      }
    } catch (_) {}
    this.memoryStore.set(key, value);
    return true;
  }

  /**
   * Remove uma chave do armazenamento.
   * @param {string} key
   */
  remove(key) {
    try {
      if (this.storage) {
        this.storage.removeItem(key);
      }
    } catch (_) {}
    this.memoryStore.delete(key);
  }

  // ==========================================================================
  // OPERAÇÕES DE MODELOS / PRESETS
  // ==========================================================================

  getSavedModels() {
    return this.get(STORAGE_KEYS.MODELS, {});
  }

  saveModel(name, modelData) {
    if (!name || typeof name !== "string") return false;
    const models = this.getSavedModels();
    models[name.trim()] = { ...modelData, _salvoEm: new Date().toISOString() };
    return this.set(STORAGE_KEYS.MODELS, models);
  }

  deleteModel(name) {
    if (!name) return false;
    const models = this.getSavedModels();
    if (models[name]) {
      delete models[name];
      return this.set(STORAGE_KEYS.MODELS, models);
    }
    return false;
  }

  // ==========================================================================
  // OPERAÇÕES DE TURMAS E COMPENSAÇÃO
  // ==========================================================================

  getTurmasData() {
    return this.get(STORAGE_KEYS.TURMAS, {});
  }

  saveTurmaData(turmaCode, turmaData) {
    if (!turmaCode) return false;
    const turmas = this.getTurmasData();
    turmas[turmaCode] = {
      ...turmaData,
      _atualizadoEm: new Date().toISOString()
    };
    return this.set(STORAGE_KEYS.TURMAS, turmas);
  }

  getColAlunoWidth() {
    const raw = this.get(STORAGE_KEYS.COL_WIDTH, 200);
    const num = parseInt(raw, 10);
    return (!isNaN(num) && num >= 75 && num <= 450) ? num : 200;
  }

  saveColAlunoWidth(width) {
    const num = Math.max(75, Math.min(450, parseInt(width, 10) || 200));
    return this.set(STORAGE_KEYS.COL_WIDTH, num);
  }

  // ==========================================================================
  // BACKUP CONSOLIDADO & RESTAURAÇÃO RESILIENTE
  // ==========================================================================

  exportCompleteBackup() {
    return {
      version: "3.0",
      exportedAt: new Date().toISOString(),
      savedModels: this.getSavedModels(),
      customHorarios: this.get(STORAGE_KEYS.HORARIOS, []),
      turmasCompensacao: this.getTurmasData(),
      parecerCoordenacao: this.get(STORAGE_KEYS.PARECER, ""),
      conteudoProgramatico: this.get(STORAGE_KEYS.CONTEUDO, {}),
      colAlunoWidth: this.getColAlunoWidth(),
      holidayCustomizations: this.get(STORAGE_KEYS.HOLIDAYS, { itensAdicionais: [], itensRemovidos: [] }),
      theme: this.get(STORAGE_KEYS.THEME, "solarized"),
      sidebarWidth: this.get(STORAGE_KEYS.SIDEBAR_WIDTH, 400)
    };
  }

  /**
   * Importa e mescla com resiliência um backup completo JSON sem apagar dados pré-existentes.
   * @param {Object} backupData
   * @returns {boolean}
   */
  importCompleteBackup(backupData) {
    if (!backupData || typeof backupData !== "object") return false;

    // 1. Mesclar turmas sem sobrescrever outras não conflitantes
    const novasTurmas = backupData.turmasCompensacao || backupData.turmas;
    if (novasTurmas && typeof novasTurmas === "object") {
      const turmasAtuais = this.getTurmasData();
      const mescladas = { ...turmasAtuais, ...novasTurmas };
      this.set(STORAGE_KEYS.TURMAS, mescladas);
    }

    // 2. Mesclar modelos de cronograma
    if (backupData.savedModels && typeof backupData.savedModels === "object") {
      const modelosAtuais = this.getSavedModels();
      const modelosMesclados = { ...modelosAtuais, ...backupData.savedModels };
      this.set(STORAGE_KEYS.MODELS, modelosMesclados);
    }

    // 3. Atualizar parecer da coordenação se fornecido
    if (typeof backupData.parecerCoordenacao === "string") {
      this.set(STORAGE_KEYS.PARECER, backupData.parecerCoordenacao);
    }

    // 4. Atualizar largura da coluna se fornecida
    if (backupData.colAlunoWidth) {
      this.saveColAlunoWidth(backupData.colAlunoWidth);
    }

    // 5. Atualizar customizações de feriados se fornecidas
    if (backupData.holidayCustomizations && typeof backupData.holidayCustomizations === "object") {
      this.set(STORAGE_KEYS.HOLIDAYS, backupData.holidayCustomizations);
    }

    return true;
  }
}

export const storageService = new StorageService();

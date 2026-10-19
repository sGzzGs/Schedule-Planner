// Created at: 2026-10-17 14:37
/**
 * @fileoverview Gerenciador de interface da Barra Superior (TopBar).
 * Controla navegação entre abas, seleção/gestão de modelos de turma e exportação em PDF.
 */

export class TopBarView {
  /**
   * @param {Object} [options]
   * @param {HTMLElement} [options.root=document]
   * @param {(targetTab: string, currentTab: string) => void} [options.onTabChange]
   * @param {() => void} [options.onSaveModel]
   * @param {(modelKey: string) => void} [options.onDeleteModel]
   * @param {(modelKey: string) => void} [options.onSelectModel]
   * @param {() => Promise<void>|void} [options.onExportPdf]
   */
  constructor(options = {}) {
    this.root = options.root || (typeof document !== "undefined" ? document : null);
    this.onTabChange = options.onTabChange || (() => {});
    this.onSaveModel = options.onSaveModel || (() => {});
    this.onDeleteModel = options.onDeleteModel || (() => {});
    this.onSelectModel = options.onSelectModel || (() => {});
    this.onExportPdf = options.onExportPdf || (() => {});

    this.currentTab = "tab-cronograma";
    this.tabOrder = ["tab-cronograma", "tab-compensacao", "tab-calendario"];

    this._bindElements();
  }

  _bindElements() {
    if (!this.root) return;

    this.tabs = this.root.querySelectorAll(".app-tab");
    this.presetSelect = this.root.querySelector("#presetSelect");
    this.btnSaveModel = this.root.querySelector("#btn-salvar-modelo");
    this.btnDeleteModel = this.root.querySelector("#btn-deletar-modelo");
    this.btnExportPdf = this.root.querySelector("#btn-export-pdf");
    this.versionPill = this.root.querySelector(".stitch-version-pill");
    this.versionPopup = this.root.querySelector("#version-popup");
  }

  /**
   * Inicializa ouvintes de eventos da TopBar.
   */
  init() {
    this._bindElements();
    this._initTabs();
    this._initModelControls();
    this._initPdfExport();
    this._initVersionPopup();
  }

  _initTabs() {
    if (!this.tabs) return;

    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetTab = tab.dataset.tab;
        if (targetTab && targetTab !== this.currentTab) {
          this.switchTab(targetTab);
        }
      });
    });
  }

  /**
   * Realiza a transição suave entre abas.
   * @param {string} toTabId
   */
  switchTab(toTabId) {
    if (!this.root || toTabId === this.currentTab) return;

    const fromTabId = this.currentTab;
    const fromEl = this.root.querySelector(`#${fromTabId}`);
    const toEl = this.root.querySelector(`#${toTabId}`);
    const fromTabBtn = this.root.querySelector(`.app-tab[data-tab="${fromTabId}"]`);
    const toTabBtn = this.root.querySelector(`.app-tab[data-tab="${toTabId}"]`);

    const fromIdx = this.tabOrder.indexOf(fromTabId);
    const toIdx = this.tabOrder.indexOf(toTabId);
    const goingRight = toIdx > fromIdx;

    if (fromEl) {
      fromEl.classList.remove("page-active");
      fromEl.classList.add(goingRight ? "page-exit-left" : "page-exit-right");
      setTimeout(() => {
        fromEl.classList.remove("page-exit-left", "page-exit-right");
      }, 320);
    }

    if (toEl) {
      toEl.classList.add("page-active");
    }

    if (fromTabBtn) {
      fromTabBtn.classList.remove("active");
      fromTabBtn.setAttribute("aria-selected", "false");
    }

    if (toTabBtn) {
      toTabBtn.classList.add("active");
      toTabBtn.setAttribute("aria-selected", "true");
    }

    this.currentTab = toTabId;
    this.onTabChange(toTabId, fromTabId);
  }

  _initModelControls() {
    if (this.presetSelect) {
      this.presetSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val) {
          this.onSelectModel(val);
        }
      });
    }

    if (this.btnSaveModel) {
      this.btnSaveModel.addEventListener("click", () => {
        this.onSaveModel();
      });
    }

    if (this.btnDeleteModel) {
      this.btnDeleteModel.addEventListener("click", () => {
        const selected = this.getSelectedModel();
        this.onDeleteModel(selected);
      });
    }
  }

  _initPdfExport() {
    if (this.btnExportPdf) {
      this.btnExportPdf.addEventListener("click", async () => {
        this.setPdfLoading(true);
        try {
          await this.onExportPdf();
        } finally {
          this.setPdfLoading(false);
        }
      });
    }
  }

  _initVersionPopup() {
    if (!this.versionPill || !this.versionPopup) return;

    this.versionPill.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = this.versionPopup.style.display === "block";
      this.versionPopup.style.display = isVisible ? "none" : "block";
    });

    if (typeof document !== "undefined") {
      document.addEventListener("click", (e) => {
        if (this.versionPopup && !this.versionPopup.contains(e.target) && e.target !== this.versionPill) {
          this.versionPopup.style.display = "none";
        }
      });
    }
  }

  /**
   * Preenche a lista suspensa de modelos salvos.
   * @param {Object} models
   * @param {string} [currentKey]
   */
  populatePresets(models = {}, currentKey = "") {
    if (!this.presetSelect) return;

    this.presetSelect.innerHTML = "";
    const keys = Object.keys(models || {});

    if (keys.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "-- Nenhum modelo salvo --";
      this.presetSelect.appendChild(opt);
      return;
    }

    for (const key of keys) {
      const opt = document.createElement("option");
      opt.value = "SAVED_" + key;
      opt.textContent = key;
      this.presetSelect.appendChild(opt);
    }

    if (currentKey) {
      const formatted = currentKey.startsWith("SAVED_") ? currentKey : "SAVED_" + currentKey;
      if (keys.includes(currentKey.replace("SAVED_", ""))) {
        this.presetSelect.value = formatted;
        return;
      }
    }

    this.presetSelect.value = "SAVED_" + keys[0];
  }

  /**
   * Obtém o modelo atualmente selecionado na lista suspensa.
   * @returns {string}
   */
  getSelectedModel() {
    return this.presetSelect ? this.presetSelect.value : "";
  }

  /**
   * Altera a seleção atual na lista suspensa.
   * @param {string} modelKey
   */
  setSelectedModel(modelKey) {
    if (!this.presetSelect) return;
    this.presetSelect.value = modelKey;
  }

  /**
   * Alterna o estado visual de geração de PDF.
   * @param {boolean} isLoading
   */
  setPdfLoading(isLoading) {
    if (!this.btnExportPdf) return;

    if (isLoading) {
      this.btnExportPdf.disabled = true;
      this.btnExportPdf.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin text-xs"></i>
        <span>Gerando PDF...</span>
      `;
    } else {
      this.btnExportPdf.disabled = false;
      this.btnExportPdf.innerHTML = `
        <i class="fa-solid fa-file-pdf text-xs"></i>
        <span>Baixar PDF</span>
      `;
    }
  }
}

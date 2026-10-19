// Created at: 2026-10-17 14:29
/**
 * @fileoverview Utilitário acessível e modular de gerenciamento de modais.
 * Gerencia visibilidade, backdrop, tecla ESC e retenção de foco.
 */

export class Modal {
  /**
   * Abre um modal por ID ou elemento DOM.
   * @param {string|HTMLElement} modalTarget
   * @param {Object} [options]
   * @param {() => void} [options.onClose]
   * @returns {boolean}
   */
  static open(modalTarget, options = {}) {
    const el = typeof modalTarget === "string" ? document.getElementById(modalTarget) : modalTarget;
    if (!el) return false;

    el.style.display = "flex";
    el.classList.add("modal-open", "active");
    el.setAttribute("aria-hidden", "false");

    // Focar primeiro elemento focável ou o próprio card
    const card = el.querySelector(".day-modal-card, [role='dialog']") || el;
    card.setAttribute("tabindex", "-1");
    card.focus();

    // Handler de fechamento por ESC
    const escHandler = (e) => {
      if (e.key === "Escape") {
        Modal.close(el, options);
      }
    };
    el._escHandler = escHandler;
    document.addEventListener("keydown", escHandler);

    // Handler de fechamento por clique no backdrop
    const backdropHandler = (e) => {
      if (e.target === el) {
        Modal.close(el, options);
      }
    };
    el._backdropHandler = backdropHandler;
    el.addEventListener("click", backdropHandler);

    return true;
  }

  /**
   * Fecha um modal por ID ou elemento DOM.
   * @param {string|HTMLElement} modalTarget
   * @param {Object} [options]
   * @param {() => void} [options.onClose]
   * @returns {boolean}
   */
  static close(modalTarget, options = {}) {
    const el = typeof modalTarget === "string" ? document.getElementById(modalTarget) : modalTarget;
    if (!el) return false;

    el.style.display = "none";
    el.classList.remove("modal-open", "active");
    el.setAttribute("aria-hidden", "true");

    if (el._escHandler) {
      document.removeEventListener("keydown", el._escHandler);
      delete el._escHandler;
    }

    if (el._backdropHandler) {
      el.removeEventListener("click", el._backdropHandler);
      delete el._backdropHandler;
    }

    if (typeof options.onClose === "function") {
      options.onClose();
    }

    return true;
  }
}

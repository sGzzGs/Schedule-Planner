// Created at: 2026-10-17 14:35
/**
 * @fileoverview Componente modular de notificações flutuantes (Toasts).
 * Gerencia ciclo de vida, auto-dismiss, animações e sanitização anti-XSS.
 */

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class Toast {
  /**
   * Obtém ou inicializa o container de toasts no DOM.
   * @param {string} [containerId='comp-toast-container']
   * @returns {HTMLElement|null}
   */
  static getContainer(containerId = "comp-toast-container") {
    if (typeof document === "undefined") return null;
    let container = document.getElementById(containerId);
    if (!container && document.body) {
      container = document.createElement("div");
      container.id = containerId;
      container.className = "comp-toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Exibe um toast com auto-dismiss.
   * @param {string} title - Título do toast
   * @param {string} message - Corpo descritivo
   * @param {'success'|'warning'|'info'|'danger'|'error'} [type='success']
   * @param {number} [duration=3500] - Tempo em milissegundos
   * @returns {HTMLElement|null}
   */
  static show(title, message, type = "success", duration = 3500) {
    const container = Toast.getContainer();
    if (!container) return null;

    const toast = document.createElement("div");
    const isWarning = type === "warning";
    const isDanger = type === "danger" || type === "error";
    const isInfo = type === "info";

    let extraClass = "";
    if (isWarning) extraClass = "toast-warning";
    else if (isDanger) extraClass = "toast-danger";
    else if (isInfo) extraClass = "toast-info";

    toast.className = `comp-toast ${extraClass}`.trim();

    let icon = "🖨️";
    if (isWarning) icon = "⚠️";
    else if (isDanger) icon = "❌";
    else if (isInfo) icon = "ℹ️";

    toast.innerHTML = `
      <div class="comp-toast-icon">${icon}</div>
      <div class="comp-toast-content">
        <div class="comp-toast-title">${escapeHtml(title)}</div>
        <div class="comp-toast-body">${escapeHtml(message)}</div>
      </div>
    `;

    container.appendChild(toast);

    // Auto-dismiss com transição suave
    if (duration > 0) {
      const dismissTimeout = setTimeout(() => {
        Toast.dismiss(toast);
      }, duration);
      toast._dismissTimeout = dismissTimeout;
    }

    return toast;
  }

  /**
   * Remove o toast do DOM com animação de saída.
   * @param {HTMLElement} toast
   */
  static dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    if (toast._dismissTimeout) {
      clearTimeout(toast._dismissTimeout);
      delete toast._dismissTimeout;
    }
    toast.classList.add("toast-hide");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  static success(title, message, duration = 3500) {
    return Toast.show(title, message, "success", duration);
  }

  static warning(title, message, duration = 3500) {
    return Toast.show(title, message, "warning", duration);
  }

  static info(title, message, duration = 3500) {
    return Toast.show(title, message, "info", duration);
  }

  static danger(title, message, duration = 3500) {
    return Toast.show(title, message, "danger", duration);
  }

  static error(title, message, duration = 3500) {
    return Toast.show(title, message, "danger", duration);
  }
}

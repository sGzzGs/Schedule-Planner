// Created at: 2026-10-16 02:14
/**
 * @fileoverview Serviço de impressão nativa de documentos e fichas escolares.
 */

export class PrintService {
  /**
   * Dispara a impressão do documento atual ou de um elemento isolado.
   * @param {HTMLElement|string} [target] - Elemento ou string HTML a ser impresso.
   * @param {Object} [options] - Opções de impressão.
   * @returns {Promise<boolean>}
   */
  static async print(target = null, options = {}) {
    if (typeof window === "undefined") return false;

    // Se nenhum alvo for fornecido, aciona a impressão da janela atual
    if (!target) {
      if (typeof window.print === "function") {
        window.print();
      }
      return true;
    }

    // Se for string HTML, injeta em iframe temporário
    if (typeof target === "string") {
      return PrintService.printHtmlString(target, options.title);
    }

    // Se for elemento DOM, pode acionar diretamente
    if (typeof window.print === "function") {
      window.print();
    }
    return true;
  }

  /**
   * Imprime uma string HTML isolada criando um iframe oculto.
   * @param {string} htmlContent
   * @param {string} [title="Impressão"]
   * @returns {Promise<boolean>}
   */
  static printHtmlString(htmlContent, title = "Impressão") {
    return new Promise((resolve) => {
      try {
        if (typeof document === "undefined") {
          resolve(false);
          return;
        }

        const originalTitle = document.title;
        document.title = title;

        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.left = "-9999px";
        iframe.style.top = "0";
        iframe.style.width = "210mm";
        iframe.style.height = "297mm";
        iframe.style.border = "0";
        iframe.style.opacity = "0.01";
        iframe.style.pointerEvents = "none";
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
          if (typeof window.print === "function") window.print();
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          document.title = originalTitle;
          resolve(true);
          return;
        }

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title}</title>
            </head>
            <body>
              ${htmlContent}
            </body>
          </html>
        `);
        doc.close();

        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          document.title = originalTitle;
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          resolve(true);
        };

        window.addEventListener("afterprint", cleanup, { once: true });
        setTimeout(cleanup, 3000);

        try {
          if (typeof iframe.contentWindow?.print === "function") {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } else if (typeof window.print === "function") {
            window.print();
          }
        } catch (_) {}
      } catch (err) {
        console.warn("Fallback de impressão acionado:", err);
        if (typeof window.print === "function") window.print();
        resolve(true);
      }
    });
  }
}

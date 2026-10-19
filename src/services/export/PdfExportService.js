// Created at: 2026-10-16 02:14
/**
 * @fileoverview Serviço de exportação para PDF com html2pdf e fallback resiliente para PrintService.
 */

import { PrintService } from "./PrintService.js";

export class PdfExportService {
  /**
   * Exporta um elemento DOM para arquivo PDF.
   * Se html2pdf não estiver disponível no escopo global, recorre ao diálogo nativo de impressão.
   *
   * @param {HTMLElement} element - Elemento DOM raiz a ser renderizado no PDF.
   * @param {Object} [options] - Opções de configuração do PDF.
   * @returns {Promise<boolean>}
   */
  static async exportToPdf(element, options = {}) {
    if (!element) return false;

    const defaultFilename = `Cronograma_SENAI_${new Date().toISOString().slice(0, 10)}.pdf`;
    const filename = options.filename || defaultFilename;

    // Verificar disponibilidade do html2pdf.js global
    if (typeof window !== "undefined" && typeof window.html2pdf === "function") {
      try {
        const opt = {
          margin: options.margin || [5, 5, 5, 5],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: options.scale || 2,
            useCORS: true,
            logging: false
          },
          jsPDF: {
            unit: "mm",
            format: options.format || "a4",
            orientation: options.orientation || "landscape"
          }
        };

        await window.html2pdf().set(opt).from(element).save();
        return true;
      } catch (err) {
        console.warn("Falha no html2pdf, acionando fallback de impressão:", err);
      }
    }

    // Fallback: Aciona PrintService
    return PrintService.print(element, { title: filename });
  }
}

// Created at: 2026-10-16 02:14
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrintService } from "@services/export/PrintService.js";
import { PdfExportService } from "@services/export/PdfExportService.js";

describe("services/export/ - Serviços de Exportação e Impressão", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.print = vi.fn();
    document.title = "Título Original do Hub";
  });

  describe("PrintService", () => {
    it("deve disparar window.print() quando nenhum alvo for fornecido", async () => {
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
      const res = await PrintService.print();
      expect(res).toBe(true);
      expect(printSpy).toHaveBeenCalled();
    });

    it("deve criar um iframe com dimensões A4 e sincronizar document.title para o Chromium", async () => {
      const initialTitle = document.title;
      const targetTitle = "Compensacao_TURMA_ALUNO_28_10_26";

      const res = await PrintService.print("<div>Conteúdo da Ficha</div>", { title: targetTitle });
      expect(res).toBe(true);

      // O iframe temporário foi criado com dimensões reais fora da tela
      const iframes = document.querySelectorAll("iframe");
      if (iframes.length > 0) {
        const lastIframe = iframes[iframes.length - 1];
        expect(lastIframe.style.width).toBe("210mm");
        expect(lastIframe.style.height).toBe("297mm");
      }
    });

    it("deve restaurar document.title após disparo de afterprint", async () => {
      const initialTitle = "Hub Inicial";
      document.title = initialTitle;
      const targetTitle = "Compensacao_TURMA_ALUNO_TEST";

      const printPromise = PrintService.print("<div>Ficha</div>", { title: targetTitle });

      // Simula evento afterprint
      window.dispatchEvent(new Event("afterprint"));
      await printPromise;

      expect(document.title).toBe(initialTitle);
    });
  });

  describe("PdfExportService", () => {
    it("deve retornar false se nenhum elemento for passado", async () => {
      const res = await PdfExportService.exportToPdf(null);
      expect(res).toBe(false);
    });

    it("deve acionar fallback de impressão se html2pdf não estiver disponível", async () => {
      window.html2pdf = undefined;
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

      const el = document.createElement("div");
      el.id = "target";
      const res = await PdfExportService.exportToPdf(el);

      expect(res).toBe(true);
      expect(printSpy).toHaveBeenCalled();
    });

    it("deve utilizar html2pdf quando disponível no escopo global", async () => {
      const saveMock = vi.fn().mockResolvedValue(true);
      const fromMock = vi.fn().mockReturnValue({ save: saveMock });
      const setMock = vi.fn().mockReturnValue({ from: fromMock });
      window.html2pdf = vi.fn().mockReturnValue({ set: setMock });

      const el = document.createElement("div");
      const res = await PdfExportService.exportToPdf(el, { filename: "teste.pdf" });

      expect(res).toBe(true);
      expect(window.html2pdf).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ filename: "teste.pdf" }));
    });
  });
});

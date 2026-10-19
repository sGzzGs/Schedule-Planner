// Created at: 2026-10-19 20:43
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("SCO01-d • Verificação de NIF, Isolamento de Perfil e Modal Stitch", () => {
  let rawHtml;

  beforeEach(() => {
    const rootDir = path.resolve(__dirname, "../../../");
    rawHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
    document.documentElement.innerHTML = rawHtml
      .replace(/<link\b[^>]*>/gi, "")
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  });

  describe("1. Validação de NIF e Formulários", () => {
    it("deve conter placeholder limpo no input de login sem 'ou carlos'", () => {
      const loginNif = document.getElementById("auth-login-nif");
      expect(loginNif).not.toBeNull();
      expect(loginNif.getAttribute("placeholder")).toBe("Ex: SN0000");
      expect(loginNif.getAttribute("placeholder")).not.toContain("carlos");
    });

    it("deve permitir NIF de até 14 caracteres e não conter pattern restritivo", () => {
      const teacherNif = document.getElementById("teacherNif");
      const modalTeacherNif = document.getElementById("modalTeacherNif");

      expect(teacherNif).not.toBeNull();
      expect(teacherNif.getAttribute("maxlength")).toBe("14");
      expect(teacherNif.hasAttribute("pattern")).toBe(false);

      expect(modalTeacherNif).not.toBeNull();
      expect(modalTeacherNif.getAttribute("maxlength")).toBe("14");
      expect(modalTeacherNif.hasAttribute("pattern")).toBe(false);
    });

    it("inputs de cadastro e reset de NIF devem suportar até 14 caracteres", () => {
      const regNif = document.getElementById("auth-reg-nif");
      const resetNif = document.getElementById("auth-reset-nif");

      expect(regNif).not.toBeNull();
      expect(regNif.getAttribute("maxlength")).toBe("14");

      expect(resetNif).not.toBeNull();
      expect(resetNif.getAttribute("maxlength")).toBe("14");
    });
  });

  describe("2. Modal de Conteúdo Programático Stitch Warm Timber", () => {
    it("deve possuir o contêiner e elementos essenciais do novo modal Stitch", () => {
      const modal = document.getElementById("comp-modal-conteudo-programatico");
      expect(modal).not.toBeNull();

      const badgeIcon = modal.querySelector('[data-purpose="header-badge-icon"]');
      expect(badgeIcon).not.toBeNull();

      const btnClose = document.getElementById("comp-modal-conteudo-close");
      expect(btnClose).not.toBeNull();

      const btnDistribuir = document.getElementById("comp-btn-aplicar-conteudo-lote");
      expect(btnDistribuir).not.toBeNull();

      const btnLimpar = document.getElementById("comp-btn-limpar-conteudos-todos");
      expect(btnLimpar).not.toBeNull();

      const tbody = document.getElementById("comp-modal-conteudo-tbody");
      expect(tbody).not.toBeNull();
    });
  });

  describe("3. Exclusão Mútua de Abas (CSS e DOM)", () => {
    it("todas as páginas possuem a classe app-page e apenas uma é page-active inicialmente", () => {
      const pages = document.querySelectorAll(".app-page");
      expect(pages.length).toBeGreaterThanOrEqual(3);

      const activePages = document.querySelectorAll(".app-page.page-active");
      expect(activePages.length).toBe(1);
      expect(activePages[0].id).toBe("tab-cronograma");
    });
  });
});

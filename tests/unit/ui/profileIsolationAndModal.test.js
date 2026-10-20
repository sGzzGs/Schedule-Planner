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

    it("no Primeiro Acesso, não deve pedir o nome completo e a senha deve ter minlength 3", () => {
      const regForm = document.getElementById("form-auth-register");
      expect(regForm).not.toBeNull();

      // Não deve ter campo para redigitar nome
      const inputNome = regForm.querySelector("#auth-reg-nome");
      expect(inputNome).toBeNull();

      // Senha mínima deve ser 3 caracteres
      const inputSenha = regForm.querySelector("#auth-reg-senha");
      expect(inputSenha).not.toBeNull();
      expect(inputSenha.getAttribute("minlength")).toBe("3");

      const previewGroup = document.getElementById("auth-reg-nome-preview-group");
      expect(previewGroup).not.toBeNull();
    });

    it("formulários de autorização de docente devem conter return false para prevenir reload", () => {
      const quickForm = document.getElementById("quickTeacherForm");
      expect(quickForm).not.toBeNull();
      expect(quickForm.getAttribute("onsubmit")).toContain("return false;");

      const modalForm = document.getElementById("modalNewTeacher")?.querySelector("form");
      expect(modalForm).not.toBeNull();
      expect(modalForm.getAttribute("onsubmit")).toContain("return false;");
    });

    it("modal de troca de senha provisória deve exigir mínimo de 3 caracteres", () => {
      const forceNova = document.getElementById("auth-force-nova-senha");
      const forceConf = document.getElementById("auth-force-conf-senha");
      expect(forceNova?.getAttribute("minlength")).toBe("3");
      expect(forceConf?.getAttribute("minlength")).toBe("3");
    });

    it("modal de docentes cadastrados e lista authorizedNifsList devem existir no DOM", () => {
      const modal = document.getElementById("modalDocentesCadastrados");
      expect(modal).not.toBeNull();

      const list = document.getElementById("authorizedNifsList");
      expect(list).not.toBeNull();
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

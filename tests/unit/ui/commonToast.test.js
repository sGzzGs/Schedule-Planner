// Created at: 2026-10-17 14:36
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Toast } from "../../../src/ui/common/Toast.js";

describe("Toast Component (UI Common)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="comp-toast-container"></div>';
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("deve criar o container caso ele não exista no DOM", () => {
    document.body.innerHTML = "";
    const container = Toast.getContainer("custom-toast-container");
    expect(container).not.toBeNull();
    expect(container.id).toBe("custom-toast-container");
    expect(document.getElementById("custom-toast-container")).toBe(container);
  });

  it("deve renderizar um toast com título, mensagem e ícone padrão", () => {
    const toast = Toast.show("Título Teste", "Mensagem informativa");
    expect(toast).not.toBeNull();

    const titleEl = toast.querySelector(".comp-toast-title");
    const bodyEl = toast.querySelector(".comp-toast-body");
    const iconEl = toast.querySelector(".comp-toast-icon");

    expect(titleEl.textContent).toBe("Título Teste");
    expect(bodyEl.textContent).toBe("Mensagem informativa");
    expect(iconEl.textContent).toBe("🖨️");
    expect(toast.classList.contains("comp-toast")).toBe(true);
  });

  it("deve aplicar classes e ícones corretos para warning, info e danger", () => {
    const tWarning = Toast.warning("Aviso", "Atenção");
    expect(tWarning.classList.contains("toast-warning")).toBe(true);
    expect(tWarning.querySelector(".comp-toast-icon").textContent).toBe("⚠️");

    const tInfo = Toast.info("Info", "Detalhes");
    expect(tInfo.classList.contains("toast-info")).toBe(true);
    expect(tInfo.querySelector(".comp-toast-icon").textContent).toBe("ℹ️");

    const tDanger = Toast.danger("Erro", "Falhou");
    expect(tDanger.classList.contains("toast-danger")).toBe(true);
    expect(tDanger.querySelector(".comp-toast-icon").textContent).toBe("❌");
  });

  it("deve sanitizar entradas HTML para mitigar vulnerabilidades XSS", () => {
    const malicious = '<script>alert("xss")</script><img src="x" onerror="alert(1)">';
    const toast = Toast.show(malicious, malicious);

    expect(toast.innerHTML).not.toContain("<script>");
    expect(toast.innerHTML).toContain("&lt;script&gt;");
  });

  it("deve executar auto-dismiss após o tempo configurado", () => {
    const toast = Toast.show("Auto Dismiss", "Desaparecendo...", "info", 1000);
    const container = document.getElementById("comp-toast-container");
    expect(container.contains(toast)).toBe(true);

    // Avançar até o tempo do dismiss
    vi.advanceTimersByTime(1000);
    expect(toast.classList.contains("toast-hide")).toBe(true);

    // Avançar tempo da animação de saída (300ms)
    vi.advanceTimersByTime(350);
    expect(container.contains(toast)).toBe(false);
  });

  it("deve permitir descarte manual via Toast.dismiss", () => {
    const toast = Toast.show("Manual", "Teste manual");
    const container = document.getElementById("comp-toast-container");

    Toast.dismiss(toast);
    expect(toast.classList.contains("toast-hide")).toBe(true);

    vi.advanceTimersByTime(350);
    expect(container.contains(toast)).toBe(false);
  });
});

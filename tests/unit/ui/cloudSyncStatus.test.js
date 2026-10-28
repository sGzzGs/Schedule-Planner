// Created at: 2026-10-28 20:01
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";

describe("Cloud Sync Status & Integrity Check (SCO58-d)", () => {
  let appScope;

  beforeEach(() => {
    vi.useFakeTimers();

    document.body.innerHTML = `
      <div id="topbar">
        <button id="btn-salvar-geral">
          <span id="btn-salvar-geral-label">Salvar</span>
        </button>

        <button id="btn-cloud-sync-status" class="stitch-btn-sync-status is-synced" title="Nuvem Sincronizada">
          <span class="sync-status-icon-wrap">
            <svg class="svg-synced"></svg>
            <svg class="svg-syncing" style="display:none;"></svg>
            <svg class="svg-pending" style="display:none;"></svg>
          </span>
          <span id="btn-cloud-sync-label">Nuvem</span>
        </button>
      </div>

      <input id="codigoTurma" value="TURMA-TESTE-SCO58" />
      <div id="comp-toast-container"></div>
    `;

    // Carrega script js/app.js de forma isolada
    const appCode = fs.readFileSync(path.resolve(__dirname, "../../../js/app.js"), "utf8");
    const func = new Function("window", "document", "localStorage", "console", `${appCode}; return {
      atualizarIndicadorSincroniaNuvem,
      verificarSincroniaNuvemComToast,
      executarSalvarGeralTurma
    };`);

    window.CompState = {
      turmaInfo: { turma: "TURMA-TESTE-SCO58" },
      alunos: ["Aluno 1", "Aluno 2"],
      faltasPorAluno: { "Aluno 1": { "2026-10-28": 2 } }
    };

    window.compMostrarToast = vi.fn();
    window.showToast = vi.fn();

    appScope = func(window, document, window.localStorage, console);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = "";
    delete window.authService;
    delete window.attendanceSyncQueue;
    delete window.CompState;
    delete window.compMostrarToast;
    delete window.showToast;
  });

  it("1. deve alternar classes CSS e labels no botão para os estados: synced, syncing, error e offline", () => {
    const btn = document.getElementById("btn-cloud-sync-status");
    const label = document.getElementById("btn-cloud-sync-label");

    // syncing
    appScope.atualizarIndicadorSincroniaNuvem("syncing");
    expect(btn.classList.contains("is-syncing")).toBe(true);
    expect(btn.classList.contains("is-synced")).toBe(false);
    expect(label.textContent).toBe("Salvando...");

    // error / pending
    appScope.atualizarIndicadorSincroniaNuvem("error");
    expect(btn.classList.contains("is-pending")).toBe(true);
    expect(label.textContent).toBe("Pendente");

    // offline
    appScope.atualizarIndicadorSincroniaNuvem("offline");
    expect(btn.classList.contains("is-offline")).toBe(true);
    expect(label.textContent).toBe("Local");

    // synced
    appScope.atualizarIndicadorSincroniaNuvem("synced");
    expect(btn.classList.contains("is-synced")).toBe(true);
    expect(label.textContent).toBe("Nuvem");
  });

  it("2. deve avisar sobre modo visitante caso usuário não esteja autenticado ao clicar no botão", async () => {
    window.authService = { currentUser: null, client: null };

    await appScope.verificarSincroniaNuvemComToast();

    const btn = document.getElementById("btn-cloud-sync-status");
    const label = document.getElementById("btn-cloud-sync-label");

    expect(btn.classList.contains("is-offline")).toBe(true);
    expect(label.textContent).toBe("Local");
    expect(window.compMostrarToast).toHaveBeenCalledWith(
      "Armazenamento Local",
      expect.stringContaining("Você está em modo local (visitante)"),
      "info"
    );
  });

  it("3. deve descarregar a fila de frequência, consultar o Supabase e emitir toast 'Dados 100% íntegros'", async () => {
    const mockFlush = vi.fn().mockResolvedValue({ success: true, count: 1 });
    window.attendanceSyncQueue = { flush: mockFlush };

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: "turma-123", atualizado_em: new Date().toISOString() },
      error: null
    });

    const mockClient = {
      from: vi.fn((table) => {
        if (table === "turmas_docente") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: mockMaybeSingle
          };
        }
        if (table === "frequencias_discente") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve) => resolve({ count: 1, error: null })
          };
        }
        return {};
      })
    };

    window.authService = {
      currentUser: { id: "docente-uuid-1", nif: "1234567", nome: "Docente Teste" },
      client: mockClient
    };

    await appScope.verificarSincroniaNuvemComToast();

    // Verificações
    expect(mockFlush).toHaveBeenCalledTimes(1);
    expect(mockClient.from).toHaveBeenCalledWith("turmas_docente");
    expect(mockClient.from).toHaveBeenCalledWith("frequencias_discente");

    const btn = document.getElementById("btn-cloud-sync-status");
    expect(btn.classList.contains("is-synced")).toBe(true);

    expect(window.compMostrarToast).toHaveBeenCalledWith(
      "Nuvem Sincronizada",
      expect.stringMatching(/✓ Dados 100% íntegros\. Conferido com a nuvem às \d{2}:\d{2}\./),
      "success"
    );
  });

  it("4. deve marcar status como 'Pendente' e exibir toast de aviso caso o Supabase falhe", async () => {
    window.attendanceSyncQueue = { flush: vi.fn().mockResolvedValue({ success: true }) };

    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Network timeout")
        })
      }))
    };

    window.authService = {
      currentUser: { id: "docente-uuid-1" },
      client: mockClient
    };

    await appScope.verificarSincroniaNuvemComToast();

    const btn = document.getElementById("btn-cloud-sync-status");
    const label = document.getElementById("btn-cloud-sync-label");

    expect(btn.classList.contains("is-pending")).toBe(true);
    expect(label.textContent).toBe("Pendente");
    expect(window.compMostrarToast).toHaveBeenCalledWith(
      "Sincronização Pendente",
      expect.stringContaining("Falha temporária ao consultar a nuvem"),
      "warning"
    );
  });

  it("5. deve integrar AttendanceSyncQueue com atualização automática do indicador", async () => {
    const queueCode = fs.readFileSync(path.resolve(__dirname, "../../../src/services/storage/AttendanceSyncQueue.js"), "utf8");
    const queueFunc = new Function("window", "console", `${queueCode}; return AttendanceSyncQueue;`);
    const AttendanceSyncQueueClass = queueFunc(window, console);

    const queue = new AttendanceSyncQueueClass();
    window.atualizarIndicadorSincroniaNuvem = appScope.atualizarIndicadorSincroniaNuvem;

    queue.setStatus("syncing");
    const btn = document.getElementById("btn-cloud-sync-status");
    expect(btn.classList.contains("is-syncing")).toBe(true);

    queue.setStatus("synced");
    expect(btn.classList.contains("is-synced")).toBe(true);
  });
});

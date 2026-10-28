// Created at: 2026-10-28 19:42
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function initTestEnvironment() {
  const rootDir = path.resolve(__dirname, "../../../");
  const rawHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
  const cleanHtml = rawHtml
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  document.documentElement.innerHTML = cleanHtml;

  // Mock Supabase
  const mockUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockDelete = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    })
  });
  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    })
  });

  const mockFrom = vi.fn((table) => {
    return {
      upsert: mockUpsert,
      delete: mockDelete,
      select: mockSelect,
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    };
  });

  window.authService = {
    currentUser: { id: "test-docente-uuid-123", nome: "Docente Teste", role: "docente" },
    client: { from: mockFrom },
    isCoordenacao: () => false
  };

  // Carregar AttendanceSyncQueue.js
  const queueCode = fs.readFileSync(path.join(rootDir, "src/services/storage/AttendanceSyncQueue.js"), "utf-8");
  new Function("window", "document", "localStorage", queueCode)(window, document, localStorage);

  // Carregar holidayService
  const holidayCode = fs.readFileSync(path.join(rootDir, "js/holidayService.js"), "utf-8");
  new Function("window", "document", "localStorage", holidayCode)(window, document, localStorage);

  // Carregar app.js
  const appCode = fs.readFileSync(path.join(rootDir, "js/app.js"), "utf-8");
  new Function("window", "document", "localStorage", appCode)(window, document, localStorage);

  // Carregar compensacao.js
  const compCode = fs.readFileSync(path.join(rootDir, "js/compensacao.js"), "utf-8");
  new Function("window", "document", "localStorage", compCode)(window, document, localStorage);

  return {
    CompState: window.CompState,
    AttendanceSyncQueue: window.AttendanceSyncQueue,
    attendanceSyncQueue: window.attendanceSyncQueue,
    compObterTodasDatasDiario: window.compObterTodasDatasDiario,
    compIsDiaFantasma: window.compIsDiaFantasma,
    compExcluirDiaFrequenciaPermanente: window.compExcluirDiaFrequenciaPermanente,
    compRenderizarDiario: window.compRenderizarDiario,
    compRenderizarModoTabela: window.compRenderizarModoTabela,
    compCalcularValoresVariaveis: window.compCalcularValoresVariaveis,
    compToggleFlipFalta: window.compToggleFlipFalta,
    revalidateActiveTurmaFromCloud: window.revalidateActiveTurmaFromCloud,
    mockFrom,
    mockUpsert,
    mockDelete
  };
}

describe("Ghost Days & Cloud Attendance Synchronization (SCO57-d)", () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    env = initTestEnvironment();

    // Inicializa turma de teste
    env.CompState.turmaInfo = {
      turma: "TURMA-TEST-SCO57",
      curso: "Desenvolvimento de Sistemas",
      docente: "Professor Teste",
      chTotal: 40,
      horasPorAula: "01:00",
      aulasPorDia: 4
    };
    env.CompState.alunos = ["Carlos Eduardo", "Mariana Silva"];
    env.CompState.diasLetivos = ["2026-03-02", "2026-03-09"];
    env.CompState.faltasPorAluno = {
      "Carlos Eduardo": {
        "2026-03-02": 4
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("1. Identificação e Retenção de Dias Fantasmas (Zero Auto-Delete)", () => {
    it("deve reter apontamento de aula anterior quando a data é removida dos dias letivos", () => {
      // Carlos tem falta registrada em 2026-03-02 e em 2026-03-16
      env.CompState.faltasPorAluno["Carlos Eduardo"]["2026-03-16"] = 4;

      // 2026-03-16 não está em diasLetivos (ex: cronograma mudou ou foi encurtado)
      expect(env.CompState.diasLetivos.includes("2026-03-16")).toBe(false);

      // Deve identificar como Dia Fantasma
      expect(env.compIsDiaFantasma("2026-03-16")).toBe(true);
      expect(env.compIsDiaFantasma("2026-03-02")).toBe(false);

      // compObterTodasDatasDiario deve unificar dias ativos e fantasmas em ordem cronológica
      const todasDatas = env.compObterTodasDatasDiario();
      expect(todasDatas).toEqual(["2026-03-02", "2026-03-09", "2026-03-16"]);

      // A falta jamais é apagada automaticamente
      expect(env.CompState.faltasPorAluno["Carlos Eduardo"]["2026-03-16"]).toBe(4);
    });

    it("deve excluir o dia fantasma de todos os cálculos matemáticos e regras de 25%", () => {
      // Carlos tem 4h em 02/03 (dia ativo) e 8h em 16/03 (dia fantasma)
      env.CompState.faltasPorAluno["Carlos Eduardo"]["2026-03-02"] = 4;
      env.CompState.faltasPorAluno["Carlos Eduardo"]["2026-03-16"] = 8; // Fantasma

      const vars = env.compCalcularValoresVariaveis("Carlos Eduardo");

      // Carga horária total do curso é 40h
      // Apenas a falta de 02/03 (4h) deve contar (4h/40h = 10% faltas, 90% freq)
      // Se 16/03 contasse, seriam 12h (30% faltas, freq 70%)
      expect(vars["total_horas_faltas"]).toBe("4h");
      expect(vars["porcentagem_frequencia"]).toBe("90%");
    });

    it("deve renderizar a coluna fantasma acinzentada com classe .is-ghost-col e botão ✕", () => {
      env.CompState.faltasPorAluno["Carlos Eduardo"]["2026-03-16"] = 4;
      const todasDatas = env.compObterTodasDatasDiario();

      const html = env.compRenderizarModoTabela(env.CompState.alunos, todasDatas, 40);

      // Cabeçalho deve conter .is-ghost-col, [Inativo] e o botão .btn-delete-ghost-day
      expect(html).toContain("is-ghost-col");
      expect(html).toContain("[Inativo]");
      expect(html).toContain("btn-delete-ghost-day");
      expect(html).toContain("window.compConfirmarExclusaoDiaFantasma('2026-03-16')");

      // As células do dia fantasma devem conter .is-ghost-cell e .is-ghost-presence disabled
      expect(html).toContain("is-ghost-cell");
      expect(html).toContain("is-ghost-presence");
      expect(html).toContain("disabled");
    });

    it("deve reativar o dia fantasma sem perda se o cronograma voltar a incluir a data", () => {
      env.CompState.faltasPorAluno["Carlos Eduardo"]["2026-03-16"] = 4;
      expect(env.compIsDiaFantasma("2026-03-16")).toBe(true);

      // Cronograma readiciona 2026-03-16 aos dias letivos
      env.CompState.diasLetivos.push("2026-03-16");
      env.CompState.diasLetivos.sort();

      // Deixa de ser fantasma imediatamente
      expect(env.compIsDiaFantasma("2026-03-16")).toBe(false);

      // Agora entra nos cálculos matemáticos normalmente (4h + 4h = 8h faltas, 80% freq)
      const vars = env.compCalcularValoresVariaveis("Carlos Eduardo");
      expect(vars["total_horas_faltas"]).toBe("8h");
      expect(vars["porcentagem_frequencia"]).toBe("80%");
    });

    it("deve permitir exclusão manual permanente apenas via compExcluirDiaFrequenciaPermanente", () => {
      env.CompState.faltasPorAluno["Carlos Eduardo"]["2026-03-16"] = 4;
      env.CompState.faltasPorAluno["Mariana Silva"] = { "2026-03-16": 0 };

      // Professor clica no ✕ e confirma
      env.compExcluirDiaFrequenciaPermanente("2026-03-16");

      expect(env.CompState.faltasPorAluno["Carlos Eduardo"]["2026-03-16"]).toBeUndefined();
      expect(env.CompState.faltasPorAluno["Mariana Silva"]["2026-03-16"]).toBeUndefined();
      expect(env.compObterTodasDatasDiario()).toEqual(["2026-03-02", "2026-03-09"]);
    });
  });

  describe("2. Fila Otimista com Debounce de 4s (AttendanceSyncQueue)", () => {
    it("deve agrupar alterações rápidas e disparar flush após 4 segundos de debounce", async () => {
      const queue = new env.AttendanceSyncQueue({ debounceMs: 4000 });

      queue.enqueue({ aluno: "Carlos Eduardo", dataIso: "2026-03-02", horasFalta: 4 });
      queue.enqueue({ aluno: "Mariana Silva", dataIso: "2026-03-02", horasFalta: 0 });

      expect(queue.pending.size).toBe(2);
      expect(queue.status).toBe("syncing");

      // Avança 3.9 segundos: timer ainda não disparou
      vi.advanceTimersByTime(3900);
      expect(env.mockFrom).not.toHaveBeenCalled();

      // Avança mais 200ms: completa 4.1s
      vi.advanceTimersByTime(200);
      await Promise.resolve(); // resolve promises do flush

      expect(env.mockFrom).toHaveBeenCalledWith("frequencias_discente");
      expect(queue.pending.size).toBe(0);
      expect(queue.status).toBe("synced");
    });

    it("deve forçar flush imediato ao chamar flush() explicitamente", async () => {
      const queue = new env.AttendanceSyncQueue({ debounceMs: 4000 });
      queue.enqueue({ aluno: "Carlos Eduardo", dataIso: "2026-03-09", horasFalta: 2 });

      expect(queue.pending.size).toBe(1);

      const res = await queue.flush();
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
      expect(queue.pending.size).toBe(0);
      expect(env.mockFrom).toHaveBeenCalledWith("frequencias_discente");
    });

    it("deve deletar da nuvem e limpar pendências locais ao chamar deleteDate()", async () => {
      const queue = new env.AttendanceSyncQueue();
      queue.enqueue({ aluno: "Carlos Eduardo", dataIso: "2026-03-16", horasFalta: 4 });

      expect(queue.pending.size).toBe(1);

      const delRes = await queue.deleteDate("2026-03-16", "TURMA-TEST-SCO57");
      expect(delRes.success).toBe(true);
      expect(queue.pending.size).toBe(0); // Pendência local removida
      expect(env.mockFrom).toHaveBeenCalledWith("frequencias_discente");
    });
  });

  describe("3. Sincronização entre Navegadores (Focus Revalidation)", () => {
    it("deve consultar frequências da nuvem e atualizar o CompState na revalidação por foco", async () => {
      // Mock de frequências retornadas do Supabase para outro navegador
      const mockFreqs = [
        { aluno_nome: "Mariana Silva", data_aula: "2026-03-02", horas_falta: 4, observacao: "Atestado médico" }
      ];

      env.window = window;
      window.authService.client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockFreqs, error: null })
          })
        })
      });

      expect(env.CompState.faltasPorAluno["Mariana Silva"]).toBeUndefined();

      // Dispara revalidação simulando janela recebendo foco
      await env.revalidateActiveTurmaFromCloud(true);

      // Mariana agora tem a falta e observação vindas da nuvem
      expect(env.CompState.faltasPorAluno["Mariana Silva"]["2026-03-02"]).toBe(4);
      expect(env.CompState.observacoesPorDia["Mariana Silva"]["2026-03-02"]).toBe("Atestado médico");
    });
  });
});

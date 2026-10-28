// Created at: 2026-10-28 20:53

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CalendarSyncService } from "../../../src/services/holidays/CalendarSyncService.js";
import { HolidayService } from "../../../src/services/holidays/HolidayService.js";

describe("CalendarSyncService & Sincronização em Nuvem (SCO59-d)", () => {
  let mockHolidayService;
  let mockAuthService;
  let mockSupabaseClient;
  let service;

  beforeEach(() => {
    // Mock HolidayService
    mockHolidayService = {
      customizations: { itensAdicionais: [], itensRemovidos: [] },
      aplicarModificacoesUsuario: vi.fn((mods) => {
        mockHolidayService.customizations = {
          itensAdicionais: [...(mods.adicionais || [])],
          itensRemovidos: [...(mods.removidos || [])]
        };
      }),
      salvarOuAtualizarFeriado: vi.fn(({ data, descricao, categoria_id, bloqueia_aula }) => {
        mockHolidayService.customizations.itensAdicionais.push({
          data,
          descricao,
          categoria_id,
          bloqueia_aula
        });
      }),
      excluirFeriado: vi.fn((key) => {
        mockHolidayService.customizations.itensAdicionais = mockHolidayService.customizations.itensAdicionais.filter(
          (i) => i.data !== key
        );
      }),
      desbloquearDiaOficial: vi.fn((key) => {
        mockHolidayService.customizations.itensRemovidos.push(key);
      }),
      restaurarDiaOficial: vi.fn((key) => {
        mockHolidayService.customizations.itensRemovidos = mockHolidayService.customizations.itensRemovidos.filter(
          (k) => k !== key
        );
      }),
      restaurarPadrao: vi.fn(() => {
        mockHolidayService.customizations = { itensAdicionais: [], itensRemovidos: [] };
      })
    };

    // Mock Supabase Query Builder
    mockSupabaseClient = {
      from: vi.fn((table) => {
        const query = {
          select: vi.fn(() => query),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
          delete: vi.fn(() => query),
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          neq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        };
        return query;
      }),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis()
      })),
      removeChannel: vi.fn()
    };

    // Mock AuthService (default as coordenacao)
    mockAuthService = {
      client: mockSupabaseClient,
      currentUser: {
        id: "ee2764b6-5f64-4947-b40a-aee3604b144c",
        nif: "carlos",
        nome: "Carlos Henrique (Coordenação)",
        role: "coordenacao"
      }
    };

    service = new CalendarSyncService({
      holidayService: mockHolidayService,
      authService: mockAuthService,
      client: mockSupabaseClient
    });
  });

  describe("1. Carregamento Institucional (Leitura para todos os perfis)", () => {
    it("deve carregar eventos do Supabase e injetar em holidayService.aplicarModificacoesUsuario", async () => {
      const mockRows = [
        {
          data: "2026-03-20",
          descricao: "Formatura Institucional",
          categoria_id: "formatura",
          bloqueia_aula: true,
          removido: false
        },
        {
          data: "2026-10-28",
          descricao: "Dia letivo liberado",
          categoria_id: "a_decidir",
          bloqueia_aula: false,
          removido: true
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRows, error: null })
      });

      const res = await service.carregarCalendarioInstitucional();

      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
      expect(mockHolidayService.aplicarModificacoesUsuario).toHaveBeenCalledTimes(1);
      expect(mockHolidayService.customizations.itensAdicionais).toEqual([
        {
          data: "2026-03-20",
          descricao: "Formatura Institucional",
          categoria_id: "formatura",
          bloqueia_aula: true
        }
      ]);
      expect(mockHolidayService.customizations.itensRemovidos).toEqual(["2026-10-28"]);
      expect(service.status).toBe("synced");
    });

    it("deve tratar erro do Supabase mantendo status de erro sem quebrar", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: "Network error" } })
      });

      const res = await service.carregarCalendarioInstitucional();

      expect(res.success).toBe(false);
      expect(service.status).toBe("error");
    });

    it("deve marcar status como offline quando não houver cliente Supabase", async () => {
      const offlineService = new CalendarSyncService({
        holidayService: mockHolidayService,
        client: null
      });

      const res = await offlineService.carregarCalendarioInstitucional();

      expect(res.success).toBe(false);
      expect(res.reason).toBe("offline");
      expect(offlineService.status).toBe("offline");
    });
  });

  describe("2. Controle de Acesso e Permissões (Coordenação vs Docente)", () => {
    it("deve bloquear inclusão de evento se o usuário for docente", async () => {
      mockAuthService.currentUser.role = "docente";

      const res = await service.salvarEvento({
        data: "2026-05-15",
        descricao: "Tentativa Docente",
        categoria_id: "feriado"
      });

      expect(res.success).toBe(false);
      expect(res.reason).toBe("not_coordinator");
      expect(mockHolidayService.salvarOuAtualizarFeriado).not.toHaveBeenCalled();
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it("deve bloquear exclusão de evento se o usuário for docente", async () => {
      mockAuthService.currentUser.role = "docente";

      const res = await service.removerEvento("2026-05-15", false);

      expect(res.success).toBe(false);
      expect(res.reason).toBe("not_coordinator");
      expect(mockHolidayService.excluirFeriado).not.toHaveBeenCalled();
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it("deve permitir que a Coordenação faça upsert de novo feriado/emenda no Supabase", async () => {
      mockAuthService.currentUser.role = "coordenacao";

      const mockUpsert = vi.fn().mockResolvedValue({ data: [{ id: "1" }], error: null });
      mockSupabaseClient.from.mockReturnValue({
        upsert: mockUpsert
      });

      const res = await service.salvarEvento({
        data: "2026-04-20",
        descricao: "Emenda Tiradentes",
        categoria_id: "emenda",
        bloqueia_aula: true
      });

      expect(res.success).toBe(true);
      expect(mockHolidayService.salvarOuAtualizarFeriado).toHaveBeenCalledWith({
        data: "2026-04-20",
        descricao: "Emenda Tiradentes",
        categoria_id: "emenda",
        bloqueia_aula: true
      });
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          data: "2026-04-20",
          descricao: "Emenda Tiradentes",
          categoria_id: "emenda",
          bloqueia_aula: true,
          removido: false,
          criado_por: "ee2764b6-5f64-4947-b40a-aee3604b144c"
        }),
        { onConflict: "data" }
      );
    });

    it("deve registrar desbloqueio de feriado oficial com flag removido: true no Supabase", async () => {
      mockAuthService.currentUser.role = "coordenacao";

      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabaseClient.from.mockReturnValue({
        upsert: mockUpsert
      });

      const res = await service.removerEvento("2026-11-20", true);

      expect(res.success).toBe(true);
      expect(mockHolidayService.desbloquearDiaOficial).toHaveBeenCalledWith("2026-11-20");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          data: "2026-11-20",
          removido: true,
          bloqueia_aula: false
        }),
        { onConflict: "data" }
      );
    });

    it("deve deletar do Supabase quando o evento a ser removido for customizado adicional", async () => {
      mockAuthService.currentUser.role = "coordenacao";

      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockDelete = vi.fn(() => ({ eq: mockEq }));
      mockSupabaseClient.from.mockReturnValue({
        delete: mockDelete
      });

      const res = await service.removerEvento("2026-07-10", false);

      expect(res.success).toBe(true);
      expect(mockHolidayService.excluirFeriado).toHaveBeenCalledWith("2026-07-10");
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("data", "2026-07-10");
    });
  });

  describe("3. Realtime e Inicialização", () => {
    it("deve assinar canal realtime ao chamar setupRealtime", () => {
      service.setupRealtime();

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith("public:calendario_institucional");
      expect(service.realtimeChannel).toBeDefined();
    });

    it("deve chamar carregarCalendarioInstitucional no init", async () => {
      const spyLoad = vi.spyOn(service, "carregarCalendarioInstitucional").mockResolvedValue({ success: true });
      service.init();

      expect(spyLoad).toHaveBeenCalledTimes(1);
    });
  });
});

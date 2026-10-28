// Created at: 2026-10-28 20:46

/**
 * CalendarSyncService (SCO59-d)
 * Sincronização em nuvem do Calendário Institucional SENAI via Supabase.
 * - Leitura irrestrita para todos os usuários (docentes, coordenação e anônimos).
 * - Gravação, edição e exclusão exclusivas para Coordenação (role = 'coordenacao').
 * - Integração automática com HolidayService, cache local no localStorage e Realtime.
 */
class CalendarSyncService {
  constructor(options = {}) {
    this.holidayService = options.holidayService || (typeof window !== 'undefined' ? window.holidayService : null);
    this.authService = options.authService || (typeof window !== 'undefined' ? window.authService : null);
    this.client = options.client || null;
    this.status = 'idle'; // 'idle' | 'syncing' | 'synced' | 'error' | 'offline'
    this.lastSync = null;
    this.listeners = new Set();
    this.realtimeChannel = null;
    this._initialized = false;
  }

  setStatus(newStatus, detail = null) {
    this.status = newStatus;
    this.listeners.forEach(fn => {
      try { fn(newStatus, detail); } catch (e) { console.error(e); }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('senai:calendar-sync-status', {
        detail: { status: newStatus, detail }
      }));
    }
  }

  onStatusChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getClient() {
    if (this.client) return this.client;
    if (this.authService && this.authService.client) return this.authService.client;
    if (typeof window !== 'undefined' && window.authService && window.authService.client) {
      return window.authService.client;
    }
    return null;
  }

  getHolidayService() {
    if (this.holidayService) return this.holidayService;
    if (typeof window !== 'undefined' && window.holidayService) {
      return window.holidayService;
    }
    return null;
  }

  isCoordenador() {
    const user = this.authService?.currentUser || (typeof window !== 'undefined' ? window.authService?.currentUser : null);
    return user?.role === 'coordenacao';
  }

  /**
   * Carrega os eventos e customizações institucionais do Supabase e injeta no HolidayService
   */
  async carregarCalendarioInstitucional() {
    const client = this.getClient();
    const hs = this.getHolidayService();

    if (!client) {
      this.setStatus('offline');
      return { success: false, reason: 'offline' };
    }

    this.setStatus('syncing');

    try {
      const { data, error } = await client
        .from('calendario_institucional')
        .select('data, descricao, categoria_id, bloqueia_aula, removido')
        .order('data', { ascending: true });

      if (error) {
        console.warn('[CalendarSync] Erro ao carregar calendário do Supabase:', error);
        this.setStatus('error', { error: error.message });
        return { success: false, error };
      }

      const adicionais = [];
      const removidos = [];

      if (Array.isArray(data)) {
        for (const item of data) {
          const dataKey = String(item.data).slice(0, 10);
          if (item.removido === true) {
            if (!removidos.includes(dataKey)) {
              removidos.push(dataKey);
            }
          } else {
            adicionais.push({
              data: dataKey,
              descricao: item.descricao || 'Feriado / Recesso',
              categoria_id: item.categoria_id || 'feriado',
              bloqueia_aula: item.bloqueia_aula !== false
            });
          }
        }
      }

      if (hs && typeof hs.aplicarModificacoesUsuario === 'function') {
        hs.aplicarModificacoesUsuario({ adicionais, removidos });
      }

      this.lastSync = Date.now();
      this.setStatus('synced', { count: (data || []).length });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('senai:calendar-synced', {
          detail: { count: (data || []).length, adicionais, removidos }
        }));

        if (typeof window.calRenderizar === 'function') {
          window.calRenderizar();
        }
        if (typeof window.updatePreview === 'function') {
          window.updatePreview(true);
        }
        if (typeof window.calAtualizarBadgeModificacoes === 'function') {
          window.calAtualizarBadgeModificacoes();
        }
      }

      return { success: true, count: (data || []).length, adicionais, removidos };
    } catch (err) {
      console.warn('[CalendarSync] Exceção ao sincronizar calendário:', err);
      this.setStatus('error', { error: err.message });
      return { success: false, error: err };
    }
  }

  /**
   * Salva ou atualiza um feriado/evento institucional no Supabase (restrito à Coordenação)
   */
  async salvarEvento({ data, descricao, categoria_id, bloqueia_aula = true }) {
    if (!this.isCoordenador()) {
      const msg = 'Ação não permitida: Somente a Coordenação pode alterar o calendário institucional.';
      console.warn('[CalendarSync]', msg);
      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast(msg, 'warning');
      }
      return { success: false, reason: 'not_coordinator' };
    }

    if (!data) return { success: false, reason: 'invalid_data' };

    const client = this.getClient();
    const hs = this.getHolidayService();
    const dataKey = String(data).slice(0, 10);

    // 1. Atualizar imediatamente no cache local
    if (hs && typeof hs.salvarOuAtualizarFeriado === 'function') {
      hs.salvarOuAtualizarFeriado({
        data: dataKey,
        descricao,
        categoria_id,
        bloqueia_aula
      });
    }

    if (!client) {
      return { success: true, offline: true };
    }

    try {
      const user = this.authService?.currentUser || (typeof window !== 'undefined' ? window.authService?.currentUser : null);
      const payload = {
        data: dataKey,
        descricao: (descricao || '').trim() || 'Feriado / Recesso',
        categoria_id: categoria_id || 'feriado',
        bloqueia_aula: bloqueia_aula !== false,
        removido: false,
        criado_por: user?.id || null
      };

      const { data: resData, error } = await client
        .from('calendario_institucional')
        .upsert(payload, { onConflict: 'data' });

      if (error) {
        console.warn('[CalendarSync] Falha ao gravar no Supabase:', error);
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
          window.showToast('Salvo localmente. Erro ao sincronizar no Supabase: ' + error.message, 'warning');
        }
        return { success: false, error };
      }

      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast('Evento institucional sincronizado na Nuvem com sucesso!', 'success');
      }

      return { success: true, data: resData };
    } catch (e) {
      console.warn('[CalendarSync] Exceção na gravação:', e);
      return { success: false, error: e };
    }
  }

  /**
   * Remove ou desativa um evento no calendário (restrito à Coordenação)
   * Se for dia oficial, marca removido = true. Se for customizado, deleta da tabela.
   */
  async removerEvento(dataKey, isOficial = false) {
    if (!this.isCoordenador()) {
      const msg = 'Ação não permitida: Somente a Coordenação pode alterar o calendário institucional.';
      console.warn('[CalendarSync]', msg);
      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast(msg, 'warning');
      }
      return { success: false, reason: 'not_coordinator' };
    }

    if (!dataKey) return { success: false, reason: 'invalid_data' };

    const client = this.getClient();
    const hs = this.getHolidayService();
    const key = String(dataKey).slice(0, 10);

    // Atualização local
    if (hs) {
      if (isOficial) {
        if (typeof hs.desbloquearDiaOficial === 'function') hs.desbloquearDiaOficial(key);
      } else {
        if (typeof hs.excluirFeriado === 'function') hs.excluirFeriado(key);
      }
    }

    if (!client) {
      return { success: true, offline: true };
    }

    try {
      const user = this.authService?.currentUser || (typeof window !== 'undefined' ? window.authService?.currentUser : null);

      if (isOficial) {
        const payload = {
          data: key,
          descricao: 'Dia letivo liberado pela Coordenação',
          categoria_id: 'a_decidir',
          bloqueia_aula: false,
          removido: true,
          criado_por: user?.id || null
        };
        const { error } = await client
          .from('calendario_institucional')
          .upsert(payload, { onConflict: 'data' });

        if (error) {
          console.warn('[CalendarSync] Erro ao desativar dia oficial no Supabase:', error);
          return { success: false, error };
        }
      } else {
        const { error } = await client
          .from('calendario_institucional')
          .delete()
          .eq('data', key);

        if (error) {
          console.warn('[CalendarSync] Erro ao excluir evento do Supabase:', error);
          return { success: false, error };
        }
      }

      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast('Alteração institucional sincronizada na Nuvem!', 'success');
      }

      return { success: true };
    } catch (e) {
      console.warn('[CalendarSync] Exceção ao remover evento:', e);
      return { success: false, error: e };
    }
  }

  /**
   * Restaura um dia oficial do SENAI que havia sido desativado (removido: true)
   */
  async restaurarDiaOficial(dataKey) {
    if (!this.isCoordenador()) return { success: false, reason: 'not_coordinator' };
    const key = String(dataKey).slice(0, 10);
    const client = this.getClient();
    const hs = this.getHolidayService();

    if (hs && typeof hs.restaurarDiaOficial === 'function') {
      hs.restaurarDiaOficial(key);
    }

    if (!client) return { success: true, offline: true };

    try {
      const { error } = await client
        .from('calendario_institucional')
        .delete()
        .eq('data', key);

      if (error) {
        console.warn('[CalendarSync] Erro ao restaurar dia oficial no Supabase:', error);
        return { success: false, error };
      }

      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast('Dia oficial restaurado na Nuvem!', 'success');
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  }

  /**
   * Restaura todo o calendário padrão institucional (limpa todas as customizações)
   */
  async restaurarBaseOficial() {
    if (!this.isCoordenador()) return { success: false, reason: 'not_coordinator' };
    const client = this.getClient();
    const hs = this.getHolidayService();

    if (hs && typeof hs.restaurarPadrao === 'function') {
      hs.restaurarPadrao();
    }

    if (!client) return { success: true, offline: true };

    try {
      const { error } = await client
        .from('calendario_institucional')
        .delete()
        .neq('data', '1900-01-01');

      if (error) {
        console.warn('[CalendarSync] Erro ao restaurar base oficial no Supabase:', error);
        return { success: false, error };
      }

      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast('Base oficial do calendário restaurada na Nuvem!', 'success');
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  }

  /**
   * Assina atualizações em tempo real (Supabase Realtime)
   */
  setupRealtime() {
    const client = this.getClient();
    if (!client || typeof client.channel !== 'function') return;

    try {
      if (this.realtimeChannel) {
        client.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = client
        .channel('public:calendario_institucional')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'calendario_institucional' }, () => {
          console.log('[CalendarSync] Alteração no calendário detectada via Realtime. Atualizando...');
          this.carregarCalendarioInstitucional();
        })
        .subscribe();
    } catch (e) {
      console.warn('[CalendarSync] Falha ao conectar Realtime:', e);
    }
  }

  /**
   * Inicialização automática
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    // 1. Carrega assim que o cliente estiver pronto
    this.carregarCalendarioInstitucional().then(() => {
      this.setupRealtime();
    });

    // 2. Recarrega se o estado de autenticação mudar
    if (typeof window !== 'undefined') {
      window.addEventListener('senai:auth-changed', () => {
        this.carregarCalendarioInstitucional().then(() => {
          this.setupRealtime();
        });
      });
    }
  }
}

if (typeof window !== 'undefined') {
  window.CalendarSyncService = CalendarSyncService;
  window.calendarSyncService = new CalendarSyncService();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.calendarSyncService.init();
    });
  } else {
    window.calendarSyncService.init();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CalendarSyncService };
}

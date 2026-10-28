// Created at: 2026-10-28 19:26

/**
 * AttendanceSyncQueue (SCO57-d)
 * Gerenciador de fila em lote com debounce de 4 segundos para persistência de frequências no Supabase.
 * Fornece resposta otimista instantânea na UI e agrupa múltiplos cliques em uma única requisição UPSERT.
 */
class AttendanceSyncQueue {
  constructor(options = {}) {
    this.debounceMs = options.debounceMs || 4000;
    this.pending = new Map(); // chave: `${aluno}_${dataIso}`
    this.timer = null;
    this.status = 'idle'; // 'idle' | 'syncing' | 'synced' | 'error' | 'offline'
    this.listeners = new Set();
    this.authService = options.authService || (typeof window !== 'undefined' ? window.authService : null);
    this._initializedTriggers = false;
  }

  setStatus(newStatus, detail = null) {
    this.status = newStatus;
    this.listeners.forEach(fn => {
      try { fn(newStatus, detail); } catch (e) { console.error(e); }
    });
    if (typeof window !== 'undefined' && typeof window.atualizarIndicadorSincroniaNuvem === 'function') {
      window.atualizarIndicadorSincroniaNuvem(newStatus, detail);
    }
  }

  onStatusChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Adiciona ou atualiza uma alteração de frequência na fila.
   * Dispara ou renova o temporizador de debounce de 4 segundos.
   */
  enqueue(item) {
    if (!item || !item.aluno || !item.dataIso) return;
    const key = `${item.aluno}:::${item.dataIso}`;
    this.pending.set(key, {
      aluno: item.aluno,
      dataIso: item.dataIso,
      horasFalta: Number(item.horasFalta) || 0,
      observacao: item.observacao || '',
      queuedAt: Date.now()
    });

    this.setStatus('syncing', { pendingCount: this.pending.size });

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);

    this.initSecurityTriggers();
  }

  /**
   * Envia imediatamente todos os itens pendentes na fila para o Supabase.
   */
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.pending.size === 0) {
      if (this.status === 'syncing') this.setStatus('synced');
      return { success: true, count: 0 };
    }

    const auth = this.authService || (typeof window !== 'undefined' ? window.authService : null);
    const client = auth?.client;
    const user = auth?.currentUser;

    // Se estiver deslogado ou sem conexão com Supabase, não sobe para a nuvem
    if (!client || !user || !user.id) {
      this.pending.clear();
      this.setStatus('offline');
      return { success: false, reason: 'offline_or_guest' };
    }

    const itemsToSend = Array.from(this.pending.values());
    this.pending.clear();

    const codTurma = (typeof CompState !== 'undefined' && CompState?.turmaInfo?.turma)
      ? CompState.turmaInfo.turma
      : (typeof document !== 'undefined' ? document.getElementById('codigoTurma')?.value?.trim() : '');

    if (!codTurma) {
      this.setStatus('idle');
      return { success: false, reason: 'no_turma' };
    }

    this.setStatus('syncing', { pendingCount: itemsToSend.length });

    try {
      const rows = itemsToSend.map(it => ({
        docente_id: user.id,
        codigo_turma: codTurma,
        aluno_nome: it.aluno,
        data_aula: it.dataIso,
        horas_falta: it.horasFalta,
        observacao: it.observacao,
        atualizado_em: new Date().toISOString()
      }));

      const { error } = await client
        .from('frequencias_discente')
        .upsert(rows, { onConflict: 'docente_id, codigo_turma, aluno_nome, data_aula' });

      if (error) {
        console.warn('[AttendanceSyncQueue] Falha no batch upsert de frequências:', error);
        this.setStatus('error', error);
        return { success: false, error };
      }

      this.setStatus('synced', { count: rows.length });
      return { success: true, count: rows.length };
    } catch (err) {
      console.warn('[AttendanceSyncQueue] Erro inesperado no flush de frequências:', err);
      this.setStatus('error', err);
      return { success: false, error: err };
    }
  }

  /**
   * Remove permanentemente registros de frequência de uma data específica no Supabase.
   */
  async deleteDate(dataIso, codTurma) {
    if (!dataIso) return { success: false };

    // Remove pendências locais dessa data
    for (const [key, item] of this.pending.entries()) {
      if (item.dataIso === dataIso) {
        this.pending.delete(key);
      }
    }

    const auth = this.authService || (typeof window !== 'undefined' ? window.authService : null);
    const client = auth?.client;
    const user = auth?.currentUser;

    if (!client || !user || !user.id) {
      return { success: true, offline: true };
    }

    const turma = codTurma || ((typeof CompState !== 'undefined' && CompState?.turmaInfo?.turma)
      ? CompState.turmaInfo.turma
      : (typeof document !== 'undefined' ? document.getElementById('codigoTurma')?.value?.trim() : ''));

    if (!turma) return { success: false, reason: 'no_turma' };

    try {
      const { error } = await client
        .from('frequencias_discente')
        .delete()
        .eq('docente_id', user.id)
        .eq('codigo_turma', turma)
        .eq('data_aula', dataIso);

      if (error) {
        console.warn('[AttendanceSyncQueue] Falha ao deletar data da nuvem:', error);
        return { success: false, error };
      }
      return { success: true };
    } catch (err) {
      console.warn('[AttendanceSyncQueue] Erro ao deletar data:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Gatilhos de segurança para forçar o flush se a aba for minimizada ou fechada.
   */
  initSecurityTriggers() {
    if (this._initializedTriggers || typeof window === 'undefined') return;
    this._initializedTriggers = true;

    // 1. Ao alternar ou minimizar a aba
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.pending.size > 0) {
          this.flush();
        }
      });
    }

    // 2. Ao fechar a janela ou navegar
    window.addEventListener('beforeunload', () => {
      if (this.pending.size > 0) {
        this.flush();
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.AttendanceSyncQueue = AttendanceSyncQueue;
  window.attendanceSyncQueue = new AttendanceSyncQueue();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AttendanceSyncQueue };
}

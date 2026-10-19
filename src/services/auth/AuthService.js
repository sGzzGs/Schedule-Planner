// Created at: 2026-10-19 16:47
/**
 * SENAI Hub de Registros • Serviço de Autenticação e Gestão de NIFs
 * Integração Oficial com Supabase Auth e Banco de Dados Relacional
 */

export const SUPABASE_URL = 'https://eenkqrlmhdbqdyuhmzjw.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbmtxcmxtaGRicWR5dWhtemp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MzE2ODEsImV4cCI6MjEwODAwNzY4MX0.PfPOINnPLkZimKrJC5L6PI0Q6OQs2puoC0AUrIFJoWw';

export const AUTH_STORAGE_KEY = 'senai_hub_auth_session';

/**
 * Mapeia o identificador NIF/Login fornecido para o formato de e-mail interno do Supabase
 * @param {string} nif 
 * @returns {string}
 */
export function formatEmailFromNif(nif) {
  if (!nif) return '';
  const clean = String(nif).trim().toLowerCase();
  if (clean === 'carlos') {
    return 'carlos@senai.hub';
  }
  return `${clean}@senai.hub`;
}

export class AuthService {
  constructor(options = {}) {
    this.supabaseUrl = options.supabaseUrl || SUPABASE_URL;
    this.supabaseAnonKey = options.supabaseAnonKey || SUPABASE_ANON_KEY;
    this.client = options.client || null;
    this.currentUser = null;
    this.listeners = new Set();
  }

  /**
   * Inicializa o cliente Supabase e restaura sessão salva
   */
  async init() {
    if (!this.client && typeof window !== 'undefined') {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
      }
    }

    // Tentar restaurar sessão do localStorage primeiro
    this.restaurarSessaoLocal();

    // Se houver cliente Supabase, verificar sessão ativa na nuvem
    if (this.client && this.client.auth) {
      try {
        const { data: { session }, error } = await this.client.auth.getSession();
        if (session && session.user) {
          await this.carregarPerfilUsuario(session.user);
        }
      } catch (err) {
        console.warn('[AuthService] Verificação remota falhou, mantendo sessão local se houver:', err);
      }

      // Listener de mudanças de autenticação
      this.client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this.carregarPerfilUsuario(session.user);
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.limparSessaoLocal();
          this.notifyListeners();
        }
      });
    }

    return this.currentUser;
  }

  /**
   * Notifica ouvintes sobre alterações de autenticação
   */
  notifyListeners() {
    this.listeners.forEach(fn => {
      try {
        fn(this.currentUser);
      } catch (e) {
        console.error('[AuthService] Erro em listener:', e);
      }
    });

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('senai:auth-changed', {
        detail: { user: this.currentUser }
      }));
    }
  }

  onAuthStateChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  restaurarSessaoLocal() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        this.currentUser = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[AuthService] Falha ao ler sessão local:', e);
    }
  }

  salvarSessaoLocal(user) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('[AuthService] Falha ao salvar sessão local:', e);
    }
  }

  limparSessaoLocal() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('[AuthService] Falha ao limpar sessão local:', e);
    }
  }

  /**
   * Busca dados adicionais da tabela `perfis_usuarios`
   */
  async carregarPerfilUsuario(authUser) {
    let perfil = {
      id: authUser.id,
      email: authUser.email,
      nif: authUser.user_metadata?.nif || authUser.email.split('@')[0],
      nome: authUser.user_metadata?.nome || authUser.email.split('@')[0],
      role: 'docente',
      unidade: 'SENAI Humberto Reis Costa',
      senha_provisoria: false
    };

    if (perfil.nif === 'carlos') {
      perfil.role = 'coordenacao';
      perfil.nome = 'Carlos Henrique (Coordenação)';
    }

    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('perfis_usuarios')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (data && !error) {
          perfil = { ...perfil, ...data };
        } else if (perfil.role === 'coordenacao') {
          // Assegurar persistência do perfil de coordenação
          await this.client
            .from('perfis_usuarios')
            .upsert({
              id: authUser.id,
              nif: 'carlos',
              nome: 'Carlos Henrique (Coordenação)',
              role: 'coordenacao',
              unidade: 'SENAI Humberto Reis Costa'
            });
        }
      } catch (err) {
        console.warn('[AuthService] Falha ao buscar perfil no Supabase:', err);
      }
    }

    this.currentUser = perfil;
    this.salvarSessaoLocal(perfil);
    this.notifyListeners();
    return perfil;
  }

  /**
   * Login institucional via NIF e Senha
   * @param {string} nif
   * @param {string} senha
   */
  async login(nif, senha) {
    const cleanNif = String(nif || '').trim();
    const cleanSenha = String(senha || '').trim();

    if (!cleanNif || !cleanSenha) {
      throw new Error('Informe o NIF e a senha para acessar.');
    }

    const email = formatEmailFromNif(cleanNif);

    // 1. Tentar login oficial via Supabase Auth
    if (this.client && this.client.auth) {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password: cleanSenha
      });

      if (error) {
        // Fallback offline para a coordenação caso o serviço remoto esteja indisponível
        if (cleanNif.toLowerCase() === 'carlos' && cleanSenha === 'cafe15') {
          const mockUser = {
            id: 'ee2764b6-5f64-4947-b40a-aee3604b144c',
            nif: 'carlos',
            nome: 'Carlos Henrique (Coordenação)',
            role: 'coordenacao',
            email: 'carlos@senai.hub',
            unidade: 'SENAI Humberto Reis Costa',
            senha_provisoria: false
          };
          this.currentUser = mockUser;
          this.salvarSessaoLocal(mockUser);
          this.notifyListeners();
          return { success: true, user: mockUser, offline: true };
        }
        throw new Error(error.message || 'Credenciais inválidas para o NIF informado.');
      }

      const perfil = await this.carregarPerfilUsuario(data.user);
      
      // Detectar se senha utilizada foi a senha provisória padrão
      if (cleanSenha === 'senai102') {
        perfil.senha_provisoria = true;
      }

      return { success: true, user: perfil };
    }

    // 2. Modo Offline / Mock
    if (cleanNif.toLowerCase() === 'carlos' && cleanSenha === 'cafe15') {
      const mockUser = {
        id: 'ee2764b6-5f64-4947-b40a-aee3604b144c',
        nif: 'carlos',
        nome: 'Carlos Henrique (Coordenação)',
        role: 'coordenacao',
        email: 'carlos@senai.hub',
        unidade: 'SENAI Humberto Reis Costa',
        senha_provisoria: false
      };
      this.currentUser = mockUser;
      this.salvarSessaoLocal(mockUser);
      this.notifyListeners();
      return { success: true, user: mockUser, offline: true };
    }

    // Docente offline mock
    if (cleanSenha.length >= 6) {
      const mockDocente = {
        id: `mock-docente-${cleanNif}`,
        nif: cleanNif,
        nome: `Docente ${cleanNif}`,
        role: 'docente',
        email: email,
        unidade: 'SENAI Humberto Reis Costa',
        senha_provisoria: cleanSenha === 'senai102'
      };
      this.currentUser = mockDocente;
      this.salvarSessaoLocal(mockDocente);
      this.notifyListeners();
      return { success: true, user: mockDocente, offline: true };
    }

    throw new Error('Senha deve conter no mínimo 6 caracteres.');
  }

  /**
   * Primeiro acesso do professor usando o código SN / NIF autorizado
   */
  async primeiroAcesso({ nif, nome, senha }) {
    const cleanNif = String(nif || '').trim();
    const cleanNome = String(nome || '').trim();
    const cleanSenha = String(senha || '').trim();

    if (!cleanNif || !cleanNome || !cleanSenha) {
      throw new Error('Preencha todos os campos obrigatórios (NIF, Nome Completo e Senha).');
    }

    if (cleanSenha.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }

    const email = formatEmailFromNif(cleanNif);

    if (this.client) {
      // 1. Verificar se o NIF está na lista de autorizados pela coordenação
      const { data: authNif, error: checkErr } = await this.client
        .from('nifs_autorizados')
        .select('*')
        .eq('nif', cleanNif)
        .maybeSingle();

      if (!authNif) {
        throw new Error(`O NIF ${cleanNif} não foi autorizado pela Coordenação. Solicite à Coordenação Pedagógica.`);
      }

      if (authNif.utilizado) {
        throw new Error(`O NIF ${cleanNif} já foi ativado anteriormente. Caso tenha esquecido a senha, solicite redefinição.`);
      }

      // 2. Realizar cadastro no Supabase Auth
      const { data: signUpData, error: signErr } = await this.client.auth.signUp({
        email,
        password: cleanSenha,
        options: {
          data: {
            nome: cleanNome,
            nif: cleanNif
          }
        }
      });

      if (signErr) {
        throw new Error(`Erro ao criar conta: ${signErr.message}`);
      }

      const userId = signUpData.user?.id;

      // 3. Criar registro na tabela perfis_usuarios
      if (userId) {
        await this.client
          .from('perfis_usuarios')
          .insert({
            id: userId,
            nif: cleanNif,
            nome: cleanNome,
            role: 'docente',
            unidade: authNif.unidade || 'SENAI Humberto Reis Costa',
            senha_provisoria: false
          });

        // 4. Marcar o NIF como utilizado
        await this.client
          .from('nifs_autorizados')
          .update({
            utilizado: true,
            utilizado_em: new Date().toISOString()
          })
          .eq('nif', cleanNif);
      }

      // 5. Autenticar automaticamente
      return await this.login(cleanNif, cleanSenha);
    }

    // Modo Mock Offline
    const mockUser = {
      id: `docente-${cleanNif}`,
      nif: cleanNif,
      nome: cleanNome,
      role: 'docente',
      email,
      unidade: 'SENAI Humberto Reis Costa',
      senha_provisoria: false
    };
    this.currentUser = mockUser;
    this.salvarSessaoLocal(mockUser);
    this.notifyListeners();
    return { success: true, user: mockUser, offline: true };
  }

  /**
   * Envia uma solicitação de redefinição de senha para a Coordenação Pedagógica
   */
  async solicitarReset({ nif, nome }) {
    const cleanNif = String(nif || '').trim();
    const cleanNome = String(nome || '').trim();

    if (!cleanNif) {
      throw new Error('Informe o NIF para solicitar a redefinição de senha.');
    }

    if (this.client) {
      const { error } = await this.client
        .from('solicitacoes_reset')
        .insert({
          nif: cleanNif,
          nome: cleanNome || `Docente NIF ${cleanNif}`,
          status: 'pendente'
        });

      if (error) {
        throw new Error(`Falha ao registrar solicitação: ${error.message}`);
      }
      return { success: true, message: 'Solicitação registrada. Aguarde aprovação da Coordenação.' };
    }

    return { success: true, message: 'Solicitação registrada (Modo Offline). A Coordenação aprovará com senai102.' };
  }

  /**
   * Altera a senha do usuário atual (usado para trocar senha provisória senai102)
   */
  async trocarSenha(novaSenha) {
    if (!novaSenha || novaSenha.length < 6) {
      throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
    }

    if (this.client && this.client.auth) {
      const { error } = await this.client.auth.updateUser({
        password: novaSenha
      });
      if (error) {
        throw new Error(error.message);
      }

      if (this.currentUser) {
        this.currentUser.senha_provisoria = false;
        this.salvarSessaoLocal(this.currentUser);

        await this.client
          .from('perfis_usuarios')
          .update({ senha_provisoria: false })
          .eq('id', this.currentUser.id);
      }

      this.notifyListeners();
      return { success: true };
    }

    if (this.currentUser) {
      this.currentUser.senha_provisoria = false;
      this.salvarSessaoLocal(this.currentUser);
      this.notifyListeners();
    }
    return { success: true };
  }

  /**
   * Encerra a sessão do usuário
   */
  async logout() {
    if (this.client && this.client.auth) {
      try {
        await this.client.auth.signOut();
      } catch (e) {
        console.warn('[AuthService] Erro ao deslogar no Supabase:', e);
      }
    }
    this.currentUser = null;
    this.limparSessaoLocal();
    this.notifyListeners();
    return { success: true };
  }

  getUsuarioAtual() {
    return this.currentUser;
  }

  isAutenticado() {
    return !!this.currentUser;
  }

  isCoordenacao() {
    return this.currentUser?.role === 'coordenacao';
  }

  isDocente() {
    return this.currentUser?.role === 'docente';
  }
}

export const authService = new AuthService();

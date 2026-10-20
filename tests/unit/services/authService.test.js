// Created at: 2026-10-19 16:48
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService, formatEmailFromNif } from '../../../src/services/auth/AuthService.js';

describe('AuthService & Gestão de NIFs (SENAI)', () => {
  let auth;

  beforeEach(() => {
    auth = new AuthService();
  });

  describe('1. Mapeamento de Login / NIF para E-mail Interno', () => {
    it('deve mapear login "carlos" diretamente para "carlos@senai.hub"', () => {
      expect(formatEmailFromNif('carlos')).toBe('carlos@senai.hub');
      expect(formatEmailFromNif('CARLOS')).toBe('carlos@senai.hub');
      expect(formatEmailFromNif('  carlos  ')).toBe('carlos@senai.hub');
    });

    it('deve mapear NIFs numéricos de docentes para "@{nif}@senai.hub"', () => {
      expect(formatEmailFromNif('491201')).toBe('491201@senai.hub');
      expect(formatEmailFromNif('381022')).toBe('381022@senai.hub');
      expect(formatEmailFromNif(' 992015 ')).toBe('992015@senai.hub');
    });

    it('deve retornar string vazia para NIF nulo ou indefinido', () => {
      expect(formatEmailFromNif('')).toBe('');
      expect(formatEmailFromNif(null)).toBe('');
      expect(formatEmailFromNif(undefined)).toBe('');
    });
  });

  describe('2. Login e Controle de Papéis (Coordenação vs Docente)', () => {
    it('deve autenticar Carlos com senha cafe15 e conceder papel de coordenação', async () => {
      const res = await auth.login('carlos', 'cafe15');
      expect(res.success).toBe(true);
      expect(res.user.role).toBe('coordenacao');
      expect(res.user.nif).toBe('carlos');
      expect(auth.isCoordenacao()).toBe(true);
      expect(auth.isDocente()).toBe(false);
      expect(auth.isAutenticado()).toBe(true);
    });

    it('deve autenticar docente com papel de docente', async () => {
      const res = await auth.login('491201', 'senhaSegura123');
      expect(res.success).toBe(true);
      expect(res.user.role).toBe('docente');
      expect(res.user.nif).toBe('491201');
      expect(auth.isCoordenacao()).toBe(false);
      expect(auth.isDocente()).toBe(true);
    });

    it('deve sinalizar senha_provisoria se a senha utilizada for "senai102"', async () => {
      const res = await auth.login('491201', 'senai102');
      expect(res.success).toBe(true);
      expect(res.user.senha_provisoria).toBe(true);
    });

    it('deve limpar sessão ao realizar logout', async () => {
      await auth.login('carlos', 'cafe15');
      expect(auth.isAutenticado()).toBe(true);

      await auth.logout();
      expect(auth.isAutenticado()).toBe(false);
      expect(auth.getUsuarioAtual()).toBeNull();
    });
  });

  describe('3. Primeiro Acesso e Validações', () => {
    it('deve rejeitar primeiro acesso com campos vazios sem mencionar Nome Completo', async () => {
      await expect(auth.primeiroAcesso({ nif: '', senha: '' }))
        .rejects.toThrow('Preencha todos os campos obrigatórios (NIF e Senha).');
    });

    it('deve rejeitar senha com menos de 3 caracteres', async () => {
      await expect(auth.primeiroAcesso({ nif: '123456', senha: '12' }))
        .rejects.toThrow(/mínimo 3 caracteres/);
    });

    it('deve aceitar senha a partir de 3 caracteres e resolver nome automaticamente', async () => {
      const res = await auth.primeiroAcesso({ nif: '123456', senha: '123' });
      expect(res.success).toBe(true);
      expect(res.user.nif).toBe('123456');
      expect(res.user.nome).toBe('Docente 123456');
    });

    it('deve aceitar troca de senha a partir de 3 caracteres', async () => {
      await expect(auth.trocarSenha('12')).rejects.toThrow(/mínimo 3 caracteres/);
      // Offline mock trocarSenha
      auth.currentUser = { id: 'doc-1', role: 'docente', senha_provisoria: true };
      const res = await auth.trocarSenha('123');
      expect(res.success).toBe(true);
      expect(auth.currentUser.senha_provisoria).toBe(false);
    });
  });
});

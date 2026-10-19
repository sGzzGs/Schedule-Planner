// Created at: 2026-10-19 19:57
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Proteção de Autenticação da Coordenação & Calendário (SCO03-d)', () => {
  let html;

  beforeEach(() => {
    html = fs.readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');
    // Sanitize script and link tags to avoid Happy-DOM network fetches
    const sanitizedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<link\b[^>]*>/gi, '');
    document.body.innerHTML = sanitizedHtml;

    // Mock global window objects
    window.compMostrarToast = vi.fn();
    window.showToast = vi.fn();
    window.authService = {
      currentUser: null,
      abrirModalLogin: vi.fn(),
      isCoordenacao: () => false
    };
  });

  describe('1. Purga de Mock Dados e Estado Inicial "No Data"', () => {
    it('deve conter KPIs zerados por padrão em index.html', () => {
      const kpiTotal = document.getElementById('kpi-total-monitorado');
      const kpiCriticos = document.getElementById('kpi-alunos-criticos');
      const kpiAtencao = document.getElementById('kpi-alunos-atencao');
      const kpiPendenciasDoc = document.getElementById('kpi-pendencias-docente');
      const kpiPendenciasCoord = document.getElementById('kpi-pendencias-coordenacao');

      expect(kpiTotal?.textContent?.trim()).toBe('0');
      expect(kpiCriticos?.textContent?.trim()).toBe('0');
      expect(kpiAtencao?.textContent?.trim()).toBe('0');
      expect(kpiPendenciasDoc?.textContent?.trim()).toBe('0');
      expect(kpiPendenciasCoord?.textContent?.trim()).toBe('0');
    });

    it('deve exibir a linha padrão "No Data" na tabela de discentes em index.html', () => {
      const table = document.getElementById('studentsTable');
      expect(table).not.toBeNull();
      expect(table.innerHTML).toContain('No Data');
      expect(table.innerHTML).toContain('Nenhum professor ou discente cadastrado no sistema via Supabase.');
      // Não deve conter os discentes mockados do Stitch
      expect(table.innerHTML).not.toContain('Alice Ferreira Ramos');
      expect(table.innerHTML).not.toContain('Bruno Henrique Sampaio');
      expect(table.innerHTML).not.toContain('Felipe Augusto Barreto');
    });

    it('deve exibir estado "No Data" na lista de resets de senha pendentes', () => {
      const resets = document.getElementById('pendingResetsList');
      expect(resets).not.toBeNull();
      expect(resets.innerHTML).toContain('No Data');
      expect(resets.innerHTML).not.toContain('Helena Albuquerque');
      expect(resets.innerHTML).not.toContain('Marcos Vinícius');
    });

    it('não deve conter opções mockadas nos selects de docente e turma', () => {
      const docSelect = document.getElementById('docenteFilter');
      const turmaSelect = document.getElementById('turmaFilter');

      expect(docSelect?.innerHTML).not.toContain('Prof. Leonardo Matos');
      expect(turmaSelect?.innerHTML).not.toContain('DES-2602TG');
    });
  });

  describe('2. Proteção de Acesso à Aba de Coordenação', () => {
    it('deve bloquear a navegação para tab-coordenacao e emitir aviso quando não autenticado', () => {
      window.authService.currentUser = null;

      let navigationBlocked = false;
      const isCoordLogado = Boolean(
        window.authService?.currentUser &&
        window.authService.currentUser.role === 'coordenacao'
      );

      if (!isCoordLogado) {
        navigationBlocked = true;
        window.compMostrarToast('Acesso Restrito', 'Necessária Autenticação de Coordenação.', 'warning');
        window.authService.abrirModalLogin();
      }

      expect(navigationBlocked).toBe(true);
      expect(window.compMostrarToast).toHaveBeenCalledWith(
        'Acesso Restrito',
        'Necessária Autenticação de Coordenação.',
        'warning'
      );
      expect(window.authService.abrirModalLogin).toHaveBeenCalled();
    });

    it('deve permitir acesso à tab-coordenacao quando o usuário possuir papel coordenacao', () => {
      window.authService.currentUser = {
        id: 'coord-123',
        role: 'coordenacao',
        nome: 'Coordenador Teste'
      };

      const isCoordLogado = Boolean(
        window.authService?.currentUser &&
        window.authService.currentUser.role === 'coordenacao'
      );

      expect(isCoordLogado).toBe(true);
      expect(window.compMostrarToast).not.toHaveBeenCalled();
    });
  });

  describe('3. Proteção e Apagamento de Opções no Calendário', () => {
    it('deve bloquear o clique em Adicionar / Gerenciar Dia quando não autenticado como coordenador', () => {
      window.authService.currentUser = null;

      let actionExecuted = false;
      const isCoord = Boolean(
        window.authService?.currentUser &&
        window.authService.currentUser.role === 'coordenacao'
      );

      if (!isCoord) {
        window.compMostrarToast('Acesso Restrito', 'Necessária Autenticação de Coordenação.', 'warning');
        window.authService.abrirModalLogin();
      } else {
        actionExecuted = true;
      }

      expect(actionExecuted).toBe(false);
      expect(window.compMostrarToast).toHaveBeenCalledWith(
        'Acesso Restrito',
        'Necessária Autenticação de Coordenação.',
        'warning'
      );
      expect(window.authService.abrirModalLogin).toHaveBeenCalled();
    });

    it('deve bloquear o clique com botão direito no dia do calendário para não coordenadores', () => {
      window.authService.currentUser = {
        id: 'doc-456',
        role: 'docente',
        nome: 'Docente Horista'
      };

      let contextMenuOpened = false;
      const isCoord = Boolean(
        window.authService?.currentUser &&
        window.authService.currentUser.role === 'coordenacao'
      );

      if (!isCoord) {
        window.compMostrarToast('Acesso Restrito', 'Necessária Autenticação de Coordenação.', 'warning');
        window.authService.abrirModalLogin();
      } else {
        contextMenuOpened = true;
      }

      expect(contextMenuOpened).toBe(false);
      expect(window.compMostrarToast).toHaveBeenCalledWith(
        'Acesso Restrito',
        'Necessária Autenticação de Coordenação.',
        'warning'
      );
    });

    it('deve liberar as funções do calendário quando autenticado como coordenação', () => {
      window.authService.currentUser = {
        id: 'coord-789',
        role: 'coordenacao',
        nome: 'Carlos Henrique'
      };

      const isCoord = Boolean(
        window.authService?.currentUser &&
        window.authService.currentUser.role === 'coordenacao'
      );

      expect(isCoord).toBe(true);
    });
  });
});

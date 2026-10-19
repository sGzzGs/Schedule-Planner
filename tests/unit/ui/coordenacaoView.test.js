// Created at: 2026-10-19 16:56
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';

describe('Painel da Coordenação Pedagógica (HTML & UI DOM)', () => {
  let html;

  beforeEach(() => {
    html = fs.readFileSync('index.html', 'utf8');
  });

  describe('1. Presença dos Elementos Estruturais da 4ª Aba', () => {
    it('deve conter o botão da aba da coordenação com o identificador tab-nav-coordenacao', () => {
      expect(html).toContain('id="tab-nav-coordenacao"');
      expect(html).toContain('data-tab="tab-coordenacao"');
    });

    it('deve conter o container de página da coordenação com id tab-coordenacao', () => {
      expect(html).toContain('id="tab-coordenacao"');
      expect(html).toContain('class="app-page"');
    });

    it('deve conter o botão de login institucional e a pill de perfil do usuário', () => {
      expect(html).toContain('id="btn-topbar-login"');
      expect(html).toContain('id="topbar-user-profile"');
      expect(html).toContain('id="btn-topbar-logout"');
    });
  });

  describe('2. Tabela de Governança e Duplo Alerta', () => {
    it('deve conter a tabela de discentes com o id studentsTable', () => {
      expect(html).toContain('id="studentsTable"');
    });

    it('deve conter os filtros de docente, turma e busca', () => {
      expect(html).toContain('id="docenteFilter"');
      expect(html).toContain('id="turmaFilter"');
      expect(html).toContain('id="searchInput"');
    });

    it('deve conter os cards de KPIs de governança', () => {
      expect(html).toContain('id="kpi-total-monitorado"');
      expect(html).toContain('id="kpi-alunos-criticos"');
      expect(html).toContain('id="kpi-pendencias-docente"');
    });
  });

  describe('3. Modais de Evasão, NIFs e Resets', () => {
    it('deve conter o modal de recomendação formal de evasão escolar', () => {
      expect(html).toContain('id="modalEvasaoEscolar"');
      expect(html).toContain('id="evasaoMotivoText"');
    });

    it('deve conter o modal de autorização de novos docentes / NIFs', () => {
      expect(html).toContain('id="modalNewTeacher"');
    });

    it('deve conter o modal de aprovação de redefinição de senhas com senai102', () => {
      expect(html).toContain('id="modalResetPassword"');
    });

    it('deve conter os modais de autenticação institucional e troca de senha', () => {
      expect(html).toContain('id="modal-auth-container"');
      expect(html).toContain('id="modal-auth-reset"');
      expect(html).toContain('id="modal-auth-force-change"');
    });
  });
});

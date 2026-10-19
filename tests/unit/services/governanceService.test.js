// Created at: 2026-10-19 16:48
import { describe, it, expect, beforeEach } from 'vitest';
import { GovernanceService } from '../../../src/services/governance/GovernanceService.js';

describe('GovernanceService & Duplo Alerta / Evasão (SENAI)', () => {
  let gov;

  beforeEach(() => {
    gov = new GovernanceService();
  });

  const mockAlunos = [
    {
      id: 'aluno-1',
      nome_discente: 'Lucas Mendes',
      matricula: '982341',
      codigo_turma: 'DES-2602TG',
      docente_id: 'prof-1',
      nome_docente: 'Prof. Leonardo Matos',
      total_faltas: 18,
      faltas_ultima_impressao_docente: 10,
      perc_faltas: 28.5,
      atestado_coordenacao: false,
      status_evasao: 'ativo'
    },
    {
      id: 'aluno-2',
      nome_discente: 'Alice Ferreira Ramos',
      matricula: '982342',
      codigo_turma: 'DES-2602TG',
      docente_id: 'prof-1',
      nome_docente: 'Prof. Leonardo Matos',
      total_faltas: 16,
      faltas_ultima_impressao_docente: 16,
      perc_faltas: 25.0,
      atestado_coordenacao: true,
      status_evasao: 'recomendada_coordenacao'
    },
    {
      id: 'aluno-3',
      nome_discente: 'Bruno Carvalho',
      matricula: '982343',
      codigo_turma: 'AUT-2601T',
      docente_id: 'prof-2',
      nome_docente: 'Profª. Helena Albuquerque',
      total_faltas: 4,
      faltas_ultima_impressao_docente: 4,
      perc_faltas: 6.25,
      atestado_coordenacao: false,
      status_evasao: 'ativo'
    }
  ];

  describe('1. Cálculo do Duplo Alerta de Ausências', () => {
    it('deve identificar pendência de impressão do docente quando houver faltas após última ficha impressa', () => {
      const alerta = gov.calcularAlertasAluno(mockAlunos[0]);
      expect(alerta.alertaDocentePendente).toBe(true);
      expect(alerta.faltasSemImpressao).toBe(8); // 18 - 10 = 8
      expect(alerta.alertaRiscoReprovacao).toBe(true); // 28.5% >= 25%
    });

    it('não deve disparar alerta de impressão quando docente já tiver impresso para todas as faltas', () => {
      const alerta = gov.calcularAlertasAluno(mockAlunos[1]);
      expect(alerta.alertaDocentePendente).toBe(false);
      expect(alerta.faltasSemImpressao).toBe(0);
      expect(alerta.alertaRiscoReprovacao).toBe(true); // 25.0% >= 25%
    });
  });

  describe('2. Ordenação e Filtros de Governança', () => {
    it('deve ordenar alunos por % de faltas em ordem decrescente por padrão', () => {
      const ordenados = gov.ordenarAlunosPorFaltas(mockAlunos);
      expect(ordenados[0].nome_discente).toBe('Lucas Mendes'); // 28.5%
      expect(ordenados[1].nome_discente).toBe('Alice Ferreira Ramos'); // 25.0%
      expect(ordenados[2].nome_discente).toBe('Bruno Carvalho'); // 6.25%
    });

    it('deve filtrar alunos por termo de busca (nome ou matrícula)', () => {
      const filtrados = gov.filtrarAlunos(mockAlunos, { termo: 'Alice' });
      expect(filtrados.length).toBe(1);
      expect(filtrados[0].nome_discente).toBe('Alice Ferreira Ramos');
    });

    it('deve filtrar alunos em risco de 25% ou mais', () => {
      const filtrados = gov.filtrarAlunos(mockAlunos, { statusFiltro: 'alerta_25' });
      expect(filtrados.length).toBe(2);
    });

    it('deve filtrar alunos com pendência de impressão docente', () => {
      const filtrados = gov.filtrarAlunos(mockAlunos, { statusFiltro: 'pendencia_docente' });
      expect(filtrados.length).toBe(1);
      expect(filtrados[0].nome_discente).toBe('Lucas Mendes');
    });
  });

  describe('3. Métricas Consolidadas (KPIs)', () => {
    it('deve calcular corretamente as métricas de frequência, risco, pendências e evasão', () => {
      const kpis = gov.calcularMetricas(mockAlunos);
      expect(kpis.totalAlunos).toBe(3);
      expect(kpis.alunosEmRisco25).toBe(2);
      expect(kpis.pendenciasImpressaoDocente).toBe(1);
      expect(kpis.evasoesRecomendadas).toBe(1);
    });
  });

  describe('4. Fluxo Institucional de Evasão Escolar', () => {
    it('deve permitir que a coordenação recomende evasão', () => {
      const alunoAtualizado = gov.recomendarEvasao(mockAlunos[0], 'Faltas consecutivas sem justificativa', 'coord-1');
      expect(alunoAtualizado.status_evasao).toBe('recomendada_coordenacao');
      expect(alunoAtualizado.motivo_evasao).toBe('Faltas consecutivas sem justificativa');
      expect(alunoAtualizado.recomendada_em).toBeDefined();
    });

    it('deve permitir que o docente aceite a recomendação de evasão', () => {
      const alunoEvadido = gov.aceitarEvasao(mockAlunos[1]);
      expect(alunoEvadido.status_evasao).toBe('evadido');
      expect(alunoEvadido.aceita_docente_em).toBeDefined();
    });

    it('deve bloquear aceitar evasão se a coordenação não tiver recomendado previamente', () => {
      expect(() => gov.aceitarEvasao(mockAlunos[0])).toThrow(/Apenas alunos com evasão recomendada/);
    });
  });
});

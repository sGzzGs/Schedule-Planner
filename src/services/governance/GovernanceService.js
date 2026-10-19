// Created at: 2026-10-19 16:47
/**
 * SENAI Hub de Registros • Serviço de Governança de Frequência e Evasão Escolar
 * Gestão de métricas consolidadas, duplo alerta e fluxo de evasão
 */

export class GovernanceService {
  constructor(options = {}) {
    this.client = options.client || null;
    this.alunos = [];
    this.turmas = [];
    this.nifs = [];
    this.resets = [];
  }

  /**
   * Calcula o duplo alerta de ausência para um aluno:
   * 1. Alerta Docente: faltas acumuladas após a última impressão de compensação
   * 2. Alerta Coordenação: % de faltas crítica (>=25% ou >=10%) sem atesto da coordenação
   */
  calcularAlertasAluno(aluno) {
    const totalFaltas = Number(aluno.total_faltas || 0);
    const faltasUltimaImpressao = Number(aluno.faltas_ultima_impressao_docente || 0);
    const percFaltas = Number(aluno.perc_faltas || 0);
    const atestadoCoord = Boolean(aluno.atestado_coordenacao);

    // Alerta 1: Docente imprimiu ficha com menos faltas do que o total atual acumulado?
    const faltasSemImpressao = Math.max(0, totalFaltas - faltasUltimaImpressao);
    const alertaDocentePendente = totalFaltas > 0 && faltasSemImpressao > 0;

    // Alerta 2: Coordenação precisa intervir? (>=25% risco de reprovação ou >=10% atenção)
    const alertaRiscoReprovacao = percFaltas >= 25;
    const alertaAtencao = percFaltas >= 10 && percFaltas < 25;
    const coordenacaoPendente = percFaltas >= 10 && !atestadoCoord;

    return {
      alertaDocentePendente,
      faltasSemImpressao,
      alertaRiscoReprovacao,
      alertaAtencao,
      coordenacaoPendente
    };
  }

  /**
   * Ordena a lista de alunos por % de faltas em ordem decrescente (padrão institucional)
   */
  ordenarAlunosPorFaltas(alunos) {
    return [...alunos].sort((a, b) => {
      const percA = Number(a.perc_faltas || 0);
      const percB = Number(b.perc_faltas || 0);
      if (percB !== percA) {
        return percB - percA;
      }
      return Number(b.total_faltas || 0) - Number(a.total_faltas || 0);
    });
  }

  /**
   * Filtra alunos de acordo com os critérios de busca, docente, turma e status
   */
  filtrarAlunos(alunos, { termo = '', docenteId = '', codigoTurma = '', statusFiltro = 'todos' } = {}) {
    const search = termo.trim().toLowerCase();

    return alunos.filter(aluno => {
      // Filtro de texto
      if (search) {
        const nome = (aluno.nome_discente || '').toLowerCase();
        const mat = (aluno.matricula || '').toLowerCase();
        const turma = (aluno.codigo_turma || '').toLowerCase();
        if (!nome.includes(search) && !mat.includes(search) && !turma.includes(search)) {
          return false;
        }
      }

      // Filtro de docente
      if (docenteId && aluno.docente_id !== docenteId && aluno.nome_docente !== docenteId) {
        return false;
      }

      // Filtro de turma
      if (codigoTurma && aluno.codigo_turma !== codigoTurma) {
        return false;
      }

      // Filtro de status
      const alertas = this.calcularAlertasAluno(aluno);
      if (statusFiltro === 'alerta_25') {
        return alertas.alertaRiscoReprovacao;
      }
      if (statusFiltro === 'pendencia_docente') {
        return alertas.alertaDocentePendente;
      }
      if (statusFiltro === 'evasao_recomendada') {
        return aluno.status_evasao === 'recomendada_coordenacao';
      }
      if (statusFiltro === 'evadido') {
        return aluno.status_evasao === 'evadido';
      }

      return true;
    });
  }

  /**
   * Calcula as métricas consolidadas (KPIs) para o painel de governança
   */
  calcularMetricas(alunos) {
    if (!alunos || alunos.length === 0) {
      return {
        totalAlunos: 0,
        mediaFrequencia: 100,
        alunosEmRisco25: 0,
        pendenciasImpressaoDocente: 0,
        evasoesRecomendadas: 0,
        alunosEvadidos: 0
      };
    }

    let somaFrequencia = 0;
    let emRisco25 = 0;
    let pendenciasImpressao = 0;
    let evasoesRecomendadas = 0;
    let evadidos = 0;

    alunos.forEach(aluno => {
      const percFaltas = Number(aluno.perc_faltas || 0);
      const frequencia = Math.max(0, 100 - percFaltas);
      somaFrequencia += frequencia;

      const alertas = this.calcularAlertasAluno(aluno);
      if (alertas.alertaRiscoReprovacao) emRisco25++;
      if (alertas.alertaDocentePendente) pendenciasImpressao++;
      if (aluno.status_evasao === 'recomendada_coordenacao') evasoesRecomendadas++;
      if (aluno.status_evasao === 'evadido') evadidos++;
    });

    return {
      totalAlunos: alunos.length,
      mediaFrequencia: Number((somaFrequencia / alunos.length).toFixed(1)),
      alunosEmRisco25: emRisco25,
      pendenciasImpressaoDocente: pendenciasImpressao,
      evasoesRecomendadas: evasoesRecomendadas,
      alunosEvadidos: evadidos
    };
  }

  /**
   * Recomenda evasão para um aluno
   */
  recomendarEvasao(aluno, motivo, coordenadorId) {
    return {
      ...aluno,
      status_evasao: 'recomendada_coordenacao',
      motivo_evasao: motivo || 'Recomendação formal pela Coordenação Pedagógica.',
      recomendada_em: new Date().toISOString(),
      recomendada_por: coordenadorId || null
    };
  }

  /**
   * Aceita a recomendação de evasão (ação exclusiva do docente responsável)
   */
  aceitarEvasao(aluno) {
    if (aluno.status_evasao !== 'recomendada_coordenacao') {
      throw new Error('Apenas alunos com evasão recomendada pela coordenação podem ter a evasão confirmada.');
    }
    return {
      ...aluno,
      status_evasao: 'evadido',
      aceita_docente_em: new Date().toISOString()
    };
  }
}

export const governanceService = new GovernanceService();

/**
 * compensacao.js
 * Aba: Gerador de Compensação de Ausências — Badge t02
 *
 * Responsabilidades:
 *  - Dicionário canônico e normalizado das 24 variáveis (sem acentos/espaços)
 *  - Recepção e sincronização determinística dos dias letivos da Aba 1 (activeLessons)
 *  - Limpeza automática de faltas órfãs ao alterar data de início ou dias letivos
 *  - Trava rígida: ch_aulas_dadas jamais pode exceder ch_total_curso
 *  - FASE 2: Calendário Interativo de Chamadas com ação 'Flip' para faltas
 *  - FASE 2: Clique com botão direito ou Long Press para personalização de horas
 *  - Motor de estado reativo com suporte a cálculos automáticos e overrides manuais
 *  - Autenticação e bloqueio de segurança para área restrita da coordenação
 *  - Exportação do relatório oficial Variaveis_info_t02.md
 */

'use strict';

// ==========================================================================
// BADGE / VERSÃO
// ==========================================================================
const COMP_BADGE = 't04';
const COMP_RELATORIO_FILENAME = `Variaveis_info_${COMP_BADGE}.md`;
const COMP_SENHA_COORDENACAO = 'cafe15';

// Discentes pré-definidos (Inicia vazio para produção - cadastrados pelo usuário)
const COMP_TURMAS_DISCENTES = {};

// ==========================================================================
// CATÁLOGO CANÔNICO DAS 24 VARIÁVEIS NORMALIZADAS
// ==========================================================================
const COMP_VARIAVEIS_META = [
  {
    key: 'aluno_nome',
    legacyKey: 'aluno',
    nome: 'Aluno',
    funcao: 'Nome do discente selecionado para a solicitação de compensação',
    dica: 'Vai ser preenchido dinamicamente, sozinho, pelo script, de acordo com as faltas',
    categoria: 'identificacao',
    protegida: false,
    tipo: 'string'
  },
  {
    key: 'curso_nome',
    legacyKey: 'curso',
    nome: 'Curso',
    funcao: 'Nome oficial do curso ou ocupação profissional',
    dica: 'Preenchido pela aba anterior com o campo especificado "Nome do Curso / Ocupação"',
    categoria: 'identificacao',
    protegida: false,
    tipo: 'string'
  },
  {
    key: 'docente_nome',
    legacyKey: 'docente',
    nome: 'Docente',
    funcao: 'Nome do professor / instrutor responsável',
    dica: 'Preenchido pelo campo Professor / Responsável da aba anterior',
    categoria: 'identificacao',
    protegida: false,
    tipo: 'string'
  },
  {
    key: 'ch_total_curso',
    legacyKey: 'carga_horaria_total',
    nome: 'Carga Horária',
    funcao: 'Carga horária total curricular da turma (horas)',
    dica: 'preenchido pelo campo C.H. Total (Horas)',
    categoria: 'identificacao',
    protegida: false,
    tipo: 'number'
  },
  {
    key: 'turma_codigo',
    legacyKey: 'turma',
    nome: 'Turma',
    funcao: 'Código identificador da turma no sistema acadêmico',
    dica: 'preenchido pelo campo Código da Turma',
    categoria: 'identificacao',
    protegida: false,
    tipo: 'string'
  },
  {
    key: 'justificativa_texto',
    legacyKey: 'justificativa',
    nome: 'Justificativa',
    funcao: 'Motivação ou justificativa detalhada apresentada pelo discente',
    dica: 'Deixar em branco por padrão. Campo livre para override do usuário',
    categoria: 'termo_ciencia',
    protegida: false,
    tipo: 'string'
  },
  {
    key: 'comprovante_tipo',
    legacyKey: 'comprovante_justificativa',
    nome: 'Comprovante de Justificativa',
    funcao: 'Tipo de documento comprobatório apresentado (Atestado / Declaração / etc)',
    dica: 'Criar os checkboxes clicáveis',
    categoria: 'termo_ciencia',
    protegida: false,
    tipo: 'string'
  },
  {
    key: 'ch_curso_disciplina',
    legacyKey: 'ch_curso_disciplina',
    nome: 'Carga Horária do Curso/Disciplina',
    funcao: 'Total do curso ou disciplina objeto da compensação',
    dica: 'preenchido pelo campo C.H. Total (Horas)',
    categoria: 'apuracao_faltas',
    protegida: false,
    tipo: 'number'
  },
  {
    key: 'ch_aulas_dadas',
    legacyKey: 'ch_aulas_dadas',
    nome: 'Carga Horária das Aulas Dadas',
    funcao: 'Horas já ministradas até o momento (nunca maior que a carga da disciplina)',
    dica: 'Calcular com base no calendário importado e no dia atual, considerando as horas de cada dia de acordo com a aba de cronograma. Deve ser editável pelo user',
    categoria: 'apuracao_faltas',
    protegida: false,
    tipo: 'number'
  },
  {
    key: 'total_horas_faltas',
    legacyKey: 'total_horas_faltas',
    nome: 'Total de Horas/Faltas Registradas',
    funcao: 'Quantia de horas em que o discente se ausentou',
    dica: 'Vai ser calculado automaticamente, com a chamada inserida no calendário, também podendo ser mudada manualmente. A conta deverá considerar exatamente a hora de cada dia.',
    categoria: 'apuracao_faltas',
    protegida: false,
    tipo: 'number'
  },
  {
    key: 'porcentagem_frequencia',
    legacyKey: 'porcentagem_frequencia',
    nome: 'Porcentagem de Frequência',
    funcao: 'Percentual de assiduidade escolar arredondado para baixo',
    dica: 'Informe sem casas decimais, no formato "XX%", sendo a divisão direta da quantidade de Total de Faltas Registradas pela carga horaria do curso, arredondada para baixo',
    categoria: 'apuracao_faltas',
    protegida: false,
    tipo: 'string'
  },
  {
    key: 'data_notificacao',
    legacyKey: 'data_preenchimento',
    nome: 'Data',
    funcao: 'Data de preenchimento da notificação',
    dica: 'Campo de preenchimento de Data, deve ser possível preencher colando a data diretamente, escrevendo ou abrindo um calendário. Deve ser pré preenchida automaticamente com a data do dia',
    categoria: 'apuracao_faltas',
    protegida: false,
    tipo: 'date'
  },
  {
    key: 'situacao_tender_nao_cert',
    legacyKey: 'situacao_tender_nao_cert',
    nome: 'Tender a ser Não Certificado.',
    funcao: 'Aluno ainda possui 75% de frequência ou mais',
    dica: 'Será uma checkbox que deve ser marcada automaticamente, podendo ser desmarcada pelo user, caso o aluno tenha 75% ou mais de frequência',
    categoria: 'situacao',
    protegida: false,
    tipo: 'boolean'
  },
  {
    key: 'situacao_nao_cert',
    legacyKey: 'situacao_nao_cert',
    nome: 'Não Certificado.',
    funcao: 'Aluno está entre 40% e 75% Freq.',
    dica: 'Será uma checkbox que deve ser marcada automaticamente, podendo ser desmarcada pelo user, caso o aluno tenha 40%<=Porcentagem de Frequência<75%',
    categoria: 'situacao',
    protegida: false,
    tipo: 'boolean'
  },
  {
    key: 'situacao_nao_cert_excesso',
    legacyKey: 'situacao_nao_cert_excesso',
    nome: 'Não Certificado – Com excesso de faltas consecutivas e/ou superiores a 40% da carga horária do curso.',
    funcao: 'Excesso de Faltas',
    dica: 'Checkbox marcada automaticamente caso o aluno tenha frequência abaixo de 40%',
    categoria: 'situacao',
    protegida: false,
    tipo: 'boolean'
  },
  {
    key: 'data_autorizacao_extenso',
    legacyKey: 'data_local_solicitacao',
    nome: 'Data Autorização',
    funcao: 'Data da aprovação pela coordenação por extenso',
    dica: 'Preenchimento de data, no formato extenso, devendo ser pré preenchida com o dia atual, no formato "DD, de MMMM de AAAA". Função protegida por senha (na página 2)',
    categoria: 'coordenacao',
    protegida: true,
    tipo: 'string'
  },
  {
    key: 'deferido_status',
    legacyKey: 'deferido_sim',
    nome: 'Solicitação deferida?',
    funcao: 'Parecer conclusivo da coordenação (Sim ou Não)',
    dica: 'Deve Desmarcar a checkbox "Não" caso marcada, as duas serão concorrentes. Função protegida por senha.',
    categoria: 'coordenacao',
    protegida: true,
    tipo: 'string'
  },
  {
    key: 'observacao_coordenador',
    legacyKey: 'observacao_coordenador',
    nome: 'Observação:',
    funcao: 'Parecer específico e diretrizes do Coordenador de FIC / Escola',
    dica: 'Preenchido somente pelo Coordenador. Função protegida por senha',
    categoria: 'coordenacao',
    protegida: true,
    tipo: 'string'
  },
  {
    key: 'tabela_reposicao_linhas',
    legacyKey: 'linhas_reposicao',
    nome: 'Tabela Demonstrativa de Reposição',
    funcao: 'Grade com linhas de aulas repostas ou a repor',
    dica: 'Essa será implementada como uma tabela, podendo ser redimensionada (ter suas linhas desenhadas)',
    categoria: 'reposicao',
    protegida: false,
    tipo: 'array'
  },
  {
    key: 'total_horas_previstas_reposicao',
    legacyKey: 'total_horas_previstas_reposicao',
    nome: 'Total Horas Previstas para Reposição',
    funcao: 'CH prevista pela coordenação',
    dica: 'Será a soma de toda a carga horária "proposta" da nossa futura tabela, no formato HH:MM, deve somar automaticamente e poder ser alterada manualmente.',
    categoria: 'reposicao',
    protegida: false,
    tipo: 'string'
  },
  {
    key: 'total_horas_faltas_tabela',
    legacyKey: 'total_horas_faltas_tabela',
    nome: 'Total Horas/Faltas',
    funcao: 'Total de faltas nos dias registrados de reposição do aluno',
    dica: 'Soma total dos dias de registro para reposição, no mesmo formato do campo anterior',
    categoria: 'reposicao',
    protegida: false,
    tipo: 'string'
  },
  {
    key: 'total_horas_realizadas_reposicao',
    legacyKey: 'total_horas_realizadas_reposicao',
    nome: 'Total Horas Realizadas na Reposição',
    funcao: 'Total de horas efetivamente repostas pelo discente',
    dica: 'A soma de horas da coluna acima, onde o aluno efetivamente fez as reposições',
    categoria: 'reposicao',
    protegida: false,
    tipo: 'string'
  },
  {
    key: 'observacao_reposicao',
    legacyKey: 'observacao_reposicao',
    nome: 'Observação:',
    funcao: 'Preencher caso haja alguma divergência entre o planejado e o executado',
    dica: 'Campo de preenchimento livre, deverá ser divido em 3 linhas corridas de texto, começando logo a frente da palavra "Observação:"',
    categoria: 'reposicao',
    protegida: false,
    tipo: 'string'
  },
  {
    key: 'data_conclusao_reposicao',
    legacyKey: 'data_conclusao_reposicao',
    nome: 'Data de Conclusão da Reposição',
    funcao: 'Última data de reposição registrada para o discente',
    dica: 'Por padrão, insira o último dia onde o aluno realmente veio da tabela',
    categoria: 'reposicao',
    protegida: false,
    tipo: 'date'
  },
];

// ==========================================================================
// DESIGNS DE ÍCONES DE PRESENÇA E FALTA
// ==========================================================================
const COMP_ICON_DESIGNS = {
  '1': { id: '1', nome: 'Padrão 1 ( . e | )', presenca: '.', falta: '|', presencaClass: 'is-ponto', faltaClass: 'is-barra' },
  '2': { id: '2', nome: 'Design 2 ( P e F )', presenca: 'P', falta: 'F', presencaClass: 'is-p', faltaClass: 'is-f' },
  '3': { id: '3', nome: 'Design 3 ( ✓ e ✗ )', presenca: '✓', falta: '✗', presencaClass: 'is-check', faltaClass: 'is-cross' },
  '4': { id: '4', nome: 'Design 4 ( ● e ■ )', presenca: '●', falta: '■', presencaClass: 'is-circle', faltaClass: 'is-square' },
};

// ==========================================================================
// ESTADO LOCAL DA ABA DE COMPENSAÇÃO (CompState)
// ==========================================================================
const CompState = {
  /** @type {string[]} Lista de alunos cadastrados */
  alunos: [],

  /** @type {string[]} Ordem física personalizada dos alunos para a visão Diário Físico */
  ordemFisicaAlunos: [],

  /** @type {'compensacao'|'fisico'} Sub-visão do diário: Compensação (alfabética) ou Físico (ordem manual) */
  subViewDiario: 'compensacao',

  /** @type {number} Largura em pixels da coluna de discentes (redimensionável pelo docente) */
  colAlunoWidth: 200,

  /** @type {string|null} Aluno atualmente ativo para visualização das 24 variáveis */
  alunoAtivo: null,

  /** @type {'calendar'|'table'} Modo de visualização ativo (Padrão: Tabela Geral) */
  viewMode: 'table',

  /** @type {'1'|'2'|'3'|'4'} Design selecionado de ícones de Presença / Falta */
  iconDesign: '1',

  /** @type {string|null} Mês de navegação ativo (YYYY-MM) ou null para automático */
  mesNavegacao: null,

  /** @type {number|string} Quantidade de meses visíveis de uma vez (1, 2, 3, 6 ou 'todos') */
  qtdMesesExibicao: 1,

  /** @type {string|null} ISO date da coluna de data atualmente destacada/acesa na Tabela Geral */
  colunaDataDestacada: null,

  /** @type {boolean} Flag de aulas de 55 minutos (calculado automaticamente ou definido pelo toggle) */
  aula55min: false,

  /** @type {number} Duração da aula em minutos quando modo proporcional ativo (editável pelo usuário, padrão 55) */
  minutosModulo: 55,

  /** @type {boolean} Se o usuário definiu o toggle manualmente */
  aula55minManual: false,

  /** @type {{ [aluno: string]: { [isoDate: string]: number } }} Faltas em horas por aluno e dia */
  faltasPorAluno: {},

  /** @type {{ [aluno: string]: { [isoDate: string]: string } }} Observações de faltas pontuais por dia */
  observacoesPorDia: {},

  /** @type {string[]} Dias letivos ativos em ISO (aaaa-mm-dd) sincronizados da Aba 1 */
  diasLetivos: [],

  /** @type {Object[]} Array bruto de aulas ativas (activeLessons) */
  diasLetivosRaw: [],

  /** @type {Map<string, Object>} Mapa de cada aula por ISO dateKey */
  aulasMap: new Map(),

  /** @type {{ curso: string, turma: string, docente: string, chTotal: number }} Metadados da turma */
  turmaInfo: {
    curso: '',
    turma: '',
    docente: '',
    chTotal: 40,
  },

  /** @type {string|null} Código da última turma cujos alunos foram carregados */
  ultimaTurmaCarregada: null,

  /** @type {{ [turmaCodigo: string]: string[] }} Histórico de discentes por código de turma */
  alunosPorTurma: {},

  /** @type {{ [aluno: string]: { [key: string]: any } }} Valores com override manual por discente */
  overrides: {},

  /** @type {{ [key: string]: { nome: string, funcao: string, dica: string } }} Metadados editáveis das variáveis */
  variaveisConfig: {},

  /** @type {string|null} Data de teste simulada ("Hoje") em formato aaaa-mm-dd */
  dataSimuladaHoje: null,

  /** @type {number} Porcentagem limite de falta para flagar compensação (padrão: 10% de faltas / <=90% presença) */
  thresholdFaltaFlag: 10,

  /** @type {{ [aluno: string]: number }} Quantidade de horas-falta no momento em que a última ficha foi impressa */
  ultimasFaltasImpressas: {},

  /** @type {{ [aluno: string]: boolean }} Flags manuais ativadas ou desativadas pelo usuário */
  manualFlagAlunos: {},

  /** @type {{ desbloqueada: boolean, dataExtenso: string }} Área restrita */
  coordenacao: {
    desbloqueada: false,
    dataExtenso: '',
  },

  /** @type {{ [aluno: string]: { deferido: string|null, observacao: string } }} Parecer e observação específicos por discente */
  coordenacaoPorAluno: {},

  /** @type {{ [aluno: string]: boolean }} Discentes marcados como evadidos */
  evadidosPorAluno: {},

  /** @type {{ [isoDate: string]: string }} Conteúdo programático das aulas por data ISO */
  conteudoProgramaticoPorDia: {},
};

// Inicializa variaveisConfig com metadados padrão
COMP_VARIAVEIS_META.forEach(v => {
  CompState.variaveisConfig[v.key] = {
    nome: v.nome,
    funcao: v.funcao,
    dica: v.dica,
  };
});

// ==========================================================================
// SINCRONIZAÇÃO E HERANÇA DE DADOS DA ABA 1 (CRONOGRAMA)
// ==========================================================================

/**
 * Lê os dados da turma da Aba 1 (inputs do formulário e activeLessons).
 * LIMPA AUTOMATICAMENTE FALTAS ÓRFÃS quando datas de início/aulas mudam.
 */
// ==========================================================================
// PERSISTÊNCIA ISOLADA POR USUÁRIO E TURMA (STORAGE KEY GLOBAL & SYNC)
// ==========================================================================
function getCompStorageKey() {
  const user = (typeof window !== 'undefined' && window.authService?.currentUser) ? window.authService.currentUser : null;
  if (user && user.id) {
    return 'SENAI_COMP_TURMAS_DATA_' + user.id;
  }
  return 'SENAI_COMP_TURMAS_DATA';
}
if (typeof window !== 'undefined') {
  window.getCompStorageKey = getCompStorageKey;
}

function compSincronizarAbaMae() {
  // 1. Dados cadastrais da turma
  const elCurso   = document.getElementById('nomeCurso');
  const elTurma   = document.getElementById('codigoTurma');
  const elDocente = document.getElementById('docente');
  const elChTotal = document.getElementById('cargaHorariaTotal');
  const elHorasPorAula = document.getElementById('horasPorAula');
  const elAulasPorDia  = document.getElementById('aulasPorDia');
  const elHorasPorDia  = document.getElementById('horasPorDia');

  const novaTurma = elTurma ? elTurma.value.trim() : '';
  const turmaAnterior = CompState.turmaInfo.turma;
  CompState.turmaInfo.curso   = elCurso ? elCurso.value.trim() : '';
  CompState.turmaInfo.turma   = novaTurma;
  CompState.turmaInfo.docente = elDocente ? elDocente.value.trim() : '';
  CompState.turmaInfo.horasPorAula = elHorasPorAula ? elHorasPorAula.value.trim() : '01:00';
  CompState.turmaInfo.aulasPorDia  = elAulasPorDia ? (parseInt(elAulasPorDia.value, 10) || 4) : 4;
  CompState.turmaInfo.horasPorDia  = elHorasPorDia ? elHorasPorDia.value.trim() : '04:00';

  // ========================================================================
  // PERSISTÊNCIA ISOLADA POR TURMA & GERADOR DE TESTES
  // ========================================================================
  function getCompStorageKey() {
    const user = (typeof window !== 'undefined' && window.authService?.currentUser) ? window.authService.currentUser : null;
    if (user && user.id) {
      return 'SENAI_COMP_TURMAS_DATA_' + user.id;
    }
    return 'SENAI_COMP_TURMAS_DATA';
  }
  const COMP_STORAGE_KEY = getCompStorageKey();

  function carregarBancoTurmas() {
    try {
      const storageKey = getCompStorageKey();
      let bruto = localStorage.getItem(storageKey);
      if (!bruto && storageKey !== 'SENAI_COMP_TURMAS_DATA') {
        const fallback = localStorage.getItem(getCompStorageKey());
        if (fallback) {
          bruto = fallback;
          localStorage.setItem(storageKey, fallback);
        }
      }
      const banco = bruto ? JSON.parse(bruto) : {};
      // Sanitização de produção: remove dados de teste simulados que possam ter ficado em cache local
      const mockSet = new Set([
        'Gabriel Costa Silva', 'Beatriz Souza Lima', 'Lucas Fernandes Ramos',
        'Mariana Rocha Duarte', 'Thiago Martins Castro', 'Fernanda Oliveira Santos',
        'Rafael Alves Moreira', 'Camila Ribeiro Barbosa', 'Felipe Carvalho Mendes',
        'Larissa Moura Azevedo'
      ]);
      let alterado = false;
      for (const tKey in banco) {
        if (banco[tKey] && Array.isArray(banco[tKey].alunos)) {
          const soTemMock = banco[tKey].alunos.length > 0 && banco[tKey].alunos.every(a => mockSet.has(a));
          if (soTemMock) {
            banco[tKey].alunos = [];
            banco[tKey].ordemFisicaAlunos = [];
            banco[tKey].faltasPorAluno = {};
            banco[tKey].overrides = {};
            banco[tKey].observacoesPorDia = {};
            banco[tKey].manualFlagAlunos = {};
            banco[tKey].evadidosPorAluno = {};
            alterado = true;
          }
        }
      }
      if (alterado) {
        salvarBancoTurmas(banco);
      }
      return banco;
    } catch (e) {
      return {};
    }
  }

  function salvarBancoTurmas(banco) {
    try {
      localStorage.setItem(getCompStorageKey(), JSON.stringify(banco));
    } catch (e) {}
  }

  // Se houver troca de turma (ou primeira inicialização)
  if (CompState.ultimaTurmaCarregada !== novaTurma) {
    const bancoTurmas = carregarBancoTurmas();

    // 1. Salva os dados da turma que estava ativa anteriormente antes de trocar
    if (CompState.ultimaTurmaCarregada) {
      bancoTurmas[CompState.ultimaTurmaCarregada] = {
        alunos: [...CompState.alunos],
        ordemFisicaAlunos: [...(CompState.ordemFisicaAlunos || CompState.alunos)],
        subViewDiario: CompState.subViewDiario || 'compensacao',
        faltasPorAluno: { ...CompState.faltasPorAluno },
        overrides: { ...CompState.overrides },
        observacoesPorDia: { ...CompState.observacoesPorDia },
        manualFlagAlunos: { ...(CompState.manualFlagAlunos || {}) },
        evadidosPorAluno: { ...(CompState.evadidosPorAluno || {}) },
        coordenacao: { ...CompState.coordenacao },
        coordenacaoPorAluno: { ...(CompState.coordenacaoPorAluno || {}) },
        conteudoProgramaticoPorDia: { ...(CompState.conteudoProgramaticoPorDia || {}) },
        ultimasFaltasImpressas: { ...(CompState.ultimasFaltasImpressas || {}) },
        _atualizadoEm: new Date().toISOString()
      };
      salvarBancoTurmas(bancoTurmas);
      CompState.alunosPorTurma[CompState.ultimaTurmaCarregada] = [...CompState.alunos];
    }

    // 2. Carrega ou inicializa a nova turma
    if (novaTurma) {
      const savedModels = (typeof getSavedModels === 'function') ? getSavedModels() : {};
      const modelTurma = savedModels[novaTurma];

      const salvo = bancoTurmas[novaTurma];
      const hasAlunosBanco = salvo && Array.isArray(salvo.alunos) && salvo.alunos.length > 0;
      const hasAlunosModel = modelTurma && Array.isArray(modelTurma.alunos) && modelTurma.alunos.length > 0;

      if (hasAlunosBanco) {
        // Carrega do armazenamento persistente de compensação
        CompState.alunos = [...salvo.alunos];
        CompState.ordemFisicaAlunos = Array.isArray(salvo.ordemFisicaAlunos) ? [...salvo.ordemFisicaAlunos] : [...salvo.alunos];
        if (salvo.subViewDiario) CompState.subViewDiario = salvo.subViewDiario;
        CompState.faltasPorAluno = salvo.faltasPorAluno || {};
        CompState.overrides = salvo.overrides || {};
        CompState.observacoesPorDia = salvo.observacoesPorDia || {};
        CompState.manualFlagAlunos = salvo.manualFlagAlunos ? { ...salvo.manualFlagAlunos } : {};
        CompState.evadidosPorAluno = salvo.evadidosPorAluno ? { ...salvo.evadidosPorAluno } : {};
        if (salvo.coordenacao) CompState.coordenacao = { ...salvo.coordenacao };
        CompState.coordenacaoPorAluno = salvo.coordenacaoPorAluno ? { ...salvo.coordenacaoPorAluno } : {};
        CompState.conteudoProgramaticoPorDia = salvo.conteudoProgramaticoPorDia ? { ...salvo.conteudoProgramaticoPorDia } : {};
        CompState.ultimasFaltasImpressas = salvo.ultimasFaltasImpressas ? { ...salvo.ultimasFaltasImpressas } : {};
      } else if (hasAlunosModel) {
        // Carrega discentes anexados ao modelo do Cronograma (ex: vindos da nuvem Supabase)
        CompState.alunos = [...modelTurma.alunos];
        CompState.ordemFisicaAlunos = Array.isArray(modelTurma.ordemFisicaAlunos) ? [...modelTurma.ordemFisicaAlunos] : [...modelTurma.alunos];
        CompState.faltasPorAluno = modelTurma.faltasPorAluno ? { ...modelTurma.faltasPorAluno } : {};
        CompState.overrides = modelTurma.overrides ? { ...modelTurma.overrides } : {};
        CompState.observacoesPorDia = modelTurma.observacoesPorDia ? { ...modelTurma.observacoesPorDia } : {};
        CompState.manualFlagAlunos = modelTurma.manualFlagAlunos ? { ...modelTurma.manualFlagAlunos } : {};
        CompState.evadidosPorAluno = modelTurma.evadidosPorAluno ? { ...modelTurma.evadidosPorAluno } : {};
        CompState.coordenacaoPorAluno = modelTurma.coordenacaoPorAluno ? { ...modelTurma.coordenacaoPorAluno } : {};
        CompState.conteudoProgramaticoPorDia = modelTurma.conteudoProgramaticoPorDia ? { ...modelTurma.conteudoProgramaticoPorDia } : {};
      } else if (bancoTurmas['_TURMA_GERAL_'] && Array.isArray(bancoTurmas['_TURMA_GERAL_'].alunos) && bancoTurmas['_TURMA_GERAL_'].alunos.length > 0) {
        // Migra alunos cadastrados antes de preencher o código da turma
        const salvoGeral = bancoTurmas['_TURMA_GERAL_'];
        CompState.alunos = [...salvoGeral.alunos];
        CompState.ordemFisicaAlunos = Array.isArray(salvoGeral.ordemFisicaAlunos) ? [...salvoGeral.ordemFisicaAlunos] : [...salvoGeral.alunos];
        if (salvoGeral.subViewDiario) CompState.subViewDiario = salvoGeral.subViewDiario;
        CompState.faltasPorAluno = salvoGeral.faltasPorAluno || {};
        CompState.overrides = salvoGeral.overrides || {};
        CompState.observacoesPorDia = salvoGeral.observacoesPorDia || {};
        CompState.manualFlagAlunos = salvoGeral.manualFlagAlunos ? { ...salvoGeral.manualFlagAlunos } : {};
        CompState.evadidosPorAluno = salvoGeral.evadidosPorAluno ? { ...salvoGeral.evadidosPorAluno } : {};
        if (salvoGeral.coordenacao) CompState.coordenacao = { ...salvo.coordenacao };
        CompState.coordenacaoPorAluno = salvoGeral.coordenacaoPorAluno ? { ...salvoGeral.coordenacaoPorAluno } : {};
        CompState.conteudoProgramaticoPorDia = salvoGeral.conteudoProgramaticoPorDia ? { ...salvoGeral.conteudoProgramaticoPorDia } : {};
        CompState.ultimasFaltasImpressas = salvoGeral.ultimasFaltasImpressas ? { ...salvoGeral.ultimasFaltasImpressas } : {};
        delete bancoTurmas['_TURMA_GERAL_'];
      } else if (!CompState.ultimaTurmaCarregada && CompState.alunos && CompState.alunos.length > 0) {
        // Mantém alunos já digitados na tela na primeira atribuição de código de turma
        CompState.alunosPorTurma[novaTurma] = [...CompState.alunos];
      } else {
        // Inicia vazio preservando registros de outros campos se existirem
        CompState.alunos = [];
        CompState.ordemFisicaAlunos = [];
        CompState.faltasPorAluno = salvo?.faltasPorAluno || {};
        CompState.overrides = salvo?.overrides || {};
        CompState.observacoesPorDia = salvo?.observacoesPorDia || {};
        CompState.manualFlagAlunos = salvo?.manualFlagAlunos || {};
        CompState.evadidosPorAluno = salvo?.evadidosPorAluno || {};
        CompState.coordenacaoPorAluno = salvo?.coordenacaoPorAluno || {};
        CompState.conteudoProgramaticoPorDia = salvo?.conteudoProgramaticoPorDia || {};
        CompState.ultimasFaltasImpressas = salvo?.ultimasFaltasImpressas || {};
      }

      CompState.alunosPorTurma[novaTurma] = [...CompState.alunos];

      // Salva imediatamente no banco persistente
      bancoTurmas[novaTurma] = {
        alunos: [...CompState.alunos],
        ordemFisicaAlunos: [...(CompState.ordemFisicaAlunos || CompState.alunos)],
        subViewDiario: CompState.subViewDiario || 'compensacao',
        faltasPorAluno: { ...CompState.faltasPorAluno },
        overrides: { ...CompState.overrides },
        observacoesPorDia: { ...CompState.observacoesPorDia },
        manualFlagAlunos: { ...(CompState.manualFlagAlunos || {}) },
        evadidosPorAluno: { ...(CompState.evadidosPorAluno || {}) },
        coordenacao: { ...CompState.coordenacao },
        coordenacaoPorAluno: { ...(CompState.coordenacaoPorAluno || {}) },
        conteudoProgramaticoPorDia: { ...(CompState.conteudoProgramaticoPorDia || {}) },
        ultimasFaltasImpressas: { ...(CompState.ultimasFaltasImpressas || {}) },
        _atualizadoEm: new Date().toISOString()
      };
      salvarBancoTurmas(bancoTurmas);
    } else {
      CompState.alunos = [];
      CompState.ordemFisicaAlunos = [];
      CompState.faltasPorAluno = {};
      CompState.evadidosPorAluno = {};
      CompState.ultimasFaltasImpressas = {};
    }

    CompState.alunoAtivo = CompState.alunos.length > 0 ? CompState.alunos[0] : null;
    CompState.ultimaTurmaCarregada = novaTurma;
  }

  // Interpreta carga horária (pode vir como '120', '40h', '33:50', etc.)
  let chNum = 40;
  if (elChTotal && elChTotal.value) {
    const rawVal = elChTotal.value.trim().replace('h', '').replace('H', '');
    if (rawVal.includes(':')) {
      const [h, m] = rawVal.split(':').map(Number);
      chNum = (h || 0) + ((m || 0) / 60);
    } else {
      chNum = parseFloat(rawVal) || 40;
    }
  }
  CompState.turmaInfo.chTotal = chNum;

  // Atualiza badge de CH total na sidebar
  const chBadge = document.getElementById('comp-badge-ch-total');
  if (chBadge) {
    chBadge.textContent = `${CompState.turmaInfo.chTotal}h`;
  }

  // 2. Dias letivos e aulas ativas de activeLessons
  const lessons = (typeof activeLessons !== 'undefined' && Array.isArray(activeLessons))
    ? activeLessons
    : [];

  CompState.diasLetivosRaw = lessons;
  CompState.aulasMap.clear();

  // Filtra apenas dias ativos (não inativos), lendo dataKey corretamente
  const diasAtivos = [];
  for (const aula of lessons) {
    const isInactive = aula.isInactive === true;
    const dateKey = aula.dataKey || aula.dateKey;
    if (!dateKey || isInactive) continue;

    // Horas da aula
    let horas = 4;
    if (typeof aula.horas === 'number' && aula.horas > 0) {
      horas = aula.horas;
    } else if (typeof aula.minutos === 'number' && aula.minutos > 0) {
      horas = aula.minutos / 60;
    }

    CompState.aulasMap.set(dateKey, {
      dataKey: dateKey,
      horas: horas,
      minutos: aula.minutos || (horas * 60),
      horasPorAula: aula.horasPorAula || CompState.turmaInfo.horasPorAula || '01:00',
      aulasPorDia: aula.aulasPorDia || CompState.turmaInfo.aulasPorDia || 4,
      tipo: aula.tipo || 'teoria',
      diaSemanaNome: aula.diaSemanaNome || '',
      ambiente: aula.ambiente || '',
    });

    diasAtivos.push(dateKey);
  }

  CompState.diasLetivos = Array.from(new Set(diasAtivos)).sort();

  // ========================================================================
  // AUTO-DETECÇÃO DE AULAS DE 55 MINUTOS vs 1 HORA (60 min)
  // Baseada no campo explícito "Horas / Aula", eliminando qualquer ambiguidade.
  // ========================================================================
  if (!CompState.aula55minManual) {
    const haVal = CompState.turmaInfo.horasPorAula || '01:00';
    const minAula = (typeof timeToMinutes === 'function') ? timeToMinutes(haVal) : (haVal === '00:55' ? 55 : 60);

    if (minAula > 0 && minAula !== 60) {
      CompState.aula55min = true;
      CompState.minutosModulo = minAula;
    } else {
      CompState.aula55min = false;
      CompState.minutosModulo = 60;
    }
  }

  // ========================================================================
  // CORREÇÃO CRÍTICA DE SINCRONIZAÇÃO:
  // Purga faltas de datas que não são mais dias letivos válidos (ex: mudança de início)
  // ========================================================================
  const validDaysSet = new Set(CompState.diasLetivos);
  for (const aluno of Object.keys(CompState.faltasPorAluno)) {
    for (const dKey of Object.keys(CompState.faltasPorAluno[aluno])) {
      if (!validDaysSet.has(dKey)) {
        delete CompState.faltasPorAluno[aluno][dKey];
      }
    }
  }

  compAtualizarInfoDiasLetivos();
  compAtualizarBannerContextual();
}

/**
 * Atualiza o banner superior de identificação contextual ("Design Final")
 * Exibe Curso, Turma, Ano (apenas 2 dígitos após '_', caso contrário estritamente vazio sem hint),
 * Docente e Total Consolidado de Faltas da turma.
 */
function compAtualizarBannerContextual() {
  const elCurso = document.getElementById('comp-banner-curso');
  const elTurma = document.getElementById('comp-banner-turma');
  const elAno = document.getElementById('comp-banner-ano');
  const elAnoWrapper = document.getElementById('comp-banner-ano-wrapper');
  const elAnoDot = document.getElementById('comp-banner-ano-dot');
  const elDocente = document.getElementById('comp-banner-docente');
  const elHorasMinistradas = document.getElementById('comp-banner-horas-ministradas') || document.getElementById('comp-banner-total-faltas');
  const elHojeData = document.getElementById('comp-banner-hoje-data');

  const curso = CompState.turmaInfo.curso || '-';
  const turma = CompState.turmaInfo.turma || '-';
  const docente = CompState.turmaInfo.docente || '-';

  if (elCurso) elCurso.textContent = curso;
  if (elTurma) elTurma.textContent = turma;
  if (elDocente) elDocente.textContent = docente;

  // Atualiza data de Hoje dinamicamente
  const dataHojeIso = compObterDataHojeIso();
  if (elHojeData) {
    elHojeData.textContent = compIsoToDDMMAAAA(dataHojeIso);
  }

  // Extração do Ano: primeiros 2 dígitos após o '_' (ex: MPOWERBI_2503TG -> 25)
  // Caso não seja possível identificar, estritamente vazio (sem texto, sem placeholder, sem hint)
  let anoIdentificado = '';
  if (turma && turma.includes('_')) {
    const match = turma.match(/_(\d{2})/);
    if (match && match[1]) {
      anoIdentificado = match[1];
    }
  }

  if (anoIdentificado) {
    if (elAno) elAno.textContent = anoIdentificado;
    if (elAnoWrapper) elAnoWrapper.style.display = 'inline-flex';
    if (elAnoDot) elAnoDot.style.display = 'inline';
  } else {
    if (elAno) elAno.textContent = '';
    if (elAnoWrapper) elAnoWrapper.style.display = 'none';
    if (elAnoDot) elAnoDot.style.display = 'none';
  }

  // Horas Ministradas consolidada da turma até hoje (dias letivos <= hoje)
  let totalHorasMinistradas = 0;
  const diasValidos = CompState.diasLetivos || [];
  for (const d of diasValidos) {
    if (d <= dataHojeIso) {
      totalHorasMinistradas += compObterHorasAula(d);
    }
  }

  const chTotal = CompState.turmaInfo.chTotal || 0;
  if (chTotal > 0 && totalHorasMinistradas > chTotal) {
    totalHorasMinistradas = chTotal;
  }

  if (elHorasMinistradas) {
    elHorasMinistradas.textContent = totalHorasMinistradas > 0 ? compFormatarHorasDecimais(totalHorasMinistradas) : '0h00';
  }
}

/**
 * Atualiza os badges e listas de dias letivos na sidebar.
 */
function compAtualizarInfoDiasLetivos() {
  const badge = document.getElementById('comp-badge-total-dias');
  if (badge) {
    badge.textContent = `${CompState.diasLetivos.length} dias letivos ativos`;
  }

  // Sincroniza o toggle de minutos de aula e o input numérico
  const toggle55 = document.getElementById('comp-sidebar-toggle-55min');
  const inputMinutos = document.getElementById('comp-input-minutos-modulo');
  if (toggle55) {
    toggle55.checked = CompState.aula55min;
  }
  if (inputMinutos) {
    inputMinutos.value = String(CompState.minutosModulo || 55);
  }

  const list = document.getElementById('comp-diasletivos-list');
  if (!list) return;

  if (CompState.diasLetivos.length === 0) {
    list.innerHTML = '<span style="font-size:10.5px;color:var(--text-secondary);font-style:italic;">Nenhum dia letivo disponível. Configure o cronograma na aba anterior.</span>';
    return;
  }

  const tags = CompState.diasLetivos.map(dKey => {
    const hNum = compObterHorasAula(dKey);
    const horasStr = `${hNum}h`;
    const label = compIsoToDDMM(dKey);
    return `<span class="comp-dia-tag" title="${dKey} • ${horasStr}">${label} <small style="opacity:0.8;font-size:8.5px;">(${horasStr})</small></span>`;
  }).join('');

  list.innerHTML = tags;
}

// ==========================================================================
// MOTOR DE CÁLCULO DAS 24 VARIÁVEIS (AUTO-FILL & REGRAS DE NEGÓCIO)
/**
 * Retorna a duração em horas decimais de 1 aula individual (para cálculo de 1 falta).
 * Respeita a duração real da aula configurada na turma (ex: 55min -> 55/60 = 0.9167h; 60min -> 1.0h).
 * @param {string} dateKey
 * @returns {number}
 */
function compObterDuracaoAulaIndividual(dateKey) {
  const aula = CompState.aulasMap.get(dateKey);
  if (CompState.aula55min) {
    const minutos = CompState.minutosModulo || 55;
    return minutos / 60;
  }
  const haVal = (aula && aula.horasPorAula) ? aula.horasPorAula : (CompState.turmaInfo.horasPorAula || '01:00');
  const minAula = (typeof timeToMinutes === 'function') ? timeToMinutes(haVal) : (haVal === '00:55' ? 55 : 60);
  return (minAula > 0) ? (minAula / 60) : 1.0;
}

/**
 * Retorna a carga horária TOTAL de uma aula específica (dateKey) em horas decimais.
 * @param {string} dateKey
 * @returns {number}
 */
function compObterHorasAula(dateKey) {
  const aula = CompState.aulasMap.get(dateKey);
  if (!aula) return 4;

  if (typeof aula.minutos === 'number' && aula.minutos > 0) {
    // Se o usuário ativou manualmente o toggle de 55min e a aula original foi configurada como 60min
    if (CompState.aula55min && CompState.aula55minManual) {
      const minAulaOriginal = (aula.horasPorAula && typeof timeToMinutes === 'function')
        ? timeToMinutes(aula.horasPorAula)
        : 60;
      if (minAulaOriginal === 60) {
        const minModulo = CompState.minutosModulo || 55;
        const qtdAulas = aula.aulasPorDia || 4;
        return Math.round(((qtdAulas * minModulo) / 60) * 100) / 100;
      }
    }
    return Math.round((aula.minutos / 60) * 100) / 100;
  }

  return Math.round((aula.horas || 4) * 100) / 100;
}

/**
 * Obtém a data de referência "Hoje" (ISO aaaa-mm-dd), respeitando a data de teste simulada se configurada.
 */
function compObterDataHojeIso() {
  if (CompState.dataSimuladaHoje) {
    return CompState.dataSimuladaHoje;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Exibe um toast flutuante no canto da tela para mock de impressão ou avisos.
 * @param {string} titulo
 * @param {string} mensagem
 * @param {'success'|'warning'|'info'} [tipo='success']
 */
function compMostrarToast(titulo, mensagem, tipo = 'success') {
  const container = document.getElementById('comp-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `comp-toast ${tipo === 'warning' ? 'toast-warning' : ''}`;
  const icon = tipo === 'warning' ? '⚠️' : '🖨️';

  toast.innerHTML = `
    <div class="comp-toast-icon">${icon}</div>
    <div class="comp-toast-content">
      <div class="comp-toast-title">${compEscapeHTML(titulo)}</div>
      <div class="comp-toast-body">${compEscapeHTML(mensagem)}</div>
    </div>
  `;

  container.appendChild(toast);

  // Auto-dismiss após 3.5 segundos
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}

/**
 * Calcula as faltas acumuladas de um aluno até a data de referência "Hoje" simulada.
 * Apenas faltas de aulas ocorridas até 'hoje' são computadas.
 * @param {string} aluno
 * @returns {number}
 */
function compObterFaltasAteHoje(aluno) {
  if (!aluno || !CompState.faltasPorAluno[aluno]) return 0;
  const hojeIso = compObterDataHojeIso();
  const faltas = CompState.faltasPorAluno[aluno];
  let tot = 0;
  for (const d of CompState.diasLetivos) {
    if (d <= hojeIso) {
      tot += Number(faltas[d]) || 0;
    }
  }
  return tot;
}

/**
 * Calcula a frequência acumulada de um aluno até hoje em relação à CH total da disciplina.
 * @param {string} aluno
 * @param {number} [chTotal]
 * @returns {{ faltasAteHoje: number, freqPercent: number, pctFaltas: number }}
 */
function compCalcularFrequenciaAteHoje(aluno, chTotal) {
  const ch = chTotal || CompState.turmaInfo.chTotal || 40;
  const faltasAteHoje = compObterFaltasAteHoje(aluno);
  const freqPercent = Math.max(0, Math.floor(((ch - faltasAteHoje) / ch) * 100));
  const pctFaltas = Math.min(100, Math.round((faltasAteHoje / ch) * 100));
  return { faltasAteHoje, freqPercent, pctFaltas };
}

/**
 * Determina o status da Flag de Atenção do aluno:
 * - 'danger' (⚠️ Triângulo Vermelho): Faltas >= 25%.
 * - 'warning' (❗ Ponto de Exclamação Amarelo): Faltas >= 10% OU 2 faltas consecutivas em dias de aula.
 * - null: nenhuma flag ativa.
 *
 * Desliga automaticamente se as faltas atuais já tiverem sido impressas (a menos que o usuário tenha ativado manualmente).
 *
 * @param {string} aluno
 * @param {number} [chTotal]
 * @returns {{ ativa: boolean, tipo: 'warning'|'danger'|null, motivo: string }}
 */
function compObterStatusFlagAluno(aluno, chTotal) {
  if (!aluno) return { ativa: false, tipo: null, motivo: '' };

  const manualState = CompState.manualFlagAlunos[aluno];
  // Se o usuário explicitamente desligou a flag
  if (manualState === false) {
    return { ativa: false, tipo: null, motivo: '' };
  }

  const { faltasAteHoje, pctFaltas } = compCalcularFrequenciaAteHoje(aluno, chTotal);
  const ultimasFaltas = CompState.ultimasFaltasImpressas[aluno] || 0;

  // Se ativado manualmente pelo clique
  if (manualState === true) {
    const tipo = pctFaltas >= 25 ? 'danger' : 'warning';
    return { ativa: true, tipo, motivo: 'Flag ativada manualmente pelo usuário' };
  }

  // Se não há faltas ou já foram todas impressas na última ficha
  if (faltasAteHoje === 0 || faltasAteHoje <= ultimasFaltas) {
    return { ativa: false, tipo: null, motivo: '' };
  }

  // 1. Regra de 25% ou mais -> Triângulo Vermelho de Perigo
  if (pctFaltas >= 25) {
    return {
      ativa: true,
      tipo: 'danger',
      motivo: `Excesso crítico de faltas (${pctFaltas}% ≥ 25% da carga). Emissão urgente necessária!`
    };
  }

  // 2. Regra de 10% a 24% -> Ponto de Exclamação Amarelo
  if (pctFaltas >= 10) {
    return {
      ativa: true,
      tipo: 'warning',
      motivo: `Limite de 10% de faltas atingido (${pctFaltas}%). Termo de ciência pendente!`
    };
  }

  // 3. Regra de 2 faltas em dias seguidos (mesmo com < 10%) -> Ponto de Exclamação Amarelo
  const faltasObj = CompState.faltasPorAluno[aluno] || {};
  const dias = CompState.diasLetivos || [];
  const dataHojeIso = compObterDataHojeIso();
  const diasAteHoje = dias.filter(d => d <= dataHojeIso);

  let faltasSeguidas = 0;
  for (let i = 0; i < diasAteHoje.length; i++) {
    const val = Number(faltasObj[diasAteHoje[i]]) || 0;
    if (val > 0) {
      faltasSeguidas++;
      if (faltasSeguidas >= 2) {
        return {
          ativa: true,
          tipo: 'warning',
          motivo: 'Duas ou mais faltas em aulas consecutivas. Termo de ciência pendente!'
        };
      }
    } else {
      faltasSeguidas = 0;
    }
  }

  return { ativa: false, tipo: null, motivo: '' };
}

/**
 * Permite ao usuário ligar ou desligar manualmente a flag de estado do aluno
 */
function compToggleFlagManual(aluno, event) {
  if (event) event.stopPropagation();
  const current = compObterStatusFlagAluno(aluno);
  if (current.ativa) {
    CompState.manualFlagAlunos[aluno] = false;
    compMostrarToast('Flag Desativada', `Flag do aluno ${aluno} foi desligada.`, 'info');
  } else {
    CompState.manualFlagAlunos[aluno] = true;
    compMostrarToast('Flag Ativada', `Flag do aluno ${aluno} foi ativada e está visível.`, 'info');
  }
  compSalvarTurmaAtualStorage();
  compRenderizarDiario();
}

/**
 * Gera o componente visual da Flag do aluno:
 * - Aumentada em 25% (18px x 18px)
 * - Sem efeito piscante/animação
 * - Atenção (!): Amarela dentro de círculo preenchido
 * - Cuidado (triângulo): Vermelha dentro de círculo preenchido
 */
function compGerarHtmlFlagIcon(aluno, chTotal) {
  const flagInfo = compObterStatusFlagAluno(aluno, chTotal);
  if (!flagInfo.ativa) {
    return `<span class="comp-flag-placeholder" onclick="compToggleFlagManual('${compEscapeAttr(aluno)}', event)" title="Sem pendência • Clique para levantar flag manualmente">⚐</span>`;
  }
  if (flagInfo.tipo === 'danger') {
    return `<span class="comp-flag-icon comp-flag-danger" onclick="compToggleFlagManual('${compEscapeAttr(aluno)}', event)" title="${compEscapeAttr(flagInfo.motivo)} • Clique para alternar flag">
      <span class="stitch-icon-warning"><i class="fa-solid fa-triangle-exclamation"></i></span>
    </span>`;
  }
  return `<span class="comp-flag-icon comp-flag-warning" onclick="compToggleFlagManual('${compEscapeAttr(aluno)}', event)" title="${compEscapeAttr(flagInfo.motivo)} • Clique para alternar flag">
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style="display:block;"><circle cx="10" cy="10" r="9.5" fill="#eab308"/><text x="10" y="14.5" text-anchor="middle" fill="#000000" font-size="13" font-weight="900" font-family="Inter, system-ui, sans-serif">!</text></svg>
  </span>`;
}

/**
 * Verifica se um aluno precisa de compensação (usado para filtros de impressão de pendentes).
 * Alunos evadidos não entram nas listas de pendências para impressão.
 */
function compAlunoPrecisaCompensacao(aluno, chTotal) {
  if (CompState.evadidosPorAluno && CompState.evadidosPorAluno[aluno]) {
    return false;
  }
  return compObterStatusFlagAluno(aluno, chTotal).ativa;
}

// Armazena dados editados temporariamente da tabela de reposição por aluno
const _compReposicaoEdicoes = {};
let _compAlunoEmEdicaoReposicao = null;

/**
 * Calcula o total de horas de aulas dadas até a data simulada/atual (não ultrapassando a CH total)
 */
function compCalcularHorasAulasDadas() {
  const chTotal = CompState.turmaInfo.chTotal || 40;
  const hojeIso = compObterDataHojeIso();
  let aulasDadasHoras = 0;

  for (const dKey of (CompState.diasLetivos || [])) {
    const h = compObterHorasAula(dKey);
    if (dKey <= hojeIso) {
      aulasDadasHoras += h;
    }
  }

  if (aulasDadasHoras > chTotal) {
    aulasDadasHoras = chTotal;
  }
  return Math.round(aulasDadasHoras * 100) / 100;
}

/**
 * Formata horas para string no formato "HhMM" (ex: 36 -> "36h00", 1.75 -> "1h45", 0.916 -> "0h55")
 * @param {number|string} horasDecimais
 * @returns {string}
 */
function compFormatarHorasDecimais(horasDecimais) {
  if (horasDecimais === undefined || horasDecimais === null || horasDecimais === '') return '';
  if (typeof horasDecimais === 'string') {
    const s = horasDecimais.trim();
    if (!s) return '';
    if (/^\d+h\d{2}$/i.test(s)) return s;
    const mColon = s.match(/^(\d+):(\d{1,2})h?$/i);
    if (mColon) {
      return `${mColon[1]}h${mColon[2].padStart(2, '0')}`;
    }
    const mH = s.match(/^(\d+)h(\d{1,2})?$/i);
    if (mH) {
      const min = mH[2] ? mH[2].padStart(2, '0') : '00';
      return `${mH[1]}h${min}`;
    }
  }

  const num = Number(horasDecimais);
  if (isNaN(num)) return String(horasDecimais);

  const totalMin = Math.round(num * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Retorna as linhas da tabela de reposição para um aluno.
 * Por padrão, retorna vazio [] para que todos os campos venham vazios para impressão.
 * Somente retorna linhas se o usuário tiver preenchido/configurado no popover/modal.
 */
function compObterLinhasReposicaoAluno(aluno) {
  if (_compReposicaoEdicoes[aluno] && Array.isArray(_compReposicaoEdicoes[aluno])) {
    return _compReposicaoEdicoes[aluno];
  }
  return [];
}

/**
 * Abre o popover/modal de conferência e edição dinâmica da tabela de reposição antes de imprimir.
 */
function compAbrirModalEdicaoReposicao(aluno) {
  const al = aluno || CompState.alunoAtivo;
  if (!al) {
    compMostrarToast('Nenhum Aluno Selecionado', 'Selecione um discente para imprimir.', 'warning');
    return;
  }

  _compAlunoEmEdicaoReposicao = al;
  const title = document.getElementById('reposicao-modal-title');
  const subtitle = document.getElementById('reposicao-modal-subtitle');
  if (title) {
    title.textContent = `Configurar Reposição & Impressão • ${al}`;
  }
  if (subtitle) {
    subtitle.textContent = `Discente: ${al} • Por padrão os campos saem vazios para impressão`;
  }

  if (!_compReposicaoEdicoes[al]) {
    _compReposicaoEdicoes[al] = [];
  }

  compRenderizarLinhasModalReposicao();
  compAtualizarSecaoCoordModalReposicao();

  const modal = document.getElementById('comp-modal-reposicao-edit');
  if (modal) modal.style.display = 'flex';
}

function compFecharModalEdicaoReposicao() {
  const modal = document.getElementById('comp-modal-reposicao-edit');
  if (modal) modal.style.display = 'none';
  _compAlunoEmEdicaoReposicao = null;
}

function compRenderizarLinhasModalReposicao() {
  const al = _compAlunoEmEdicaoReposicao;
  if (!al) return;

  const tbody = document.getElementById('comp-modal-reposicao-tbody');
  if (!tbody) return;

  const linhas = _compReposicaoEdicoes[al] || [];
  tbody.innerHTML = '';

  if (linhas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center;padding:22px 14px;color:var(--text-secondary);">
          <div style="font-weight:600;margin-bottom:4px;">Nenhum campo preenchido (saída vazia por padrão na impressão).</div>
          <div style="font-size:11px;opacity:0.85;">Clique em <strong>+ Adicionar Linha</strong> para digitar manualmente ou <strong>⚡ Carregar Faltas Registradas</strong> para puxar as faltas do diário.</div>
        </td>
      </tr>`;
  } else {
    linhas.forEach((linha, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align:center;font-weight:bold;color:var(--text-secondary);">${idx + 1}</td>
        <td>
          <input type="text" class="input-control" value="${compEscapeAttr(linha.dataPrevista || '')}" style="width:100%;font-size:11px;padding:3px 6px;text-align:center;" placeholder="DD/MM/AAAA" oninput="compAtualizarLinhaReposicao(${idx}, 'dataPrevista', this.value)">
        </td>
        <td>
          <input type="text" class="input-control" value="${compEscapeAttr(linha.chPrevista || '')}" style="width:100%;font-size:11px;padding:3px 4px;text-align:center;" placeholder="4h00" oninput="compAtualizarLinhaReposicao(${idx}, 'chPrevista', this.value)">
        </td>
        <td>
          <input type="text" id="comp-input-data-falta-${idx}" class="input-control" value="${compEscapeAttr(linha.dataFalta || '')}" style="width:100%;font-size:11px;padding:3px 6px;text-align:center;cursor:pointer;" placeholder="DD/MM/AAAA" onclick="compAbrirDropdownFaltas(${idx}, this, event)" onfocus="compAbrirDropdownFaltas(${idx}, this, event)" oninput="compAtualizarLinhaReposicao(${idx}, 'dataFalta', this.value)" data-dropdown-falta-trigger="true">
        </td>
        <td>
          <input type="text" id="comp-input-ch-falta-${idx}" class="input-control" value="${compEscapeAttr(linha.chFalta || '')}" style="width:100%;font-size:11px;padding:3px 4px;text-align:center;" placeholder="4h00" oninput="compAtualizarLinhaReposicao(${idx}, 'chFalta', this.value)">
        </td>
        <td>
          <input type="text" class="input-control" value="${compEscapeAttr(linha.dataRealizada || '')}" style="width:100%;font-size:11px;padding:3px 6px;text-align:center;" placeholder="DD/MM/AAAA" oninput="compAtualizarLinhaReposicao(${idx}, 'dataRealizada', this.value)">
        </td>
        <td>
          <input type="text" class="input-control" value="${compEscapeAttr(linha.chRealizada || '')}" style="width:100%;font-size:11px;padding:3px 4px;text-align:center;" placeholder="4h00" oninput="compAtualizarLinhaReposicao(${idx}, 'chRealizada', this.value)">
        </td>
        <td>
          <input type="text" id="comp-input-conteudo-${idx}" class="input-control${(linha.conteudo && linha.conteudo.length > 60) ? ' is-overflow' : ''}" value="${compEscapeAttr(linha.conteudo || '')}" style="width:100%;font-size:11px;padding:3px 6px;" placeholder="Conteúdo programático reposto..." oninput="compAtualizarLinhaReposicao(${idx}, 'conteudo', this.value, this)" title="${(linha.conteudo && linha.conteudo.length > 60) ? '⚠️ Texto excede a largura da coluna da tabela (limite ~60 caracteres). O excedente será truncado na impressão oficial.' : 'Conteúdo programático reposto'}">
        </td>
        <td style="text-align:center;">
          <button type="button" class="comp-btn-remove-aluno" onclick="compRemoverLinhaReposicao(${idx})" title="Remover linha">✕</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  compAtualizarTotaisModalReposicao();
}

function compAtualizarTotaisModalReposicao() {
  const al = _compAlunoEmEdicaoReposicao;
  const linhas = (al && _compReposicaoEdicoes[al]) ? _compReposicaoEdicoes[al] : [];
  const elFaltas = document.getElementById('comp-modal-reposicao-total-faltas');
  const elPrevisto = document.getElementById('comp-modal-reposicao-total-previsto');
  const elRealizado = document.getElementById('comp-modal-reposicao-total-realizado');

  const prevStr = compCalcularSomaHoras(linhas.map(l => l.chPrevista));
  const faltasStr = compCalcularSomaHoras(linhas.map(l => l.chFalta));
  const realStr = compCalcularSomaHoras(linhas.map(l => l.chRealizada));

  if (elPrevisto) elPrevisto.textContent = prevStr || '0h00';
  if (elFaltas) elFaltas.textContent = faltasStr || '0h00';
  if (elRealizado) elRealizado.textContent = realStr || '0h00';
}

function compAtualizarLinhaReposicao(idx, campo, valor, el) {
  const al = _compAlunoEmEdicaoReposicao;
  if (!al || !_compReposicaoEdicoes[al] || !_compReposicaoEdicoes[al][idx]) return;
  _compReposicaoEdicoes[al][idx][campo] = valor;

  if (campo === 'conteudo' && el) {
    if (valor && valor.length > 60) {
      el.classList.add('is-overflow');
      el.title = '⚠️ Texto excede a largura da coluna da tabela (limite ~60 caracteres). O excedente será truncado na impressão oficial.';
    } else {
      el.classList.remove('is-overflow');
      el.title = 'Conteúdo programático reposto';
    }
  }

  compAtualizarTotaisModalReposicao();
}

function compRemoverLinhaReposicao(idx) {
  const al = _compAlunoEmEdicaoReposicao;
  if (!al || !_compReposicaoEdicoes[al]) return;
  _compReposicaoEdicoes[al].splice(idx, 1);
  compRenderizarLinhasModalReposicao();
}

function compAdicionarLinhaReposicaoManual() {
  const al = _compAlunoEmEdicaoReposicao;
  if (!al) return;
  if (!_compReposicaoEdicoes[al]) _compReposicaoEdicoes[al] = [];
  _compReposicaoEdicoes[al].push({
    dataPrevista: '',
    chPrevista: '',
    dataFalta: '',
    chFalta: '',
    dataRealizada: '',
    chRealizada: '',
    conteudo: ''
  });
  compRenderizarLinhasModalReposicao();
}

function compCarregarFaltasRegistradasModal() {
  const al = _compAlunoEmEdicaoReposicao;
  if (!al) return;

  const faltasObj = CompState.faltasPorAluno[al] || {};
  const dataHojeIso = compObterDataHojeIso();
  const diasComFalta = (CompState.diasLetivos || [])
    .filter(d => d <= dataHojeIso && Number(faltasObj[d]) > 0);

  if (diasComFalta.length === 0) {
    compMostrarToast('Sem Faltas Registradas', `Nenhuma ausência computada para ${al} até hoje.`, 'info');
    return;
  }

  const linhas = [];
  diasComFalta.forEach(isoDate => {
    const chFalta = Number(faltasObj[isoDate]) || 0;
    const chStr = compFormatarHorasDecimais(chFalta);
    const conteudoAula = (CompState.conteudoProgramaticoPorDia && CompState.conteudoProgramaticoPorDia[isoDate]) || '';
    linhas.push({
      dataPrevista: '',
      chPrevista: chStr,
      dataFalta: compIsoToDDMMAAAA(isoDate),
      chFalta: chStr,
      dataRealizada: '',
      chRealizada: '',
      conteudo: conteudoAula
    });
  });

  _compReposicaoEdicoes[al] = linhas;
  compRenderizarLinhasModalReposicao();
  compMostrarToast('Faltas Carregadas', `${linhas.length} ausência(s) importada(s) do diário. Preencha as datas e o conteúdo.`, 'success');
}

// ==========================================================================
// DROPDOWN DE SELEÇÃO DINÂMICA DE DATAS DE FALTA DO DISCENTE
// ==========================================================================
let _compDropdownFaltaAtivaIndex = null;

function compAbrirDropdownFaltas(idx, inputEl, evt) {
  if (evt) evt.stopPropagation();
  _compDropdownFaltaAtivaIndex = idx;
  const dropdown = document.getElementById('comp-dropdown-faltas-dias');
  const listEl = document.getElementById('comp-dropdown-faltas-list');
  if (!dropdown || !listEl) return;

  const al = _compAlunoEmEdicaoReposicao;
  if (!al) return;

  const faltasObj = CompState.faltasPorAluno[al] || {};
  const todasDatas = Array.from(new Set([...(CompState.diasLetivos || []), ...Object.keys(faltasObj)]));
  todasDatas.sort();

  const diasComFalta = todasDatas.filter(d => Number(faltasObj[d]) > 0);

  if (diasComFalta.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 12px 10px; text-align: center; color: var(--text-secondary); font-size: 11px;">
        Nenhuma falta registrada para <strong>${compEscapeHTML(al)}</strong> no diário de classe.
      </div>
    `;
  } else {
    listEl.innerHTML = '';
    diasComFalta.forEach(isoDate => {
      const horas = Number(faltasObj[isoDate]) || 0;
      const horasStr = compFormatarHorasDecimais(horas);
      const dataBr = compIsoToDDMMAAAA(isoDate);
      const diaSem = compObterDiaSemanaAbrev(isoDate);
      const conteudo = (CompState.conteudoProgramaticoPorDia && CompState.conteudoProgramaticoPorDia[isoDate]) || '';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'comp-faltas-dropdown-item';
      btn.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 2px;">
          <strong style="color: var(--accent-active); font-size: 11.5px;">${dataBr} <span style="font-weight: normal; color: var(--text-secondary);">(${diaSem})</span></strong>
          <span style="background: rgba(220, 50, 47, 0.12); color: #dc322f; font-weight: 700; font-size: 10.5px; padding: 1px 6px; border-radius: 4px;">${horasStr} falta</span>
        </div>
        <div style="font-size: 10.5px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px;">
          ${conteudo ? compEscapeHTML(conteudo) : '<span style="font-style: italic; opacity: 0.65;">(Sem conteúdo cadastrado)</span>'}
        </div>
      `;
      btn.onclick = (e) => {
        e.stopPropagation();
        compSelecionarFaltaDropdown(idx, isoDate, horasStr);
      };
      listEl.appendChild(btn);
    });
  }

  // Posicionamento flutuante fixo ancorado no input
  const rect = inputEl.getBoundingClientRect();
  dropdown.style.display = 'flex';

  const dropdownWidth = 290;
  let left = rect.left;
  if (left + dropdownWidth > window.innerWidth - 12) {
    left = window.innerWidth - dropdownWidth - 12;
  }
  if (left < 10) left = 10;
  dropdown.style.left = `${left}px`;

  const dropdownHeight = 250;
  const spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
    dropdown.style.top = `${rect.top - dropdownHeight - 6}px`;
  } else {
    dropdown.style.top = `${rect.bottom + 4}px`;
  }
}

function compFecharDropdownFaltas() {
  const dropdown = document.getElementById('comp-dropdown-faltas-dias');
  if (dropdown) dropdown.style.display = 'none';
  _compDropdownFaltaAtivaIndex = null;
}

function compSelecionarFaltaDropdown(idx, isoDate, horasStr) {
  const al = _compAlunoEmEdicaoReposicao;
  if (!al || !_compReposicaoEdicoes[al] || !_compReposicaoEdicoes[al][idx]) return;
  const linha = _compReposicaoEdicoes[al][idx];
  linha.dataFalta = compIsoToDDMMAAAA(isoDate);
  linha.chFalta = horasStr;
  if (!linha.chPrevista) {
    linha.chPrevista = horasStr;
  }
  const conteudoCadastrado = (CompState.conteudoProgramaticoPorDia && CompState.conteudoProgramaticoPorDia[isoDate]) || '';
  if (conteudoCadastrado) {
    linha.conteudo = conteudoCadastrado;
  }
  compFecharDropdownFaltas();
  compRenderizarLinhasModalReposicao();
}

// ==========================================================================
// MODAL / POPOVER DE PLANO DE CONTEÚDO PROGRAMÁTICO DAS AULAS
// ==========================================================================

let compConteudoModoAtual = 'ambas'; // 'ambas' | 'aulas' | 'lote'

function compAlternarAbaConteudo(modo) {
  compConteudoModoAtual = modo || 'ambas';
  const tabAulas = document.getElementById('comp-conteudo-tab-btn-aulas');
  const tabLote = document.getElementById('comp-conteudo-tab-btn-lote');
  const tabAmbas = document.getElementById('comp-conteudo-tab-btn-ambas');
  const drawerLote = document.getElementById('comp-drawer-lote');
  const drawerAulas = document.getElementById('comp-drawer-aulas');
  const bodyLote = document.getElementById('comp-drawer-lote-body');
  const bodyAulas = document.getElementById('comp-drawer-aulas-body');
  const iconLote = document.getElementById('comp-drawer-lote-icon');
  const iconAulas = document.getElementById('comp-drawer-aulas-icon');

  const activeClasses = ['bg-[#277BC0]', 'text-white', 'shadow-xs'];
  const inactiveClasses = ['bg-[#EAE2CE]', 'text-[#554332]', 'border', 'border-[#DDD3BD]'];

  const aplicarEstiloTab = (tab, ativo) => {
    if (!tab) return;
    if (ativo) {
      tab.classList.remove(...inactiveClasses);
      tab.classList.add(...activeClasses);
    } else {
      tab.classList.remove(...activeClasses);
      tab.classList.add(...inactiveClasses);
    }
  };

  aplicarEstiloTab(tabAmbas, modo === 'ambas');
  aplicarEstiloTab(tabAulas, modo === 'aulas');
  aplicarEstiloTab(tabLote, modo === 'lote');

  if (modo === 'aulas') {
    if (drawerLote) drawerLote.style.display = 'none';
    if (drawerAulas) {
      drawerAulas.style.display = 'block';
      drawerAulas.classList.remove('is-collapsed');
      if (bodyAulas) bodyAulas.style.display = 'block';
      if (iconAulas) iconAulas.style.transform = '';
    }
  } else if (modo === 'lote') {
    if (drawerLote) {
      drawerLote.style.display = 'block';
      drawerLote.classList.remove('is-collapsed');
      if (bodyLote) bodyLote.style.display = 'block';
      if (iconLote) iconLote.style.transform = '';
    }
    if (drawerAulas) drawerAulas.style.display = 'none';
  } else {
    // 'ambas'
    if (drawerLote) {
      drawerLote.style.display = 'block';
      drawerLote.classList.remove('is-collapsed');
      if (bodyLote) bodyLote.style.display = 'block';
      if (iconLote) iconLote.style.transform = '';
    }
    if (drawerAulas) {
      drawerAulas.style.display = 'block';
      drawerAulas.classList.remove('is-collapsed');
      if (bodyAulas) bodyAulas.style.display = 'block';
      if (iconAulas) iconAulas.style.transform = '';
    }
  }

  compAtualizarBotoesDrawerHeader();
}

function compToggleDrawerLote(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const drawerLote = document.getElementById('comp-drawer-lote');
  const bodyLote = document.getElementById('comp-drawer-lote-body');
  const iconLote = document.getElementById('comp-drawer-lote-icon');
  if (!drawerLote) return;
  drawerLote.classList.toggle('is-collapsed');
  const isCol = drawerLote.classList.contains('is-collapsed');
  if (bodyLote) bodyLote.style.display = isCol ? 'none' : 'block';
  if (iconLote) iconLote.style.transform = isCol ? 'rotate(-90deg)' : '';
  compAtualizarBotoesDrawerHeader();
}

function compToggleDrawerAulas(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const drawerAulas = document.getElementById('comp-drawer-aulas');
  const bodyAulas = document.getElementById('comp-drawer-aulas-body');
  const iconAulas = document.getElementById('comp-drawer-aulas-icon');
  if (!drawerAulas) return;
  drawerAulas.classList.toggle('is-collapsed');
  const isCol = drawerAulas.classList.contains('is-collapsed');
  if (bodyAulas) bodyAulas.style.display = isCol ? 'none' : 'block';
  if (iconAulas) iconAulas.style.transform = isCol ? 'rotate(-90deg)' : '';
  compAtualizarBotoesDrawerHeader();
}

function compAtualizarBotoesDrawerHeader() {
  const drawerLote = document.getElementById('comp-drawer-lote');
  const drawerAulas = document.getElementById('comp-drawer-aulas');
  const btnLote = document.getElementById('comp-drawer-lote-toggle-btn');
  const btnAulas = document.getElementById('comp-drawer-aulas-toggle-btn');

  if (drawerLote && btnLote) {
    const isCol = drawerLote.classList.contains('is-collapsed');
    btnLote.textContent = isCol ? 'Descer / Expandir' : 'Subir / Recolher';
  }
  if (drawerAulas && btnAulas) {
    const isCol = drawerAulas.classList.contains('is-collapsed');
    btnAulas.textContent = isCol ? 'Descer / Expandir' : 'Subir / Recolher';
  }
}

function compAbrirModalConteudoProgramatico() {
  const modal = document.getElementById('comp-modal-conteudo-programatico');
  if (!modal) return;
  compRenderizarListaConteudoProgramatico();
  compAlternarAbaConteudo(compConteudoModoAtual || 'ambas');
  modal.style.display = 'flex';
}

function compFecharModalConteudoProgramatico() {
  const modal = document.getElementById('comp-modal-conteudo-programatico');
  if (modal) modal.style.display = 'none';
}

function compRenderizarListaConteudoProgramatico() {
  const tbody = document.getElementById('comp-modal-conteudo-tbody');
  const countEl = document.getElementById('comp-conteudo-total-aulas-count');
  const badgeTotal = document.getElementById('comp-conteudo-badge-total-aulas');
  if (!tbody) return;

  const dias = CompState.diasLetivos || [];
  if (countEl) countEl.textContent = String(dias.length);
  if (badgeTotal) badgeTotal.textContent = String(dias.length);

  tbody.innerHTML = '';
  if (dias.length === 0) {
    tbody.innerHTML = `
      <div style="padding: 24px; text-align: center; font-size: 12px; color: #756653;">
        Nenhum dia letivo encontrado no cronograma. Cadastre as aulas na Aba 1.
      </div>
    `;
    return;
  }

  const conteudos = CompState.conteudoProgramaticoPorDia || {};

  dias.forEach((isoDate, idx) => {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-3 items-center px-2 py-1 bg-white/40 rounded-lg hover:bg-white/80 transition-all';
    const dataBr = compIsoToDDMMAAAA(isoDate);
    const diaSem = compObterDiaSemanaAbrev(isoDate);
    const val = conteudos[isoDate] || '';

    row.innerHTML = `
      <div class="col-span-3">
        <div class="text-xs font-bold text-[#233544]">Aula ${idx + 1}</div>
        <div class="text-[11px] text-[#716353]">${dataBr} (${diaSem})</div>
      </div>
      <div class="col-span-9">
        <input class="w-full text-xs rounded-lg border border-[#D9CDB8] bg-[#FCFAF5] py-2 px-3 text-[#33251A] placeholder-[#A49784] focus:border-[#9A7000] focus:ring-1 focus:ring-[#9A7000] outline-none transition-all" placeholder="Ex: Metrologia e leitura de paquímetro..." type="text" value="${compEscapeAttr(val)}" oninput="compAtualizarConteudoDia('${isoDate}', this.value)">
      </div>
    `;
    tbody.appendChild(row);
  });
}

function compAtualizarConteudoDia(isoDate, valor) {
  if (!CompState.conteudoProgramaticoPorDia) {
    CompState.conteudoProgramaticoPorDia = {};
  }
  CompState.conteudoProgramaticoPorDia[isoDate] = valor;
  compSalvarTurmaAtualStorage();
}

function compDistribuirConteudoLote() {
  const inputEl = document.getElementById('comp-conteudo-lote-input');
  const alertaEl = document.getElementById('comp-conteudo-lote-alerta');
  if (!inputEl) return;
  const texto = inputEl.value.trim();
  if (!texto) {
    if (alertaEl) {
      alertaEl.style.display = 'block';
      alertaEl.style.background = 'rgba(239, 68, 68, 0.15)';
      alertaEl.style.color = '#ef4444';
      alertaEl.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      alertaEl.textContent = 'Cole ou digite o texto com conteúdos separados por ":::".';
    }
    return;
  }

  const dias = CompState.diasLetivos || [];
  if (dias.length === 0) {
    if (alertaEl) {
      alertaEl.style.display = 'block';
      alertaEl.style.background = 'rgba(239, 68, 68, 0.15)';
      alertaEl.style.color = '#ef4444';
      alertaEl.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      alertaEl.textContent = 'Nenhum dia letivo encontrado no cronograma.';
    }
    return;
  }

  // Separa por ":::"
  const partes = texto.split(':::').map(p => p.trim()).filter(p => p.length > 0);
  if (partes.length === 0) return;

  if (!CompState.conteudoProgramaticoPorDia) {
    CompState.conteudoProgramaticoPorDia = {};
  }

  const totalDias = dias.length;
  const totalItens = partes.length;

  if (totalItens <= totalDias) {
    // Menor ou igual
    dias.forEach((isoDate, idx) => {
      if (idx < totalItens) {
        CompState.conteudoProgramaticoPorDia[isoDate] = partes[idx];
      } else {
        CompState.conteudoProgramaticoPorDia[isoDate] = '';
      }
    });

    if (alertaEl) {
      alertaEl.style.display = 'block';
      if (totalItens === totalDias) {
        alertaEl.style.background = 'rgba(16, 185, 129, 0.15)';
        alertaEl.style.color = '#10b981';
        alertaEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        alertaEl.textContent = `Todos os ${totalDias} dias letivos preenchidos com sucesso.`;
      } else {
        const faltam = totalDias - totalItens;
        alertaEl.style.background = 'rgba(245, 158, 11, 0.15)';
        alertaEl.style.color = '#f59e0b';
        alertaEl.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        alertaEl.textContent = `Aviso: ${faltam} dia(s) sem conteúdo programático (${totalItens} de ${totalDias} preenchidos).`;
      }
    }
  } else {
    // Overflow: totalItens > totalDias
    const overflow = totalItens - totalDias;
    for (let i = 0; i < totalDias - 1; i++) {
      CompState.conteudoProgramaticoPorDia[dias[i]] = partes[i];
    }
    // O último dia recebe o seu item + todos os itens subsequentes concatenados por " ::: "
    const sobra = partes.slice(totalDias - 1).join(' ::: ');
    CompState.conteudoProgramaticoPorDia[dias[totalDias - 1]] = sobra;

    if (alertaEl) {
      alertaEl.style.display = 'block';
      alertaEl.style.background = 'rgba(239, 68, 68, 0.15)';
      alertaEl.style.color = '#ef4444';
      alertaEl.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      alertaEl.textContent = `Aviso: ${overflow} dia(s) em overflow (agrupados na última aula).`;
    }
  }

  compSalvarTurmaAtualStorage();
  compRenderizarListaConteudoProgramatico();
  compAlternarAbaConteudo('aulas');
  compMostrarToast('Conteúdo Distribuído', 'Plano de aulas atualizado para a turma ativa.', 'success');
}

function compLimparTodosConteudos() {
  if (confirm('Deseja realmente limpar o conteúdo programático de todas as aulas desta turma?')) {
    CompState.conteudoProgramaticoPorDia = {};
    compSalvarTurmaAtualStorage();
    compRenderizarListaConteudoProgramatico();
    const alertaEl = document.getElementById('comp-conteudo-lote-alerta');
    if (alertaEl) alertaEl.style.display = 'none';
    const inputEl = document.getElementById('comp-conteudo-lote-input');
    if (inputEl) inputEl.value = '';
    compMostrarToast('Conteúdos Limpos', 'Todos os conteúdos foram removidos.', 'info');
  }
}

function compObterDiaSemanaAbrev(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const data = new Date(y, m - 1, d);
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return dias[data.getDay()] || '';
}

function compLimparCamposReposicaoModal() {
  const al = _compAlunoEmEdicaoReposicao;
  if (!al) return;
  _compReposicaoEdicoes[al] = [];
  compRenderizarLinhasModalReposicao();
  compMostrarToast('Campos Limpos', 'Tabela de reposição redefinida para vazia.', 'info');
}

function compCalcularSomaHoras(listaHoras) {
  let minTotal = 0;
  let countValidos = 0;
  (listaHoras || []).forEach(hStr => {
    if (!hStr) return;
    const match = String(hStr).match(/(\d+)[h:](\d+)?/i);
    if (match) {
      const h = parseInt(match[1], 10) || 0;
      const m = parseInt(match[2], 10) || 0;
      minTotal += (h * 60) + m;
      countValidos++;
    }
  });
  if (countValidos === 0 || minTotal === 0) return '';
  const horas = Math.floor(minTotal / 60);
  const minutos = minTotal % 60;
  return `${horas}h${String(minutos).padStart(2, '0')}`;
}

/**
 * Calcula quantas linhas visuais um texto de Conteúdo Programático ocupará na coluna de 44% da folha A4.
 * ~50 caracteres por linha em Arial 8pt.
 */
function compCalcularLinhasVisuaisConteudo(texto, maxCharsPorLinha = 50) {
  if (!texto || !String(texto).trim()) return 1;
  const paragrafos = String(texto).replace(/\r\n/g, '\n').split('\n');
  let totalLinhas = 0;
  paragrafos.forEach(p => {
    const trimmed = p.trim();
    if (!trimmed) {
      totalLinhas += 1;
      return;
    }
    const palavras = trimmed.split(/\s+/);
    let linhaAtualLen = 0;
    let linhasParagrafo = 1;
    palavras.forEach(palavra => {
      if (linhaAtualLen === 0) {
        linhaAtualLen = palavra.length;
      } else if (linhaAtualLen + 1 + palavra.length <= maxCharsPorLinha) {
        linhaAtualLen += 1 + palavra.length;
      } else {
        linhasParagrafo++;
        linhaAtualLen = palavra.length;
      }
    });
    totalLinhas += linhasParagrafo;
  });
  return Math.max(1, totalLinhas);
}

/**
 * Divide o texto do parecer da Coordenação pelas 6 linhas contínuas oficiais.
 * O preenchimento vai até o limite de cada linha (linha 1 ~105 chars, linhas 2 a 6 ~125 chars).
 * Qualquer texto que exceder a 6ª linha é truncado/descartado, sinalizando overflow: true.
 */
function compDividirObservacaoCoordenacao(texto) {
  if (!texto || !String(texto).trim()) {
    return {
      linha1: '', linha2: '', linha3: '', linha4: '', linha5: '', linha6: '',
      hasOverflow: false, descartado: ''
    };
  }

  // Capacidade de cada linha em caracteres antes de quebrar para a próxima
  // Linha 1 tem rótulo 'Observação:' (~105 chars); Linhas 2 a 6 usam a largura total da folha (~140 chars)
  const caps = [105, 140, 140, 140, 140, 140];
  const limpo = String(texto).replace(/\r\n/g, '\n').trim();
  const palavras = limpo.split(/\s+/);
  const linhas = ['', '', '', '', '', ''];
  let linhaIdx = 0;
  let overflowPalavras = [];

  for (let i = 0; i < palavras.length; i++) {
    const palavra = palavras[i];
    const capAtual = caps[linhaIdx] || 125;

    if (linhas[linhaIdx].length === 0) {
      linhas[linhaIdx] = palavra;
    } else if (linhas[linhaIdx].length + 1 + palavra.length <= capAtual) {
      linhas[linhaIdx] += ' ' + palavra;
    } else {
      linhaIdx++;
      if (linhaIdx < 6) {
        linhas[linhaIdx] = palavra;
      } else {
        // Excedeu as 6 linhas oficiais: palavras restantes são descartadas
        overflowPalavras = palavras.slice(i);
        break;
      }
    }
  }

  const hasOverflow = overflowPalavras.length > 0;
  const descartado = overflowPalavras.join(' ');

  return {
    linha1: compEscapeHTML(linhas[0] || ''),
    linha2: compEscapeHTML(linhas[1] || ''),
    linha3: compEscapeHTML(linhas[2] || ''),
    linha4: compEscapeHTML(linhas[3] || ''),
    linha5: compEscapeHTML(linhas[4] || ''),
    linha6: compEscapeHTML(linhas[5] || ''),
    hasOverflow,
    descartado
  };
}

// ==========================================================================
// MENU RESTRITO DA COORDENAÇÃO (AUTH, TRI-STATE, OBSERVAÇÃO)
// ==========================================================================
/**
 * Retorna o parecer e observação específicos da coordenação para o discente.
 */
function compObterCoordenacaoAluno(aluno) {
  if (!aluno) return { deferido: null, observacao: '' };
  if (!CompState.coordenacaoPorAluno) CompState.coordenacaoPorAluno = {};
  if (!CompState.coordenacaoPorAluno[aluno]) {
    CompState.coordenacaoPorAluno[aluno] = { deferido: null, observacao: '' };
  }
  return CompState.coordenacaoPorAluno[aluno];
}

/**
 * Salva o parecer e observação específicos da coordenação para o discente no estado e persistência.
 */
function compSalvarCoordenacaoAluno(aluno, deferido, observacao) {
  if (!aluno) return;
  if (!CompState.coordenacaoPorAluno) CompState.coordenacaoPorAluno = {};
  CompState.coordenacaoPorAluno[aluno] = {
    deferido: deferido || null,
    observacao: observacao !== undefined && observacao !== null ? String(observacao) : ''
  };
  compSalvarTurmaAtualStorage();
}

/**
 * Atualiza o ícone e título do cadeado externo na barra de ferramentas da chamada.
 */
function compAtualizarStatusCadeadoUI() {
  const btnLock = document.getElementById('comp-btn-lock-coord');
  if (!btnLock) return;
  if (CompState.coordenacao.desbloqueada) {
    btnLock.innerHTML = '🔓';
    btnLock.title = 'Modo Coordenação Desbloqueado (Clique para Bloquear)';
    btnLock.classList.add('btn-coord-unlocked');
  } else {
    btnLock.innerHTML = '🔒';
    btnLock.title = 'Desbloquear Modo Coordenação (Protegido por Senha)';
    btnLock.classList.remove('btn-coord-unlocked');
  }
}

/**
 * Ação do cadeado da parte de fora da chamada:
 * Se bloqueado -> abre modal de senha para desbloquear.
 * Se desbloqueado -> confirma e bloqueia.
 */
function compToggleLockCoordenacaoExterno() {
  if (CompState.coordenacao.desbloqueada) {
    const querBloquear = confirm('A Área da Coordenação está desbloqueada.\n\nDeseja bloquear o acesso novamente?');
    if (querBloquear) {
      CompState.coordenacao.desbloqueada = false;
      compAtualizarStatusCadeadoUI();
      compAtualizarSecaoCoordModalReposicao();
      compMostrarToast('Coordenação Bloqueada', 'Acesso restrito foi bloqueado com sucesso.', 'info');
    }
  } else {
    compAbrirModalAuthCoordenacao();
  }
}

function compAbrirModalAuthCoordenacao() {
  const authModal = document.getElementById('comp-modal-coordenacao-auth');
  const inputPass = document.getElementById('comp-coord-password-input');
  const errEl = document.getElementById('comp-coord-auth-error');
  if (errEl) errEl.style.display = 'none';
  if (inputPass) inputPass.value = '';
  if (authModal) {
    authModal.style.display = 'flex';
    setTimeout(() => { if (inputPass) inputPass.focus(); }, 100);
  }
}

function compAbrirModalCoordenacao() {
  if (!compIsCoordenacaoDesbloqueada()) {
    compAbrirModalAuthCoordenacao();
  } else {
    compFocarSecaoCoordModal();
  }
}

function compFecharModalAuthCoordenacao() {
  const authModal = document.getElementById('comp-modal-coordenacao-auth');
  if (authModal) authModal.style.display = 'none';
}

function compAutenticarCoordenacao() {
  const inputPass = document.getElementById('comp-coord-password-input');
  const errEl = document.getElementById('comp-coord-auth-error');
  const pass = (inputPass?.value || '').trim();

  if (pass.toLowerCase() === COMP_SENHA_COORDENACAO.toLowerCase()) {
    CompState.coordenacao.desbloqueada = true;
    compFecharModalAuthCoordenacao();
    compAtualizarStatusCadeadoUI();
    compAtualizarSecaoCoordModalReposicao();
    compMostrarToast('Acesso Liberado', 'Modo Coordenação desbloqueado com sucesso.', 'success');
  } else {
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = 'Senha incorreta. Tente novamente.';
    }
    if (inputPass) {
      inputPass.focus();
      inputPass.select();
    }
  }
}

// --------------------------------------------------------------------------
// INTERIOR DO MODAL DE REPOSIÇÃO: SEÇÃO ESPECÍFICA DO COORDENADOR POR DISCENTE
// --------------------------------------------------------------------------

/**
 * Verifica se as funções da coordenação estão liberadas:
 * Seja por login autenticado como coordenador ou pelo flag desbloqueada
 */
function compIsCoordenacaoDesbloqueada() {
  if (window.authService && typeof window.authService.isCoordenacao === 'function') {
    if (window.authService.isCoordenacao()) return true;
  }
  return Boolean(CompState?.coordenacao?.desbloqueada);
}
window.compIsCoordenacaoDesbloqueada = compIsCoordenacaoDesbloqueada;

/**
 * Alterna entre as abas do modal de reposição e impressão:
 * 'reposicao' (Quadro Demonstrativo) ou 'coordenacao' (Parecer da Coordenação)
 * @param {'reposicao'|'coordenacao'} abaId
 */
function compAlternarAbaModalReposicao(abaId) {
  const btnReposicao = document.getElementById('comp-modal-tab-btn-reposicao');
  const btnCoord = document.getElementById('comp-modal-tab-btn-coordenacao');
  const contentReposicao = document.getElementById('comp-modal-tab-content-reposicao');
  const contentCoord = document.getElementById('comp-modal-tab-content-coordenacao');

  if (abaId === 'coordenacao') {
    // Se o cadeado estiver trancado, exige autenticação primeiro
    if (!compIsCoordenacaoDesbloqueada()) {
      compAbrirModalAuthCoordenacao();
      return;
    }

    if (btnReposicao) btnReposicao.classList.remove('is-active');
    if (btnCoord) btnCoord.classList.add('is-active');
    if (contentReposicao) contentReposicao.hidden = true;
    if (contentCoord) contentCoord.hidden = false;

    const textarea = document.getElementById('comp-modal-coord-obs-textarea');
    if (textarea) setTimeout(() => textarea.focus(), 100);
  } else {
    // Aba padrão: Quadro de Reposição
    if (btnReposicao) btnReposicao.classList.add('is-active');
    if (btnCoord) btnCoord.classList.remove('is-active');
    if (contentReposicao) contentReposicao.hidden = false;
    if (contentCoord) contentCoord.hidden = true;
  }
}

/**
 * Controla a visibilidade e dados da seção da coordenação dentro do modal de reposição individual.
 * SE NÃO ESTIVER DESBLOQUEADA, A ABA DA COORDENAÇÃO NÃO DEVE APARECER!
 */
function compAtualizarSecaoCoordModalReposicao() {
  const tabBtnCoord = document.getElementById('comp-modal-tab-btn-coordenacao');
  const actionBtnCoord = document.getElementById('comp-modal-reposicao-btn-coordenacao');
  const contentCoord = document.getElementById('comp-modal-tab-content-coordenacao');

  if (!compIsCoordenacaoDesbloqueada()) {
    if (tabBtnCoord) tabBtnCoord.style.display = 'none';
    if (actionBtnCoord) actionBtnCoord.style.display = 'none';
    if (contentCoord) contentCoord.hidden = true;
    // Se estiver na aba da coordenação, volta para a de reposição
    compAlternarAbaModalReposicao('reposicao');
    return;
  }

  // Desbloqueado: exibe a aba da coordenação e o botão de atalho
  if (tabBtnCoord) tabBtnCoord.style.display = 'inline-flex';
  if (actionBtnCoord) actionBtnCoord.style.display = 'inline-flex';

  const al = _compAlunoEmEdicaoReposicao;
  if (!al) return;

  const elNome = document.getElementById('comp-modal-coord-aluno-nome');
  if (elNome) elNome.textContent = al;

  const coord = compObterCoordenacaoAluno(al);
  compAtualizarModalCoordTriStateUI(coord.deferido);

  const textarea = document.getElementById('comp-modal-coord-obs-textarea');
  if (textarea) {
    textarea.value = coord.observacao || '';
  }
  compAtualizarModalCoordObservacaoUI();
}

function compFecharPainelConfiguracoesCoordenacao() {
  const modal = document.getElementById('comp-modal-coordenacao-settings');
  if (modal) modal.style.display = 'none';
}

/**
 * Alterna o estado tri-state de deferimento para o discente atual:
 * Ciclo: null -> 'D' (Sim [X]) -> 'I' (Não [X]) -> null (Desmarcado)
 */
function compAlternarTriStateModalCoord() {
  const al = _compAlunoEmEdicaoReposicao;
  if (!al) return;

  const coord = compObterCoordenacaoAluno(al);
  let novoStatus = null;
  if (coord.deferido === null || coord.deferido === undefined || coord.deferido === '') {
    novoStatus = 'D';
  } else if (coord.deferido === 'D' || coord.deferido === 'sim') {
    novoStatus = 'I';
  } else {
    novoStatus = null;
  }

  const textarea = document.getElementById('comp-modal-coord-obs-textarea');
  const obs = textarea ? textarea.value : (coord.observacao || '');
  compSalvarCoordenacaoAluno(al, novoStatus, obs);
  compAtualizarModalCoordTriStateUI(novoStatus);
}

function compAtualizarModalCoordTriStateUI(deferidoVal) {
  const btn = document.getElementById('comp-modal-coord-btn-tristate');
  const icon = document.getElementById('comp-modal-coord-tristate-icon');
  const text = document.getElementById('comp-modal-coord-tristate-text');
  const hint = document.getElementById('comp-modal-coord-tristate-hint');
  if (!btn || !icon || !text) return;

  btn.classList.remove('state-none', 'state-deferido', 'state-indeferido');

  if (deferidoVal === 'D' || deferidoVal === 'sim') {
    btn.classList.add('state-deferido');
    icon.textContent = 'D';
    text.textContent = 'DEFERIDO (Sim [X] • Não [ ])';
    if (hint) hint.innerHTML = 'Na impressão: <strong>Sim [X]</strong> &bull; Não [ ]';
  } else if (deferidoVal === 'I' || deferidoVal === 'nao') {
    btn.classList.add('state-indeferido');
    icon.textContent = 'I';
    text.textContent = 'INDEFERIDO (Sim [ ] • Não [X])';
    if (hint) hint.innerHTML = 'Na impressão: Sim [ ] &bull; <strong>Não [X]</strong>';
  } else {
    btn.classList.add('state-none');
    icon.textContent = '';
    text.textContent = 'Não Definido (Ambos Desmarcados)';
    if (hint) hint.innerHTML = 'Na impressão: Sim [ ] &bull; Não [ ]';
  }
}

function compAtualizarModalCoordObservacaoUI() {
  const al = _compAlunoEmEdicaoReposicao;
  const textarea = document.getElementById('comp-modal-coord-obs-textarea');
  const counter = document.getElementById('comp-modal-coord-char-counter');
  const alerta = document.getElementById('comp-modal-coord-obs-alerta-overflow');
  const p1 = document.getElementById('comp-modal-preview-line-1');
  const p2 = document.getElementById('comp-modal-preview-line-2');
  const p3 = document.getElementById('comp-modal-preview-line-3');
  const p4 = document.getElementById('comp-modal-preview-line-4');
  const p5 = document.getElementById('comp-modal-preview-line-5');
  const p6 = document.getElementById('comp-modal-preview-line-6');
  const pOverflow = document.getElementById('comp-modal-preview-overflow-text');
  const pOverflowContainer = document.getElementById('comp-modal-preview-overflow-container');

  const val = textarea ? textarea.value : '';
  const len = val.length;

  // Distribuição nas 6 linhas para pré-visualização ao vivo
  const partes = compDividirObservacaoCoordenacao(val);
  const isOverflow = Boolean(partes.hasOverflow);

  if (counter) {
    counter.textContent = `${len} / 805 caracteres (~105 na L1, ~140 nas L2 a L6)`;
    counter.style.color = isOverflow ? '#dc322f' : 'var(--text-secondary)';
  }

  if (alerta) {
    alerta.style.display = isOverflow ? 'block' : 'none';
  }

  if (textarea) {
    if (isOverflow) {
      textarea.classList.add('is-overflow');
    } else {
      textarea.classList.remove('is-overflow');
    }
  }

  const renderLine = (el, text, defaultText) => {
    if (!el) return;
    el.textContent = text || defaultText;
    el.style.fontStyle = text ? 'normal' : 'italic';
    el.style.color = text ? 'var(--text-primary)' : 'var(--text-secondary)';
  };

  renderLine(p1, partes.linha1, '(Linha 1 vazia)');
  renderLine(p2, partes.linha2, '(Linha 2 vazia)');
  renderLine(p3, partes.linha3, '(Linha 3 vazia)');
  renderLine(p4, partes.linha4, '(Linha 4 vazia)');
  renderLine(p5, partes.linha5, '(Linha 5 vazia)');
  renderLine(p6, partes.linha6, '(Linha 6 vazia)');

  if (pOverflowContainer && pOverflow) {
    if (partes.hasOverflow && partes.descartado) {
      pOverflowContainer.style.display = 'block';
      pOverflow.textContent = `(Descartado / Truncado na impressão): ${partes.descartado}`;
      pOverflowContainer.style.color = '#dc322f';
    } else {
      pOverflowContainer.style.display = 'none';
      pOverflow.textContent = '';
    }
  }

  if (al) {
    const coord = compObterCoordenacaoAluno(al);
    compSalvarCoordenacaoAluno(al, coord.deferido, val);
  }
}

function compLimparParecerModalCoord() {
  const al = _compAlunoEmEdicaoReposicao;
  if (!al) return;
  compSalvarCoordenacaoAluno(al, null, '');
  const textarea = document.getElementById('comp-modal-coord-obs-textarea');
  if (textarea) textarea.value = '';
  compAtualizarModalCoordTriStateUI(null);
  compAtualizarModalCoordObservacaoUI();
  compMostrarToast('Parecer Limpo', `Campos da coordenação para ${al} foram redefinidos.`, 'info');
}

function compFocarSecaoCoordModal() {
  compAlternarAbaModalReposicao('coordenacao');
  const textarea = document.getElementById('comp-modal-coord-obs-textarea');
  if (textarea) {
    setTimeout(() => textarea.focus(), 150);
  }
}

// Funções de compatibilidade
function compFecharPainelConfiguracoesCoordenacao() {}
function compAlternarTriStateCoordenacao() { compAlternarTriStateModalCoord(); }
function compAtualizarTriStateCoordenacaoUI() {}
function compAtualizarObservacaoCoordenacaoUI() {}
function compSalvarConfiguracoesCoordenacao() {}
function compLimparParecerCoordenacao() { compLimparParecerModalCoord(); }

/**
 * Gera o documento HTML completo de 2 páginas (A4) espelhando o formulário oficial do SENAI
 */
function compGerarHtmlFichaCompensacao(aluno, options = {}) {
  const al = aluno || CompState.alunoAtivo;
  const chTotalNum = CompState.turmaInfo.chTotal || 40;
  const { faltasAteHoje, pctFaltas } = compCalcularFrequenciaAteHoje(al, chTotalNum);
  const aulasDadasNum = compCalcularHorasAulasDadas();
  const freqPct = Math.max(0, Math.floor(((chTotalNum - faltasAteHoje) / chTotalNum) * 100));

  // Determina situação do aluno
  const isTender = freqPct >= 75;
  const isNaoCert = freqPct >= 40 && freqPct < 75;
  const isExcesso = freqPct < 40;

  // Linhas de reposição de tamanho rigorosamente fixo (orçamento: 17 linhas de 22px fixas, tabela ancorada ao final)
  const TOTAL_SLOTS_TABELA = 17;
  const linhasCadastradas = options.forceBlank ? [] : compObterLinhasReposicaoAluno(al);
  const linhasTabela = [];

  // Pega até 17 linhas cadastradas
  for (let i = 0; i < Math.min(TOTAL_SLOTS_TABELA, linhasCadastradas.length); i++) {
    const l = linhasCadastradas[i];
    // Se o texto exceder o que cabe na célula da tabela (~60 chars), trunca descartando o excedente
    let conteudoTruncado = String(l.conteudo || '').trim();
    if (conteudoTruncado.length > 60) {
      conteudoTruncado = conteudoTruncado.slice(0, 58) + '...';
    }
    linhasTabela.push({ ...l, conteudo: conteudoTruncado });
  }

  // Preenche com linhas vazias até completar exatamente 17 linhas fixas
  const numLinhasVazias = TOTAL_SLOTS_TABELA - linhasTabela.length;
  for (let i = 0; i < numLinhasVazias; i++) {
    linhasTabela.push({ dataPrevista: '', chPrevista: '', dataFalta: '', chFalta: '', dataRealizada: '', chRealizada: '', conteudo: '' });
  }

  const totalPrevistoStr = compCalcularSomaHoras(linhasCadastradas.map(l => l.chPrevista));
  const totalFaltasStr = compCalcularSomaHoras(linhasCadastradas.map(l => l.chFalta));
  const totalRealizadoStr = compCalcularSomaHoras(linhasCadastradas.map(l => l.chRealizada));

  const hojeFormatado = compIsoToDDMMAAAA(compObterDataHojeIso());
  const cursoNome = CompState.turmaInfo.curso || 'undefined2_curso';
  const docenteNome = CompState.turmaInfo.docente || 'undefined3_docente';
  const turmaCodigo = CompState.turmaInfo.turma || 'undefined5_turma';

  // Ano extraído automaticamente do último registro de aulas da turma no diário
  let anoLetivo = '2026';
  if (CompState.diasLetivos && CompState.diasLetivos.length > 0) {
    const ultimoDia = CompState.diasLetivos[CompState.diasLetivos.length - 1];
    if (ultimoDia && ultimoDia.includes('-')) {
      anoLetivo = ultimoDia.split('-')[0];
    }
  } else {
    anoLetivo = String(new Date().getFullYear());
  }

  const coordAluno = compObterCoordenacaoAluno(al);
  const statusDeferido = coordAluno.deferido;
  const isDeferidoSim = statusDeferido === 'D' || statusDeferido === 'sim';
  const isIndeferidoNao = statusDeferido === 'I' || statusDeferido === 'nao';
  const obsLinhas = compDividirObservacaoCoordenacao(coordAluno.observacao);

  return `
    <div class="ficha-container">
      <!-- ================= PÁGINA 1 (FRENTE) ================= -->
      <div class="ficha-page ficha-page-break">
        <div class="ficha-header">
          <img src="logo_senai_padrao.jpg" alt="SENAI" class="ficha-header-logo">
          <h2>Escola SENAI "Humberto Reis Costa"</h2>
          <h1>SOLICITAÇÃO DE COMPENSAÇÃO DE AUSÊNCIA</h1>
        </div>

        <div class="ficha-fields-grid">
          <div class="ficha-field-row">
            <span class="ficha-field-label">Aluno:</span>
            <span class="ficha-field-value" style="font-weight:bold;">${compEscapeHTML(al)}</span>
          </div>
          <div class="ficha-field-row">
            <span class="ficha-field-label">Curso:</span>
            <span class="ficha-field-value">${compEscapeHTML(cursoNome)}</span>
          </div>
          <div class="ficha-field-row">
            <span class="ficha-field-label">Docente:</span>
            <span class="ficha-field-value">${compEscapeHTML(docenteNome)}</span>
          </div>
          <div class="ficha-field-row">
            <span class="ficha-field-label">Carga Horária:</span>
            <span class="ficha-field-value">${chTotalNum} horas</span>
          </div>
          <div class="ficha-field-row">
            <span class="ficha-field-label">Turma:</span>
            <span class="ficha-field-value">${compEscapeHTML(turmaCodigo)}</span>
          </div>
          <div class="ficha-field-row">
            <span class="ficha-field-label">Justificativa:</span>
            <span class="ficha-field-value">&nbsp;</span>
          </div>
          <div class="ficha-field-row">
            <span class="ficha-field-label">Comprovante de justificativa:</span>
            <span class="ficha-field-value" style="border-bottom: none; display:flex; align-items:center; gap: 14px;">
              <span style="display:inline-flex; align-items:center; gap:4px;"><span class="ficha-check-box">&nbsp;</span> Sim</span>
              <span style="display:inline-flex; align-items:center; gap:4px;"><span class="ficha-check-box">&nbsp;</span> Não</span>
            </span>
          </div>
        </div>

        <div class="ficha-termo-box">
          <h3 style="font-size: 11pt; margin-bottom: 8px;">Termo de Ciência</h3>
          <p>Recomenda-se observar rigorosamente os critérios vigentes para promoção, explicitados na Proposta Pedagógica, e tomar as providências necessárias para a regularização de sua assiduidade escolar. Recomenda-se, outrossim, observar as disposições constantes no Regimento Comum das Unidades Escolares SENAI, a saber:</p>
          <div style="height: 14px;"></div>
          <p>Art. 59. São deveres do estudante:</p>
          <ol type="I">
            <li>Respeitar as normas administrativas e pedagógicas inerentes à unidade escolar, aos cursos ou níveis de ensino;</li>
            <li>Empenhar-se na autoformação e no aproveitamento de todos os recursos disponíveis ao seu desenvolvimento cognitivo, socioemocional e profissional;</li>
            <li><strong>Comparecer pontualmente aos compromissos escolares;</strong></li>
          </ol>
          <div style="height: 14px;"></div>
          <p><strong>PS.</strong></p>
          <div style="height: 14px;"></div>
          <p>• A reposição deverá ser realizada até a data de conclusão do curso.<br>
          • Não haverá reposição de aula para excesso de faltas consecutivas superior 10% da carga horária total do curso e/ou superiores a 40% da carga horária total do curso.</p>
          <div style="height: 14px;"></div>
          <p>Ratificamos ao(à) aluno(a) que o excesso de ausências poderá resultar na não certificação no curso. Para ter direito ao certificado, é obrigatória a frequência mínima de 75% das aulas ministradas para cursos do MEC e 100% de frequência para cursos do MTE.</p>
          <div style="height: 14px;"></div>
          <p>Atenciosamente,</p>
          <div style="height: 42px;"></div><!-- 3 linhas abaixo de Atenciosamente -->

          <!-- Bloco de Data e Assinatura do Aluno (Posicionado 3 linhas abaixo de Atenciosamente e acima da tabela) -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
            <div style="font-size: 9pt; white-space: nowrap;">
              São Paulo, ____ de ______________ de ${anoLetivo}
            </div>
            <div style="width: 280px; text-align: center;">
              <div style="border-top: 1px solid #000; margin-bottom: 3px;"></div>
              <div style="font-size: 7.5pt; color: #000;">Aluno(a) / Responsável do aluno(a)</div>
            </div>
          </div>
        </div>

        <!-- Seção do Docente e Tabela alinhada próxima ao limite inferior da folha -->
        <div style="text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase; margin: 18px 0 6px 0;">PREENCHIDO PELO DOCENTE</div>

        <table class="ficha-table ficha-table-faltas" style="margin-top: 0; margin-bottom: 0;">
          <thead>
            <tr>
              <th colspan="5" style="background-color: #e5e7eb; font-size: 9.5pt; font-weight: bold; padding: 5px 6px; text-transform: uppercase; border: 1.5px solid #000;">
                QUADRO DEMONSTRATIVO DE FALTAS ACUMULADAS CONFORME DIÁRIO DE CLASSE
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Linha 1 do corpo: Apenas o cabeçalho 'Registro da situação' com Data e Docente na 5ª coluna; mais espaço total na primeira linha -->
            <tr style="height: 72px;">
              <th style="width: 14.5%; background-color: #fff; font-size: 8.5pt; padding: 8px 4px; vertical-align: middle;">Carga Horária do Curso/Disciplina</th>
              <th style="width: 14.5%; background-color: #fff; font-size: 8.5pt; padding: 8px 4px; vertical-align: middle;">Carga Horária das Aulas Dadas</th>
              <th style="width: 14.5%; background-color: #fff; font-size: 8.5pt; padding: 8px 4px; vertical-align: middle;">Total de Horas/Faltas Registradas</th>
              <th style="width: 14.5%; background-color: #fff; font-size: 8.5pt; padding: 8px 4px; vertical-align: middle;">Porcentagem de Frequência</th>
              <td style="width: 42%; text-align: left; padding: 6px 8px 3px 8px; vertical-align: bottom;">
                <div style="font-weight: bold; font-size: 8.5pt; margin-bottom: 26px;">Registro da situação:</div>
                <!-- Bloco de Data e Rubrica do Docente: fonte menor e proximidade reduzida em relação à linha da tabela (Imagem 2) -->
                <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; margin-bottom: 0;">
                  <div style="flex: 1; text-align: center;">
                    <div style="border-top: 1px solid #000; width: 100%; margin-bottom: 3px;"></div>
                    <div style="font-size: 7pt; font-weight: normal; color: #000; line-height: 1.1; margin-bottom: 1px;">Data</div>
                  </div>
                  <div style="flex: 1.4; text-align: center;">
                    <div style="border-top: 1px solid #000; width: 100%; margin-bottom: 3px;"></div>
                    <div style="font-size: 7pt; font-weight: normal; color: #000; line-height: 1.1; margin-bottom: 1px;">Docente Responsável</div>
                  </div>
                </div>
              </td>
            </tr>
            <!-- Linha 2 do corpo: A linha horizontal da tabela agora passa AQUI (altura verde), separando os títulos/docente dos valores/checkboxes -->
            <tr>
              <td style="font-size: 9.5pt; font-weight: bold; vertical-align: middle;">${chTotalNum} horas</td>
              <td style="font-size: 9.5pt; font-weight: bold; vertical-align: middle;">${compFormatarHorasDecimais(aulasDadasNum)}</td>
              <td style="font-size: 9.5pt; font-weight: bold; vertical-align: middle; color:#000;">${compFormatarHorasDecimais(faltasAteHoje)}</td>
              <td style="font-size: 9.5pt; font-weight: bold; vertical-align: middle;">${freqPct}%</td>
              <td style="text-align: left; padding: 0; vertical-align: top;">
                <!-- Item 1: Tender a ser Não Certificado -->
                <div style="display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-bottom: 1px solid #000; font-size: 8pt; font-weight: bold;">
                  <div style="width: 16px; height: 16px; border: 1.2px solid #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px;">
                    ${isTender ? 'X' : ''}
                  </div>
                  <span>Tender a ser Não Certificado.</span>
                </div>

                <!-- Item 2: Não Certificado -->
                <div style="display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-bottom: 1px solid #000; font-size: 8pt; font-weight: bold;">
                  <div style="width: 16px; height: 16px; border: 1.2px solid #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px;">
                    ${isNaoCert ? 'X' : ''}
                  </div>
                  <span>Não Certificado.</span>
                </div>

                <!-- Item 3: Não Certificado – Com excesso... -->
                <div style="display: flex; align-items: center; gap: 8px; padding: 4px 6px; font-size: 8pt; font-weight: bold; line-height: 1.2;">
                  <div style="width: 16px; height: 16px; border: 1.2px solid #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px;">
                    ${isExcesso ? 'X' : ''}
                  </div>
                  <span>Não Certificado – Com excesso de faltas consecutivas e/ou superiores a 40% da carga horária do curso.</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ================= PÁGINA 2 (VERSO) ================= -->
      <div class="ficha-page">
        <div class="ficha-header">
          <img src="logo_senai_padrao.jpg" alt="SENAI" class="ficha-header-logo">
          <h2>Escola SENAI "Humberto Reis Costa"</h2>
          <h1 style="font-weight: normal;">SOLICITAÇÃO DE COMPENSAÇÃO DE AUSÊNCIA</h1>
        </div>

        <div style="text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 12px 0 8px 0;">
          PREENCHIDO PELO COORDENADOR DE FIC – ESCOLA
        </div>

        <div style="display:flex;align-items:center;gap:20px;margin:8px 0;font-size:9.5pt;">
          <strong>Solicitação deferida?</strong>
          <span style="display:inline-flex;align-items:center;gap:5px;">
            <span class="ficha-check-box">${isDeferidoSim ? 'X' : '&nbsp;'}</span> Sim
          </span>
          <span style="display:inline-flex;align-items:center;gap:5px;">
            <span class="ficha-check-box">${isIndeferidoNao ? 'X' : '&nbsp;'}</span> Não
          </span>
        </div>

        <!-- Observação da Coordenação (Estritamente 6 Linhas Oficiais preenchidas até o final da linha, linhas 2 a 6 iniciando na margem esquerda total conforme Imagem 1) -->
        <div style="margin-top: 8px; margin-bottom: 58px; font-size: 9pt;">
          <div style="display: flex; align-items: flex-end; gap: 8px;">
            <strong style="white-space: nowrap;">Observação:</strong>
            <div style="flex: 1; border-bottom: 1px solid #000; min-height: 14px; padding-left: 4px; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${obsLinhas.linha1}
            </div>
          </div>
          <div style="border-bottom: 1px solid #000; height: 18px; margin-top: 5px; padding-left: 4px; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${obsLinhas.linha2}
          </div>
          <div style="border-bottom: 1px solid #000; height: 18px; margin-top: 5px; padding-left: 4px; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${obsLinhas.linha3}
          </div>
          <div style="border-bottom: 1px solid #000; height: 18px; margin-top: 5px; padding-left: 4px; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${obsLinhas.linha4}
          </div>
          <div style="border-bottom: 1px solid #000; height: 18px; margin-top: 5px; padding-left: 4px; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${obsLinhas.linha5}
          </div>
          <div style="border-bottom: 1px solid #000; height: 18px; margin-top: 5px; padding-left: 4px; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${obsLinhas.linha6}
          </div>
        </div>

        <!-- Bloco de Data e Assinatura da Coordenação Lado a Lado (Movido para baixo o equivalente a 3 enters) -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px;">
          <div style="font-size: 9pt; white-space: nowrap;">
            São Paulo, ____ de _______________ de ${anoLetivo}
          </div>
          <div style="width: 280px; text-align: center;">
            <div style="border-top: 1px solid #000; margin-bottom: 3px;"></div>
            <div style="font-size: 7.5pt; color: #000;">Coordenação Técnico/Pedagógico</div>
          </div>
        </div>

        <!-- Seção do Docente: Título Centralizado em Negrito colado na linha superior da tabela (equivalente a 3 enters mais próximo) -->
        <div style="text-align: center; font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: auto; margin-bottom: 6px;">
          PREENCHIDO PELO DOCENTE
        </div>

        <!-- Tabela Demonstrativa com QUADRO DEMONSTRATIVO DA REPOSIÇÃO DE FALTAS dentro da 1ª linha do cabeçalho cinza (Fiel à Imagem 1) -->
        <table class="ficha-table ficha-table-reposicao" style="margin-top: 0;">
          <colgroup>
            <col style="width: 11.6%;">
            <col style="width: 6.7%;">
            <col style="width: 11.2%;">
            <col style="width: 7.4%;">
            <col style="width: 12.3%;">
            <col style="width: 6.7%;">
            <col style="width: 44.1%;">
          </colgroup>
          <thead>
            <tr>
              <th colspan="7" style="background:#e5e7eb; font-size: 9.5pt; font-weight: bold; text-transform: uppercase; padding: 5px 4px; border: 1px solid #000; text-align: center;">
                QUADRO DEMONSTRATIVO DA REPOSIÇÃO DE FALTAS
              </th>
            </tr>
            <tr>
              <th colspan="6" style="background:#e5e7eb; font-size: 8.5pt; font-weight: bold; text-align: center; border: 1px solid #000; padding: 4px 2px;">
                Reposição de Aula
              </th>
              <th rowspan="2" style="background:#e5e7eb; font-size: 8.5pt; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #000; padding: 4px 6px;">
                Conteúdo Programático Reposto
              </th>
            </tr>
            <tr>
              <th style="background:#e5e7eb; font-size: 7.5pt; font-weight: bold; text-align: center; vertical-align: middle; line-height: 1.15; padding: 2px; border: 1px solid #000;">Data<br>Prevista</th>
              <th style="background:#e5e7eb; font-size: 7.5pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 2px; border: 1px solid #000;">CH</th>
              <th style="background:#e5e7eb; font-size: 7.5pt; font-weight: bold; text-align: center; vertical-align: middle; line-height: 1.15; padding: 2px; border: 1px solid #000;">Data<br>Falta</th>
              <th style="background:#e5e7eb; font-size: 7.5pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 2px; border: 1px solid #000;">CH</th>
              <th style="background:#e5e7eb; font-size: 7.5pt; font-weight: bold; text-align: center; vertical-align: middle; line-height: 1.15; padding: 2px; border: 1px solid #000;">Data<br>Realizada</th>
              <th style="background:#e5e7eb; font-size: 7.5pt; font-weight: bold; text-align: center; vertical-align: middle; padding: 2px; border: 1px solid #000;">CH</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTabela.map(l => `
              <tr>
                <td>${compEscapeHTML(l.dataPrevista || '')}</td>
                <td>${compEscapeHTML(l.chPrevista || '')}</td>
                <td>${compEscapeHTML(l.dataFalta || '')}</td>
                <td>${compEscapeHTML(l.chFalta || '')}</td>
                <td>${compEscapeHTML(l.dataRealizada || '')}</td>
                <td>${compEscapeHTML(l.chRealizada || '')}</td>
                <td class="col-content">${compEscapeHTML(l.conteudo || '')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <!-- Linha Única de Totais e Rótulo Observação (Última Linha da Tabela) -->
            <tr>
              <td style="font-weight: bold; font-size: 6.8pt; text-align: center; vertical-align: middle; padding: 2px; line-height: 1.15; color: #000000;">Total Horas<br>Previstas para<br>Reposição</td>
              <td style="color:#000000; font-weight: bold; font-size: 8pt; text-align: center; vertical-align: middle;">${totalPrevistoStr}</td>
              <td style="font-weight: bold; font-size: 7.2pt; text-align: center; vertical-align: middle; padding: 2px; line-height: 1.15; color: #000000;">Total<br>Horas/Faltas</td>
              <td style="color:#000000; font-weight: bold; font-size: 8pt; text-align: center; vertical-align: middle;">${totalFaltasStr}</td>
              <td style="font-weight: bold; font-size: 6.8pt; text-align: center; vertical-align: middle; padding: 2px; line-height: 1.15; color: #000000;">Total Horas<br>Realizadas na<br>Reposição</td>
              <td style="color:#000000; font-weight: bold; font-size: 8pt; text-align: center; vertical-align: middle;">${totalRealizadoStr}</td>
              <td class="col-obs" style="text-align: left; vertical-align: top; padding: 3px 5px; font-size: 8pt; color: #000000;">
                <strong>Observação:</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        <!-- Rodapé Final Oficial (Imagem 2/Documento Base) descido geometricamente em 20 pixels -->
        <table style="width: 100%; border-collapse: collapse; margin-top: auto; margin-bottom: 0; transform: translateY(20px); font-size: 8pt; text-align: center;">
          <tr>
            <td style="width: 32%; vertical-align: bottom; padding: 0 8px;">
              <div style="border-top: 1px solid #000; padding-top: 4px;">Data de Conclusão da Reposição</div>
            </td>
            <td style="width: 34%; vertical-align: bottom; padding: 0 8px;">
              <div style="border-top: 1px solid #000; padding-top: 4px;">Assinatura do Aluno</div>
            </td>
            <td style="width: 34%; vertical-align: bottom; padding: 0 8px;">
              <div style="border-top: 1px solid #000; padding-top: 4px;">Assinatura Docente</div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
}

/**
 * Gera o nome de arquivo oficial da Ficha de Compensação no padrão:
 * Compensacao_<TURMA>_<NOME>_DD_MM_AA.pdf
 * @param {string} aluno
 * @returns {string}
 */
function compFormatarNomeArquivoPdf(aluno) {
  const turmaBruta = CompState.turmaInfo.turma || document.getElementById('codigoTurma')?.value || 'TURMA';
  const turmaSanitizada = turmaBruta.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u00C0-\u00FF-]/g, '') || 'TURMA';

  const nomeBruto = aluno || CompState.alunoAtivo || 'Aluno';
  const nomeSanitizado = nomeBruto.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u00C0-\u00FF-]/g, '') || 'Aluno';

  const iso = compObterDataHojeIso(); // "YYYY-MM-DD"
  const partes = (iso || '').split('-');
  const yyyy = partes[0] || '2026';
  const mm = partes[1] || '01';
  const dd = partes[2] || '01';
  const aa = yyyy.slice(-2);

  return `Compensacao_${turmaSanitizada}_${nomeSanitizado}_${dd}_${mm}_${aa}.pdf`;
}

/**
 * Abre a janela nativa de impressão do navegador com o layout A4 oficial (Ficha de Compensação).
 * O título da janela/documento define o nome sugerido para impressão ou 'Salvar como PDF'
 * no padrão: Compensacao_<TURMA>_<NOME>_DD_MM_AA.
 */
async function compExecutarImpressaoDocumento(htmlConteudo, nomeArquivoSugerido) {
  const filename = (nomeArquivoSugerido || compFormatarNomeArquivoPdf(CompState.alunoAtivo || 'Aluno')).replace(/\.pdf$/i, '');

  // 1. Obtém ou cria o iframe isolado de impressão
  let iframe = document.getElementById('comp-print-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'comp-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
  }

  // 2. Extrai estilos CSS da ficha de impressão para inlining garantido
  let estilosFicha = '';
  try {
    const linkFicha = document.querySelector('link[href*="print-ficha.css"]');
    if (linkFicha && linkFicha.sheet) {
      estilosFicha = Array.from(linkFicha.sheet.cssRules || []).map(r => r.cssText).join('\n');
    }
  } catch (_) {}

  // 3. Escreve o documento HTML completo no iframe
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <link rel="stylesheet" href="css/print-ficha.css">
      <style>
        ${estilosFicha}
        @page {
          size: A4 portrait;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      </style>
    </head>
    <body>
      ${htmlConteudo}
    </body>
    </html>
  `);
  doc.close();

  // 4. Aguarda carregamento de todas as imagens internas (logotipo SENAI, ícones)
  const imgs = Array.from(doc.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));

  // Pequeno timeout para renderização de fontes e layout
  await new Promise(r => setTimeout(r, 250));

  // 5. Aciona o diálogo nativo de impressão
  try {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  } catch (err) {
    console.error('Erro ao acionar janela de impressão:', err);
    window.print();
  }
}

/**
 * Ponto de entrada: Imprimir Discente (Abre o modal/pop-up para o professor preencher os campos remanescentes)
 */
function compImprimirDiscente(aluno) {
  const al = aluno || CompState.alunoAtivo;
  if (!al) {
    compMostrarToast('Nenhum Aluno Selecionado', 'Selecione um discente para imprimir.', 'warning');
    return;
  }
  compAbrirModalEdicaoReposicao(al);
}

/**
 * Confirma a impressão do discente a partir do modal
 */
async function compConfirmarEImprimirModal() {
  const al = _compAlunoEmEdicaoReposicao;
  if (!al) return;

  const html = compGerarHtmlFichaCompensacao(al);
  const nomeArquivo = compFormatarNomeArquivoPdf(al);

  // Atualiza estado de impressão (desliga a flag de Estado automaticamente)
  const { faltasAteHoje } = compCalcularFrequenciaAteHoje(al);
  CompState.ultimasFaltasImpressas[al] = faltasAteHoje;
  delete CompState.manualFlagAlunos[al];

  // Sincronizar flag de impressão com Supabase
  if (window.authService?.client) {
    try {
      window.authService.client
        .from('alunos_governanca')
        .update({
          faltas_ultima_impressao_docente: faltasAteHoje,
          data_impressao_docente: new Date().toISOString()
        })
        .ilike('nome_discente', al);
    } catch (e) {
      console.warn('[Compensação] Falha ao sincronizar impressão no Supabase:', e);
    }
  }

  compFecharModalEdicaoReposicao();
  compMostrarToast('Ficha Gerada com Sucesso', `Baixando PDF oficial de ${al}...`);

  await compExecutarImpressaoDocumento(html, nomeArquivo);

  compRenderizarDiario();
  compRenderizarVariaveis();
}

/**
 * Imprime a ficha oficial com todos os campos da tabela 100% vazios
 */
async function compImprimirModalEmBranco() {
  const al = _compAlunoEmEdicaoReposicao;
  if (!al) return;

  const html = compGerarHtmlFichaCompensacao(al, { forceBlank: true });
  const nomeArquivo = compFormatarNomeArquivoPdf(al);

  // Atualiza estado de impressão (desliga a flag de Estado automaticamente)
  const { faltasAteHoje } = compCalcularFrequenciaAteHoje(al);
  CompState.ultimasFaltasImpressas[al] = faltasAteHoje;
  delete CompState.manualFlagAlunos[al];

  // Sincronizar flag de impressão com Supabase
  if (window.authService?.client) {
    try {
      window.authService.client
        .from('alunos_governanca')
        .update({
          faltas_ultima_impressao_docente: faltasAteHoje,
          data_impressao_docente: new Date().toISOString()
        })
        .ilike('nome_discente', al);
    } catch (e) {
      console.warn('[Compensação] Falha ao sincronizar impressão no Supabase:', e);
    }
  }

  compFecharModalEdicaoReposicao();
  compMostrarToast('Ficha em Branco Gerada', `Baixando PDF oficial de ${al} com campos vazios...`);

  await compExecutarImpressaoDocumento(html, nomeArquivo);

  compRenderizarDiario();
  compRenderizarVariaveis();
}

/**
 * Imprime TODOS os discentes pendentes: não pergunta nada, imprime com os dados existentes,
 * ignora os que faltarem, baixa o PDF e desliga a flag de estado.
 */
async function compImprimirPendentes() {
  const chTotal = CompState.turmaInfo.chTotal || 40;
  const pendentes = CompState.alunos.filter(al => compAlunoPrecisaCompensacao(al, chTotal));

  if (pendentes.length === 0) {
    compMostrarToast('Nenhum Discente Pendente', 'Não há discentes com pendência de termo de ciência ou compensação.', 'info');
    return;
  }

  let htmlTotal = '';
  pendentes.forEach(al => {
    htmlTotal += compGerarHtmlFichaCompensacao(al);
    // Desliga a flag de estado no ato da confirmação da impressão
    CompState.ultimasFaltasImpressas[al] = compObterFaltasAteHoje(al);
    delete CompState.manualFlagAlunos[al];
  });

  const turmaBruta = CompState.turmaInfo.turma || document.getElementById('codigoTurma')?.value || 'TURMA';
  const turmaSanitizada = turmaBruta.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u00C0-\u00FF-]/g, '') || 'TURMA';
  const iso = compObterDataHojeIso();
  const partes = (iso || '').split('-');
  const aa = (partes[0] || '2026').slice(-2);
  const mm = partes[1] || '01';
  const dd = partes[2] || '01';
  const nomeArquivo = `Compensacao_${turmaSanitizada}_Todos_Pendentes_${dd}_${mm}_${aa}.pdf`;

  compMostrarToast('Impressão de Pendentes', `Gerando e baixando ${pendentes.length} ficha(s)...`);

  await compExecutarImpressaoDocumento(htmlTotal, nomeArquivo);

  compRenderizarDiario();
  compRenderizarVariaveis();
}

/**
 * Imprime todas as fichas de compensação dos discentes com ausências >= threshold
 */
async function compImprimirTodosHoje() {
  const chTotal = CompState.turmaInfo.chTotal || 40;
  const threshold = CompState.thresholdFaltaFlag || 10;
  const elegiveis = CompState.alunos.filter(al => {
    const { pctFaltas } = compCalcularFrequenciaAteHoje(al, chTotal);
    return pctFaltas >= threshold;
  });

  if (elegiveis.length === 0) {
    compMostrarToast('Nenhum Discente Elegível', `Nenhum aluno com ≥${threshold}% de faltas na data simulada.`, 'info');
    return;
  }

  let htmlTotal = '';
  elegiveis.forEach(al => {
    htmlTotal += compGerarHtmlFichaCompensacao(al);
    CompState.ultimasFaltasImpressas[al] = compObterFaltasAteHoje(al);
  });

  const turmaBruta = CompState.turmaInfo.turma || document.getElementById('codigoTurma')?.value || 'TURMA';
  const turmaSanitizada = turmaBruta.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u00C0-\u00FF-]/g, '') || 'TURMA';
  const iso = compObterDataHojeIso();
  const partes = (iso || '').split('-');
  const aa = (partes[0] || '2026').slice(-2);
  const mm = partes[1] || '01';
  const dd = partes[2] || '01';
  const nomeArquivo = `Compensacao_${turmaSanitizada}_Todos_Hoje_${dd}_${mm}_${aa}.pdf`;

  await compExecutarImpressaoDocumento(htmlTotal, nomeArquivo);
  compMostrarToast('Impressão em Lote Enviada', `${elegiveis.length} ficha(s) de discentes enviada(s) para impressão!`);

  compRenderizarDiario();
  compRenderizarVariaveis();
}

/**
 * Ajusta a data simulada de "Hoje" somando ou subtraindo dias letivos / corridos.
 * @param {-1|1} delta
 */
function compNavegarDataSimulada(delta) {
  const atual = compObterDataHojeIso();
  const now = new Date();
  const hojeRealIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (delta > 0 && atual >= hojeRealIso) {
    compMostrarToast('Limite da Chamada', 'A chamada está travada na data de hoje.', 'info');
    return;
  }
  const dias = CompState.diasLetivos;

  if (dias.length > 0) {
    // Se a data atual estiver dentro dos dias letivos ou próxima, salta para o dia letivo anterior/próximo
    const idx = dias.indexOf(atual);
    if (idx !== -1) {
      const nextIdx = idx + delta;
      if (nextIdx >= 0 && nextIdx < dias.length) {
        if (dias[nextIdx] > hojeRealIso) {
          compMostrarToast('Limite da Chamada', 'A chamada está travada na data de hoje.', 'info');
          return;
        }
        compDefinirDataSimulada(dias[nextIdx]);
        return;
      }
    } else {
      // Procura primeiro dia letivo maior ou menor
      if (delta > 0) {
        const prox = dias.find(d => d > atual && d <= hojeRealIso);
        if (prox) { compDefinirDataSimulada(prox); return; }
        compMostrarToast('Limite da Chamada', 'A chamada está travada na data de hoje.', 'info');
        return;
      } else {
        const rev = [...dias].reverse();
        const ant = rev.find(d => d < atual);
        if (ant) { compDefinirDataSimulada(ant); return; }
      }
    }
  }

  // Fallback: +/- 1 dia no calendário geral
  const [y, m, d] = atual.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + delta);
  const novaIso = dateObj.toISOString().slice(0, 10);
  if (delta > 0 && novaIso > hojeRealIso) {
    compMostrarToast('Limite da Chamada', 'A chamada está travada na data de hoje.', 'info');
    return;
  }
  compDefinirDataSimulada(novaIso);
}

/**
 * Define explicitamente a data de teste simulada e atualiza todos os componentes.
 * @param {string} isoDate
 */
function compDefinirDataSimulada(isoDate) {
  CompState.dataSimuladaHoje = isoDate;
  if (isoDate && isoDate.length >= 7) {
    CompState.mesNavegacao = isoDate.slice(0, 7);
  }
  compRenderizarDiario();
  compRenderizarVariaveis();
}

/**
 * Restaura a data de teste simulada para o "Hoje Real" da máquina.
 */
function compResetarDataSimuladaHoje() {
  CompState.dataSimuladaHoje = null;
  CompState.mesNavegacao = compObterDataHojeIso().slice(0, 7);
  compRenderizarDiario();
  compRenderizarVariaveis();
  compMostrarToast('Data Atualizada', `Data de referência restaurada para Hoje Real (${compIsoToDDMMAAAA(compObterDataHojeIso())}).`, 'info');
}

// ==========================================================================
// NAVEGAÇÃO DE MESES E FILTRO DE EXIBIÇÃO TEMPORAL
// ==========================================================================

/**
 * Retorna a lista ordenada de meses únicos (YYYY-MM) presentes nos dias letivos da turma
 * @returns {string[]}
 */
function compObterMesesDisponiveisTurma() {
  const dias = CompState.diasLetivos || [];
  const setMeses = new Set();
  dias.forEach(d => {
    if (d && d.length >= 7) {
      setMeses.add(d.slice(0, 7));
    }
  });
  return Array.from(setMeses).sort();
}

/**
 * Retorna o mês ativo de navegação (YYYY-MM), garantindo fallback válido
 * @returns {string}
 */
function compObterMesAtivoNavegacao() {
  const meses = compObterMesesDisponiveisTurma();
  if (meses.length === 0) {
    return compObterDataHojeIso().slice(0, 7);
  }

  if (CompState.mesNavegacao && meses.includes(CompState.mesNavegacao)) {
    return CompState.mesNavegacao;
  }

  const mesHoje = compObterDataHojeIso().slice(0, 7);
  if (meses.includes(mesHoje)) {
    CompState.mesNavegacao = mesHoje;
    return mesHoje;
  }

  CompState.mesNavegacao = meses[0];
  return meses[0];
}

/**
 * Converte 'YYYY-MM' para nome por extenso (ex: '2026-10' -> 'Outubro / 2026')
 */
function compFormatarNomeMesAno(yyyyMm) {
  if (!yyyyMm || !yyyyMm.includes('-')) return '';
  const [y, m] = yyyyMm.split('-').map(Number);
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const nome = nomesMeses[m - 1] || '';
  return `${nome} / ${y}`;
}

/**
 * Converte 'YYYY-MM' para formato abreviado (ex: '2026-10' -> 'Out/26')
 */
function compFormatarNomeMesAnoAbrev(yyyyMm) {
  if (!yyyyMm || !yyyyMm.includes('-')) return '';
  const [y, m] = yyyyMm.split('-');
  const abrevs = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const mesNum = parseInt(m, 10);
  const nome = abrevs[mesNum - 1] || m;
  const aa = (y || '').slice(-2);
  return `${nome}/${aa}`;
}

/**
 * Retorna o texto formatado para o visor da barra de meses de acordo com a quantidade
 */
function compObterTextoDisplayMesNavegacao() {
  const mesAtivo = compObterMesAtivoNavegacao();
  if (CompState.qtdMesesExibicao === 'todos') {
    return 'Todos os Meses';
  }
  const meses = compObterMesesDisponiveisTurma();
  const idx = meses.indexOf(mesAtivo);
  const startIdx = idx === -1 ? 0 : idx;
  const qtd = typeof CompState.qtdMesesExibicao === 'number' ? CompState.qtdMesesExibicao : 1;
  const selecionados = meses.slice(startIdx, startIdx + qtd);
  if (selecionados.length > 1) {
    const p1 = compFormatarNomeMesAnoAbrev(selecionados[0]);
    const p2 = compFormatarNomeMesAnoAbrev(selecionados[selecionados.length - 1]);
    return `${p1} – ${p2}`;
  }
  return compFormatarNomeMesAno(mesAtivo);
}

/**
 * Navega para o mês anterior (-1) ou próximo (1) na lista de meses da turma
 */
function compNavegarMes(delta) {
  const meses = compObterMesesDisponiveisTurma();
  if (meses.length === 0) return;

  const mesAtual = compObterMesAtivoNavegacao();
  const idx = meses.indexOf(mesAtual);

  let novoIdx = (idx === -1) ? 0 : idx + delta;
  if (novoIdx < 0) novoIdx = 0;
  if (novoIdx >= meses.length) novoIdx = meses.length - 1;

  CompState.mesNavegacao = meses[novoIdx];
  compRenderizarDiario();
}

/**
 * Altera a quantidade de meses exibidos simultaneamente (1, 2, 3, 6 ou 'todos')
 */
function compMudarQtdMeses(novaQtd) {
  if (novaQtd === 'todos') {
    CompState.qtdMesesExibicao = 'todos';
  } else {
    const n = parseInt(novaQtd, 10);
    CompState.qtdMesesExibicao = isNaN(n) || n < 1 ? 1 : n;
  }
  compRenderizarDiario();
}

/**
 * Filtra os dias letivos conforme o recorte de meses selecionado.
 * Quando o usuário seleciona um mês, o calendário de presenças é mostrado naquele mês.
 * Se n > 1, mostra o mês atual e os próximos N-1 meses.
 * @param {string[]} todosDias
 * @returns {string[]}
 */
function compFiltrarDiasPorMesesSelecionados(todosDias) {
  if (!todosDias || todosDias.length === 0) return [];
  if (CompState.qtdMesesExibicao === 'todos') return todosDias;

  const meses = compObterMesesDisponiveisTurma();
  if (meses.length === 0) return todosDias;

  const mesInicial = compObterMesAtivoNavegacao();
  const idx = meses.indexOf(mesInicial);
  const startIdx = idx === -1 ? 0 : idx;
  const qtd = typeof CompState.qtdMesesExibicao === 'number' ? CompState.qtdMesesExibicao : 1;

  const mesesPermitidos = new Set(meses.slice(startIdx, startIdx + qtd));

  return todosDias.filter(d => mesesPermitidos.has(d.slice(0, 7)));
}

/**
 * Recalcula os valores automáticos de todas as variáveis para o discente ativo.
 * TRAVA: ch_aulas_dadas jamais pode ser maior que ch_total_curso.
 * @param {string|null} alunoNome
 * @returns {{ [canonicalKey: string]: any }}
 */
function compCalcularValoresVariaveis(alunoNome) {
  const valores = {};
  const aluno = alunoNome || CompState.alunoAtivo || (CompState.alunos.length > 0 ? CompState.alunos[0] : null);
  const chTotal = CompState.turmaInfo.chTotal || 40;

  // 1. aluno_nome
  valores['aluno_nome'] = aluno || 'Nenhum discente selecionado';

  // 2. curso_nome
  valores['curso_nome'] = CompState.turmaInfo.curso || '';

  // 3. docente_nome
  valores['docente_nome'] = CompState.turmaInfo.docente || '';

  // 4. ch_total_curso
  valores['ch_total_curso'] = `${chTotal}h`;

  // 5. turma_codigo
  valores['turma_codigo'] = CompState.turmaInfo.turma || '';

  // 6. justificativa_texto (deixar em branco por padrão conforme Dica IDE)
  valores['justificativa_texto'] = '';

  // 7. comprovante_tipo (checkboxes / texto descritivo)
  valores['comprovante_tipo'] = 'Sem Comprovante';

  // 8. ch_curso_disciplina (espelho da carga horária total)
  valores['ch_curso_disciplina'] = `${chTotal}h`;

  // 9. ch_aulas_dadas: soma das horas das aulas até "hoje" (compObterDataHojeIso()),
  // NUNCA PODE SER MAIOR QUE ch_total_curso!
  const hojeIso = compObterDataHojeIso();
  let aulasDadasHoras = 0;

  for (const dKey of CompState.diasLetivos) {
    const h = compObterHorasAula(dKey);
    if (dKey <= hojeIso) {
      aulasDadasHoras += h;
    }
  }

  // Trava institucional rigorosa: jamais maior que a carga total da disciplina
  if (aulasDadasHoras > chTotal) {
    aulasDadasHoras = chTotal;
  }
  aulasDadasHoras = Math.round(aulasDadasHoras * 100) / 100;
  valores['ch_aulas_dadas'] = `${aulasDadasHoras}h`;

  // 10. total_horas_faltas: soma estritamente sobre os DIAS LETIVOS VÁLIDOS do aluno ativo
  let totalFaltasHoras = 0;
  if (aluno && CompState.faltasPorAluno[aluno]) {
    const faltas = CompState.faltasPorAluno[aluno];
    for (const dKey of CompState.diasLetivos) {
      totalFaltasHoras += Number(faltas[dKey]) || 0;
    }
  }
  valores['total_horas_faltas'] = `${totalFaltasHoras}h`;

  // 11. porcentagem_frequencia (divisão direta da assiduidade arredondada para baixo)
  // Fórmula institucional: ((CH_Total - Faltas) / CH_Total) * 100
  let freqPercent = Math.floor(((chTotal - totalFaltasHoras) / chTotal) * 100);
  if (freqPercent < 0) freqPercent = 0;
  if (freqPercent > 100) freqPercent = 100;
  valores['porcentagem_frequencia'] = `${freqPercent}%`;

  // 12. data_notificacao (data de hoje pré-preenchida, respeitando dataSimuladaHoje)
  const [hY, hM, hD] = hojeIso.split('-').map(Number);
  const dataHojeObj = new Date(hY, hM - 1, hD);
  const dataExtensaPadrao = compDataExtensoBR(dataHojeObj);
  valores['data_notificacao'] = compIsoToDDMMAAAA(hojeIso);

  // 13, 14, 15: Situações de frequência mutuamente exclusivas / automáticas
  valores['situacao_tender_nao_cert']   = freqPercent >= 75;
  valores['situacao_nao_cert']          = freqPercent >= 40 && freqPercent < 75;
  valores['situacao_nao_cert_excesso']  = freqPercent < 40;

  // 16. data_autorizacao_extenso (Área da Coordenação)
  valores['data_autorizacao_extenso'] = CompState.coordenacao.dataExtenso || dataExtensaPadrao;

  // 17. deferido_status (Área da Coordenação)
  const coordAluno = compObterCoordenacaoAluno(aluno);
  valores['deferido_status'] = coordAluno.deferido || 'sim';

  // 18. observacao_coordenador (Área da Coordenação)
  valores['observacao_coordenador'] = coordAluno.observacao || '';

  // 19. tabela_reposicao_linhas
  valores['tabela_reposicao_linhas'] = '0 linhas planejadas';

  // 20. total_horas_previstas_reposicao
  valores['total_horas_previstas_reposicao'] = '00:00';

  // 21. total_horas_faltas_tabela
  valores['total_horas_faltas_tabela'] = compFormatarHorasParaHHMM(totalFaltasHoras);

  // 22. total_horas_realizadas_reposicao
  valores['total_horas_realizadas_reposicao'] = '00:00';

  // 23. observacao_reposicao (3 linhas livres)
  valores['observacao_reposicao'] = '';

  // 24. data_conclusao_reposicao
  valores['data_conclusao_reposicao'] = '';

  // Aplica overrides manuais do aluno se existirem
  if (aluno && CompState.overrides[aluno]) {
    const ov = CompState.overrides[aluno];
    for (const [k, v] of Object.entries(ov)) {
      if (v !== undefined && v !== null) {
        valores[k] = v;
      }
    }
  }

  return valores;
}

/** Converte data em extenso: "São Paulo, DD de MMMM de AAAA" */
function compDataExtensoBR(dateObj) {
  const d = dateObj || new Date();
  const dia = String(d.getDate()).padStart(2, '0');
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const mes = meses[d.getMonth()];
  const ano = d.getFullYear();
  return `São Paulo, ${dia} de ${mes} de ${ano}`;
}

/** Formata número de horas para formato HH:MM */
function compFormatarHorasParaHHMM(horasDecimais) {
  const h = Math.floor(horasDecimais);
  const m = Math.round((horasDecimais - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ==========================================================================
// RENDERIZAÇÃO DA SIDEBAR DE VARIÁVEIS (24 CAMPOS COM OVERRIDE E HINTS)
// ==========================================================================

function compRenderizarVariaveis() {
  const container = document.getElementById('comp-variaveis-container');
  if (!container) return;

  container.innerHTML = '';
  const aluno = CompState.alunoAtivo || (CompState.alunos.length > 0 ? CompState.alunos[0] : null);
  const valoresCalculados = compCalcularValoresVariaveis(aluno);
  const overridesDoAluno = (aluno && CompState.overrides[aluno]) ? CompState.overrides[aluno] : {};

  for (const v of COMP_VARIAVEIS_META) {
    const config = CompState.variaveisConfig[v.key] || {};
    const valorAtual = valoresCalculados[v.key];
    const isOverridden = overridesDoAluno.hasOwnProperty(v.key);
    const isProtected = v.protegida && !compIsCoordenacaoDesbloqueada();

    const itemCard = document.createElement('div');
    itemCard.className = `comp-var-item-card${isOverridden ? ' is-overridden' : ''}`;
    itemCard.dataset.varKey = v.key;

    // Header do card
    const itemHeader = document.createElement('div');
    itemHeader.className = 'comp-var-item-header';
    itemHeader.style.display = 'flex';
    itemHeader.style.justifyContent = 'space-between';
    itemHeader.style.alignItems = 'center';
    itemHeader.style.marginBottom = '6px';

    const leftHeader = document.createElement('div');
    leftHeader.style.display = 'flex';
    leftHeader.style.alignItems = 'center';
    leftHeader.style.gap = '6px';
    leftHeader.innerHTML = `
      <span class="comp-var-key-tag" title="Identificador Canônico: ${v.key}">${v.key}</span>
      ${v.protegida ? `<span title="Protegido por senha da coordenação" style="font-size:10px;">🔒</span>` : ''}
    `;

    const rightHeader = document.createElement('div');
    rightHeader.style.display = 'flex';
    rightHeader.style.alignItems = 'center';
    rightHeader.style.gap = '4px';

    if (isOverridden) {
      rightHeader.innerHTML = `
        <span class="comp-var-override-badge-yellow" title="Este valor foi editado manualmente (clique no x para restaurar)">
          override
          <button type="button" class="override-x-btn" onclick="compResetarOverrideVariavel('${v.key}')" title="Restaurar cálculo automático">✕</button>
        </span>
      `;
    } else {
      rightHeader.innerHTML = `<span class="comp-var-calc-badge" title="Calculado automaticamente pelo motor">Calculado</span>`;
    }

    itemHeader.appendChild(leftHeader);
    itemHeader.appendChild(rightHeader);
    itemCard.appendChild(itemHeader);

    // Linha com 3 campos:
    const inputsRow = document.createElement('div');
    inputsRow.className = 'comp-var-inputs-3grid';

    // Coluna 1: Valor / Nome
    const colValor = document.createElement('div');
    colValor.className = 'comp-var-field';
    colValor.innerHTML = `<label>${config.nome || v.nome}</label>`;

    if (v.tipo === 'boolean') {
      const boolWrap = document.createElement('div');
      boolWrap.style.display = 'flex';
      boolWrap.style.alignItems = 'center';
      boolWrap.style.gap = '6px';
      boolWrap.style.height = '26px';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!valorAtual;
      chk.disabled = isProtected;
      chk.addEventListener('change', (e) => {
        compRegistrarOverride(v.key, e.target.checked);
      });
      const lbl = document.createElement('span');
      lbl.style.fontSize = '10px';
      lbl.textContent = valorAtual ? 'Marcada' : 'Desmarcada';
      boolWrap.appendChild(chk);
      boolWrap.appendChild(lbl);
      colValor.appendChild(boolWrap);
    } else {
      const inputValor = document.createElement('input');
      inputValor.type = 'text';
      inputValor.className = `comp-var-input${isProtected ? ' comp-field-locked' : ''}`;
      inputValor.value = (valorAtual !== undefined && valorAtual !== null) ? valorAtual : '';
      inputValor.placeholder = isProtected ? 'Bloqueado (Senha)' : 'Valor...';
      inputValor.readOnly = isProtected;
      inputValor.title = isProtected ? 'Desbloqueie a Área da Coordenação para editar' : 'Edite para aplicar override manual';
      inputValor.addEventListener('change', (e) => {
        compRegistrarOverride(v.key, e.target.value.trim());
      });
      colValor.appendChild(inputValor);
    }
    inputsRow.appendChild(colValor);

    // Coluna 2: Função / Hint (hover)
    const colFuncao = document.createElement('div');
    colFuncao.className = 'comp-var-field';
    colFuncao.innerHTML = `<label>Função (Hint)</label>`;
    const inputFuncao = document.createElement('input');
    inputFuncao.type = 'text';
    inputFuncao.className = 'comp-var-input';
    inputFuncao.value = config.funcao || v.funcao;
    inputFuncao.title = config.funcao || v.funcao;
    inputFuncao.addEventListener('input', (e) => {
      CompState.variaveisConfig[v.key].funcao = e.target.value;
      inputFuncao.title = e.target.value;
    });
    colFuncao.appendChild(inputFuncao);
    inputsRow.appendChild(colFuncao);

    // Coluna 3: Dica IDE
    const colDica = document.createElement('div');
    colDica.className = 'comp-var-field';
    colDica.innerHTML = `<label>Dica IDE</label>`;
    const inputDica = document.createElement('input');
    inputDica.type = 'text';
    inputDica.className = 'comp-var-input';
    inputDica.value = config.dica || v.dica;
    inputDica.title = config.dica || v.dica;
    inputDica.addEventListener('input', (e) => {
      CompState.variaveisConfig[v.key].dica = e.target.value;
      inputDica.title = e.target.value;
    });
    colDica.appendChild(inputDica);
    inputsRow.appendChild(colDica);

    itemCard.appendChild(inputsRow);
    container.appendChild(itemCard);
  }
}

function compRegistrarOverride(key, valor) {
  const aluno = CompState.alunoAtivo || (CompState.alunos.length > 0 ? CompState.alunos[0] : '_global');
  if (!CompState.overrides[aluno]) {
    CompState.overrides[aluno] = {};
  }
  CompState.overrides[aluno][key] = valor;
  compRenderizarVariaveis();
}

function compResetarOverrideVariavel(key) {
  const aluno = CompState.alunoAtivo || (CompState.alunos.length > 0 ? CompState.alunos[0] : '_global');
  if (CompState.overrides[aluno] && CompState.overrides[aluno].hasOwnProperty(key)) {
    delete CompState.overrides[aluno][key];
  }
  compRenderizarVariaveis();
}

function compRestaurarTodosOverrides() {
  const aluno = CompState.alunoAtivo || (CompState.alunos.length > 0 ? CompState.alunos[0] : '_global');
  if (CompState.overrides[aluno]) {
    delete CompState.overrides[aluno];
  }
  compRenderizarVariaveis();
}

// ==========================================================================
// SEGURANÇA E ÁREA DA COORDENAÇÃO (PROTEÇÃO POR SENHA)
// ==========================================================================

function compInicializarModalCoordenacao() {
  const btnLock = document.getElementById('comp-btn-lock-coord');
  const modal = document.getElementById('comp-coord-modal');
  const btnClose = document.getElementById('comp-coord-modal-close');
  const btnCancel = document.getElementById('comp-coord-modal-cancel');
  const btnConfirm = document.getElementById('comp-coord-modal-confirm');
  const btnRelock = document.getElementById('comp-coord-btn-lock');
  const inputPwd = document.getElementById('comp-coord-password-input');
  const errorMsg = document.getElementById('comp-coord-error-msg');

  if (!btnLock || !modal) return;

  function abrirModal() {
    if (errorMsg) errorMsg.style.display = 'none';
    if (inputPwd) inputPwd.value = '';
    if (btnRelock) {
      btnRelock.style.display = CompState.coordenacao.desbloqueada ? 'inline-flex' : 'none';
    }
    modal.style.display = 'flex';
    setTimeout(() => { if (inputPwd) inputPwd.focus(); }, 100);
  }

  function fecharModal() {
    modal.style.display = 'none';
  }

  btnLock.addEventListener('click', abrirModal);
  if (btnClose) btnClose.addEventListener('click', fecharModal);
  if (btnCancel) btnCancel.addEventListener('click', fecharModal);

  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      const digitada = inputPwd ? inputPwd.value.trim() : '';
      if (digitada.toLowerCase() === COMP_SENHA_COORDENACAO.toLowerCase()) {
        CompState.coordenacao.desbloqueada = true;
        btnLock.innerHTML = '🔓 Coordenação (Livre)';
        btnLock.classList.add('btn-coord-unlocked');
        fecharModal();
        compRenderizarVariaveis();
      } else {
        if (errorMsg) errorMsg.style.display = 'block';
        if (inputPwd) inputPwd.select();
      }
    });
  }

  if (inputPwd) {
    inputPwd.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnConfirm.click();
    });
  }

  if (btnRelock) {
    btnRelock.addEventListener('click', () => {
      CompState.coordenacao.desbloqueada = false;
      btnLock.innerHTML = '🔒 Coordenação';
      btnLock.classList.remove('btn-coord-unlocked');
      fecharModal();
      compRenderizarVariaveis();
    });
  }
}

// ==========================================================================
// FASE 2: CALENDÁRIO DE CHAMADAS COM FLIP & MODAL DE FALTA CUSTOMIZADA
// ==========================================================================

let _modalAulaAtiva = null; // { aluno, isoDate, horasAula, horasFaltaAtual }

function compInicializarModalAula() {
  const modal = document.getElementById('comp-lesson-modal');
  const btnClose = document.getElementById('comp-lesson-modal-close');
  const btnCancel = document.getElementById('comp-lesson-modal-cancel');
  const btnSave = document.getElementById('comp-lesson-modal-save');
  const inputHoras = document.getElementById('comp-lesson-horas-input');
  const inputObs = document.getElementById('comp-lesson-obs-input');
  const btnDec = document.getElementById('comp-stitch-btn-decrement');
  const btnInc = document.getElementById('comp-stitch-btn-increment');

  if (!modal) return;

  function fechar() {
    modal.style.display = 'none';
    _modalAulaAtiva = null;
  }

  if (btnClose) btnClose.addEventListener('click', fechar);
  if (btnCancel) btnCancel.addEventListener('click', fechar);

  if (btnDec) {
    btnDec.addEventListener('click', () => {
      if (!inputHoras) return;
      let val = (parseFloat(inputHoras.value) || 0) - 0.5;
      if (val < 0) val = 0;
      inputHoras.value = String(Math.round(val * 100) / 100);
      compAtualizarPillAtivaModalFalta(val);
    });
  }

  if (btnInc) {
    btnInc.addEventListener('click', () => {
      if (!inputHoras || !_modalAulaAtiva) return;
      let val = (parseFloat(inputHoras.value) || 0) + 0.5;
      if (val > _modalAulaAtiva.horasAula) val = _modalAulaAtiva.horasAula;
      inputHoras.value = String(Math.round(val * 100) / 100);
      compAtualizarPillAtivaModalFalta(val);
    });
  }

  if (inputHoras) {
    inputHoras.addEventListener('input', () => {
      const val = parseFloat(inputHoras.value) || 0;
      compAtualizarPillAtivaModalFalta(val);
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      if (!_modalAulaAtiva) return;
      const { aluno, isoDate, horasAula } = _modalAulaAtiva;
      let val = parseFloat(inputHoras ? inputHoras.value : 0) || 0;
      if (val < 0) val = 0;
      if (val > horasAula) val = horasAula;

      if (!CompState.faltasPorAluno[aluno]) {
        CompState.faltasPorAluno[aluno] = {};
      }

      if (val > 0) {
        CompState.faltasPorAluno[aluno][isoDate] = Math.round(val * 100) / 100;
      } else {
        delete CompState.faltasPorAluno[aluno][isoDate];
      }

      // Observação pontual
      const obs = inputObs ? inputObs.value.trim() : '';
      if (!CompState.observacoesPorDia[aluno]) {
        CompState.observacoesPorDia[aluno] = {};
      }
      if (obs) {
        CompState.observacoesPorDia[aluno][isoDate] = obs;
      } else {
        delete CompState.observacoesPorDia[aluno][isoDate];
      }

      fechar();
      compSalvarTurmaAtualStorage();
      compRenderizarDiario();
      compRenderizarVariaveis();
      compAtualizarBannerContextual();
    });
  }
}

/**
 * Atualiza o destaque visual (borda / foco) da pílula de falta correspondente ao valor digitado
 */
function compAtualizarPillAtivaModalFalta(valorAtual) {
  const pills = document.querySelectorAll('.comp-stitch-pill');
  pills.forEach(p => {
    const pVal = parseFloat(p.dataset.val);
    if (!isNaN(pVal) && Math.abs(pVal - valorAtual) < 0.05) {
      p.classList.add('is-selected');
    } else {
      p.classList.remove('is-selected');
    }
  });
}

let _modalNotaAtiva = null; // { aluno, isoDate }

/**
 * Inicializa os ouvintes do modal dedicado a anotações/ocorrências da falta no calendário.
 */
function compInicializarModalNota() {
  const modal = document.getElementById('comp-note-modal');
  const btnClose = document.getElementById('comp-note-modal-close');
  const btnCancel = document.getElementById('comp-note-modal-cancel');
  const btnRemove = document.getElementById('comp-note-modal-remove');
  const btnSave = document.getElementById('comp-note-modal-save');
  const inputNote = document.getElementById('comp-note-input');

  if (!modal) return;

  function fechar() {
    modal.style.display = 'none';
    _modalNotaAtiva = null;
  }

  if (btnClose) btnClose.addEventListener('click', fechar);
  if (btnCancel) btnCancel.addEventListener('click', fechar);

  if (btnRemove) {
    btnRemove.addEventListener('click', () => {
      if (!_modalNotaAtiva) return;
      const { aluno, isoDate } = _modalNotaAtiva;
      if (CompState.observacoesPorDia[aluno]) {
        delete CompState.observacoesPorDia[aluno][isoDate];
      }
      fechar();
      compSalvarTurmaAtualStorage();
      compRenderizarDiario();
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      if (!_modalNotaAtiva) return;
      const { aluno, isoDate } = _modalNotaAtiva;
      const texto = inputNote ? inputNote.value.trim() : '';

      if (!CompState.observacoesPorDia[aluno]) {
        CompState.observacoesPorDia[aluno] = {};
      }

      if (texto) {
        CompState.observacoesPorDia[aluno][isoDate] = texto;
      } else {
        delete CompState.observacoesPorDia[aluno][isoDate];
      }

      fechar();
      compSalvarTurmaAtualStorage();
      compRenderizarDiario();
    });
  }
}

/**
 * Abre o modal de anotação/ocorrência da falta para o discente e dia letivo informado.
 */
function compAbrirModalNotaDia(aluno, isoDate) {
  const modal = document.getElementById('comp-note-modal');
  if (!modal) return;

  _modalNotaAtiva = { aluno, isoDate };

  const obsAtual = (CompState.observacoesPorDia[aluno] || {})[isoDate] || '';
  const titleEl = document.getElementById('note-modal-title');
  const subEl = document.getElementById('note-modal-subtitle');
  const inputNote = document.getElementById('comp-note-input');
  const btnRemove = document.getElementById('comp-note-modal-remove');

  const idxAula = CompState.diasLetivos.indexOf(isoDate) + 1;
  if (titleEl) titleEl.textContent = `Nota / Ocorrência • Aula ${idxAula}`;
  if (subEl) subEl.textContent = `${compIsoToDDMMAAAA(isoDate)} • ${aluno}`;
  if (inputNote) {
    inputNote.value = obsAtual;
  }
  if (btnRemove) {
    btnRemove.style.display = obsAtual ? 'inline-flex' : 'none';
  }

  modal.style.display = 'flex';
  setTimeout(() => {
    if (inputNote) inputNote.focus();
  }, 100);
}


/**
 * Abre o modal de customização da falta para um dia letivo específico.
 * Renderiza dinamicamente a grade de 1 a 8 faltas (mais Presença e Integral)
 * baseada em aula de 55min (55/60h) ou 1h.
 */
function compAbrirModalPersonalizarFalta(aluno, isoDate) {
  const modal = document.getElementById('comp-lesson-modal');
  if (!modal) return;

  const horasAula = compObterHorasAula(isoDate);
  const faltasAluno = (CompState.faltasPorAluno[aluno] || {})[isoDate] || 0;
  const obsAluno = (CompState.observacoesPorDia[aluno] || {})[isoDate] || '';

  _modalAulaAtiva = {
    aluno,
    isoDate,
    horasAula,
    horasFaltaAtual: faltasAluno,
  };

  const titleEl = document.getElementById('lesson-modal-title');
  const subEl = document.getElementById('lesson-modal-subtitle');
  const chMaxEl = document.getElementById('comp-lesson-ch-max');
  const baseHintEl = document.getElementById('comp-modal-base-hint');
  const inputHoras = document.getElementById('comp-lesson-horas-input');
  const inputObs = document.getElementById('comp-lesson-obs-input');
  const grid1a8 = document.getElementById('comp-modal-grid-1a8');

  const idxAula = CompState.diasLetivos.indexOf(isoDate) + 1;
  if (titleEl) titleEl.innerHTML = `Aula ${idxAula} <span class="comp-stitch-sep">•</span> ${compIsoToDDMMAAAA(isoDate)}`;
  if (subEl) subEl.innerHTML = `Discente: <strong>${compEscapeHTML(aluno)}</strong> <span class="comp-stitch-sep">•</span> Carga do Dia: <strong>${compFormatarHorasDecimais(horasAula)}</strong>`;
  const duracao1Aula = compObterDuracaoAulaIndividual(isoDate);
  const min1Aula = Math.round(duracao1Aula * 60);

  if (chMaxEl) {
    chMaxEl.textContent = `Carga: ${compFormatarHorasDecimais(horasAula)}`;
  }
  if (baseHintEl) {
    baseHintEl.textContent = `Base: ${min1Aula} min/falta (${compFormatarHorasDecimais(duracao1Aula)})`;
  }
  if (inputHoras) {
    inputHoras.max = String(horasAula);
    inputHoras.value = String(faltasAluno);
  }
  if (inputObs) inputObs.value = obsAluno;

  // Monta botões dinâmicos de 0 (Presença), 1 a N faltas e Integral
  if (grid1a8) {
    grid1a8.innerHTML = '';
    const aulaObj = CompState.aulasMap.get(isoDate);
    const maxAulasDia = (aulaObj && aulaObj.aulasPorDia)
      ? aulaObj.aulasPorDia
      : (CompState.turmaInfo.aulasPorDia || Math.round(horasAula / duracao1Aula) || 4);
    const totalSlots = Math.min(Math.max(maxAulasDia, 2), 8);

    // Botão 0 Faltas (Presença Plena)
    const isZeroActive = faltasAluno === 0;
    const btnZero = document.createElement('button');
    btnZero.type = 'button';
    btnZero.dataset.val = '0';
    btnZero.className = `comp-stitch-pill comp-stitch-pill-presenca${isZeroActive ? ' is-selected' : ''}`;
    btnZero.innerHTML = `
      <span class="comp-stitch-pill-title">
        <span class="comp-stitch-dot-green"></span> 0 (Presença)
      </span>
      <span class="comp-stitch-pill-hours">0h00</span>
    `;
    btnZero.onclick = () => {
      if (inputHoras) inputHoras.value = '0';
      compAtualizarPillAtivaModalFalta(0);
    };
    grid1a8.appendChild(btnZero);

    // Botões de 1 a totalSlots faltas
    for (let f = 1; f <= totalSlots; f++) {
      let hVal = f * duracao1Aula;
      if (hVal > horasAula) hVal = horasAula;
      hVal = Math.round(hVal * 100) / 100;

      const isFActive = Math.abs(faltasAluno - hVal) < 0.05;
      const btnF = document.createElement('button');
      btnF.type = 'button';
      btnF.dataset.val = String(hVal);
      btnF.className = `comp-stitch-pill${isFActive ? ' is-selected' : ''}`;
      const labelHora = compFormatarHorasDecimais(hVal);
      btnF.innerHTML = `
        <span class="comp-stitch-pill-title">${f} falta${f > 1 ? 's' : ''}</span>
        <span class="comp-stitch-pill-hours comp-stitch-text-coral">${labelHora}</span>
      `;
      btnF.onclick = () => {
        if (inputHoras) inputHoras.value = String(hVal);
        compAtualizarPillAtivaModalFalta(hVal);
      };
      grid1a8.appendChild(btnF);
    }

    // Botão Falta Integral
    const isFullActive = Math.abs(faltasAluno - horasAula) < 0.05 && faltasAluno > 0;
    const btnFull = document.createElement('button');
    btnFull.type = 'button';
    btnFull.dataset.val = String(horasAula);
    btnFull.className = `comp-stitch-pill comp-stitch-pill-integral${isFullActive ? ' is-selected' : ''}`;
    btnFull.innerHTML = `
      <span class="comp-stitch-pill-title comp-stitch-text-coral">Integral</span>
      <span class="comp-stitch-pill-hours comp-stitch-text-coral">${compFormatarHorasDecimais(horasAula)}</span>
    `;
    btnFull.onclick = () => {
      if (inputHoras) inputHoras.value = String(horasAula);
      compAtualizarPillAtivaModalFalta(horasAula);
    };
    grid1a8.appendChild(btnFull);
  }

  modal.style.display = 'flex';
  setTimeout(() => { if (inputHoras) inputHoras.focus(); }, 100);
}

/**
 * AÇÃO 'FLIP' (1 clique rápido):
 * Alterna entre Presença (0h) e Falta Integral (carga do dia).
 */
function compToggleFlipFalta(aluno, isoDate) {
  const horasAula = compObterHorasAula(isoDate);

  if (!CompState.faltasPorAluno[aluno]) {
    CompState.faltasPorAluno[aluno] = {};
  }

  const faltaAtual = Number(CompState.faltasPorAluno[aluno][isoDate]) || 0;

  if (faltaAtual === 0) {
    // Flip para FALTA INTEGRAL
    CompState.faltasPorAluno[aluno][isoDate] = horasAula;
  } else {
    // Flip para PRESENÇA (0h)
    delete CompState.faltasPorAluno[aluno][isoDate];
  }

  compSalvarTurmaAtualStorage();
  compRenderizarDiario();
  compRenderizarVariaveis();
  compAtualizarBannerContextual();
}

/**
 * Define todas as aulas como presentes para o aluno ativo.
 */
function compMarcarTodosPresentes(aluno) {
  if (CompState.faltasPorAluno[aluno]) {
    delete CompState.faltasPorAluno[aluno];
  }
  compSalvarTurmaAtualStorage();
  compRenderizarDiario();
  compRenderizarVariaveis();
}

/**
 * Define todas as aulas como falta integral para o aluno ativo.
 */
function compMarcarTodasFaltas(aluno) {
  if (!CompState.faltasPorAluno[aluno]) {
    CompState.faltasPorAluno[aluno] = {};
  }
  for (const dKey of CompState.diasLetivos) {
    CompState.faltasPorAluno[aluno][dKey] = compObterHorasAula(dKey);
  }
  compSalvarTurmaAtualStorage();
  compRenderizarDiario();
  compRenderizarVariaveis();
}

// ==========================================================================
// RENDERIZAÇÃO CENTRAL DO DIÁRIO (CALENDÁRIO DE CARDS OU TABELA GERAL)
// ==========================================================================

function compRenderizarDiario() {
  const container = document.getElementById('comp-diary-body');
  if (!container) return;

  // Sincroniza classes das abas de navegação do cabeçalho
  const btnComp = document.getElementById('comp-nav-tab-compensacao');
  const btnFis = document.getElementById('comp-nav-tab-fisico');
  if (btnComp) {
    btnComp.classList.toggle('is-active', CompState.subViewDiario === 'compensacao');
    btnComp.setAttribute('aria-selected', CompState.subViewDiario === 'compensacao' ? 'true' : 'false');
  }
  if (btnFis) {
    btnFis.classList.toggle('is-active', CompState.subViewDiario === 'fisico');
    btnFis.setAttribute('aria-selected', CompState.subViewDiario === 'fisico' ? 'true' : 'false');
  }

  const alunos = CompState.alunos;
  const dias = CompState.diasLetivos;

  if (alunos.length === 0) {
    container.innerHTML = `
      <div class="comp-empty-state">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>Nenhum aluno adicionado.<br>Use o campo ao lado para cadastrar discentes.</span>
      </div>`;
    return;
  }

  // Se não houver aluno ativo selecionado, ativa o primeiro
  if (!CompState.alunoAtivo || !alunos.includes(CompState.alunoAtivo)) {
    CompState.alunoAtivo = alunos[0];
  }

  const alunoAtivo = CompState.alunoAtivo;
  const chTotal = CompState.turmaInfo.chTotal || 40;

  // Filtra discentes: no topo da chamada, SOMENTE aparecem discentes com presença inferior a 90%
  // Para que o usuário sempre possa selecionar, caso o discente ativo tenha >=90%, ele também é mantido
  const alunosComFaltaOuCriticos = alunos.filter(al => {
    const faltas = CompState.faltasPorAluno[al] || {};
    let fTot = 0;
    for (const d of dias) fTot += Number(faltas[d]) || 0;
    const freq = Math.max(0, Math.floor(((chTotal - fTot) / chTotal) * 100));
    return freq < 90 || al === alunoAtivo;
  });

  // Garante que o dia atual seja sempre hoje
  CompState.dataSimuladaHoje = null;
  const dataHojeIso = compObterDataHojeIso();
  const dataHojeBR = compIsoToDDMMAAAA(dataHojeIso);

  // Navegação de meses e seletor de quantidade (n)
  const textoMesDisplay = compObterTextoDisplayMesNavegacao();
  const qtdMeses = CompState.qtdMesesExibicao;

  // Barra de Filtro e Navegação de Data do Stitch (FilterAndDateNavigationSection)
  let toolbarHtml = `
    <section class="stitch-date-filter-section" data-purpose="date-filter-section">
      <div class="stitch-filter-inner">
        <!-- Left Nav: Date & Month controls -->
        <div class="stitch-filter-left">
          <!-- Specific Date Navigator Pill -->
          <div class="stitch-pill-control">
            <button aria-label="Dia anterior" class="stitch-pill-arrow-btn" onclick="compNavegarDataSimulada(-1)" type="button">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <div class="stitch-pill-date-display">
              <i class="fa-regular fa-calendar-check"></i>
              <span>${dataHojeBR}</span>
            </div>
            <button aria-label="Próximo dia" class="stitch-pill-arrow-btn" onclick="compNavegarDataSimulada(1)" type="button">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <!-- Month Selector Pill -->
          <div class="stitch-pill-control">
            <button aria-label="Mês anterior" class="stitch-pill-arrow-btn" onclick="compNavegarMes(-1)" type="button">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span class="stitch-pill-month-text">${textoMesDisplay}</span>
            <button aria-label="Próximo mês" class="stitch-pill-arrow-btn" onclick="compNavegarMes(1)" type="button">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <!-- Range Interval Select -->
          <div class="stitch-select-wrapper">
            <select class="stitch-select-range" onchange="compMudarQtdMeses(this.value)" title="Quantidade de meses visíveis simultaneamente">
              <option value="1"${qtdMeses === 1 ? ' selected' : ''}>1 Mês</option>
              <option value="2"${qtdMeses === 2 ? ' selected' : ''}>2 Meses</option>
              <option value="3"${qtdMeses === 3 ? ' selected' : ''}>3 Meses</option>
              <option value="6"${qtdMeses === 6 ? ' selected' : ''}>6 Meses</option>
              <option value="todos"${qtdMeses === 'todos' ? ' selected' : ''}>Todos os Meses</option>
            </select>
            <div class="stitch-select-arrow">
              <i class="fa-solid fa-chevron-down"></i>
            </div>
          </div>
        </div>

        <!-- Right Controls: View Switcher and Legend Format -->
        <div class="stitch-filter-right">
          <!-- Legend format selector -->
          <div class="stitch-icon-selector-group">
            <span class="stitch-icon-label">Ícones:</span>
            <select class="stitch-icon-select" onchange="compMudarDesignIcones(this.value)" title="Escolha o estilo de ícones de presença/falta na tabela">
              <option value="1"${CompState.iconDesign === '1' ? ' selected' : ''}>1: . e | (Padrão)</option>
              <option value="2"${CompState.iconDesign === '2' ? ' selected' : ''}>2: P e F (Letras)</option>
              <option value="3"${CompState.iconDesign === '3' ? ' selected' : ''}>3: Símbolos Gráficos</option>
              <option value="4"${CompState.iconDesign === '4' ? ' selected' : ''}>4: ● e ■</option>
            </select>
          </div>
          <div class="stitch-divider-vertical"></div>

          <!-- View toggles: Tabela Geral / Calendário -->
          <div class="stitch-view-toggle-group" role="group">
            <button class="stitch-view-toggle-btn${CompState.viewMode === 'table' ? ' is-active' : ''}" onclick="compMudarModoVisualizacao('table')" type="button">
              <i class="fa-solid fa-table-list"></i>
              <span>Tabela Geral</span>
            </button>
            <button class="stitch-view-toggle-btn${CompState.viewMode === 'calendar' ? ' is-active' : ''}" onclick="compMudarModoVisualizacao('calendar')" type="button">
              <i class="fa-regular fa-calendar-days"></i>
              <span>Calendário</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  `;

  // Obtém os dias letivos filtrados pelo recorte de mês(es) selecionado(s)
  // e trava a chamada na data de hoje, sem mostrar dias posteriores
  const diasFiltrados = compFiltrarDiasPorMesesSelecionados(dias).filter(d => d <= dataHojeIso);

  // Renderiza corpo do modo selecionado
  if (CompState.viewMode === 'calendar') {
    container.innerHTML = toolbarHtml + compRenderizarModoCalendario(alunoAtivo, diasFiltrados, chTotal);
    compVincularEventosCardsCalendario(alunoAtivo);
  } else {
    container.innerHTML = toolbarHtml + compRenderizarModoTabela(alunos, diasFiltrados, chTotal);
    compVincularEventosTabelaGeral();
  }

  compAtualizarBannerContextual();
}

/**
 * Renderiza o Modo 1: Calendário Interativo de Chamadas com visualização por cards de aula.
 * A alteração de presença é exclusiva da Tabela Geral; o clique direito / long-press adiciona anotações/ocorrências.
 */
function compRenderizarModoCalendario(aluno, dias, chTotal) {
  const faltas = CompState.faltasPorAluno[aluno] || {};
  const dataHojeIso = compObterDataHojeIso();
  const dataEvasaoAtivoIso = compObterDataEvasaoAluno(aluno);
  const isEvadidoAtivo = Boolean(dataEvasaoAtivoIso);
  let totalFaltas = 0;
  for (const d of (CompState.diasLetivos || [])) {
    if (d <= dataHojeIso) {
      totalFaltas += Number(faltas[d]) || 0;
    }
  }
  const freq = Math.max(0, Math.floor(((chTotal - totalFaltas) / chTotal) * 100));

  let sitText = 'Tender a Não Certificado';
  let sitClass = 'stitch-tag-freq';
  if (freq < 40) {
    sitText = 'Não Certificado (Excesso de Faltas)';
    sitClass = 'stitch-tag-faltas';
  } else if (freq < 75) {
    sitText = 'Não Certificado';
    sitClass = 'stitch-tag-status';
  }

  // Ordena a lista de alunos para o dropdown
  const alunosOrdenados = [...(CompState.alunos || [])].sort((a, b) => {
    const evA = Boolean(CompState.evadidosPorAluno && CompState.evadidosPorAluno[a]);
    const evB = Boolean(CompState.evadidosPorAluno && CompState.evadidosPorAluno[b]);
    if (evA === evB) return 0;
    return evA ? 1 : -1;
  });

  const dropdownItemsHtml = alunosOrdenados.map(al => {
    const isSelected = al === aluno;
    const isEv = Boolean(CompState.evadidosPorAluno && CompState.evadidosPorAluno[al]);
    return `
      <button type="button"
              class="comp-student-dropdown-item${isSelected ? ' is-selected' : ''}${isEv ? ' is-evadido' : ''}"
              onclick="compSelecionarAlunoCalendario('${compEscapeAttr(al)}')"
              title="Carregar calendário de ${compEscapeAttr(al)}">
        <span style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          <span>${compEscapeHTML(al)}</span>
        </span>
        ${isEv ? '<small style="font-size:9px;opacity:0.65;">(Evadido)</small>' : ''}
      </button>
    `;
  }).join('');

  let html = `
    <section class="stitch-student-profile-bar" data-purpose="student-details-header">
      <div class="stitch-student-profile-left">
        <!-- Student dropdown button -->
        <div class="comp-student-banner-picker" style="position: relative;">
          <button type="button"
                  id="comp-student-banner-btn"
                  class="stitch-student-dropdown-btn"
                  onclick="compToggleDropdownAlunosCalendario(event)"
                  title="Clique para selecionar outro discente">
            <span class="stitch-student-profile-name">${compEscapeHTML(aluno)}</span>
            <span class="stitch-student-arrow">▼</span>
          </button>
          <div id="comp-student-banner-menu" class="comp-student-dropdown-menu" style="display: none;">
            ${dropdownItemsHtml}
          </div>
        </div>

        <!-- Absence Pill -->
        <div class="stitch-tag-faltas" title="Total de horas-falta computadas">
          <span style="color: #7A5B49; margin-right: 4px;">Faltas:</span>
          <strong style="color: ${totalFaltas > 0 ? '#C94A29' : '#1E7444'};">${totalFaltas > 0 ? compFormatarHorasDecimais(totalFaltas) : '0h00'}</strong>
        </div>

        <!-- Frequency Pill -->
        <div class="stitch-tag-freq" title="Frequência escolar calculada">
          <span style="color: #2B6D45; margin-right: 4px;">Frequência:</span>
          <strong>${freq}%</strong>
        </div>

        <!-- Academic Status Pill -->
        <div class="${sitClass}">
          ${sitText}
        </div>

        ${isEvadidoAtivo ? `
          <button type="button"
                  class="stitch-tag-faltas"
                  style="cursor: pointer;"
                  onclick="compAbrirModalEvasaoAluno('${compEscapeAttr(aluno)}')"
                  title="Clique para editar a data de evasão">
            Evadido em: <strong>${compIsoToDDMMAAAA(dataEvasaoAtivoIso)}</strong>
          </button>
        ` : (CompState.evasaoRecomendadaAlunos && CompState.evasaoRecomendadaAlunos[aluno] ? `
          <div class="docente-evasao-banner" style="display: inline-flex; align-items: center; gap: 8px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 2px 8px;">
            <span style="font-size: 11px; color: #9f1239; font-weight: 700;">⚠️ Evasão Recomendada</span>
            <button type="button" class="btn-aceitar-evasao" onclick="compAceitarRecomendacaoEvasao('${compEscapeAttr(aluno)}')">Aceitar Evasão</button>
          </div>
        ` : '')}
      </div>

      <!-- Action Button -->
      <div>
        <button type="button"
                class="stitch-btn-print-profile"
                onclick="compImprimirDiscente('${compEscapeAttr(aluno)}')"
                title="Configurar reposição e imprimir ficha de ${compEscapeAttr(aluno)}">
          <i class="fa-solid fa-print"></i>
          <span>Imprimir Ficha</span>
        </button>
      </div>
    </section>

    <!-- Scroll Grid de Cards -->
    <main class="stitch-calendar-scroll-wrap" data-purpose="class-attendance-cards">
      <div class="stitch-calendar-cards-flex">
  `;

  const dataEvasaoIso = compObterDataEvasaoAluno(aluno);
  const isEvadido = Boolean(dataEvasaoIso);

  dias.forEach((isoDate, idx) => {
    const aula = CompState.aulasMap.get(isoDate);
    const horasAula = compObterHorasAula(isoDate);
    const faltaVal = Number(faltas[isoDate]) || 0;
    const obs = (CompState.observacoesPorDia[aluno] || {})[isoDate] || '';

    const isAposEvasao = isEvadido && (isoDate >= dataEvasaoIso);

    let btnClass = 'is-present';
    let btnText = `PRESENÇA (${compFormatarHorasDecimais(horasAula)})`;

    if (isAposEvasao) {
      btnClass = 'is-absent';
      btnText = 'EVADIDO';
    } else if (faltaVal >= horasAula) {
      btnClass = 'is-absent';
      btnText = `FALTA (${compFormatarHorasDecimais(faltaVal)})`;
    } else if (faltaVal > 0) {
      btnClass = 'is-partial';
      btnText = `FALTA (${compFormatarHorasDecimais(faltaVal)})`;
    }

    const diaMes = compIsoToDDMM(isoDate);
    const diaSem = aula ? aula.diaSemanaNome.slice(0, 3) : '';
    const tipoLabel = aula ? (aula.tipo === 'teoria' ? 'TEORIA' : 'PRÁTICA') : 'AULA';

    html += `
      <article class="stitch-class-card comp-lesson-card"
               data-aluno="${compEscapeAttr(aluno)}"
               data-dia="${isoDate}"
               data-purpose="class-card"
               title="${isAposEvasao ? 'Discente evadido a partir de ' + compIsoToDDMMAAAA(dataEvasaoIso) + ' • ' : ''}Clique com botão direito para anotação/observação">
        <div>
          <div class="stitch-class-card-top">
            <span class="stitch-class-aula-num">AULA ${idx + 1}</span>
            <span class="stitch-class-badge-type">${tipoLabel}</span>
          </div>

          <div class="stitch-class-date-box">
            <div class="stitch-class-date">${diaMes}</div>
            <div class="stitch-class-weekday">${diaSem}</div>
          </div>

          <div class="stitch-class-carga-row">
            <span class="stitch-class-carga-label">Carga:</span>
            <span class="stitch-class-carga-val">${compFormatarHorasDecimais(horasAula)}</span>
          </div>
        </div>

        <div style="padding-top: 6px;">
          <button type="button" class="stitch-class-btn-presence ${btnClass}">
            ${btnText}
          </button>
          <div class="stitch-class-note-hint" title="${compEscapeAttr(obs)}">
            ${obs ? '📝 ' + compEscapeHTML(obs) : 'Anotação: Clique Direito'}
          </div>
        </div>
      </article>
    `;
  });

  html += `</div></main>`;
  return html;
}

/**
 * Alterna a visibilidade do dropdown de discentes no banner do calendário.
 */
function compToggleDropdownAlunosCalendario(event) {
  if (event) event.stopPropagation();
  const trigger = document.getElementById('comp-student-banner-btn');
  const menu = document.getElementById('comp-student-banner-menu');
  if (!menu) return;

  const isOpen = menu.style.display === 'flex';
  if (isOpen) {
    menu.style.display = 'none';
    if (trigger) trigger.classList.remove('is-open');
  } else {
    menu.style.display = 'flex';
    if (trigger) trigger.classList.add('is-open');

    // Fechar ao clicar fora
    const fecharAoClicarFora = (e) => {
      if (!e.target.closest('.comp-student-banner-picker')) {
        menu.style.display = 'none';
        if (trigger) trigger.classList.remove('is-open');
        document.removeEventListener('click', fecharAoClicarFora);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', fecharAoClicarFora);
    }, 10);
  }
}

/**
 * Seleciona o discente no modo calendário e atualiza a visão.
 */
function compSelecionarAlunoCalendario(nome) {
  CompState.alunoAtivo = nome;
  compRenderizarDiario();
  compRenderizarVariaveis();
}

/**
 * Aceita a recomendação de evasão escolar feita pela coordenação
 */
async function compAceitarRecomendacaoEvasao(nome) {
  if (!confirm(`Confirmar a evasão escolar para o discente ${nome} recomendada pela Coordenação?`)) {
    return;
  }

  const dataHoje = compObterDataHojeIso();
  if (!CompState.alunosEvadidos) CompState.alunosEvadidos = {};
  CompState.alunosEvadidos[nome] = dataHoje;

  if (CompState.evasaoRecomendadaAlunos) {
    delete CompState.evasaoRecomendadaAlunos[nome];
  }

  compSalvarEstado();

  // Sincronizar com Supabase se cliente estiver ativo
  const client = window.authService?.client;
  if (client) {
    try {
      await client
        .from('alunos_governanca')
        .update({
          status_evasao: 'evadido',
          aceita_docente_em: new Date().toISOString()
        })
        .ilike('nome_discente', nome);
    } catch (e) {
      console.warn('[Compensação] Falha ao sincronizar evasão no Supabase:', e);
    }
  }

  compMostrarToast('Evasão Confirmada', `O discente ${nome} foi marcado como evadido.`);
  compRenderizarDiario();
  compRenderizarVariaveis();
}
window.compAceitarRecomendacaoEvasao = compAceitarRecomendacaoEvasao;

/**
 * Vincula interações nos cards do calendário.
 * Presença NÃO é alterada aqui (papel exclusivo da Tabela Geral).
 * Clique com o botão direito ou Long Press permite adicionar/editar uma descrição (nota/ocorrência).
 */
function compVincularEventosCardsCalendario(aluno) {
  const cards = document.querySelectorAll('.comp-lesson-card');
  cards.forEach(card => {
    const isoDate = card.dataset.dia;
    let touchTimer = null;
    let touchMoved = false;

    // 1. Clique com o botão direito (desktop) -> Adicionar/Editar nota sobre a falta ou ocorrência
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      compAbrirModalNotaDia(aluno, isoDate);
    });

    // 2. Clique com botão esquerdo -> Não altera presença. Se houver nota ou falta, abre a nota ou indica a tabela geral.
    card.addEventListener('click', (e) => {
      if (touchMoved) return;
      // Permite abrir a nota com clique simples também se o usuário desejar
      compAbrirModalNotaDia(aluno, isoDate);
    });

    // 3. Suporte a Long-Press no Mobile / Touch (450ms) -> Abre modal de nota
    card.addEventListener('touchstart', (e) => {
      touchMoved = false;
      touchTimer = setTimeout(() => {
        touchMoved = true;
        compAbrirModalNotaDia(aluno, isoDate);
      }, 450);
    }, { passive: true });

    card.addEventListener('touchmove', () => {
      touchMoved = true;
      if (touchTimer) clearTimeout(touchTimer);
    }, { passive: true });

    card.addEventListener('touchend', () => {
      if (touchTimer) clearTimeout(touchTimer);
    });
  });
}

/**
 * Altera o design de ícones da tabela (1 a 4).
 */
function compMudarDesignIcones(designId) {
  if (COMP_ICON_DESIGNS[designId]) {
    CompState.iconDesign = designId;
    compRenderizarDiario();
  }
}

/**
 * Alterna o destaque visual da coluna de uma data específica na Tabela Geral.
 * Efeito sóbrio que ilumina toda a coluna correspondente da chamada.
 */
function compToggleDestacarColunaData(isoDate) {
  if (CompState.colunaDataDestacada === isoDate) {
    CompState.colunaDataDestacada = null;
  } else {
    CompState.colunaDataDestacada = isoDate;
  }
  compAtualizarDestaqueColunaDataUI();
}

/**
 * Atualiza dinamicamente as classes CSS no DOM para o destaque da coluna.
 * Proporciona resposta visual instantânea sem necessidade de refazer o render completo.
 */
function compAtualizarDestaqueColunaDataUI() {
  const destacada = CompState.colunaDataDestacada;

  // Atualiza cabeçalhos da tabela
  const headers = document.querySelectorAll('#attendance-grid-table th.col-date, .comp-chamada-table th.col-date');
  headers.forEach(th => {
    if (destacada && th.dataset.dia === destacada) {
      th.classList.add('is-col-destacada');
      th.setAttribute('title', `${th.dataset.dia} • Coluna Destacada (Clique para desativar)`);
    } else {
      th.classList.remove('is-col-destacada');
      th.setAttribute('title', `${th.dataset.dia} • Clique para destacar a coluna`);
    }
  });

  // Atualiza células do corpo da tabela
  const cells = document.querySelectorAll('#attendance-grid-table td[data-dia], .comp-chamada-table td.comp-cell-falta');
  cells.forEach(td => {
    if (destacada && td.dataset.dia === destacada) {
      td.classList.add('is-col-destacada');
    } else {
      td.classList.remove('is-col-destacada');
    }
  });
}

/**
 * Renderiza o Modo 2: Tabela Geral da Turma (chamada em planilha interativa).
 * Células exibem símbolos gráficos de acordo com os 4 designs de ícones:
 * Design 1 (padrão): . (presença) e | (falta)
 * Design 2: P e F
 * Design 3: ✓ e ✗
 * Design 4: ● e ■
 */
function compRenderizarModoTabela(alunos, dias, chTotal) {
  const design = COMP_ICON_DESIGNS[CompState.iconDesign] || COMP_ICON_DESIGNS['1'];
  const colDestacada = CompState.colunaDataDestacada;

  let html = `
    <section class="stitch-attendance-datagrid" data-purpose="attendance-datagrid">
      <div class="stitch-table-scroll">
        <table class="stitch-table" id="attendance-grid-table">
          <thead>
            <tr>
              <th class="col-aluno" id="comp-th-col-aluno" scope="col">
                <div class="comp-th-aluno-content">
                  <span>Discente</span>
                </div>
                <div class="comp-col-resizer" id="comp-col-resizer-aluno" title="Arraste para redimensionar a largura da coluna (duplo clique para restaurar 200px)"></div>
              </th>
              ${dias.map(d => {
                const hNum = compObterHorasAula(d);
                const hStr = compFormatarHorasDecimais(hNum);
                const isDestacada = colDestacada === d;
                return `<th class="col-date${isDestacada ? ' is-col-destacada' : ''}"
                            data-dia="${d}"
                            onclick="compToggleDestacarColunaData('${d}')"
                            title="${d} • Carga: ${hStr} • ${isDestacada ? 'Coluna Destacada (Clique para desativar)' : 'Clique para destacar a coluna'}"
                            scope="col">
                          <div>${compIsoToDDMM(d)}</div>
                          <div class="stitch-date-sub">${hStr}</div>
                        </th>`;
              }).join('')}
              <th class="col-summary" scope="col">Total Faltas</th>
              <th class="col-summary" scope="col">Freq.</th>
              <th class="col-summary" style="min-width: 86px;" title="Ações do Discente (Imprimir, Evasão e Remover)" scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>`;

  const isModoFisico = CompState.subViewDiario === 'fisico';
  let alunosOrdenados;

  if (isModoFisico) {
    // 1. DIÁRIO FÍSICO:
    // Mantém a ordem física estabelecida pelo docente (novos alunos entram na ordem em que foram adicionados).
    // Discentes evadidos permanecem exatamente em sua posição física (sem afundar para o final).
    alunosOrdenados = compObterAlunosOrdemFisica();
  } else {
    // 2. DIÁRIO DE COMPENSAÇÃO DE AUSÊNCIAS:
    // Sempre em ordem estritamente alfabética (A-Z), com discentes evadidos enviados para o fim da lista.
    alunosOrdenados = [...alunos].sort((a, b) => {
      const evA = Boolean(CompState.evadidosPorAluno && CompState.evadidosPorAluno[a]);
      const evB = Boolean(CompState.evadidosPorAluno && CompState.evadidosPorAluno[b]);
      if (evA !== evB) return evA ? 1 : -1;
      return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
    });
  }

  for (const al of alunosOrdenados) {
    const isEvadido = Boolean(CompState.evadidosPorAluno && CompState.evadidosPorAluno[al]);
    const faltas = CompState.faltasPorAluno[al] || {};

    const faltasCells = dias.map(isoDate => {
      const val = Number(faltas[isoDate]) || 0;
      const isFalta = val > 0;
      const horasAula = compObterHorasAula(isoDate);
      const isParcial = isFalta && (val < horasAula);
      const isDestacada = colDestacada === isoDate;

      // Ícone e estilo Stitch
      let cellCls = 'is-present';
      if (isEvadido && (isoDate >= (compObterDataEvasaoAluno(al) || '9999-99-99'))) {
        cellCls = 'is-evadido';
      } else if (isParcial) {
        cellCls = 'is-partial';
      } else if (isFalta) {
        cellCls = 'is-absent';
      }

      const symbol = isFalta ? design.falta : design.presenca;

      return `<td class="${isDestacada ? 'is-col-destacada' : ''}" style="text-align: center; padding: 4px;" data-dia="${isoDate}">
        <button
          type="button"
          class="stitch-cell-btn comp-cell-presence ${cellCls}"
          data-aluno="${compEscapeAttr(al)}"
          data-dia="${isoDate}"
          title="${compEscapeAttr(al)} em ${compIsoToDDMMAAAA(isoDate)}: ${isFalta ? compFormatarHorasDecimais(val) + ' de falta' : 'Presente'} • 1-Click: Flip • Segure/Direito: Ajustar (1 a 8 faltas)"
        >
          ${isParcial ? `
            <span class="stitch-cell-partial-symbol">${symbol}</span>
            <span class="stitch-cell-partial-hours">${Math.round(val)}h</span>
          ` : `
            <span>${symbol}</span>
          `}
        </button>
      </td>`;
    }).join('');

    // Cálculo consolidado de faltas e frequência do discente até a data de hoje (A1)
    const dataHojeIso = compObterDataHojeIso();
    let totalFaltasConsolidado = 0;
    for (const dKey of (CompState.diasLetivos || [])) {
      if (dKey <= dataHojeIso) {
        totalFaltasConsolidado += Number(faltas[dKey]) || 0;
      }
    }
    const freq = Math.max(0, Math.floor(((chTotal - totalFaltasConsolidado) / chTotal) * 100));
    const pctFaltas = Math.min(100, Math.round((totalFaltasConsolidado / chTotal) * 100));
    const temFalta = totalFaltasConsolidado > 0;
    const isCritico25 = pctFaltas >= 25;

    html += `
      <tr data-aluno="${compEscapeAttr(al)}" class="${isEvadido ? 'comp-row-evadido' : ''}${isModoFisico ? ' comp-row-fisico' : ''}">
        <td class="col-aluno-cell" title="${compEscapeAttr(al)}${isEvadido ? ' (Evadido)' : ''}">
          <div class="stitch-student-cell-content">
            ${isModoFisico ? `
              <button type="button"
                      class="stitch-drag-handle comp-drag-handle"
                      draggable="true"
                      data-aluno="${compEscapeAttr(al)}"
                      title="Arraste para reordenar ${compEscapeAttr(al)} no Diário Físico"
                      aria-label="Reordenar ${compEscapeAttr(al)}">
                <i class="fa-solid fa-grip-vertical"></i>
              </button>
            ` : ''}
            ${temFalta ? (isCritico25 ? `
              <span class="stitch-icon-warning" title="Atenção Crítica: ${pctFaltas}% de faltas (≥ 25% da carga horária)">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </span>
            ` : `
              <span class="stitch-warning-dot" title="Possui faltas registradas (${pctFaltas}%)">!</span>
            `) : ''}
            <span class="stitch-student-name" title="${compEscapeAttr(al)}">${compEscapeHTML(al)}</span>
            ${isEvadido ? '<span class="stitch-badge-evadido">Evadido</span>' : ''}
          </div>
        </td>
        ${faltasCells}
        <td style="text-align: center; font-weight: 700; color: ${totalFaltasConsolidado > 0 ? '#C94A29' : '#047857'};" id="comp-total-${compSafeId(al)}">
          ${totalFaltasConsolidado > 0 ? compFormatarHorasDecimais(totalFaltasConsolidado) : '0h00'}
        </td>
        <td style="text-align: center; font-weight: 700; color: ${freq < 75 ? '#C94A29' : '#4E2A18'};">
          ${freq}%
        </td>
        <td style="text-align: center;">
          <div class="stitch-action-group">
            <button class="stitch-action-btn" onclick="compImprimirDiscente('${compEscapeAttr(al)}')" title="Configurar reposição e imprimir ficha de ${compEscapeAttr(al)}">
              <i class="fa-solid fa-print"></i>
            </button>
            <button class="stitch-action-btn${isEvadido ? ' is-active' : ''}" onclick="compToggleEvasaoAluno('${compEscapeAttr(al)}', event)" title="${isEvadido ? 'Desmarcar evasão de ' + compEscapeAttr(al) : 'Marcar discente como evadido'}">
              e
            </button>
            <button class="stitch-action-btn stitch-action-btn-danger" onclick="compConfirmarRemocaoAluno('${compEscapeAttr(al)}')" title="Remover ${compEscapeAttr(al)} da chamada">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }

  html += `</tbody></table></div></section>`;
  return html;
}

let _compDraggedAluno = null;

/**
 * Vincula eventos de Drag and Drop para reordenação manual de discentes no Diário Físico.
 */
function compVincularEventosDragDropFisico() {
  const handles = document.querySelectorAll('.comp-drag-handle');
  const rows = document.querySelectorAll('#attendance-grid-table tbody tr');

  handles.forEach(handle => {
    handle.addEventListener('dragstart', (e) => {
      const aluno = handle.dataset.aluno;
      _compDraggedAluno = aluno;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', aluno);
      }
      const row = handle.closest('tr');
      if (row) {
        row.classList.add('is-dragging');
      }
    });

    handle.addEventListener('dragend', () => {
      _compDraggedAluno = null;
      rows.forEach(r => {
        r.classList.remove('is-dragging', 'drag-over-top', 'drag-over-bottom');
      });
    });
  });

  rows.forEach(row => {
    row.addEventListener('dragover', (e) => {
      if (!_compDraggedAluno) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      const rect = row.getBoundingClientRect();
      const isUpper = e.clientY < (rect.top + rect.height / 2);
      row.classList.toggle('drag-over-top', isUpper);
      row.classList.toggle('drag-over-bottom', !isUpper);
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    row.addEventListener('drop', (e) => {
      if (!_compDraggedAluno) return;
      e.preventDefault();
      row.classList.remove('drag-over-top', 'drag-over-bottom');

      const sourceAluno = _compDraggedAluno || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
      const targetAluno = row.dataset.aluno;

      _compDraggedAluno = null;
      rows.forEach(r => r.classList.remove('is-dragging', 'drag-over-top', 'drag-over-bottom'));

      if (!sourceAluno || !targetAluno || sourceAluno === targetAluno) return;

      const rect = row.getBoundingClientRect();
      const isUpper = e.clientY < (rect.top + rect.height / 2);

      const lista = [...compObterAlunosOrdemFisica()];
      const srcIdx = lista.indexOf(sourceAluno);
      if (srcIdx === -1) return;
      lista.splice(srcIdx, 1);

      const targetIdx = lista.indexOf(targetAluno);
      if (targetIdx === -1) return;
      const insertIdx = isUpper ? targetIdx : targetIdx + 1;
      lista.splice(insertIdx, 0, sourceAluno);

      CompState.ordemFisicaAlunos = lista;
      compSalvarTurmaAtualStorage();
      compRenderizarDiario();
    });
  });
}

/**
 * Vincula interações de 1-Click (Flip Presença <-> Falta) e Long Press / Clique Direito
 * nas células da Tabela Geral.
 */
function compVincularEventosTabelaGeral() {
  const cells = document.querySelectorAll('.comp-cell-presence');
  cells.forEach(cell => {
    const aluno = cell.dataset.aluno;
    const isoDate = cell.dataset.dia;
    let touchTimer = null;
    let touchMoved = false;

    // 1. Clique com o botão direito -> Abre modal de 1 a 8 faltas
    cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      compAbrirModalPersonalizarFalta(aluno, isoDate);
    });

    // 2. Clique com botão esquerdo -> Flip rápido (Presença <-> Falta)
    cell.addEventListener('click', (e) => {
      if (touchMoved) return;
      compToggleFlipFalta(aluno, isoDate);
    });

    // 3. Long-Press em telas sensíveis ao toque / mobile (420ms)
    cell.addEventListener('touchstart', (e) => {
      touchMoved = false;
      touchTimer = setTimeout(() => {
        touchMoved = true;
        compAbrirModalPersonalizarFalta(aluno, isoDate);
      }, 420);
    }, { passive: true });

    cell.addEventListener('touchmove', () => {
      touchMoved = true;
      if (touchTimer) clearTimeout(touchTimer);
    }, { passive: true });

    cell.addEventListener('touchend', () => {
      if (touchTimer) clearTimeout(touchTimer);
    });
  });

  // Ativa reordenação por Drag & Drop quando no modo Diário Físico
  if (CompState.subViewDiario === 'fisico') {
    compVincularEventosDragDropFisico();
  }

  // Vincula redimensionamento arrastável da coluna de discentes
  compVincularEventosResizerColunaAluno();
}

/**
 * Vincula interações de arrasto (Drag / Resize) à divisória entre a coluna do discente
 * e as colunas de presenças.
 */
function compVincularEventosResizerColunaAluno() {
  const resizer = document.getElementById('comp-col-resizer-aluno');
  const th = document.getElementById('comp-th-col-aluno');
  if (!resizer || !th) return;

  // Aplica a largura salva no localStorage ou no CompState
  try {
    const savedWidth = parseInt(localStorage.getItem('SENAI_COMP_COL_ALUNO_WIDTH'), 10);
    const largura = (!isNaN(savedWidth) && savedWidth >= 75 && savedWidth <= 450)
      ? savedWidth
      : (CompState.colAlunoWidth || 200);
    CompState.colAlunoWidth = largura;
    document.documentElement.style.setProperty('--comp-col-aluno-width', largura + 'px');
  } catch (_) {}

  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    isDragging = true;
    startX = e.clientX;
    startWidth = th.getBoundingClientRect().width;
    resizer.classList.add('is-resizing');
    document.body.classList.add('is-col-resizing');

    if (resizer.setPointerCapture && e.pointerId !== undefined) {
      try {
        resizer.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    e.preventDefault();
    e.stopPropagation();
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    let newWidth = Math.round(startWidth + dx);
    newWidth = Math.max(75, Math.min(newWidth, 450));

    CompState.colAlunoWidth = newWidth;
    document.documentElement.style.setProperty('--comp-col-aluno-width', newWidth + 'px');
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    resizer.classList.remove('is-resizing');
    document.body.classList.remove('is-col-resizing');

    if (resizer.releasePointerCapture && e.pointerId !== undefined) {
      try {
        resizer.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    try {
      const finalWidth = CompState.colAlunoWidth || Math.round(th.getBoundingClientRect().width);
      localStorage.setItem('SENAI_COMP_COL_ALUNO_WIDTH', String(finalWidth));
    } catch (_) {}
  }

  resizer.addEventListener('pointerdown', onPointerDown);
  resizer.addEventListener('pointermove', onPointerMove);
  resizer.addEventListener('pointerup', onPointerUp);
  resizer.addEventListener('pointercancel', onPointerUp);

  // Duplo clique restaura a largura padrão (200px)
  resizer.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    CompState.colAlunoWidth = 200;
    document.documentElement.style.setProperty('--comp-col-aluno-width', '200px');
    try {
      localStorage.setItem('SENAI_COMP_COL_ALUNO_WIDTH', '200');
    } catch (_) {}
  });
}

function compMudarModoVisualizacao(modo) {
  CompState.viewMode = modo;
  compRenderizarDiario();
}

// ==========================================================================
// GESTÃO DE ALUNOS
// ==========================================================================

function compParsearEntrada(raw) {
  let txt = raw.trim();
  if (!txt) return { tipo: null };

  if (txt.startsWith('{')) {
    let jsonCandidate = txt.replace(/'/g, '"');
    jsonCandidate = jsonCandidate.replace(/,\s*}/g, '}');
    jsonCandidate = jsonCandidate.replace(/([{,]\s*)([a-zA-Z0-9_À-ÿ\-]+)\s*:/g, '$1"$2":');

    try {
      const parsed = JSON.parse(jsonCandidate);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { tipo: 'dicionario', data: parsed };
      }
    } catch (_) {
      try {
        const direct = JSON.parse(txt);
        if (typeof direct === 'object' && !Array.isArray(direct)) {
          return { tipo: 'dicionario', data: direct };
        }
      } catch (err) {}
    }
  }

  const partes = txt.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  if (partes.length > 1) {
    return { tipo: 'lista', nomes: partes };
  }

  return { tipo: 'simples', nome: txt };
}

function compAdicionarAlunos() {
  const textarea = document.getElementById('comp-aluno-input');
  if (!textarea) return;

  const raw = textarea.value;
  const resultado = compParsearEntrada(raw);

  if (!resultado.tipo) {
    textarea.focus();
    return;
  }

  if (resultado.tipo === 'dicionario') {
    for (const [nome, faltas] of Object.entries(resultado.data)) {
      compAdicionarAluno(nome);
      if (faltas && typeof faltas === 'object') {
        if (!CompState.faltasPorAluno[nome]) {
          CompState.faltasPorAluno[nome] = {};
        }
        for (const [dd, qtd] of Object.entries(faltas)) {
          const valNum = Number(qtd) || 0;
          const ddStr = String(dd).trim();

          let matchedIso = null;
          for (const iso of CompState.diasLetivos) {
            const [y, m, d] = iso.split('-');
            if (ddStr === d || ddStr === String(parseInt(d, 10)) || ddStr === `${d}/${m}` || ddStr === `${parseInt(d, 10)}/${parseInt(m, 10)}` || ddStr === iso) {
              matchedIso = iso;
              break;
            }
          }

          if (matchedIso) {
            CompState.faltasPorAluno[nome][matchedIso] = valNum;
          }
        }
      }
    }
  } else if (resultado.tipo === 'lista') {
    resultado.nomes.forEach(n => compAdicionarAluno(n));
  } else {
    compAdicionarAluno(resultado.nome);
  }

  textarea.value = '';
  compRenderizarDiario();
  compRenderizarVariaveis();
}

/**
 * Retorna a lista de alunos sincronizada na ordem física definida pelo docente.
 * Discentes novos são anexados na ordem em que foram cadastrados.
 */
function compObterAlunosOrdemFisica() {
  if (!Array.isArray(CompState.ordemFisicaAlunos)) {
    CompState.ordemFisicaAlunos = [];
  }
  const setAlunosAtuais = new Set(CompState.alunos || []);
  const ordemValida = CompState.ordemFisicaAlunos.filter(nome => setAlunosAtuais.has(nome));
  const setOrdemValida = new Set(ordemValida);

  for (const al of (CompState.alunos || [])) {
    if (!setOrdemValida.has(al)) {
      ordemValida.push(al);
      setOrdemValida.add(al);
    }
  }

  CompState.ordemFisicaAlunos = ordemValida;
  return ordemValida;
}

/**
 * Alterna entre a visualização do Diário de Compensação (Ordem Alfabética)
 * e o Diário Físico (Ordem Personalizada com Drag & Drop).
 */
function compAlternarSubViewDiario(subView) {
  CompState.subViewDiario = subView === 'fisico' ? 'fisico' : 'compensacao';

  const btnComp = document.getElementById('comp-nav-tab-compensacao');
  const btnFis = document.getElementById('comp-nav-tab-fisico');
  if (btnComp) {
    btnComp.classList.toggle('is-active', CompState.subViewDiario === 'compensacao');
    btnComp.setAttribute('aria-selected', CompState.subViewDiario === 'compensacao' ? 'true' : 'false');
  }
  if (btnFis) {
    btnFis.classList.toggle('is-active', CompState.subViewDiario === 'fisico');
    btnFis.setAttribute('aria-selected', CompState.subViewDiario === 'fisico' ? 'true' : 'false');
  }

  compSalvarTurmaAtualStorage();
  compRenderizarDiario();
}

let _syncTurmaCloudTimeout = null;

function compSalvarTurmaAtualStorage() {
  const turmaAtual = CompState.turmaInfo.turma || document.getElementById('codigoTurma')?.value?.trim() || '_TURMA_GERAL_';
  try {
    const storageKey = getCompStorageKey();
    const bruto = localStorage.getItem(storageKey);
    const banco = bruto ? JSON.parse(bruto) : {};
    const dadosTurma = {
      alunos: [...CompState.alunos],
      ordemFisicaAlunos: [...(CompState.ordemFisicaAlunos || CompState.alunos)],
      subViewDiario: CompState.subViewDiario || 'compensacao',
      faltasPorAluno: { ...CompState.faltasPorAluno },
      overrides: { ...CompState.overrides },
      observacoesPorDia: { ...CompState.observacoesPorDia },
      manualFlagAlunos: { ...(CompState.manualFlagAlunos || {}) },
      evadidosPorAluno: { ...(CompState.evadidosPorAluno || {}) },
      coordenacao: { ...CompState.coordenacao },
      coordenacaoPorAluno: { ...(CompState.coordenacaoPorAluno || {}) },
      conteudoProgramaticoPorDia: { ...(CompState.conteudoProgramaticoPorDia || {}) },
      ultimasFaltasImpressas: { ...(CompState.ultimasFaltasImpressas || {}) },
      _atualizadoEm: new Date().toISOString()
    };
    banco[turmaAtual] = dadosTurma;
    localStorage.setItem(storageKey, JSON.stringify(banco));

    // Se houver turma ativa no cronograma salvo, sincronizar em tempo real no modelo local
    if (typeof getSavedModels === 'function' && typeof saveModels === 'function' && turmaAtual !== '_TURMA_GERAL_') {
      const savedModels = getSavedModels();
      if (!savedModels[turmaAtual]) {
        savedModels[turmaAtual] = (typeof getFormData === 'function') ? getFormData() : {};
      }
      savedModels[turmaAtual].alunos = [...dadosTurma.alunos];
      savedModels[turmaAtual].ordemFisicaAlunos = [...dadosTurma.ordemFisicaAlunos];
      savedModels[turmaAtual].faltasPorAluno = { ...dadosTurma.faltasPorAluno };
      savedModels[turmaAtual].overrides = { ...dadosTurma.overrides };
      savedModels[turmaAtual].observacoesPorDia = { ...dadosTurma.observacoesPorDia };
      savedModels[turmaAtual].manualFlagAlunos = { ...dadosTurma.manualFlagAlunos };
      savedModels[turmaAtual].evadidosPorAluno = { ...dadosTurma.evadidosPorAluno };
      savedModels[turmaAtual].conteudoProgramaticoPorDia = { ...dadosTurma.conteudoProgramaticoPorDia };
      savedModels[turmaAtual]._savedAt = Date.now();
      saveModels(savedModels);
    }

    // Sincronização assíncrona imediata com o Supabase Cloud se logado
    if (window.authService?.client && window.authService?.currentUser && turmaAtual !== '_TURMA_GERAL_') {
      if (_syncTurmaCloudTimeout) clearTimeout(_syncTurmaCloudTimeout);
      _syncTurmaCloudTimeout = setTimeout(async () => {
        try {
          const user = window.authService.currentUser;
          const currentForm = typeof getFormData === 'function' ? getFormData() : {};
          const payload = {
            ...currentForm,
            codigoTurma: turmaAtual,
            ...dadosTurma
          };
          if (typeof salvarTurmaSupabaseSeguro === 'function') {
            await salvarTurmaSupabaseSeguro(user.id, turmaAtual, currentForm.nomeCurso || '', payload);
          } else if (window.authService?.client) {
            const client = window.authService.client;
            const { data: ex } = await client.from('turmas_docente').select('id').eq('docente_id', user.id).eq('codigo_turma', turmaAtual).maybeSingle();
            if (ex && ex.id) {
              await client.from('turmas_docente').update({ dados: payload, atualizado_em: new Date().toISOString() }).eq('id', ex.id);
            } else {
              await client.from('turmas_docente').insert({ docente_id: user.id, codigo_turma: turmaAtual, nome_curso: currentForm.nomeCurso || '', dados: payload });
            }
          }
        } catch (errSync) {
          console.warn('[SyncCloud] Falha silenciosa no sync automático:', errSync);
        }
      }, 500);
    }
  } catch (e) {
    console.warn("Erro no auto-save de presenças:", e);
  }
}

function compExportarDadosCompletos() {
  // 1. Sincroniza turma atual com o DOM se disponível
  const elTurma = document.getElementById('codigoTurma');
  if (elTurma && elTurma.value.trim()) {
    CompState.turmaInfo.turma = elTurma.value.trim();
  }

  // 2. Força persistência da turma ativa no banco de dados local
  compSalvarTurmaAtualStorage();

  // 3. Lê o banco consolidado do localStorage
  let turmasCompensacao = {};
  try {
    const raw = localStorage.getItem(getCompStorageKey());
    if (raw) turmasCompensacao = JSON.parse(raw);
  } catch (e) {
    console.warn("Erro ao ler turmas de compensação:", e);
  }

  // 4. Garante que a turma atualmente aberta no CompState está presente com os dados mais recentes
  const turmaKey = CompState.turmaInfo.turma || elTurma?.value?.trim() || '_TURMA_GERAL_';
  if (turmaKey) {
    turmasCompensacao[turmaKey] = {
      alunos: [...(CompState.alunos || [])],
      ordemFisicaAlunos: [...(CompState.ordemFisicaAlunos || CompState.alunos || [])],
      subViewDiario: CompState.subViewDiario || 'compensacao',
      faltasPorAluno: JSON.parse(JSON.stringify(CompState.faltasPorAluno || {})),
      overrides: JSON.parse(JSON.stringify(CompState.overrides || {})),
      observacoesPorDia: JSON.parse(JSON.stringify(CompState.observacoesPorDia || {})),
      manualFlagAlunos: JSON.parse(JSON.stringify(CompState.manualFlagAlunos || {})),
      evadidosPorAluno: JSON.parse(JSON.stringify(CompState.evadidosPorAluno || {})),
      coordenacao: JSON.parse(JSON.stringify(CompState.coordenacao || {})),
      coordenacaoPorAluno: JSON.parse(JSON.stringify(CompState.coordenacaoPorAluno || {})),
      conteudoProgramaticoPorDia: JSON.parse(JSON.stringify(CompState.conteudoProgramaticoPorDia || {})),
      ultimasFaltasImpressas: JSON.parse(JSON.stringify(CompState.ultimasFaltasImpressas || {})),
      _atualizadoEm: new Date().toISOString()
    };
  }

  // 5. Captura largura da coluna, parecer geral e conteúdos
  const colWidth = parseInt(localStorage.getItem('SENAI_COMP_COL_ALUNO_WIDTH'), 10) || CompState.colAlunoWidth || 200;
  const parecerCoord = localStorage.getItem('SENAI_COMP_COORD_PARECER') || '';
  let conteudoProgGlobal = {};
  try {
    const rawCont = localStorage.getItem('SENAI_COMP_CONTEUDO_DATA');
    if (rawCont) conteudoProgGlobal = JSON.parse(rawCont);
  } catch (_) {}

  return {
    turmasCompensacao: turmasCompensacao,
    colAlunoWidth: colWidth,
    parecerCoordenacao: parecerCoord,
    conteudoProgramatico: conteudoProgGlobal,
    configuracoes: {
      subViewDiario: CompState.subViewDiario || 'compensacao',
      viewMode: CompState.viewMode || 'table',
      iconDesign: CompState.iconDesign || '1',
      aula55min: !!CompState.aula55min,
      aula55minManual: !!CompState.aula55minManual,
      minutosModulo: CompState.minutosModulo || 55,
      thresholdFaltaFlag: CompState.thresholdFaltaFlag || 10,
      colAlunoWidth: colWidth,
      variaveisConfig: JSON.parse(JSON.stringify(CompState.variaveisConfig || {}))
    }
  };
}

/**
 * Importa e restaura integralmente o banco de compensação, diário físico, faltas e configurações.
 */
function compImportarDadosCompletos(dados) {
  if (!dados || typeof dados !== 'object') return;

  const turmas = dados.turmasCompensacao || dados.compensacoes || (dados.turmas ? dados.turmas : null);
  if (turmas && typeof turmas === 'object') {
    try {
      const rawAtual = localStorage.getItem(getCompStorageKey());
      const bancoAtual = rawAtual ? JSON.parse(rawAtual) : {};
      const bancoMesclado = { ...bancoAtual, ...turmas };
      localStorage.setItem(getCompStorageKey(), JSON.stringify(bancoMesclado));
    } catch (e) {
      console.warn("Erro ao mesclar turmas importadas no localStorage:", e);
    }
  }

  if (dados.parecerCoordenacao) {
    try {
      localStorage.setItem('SENAI_COMP_COORD_PARECER', dados.parecerCoordenacao);
    } catch (_) {}
  }

  if (dados.conteudoProgramatico) {
    try {
      localStorage.setItem('SENAI_COMP_CONTEUDO_DATA', typeof dados.conteudoProgramatico === 'string' ? dados.conteudoProgramatico : JSON.stringify(dados.conteudoProgramatico));
    } catch (_) {}
  }

  const colWidth = dados.colAlunoWidth || dados.configuracoes?.colAlunoWidth;
  if (colWidth) {
    const wNum = parseInt(colWidth, 10);
    if (!isNaN(wNum) && wNum >= 75 && wNum <= 450) {
      localStorage.setItem('SENAI_COMP_COL_ALUNO_WIDTH', String(wNum));
      CompState.colAlunoWidth = wNum;
      document.documentElement.style.setProperty('--comp-col-aluno-width', `${wNum}px`);
    }
  }

  const cfg = dados.configuracoes || {};
  if (cfg.viewMode) CompState.viewMode = cfg.viewMode;
  if (cfg.subViewDiario) CompState.subViewDiario = cfg.subViewDiario;
  if (cfg.iconDesign) CompState.iconDesign = cfg.iconDesign;
  if (typeof cfg.aula55min === 'boolean') CompState.aula55min = cfg.aula55min;
  if (typeof cfg.aula55minManual === 'boolean') CompState.aula55minManual = cfg.aula55minManual;
  if (cfg.minutosModulo) CompState.minutosModulo = cfg.minutosModulo;
  if (cfg.thresholdFaltaFlag) CompState.thresholdFaltaFlag = cfg.thresholdFaltaFlag;
  if (cfg.variaveisConfig && typeof cfg.variaveisConfig === 'object') {
    CompState.variaveisConfig = { ...CompState.variaveisConfig, ...cfg.variaveisConfig };
  }

  // Atualiza controles na interface
  const iconSelect = document.getElementById('comp-icon-design-select');
  if (iconSelect && CompState.iconDesign) {
    iconSelect.value = CompState.iconDesign;
  }
  const toggle55 = document.getElementById('comp-toggle-55min');
  if (toggle55) {
    toggle55.checked = CompState.aula55min;
  }
  const inputMin = document.getElementById('comp-input-minutos-modulo');
  if (inputMin && CompState.minutosModulo) {
    inputMin.value = CompState.minutosModulo;
  }

  // Alterna para a sub-visão correta (Compensação ou Físico)
  if (typeof compAlternarSubViewDiario === 'function' && CompState.subViewDiario) {
    compAlternarSubViewDiario(CompState.subViewDiario);
  }

  // Força reset da última turma carregada para re-sincronizar do banco
  CompState.ultimaTurmaCarregada = null;

  if (typeof compSincronizarAbaMae === 'function') compSincronizarAbaMae();
  if (typeof compRenderizarDiario === 'function') compRenderizarDiario();
  if (typeof compRenderizarVariaveis === 'function') compRenderizarVariaveis();
}

function compAdicionarAluno(nome) {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return;
  if (!CompState.alunos.includes(nomeLimpo)) {
    CompState.alunos.push(nomeLimpo);
  }
  if (!Array.isArray(CompState.ordemFisicaAlunos)) {
    CompState.ordemFisicaAlunos = [];
  }
  if (!CompState.ordemFisicaAlunos.includes(nomeLimpo)) {
    CompState.ordemFisicaAlunos.push(nomeLimpo);
  }
  if (!CompState.faltasPorAluno[nomeLimpo]) {
    CompState.faltasPorAluno[nomeLimpo] = {};
  }
  if (!CompState.alunoAtivo) {
    CompState.alunoAtivo = nomeLimpo;
  }
  const turmaAtual = CompState.turmaInfo.turma;
  if (turmaAtual) {
    CompState.alunosPorTurma[turmaAtual] = [...CompState.alunos];
  }
  compSalvarTurmaAtualStorage();
}

function compConfirmarRemocaoAluno(nome) {
  if (!nome) return;
  // 1ª Confirmação
  const primeiraConfirmacao = confirm(`Deseja remover o(a) discente "${nome}" da chamada?`);
  if (!primeiraConfirmacao) return;

  // 2ª Confirmação (Alerta de exclusão irreversível de faltas e overrides)
  const segundaConfirmacao = confirm(`Atenção: Todos os registros de faltas e overrides de "${nome}" serão excluídos permanentemente.\n\nConfirma a exclusão definitiva?`);
  if (!segundaConfirmacao) return;

  compRemoverAluno(nome);
}

function compRemoverAluno(nome) {
  CompState.alunos = CompState.alunos.filter(a => a !== nome);
  if (CompState.ordemFisicaAlunos) {
    CompState.ordemFisicaAlunos = CompState.ordemFisicaAlunos.filter(a => a !== nome);
  }
  delete CompState.faltasPorAluno[nome];
  delete CompState.overrides[nome];
  delete CompState.observacoesPorDia[nome];
  delete CompState.ultimasFaltasImpressas[nome];
  if (CompState.evadidosPorAluno) {
    delete CompState.evadidosPorAluno[nome];
  }
  if (CompState.coordenacaoPorAluno) {
    delete CompState.coordenacaoPorAluno[nome];
  }

  const turmaAtual = CompState.turmaInfo.turma;
  if (turmaAtual) {
    CompState.alunosPorTurma[turmaAtual] = [...CompState.alunos];
  }
  compSalvarTurmaAtualStorage();

  if (CompState.alunoAtivo === nome) {
    CompState.alunoAtivo = CompState.alunos.length > 0 ? CompState.alunos[0] : null;
  }
  compRenderizarDiario();
  compRenderizarVariaveis();
}

/**
 * Variável temporária de discente em processo de evasão
 */
let _compAlunoEmEvasao = null;

/**
 * Retorna a data ISO de evasão de um aluno, ou null se não for evadido
 * Suporta formatos: string ('2026-03-15') ou boolean (true -> data de hoje simulada)
 */
function compObterDataEvasaoAluno(nome) {
  if (!nome || !CompState.evadidosPorAluno) return null;
  const val = CompState.evadidosPorAluno[nome];
  if (!val) return null;
  let dataStr = null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    dataStr = val;
  } else if (val && typeof val === 'object' && val.data) {
    dataStr = val.data;
  }
  if (!dataStr) return compObterDataHojeIso();

  // Se a data de evasão gravada for posterior a todas as aulas da turma
  // (caso onde o sistema sugeriu a data de hoje para um curso passado),
  // ajusta para a primeira data com falta do discente na turma
  if (CompState.diasLetivos && CompState.diasLetivos.length > 0) {
    const ultimoDia = CompState.diasLetivos[CompState.diasLetivos.length - 1];
    if (dataStr > ultimoDia) {
      const faltas = CompState.faltasPorAluno && CompState.faltasPorAluno[nome];
      let primeiraFalta = null;
      if (faltas) {
        for (const d of CompState.diasLetivos) {
          if (Number(faltas[d]) > 0) {
            primeiraFalta = d;
            break;
          }
        }
      }
      if (primeiraFalta) {
        CompState.evadidosPorAluno[nome] = primeiraFalta;
        compSalvarTurmaAtualStorage();
        return primeiraFalta;
      }
    }
  }

  return dataStr;
}

/**
 * Alterna o status de evasão do discente:
 * - Se já evadido: confirma se deseja desmarcar a evasão e restaurar ao status regular.
 * - Se não evadido: abre modal solicitando a data oficial de evasão.
 */
function compToggleEvasaoAluno(nome, event) {
  if (event) event.stopPropagation();
  if (!nome) return;

  if (!CompState.evadidosPorAluno) CompState.evadidosPorAluno = {};
  const isEvadidoAtual = Boolean(CompState.evadidosPorAluno[nome]);

  if (isEvadidoAtual) {
    const querRestaurar = confirm(`Discente "${nome}" está marcado como evadido.\n\nDeseja desmarcar a evasão e restaurá-lo ao status regular da turma?`);
    if (!querRestaurar) return;

    delete CompState.evadidosPorAluno[nome];
    compSalvarTurmaAtualStorage();
    compRenderizarDiario();
    compRenderizarVariaveis();
    compMostrarToast('Evasão Desfeita', `Discente "${nome}" restaurado ao status regular.`, 'info');
  } else {
    compAbrirModalEvasaoAluno(nome);
  }
}

/**
 * Abre o modal para informar a data de evasão do discente
 */
function compAbrirModalEvasaoAluno(nome) {
  _compAlunoEmEvasao = nome;
  const modal = document.getElementById('comp-modal-evasao');
  const subtitle = document.getElementById('evasao-modal-subtitle');
  const inputData = document.getElementById('comp-modal-evasao-data');
  if (!modal) return;

  if (subtitle) subtitle.textContent = nome;
  if (inputData) {
    let dataInicial = compObterDataHojeIso();

    const evAtual = CompState.evadidosPorAluno ? CompState.evadidosPorAluno[nome] : null;
    if (evAtual && typeof evAtual === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(evAtual)) {
      dataInicial = evAtual;
    } else if (CompState.diasLetivos && CompState.diasLetivos.length > 0) {
      // Sugere a data da primeira falta do aluno na turma
      const faltas = CompState.faltasPorAluno && CompState.faltasPorAluno[nome];
      let primeiraFalta = null;
      if (faltas) {
        for (const d of CompState.diasLetivos) {
          if (Number(faltas[d]) > 0) {
            primeiraFalta = d;
            break;
          }
        }
      }
      const primeiroDia = CompState.diasLetivos[0];
      const ultimoDia = CompState.diasLetivos[CompState.diasLetivos.length - 1];

      if (primeiraFalta) {
        dataInicial = primeiraFalta;
      } else if (dataInicial > ultimoDia) {
        dataInicial = ultimoDia;
      } else if (dataInicial < primeiroDia) {
        dataInicial = primeiroDia;
      }
    }

    if (CompState.diasLetivos && CompState.diasLetivos.length > 0) {
      inputData.min = CompState.diasLetivos[0];
      inputData.max = CompState.diasLetivos[CompState.diasLetivos.length - 1];
    }
    inputData.value = dataInicial;
  }

  modal.style.display = 'flex';
  setTimeout(() => { if (inputData) inputData.focus(); }, 100);
}

function compFecharModalEvasaoAluno() {
  const modal = document.getElementById('comp-modal-evasao');
  if (modal) modal.style.display = 'none';
  _compAlunoEmEvasao = null;
}

/**
 * Confirma a evasão registrando a data informada
 */
function compConfirmarEvasaoAlunoComData() {
  const nome = _compAlunoEmEvasao;
  if (!nome) return;

  const inputData = document.getElementById('comp-modal-evasao-data');
  let dataEvasao = inputData ? inputData.value : '';
  if (!dataEvasao) {
    dataEvasao = compObterDataHojeIso();
  }

  if (!CompState.evadidosPorAluno) CompState.evadidosPorAluno = {};
  CompState.evadidosPorAluno[nome] = dataEvasao;

  // Desliga flags ativas
  if (CompState.manualFlagAlunos) {
    delete CompState.manualFlagAlunos[nome];
  }

  // Move automaticamente para o final da lista de alunos da turma
  CompState.alunos = CompState.alunos.filter(a => a !== nome);
  CompState.alunos.push(nome);

  const turmaAtual = CompState.turmaInfo.turma;
  if (turmaAtual) {
    CompState.alunosPorTurma[turmaAtual] = [...CompState.alunos];
  }

  compSalvarTurmaAtualStorage();
  compFecharModalEvasaoAluno();
  compRenderizarDiario();
  compRenderizarVariaveis();

  const dataBr = compIsoToDDMMAAAA(dataEvasao);
  compMostrarToast('Discente Evadido', `Discente "${nome}" evadido a partir de ${dataBr} e movido para o final.`, 'warning');
}

function compSelecionarAlunoAtivo(nome) {
  CompState.alunoAtivo = nome;
  compRenderizarDiario();
  compRenderizarVariaveis();
}

// ==========================================================================
// EXPORTAÇÃO DO RELATÓRIO OFICIAL (Variaveis_info_t02.md)
// ==========================================================================

function compGerarRelatorio() {
  const now = new Date();
  const dataBr = now.toLocaleDateString('pt-BR');
  const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const aluno = CompState.alunoAtivo || (CompState.alunos.length > 0 ? CompState.alunos[0] : null);
  const valores = compCalcularValoresVariaveis(aluno);

  let md = `# Relatório de Variáveis — ${COMP_RELATORIO_FILENAME}\n`;
  md += `**Badge:** \`${COMP_BADGE}\`  \n`;
  md += `**Gerado em:** ${dataBr} às ${hora}  \n`;
  md += `**Discente Ativo:** ${aluno ? `\`${aluno}\`` : '_Nenhum aluno selecionado_'}  \n`;
  md += `**Curso:** ${CompState.turmaInfo.curso || 'Não informado'} | **Turma:** ${CompState.turmaInfo.turma || 'Não informado'} | **CH:** ${CompState.turmaInfo.chTotal}h\n\n`;
  md += `---\n\n`;
  md += `## Variáveis Normalizadas (24 Identificadores Canônicos)\n\n`;
  md += `| Chave Canônica | Nome Final | Valor Atual | Função / Hint | Dica de Implementação |\n`;
  md += `|---|---|---|---|---|\n`;

  for (const v of COMP_VARIAVEIS_META) {
    const config = CompState.variaveisConfig[v.key] || {};
    const nome = config.nome || v.nome;
    const funcao = config.funcao || v.funcao;
    const dica = config.dica || v.dica;
    const val = (valores[v.key] !== undefined && valores[v.key] !== null) ? String(valores[v.key]) : '';
    md += `| \`${v.key}\` | ${nome} | **${val}** | ${funcao} | ${dica} |\n`;
  }

  md += `\n---\n\n`;
  md += `## Dias Letivos Carregados (da Aba 1)\n\n`;
  md += `**Total:** ${CompState.diasLetivos.length} dias letivos ativos\n\n`;

  if (CompState.diasLetivos.length > 0) {
    md += CompState.diasLetivos.map(dKey => {
      const aula = CompState.aulasMap.get(dKey);
      const h = aula ? `${aula.horas}h` : '';
      return `- ${compIsoToDDMMAAAA(dKey)} (${h})`;
    }).join('\n');
    md += '\n';
  }

  md += `\n---\n\n`;
  md += `## Alunos e Faltas\n\n`;

  if (CompState.alunos.length === 0) {
    md += '_Nenhum aluno adicionado._\n';
  } else {
    for (const al of CompState.alunos) {
      const faltas = CompState.faltasPorAluno[al] || {};
      let total = 0;
      for (const d of CompState.diasLetivos) total += Number(faltas[d]) || 0;

      md += `### ${al}\n`;
      md += `**Total horas-falta:** ${total}h\n\n`;
      const entries = Object.entries(faltas).filter(([d, q]) => (Number(q) || 0) > 0 && CompState.diasLetivos.includes(d));
      if (entries.length > 0) {
        md += `| Dia | Horas-Falta |\n|---|---|\n`;
        entries.forEach(([d, q]) => {
          const label = d.includes('-') ? compIsoToDDMMAAAA(d) : d;
          md += `| ${label} | ${q}h |\n`;
        });
        md += '\n';
      } else {
        md += '_Sem faltas registradas._\n\n';
      }
    }
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = COMP_RELATORIO_FILENAME;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

// ==========================================================================
// UTILITÁRIOS DE CONVERSÃO E ESCAPING
// ==========================================================================

function compIsoToDDMM(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function compIsoToDDMMAAAA(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function compEscapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function compEscapeAttr(str) {
  return String(str)
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
}

function compSafeId(str) {
  return String(str).replace(/[^a-zA-Z0-9]/g, '_');
}

// ==========================================================================
// SISTEMA DE ABAS (TAB SWITCHER)
// ==========================================================================
let _currentTab = 'tab-cronograma';

function compInicializarAbas() {
  const tabs = document.querySelectorAll('.app-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetTab = tab.dataset.tab;
      if (targetTab === _currentTab) return;

      // Proteção de acesso à aba de Coordenação
      if (targetTab === 'tab-coordenacao') {
        const isCoordLogado = Boolean(
          window.authService?.currentUser &&
          window.authService.currentUser.role === 'coordenacao'
        );
        if (!isCoordLogado) {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          if (typeof window.compMostrarToast === 'function') {
            window.compMostrarToast('Acesso Restrito', 'Necessária Autenticação de Coordenação.', 'warning');
          } else if (typeof window.showToast === 'function') {
            window.showToast('Necessária Autenticação de Coordenação.');
          } else {
            alert('Necessária Autenticação de Coordenação.');
          }
          if (typeof window.authService?.abrirModalLogin === 'function') {
            window.authService.abrirModalLogin();
          }
          return;
        }
      }

      compTrocarAba(_currentTab, targetTab);
    });
  });
}

function compTrocarAba(from, to) {
  // Salvar imediatamente as alterações da página anterior antes de alternar
  if (from === 'tab-compensacao') {
    if (typeof compSalvarTurmaAtualStorage === 'function') {
      compSalvarTurmaAtualStorage();
    }
  } else if (from === 'tab-cronograma') {
    if (typeof salvarRascunhoFormularioDebounced === 'function') {
      salvarRascunhoFormularioDebounced();
    }
    if (typeof autoSaveActiveTurma === 'function') {
      autoSaveActiveTurma();
    }
  }
  // Barreira de segurança para impedir troca forçada sem autenticação de coordenação
  if (to === 'tab-coordenacao') {
    const isCoordLogado = Boolean(
      window.authService?.currentUser &&
      window.authService.currentUser.role === 'coordenacao'
    );
    if (!isCoordLogado) {
      if (typeof window.compMostrarToast === 'function') {
        window.compMostrarToast('Acesso Restrito', 'Necessária Autenticação de Coordenação.', 'warning');
      } else if (typeof window.showToast === 'function') {
        window.showToast('Necessária Autenticação de Coordenação.');
      } else {
        alert('Necessária Autenticação de Coordenação.');
      }
      if (typeof window.authService?.abrirModalLogin === 'function') {
        window.authService.abrirModalLogin();
      }
      return;
    }
  }

  const toEl = document.getElementById(to);
  if (!toEl) return;

  // 1. Exclusão mútua universal de páginas: oculta e desativa todas as outras
  document.querySelectorAll('.app-page').forEach(page => {
    if (page.id !== to) {
      page.classList.remove('page-active', 'page-exit-left', 'page-exit-right');
      page.style.display = 'none';
      page.style.opacity = '0';
      page.style.pointerEvents = 'none';
    }
  });

  // 2. Exclusão mútua na barra de navegação de abas
  document.querySelectorAll('.app-tab').forEach(tab => {
    if (tab.dataset.tab === to) {
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    } else {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    }
  });

  // 3. Ativa com exclusividade a página de destino
  toEl.classList.add('page-active');
  toEl.style.display = '';
  toEl.style.opacity = '1';
  toEl.style.transform = '';
  toEl.style.pointerEvents = 'all';

  _currentTab = to;

  if (to === 'tab-compensacao') {
    // Colapsar painel lateral da aba 1
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) sidebar.classList.add('is-collapsed');
    const resizer = document.getElementById('resizer-cronograma');
    if (resizer) resizer.style.display = 'none';

    compSincronizarAbaMae();
    compRenderizarDiario();
    compRenderizarVariaveis();
  } else if (to === 'tab-calendario') {
    // Colapsar painel lateral da aba 1 para visualização ampla de 12 meses
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) sidebar.classList.add('is-collapsed');
    const resizer = document.getElementById('resizer-cronograma');
    if (resizer) resizer.style.display = 'none';

    if (typeof calRenderizar === 'function') {
      calRenderizar();
    }
  } else if (to === 'tab-coordenacao') {
    // Colapsar painel lateral da aba 1 para visualização da governança da coordenação
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) sidebar.classList.add('is-collapsed');
    const resizer = document.getElementById('resizer-cronograma');
    if (resizer) resizer.style.display = 'none';

    if (typeof window.coordCarregarDados === 'function') {
      window.coordCarregarDados();
    }
  } else if (to === 'tab-cronograma') {
    // Restaurar painel lateral da aba 1
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) sidebar.classList.remove('is-collapsed');
    const resizer = document.getElementById('resizer-cronograma');
    if (resizer) resizer.style.display = 'none';
  }
}
window.compTrocarAba = compTrocarAba;

// ==========================================================================
// INSPEÇÃO DE VARIÁVEIS DA ABA 2 (LISTA VERTICAL COMPLETA • MODAL E 2ª ABA NAVEGADOR)
// ==========================================================================

/**
 * Coleta TODAS as variáveis em uso na Aba 2 sem nenhuma omissão.
 * Retorna os grupos estruturados com metadados, valores apurados e regras.
 */
function compObterTodasVariaveisAba2(aluno) {
  const valores = compCalcularValoresVariaveis(aluno);
  const overridesDoAluno = (aluno && CompState.overrides[aluno]) ? CompState.overrides[aluno] : {};
  const elUc = document.getElementById('unidadeCurricular');
  const elCoord = document.getElementById('coordenador');
  const ucVal = elUc ? elUc.value.trim() : '';
  const coordVal = elCoord ? elCoord.value.trim() : '';
  const hojeIso = compObterDataHojeIso();

  return [
    {
      grupoId: 'contexto',
      grupoTitulo: '1. Parâmetros e Contexto Geral da Aba 2',
      icone: '⚙️',
      items: [
        {
          key: 'turma',
          legacyKey: 'codigoTurma',
          nome: 'Código da Turma',
          valor: CompState.turmaInfo.turma || '(Não informado)',
          origem: 'Aba 1 • #codigoTurma',
          dica: 'Identificador oficial da turma sincronizado em tempo real da aba de cronograma'
        },
        {
          key: 'curso',
          legacyKey: 'nomeCurso',
          nome: 'Nome do Curso / Ocupação',
          valor: CompState.turmaInfo.curso || '(Não informado)',
          origem: 'Aba 1 • #nomeCurso',
          dica: 'Nome do curso técnico ou qualificação profissional'
        },
        {
          key: 'unidade_curricular',
          legacyKey: 'unidadeCurricular',
          nome: 'Unidade Curricular (UC)',
          valor: ucVal || '(Não informada)',
          origem: 'Aba 1 • #unidadeCurricular',
          dica: 'Unidade curricular específica sendo ministrada'
        },
        {
          key: 'docente',
          legacyKey: 'professor',
          nome: 'Professor / Responsável',
          valor: CompState.turmaInfo.docente || '(Não informado)',
          origem: 'Aba 1 • #docente',
          dica: 'Docente titular responsável pela turma'
        },
        {
          key: 'coordenador',
          legacyKey: 'coordenadorEscola',
          nome: 'Coordenador Pedagógico',
          valor: coordVal || '(Não informado)',
          origem: 'Aba 1 • #coordenador',
          dica: 'Coordenador responsável pela homologação da compensação'
        },
        {
          key: 'ch_total',
          legacyKey: 'cargaHorariaTotal',
          nome: 'Carga Horária Total da Turma',
          valor: `${CompState.turmaInfo.chTotal}h`,
          origem: 'Aba 1 • #cargaHorariaTotal',
          dica: 'Total de horas curriculares previstas para a disciplina'
        },
        {
          key: 'aula_55min',
          legacyKey: 'modulo55min',
          nome: 'Módulo de Aulas de 55 Minutos',
          valor: CompState.aula55min ? 'Ativado (55 min/aula)' : 'Desativado (Padrão: 60 min/aula)',
          origem: CompState.aula55minManual ? 'Manual (Sidebar Toggle)' : 'Automático (Horários)',
          dica: 'Define se a base de cálculo de horas fracionárias usa 55min ou 1 hora cheia'
        },
        {
          key: 'total_dias_letivos',
          legacyKey: 'activeLessonsCount',
          nome: 'Total de Dias Letivos Sincronizados',
          valor: `${CompState.diasLetivos.length} dias letivos ativos`,
          origem: 'Aba 1 • activeLessons',
          dica: 'Quantidade total de datas letivas ativas carregadas do cronograma'
        },
        {
          key: 'data_referencia_hoje',
          legacyKey: 'hojeIso',
          nome: 'Data de Referência (Hoje)',
          valor: `${compIsoToDDMMAAAA(hojeIso)} (${hojeIso})`,
          origem: CompState.dataSimuladaHoje ? 'Data Simulada de Teste' : 'Data do Sistema',
          dica: 'Data base utilizada para determinar as aulas já ministradas até o momento'
        },
        {
          key: 'modo_visualizacao_diario',
          legacyKey: 'viewMode',
          nome: 'Modo de Visualização do Diário',
          valor: CompState.viewMode === 'calendar' ? 'Calendário Individual' : 'Tabela Geral de Chamada',
          origem: 'Interface Aba 2',
          dica: 'Alterna entre tabela consolidada e calendário interativo com flip cards'
        },
        {
          key: 'design_icones_chamada',
          legacyKey: 'iconDesign',
          nome: 'Estilo de Ícones de Presença/Falta',
          valor: COMP_ICON_DESIGNS[CompState.iconDesign] ? COMP_ICON_DESIGNS[CompState.iconDesign].nome : 'Design 1',
          origem: 'Barra de Ferramentas do Diário',
          dica: 'Símbolos gráficos selecionados para marcar presenças e faltas na tabela'
        },
        {
          key: 'limite_alerta_faltas',
          legacyKey: 'thresholdFaltaFlag',
          nome: 'Limite de Alerta de Frequência',
          valor: `${CompState.thresholdFaltaFlag}% de faltas (Abaixo de ${100 - CompState.thresholdFaltaFlag}% presença)`,
          origem: 'Regra Institucional',
          dica: 'Dispara badges de atenção visual para discentes que necessitam de compensação'
        },
        {
          key: 'status_coordenacao',
          legacyKey: 'coordLocked',
          nome: 'Área Restrita da Coordenação',
          valor: CompState.coordenacao.desbloqueada ? '🔓 Desbloqueada (Edição Liberada)' : '🔒 Bloqueada (Senha Requerida)',
          origem: 'Segurança / Senha: cafe15',
          dica: 'Protege os pareceres conclusivos e assinaturas de autorização na página 2'
        }
      ]
    },
    {
      grupoId: 'formulario_24',
      grupoTitulo: '2. As 24 Variáveis Oficiais do Formulário de Compensação',
      icone: '📋',
      items: COMP_VARIAVEIS_META.map((v, idx) => {
        const config = CompState.variaveisConfig[v.key] || {};
        const nome = config.nome || v.nome;
        const dica = config.dica || v.dica;
        const valor = valores[v.key];
        const isOv = overridesDoAluno.hasOwnProperty(v.key);
        let valorDisplay = (valor !== undefined && valor !== null) ? String(valor) : '<vazio>';
        if (typeof valor === 'boolean') {
          valorDisplay = valor ? '☑ Marcado (Sim)' : '☐ Desmarcado (Não)';
        }

        return {
          num: idx + 1,
          key: v.key,
          legacyKey: v.legacyKey,
          nome: nome,
          valor: valorDisplay,
          origem: isOv ? 'Override Manual' : 'Cálculo Automático',
          isOverride: isOv,
          protegida: v.protegida,
          categoria: v.categoria,
          dica: dica
        };
      })
    },
    {
      grupoId: 'discentes_faltas',
      grupoTitulo: '3. Discentes Cadastrados e Apuração de Faltas',
      icone: '👥',
      items: [
        {
          key: 'total_discentes',
          legacyKey: 'alunosCount',
          nome: 'Total de Alunos Cadastrados',
          valor: `${CompState.alunos.length} discentes`,
          origem: 'Sidebar Aba 2',
          dica: 'Quantidade total de estudantes inseridos na lista de chamada'
        },
        {
          key: 'discente_ativo',
          legacyKey: 'alunoAtivo',
          nome: 'Discente Selecionado / em Foco',
          valor: aluno || '(Nenhum discente selecionado)',
          origem: 'Seleção Ativa',
          dica: 'Estudante objeto das 24 variáveis canônicas exibidas neste momento'
        },
        ...CompState.alunos.map(al => {
          const faltas = CompState.faltasPorAluno[al] || {};
          let totalF = 0;
          for (const d of CompState.diasLetivos) totalF += Number(faltas[d]) || 0;
          let pct = Math.floor(((CompState.turmaInfo.chTotal - totalF) / CompState.turmaInfo.chTotal) * 100);
          if (pct < 0) pct = 0;
          if (pct > 100) pct = 100;
          const isAtivo = al === aluno;

          return {
            key: `falta_${al.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            legacyKey: al,
            nome: `${al} ${isAtivo ? '⭐ (Discente em Foco)' : ''}`,
            valor: `${totalF}h de faltas | ${pct}% de Frequência`,
            origem: isAtivo ? 'Discente em Foco' : 'Lista Geral',
            dica: `Total acumulado de faltas nos ${CompState.diasLetivos.length} dias letivos ativos`
          };
        })
      ]
    }
  ];
}

function compInicializarInspecaoVariaveis() {
  const btnTopbar = document.getElementById('btn-temp-inspect-topbar');
  if (btnTopbar) {
    btnTopbar.addEventListener('click', () => {
      compTogglePopoverInspecaoVariaveis();
    });
  }

  const btnInspect = document.getElementById('comp-btn-temp-inspect');
  if (btnInspect) {
    btnInspect.addEventListener('click', (e) => {
      e.stopPropagation();
      compTogglePopoverInspecaoVariaveis();
    });
  }

  const popover = document.getElementById('comp-vars-popover');
  const btnClose = document.getElementById('comp-vars-popover-close');

  if (btnClose) {
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      compFecharPopoverInspecaoVariaveis();
    });
  }

  // Não fechar se clicar dentro do popover
  if (popover) {
    popover.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Fechar ao clicar fora
  document.addEventListener('click', () => {
    compFecharPopoverInspecaoVariaveis();
  });

  // Fechar no Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      compFecharPopoverInspecaoVariaveis();
      compFecharModalEdicaoReposicao();
    }
  });

  const searchInput = document.getElementById('comp-inspect-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const items = document.querySelectorAll('.comp-var-vertical-item');
      items.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = (!q || text.includes(q)) ? '' : 'none';
      });

      // Esconde cabeçalhos de grupos cujos itens foram todos filtrados
      const groups = document.querySelectorAll('.comp-inspect-group');
      groups.forEach(g => {
        const visible = g.querySelectorAll('.comp-var-vertical-item:not([style*="display: none"])');
        g.style.display = (visible.length > 0) ? '' : 'none';
      });
    });
  }

  const btnOpenTab = document.getElementById('comp-inspect-btn-open-tab');
  if (btnOpenTab) {
    btnOpenTab.addEventListener('click', compAbrirVariaveisNovaAbaNavegador);
  }

  const btnCopyJson = document.getElementById('comp-inspect-btn-copy-json');
  if (btnCopyJson) {
    btnCopyJson.addEventListener('click', () => {
      const aluno = CompState.alunoAtivo || (CompState.alunos.length > 0 ? CompState.alunos[0] : null);
      const grupos = compObterTodasVariaveisAba2(aluno);
      const payload = {
        _timestamp: new Date().toISOString(),
        _alunoAtivo: aluno,
        _turma: CompState.turmaInfo.turma,
        _curso: CompState.turmaInfo.curso,
        _chTotal: CompState.turmaInfo.chTotal,
        gruposVariaveis: grupos
      };
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
        compMostrarToast('JSON Copiado', 'Todas as variáveis da Aba 2 foram copiadas para a área de transferência.');
      }).catch(() => {
        prompt('Copie o JSON abaixo:', JSON.stringify(payload, null, 2));
      });
    });
  }

  const btnCopyMd = document.getElementById('comp-inspect-btn-copy-md');
  if (btnCopyMd) {
    btnCopyMd.addEventListener('click', () => {
      const aluno = CompState.alunoAtivo || (CompState.alunos.length > 0 ? CompState.alunos[0] : null);
      const grupos = compObterTodasVariaveisAba2(aluno);
      let md = `# Variáveis em Uso na Aba 2 (Compensação de Ausências)\n\n`;
      grupos.forEach(g => {
        md += `## ${g.icone} ${g.grupoTitulo}\n\n`;
        md += `| Nome / Chave | Chave Canônica | Alias Legacy | Valor Atual | Origem | Descrição |\n`;
        md += `|---|---|---|---|---|---|\n`;
        g.items.forEach(it => {
          md += `| ${it.nome} | \`${it.key}\` | \`${it.legacyKey || it.key}\` | **${it.valor}** | ${it.origem} | ${it.dica} |\n`;
        });
        md += `\n`;
      });
      navigator.clipboard.writeText(md).then(() => {
        compMostrarToast('Markdown Copiado', 'Lista completa de variáveis copiada em Markdown com sucesso!');
      }).catch(() => {
        prompt('Copie o Markdown abaixo:', md);
      });
    });
  }
}

function compTogglePopoverInspecaoVariaveis() {
  const popover = document.getElementById('comp-vars-popover');
  if (!popover) return;
  if (popover.style.display === 'none' || !popover.style.display) {
    compAbrirPopoverInspecaoVariaveis();
  } else {
    compFecharPopoverInspecaoVariaveis();
  }
}

function compAbrirPopoverInspecaoVariaveis() {
  compSincronizarAbaMae();

  if (_currentTab !== 'tab-compensacao') {
    compTrocarAba(_currentTab, 'tab-compensacao');
  }

  const aluno = CompState.alunoAtivo || (CompState.alunos.length > 0 ? CompState.alunos[0] : null);
  const valores = compCalcularValoresVariaveis(aluno);
  const grupos = compObterTodasVariaveisAba2(aluno);

  // Atualizar Banner de Contexto
  const banner = document.getElementById('comp-inspect-context-banner');
  if (banner) {
    banner.innerHTML = `
      <div class="comp-inspect-banner-item">
        <span class="comp-inspect-banner-label">Discente:</span>
        <span class="comp-inspect-banner-val comp-banner-text-truncate" style="max-width:180px;" title="${compEscapeAttr(aluno || '')}">${compEscapeHTML(aluno || 'Nenhum selecionado')}</span>
      </div>
      <div class="comp-inspect-banner-item">
        <span class="comp-inspect-banner-label">Turma:</span>
        <span class="comp-inspect-banner-val">${CompState.turmaInfo.turma || '—'}</span>
      </div>
      <div class="comp-inspect-banner-item">
        <span class="comp-inspect-banner-label">CH Total:</span>
        <span class="comp-inspect-banner-val">${CompState.turmaInfo.chTotal}h</span>
      </div>
      <div class="comp-inspect-banner-item">
        <span class="comp-inspect-banner-label">Aulas Dadas:</span>
        <span class="comp-inspect-banner-val">${valores['ch_aulas_dadas'] || '0h'}</span>
      </div>
      <div class="comp-inspect-banner-item">
        <span class="comp-inspect-banner-label">Faltas:</span>
        <span class="comp-inspect-banner-val" style="color: #ef4444;">${valores['total_horas_faltas'] || '0h'}</span>
      </div>
      <div class="comp-inspect-banner-item">
        <span class="comp-inspect-banner-label">Frequência:</span>
        <span class="comp-inspect-banner-val" style="color: #22c55e;">${valores['porcentagem_frequencia'] || '100%'}</span>
      </div>
    `;
  }

  // Preencher Lista Vertical Completa
  const listContainer = document.getElementById('comp-inspect-vertical-list');
  if (listContainer) {
    listContainer.innerHTML = '';

    grupos.forEach(grupo => {
      const groupEl = document.createElement('div');
      groupEl.className = 'comp-inspect-group';

      groupEl.innerHTML = `
        <div class="comp-inspect-group-header">
          <span class="comp-inspect-group-title">
            <span>${grupo.icone}</span>
            <span>${grupo.grupoTitulo}</span>
          </span>
          <span class="comp-inspect-group-count">${grupo.items.length} variáveis</span>
        </div>
      `;

      grupo.items.forEach((item, itemIdx) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'comp-var-vertical-item';

        const isOverride = item.isOverride;
        const badgeClass = isOverride ? 'comp-inspect-badge-override' : 'comp-inspect-badge-auto';
        const badgeLabel = isOverride ? 'OVERRIDE' : (item.origem || 'AUTO');

        itemEl.innerHTML = `
          <div class="comp-var-vert-header">
            <div class="comp-var-vert-title">
              <span class="comp-var-vert-num">#${item.num ? String(item.num).padStart(2, '0') : String(itemIdx + 1).padStart(2, '0')}</span>
              <span class="comp-var-vert-name">${item.nome}</span>
              <code class="comp-var-vert-key">${item.key}</code>
              ${item.legacyKey && item.legacyKey !== item.key ? `<span class="comp-var-vert-legacy">alias: ${item.legacyKey}</span>` : ''}
              ${item.protegida ? `<span title="Protegida por senha da coordenação">🔒</span>` : ''}
            </div>
            <span class="${badgeClass}">${badgeLabel}</span>
          </div>
          <div class="comp-var-vert-value-row">
            <span class="comp-var-vert-val-label">Valor Atual:</span>
            <span class="comp-var-vert-val-content">${item.valor}</span>
          </div>
          <div class="comp-var-vert-desc">
            <strong>Regra / Origem:</strong> ${item.dica}
          </div>
        `;
        groupEl.appendChild(itemEl);
      });

      listContainer.appendChild(groupEl);
    });
  }

  // Limpar busca
  const searchInput = document.getElementById('comp-inspect-search');
  if (searchInput) searchInput.value = '';

  const popover = document.getElementById('comp-vars-popover');
  if (popover) popover.style.display = 'flex';
}

function compFecharPopoverInspecaoVariaveis() {
  const popover = document.getElementById('comp-vars-popover');
  if (popover) popover.style.display = 'none';
}

function compAbrirVariaveisNovaAbaNavegador() {
  compSincronizarAbaMae();
  const aluno = CompState.alunoAtivo || (CompState.alunos.length > 0 ? CompState.alunos[0] : null);
  const valores = compCalcularValoresVariaveis(aluno);
  const grupos = compObterTodasVariaveisAba2(aluno);
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR');
  const horaFormatada = agora.toLocaleTimeString('pt-BR');

  let gruposHtml = '';
  grupos.forEach(grupo => {
    let itemsHtml = '';
    grupo.items.forEach((item, itemIdx) => {
      const isOv = item.isOverride;
      const badgeStyle = isOv
        ? 'background: rgba(245,158,11,0.15); color: #d97706; border: 1px solid rgba(245,158,11,0.4);'
        : 'background: rgba(34,197,94,0.12); color: #16a34a; border: 1px solid rgba(34,197,94,0.3);';
      const badgeText = isOv ? 'OVERRIDE' : (item.origem || 'AUTO');

      itemsHtml += `
        <div class="item">
          <div class="item-header">
            <div class="item-title">
              <span class="num">#${item.num ? String(item.num).padStart(2, '0') : String(itemIdx + 1).padStart(2, '0')}</span>
              <span class="name">${item.nome}</span>
              <code class="key">${item.key}</code>
              ${item.legacyKey && item.legacyKey !== item.key ? `<span class="legacy">alias: ${item.legacyKey}</span>` : ''}
              ${item.protegida ? `<span>🔒</span>` : ''}
            </div>
            <span class="badge" style="${badgeStyle}">${badgeText}</span>
          </div>
          <div class="value-row">
            <span class="val-label">Valor Atual:</span>
            <span class="val-content">${item.valor}</span>
          </div>
          <div class="desc">
            <strong>Regra / Origem:</strong> ${item.dica}
          </div>
        </div>
      `;
    });

    gruposHtml += `
      <div class="group">
        <div class="group-header">
          <span class="group-title">${grupo.icone} ${grupo.grupoTitulo}</span>
          <span class="group-count">${grupo.items.length} variáveis</span>
        </div>
        <div class="group-items">
          ${itemsHtml}
        </div>
      </div>
    `;
  });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Todas as Variáveis em Uso — Segunda Aba (Compensação) | SENAI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #f8fafc; color: #0f172a; padding: 24px; }
    .header { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header h1 { font-size: 20px; color: #0f172a; display: flex; align-items: center; gap: 8px; }
    .header p { font-size: 13px; color: #64748b; margin-top: 4px; }
    .banner { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #f1f5f9; font-size: 12.5px; }
    .banner-item strong { color: #0284c7; }
    .controls { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; justify-content: space-between; }
    .search-input { padding: 9px 14px; border: 1.5px solid #cbd5e1; border-radius: 8px; width: 360px; font-size: 13px; outline: none; }
    .search-input:focus { border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2,132,199,0.15); }
    .btn { padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; }
    .btn:hover { background: #f1f5f9; }
    
    .list-container { display: flex; flex-direction: column; gap: 16px; }
    .group { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .group-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; }
    .group-title { font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.3px; }
    .group-count { font-size: 10.5px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 12px; }
    .group-items { display: flex; flex-direction: column; gap: 8px; }
    
    .item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 5px; transition: all 0.15s ease; }
    .item:hover { border-color: #0284c7; background: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
    .item-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; }
    .item-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .num { font-size: 11px; font-weight: 800; color: #94a3b8; }
    .name { font-size: 13px; font-weight: 700; color: #0f172a; }
    .key { font-family: monospace; font-size: 11.5px; color: #0284c7; background: rgba(2,132,199,0.08); padding: 2px 6px; border-radius: 4px; font-weight: 700; }
    .legacy { font-size: 10px; color: #64748b; font-style: italic; }
    .badge { font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 4px; }
    .value-row { display: flex; align-items: baseline; gap: 8px; background: #ffffff; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 2px 0; }
    .val-label { font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .val-content { font-size: 13px; font-weight: 800; color: #0f172a; word-break: break-all; }
    .desc { font-size: 11px; color: #64748b; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚡ Todas as Variáveis em Uso na Segunda Aba (Compensação)</h1>
    <p>Lista vertical completa de todos os parâmetros, formulário e dados de chamada • Captura em ${dataFormatada} às ${horaFormatada}</p>
    <div class="banner">
      <div class="banner-item">Discente em Foco: <strong>${aluno || 'Nenhum discente selecionado'}</strong></div>
      <div class="banner-item">Turma: <strong>${CompState.turmaInfo.turma || '—'}</strong></div>
      <div class="banner-item">Curso: <strong>${CompState.turmaInfo.curso || '—'}</strong></div>
      <div class="banner-item">Carga Horária Total: <strong>${CompState.turmaInfo.chTotal}h</strong></div>
      <div class="banner-item">Aulas Dadas: <strong>${valores['ch_aulas_dadas'] || '0h'}</strong></div>
      <div class="banner-item">Total Faltas: <strong style="color: #ef4444;">${valores['total_horas_faltas'] || '0h'}</strong></div>
      <div class="banner-item">Frequência: <strong style="color: #16a34a;">${valores['porcentagem_frequencia'] || '100%'}</strong></div>
    </div>
  </div>

  <div class="controls">
    <input type="text" id="filtro" class="search-input" placeholder="Filtrar qualquer variável por chave, nome ou valor..." onkeyup="filtrar()">
    <div style="display:flex;gap:8px;">
      <button class="btn" onclick="window.print()">🖨️ Imprimir</button>
      <button class="btn" onclick="copiarJson()">📋 Copiar JSON</button>
      <button class="btn" onclick="window.close()">✕ Fechar Aba</button>
    </div>
  </div>

  <div class="list-container" id="lista-container">
    ${gruposHtml}
  </div>

  <script>
    const jsonDados = ${JSON.stringify(grupos, null, 2)};
    function filtrar() {
      const q = document.getElementById('filtro').value.toLowerCase();
      const items = document.querySelectorAll('.item');
      items.forEach(it => {
        it.style.display = (!q || it.innerText.toLowerCase().includes(q)) ? '' : 'none';
      });
      const groups = document.querySelectorAll('.group');
      groups.forEach(g => {
        const vis = g.querySelectorAll('.item:not([style*="display: none"])');
        g.style.display = (vis.length > 0) ? '' : 'none';
      });
    }
    function copiarJson() {
      navigator.clipboard.writeText(JSON.stringify(jsonDados, null, 2)).then(() => {
        alert('JSON completo de todas as variáveis copiado com sucesso!');
      });
    }
  <\/script>
</body>
</html>`;

  const novaGuia = window.open('', '_blank');
  if (novaGuia) {
    novaGuia.document.write(html);
    novaGuia.document.close();
  } else {
    alert('A janela pop-up foi bloqueada pelo navegador. O modal na segunda aba foi aberto como alternativa.');
  }
}

// ==========================================================================
// INICIALIZAÇÃO DA ABA
// ==========================================================================
function compInit() {
  compInicializarAbas();
  compInicializarModalCoordenacao();
  compInicializarModalAula();
  compInicializarModalNota();
  compInicializarInspecaoVariaveis();
  compSincronizarAbaMae();
  try {
    const savedColWidth = parseInt(localStorage.getItem('SENAI_COMP_COL_ALUNO_WIDTH'), 10);
    if (!isNaN(savedColWidth) && savedColWidth >= 75 && savedColWidth <= 450) {
      CompState.colAlunoWidth = savedColWidth;
      document.documentElement.style.setProperty('--comp-col-aluno-width', savedColWidth + 'px');
    }
  } catch (_) {}

  compRenderizarVariaveis();
  compRenderizarDiario();

  const btnAdd = document.getElementById('comp-btn-add-alunos');
  if (btnAdd) btnAdd.addEventListener('click', compAdicionarAlunos);

  const textarea = document.getElementById('comp-aluno-input');
  if (textarea) {
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        compAdicionarAlunos();
      }
    });
  }

  const btnRelatorio = document.getElementById('comp-btn-gerar-relatorio');
  if (btnRelatorio) btnRelatorio.addEventListener('click', compGerarRelatorio);

  const btnResetOverrides = document.getElementById('comp-btn-reset-overrides');
  if (btnResetOverrides) btnResetOverrides.addEventListener('click', compRestaurarTodosOverrides);

  // Modal de edição pré-impressão da reposição
  const btnCloseReposicao = document.getElementById('comp-modal-reposicao-close');
  if (btnCloseReposicao) btnCloseReposicao.addEventListener('click', compFecharModalEdicaoReposicao);

  const btnCancelReposicao = document.getElementById('comp-modal-reposicao-btn-cancel');
  if (btnCancelReposicao) btnCancelReposicao.addEventListener('click', compFecharModalEdicaoReposicao);

  const btnAddRowReposicao = document.getElementById('comp-modal-reposicao-btn-add-row');
  if (btnAddRowReposicao) btnAddRowReposicao.addEventListener('click', compAdicionarLinhaReposicaoManual);

  const btnCarregarFaltas = document.getElementById('comp-modal-reposicao-btn-carregar-faltas');
  if (btnCarregarFaltas) btnCarregarFaltas.addEventListener('click', compCarregarFaltasRegistradasModal);

  const btnLimparReposicao = document.getElementById('comp-modal-reposicao-btn-limpar');
  if (btnLimparReposicao) btnLimparReposicao.addEventListener('click', compLimparCamposReposicaoModal);

  const btnPrintBlankReposicao = document.getElementById('comp-modal-reposicao-btn-print-blank');
  if (btnPrintBlankReposicao) btnPrintBlankReposicao.addEventListener('click', compImprimirModalEmBranco);

  const btnPrintModalReposicao = document.getElementById('comp-modal-reposicao-btn-print');
  if (btnPrintModalReposicao) btnPrintModalReposicao.addEventListener('click', compConfirmarEImprimirModal);

  const modalReposicao = document.getElementById('comp-modal-reposicao-edit');
  if (modalReposicao) {
    modalReposicao.addEventListener('click', (e) => {
      if (e.target === modalReposicao) compFecharModalEdicaoReposicao();
    });
  }

  // Botões de Conteúdo Programático
  const btnAbrirConteudo = document.getElementById('comp-btn-abrir-conteudo-programatico');
  if (btnAbrirConteudo) btnAbrirConteudo.addEventListener('click', compAbrirModalConteudoProgramatico);

  const btnModalReposicaoConteudo = document.getElementById('comp-modal-reposicao-btn-conteudo');
  if (btnModalReposicaoConteudo) btnModalReposicaoConteudo.addEventListener('click', compAbrirModalConteudoProgramatico);

  const btnFecharConteudo = document.getElementById('comp-modal-conteudo-btn-fechar');
  if (btnFecharConteudo) btnFecharConteudo.addEventListener('click', compFecharModalConteudoProgramatico);

  const btnCloseConteudo = document.getElementById('comp-modal-conteudo-close');
  if (btnCloseConteudo) btnCloseConteudo.addEventListener('click', compFecharModalConteudoProgramatico);

  const btnAplicarLote = document.getElementById('comp-btn-aplicar-conteudo-lote');
  if (btnAplicarLote) btnAplicarLote.addEventListener('click', compDistribuirConteudoLote);

  const btnLimparLote = document.getElementById('comp-btn-limpar-conteudos-todos');
  if (btnLimparLote) btnLimparLote.addEventListener('click', compLimparTodosConteudos);

  const modalConteudo = document.getElementById('comp-modal-conteudo-programatico');
  if (modalConteudo) {
    modalConteudo.addEventListener('click', (e) => {
      if (e.target === modalConteudo) compFecharModalConteudoProgramatico();
    });
  }

  // Dropdown de faltas do discente
  const btnCloseDropdownFaltas = document.getElementById('comp-dropdown-faltas-close');
  if (btnCloseDropdownFaltas) btnCloseDropdownFaltas.addEventListener('click', compFecharDropdownFaltas);

  // Fechar dropdown ao clicar fora
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('comp-dropdown-faltas-dias');
    if (!dropdown || dropdown.style.display === 'none') return;
    if (!dropdown.contains(e.target) && !e.target.closest('[data-dropdown-falta-trigger]')) {
      compFecharDropdownFaltas();
    }
  });

  // Fechar no Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const dropdown = document.getElementById('comp-dropdown-faltas-dias');
      if (dropdown && dropdown.style.display !== 'none') {
        compFecharDropdownFaltas();
        return;
      }
      const modalCont = document.getElementById('comp-modal-conteudo-programatico');
      if (modalCont && modalCont.style.display !== 'none') {
        compFecharModalConteudoProgramatico();
        return;
      }
      const modalCoordAuth = document.getElementById('comp-modal-coordenacao-auth');
      if (modalCoordAuth && modalCoordAuth.style.display !== 'none') {
        compFecharModalAuthCoordenacao();
        return;
      }
      const modalCoordSettings = document.getElementById('comp-modal-coordenacao-settings');
      if (modalCoordSettings && modalCoordSettings.style.display !== 'none') {
        compFecharPainelConfiguracoesCoordenacao();
        return;
      }
    }
  });

  // Fechar dropdown se o corpo do modal de reposição for rolado
  const reposicaoBody = document.querySelector('#comp-modal-reposicao-edit .day-modal-body');
  if (reposicaoBody) {
    reposicaoBody.addEventListener('scroll', () => compFecharDropdownFaltas());
  }

  // Eventos da Área Restrita da Coordenação (Cadeado Externo e Seção por Discente)
  const btnLockCoord = document.getElementById('comp-btn-lock-coord');
  if (btnLockCoord) btnLockCoord.addEventListener('click', compToggleLockCoordenacaoExterno);
  compAtualizarStatusCadeadoUI();

  const btnModalReposicaoCoord = document.getElementById('comp-modal-reposicao-btn-coordenacao');
  if (btnModalReposicaoCoord) btnModalReposicaoCoord.addEventListener('click', compFocarSecaoCoordModal);

  const btnModalCoordTriState = document.getElementById('comp-modal-coord-btn-tristate');
  if (btnModalCoordTriState) btnModalCoordTriState.addEventListener('click', compAlternarTriStateModalCoord);

  const textareaModalCoordObs = document.getElementById('comp-modal-coord-obs-textarea');
  if (textareaModalCoordObs) textareaModalCoordObs.addEventListener('input', compAtualizarModalCoordObservacaoUI);

  const btnModalCoordLimpar = document.getElementById('comp-modal-coord-btn-limpar');
  if (btnModalCoordLimpar) btnModalCoordLimpar.addEventListener('click', compLimparParecerModalCoord);

  // Modal de Autenticação da Coordenação
  const btnAuthClose = document.getElementById('comp-modal-coord-auth-close');
  if (btnAuthClose) btnAuthClose.addEventListener('click', compFecharModalAuthCoordenacao);

  const btnAuthCancel = document.getElementById('comp-modal-coord-auth-cancel');
  if (btnAuthCancel) btnAuthCancel.addEventListener('click', compFecharModalAuthCoordenacao);

  const btnAuthSubmit = document.getElementById('comp-modal-coord-auth-submit');
  if (btnAuthSubmit) btnAuthSubmit.addEventListener('click', compAutenticarCoordenacao);

  const inputPassCoord = document.getElementById('comp-coord-password-input');
  if (inputPassCoord) {
    inputPassCoord.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        compAutenticarCoordenacao();
      }
    });
  }

  // Modal de Evasão com Data
  const btnEvasaoClose = document.getElementById('comp-modal-evasao-close');
  if (btnEvasaoClose) btnEvasaoClose.addEventListener('click', compFecharModalEvasaoAluno);

  const btnEvasaoCancel = document.getElementById('comp-modal-evasao-cancel');
  if (btnEvasaoCancel) btnEvasaoCancel.addEventListener('click', compFecharModalEvasaoAluno);

  const btnEvasaoConfirm = document.getElementById('comp-modal-evasao-confirm');
  if (btnEvasaoConfirm) btnEvasaoConfirm.addEventListener('click', compConfirmarEvasaoAlunoComData);

  const modalEvasao = document.getElementById('comp-modal-evasao');
  if (modalEvasao) {
    modalEvasao.addEventListener('click', (e) => {
      if (e.target === modalEvasao) compFecharModalEvasaoAluno();
    });
  }

  // Toggle manual de aulas em minutos proporcionais e input numérico
  const toggle55 = document.getElementById('comp-sidebar-toggle-55min');
  if (toggle55) {
    toggle55.addEventListener('change', (e) => {
      CompState.aula55min = e.target.checked;
      CompState.aula55minManual = true;
      compAtualizarInfoDiasLetivos();
      compRenderizarDiario();
      compRenderizarVariaveis();
    });
  }

  const inputMinutos = document.getElementById('comp-input-minutos-modulo');
  if (inputMinutos) {
    inputMinutos.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val > 0) {
        CompState.minutosModulo = val;
        // Se o usuário digitou minutos, liga o toggle caso ainda esteja desmarcado
        if (!CompState.aula55min && toggle55) {
          CompState.aula55min = true;
          CompState.aula55minManual = true;
          toggle55.checked = true;
        }
        compAtualizarInfoDiasLetivos();
        compRenderizarDiario();
        compRenderizarVariaveis();
      }
    });
  }

  // Sincronização via evento customizado emitido pelo app.js após updatePreview()
  document.addEventListener('comp:diasLetivosAtualizados', () => {
    compSincronizarAbaMae();
    compRenderizarDiario();
    compRenderizarVariaveis();
  });
}

// Exportações explícitas no window para handlers HTML inline
window.compAbrirDropdownFaltas = compAbrirDropdownFaltas;
window.compFecharDropdownFaltas = compFecharDropdownFaltas;
window.compSelecionarFaltaDropdown = compSelecionarFaltaDropdown;
window.compAbrirModalConteudoProgramatico = compAbrirModalConteudoProgramatico;
window.compFecharModalConteudoProgramatico = compFecharModalConteudoProgramatico;
window.compAlternarAbaConteudo = compAlternarAbaConteudo;
window.compToggleDrawerLote = compToggleDrawerLote;
window.compToggleDrawerAulas = compToggleDrawerAulas;
window.compAtualizarBotoesDrawerHeader = compAtualizarBotoesDrawerHeader;
window.compAtualizarConteudoDia = compAtualizarConteudoDia;
window.compDistribuirConteudoLote = compDistribuirConteudoLote;
window.compLimparTodosConteudos = compLimparTodosConteudos;
window.compObterLinhasReposicaoAluno = compObterLinhasReposicaoAluno;
window.compAbrirModalEdicaoReposicao = compAbrirModalEdicaoReposicao;
window.compFecharModalEdicaoReposicao = compFecharModalEdicaoReposicao;
window.compAtualizarLinhaReposicao = compAtualizarLinhaReposicao;
window.compRemoverLinhaReposicao = compRemoverLinhaReposicao;
window.compAdicionarLinhaReposicaoManual = compAdicionarLinhaReposicaoManual;
window.compCarregarFaltasRegistradasModal = compCarregarFaltasRegistradasModal;
window.compLimparCamposReposicaoModal = compLimparCamposReposicaoModal;
window.compImprimirModalEmBranco = compImprimirModalEmBranco;
window.compConfirmarEImprimirModal = compConfirmarEImprimirModal;
window.compAbrirModalCoordenacao = compAbrirModalCoordenacao;
window.compFecharModalAuthCoordenacao = compFecharModalAuthCoordenacao;
window.compAutenticarCoordenacao = compAutenticarCoordenacao;
window.compToggleLockCoordenacaoExterno = compToggleLockCoordenacaoExterno;
window.compAtualizarStatusCadeadoUI = compAtualizarStatusCadeadoUI;
window.compAtualizarSecaoCoordModalReposicao = compAtualizarSecaoCoordModalReposicao;
window.compAlternarAbaModalReposicao = compAlternarAbaModalReposicao;
window.compAlternarTriStateModalCoord = compAlternarTriStateModalCoord;
window.compAtualizarModalCoordObservacaoUI = compAtualizarModalCoordObservacaoUI;
window.compLimparParecerModalCoord = compLimparParecerModalCoord;
window.compFocarSecaoCoordModal = compFocarSecaoCoordModal;
window.compObterCoordenacaoAluno = compObterCoordenacaoAluno;
window.compSalvarCoordenacaoAluno = compSalvarCoordenacaoAluno;
window.compToggleDestacarColunaData = compToggleDestacarColunaData;
window.compAtualizarDestaqueColunaDataUI = compAtualizarDestaqueColunaDataUI;
window.compToggleFlagManual = compToggleFlagManual;
window.compToggleEvasaoAluno = compToggleEvasaoAluno;
window.compAbrirModalEvasaoAluno = compAbrirModalEvasaoAluno;
window.compFecharModalEvasaoAluno = compFecharModalEvasaoAluno;
window.compConfirmarEvasaoAlunoComData = compConfirmarEvasaoAlunoComData;
window.compObterDataEvasaoAluno = compObterDataEvasaoAluno;
window.compSalvarTurmaAtualStorage = compSalvarTurmaAtualStorage;
window.compExportarDadosCompletos = compExportarDadosCompletos;
window.compImportarDadosCompletos = compImportarDadosCompletos;
window.compSincronizarAbaMae = compSincronizarAbaMae;
window.compRenderizarDiario = compRenderizarDiario;
window.compRenderizarVariaveis = compRenderizarVariaveis;
window.compAlternarSubViewDiario = compAlternarSubViewDiario;
window.compCalcularFrequenciaAteHoje = compCalcularFrequenciaAteHoje;
window.compObterStatusFlagAluno = compObterStatusFlagAluno;
window.compCalcularValoresVariaveis = compCalcularValoresVariaveis;
window.compObterFaltasAteHoje = compObterFaltasAteHoje;
window.compFormatarHorasParaHHMM = compFormatarHorasParaHHMM;
window.CompState = CompState;
window.compAdicionarAluno = compAdicionarAluno;
window.compAdicionarAlunos = compAdicionarAlunos;



if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', compInit);
} else {
  compInit();
}

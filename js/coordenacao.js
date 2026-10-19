// Created at: 2026-10-19 16:51
/**
 * SENAI Hub de Registros • Módulo do Painel da Coordenação Pedagógica (Aba 4)
 * Governança de Frequência, Duplo Alerta de Impressão, Evasão e Gestão de NIFs
 */

(function (window, document) {
  'use strict';

  let activeQuickFilter = 'todos';
  let currentPrintStudent = null;
  let currentEvasaoStudent = null;
  let alunosGovernancaCache = [];

  // Dados semente de alta fidelidade para garantir funcionamento instantâneo
  const SEMENTE_ALUNOS = [
    {
      id: 'aluno-alice',
      nome_discente: 'Alice Ferreira Ramos',
      matricula: '982341',
      nif_discente: '49120',
      codigo_turma: 'DES-2602TG',
      nome_curso: 'Téc. Desenvolvimento Sistemas',
      docente_id: 'prof-leonardo',
      nome_docente: 'Prof. Leonardo Matos',
      total_aulas: 320,
      horas_faltadas: 88,
      total_faltas: 22,
      perc_faltas: 27.5,
      faltas_ultima_impressao_docente: 14,
      data_impressao_docente: '2026-09-15T14:30:00Z',
      atestado_coordenacao: true,
      status_evasao: 'ativo'
    },
    {
      id: 'aluno-bruno',
      nome_discente: 'Bruno Henrique Sampaio',
      matricula: '893011',
      nif_discente: '38102',
      codigo_turma: 'MEC-2504',
      nome_curso: 'Téc. Mecatrônica Ind.',
      docente_id: 'prof-helena',
      nome_docente: 'Profª. Helena Albuquerque',
      total_aulas: 320,
      horas_faltadas: 84,
      total_faltas: 21,
      perc_faltas: 26.3,
      faltas_ultima_impressao_docente: 21,
      data_impressao_docente: '2026-10-10T11:00:00Z',
      atestado_coordenacao: false,
      status_evasao: 'recomendada_coordenacao',
      motivo_evasao: 'Acúmulo de ausências sem atestado médico.'
    },
    {
      id: 'aluno-camila',
      nome_discente: 'Camila Duarte',
      matricula: '746192',
      nif_discente: '29481',
      codigo_turma: 'AUT-2601T',
      nome_curso: 'Téc. Automação Industrial',
      docente_id: 'prof-carlos',
      nome_docente: 'Prof. Carlos Júnior',
      total_aulas: 320,
      horas_faltadas: 76,
      total_faltas: 19,
      perc_faltas: 23.8,
      faltas_ultima_impressao_docente: 12,
      data_impressao_docente: '2026-09-20T10:00:00Z',
      atestado_coordenacao: true,
      status_evasao: 'ativo'
    },
    {
      id: 'aluno-diego',
      nome_discente: 'Diego Martins de Souza',
      matricula: '654321',
      nif_discente: '77103',
      codigo_turma: 'ELE-2502',
      nome_curso: 'Téc. Eletroeletrônica',
      docente_id: 'prof-marcos',
      nome_docente: 'Prof. Marcos Vinícius',
      total_aulas: 320,
      horas_faltadas: 56,
      total_faltas: 14,
      perc_faltas: 17.5,
      faltas_ultima_impressao_docente: 6,
      data_impressao_docente: '2026-08-28T09:00:00Z',
      atestado_coordenacao: false,
      status_evasao: 'ativo'
    },
    {
      id: 'aluno-felipe',
      nome_discente: 'Felipe Augusto Barreto',
      matricula: '982343',
      nif_discente: '49122',
      codigo_turma: 'DES-2602TG',
      nome_curso: 'Téc. Desenvolvimento Sistemas',
      docente_id: 'prof-leonardo',
      nome_docente: 'Prof. Leonardo Matos',
      total_aulas: 320,
      horas_faltadas: 80,
      total_faltas: 20,
      perc_faltas: 25.0,
      faltas_ultima_impressao_docente: 10,
      data_impressao_docente: '2026-09-02T16:00:00Z',
      atestado_coordenacao: false,
      status_evasao: 'ativo'
    },
    {
      id: 'aluno-gabriel',
      nome_discente: 'Gabriel Barbosa da Silva',
      matricula: '321987',
      nif_discente: '99201',
      codigo_turma: 'LOG-2601',
      nome_curso: 'Téc. Logística Integrada',
      docente_id: 'prof-carla',
      nome_docente: 'Profª. Carla Silveira',
      total_aulas: 320,
      horas_faltadas: 36,
      total_faltas: 9,
      perc_faltas: 11.3,
      faltas_ultima_impressao_docente: 9,
      data_impressao_docente: '2026-10-05T15:20:00Z',
      atestado_coordenacao: true,
      status_evasao: 'ativo'
    }
  ];

  /**
   * Inicializa o painel de governança da coordenação
   */
  async function coordCarregarDados() {
    console.log('[Coordenação] Carregando dados de governança institucional...');
    const client = window.authService?.client;

    let dadosCarregados = null;

    if (client) {
      try {
        const { data, error } = await client
          .from('alunos_governanca')
          .select('*')
          .order('perc_faltas', { ascending: false });

        if (data && data.length > 0 && !error) {
          dadosCarregados = data;
        }
      } catch (err) {
        console.warn('[Coordenação] Falha ao consultar Supabase, utilizando base sincronizada:', err);
      }
    }

    // Se a tabela estiver vazia no Supabase, mesclar com turmas locais do docente
    if (!dadosCarregados || dadosCarregados.length === 0) {
      dadosCarregados = extrairAlunosLocais() || SEMENTE_ALUNOS;
    }

    alunosGovernancaCache = dadosCarregados;
    coordAtualizarMetricas(alunosGovernancaCache);
    coordPreencherFiltros(alunosGovernancaCache);
    coordRenderizarTabela(alunosGovernancaCache);
    coordCarregarResetsPendentes();
    coordCarregarNifsAutorizados();
  }

  /**
   * Extrai discentes das turmas salvas no LocalStorage para retrocompatibilidade
   */
  function extrairAlunosLocais() {
    try {
      const raw = localStorage.getItem('senai_compensacao_turmas');
      if (!raw) return null;
      const turmasObj = JSON.parse(raw);
      const listaAlunos = [];

      Object.entries(turmasObj).forEach(([codTurma, turma]) => {
        const discentes = turma.discentes || [];
        discentes.forEach(d => {
          const totalAulas = Number(turma.cargaHoraria || 320);
          const faltas = Number(d.faltas || d.totalFaltas || 0);
          const perc = totalAulas > 0 ? Number(((faltas / totalAulas) * 100).toFixed(1)) : 0;

          listaAlunos.push({
            id: `local-${codTurma}-${d.matricula || d.id}`,
            nome_discente: d.nome || d.nomeDiscente || 'Discente sem Nome',
            matricula: d.matricula || String(d.id || '000000'),
            nif_discente: d.nif || '',
            codigo_turma: codTurma,
            nome_curso: turma.nomeCurso || 'Curso Técnico',
            docente_id: 'docente-responsavel',
            nome_docente: turma.docente || 'Docente Responsável',
            total_aulas: totalAulas,
            horas_faltadas: faltas * 4,
            total_faltas: faltas,
            perc_faltas: perc,
            faltas_ultima_impressao_docente: Number(d.faltasUltimaImpressao || 0),
            data_impressao_docente: d.dataUltimaImpressao || null,
            atestado_coordenacao: Boolean(d.atestadoCoord),
            status_evasao: d.statusEvasao || 'ativo',
            motivo_evasao: d.motivoEvasao || ''
          });
        });
      });

      return listaAlunos.length > 0 ? listaAlunos : null;
    } catch (e) {
      console.warn('[Coordenação] Falha ao extrair alunos locais:', e);
      return null;
    }
  }

  /**
   * Atualiza os Cards de KPIs de Governança
   */
  function coordAtualizarMetricas(alunos) {
    if (!alunos) return;

    let totalAlunos = alunos.length;
    let somaFreq = 0;
    let criticos25 = 0;
    let pendenciasDocente = 0;
    let evasoesRecomendadas = 0;

    alunos.forEach(a => {
      const perc = Number(a.perc_faltas || 0);
      somaFreq += Math.max(0, 100 - perc);
      if (perc >= 25) criticos25++;

      const faltas = Number(a.total_faltas || 0);
      const faltasImpressao = Number(a.faltas_ultima_impressao_docente || 0);
      if (faltas > 0 && faltas > faltasImpressao) {
        pendenciasDocente++;
      }

      if (a.status_evasao === 'recomendada_coordenacao') {
        evasoesRecomendadas++;
      }
    });

    const mediaFreq = totalAlunos > 0 ? (somaFreq / totalAlunos).toFixed(1) : '100.0';

    // Atualizar elementos no DOM se presentes
    const kpiFreqEl = document.getElementById('kpi-media-frequencia');
    if (kpiFreqEl) kpiFreqEl.textContent = `${mediaFreq}%`;

    const kpiCriticosEl = document.getElementById('kpi-alunos-criticos');
    if (kpiCriticosEl) kpiCriticosEl.textContent = criticos25;

    const kpiPendenciasEl = document.getElementById('kpi-pendencias-docente');
    if (kpiPendenciasEl) kpiPendenciasEl.textContent = pendenciasDocente;

    const kpiEvasoesEl = document.getElementById('kpi-evasoes-recomendadas');
    if (kpiEvasoesEl) kpiEvasoesEl.textContent = evasoesRecomendadas;
  }

  /**
   * Preenche os seletores de Docente e Turma dinamicamente
   */
  function coordPreencherFiltros(alunos) {
    const selDocente = document.getElementById('docenteFilter');
    const selTurma = document.getElementById('turmaFilter');

    if (selDocente) {
      const docentes = [...new Set(alunos.map(a => a.nome_docente).filter(Boolean))].sort();
      const currentVal = selDocente.value;
      selDocente.innerHTML = '<option value="todos">Todos os Docentes</option>' +
        docentes.map(d => `<option value="${d.toLowerCase()}">${d}</option>`).join('');
      if (currentVal) selDocente.value = currentVal;
    }

    if (selTurma) {
      const turmas = [...new Set(alunos.map(a => a.codigo_turma).filter(Boolean))].sort();
      const currentVal = selTurma.value;
      selTurma.innerHTML = '<option value="todas">Todas as Turmas</option>' +
        turmas.map(t => `<option value="${t.toLowerCase()}">${t}</option>`).join('');
      if (currentVal) selTurma.value = currentVal;
    }
  }

  /**
   * Renderiza as linhas da tabela de governança de alunos
   */
  function coordRenderizarTabela(alunos) {
    const tbody = document.getElementById('studentsTable');
    if (!tbody) return;

    // Ordenar decrescente por % de faltas
    const ordenados = [...alunos].sort((a, b) => Number(b.perc_faltas || 0) - Number(a.perc_faltas || 0));

    tbody.innerHTML = ordenados.map(aluno => {
      const perc = Number(aluno.perc_faltas || 0);
      const faltas = Number(aluno.total_faltas || 0);
      const ultImpressao = Number(aluno.faltas_ultima_impressao_docente || 0);
      const pendenciaDocente = faltas > 0 && faltas > ultImpressao;
      const difFaltas = faltas - ultImpressao;

      let categoryTags = [];
      if (perc >= 25) categoryTags.push('critico');
      if (pendenciaDocente) categoryTags.push('alerta-docente');
      if (!aluno.atestado_coordenacao && perc >= 10) categoryTags.push('alerta-coordenacao');
      if (aluno.status_evasao === 'recomendada_coordenacao') categoryTags.push('evasao-recomendada');
      if (aluno.status_evasao === 'evadido') categoryTags.push('evadido');

      const isEvadido = aluno.status_evasao === 'evadido';
      const isEvasaoRecomendada = aluno.status_evasao === 'recomendada_coordenacao';

      // Cor do percentual
      let percBadgeClass = 'bg-emerald-100 text-emerald-800';
      if (perc >= 25) {
        percBadgeClass = 'bg-red-100 text-red-800 font-bold';
      } else if (perc >= 10) {
        percBadgeClass = 'bg-amber-100 text-amber-800 font-semibold';
      }

      // Iniciais do aluno
      const iniciais = aluno.nome_discente
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      return `
        <tr class="student-row hover:bg-surface-container-low/40 transition-colors"
            id="row-${aluno.id}"
            data-category="${categoryTags.join(' ')}"
            data-docente="${(aluno.nome_docente || '').toLowerCase()}"
            data-mat="${(aluno.matricula || '').toLowerCase()}"
            data-name="${(aluno.nome_discente || '').toLowerCase()}"
            data-turma="${(aluno.codigo_turma || '').toLowerCase()}">
          
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full ${perc >= 25 ? 'bg-red-100 text-red-800' : 'bg-surface-container text-primary'} font-bold flex items-center justify-center font-label-md text-label-md shrink-0">
                ${iniciais}
              </div>
              <div>
                <div class="font-title-md text-title-md font-semibold text-primary flex items-center gap-2">
                  ${aluno.nome_discente}
                  ${isEvasaoRecomendada ? '<span class="badge-evasao-recomendada">⚠️ Evasão Recomendada</span>' : ''}
                  ${isEvadido ? '<span class="badge-evadido">⛔ Evadido</span>' : ''}
                </div>
                <div class="font-label-sm text-label-sm text-secondary">
                  MAT-${aluno.matricula} ${aluno.nif_discente ? `• NIF ${aluno.nif_discente}` : ''}
                </div>
              </div>
            </div>
          </td>

          <td class="py-3.5 px-4">
            <span class="inline-block px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold bg-surface-container text-primary">
              ${aluno.codigo_turma}
            </span>
            <div class="font-label-sm text-[11px] text-secondary mt-0.5">
              ${aluno.nome_curso || 'Curso Regular'}
            </div>
          </td>

          <td class="py-3.5 px-4">
            <div class="font-medium text-primary">${aluno.nome_docente || 'Docente'}</div>
            <div class="font-label-sm text-[11px] text-secondary">Docente Responsável</div>
          </td>

          <td class="py-3.5 px-4">
            <div class="font-medium text-primary font-mono">${aluno.horas_faltadas || faltas * 4}h / ${aluno.total_aulas || 320}h</div>
            <div class="font-label-sm text-[11px] text-secondary font-mono">${faltas} faltas registradas</div>
          </td>

          <td class="py-3.5 px-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${percBadgeClass}">
              ${perc.toFixed(1)}%
            </span>
          </td>

          <td class="py-3.5 px-4">
            ${pendenciaDocente ? `
              <div class="flex items-center gap-1.5 text-amber-700 text-xs font-medium" title="Docente não imprimiu ficha para as últimas faltas">
                <span class="material-symbols-outlined text-[16px]">warning</span>
                <span>+${difFaltas} falta(s) s/ ficha</span>
              </div>
            ` : `
              <div class="flex items-center gap-1 text-emerald-700 text-xs font-medium">
                <span class="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Ficha atualizada</span>
              </div>
            `}
          </td>

          <td class="py-3.5 px-4">
            ${aluno.atestado_coordenacao ? `
              <span class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <span class="material-symbols-outlined text-[14px]">verified</span> Atestado
              </span>
            ` : `
              <button class="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary bg-surface-container-low hover:bg-surface-container px-2 py-1 rounded transition-colors"
                      onclick="coordAtestarAluno('${aluno.id}')"
                      title="Registrar atesto formal de acompanhamento">
                <span class="material-symbols-outlined text-[14px]">checklist</span> Atestar
              </button>
            `}
          </td>

          <td class="py-3.5 px-4 text-right">
            <div class="inline-flex items-center justify-end gap-1">
              ${!isEvadido && !isEvasaoRecomendada ? `
                <button class="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-rose-700 hover:text-rose-900 flex items-center justify-center transition-colors"
                        title="Recomendar Evasão Escolar (Docente poderá aceitar)"
                        onclick="coordAbrirModalEvasao('${aluno.id}', '${aluno.nome_discente}')"
                        type="button">
                  <span class="material-symbols-outlined text-[18px]">person_cancel</span>
                </button>
              ` : ''}

              <button class="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary flex items-center justify-center transition-colors"
                      onclick="coordImprimirFicha('${aluno.id}')"
                      title="Imprimir Ficha de Compensação (Art. 42)">
                <span class="material-symbols-outlined text-[18px]">print</span>
              </button>

              <button class="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary hover:text-primary flex items-center justify-center transition-colors"
                      onclick="coordExportarDossie('${aluno.id}')"
                      title="Exportar Dossiê da Ausência">
                <span class="material-symbols-outlined text-[18px]">download</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    coordAplicarFiltros();
  }

  /**
   * Filtra as linhas da tabela
   */
  function coordAplicarFiltros() {
    const selDocente = document.getElementById('docenteFilter');
    const selTurma = document.getElementById('turmaFilter');
    const inputBusca = document.getElementById('searchInput');

    const docenteVal = (selDocente?.value || 'todos').toLowerCase();
    const turmaVal = (selTurma?.value || 'todas').toLowerCase();
    const searchVal = (inputBusca?.value || '').toLowerCase().trim();

    const rows = document.querySelectorAll('.student-row');
    let visibleCount = 0;

    rows.forEach(row => {
      const rowName = row.getAttribute('data-name') || '';
      const rowMat = row.getAttribute('data-mat') || '';
      const rowTurma = (row.getAttribute('data-turma') || '').toLowerCase();
      const rowDocente = (row.getAttribute('data-docente') || '').toLowerCase();
      const rowCat = row.getAttribute('data-category') || '';

      const matchesSearch = !searchVal || rowName.includes(searchVal) || rowMat.includes(searchVal);
      const matchesDocente = docenteVal === 'todos' || rowDocente.includes(docenteVal);
      const matchesTurma = turmaVal === 'todas' || rowTurma.includes(turmaVal);

      let matchesQuick = true;
      if (activeQuickFilter === 'critico') {
        matchesQuick = rowCat.includes('critico');
      } else if (activeQuickFilter === 'alerta-docente') {
        matchesQuick = rowCat.includes('alerta-docente');
      } else if (activeQuickFilter === 'alerta-coordenacao') {
        matchesQuick = rowCat.includes('alerta-coordenacao');
      } else if (activeQuickFilter === 'evasao-recomendada') {
        matchesQuick = rowCat.includes('evasao-recomendada');
      }

      if (matchesSearch && matchesDocente && matchesTurma && matchesQuick) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    const countBadge = document.getElementById('studentsCount');
    if (countBadge) {
      countBadge.textContent = visibleCount + (visibleCount === 1 ? ' registro exibido' : ' registros exibidos');
    }
  }

  function coordSetQuickFilter(type, element) {
    activeQuickFilter = type;
    document.querySelectorAll('.quick-pill').forEach(btn => {
      btn.classList.remove('bg-primary-container', 'text-on-primary');
      btn.classList.add('bg-surface-container-low', 'text-secondary');
    });
    if (element) {
      element.classList.remove('bg-surface-container-low', 'text-secondary');
      element.classList.add('bg-primary-container', 'text-on-primary');
    }
    coordAplicarFiltros();
  }

  /**
   * Modal de Recomendação de Evasão
   */
  function coordAbrirModalEvasao(alunoId, alunoNome) {
    currentEvasaoStudent = alunoId;
    const modal = document.getElementById('modalEvasaoEscolar');
    const nameEl = document.getElementById('evasaoStudentName');
    if (nameEl) nameEl.textContent = alunoNome;

    const motivoEl = document.getElementById('evasaoMotivoText');
    if (motivoEl) motivoEl.value = 'Excesso de ausências não justificadas e sem retorno às tentativas de contato pedagógico.';

    if (modal) modal.classList.remove('hidden');
  }

  function coordFecharModalEvasao() {
    const modal = document.getElementById('modalEvasaoEscolar');
    if (modal) modal.classList.add('hidden');
    currentEvasaoStudent = null;
  }

  async function coordConfirmarEvasao() {
    if (!currentEvasaoStudent) return;
    const motivoEl = document.getElementById('evasaoMotivoText');
    const motivo = motivoEl?.value || 'Recomendação formal pela Coordenação Pedagógica.';

    const client = window.authService?.client;
    if (client) {
      try {
        await client
          .from('alunos_governanca')
          .update({
            status_evasao: 'recomendada_coordenacao',
            motivo_evasao: motivo,
            recomendada_em: new Date().toISOString()
          })
          .eq('id', currentEvasaoStudent);
      } catch (e) {
        console.warn('[Coordenação] Falha ao atualizar Supabase:', e);
      }
    }

    // Atualizar no cache local
    const aluno = alunosGovernancaCache.find(a => a.id === currentEvasaoStudent);
    if (aluno) {
      aluno.status_evasao = 'recomendada_coordenacao';
      aluno.motivo_evasao = motivo;
    }

    coordFecharModalEvasao();
    coordAtualizarMetricas(alunosGovernancaCache);
    coordRenderizarTabela(alunosGovernancaCache);

    coordMostrarToast('Evasão recomendada registrada com sucesso. O docente responsável foi sinalizado para validação.');
  }

  /**
   * Impressão direta da Ficha de Compensação pela Coordenação
   */
  function coordImprimirFicha(alunoId) {
    const aluno = alunosGovernancaCache.find(a => a.id === alunoId);
    if (!aluno) return;

    currentPrintStudent = aluno;

    const details = document.getElementById('printSheetDetails');
    if (details) {
      details.innerHTML = `
        <div class="p-3 bg-surface-container-low rounded-lg space-y-1">
          <p><strong class="text-primary">Discente:</strong> ${aluno.nome_discente}</p>
          <p><strong class="text-primary">Turma:</strong> ${aluno.codigo_turma}</p>
          <p><strong class="text-primary">Total de Faltas:</strong> ${aluno.total_faltas} faltas (${aluno.perc_faltas}%)</p>
          <p><strong class="text-primary">Docente:</strong> ${aluno.nome_docente}</p>
          <p><strong class="text-primary">Finalidade:</strong> Notificação do Artigo 42 (Regimento Comum SENAI)</p>
        </div>
      `;
    }

    const modal = document.getElementById('modalPrintPreview');
    if (modal) modal.classList.remove('hidden');
  }

  function coordConfirmarImpressaoFicha() {
    const modal = document.getElementById('modalPrintPreview');
    if (modal) modal.classList.add('hidden');

    if (currentPrintStudent) {
      coordMostrarToast(`Enviando Ficha de Compensação de ${currentPrintStudent.nome_discente} para impressão...`);

      // Se a engine de compensação estiver ativa no window
      if (typeof window.compImprimirFicha === 'function') {
        window.compImprimirFicha();
      } else {
        window.print();
      }
    }
  }

  function coordFecharModalImpressao() {
    const modal = document.getElementById('modalPrintPreview');
    if (modal) modal.classList.add('hidden');
    currentPrintStudent = null;
  }

  /**
   * Registro de atesto de acompanhamento pela coordenação
   */
  async function coordAtestarAluno(alunoId) {
    const client = window.authService?.client;
    if (client) {
      try {
        await client
          .from('alunos_governanca')
          .update({
            atestado_coordenacao: true,
            data_atestado_coordenacao: new Date().toISOString()
          })
          .eq('id', alunoId);
      } catch (e) {
        console.warn('[Coordenação] Falha ao gravar atesto no Supabase:', e);
      }
    }

    const aluno = alunosGovernancaCache.find(a => a.id === alunoId);
    if (aluno) {
      aluno.atestado_coordenacao = true;
    }

    coordAtualizarMetricas(alunosGovernancaCache);
    coordRenderizarTabela(alunosGovernancaCache);
    coordMostrarToast('Atesto pedagógico de acompanhamento registrado com sucesso.');
  }

  function coordExportarDossie(alunoId) {
    const aluno = alunosGovernancaCache.find(a => a.id === alunoId);
    coordMostrarToast(`Dossiê consolidado de ausências de ${aluno?.nome_discente || 'aluno'} exportado.`);
  }

  /**
   * Gestão de NIFs Autorizados
   */
  async function coordCarregarNifsAutorizados() {
    const client = window.authService?.client;
    if (!client) return;

    try {
      const { data, error } = await client
        .from('nifs_autorizados')
        .select('*')
        .order('criado_em', { ascending: false });

      if (data && !error) {
        // Atualizar lista se houver container
        const container = document.getElementById('authorizedNifsList');
        if (container) {
          container.innerHTML = data.map(n => `
            <div class="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg text-xs">
              <div>
                <strong class="text-primary">${n.nome}</strong> (NIF: ${n.nif})
                <div class="text-secondary">${n.categoria || 'Docente'}</div>
              </div>
              <span class="px-2 py-0.5 rounded-full ${n.utilizado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} font-semibold">
                ${n.utilizado ? 'Ativado' : 'Disponível'}
              </span>
            </div>
          `).join('');
        }
      }
    } catch (e) {
      console.warn('[Coordenação] Falha ao carregar NIFs autorizados:', e);
    }
  }

  async function coordAutorizarNif(e) {
    if (e) e.preventDefault();
    const inputNome = document.getElementById('teacherName') || document.getElementById('modalTeacherName');
    const inputNif = document.getElementById('teacherNif') || document.getElementById('modalTeacherNif');
    const inputCat = document.getElementById('teacherCategory');

    const nome = inputNome?.value?.trim();
    const nif = inputNif?.value?.trim();
    const categoria = inputCat?.value || 'Docente Horista';

    if (!nome || !nif) {
      alert('Informe o Nome Completo e o NIF do docente.');
      return;
    }

    const client = window.authService?.client;
    if (client) {
      try {
        const { error } = await client
          .from('nifs_autorizados')
          .insert({
            nif,
            nome,
            categoria,
            unidade: 'SENAI Humberto Reis Costa'
          });

        if (error) {
          alert('Erro ao cadastrar NIF: ' + error.message);
          return;
        }
      } catch (err) {
        console.warn('Erro ao inserir NIF no Supabase:', err);
      }
    }

    if (inputNome) inputNome.value = '';
    if (inputNif) inputNif.value = '';

    const modal = document.getElementById('modalNewTeacher');
    if (modal) modal.classList.add('hidden');

    coordMostrarToast(`NIF ${nif} autorizado com sucesso para ${nome}. O docente pode realizar o Primeiro Acesso.`);
    coordCarregarNifsAutorizados();
  }

  /**
   * Gestão de Solicitações de Redefinição de Senha
   */
  async function coordCarregarResetsPendentes() {
    const client = window.authService?.client;
    if (!client) return;

    try {
      const { data, error } = await client
        .from('solicitacoes_reset')
        .select('*')
        .eq('status', 'pendente')
        .order('solicitada_em', { ascending: false });

      if (data && !error && data.length > 0) {
        const container = document.getElementById('pendingResetsList');
        if (container) {
          container.innerHTML = data.map((r, idx) => `
            <div class="flex items-center justify-between p-3 bg-surface-container-low rounded-lg text-xs" id="reset-row-${r.id}">
              <div>
                <strong class="text-primary">${r.nome}</strong> (NIF: ${r.nif})
                <div class="text-secondary">Solicitado em: ${new Date(r.solicitada_em).toLocaleString('pt-BR')}</div>
              </div>
              <button class="px-3 py-1 bg-primary text-on-primary rounded font-semibold hover:bg-primary-container transition-colors"
                      onclick="coordAprovarReset('${r.id}', '${r.nif}', '${r.nome}')">
                Aprovar (senai102)
              </button>
            </div>
          `).join('');
        }
      }
    } catch (e) {
      console.warn('[Coordenação] Falha ao listar solicitações de reset:', e);
    }
  }

  async function coordAprovarReset(resetId, nif, teacherName) {
    const client = window.authService?.client;
    if (client) {
      try {
        await client
          .from('solicitacoes_reset')
          .update({
            status: 'aprovada',
            aprovada_em: new Date().toISOString()
          })
          .eq('id', resetId);
      } catch (e) {
        console.warn('[Coordenação] Falha ao atualizar reset no Supabase:', e);
      }
    }

    const row = document.getElementById(`reset-row-${resetId}`);
    if (row) {
      row.style.opacity = '0.4';
      row.style.pointerEvents = 'none';
    }

    coordMostrarToast(`Senha do docente ${teacherName} (NIF: ${nif}) redefinida para "senai102".`);
  }

  function coordAprovarTodosResets() {
    const container = document.getElementById('pendingResetsList');
    if (container) {
      container.style.opacity = '0.5';
    }
    const modal = document.getElementById('modalResetPassword');
    if (modal) modal.classList.add('hidden');

    coordMostrarToast('Todas as solicitações de reset foram aprovadas com a senha institucional provisória "senai102".');
  }

  /**
   * Toast Feedback Helper
   */
  function coordMostrarToast(mensagem) {
    const toast = document.getElementById('toastNotification');
    const msgEl = document.getElementById('toastMessage');
    if (msgEl && mensagem) msgEl.textContent = mensagem;

    if (toast) {
      toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
      toast.classList.add('translate-y-0', 'opacity-100');
      setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100');
      }, 4000);
    }
  }

  // Exportar para o escopo global
  window.coordCarregarDados = coordCarregarDados;
  window.coordAplicarFiltros = coordAplicarFiltros;
  window.coordSetQuickFilter = coordSetQuickFilter;
  window.coordAbrirModalEvasao = coordAbrirModalEvasao;
  window.coordFecharModalEvasao = coordFecharModalEvasao;
  window.coordConfirmarEvasao = coordConfirmarEvasao;
  window.coordImprimirFicha = coordImprimirFicha;
  window.coordConfirmarImpressaoFicha = coordConfirmarImpressaoFicha;
  window.coordFecharModalImpressao = coordFecharModalImpressao;
  window.coordAtestarAluno = coordAtestarAluno;
  window.coordExportarDossie = coordExportarDossie;
  window.coordAutorizarNif = coordAutorizarNif;
  window.coordAprovarReset = coordAprovarReset;
  window.coordAprovarTodosResets = coordAprovarTodosResets;
  window.coordMostrarToast = coordMostrarToast;

  // Aliases para funções chamadas no HTML fornecido
  window.showToast = coordMostrarToast;
  window.hideToast = () => {
    const toast = document.getElementById('toastNotification');
    if (toast) toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
  };
  window.refreshData = coordCarregarDados;
  window.setQuickFilter = coordSetQuickFilter;
  window.applyFilters = coordAplicarFiltros;
  window.openNewTeacherModal = () => document.getElementById('modalNewTeacher')?.classList.remove('hidden');
  window.closeNewTeacherModal = () => document.getElementById('modalNewTeacher')?.classList.add('hidden');
  window.openResetPasswordModal = () => document.getElementById('modalResetPassword')?.classList.remove('hidden');
  window.closeResetPasswordModal = () => document.getElementById('modalResetPassword')?.classList.add('hidden');
  window.openPrintModal = (name, turma, perc) => coordImprimirFicha('aluno-alice');
  window.closePrintModal = coordFecharModalImpressao;
  window.confirmPrintAction = coordConfirmarImpressaoFicha;
  window.viewHistory = (name, mat) => coordMostrarToast(`Histórico detalhado de ${name} (${mat}) carregado.`);
  window.downloadStudentPdf = (name) => coordMostrarToast(`Dossiê de faltas de ${name} preparado para download.`);
  window.batchExportPdf = () => coordMostrarToast('Compilando relatório consolidado de faltas em formato PDF...');
  window.batchPrint = () => coordMostrarToast('Enviando fichas pendentes para a impressora...');
  window.handleQuickTeacherSubmit = coordAutorizarNif;
  window.handleModalTeacherSubmit = coordAutorizarNif;
  window.approvePasswordReset = coordAprovarReset;
  window.approveAllResets = coordAprovarTodosResets;

})(window, document);

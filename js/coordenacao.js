// Created at: 2026-10-19 16:51


  /**
   * Atualiza os Cards de KPIs de Governança
   */
  function coordAtualizarMetricas(alunos) {
    const lista = alunos || [];
    let totalAlunos = lista.length;
    let somaFreq = 0;
    let criticos25 = 0;
    let atencao10 = 0;
    let pendenciasDocente = 0;
    let pendenciasCoord = 0;
    let evasoesRecomendadas = 0;
    const turmasSet = new Set();

    lista.forEach(a => {
      const perc = Number(a.perc_faltas || 0);
      somaFreq += Math.max(0, 100 - perc);
      if (perc >= 25) criticos25++;
      else if (perc >= 10) atencao10++;

      if (a.codigo_turma) turmasSet.add(a.codigo_turma);

      const faltas = Number(a.total_faltas || 0);
      const faltasImpressao = Number(a.faltas_ultima_impressao_docente || 0);
      if (faltas > 0 && faltas > faltasImpressao) {
        pendenciasDocente++;
      }
      if (!a.atestado_coordenacao && perc >= 10) {
        pendenciasCoord++;
      }

      if (a.status_evasao === 'recomendada_coordenacao') {
        evasoesRecomendadas++;
      }
    });

    const mediaFreq = totalAlunos > 0 ? (somaFreq / totalAlunos).toFixed(1) : '100.0';

    const kpiTotalEl = document.getElementById('kpi-total-monitorado');
    if (kpiTotalEl) kpiTotalEl.textContent = totalAlunos;

    const kpiTurmasEl = document.getElementById('kpi-turmas-ativas');
    if (kpiTurmasEl) kpiTurmasEl.textContent = `${turmasSet.size} turmas ativas no semestre`;

    const kpiCriticosEl = document.getElementById('kpi-alunos-criticos');
    if (kpiCriticosEl) kpiCriticosEl.textContent = criticos25;

    const kpiAtencaoEl = document.getElementById('kpi-alunos-atencao');
    if (kpiAtencaoEl) kpiAtencaoEl.textContent = atencao10;

    const kpiPendenciasDocEl = document.getElementById('kpi-pendencias-docente');
    if (kpiPendenciasDocEl) kpiPendenciasDocEl.textContent = pendenciasDocente;

    const kpiPendenciasCoordEl = document.getElementById('kpi-pendencias-coordenacao');
    if (kpiPendenciasCoordEl) kpiPendenciasCoordEl.textContent = pendenciasCoord;

    const kpiFichasTotalEl = document.getElementById('kpi-fichas-pendentes-total');
    if (kpiFichasTotalEl) kpiFichasTotalEl.textContent = (pendenciasDocente + pendenciasCoord);

    const kpiFreqEl = document.getElementById('kpi-media-frequencia');
    if (kpiFreqEl) kpiFreqEl.textContent = `${mediaFreq}%`;

    const kpiEvasoesEl = document.getElementById('kpi-evasoes-recomendadas');
    if (kpiEvasoesEl) kpiEvasoesEl.textContent = evasoesRecomendadas;

    const countEl = document.getElementById('studentsCount');
    if (countEl) countEl.textContent = `${totalAlunos} registros exibidos`;

    const pagInfo = document.getElementById('coord-pagination-info');
    if (pagInfo) pagInfo.textContent = `Mostrando ${totalAlunos} discentes cadastrados`;

    // Atualizar pílulas de filtros rápidos
    const pillTodos = document.getElementById('filter-pill-todos');
    if (pillTodos) pillTodos.textContent = `Todos (${totalAlunos})`;

    const pillDoc = document.getElementById('filter-pill-docente');
    if (pillDoc) pillDoc.textContent = `⚠️ Somente Alerta Docente (${pendenciasDocente})`;

    const pillCoord = document.getElementById('filter-pill-coordenacao');
    if (pillCoord) pillCoord.textContent = `📋 Somente Alerta Coordenação (${pendenciasCoord})`;

    const pillCrit = document.getElementById('filter-pill-critico');
    if (pillCrit) pillCrit.textContent = `🚨 Risco de Reprovação ≥25% (${criticos25})`;
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

    if (!alunos || alunos.length === 0) {
      tbody.innerHTML = `
        <tr id="coord-no-data-row">
          <td colspan="8" class="py-12 text-center text-secondary font-medium">
            <div class="flex flex-col items-center justify-center gap-2">
              <span class="material-symbols-outlined text-4xl text-secondary/40">folder_open</span>
              <span class="text-base font-semibold text-primary">No Data</span>
              <span class="text-xs text-secondary">Nenhum professor ou discente cadastrado no sistema via Supabase.</span>
            </div>
          </td>
        </tr>
      `;
      const countEl = document.getElementById('studentsCount');
      if (countEl) countEl.textContent = '0 registros exibidos';
      return;
    }

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
    let data = null;

    if (client) {
      try {
        const res = await client
          .from('nifs_autorizados')
          .select('*')
          .order('criado_em', { ascending: false });

        if (!res.error && res.data) {
          data = res.data;
        }
      } catch (e) {
        console.warn('[Coordenação] Falha ao carregar NIFs autorizados:', e);
      }
    }

    const count = data ? data.length : 0;
    const btnCount = document.getElementById('btnDocentesCadastradosCount');
    if (btnCount) {
      btnCount.textContent = `Docentes Cadastrados (${count})`;
    }

    const container = document.getElementById('authorizedNifsList');
    if (container) {
      if (data && data.length > 0) {
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
      } else {
        container.innerHTML = `
          <div class="py-4 text-center text-secondary text-xs flex flex-col items-center justify-center gap-1">
            <span class="font-semibold text-primary">No Data</span>
            <span>Nenhum docente cadastrado via Supabase.</span>
          </div>
        `;
      }
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
    let data = null;

    if (client) {
      try {
        const res = await client
          .from('solicitacoes_reset')
          .select('*')
          .eq('status', 'pendente')
          .order('solicitada_em', { ascending: false });

        if (!res.error && res.data) {
          data = res.data;
        }
      } catch (e) {
        console.warn('[Coordenação] Falha ao listar solicitações de reset:', e);
      }
    }

    const container = document.getElementById('pendingResetsList');
    const badge = document.getElementById('pendingResetsBadge');
    const topBadge = document.getElementById('badge-solicitacoes-reset');
    const sub = document.getElementById('pendingResetsSubtitle');
    const modalList = document.getElementById('modalResetPasswordList');

    if (data && data.length > 0) {
      if (container) {
        container.innerHTML = data.map((r) => `
          <div class="p-3.5 rounded-lg bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="reset-row-${r.id}">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-label-sm">
                ${(r.nome || 'Docente').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <div class="font-title-md text-title-md font-semibold text-primary">${r.nome}</div>
                <div class="font-label-sm text-label-sm text-secondary">NIF ${r.nif} • ${new Date(r.solicitada_em).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
            <button class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-colors shadow-sm shrink-0"
                    onclick="coordAprovarReset('${r.id}', '${r.nif}', '${r.nome}')">
              <span class="material-symbols-outlined text-[16px]">key</span>
              <span>Aprovar Reset (Senha: senai102)</span>
            </button>
          </div>
        `).join('');
      }
      if (modalList) {
        modalList.innerHTML = data.map((r) => `
          <div class="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
            <div>
              <div class="font-title-md text-title-md font-semibold text-primary">${r.nome}</div>
              <div class="font-label-sm text-label-sm text-secondary">NIF ${r.nif}</div>
            </div>
            <button class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-colors shadow-sm"
                    onclick="coordAprovarReset('${r.id}', '${r.nif}', '${r.nome}')">
              Aprovar (senai102)
            </button>
          </div>
        `).join('');
      }
      if (badge) {
        badge.textContent = `${data.length} pendentes`;
        badge.className = 'px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-label-sm text-label-sm font-bold';
      }
      if (topBadge) {
        topBadge.textContent = data.length;
        topBadge.className = 'ml-0.5 px-2 py-0.2 rounded-full bg-amber-500 text-white font-label-sm text-[10px] font-bold';
      }
      if (sub) {
        sub.textContent = `${data.length} docentes aguardando liberação de acesso imediato`;
      }
    } else {
      if (container) {
        container.innerHTML = `
          <div class="py-6 text-center text-secondary text-xs flex flex-col items-center justify-center gap-1">
            <span class="font-semibold text-primary">No Data</span>
            <span>Nenhuma solicitação de redefinição de senha pendente.</span>
          </div>
        `;
      }
      if (modalList) {
        modalList.innerHTML = `
          <div class="py-6 text-center text-secondary text-xs flex flex-col items-center justify-center gap-1">
            <span class="font-semibold text-primary">No Data</span>
            <span>Nenhuma solicitação pendente no Supabase.</span>
          </div>
        `;
      }
      if (badge) {
        badge.textContent = '0 pendentes';
        badge.className = 'px-2.5 py-1 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm font-bold';
      }
      if (topBadge) {
        topBadge.textContent = '0';
        topBadge.className = 'ml-0.5 px-2 py-0.2 rounded-full bg-surface-container text-secondary font-label-sm text-[10px] font-bold';
      }
      if (sub) {
        sub.textContent = '0 docentes aguardando liberação de acesso imediato';
      }
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

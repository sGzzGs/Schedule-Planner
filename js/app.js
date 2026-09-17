/**
 * app.js
 * Aplicação Web: Gerador de Cronograma SENAI FR-1.02-66A (V.00) - A4 Paisagem (Landscape)
 * 8 Blocos Mensais • Logotipo Original SENAI • 1 Página Estrita • Persistência LocalStorage
 * Formato HH:MM • Gerenciador Interativo de Aulas (Teoria / Prática / Ambientes)
 */

// 1. DICIONÁRIO DE PRESETS (Vazio - turmas criadas e salvas pelo usuário)
const PRESETS = {};

// 2. BASE DE FERIADOS E RECESSOS 2026
const FERIADOS_MAP = new Map([
  ["2026-01-01", "Confraternização Universal"],
  ["2026-01-25", "Aniversário de São Paulo"],
  ["2026-02-14", "Sábado de Carnaval"],
  ["2026-02-16", "Segunda de Carnaval"],
  ["2026-02-17", "Terça de Carnaval"],
  ["2026-04-03", "Sexta-feira Santa/Paixão"],
  ["2026-04-04", "Sábado de Aleluia (Emenda)"],
  ["2026-04-20", "Emenda de feriado - Tiradentes"],
  ["2026-04-21", "Tiradentes"],
  ["2026-05-01", "Dia do Trabalho"],
  ["2026-06-04", "Corpus Christi"],
  ["2026-06-05", "Emenda de feriado - Corpus Christi"],
  ["2026-06-06", "Emenda de feriado - Corpus Christi"],
  ["2026-06-24", "Formatura CAI"],
  ["2026-07-09", "Revolução Constitucionalista de 1932"],
  ["2026-07-10", "Emenda de feriado - Rev. Const."],
  ["2026-07-11", "Emenda de feriado - Rev. Const."],
  ["2026-09-07", "Independência do Brasil"],
  ["2026-10-12", "Padroeira do Brasil"],
  ["2026-10-13", "Dia dos Professores - Antecipado"],
  ["2026-11-02", "Dia de Finados"],
  ["2026-11-15", "Proclamação da República"],
  ["2026-11-20", "Consciência Negra"],
  ["2026-12-21", "Formatura CAI"],
  ["2026-12-22", "Confraternização Escolar"],
  ["2026-12-25", "Natal"],
  ["2026-12-31", "Véspera de Ano Novo"]
]);

const PERIODOS_FERIAS = [
  { inicio: "2026-01-02", fim: "2026-01-14", descricao: "Recesso de Janeiro" },
  { inicio: "2026-07-13", fim: "2026-07-18", descricao: "Férias de Julho" },
  { inicio: "2026-12-23", fim: "2026-12-31", descricao: "Recesso de Fim de Ano" }
];

// Expandir férias no mapa
for (const p of PERIODOS_FERIAS) {
  const [sy, sm, sd] = p.inicio.split("-").map(Number);
  const [ey, em, ed] = p.fim.split("-").map(Number);
  let curr = new Date(sy, sm - 1, sd, 12, 0, 0);
  const end = new Date(ey, em - 1, ed, 12, 0, 0);
  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, "0");
    const d = String(curr.getDate()).padStart(2, "0");
    const k = `${y}-${m}-${d}`;
    if (!FERIADOS_MAP.has(k)) {
      FERIADOS_MAP.set(k, p.descricao);
    }
    curr.setDate(curr.getDate() + 1);
  }
}

// 3. ESTADO GLOBAL DA APLICAÇÃO
let currentDays = []; // Inicialmente nenhum dia da semana ativo (inicia vazio)
let activeLessons = [];      // Array de aulas calculadas e customizáveis
let currentScheduleResult = null;
let manualDateOverrides = {}; // { [dateKey: string]: 'add' | 'remove' }
let inactiveDateKeys = new Set(); // Set de dateKey para dias desativados manualmente via botão direito
let lessonCustomizations = {}; // { [dateKey: string]: { tipo, ambiente, minutos, isSplit, ordem, teoriaMinutos, teoriaAmbiente, praticaMinutos, praticaAmbiente } }

const DIAS_SEMANA_NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NOMES_MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Parser de carga horária para minutos (suporta inteiros como "40", decimais como "33.5" ou formato HH:MM como "33:50")
function parseCargaHorariaToMinutes(val) {
  if (val === null || val === undefined) return 2400; // default 40h
  const s = String(val).trim();
  if (!s) return 0;
  if (s.includes(":")) {
    const parts = s.split(":");
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }
  const normalized = s.replace(",", ".");
  const num = parseFloat(normalized);
  if (isNaN(num)) return 0;
  return Math.round(num * 60);
}

// Utilitário para interpretar datas nos formatos dd/mm/aaaa ou aaaa-mm-dd
function parseDateInputToISO(str) {
  if (!str) return null;
  const s = str.trim();
  // Formato dd/mm/aaaa ou d/m/aaaa
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const dia = dmyMatch[1].padStart(2, "0");
    const mes = dmyMatch[2].padStart(2, "0");
    const ano = dmyMatch[3];
    return `${ano}-${mes}-${dia}`;
  }
  // Formato aaaa-mm-dd
  const ymdMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const ano = ymdMatch[1];
    const mes = ymdMatch[2].padStart(2, "0");
    const dia = ymdMatch[3].padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }
  return null;
}

// Converte ISO aaaa-mm-dd para dd/mm/aaaa
function isoToDDMMAAAA(isoStr) {
  if (!isoStr || !isoStr.includes("-")) return isoStr;
  const [y, m, d] = isoStr.split("-");
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

// 4. PERSISTÊNCIA EM LOCALSTORAGE & GERENCIAMENTO DE PERFIL
function getSavedModels() {
  const models = localStorage.getItem("SENAI_SAVED_MODELS");
  return models ? JSON.parse(models) : {};
}

function saveModels(models) {
  localStorage.setItem("SENAI_SAVED_MODELS", JSON.stringify(models));
}

function populatePresetDropdown() {
  const select = document.getElementById("presetSelect");
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = "";

  const saved = getSavedModels();
  const savedKeys = Object.keys(saved);

  if (savedKeys.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Nenhum modelo salvo --";
    select.appendChild(opt);
    return;
  }

  for (const key of savedKeys) {
    const opt = document.createElement("option");
    opt.value = "SAVED_" + key;
    opt.textContent = key;
    select.appendChild(opt);
  }

  if (currentVal && savedKeys.includes(currentVal.replace("SAVED_", ""))) {
    select.value = currentVal;
  } else {
    select.value = "SAVED_" + savedKeys[0];
  }
}

function saveCurrentModel() {
  const formData = getFormData();
  if (!formData.codigoTurma) {
    alert("Por favor, informe o Código da Turma para salvar este modelo.");
    return;
  }

  formData._savedAt = Date.now();

  const saved = getSavedModels();
  const exists = saved[formData.codigoTurma] !== undefined;

  // Se for um novo modelo e o limite de 60 for atingido, remove automaticamente o mais antigo
  if (!exists) {
    const keys = Object.keys(saved);
    while (keys.length >= 60) {
      let oldestKey = keys[0];
      let oldestTime = saved[oldestKey]?._savedAt || 0;

      for (let i = 1; i < keys.length; i++) {
        const k = keys[i];
        const t = saved[k]?._savedAt || 0;
        if (t < oldestTime) {
          oldestTime = t;
          oldestKey = k;
        }
      }

      delete saved[oldestKey];
      const idx = keys.indexOf(oldestKey);
      if (idx !== -1) keys.splice(idx, 1);
    }
  }

  saved[formData.codigoTurma] = formData;
  saveModels(saved);
  populatePresetDropdown();

  const select = document.getElementById("presetSelect");
  if (select) {
    select.value = "SAVED_" + formData.codigoTurma;
  }
  alert(`Modelo "${formData.codigoTurma}" salvo com sucesso!`);
}

function deleteSelectedModel() {
  const select = document.getElementById("presetSelect");
  if (!select) return;

  const value = select.value;
  if (!value || !value.startsWith("SAVED_")) {
    alert("Selecione um Modelo Salvo da lista para poder excluir.");
    return;
  }

  const key = value.replace("SAVED_", "");
  if (confirm(`Deseja realmente excluir o modelo "${key}"?`)) {
    const saved = getSavedModels();
    delete saved[key];
    saveModels(saved);
    populatePresetDropdown();

    const remainingKeys = Object.keys(saved);
    if (remainingKeys.length > 0) {
      const nextKey = remainingKeys[0];
      select.value = "SAVED_" + nextKey;
      applyPreset("SAVED_" + nextKey);
    } else {
      resetFormToEmpty();
    }
  }
}

// 4.1 GESTÃO DE HORÁRIOS DE PREENCHIMENTO RÁPIDO
const HORARIOS_PADRAO_INICIAIS = [
  { label: "Manhã: 08:00 - 12:00 (04:00)", valor: "08:00|12:00|Manhã|04:00" },
  { label: "Tarde: 13:00 - 17:00 (04:00)", valor: "13:00|17:00|Tarde|04:00" },
  { label: "Noite: 18:00 - 22:00 (04:00)", valor: "18:00|22:00|Noite|04:00" },
  { label: "Noite: 18:20 - 22:00 (03:40)", valor: "18:20|22:00|Noite|03:40" },
  { label: "Sábado: 07:30 - 16:30 (08:00)", valor: "07:30|16:30|Sábado|08:00" },
  { label: "Sábado: 08:00 - 16:20 (07:20)", valor: "08:00|16:20|Sábado|07:20" }
];

function getCustomHorarios() {
  const data = localStorage.getItem("SENAI_CUSTOM_HORARIOS");
  if (!data) return [...HORARIOS_PADRAO_INICIAIS];
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Garante que o horário 08:00 - 12:00 esteja presente mesmo se o navegador já tiver lista prévia em cache
      const novoPadrao = { label: "Manhã: 08:00 - 12:00 (04:00)", valor: "08:00|12:00|Manhã|04:00" };
      if (!parsed.some(x => x.valor === novoPadrao.valor) && !localStorage.getItem("SENAI_REMOVED_08_12")) {
        parsed.unshift(novoPadrao);
        saveCustomHorarios(parsed);
      }
      return parsed;
    }
    return [...HORARIOS_PADRAO_INICIAIS];
  } catch (e) {
    return [...HORARIOS_PADRAO_INICIAIS];
  }
}

function saveCustomHorarios(list) {
  localStorage.setItem("SENAI_CUSTOM_HORARIOS", JSON.stringify(list));
}

function populateHorarioPresetDropdown() {
  const select = document.getElementById("horarioPresetSelect");
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">-- Selecione um Horário Sugerido --</option>';

  const list = getCustomHorarios();
  list.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.valor;
    opt.textContent = item.label;
    select.appendChild(opt);
  });

  if (currentVal && list.some(x => x.valor === currentVal)) {
    select.value = currentVal;
  }
}

function adicionarHorarioAoPreenchimentoRapido() {
  const hi = document.getElementById("horaInicio")?.value?.trim() || "";
  const hf = document.getElementById("horaFim")?.value?.trim() || "";
  const hd = document.getElementById("horasPorDia")?.value?.trim() || "04:00";

  if (!hi || !hf) {
    alert("Por favor, preencha a Hora Início e a Hora Fim antes de adicionar ao preenchimento rápido.");
    return;
  }

  const valor = `${hi}|${hf}||${hd}`;
  const label = `${hi} - ${hf} (${hd})`;

  const list = getCustomHorarios();
  const exists = list.some(x => x.valor === valor);
  if (exists) {
    alert("Este horário já está presente na lista de preenchimento rápido!");
    return;
  }

  if (valor === "08:00|12:00|Manhã|04:00") {
    localStorage.removeItem("SENAI_REMOVED_08_12");
  }

  list.push({ label, valor });
  saveCustomHorarios(list);
  populateHorarioPresetDropdown();

  const select = document.getElementById("horarioPresetSelect");
  if (select) select.value = valor;

  alert(`Horário "${label}" adicionado ao preenchimento rápido com sucesso!`);
}

function removerHorarioDoPreenchimentoRapido() {
  const select = document.getElementById("horarioPresetSelect");
  if (!select) return;

  const valor = select.value;
  if (!valor) {
    alert("Selecione um horário sugerido na lista para poder remover.");
    return;
  }

  const selectedText = select.options[select.selectedIndex]?.textContent || valor;
  if (confirm(`Deseja realmente remover o horário "${selectedText}" do preenchimento rápido?`)) {
    if (valor === "08:00|12:00|Manhã|04:00") {
      localStorage.setItem("SENAI_REMOVED_08_12", "true");
    }
    let list = getCustomHorarios();
    list = list.filter(x => x.valor !== valor);
    saveCustomHorarios(list);
    populateHorarioPresetDropdown();
    select.value = "";
  }
}

// 4.2 PREENCHIMENTO COMPLETO DE FORMULÁRIO (RESTAURAÇÃO DO PERFIL)
function fillFormData(data) {
  if (!data || typeof data !== "object") return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };

  if (data.nomeCurso !== undefined) setVal("nomeCurso", data.nomeCurso);
  if (data.codigoTurma !== undefined) setVal("codigoTurma", data.codigoTurma);
  if (data.escola !== undefined) setVal("escola", data.escola);
  if (data.unidadeCurricular !== undefined) setVal("unidadeCurricular", data.unidadeCurricular);
  if (data.editorAmbienteTeoria !== undefined || data.ambienteTeoria !== undefined) {
    setVal("editorAmbienteTeoria", data.editorAmbienteTeoria || data.ambienteTeoria || "S01");
  }
  if (data.editorAmbientePratica !== undefined || data.ambientePratica !== undefined || data.ambiente !== undefined) {
    setVal("editorAmbientePratica", data.editorAmbientePratica || data.ambientePratica || data.ambiente || "L01");
  }
  if (data.docente !== undefined) setVal("docente", data.docente);
  if (data.coordenador !== undefined) setVal("coordenador", data.coordenador);
  if (data.turno !== undefined) setVal("turno", data.turno);
  if (data.horaInicio !== undefined) setVal("horaInicio", data.horaInicio);
  if (data.horaFim !== undefined) setVal("horaFim", data.horaFim);
  if (data.cargaHorariaTotal !== undefined) setVal("cargaHorariaTotal", data.cargaHorariaTotal);
  if (data.horasPorDia !== undefined) setVal("horasPorDia", data.horasPorDia);
  if (data.dataInicioStr !== undefined) setVal("dataInicioStr", data.dataInicioStr);

  if (Array.isArray(data.diasSemana)) {
    currentDays = [...data.diasSemana];
    const dayBtns = document.querySelectorAll(".day-btn");
    dayBtns.forEach(btn => {
      const d = Number(btn.dataset.day);
      btn.classList.toggle("active", currentDays.includes(d));
    });
  }

  // Restaura ajustes manuais de datas se presentes
  if (data.manualDateOverrides && typeof data.manualDateOverrides === "object") {
    manualDateOverrides = { ...data.manualDateOverrides };
  } else {
    manualDateOverrides = {};
  }

  if (Array.isArray(data.inactiveDates)) {
    inactiveDateKeys = new Set(data.inactiveDates);
  } else {
    inactiveDateKeys = new Set();
  }

  renderManualDatesList();
  updatePreview(true);
}

// 4.3 EXPORTAR PERFIL COMPLETO (USO NA TROCA DE PCS)
function exportProfile() {
  let saved = getSavedModels();

  // Se a lista estiver vazia, tenta incluir o modelo aberto na tela
  if (Object.keys(saved).length === 0) {
    const current = getFormData();
    if (current && current.codigoTurma) {
      current._savedAt = Date.now();
      saved[current.codigoTurma] = current;
      saveModels(saved);
      populatePresetDropdown();
    }
  }

  // 1. Obter primeiro nome do professor/responsável
  const docenteVal = document.getElementById("docente")?.value?.trim() || "";
  let primeiroNome = "";

  if (docenteVal) {
    primeiroNome = docenteVal.split(/\s+/)[0];
  }

  // Se o campo estiver vazio, solicita via pop-up
  if (!primeiroNome) {
    const inputNome = prompt("Por favor, digite seu primeiro nome para identificar o perfil salvo:");
    if (inputNome && inputNome.trim()) {
      primeiroNome = inputNome.trim().split(/\s+/)[0];
    }
  }

  // Fallback caso o usuário cancele ou não digite nada
  if (!primeiroNome) {
    primeiroNome = "Professor";
  }

  // Limpeza de caracteres especiais para nome de arquivo seguro
  primeiroNome = primeiroNome.replace(/[^a-zA-Z0-9À-ÿ_-]/g, "");
  if (!primeiroNome) primeiroNome = "Perfil";

  // 2. Formatar data atual no padrão AA.MM.DD
  const now = new Date();
  const aa = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const filename = `App_Cronograma_${primeiroNome}_${aa}.${mm}.${dd}.json`;

  // 3. Capturar o tema, horários rápidos e todos os campos preenchidos
  const temaAtual = localStorage.getItem("theme") || "solarized";
  const currentForm = getFormData();
  const horariosList = getCustomHorarios();

  // 4. Montar objeto completo do perfil
  const profilePayload = {
    _tipo: "PERFIL_CRONOGRAMA_SENAI",
    versao: "2.0",
    tema: temaAtual,
    turmas: saved,
    horariosRapidos: horariosList,
    dadosFormulario: currentForm,
    exportadoEm: now.toISOString()
  };

  const dataStr = JSON.stringify(profilePayload, null, 2);
  const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 4.4 IMPORTAR PERFIL COMPLETO (USO NA TROCA DE PCS)
function importProfile(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const parsed = JSON.parse(content);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("O arquivo selecionado não contém um formato de perfil válido.");
      }

      // 1. Restaura o tema se estiver presente no arquivo
      const temaImportado = parsed.tema || parsed.theme;
      if (temaImportado) {
        applyTheme(temaImportado);
        localStorage.setItem("theme", temaImportado);
        const themeSelector = document.getElementById("theme-selector");
        if (themeSelector) {
          themeSelector.value = temaImportado;
        }
      }

      // 2. Restaura horários do preenchimento rápido se presentes
      if (Array.isArray(parsed.horariosRapidos)) {
        saveCustomHorarios(parsed.horariosRapidos);
        populateHorarioPresetDropdown();
      } else if (Array.isArray(parsed.horarios)) {
        saveCustomHorarios(parsed.horarios);
        populateHorarioPresetDropdown();
      }

      // 3. Extrai e restaura os modelos de turma salvos
      const turmasFonte = (parsed.turmas && typeof parsed.turmas === "object") ? parsed.turmas : parsed;
      const currentSaved = getSavedModels();
      let importedCount = 0;
      let firstImportedKey = null;

      for (const [key, modelData] of Object.entries(turmasFonte)) {
        // Ignora metadados e chaves que não sejam modelos de turmas
        if (
          key.startsWith("_") ||
          key === "tema" ||
          key === "theme" ||
          key === "versao" ||
          key === "exportadoEm" ||
          key === "horariosRapidos" ||
          key === "horarios" ||
          key === "dadosFormulario"
        ) {
          continue;
        }

        if (modelData && typeof modelData === "object" && modelData.codigoTurma) {
          currentSaved[key] = modelData;
          if (!firstImportedKey) firstImportedKey = key;
          importedCount++;
        }
      }

      saveModels(currentSaved);
      populatePresetDropdown();

      // 4. Restaura os dados de todos os campos preenchidos, se houver
      if (parsed.dadosFormulario && typeof parsed.dadosFormulario === "object") {
        fillFormData(parsed.dadosFormulario);
      } else if (firstImportedKey) {
        const select = document.getElementById("presetSelect");
        if (select) {
          select.value = "SAVED_" + firstImportedKey;
        }
        applyPreset("SAVED_" + firstImportedKey);
      }

      const infoTema = temaImportado ? ` Tema "${temaImportado}" restaurado.` : "";
      const infoHorarios = Array.isArray(parsed.horariosRapidos) ? ` ${parsed.horariosRapidos.length} horário(s) de preenchimento rápido.` : "";
      alert(`Perfil importado com sucesso! ${importedCount} modelo(s) de turma carregado(s).${infoHorarios}${infoTema}`);
    } catch (err) {
      console.error("Erro na importação do perfil:", err);
      alert("Erro ao importar o arquivo de perfil: " + err.message);
    } finally {
      // Limpa o valor do input para permitir selecionar o mesmo arquivo novamente se desejar
      event.target.value = "";
    }
  };

  reader.readAsText(file);
}

// FUNÇÕES UTILITÁRIAS PARA CONVERSÃO DE TEMPO
function timeToMinutes(timeStr) {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToHHMM(totalMinutes) {
  const roundedMin = Math.round(totalMinutes);
  const hours = Math.floor(roundedMin / 60);
  const mins = roundedMin % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function isValidTimeFormat(timeStr) {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr ? timeStr.trim() : "");
}

function calculateDurationFromStartEnd() {
  const hi = document.getElementById("horaInicio")?.value;
  const hf = document.getElementById("horaFim")?.value;
  const hd = document.getElementById("horasPorDia");
  if (!hd || !isValidTimeFormat(hi) || !isValidTimeFormat(hf)) return;

  const startMin = timeToMinutes(hi);
  const endMin = timeToMinutes(hf);
  let diffMin = endMin - startMin;
  if (diffMin <= 0) {
    diffMin += 1440;
  }
  if (diffMin > 0) {
    hd.value = minutesToHHMM(diffMin);
  }
}

function calculateEndFromStartAndDuration() {
  const hi = document.getElementById("horaInicio")?.value;
  const hd = document.getElementById("horasPorDia")?.value;
  const hf = document.getElementById("horaFim");
  if (!hf || !isValidTimeFormat(hi) || !isValidTimeFormat(hd)) return;

  const startMin = timeToMinutes(hi);
  const durMin = timeToMinutes(hd);
  if (durMin > 0) {
    const endMin = (startMin + durMin) % 1440;
    hf.value = minutesToHHMM(endMin);
  }
}

// 5. MOTOR DE CÁLCULO DE DIAS LETIVOS COM GESTÃO DE AULAS INDIVIDUAIS
function calculateSchedule(formData, preserveCustomLessons = false) {
  const {
    dataInicioStr,
    cargaHorariaTotal,
    horasPorDia,
    diasSemana,
    ambienteTeoria = "S01",
    ambientePratica = "L01",
    tipoAulaPadrao = "pratica"
  } = formData;

  if (!dataInicioStr) return null;

  const totalCargaMinutos = parseCargaHorariaToMinutes(cargaHorariaTotal);
  const totalCargaFormatada = minutesToHHMM(totalCargaMinutos);
  const cargaHorariaNum = totalCargaMinutos / 60;
  const cargaHorariaFormatada = (totalCargaMinutos % 60 === 0)
    ? `${totalCargaMinutos / 60} horas`
    : `${totalCargaFormatada} horas`;

  // Validação: Se não houver nenhum dia da semana ativo selecionado e nenhuma data forçada manualmente
  const hasManualAdd = Object.values(manualDateOverrides).some(v => v === "add");
  const hasActiveDays = Array.isArray(diasSemana) && diasSemana.length > 0;

  if (!hasActiveDays && !hasManualAdd) {
    activeLessons = [];
    currentScheduleResult = {
      aulas: [],
      totalAulas: 0,
      aulasQueCouberam: 0,
      minutosPreenchidos: 0,
      totalCargaMinutos,
      horasPreenchidasFormatadas: "00:00",
      totalCargaFormatada,
      cargaHorariaTotal: cargaHorariaNum,
      cargaHorariaFormatada,
      vigencia: "-",
      semAno: "-",
      mesesSequenciais: [],
      emptyReason: "no_days_selected"
    };
    return currentScheduleResult;
  }

  const [startYear, startMonth, startDay] = dataInicioStr.split("-").map(Number);
  let curr = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);

  // Mapeamento de aulas pré-existentes para preservação de customizações
  const customMap = new Map();
  if (preserveCustomLessons && activeLessons && activeLessons.length > 0) {
    activeLessons.forEach(a => {
      // Se a aula estiver inativa, preservamos baseMinutos ou minutosDia para quando for reativada
      const minPreservado = a.isInactive ? (a.baseMinutos || minutosDia) : a.minutos;
      customMap.set(a.dataKey, {
        tipo: a.tipo,
        ambiente: a.ambiente,
        minutos: minPreservado,
        baseMinutos: a.baseMinutos || minutosDia,
        isSplit: a.isSplit,
        ordem: a.ordem,
        teoriaMinutos: a.teoriaMinutos,
        teoriaAmbiente: a.teoriaAmbiente,
        praticaMinutos: a.praticaMinutos,
        praticaAmbiente: a.praticaAmbiente
      });
    });
  }

  const novasAulas = [];
  let minutosRestantes = totalCargaMinutos;
  const minutosDia = timeToMinutes(horasPorDia) || 240;
  let maxLoop = 600;
  let loopCount = 0;

  while (minutosRestantes > 0 && loopCount < maxLoop) {
    loopCount++;
    const diaSemana = curr.getDay();
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, "0");
    const d = String(curr.getDate()).padStart(2, "0");
    const dateKey = `${y}-${m}-${d}`;

    // Prioridade 1: Exclusão manual ou Inatividade por clique com botão direito
    const isManuallyRemoved = manualDateOverrides[dateKey] === "remove";
    const isInactive = inactiveDateKeys.has(dateKey);

    if (!isManuallyRemoved && !isInactive) {
      // Prioridade 2: Adição forçada manual (adiciona mesmo se for feriado ou fora dos dias da semana)
      const isManuallyAdded = manualDateOverrides[dateKey] === "add";

      // Regra padrão: dia ativo da semana e não ser feriado
      const isStandardClassDay = diaSemana !== 0 && diasSemana.includes(diaSemana) && !FERIADOS_MAP.has(dateKey);

      if (isManuallyAdded || isStandardClassDay) {
        const custom = lessonCustomizations[dateKey];
        let isSplit = false;
        let ordem = "teoria-pratica";
        let teoriaMinutos = 0;
        let praticaMinutos = 0;
        let teoriaAmb = ambienteTeoria;
        let praticaAmb = ambientePratica;
        let minutosAula;
        let tipo = tipoAulaPadrao === "teoria" ? "teoria" : "pratica";
        let amb = tipo === "teoria" ? ambienteTeoria : ambientePratica;

        if (custom) {
          if (custom.isSplit) {
            isSplit = true;
            ordem = custom.ordem || "teoria-pratica";
            teoriaMinutos = custom.teoriaMinutos !== undefined ? custom.teoriaMinutos : (minutosDia / 2);
            praticaMinutos = custom.praticaMinutos !== undefined ? custom.praticaMinutos : (minutosDia / 2);
            teoriaAmb = custom.teoriaAmbiente || ambienteTeoria;
            praticaAmb = custom.praticaAmbiente || ambientePratica;
            minutosAula = teoriaMinutos + praticaMinutos;
            tipo = "misto";
            amb = ordem === "pratica-teoria" ? `${praticaAmb}/${teoriaAmb}` : `${teoriaAmb}/${praticaAmb}`;
          } else {
            tipo = custom.tipo || tipo;
            amb = custom.ambiente || (tipo === "teoria" ? ambienteTeoria : ambientePratica);
            minutosAula = (custom.minutos !== undefined && custom.minutos > 0) ? custom.minutos : minutosDia;
          }
        } else if (customMap.has(dateKey)) {
          // Restaura customização anterior
          const prev = customMap.get(dateKey);
          if (prev.isSplit) {
            isSplit = true;
            ordem = prev.ordem;
            teoriaMinutos = prev.teoriaMinutos;
            praticaMinutos = prev.praticaMinutos;
            teoriaAmb = prev.teoriaAmbiente || ambienteTeoria;
            praticaAmb = prev.praticaAmbiente || ambientePratica;
            minutosAula = teoriaMinutos + praticaMinutos;
            tipo = "misto";
            amb = ordem === "pratica-teoria" ? `${praticaAmb}/${teoriaAmb}` : `${teoriaAmb}/${praticaAmb}`;
          } else {
            tipo = prev.tipo;
            amb = prev.ambiente;
            minutosAula = (prev.minutos !== undefined && prev.minutos > 0) ? prev.minutos : minutosDia;
          }
        } else {
          // Por padrão, cada aula (inclusive o último dia) assume a quantidade de horas da base (minutosDia)
          minutosAula = minutosDia;
        }

        novasAulas.push({
          data: new Date(curr),
          dataKey: dateKey,
          dia: curr.getDate(),
          diaStr: d,
          diaSemanaIdx: diaSemana,
          diaSemanaNome: DIAS_SEMANA_NOMES[diaSemana],
          mesIdx: curr.getMonth(),
          mesNome: NOMES_MESES_PT[curr.getMonth()],
          ano: curr.getFullYear(),
          minutos: minutosAula,
          baseMinutos: minutosDia,
          horas: minutosAula / 60,
          tipo: tipo,
          ambiente: amb,
          isSplit: isSplit,
          ordem: ordem,
          teoriaMinutos: teoriaMinutos,
          praticaMinutos: praticaMinutos,
          teoriaAmbiente: teoriaAmb,
          praticaAmbiente: praticaAmb,
          manuallyAdded: isManuallyAdded,
          isInactive: false
        });

        minutosRestantes -= minutosAula;
      }
    } else if (isInactive) {
      // Se era uma aula válida que foi marcada como inativa via botão direito
      const isManuallyAdded = manualDateOverrides[dateKey] === "add";
      const isStandardClassDay = diaSemana !== 0 && diasSemana.includes(diaSemana) && !FERIADOS_MAP.has(dateKey);

      if (isManuallyAdded || isStandardClassDay) {
        let tipo = tipoAulaPadrao === "teoria" ? "teoria" : "pratica";
        let amb = tipo === "teoria" ? ambienteTeoria : ambientePratica;

        if (customMap.has(dateKey)) {
          const prev = customMap.get(dateKey);
          tipo = prev.tipo;
          amb = prev.ambiente;
        }

        novasAulas.push({
          data: new Date(curr),
          dataKey: dateKey,
          dia: curr.getDate(),
          diaStr: d,
          diaSemanaIdx: diaSemana,
          diaSemanaNome: DIAS_SEMANA_NOMES[diaSemana],
          mesIdx: curr.getMonth(),
          mesNome: NOMES_MESES_PT[curr.getMonth()],
          ano: curr.getFullYear(),
          minutos: 0,
          baseMinutos: minutosDia,
          horas: 0,
          tipo: tipo,
          ambiente: amb,
          isSplit: false,
          ordem: "teoria-pratica",
          teoriaMinutos: 0,
          praticaMinutos: 0,
          teoriaAmbiente: ambienteTeoria,
          praticaAmbiente: ambientePratica,
          manuallyAdded: isManuallyAdded,
          isInactive: true
        });
      }
    }

    curr.setDate(curr.getDate() + 1);
  }

  if (novasAulas.length === 0) return null;

  activeLessons = novasAulas;

  // Aulas ativas efetivas (excluindo os dias inativos) para o cálculo da Folha A4 e vigência
  const aulasAtivasEfetivas = activeLessons.filter(a => !a.isInactive);
  if (aulasAtivasEfetivas.length === 0) return null;

  const dataInicio = aulasAtivasEfetivas[0].data;
  const dataFim = aulasAtivasEfetivas[aulasAtivasEfetivas.length - 1].data;

  const vigencia = `${String(dataFim.getDate()).padStart(2, "0")}/${String(dataFim.getMonth() + 1).padStart(2, "0")}/${dataFim.getFullYear()}`;
  const semAno = `${dataInicio.getMonth() + 1 <= 6 ? "1º Sem" : "2º Sem"} / ${dataInicio.getFullYear()}`;

  // Agrupamento sequencial por mês garantindo correspondência exata de colunas (apenas aulas ativas)
  const mesesSequenciais = [];
  let lastKey = null;
  let currMes = null;

  for (const a of aulasAtivasEfetivas) {
    const k = `${a.ano}-${a.mesIdx}`;
    if (k !== lastKey) {
      lastKey = k;
      currMes = {
        nomeMes: NOMES_MESES_PT[a.mesIdx],
        mesIdx: a.mesIdx,
        ano: a.ano,
        diasTeoria: [],
        diasPratica: [],
        ambientes: []
      };
      mesesSequenciais.push(currMes);
    }

    if (a.isSplit) {
      const isPratFirst = a.ordem === "pratica-teoria";
      const primeiroTipo = isPratFirst ? "pratica" : "teoria";
      const primeiroAmb = isPratFirst ? (a.praticaAmbiente || "") : (a.teoriaAmbiente || "");
      const segundoTipo = isPratFirst ? "teoria" : "pratica";
      const segundoAmb = isPratFirst ? (a.teoriaAmbiente || "") : (a.praticaAmbiente || "");

      // 1º período do dia dividido (ex: Dia 15 S01)
      if (primeiroTipo === "teoria") {
        currMes.diasTeoria.push(a.diaStr);
        currMes.diasPratica.push("");
      } else {
        currMes.diasTeoria.push("");
        currMes.diasPratica.push(a.diaStr);
      }
      currMes.ambientes.push(primeiroAmb);

      // 2º período do dia dividido (ex: Dia 15 L02)
      if (segundoTipo === "teoria") {
        currMes.diasTeoria.push(a.diaStr);
        currMes.diasPratica.push("");
      } else {
        currMes.diasTeoria.push("");
        currMes.diasPratica.push(a.diaStr);
      }
      currMes.ambientes.push(segundoAmb);
    } else if (a.tipo === "teoria") {
      currMes.diasTeoria.push(a.diaStr);
      currMes.diasPratica.push("");
      currMes.ambientes.push(a.ambiente);
    } else {
      currMes.diasTeoria.push("");
      currMes.diasPratica.push(a.diaStr);
      currMes.ambientes.push(a.ambiente);
    }
  }

  // Cálculo de slots/colunas disponíveis no gabarito (8 blocos mensais com até 25 colunas cada)
  let capacidadeColunas = 0;
  for (let slot = 0; slot < Math.min(8, mesesSequenciais.length); slot++) {
    capacidadeColunas += 25;
  }

  // Soma de minutos das aulas ativas que couberam no limite de colunas da folha A4
  let colunasConsumidas = 0;
  let minutosPreenchidos = 0;
  let aulasQueCouberam = 0;

  for (let i = 0; i < aulasAtivasEfetivas.length; i++) {
    const a = aulasAtivasEfetivas[i];
    const slotsNecessarios = a.isSplit ? 2 : 1;
    if (colunasConsumidas + slotsNecessarios <= capacidadeColunas) {
      colunasConsumidas += slotsNecessarios;
      minutosPreenchidos += a.minutos;
      aulasQueCouberam++;
    } else {
      break;
    }
  }
  const horasPreenchidasFormatadas = minutesToHHMM(minutosPreenchidos);

  currentScheduleResult = {
    aulas: activeLessons,
    totalAulas: activeLessons.length,
    aulasQueCouberam,
    minutosPreenchidos,
    totalCargaMinutos,
    horasPreenchidasFormatadas,
    totalCargaFormatada,
    cargaHorariaTotal: cargaHorariaNum,
    cargaHorariaFormatada,
    vigencia,
    semAno,
    mesesSequenciais
  };

  return currentScheduleResult;
}

// 6. RENDERIZADOR EXATO DO GABARITO NO FORMATO A4 PAISAGEM (8 BLOCOS MENSAIS)
function renderScheduleHTML(formData, calcResult) {
  if (!calcResult || calcResult.emptyReason === "no_days_selected") {
    return `
      <div style="padding: 48px 24px; text-align: center; color: var(--text-secondary); background: var(--bg-surface); border-radius: 8px; border: 1.5px dashed var(--border-color); margin: 32px auto; max-width: 650px;">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent-active)" stroke-width="2" style="margin-bottom: 12px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <h2 style="font-size: 17px; margin: 0 0 8px 0; color: var(--text-primary); font-weight: 800;">Selecione os Dias da Semana Ativos</h2>
        <p style="font-size: 13px; line-height: 1.5; color: var(--text-secondary); margin: 0;">Para gerar o cronograma oficial e calcular a distribuição das aulas, marque ao menos um dia da semana (ex: Seg, Ter, Qua...) no painel lateral à esquerda.</p>
      </div>
    `;
  }

  const {
    nomeCurso = "",
    codigoTurma = "",
    escola = "",
    unidadeCurricular = "",
    docente = "",
    coordenador = "",
    cargaHorariaTotal = 40
  } = formData;

  const { vigencia, semAno, mesesSequenciais = [] } = calcResult;

  let monthTablesHTML = "";
  const numCols = 25;
  const totalBlocos = 8;

  for (let slot = 0; slot < totalBlocos; slot++) {
    const mData = mesesSequenciais[slot] || null;
    const nomeMes = mData ? mData.nomeMes : "";
    const dTeoria = mData ? mData.diasTeoria : [];
    const dPratica = mData ? mData.diasPratica : [];
    const dAmb = mData ? mData.ambientes : [];

    let rowTeoria = "";
    let rowPratica = "";
    let rowAmbiente = "";

    for (let c = 0; c < numCols; c++) {
      const t = dTeoria[c] || "";
      const p = dPratica[c] || "";
      const a = dAmb[c] || "";
      const isSplitAmb = a && a.includes("/");

      rowTeoria += `<td class="a4-cell a4-cell-teoria ${t ? "has-val" : ""}">${t}</td>`;
      rowPratica += `<td class="a4-cell a4-cell-pratica ${p ? "has-val" : ""}">${p}</td>`;
      rowAmbiente += `<td class="a4-cell ${a ? "has-val" : ""} ${isSplitAmb ? "a4-cell-split" : ""}">${a}</td>`;
    }

    monthTablesHTML += `
      <table class="a4-month-table">
        <thead>
          <tr>
            <th class="a4-th-label">Aulas/Mês</th>
            <th class="a4-th-monthname" colspan="${numCols}">
              ${nomeMes}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="a4-row-teoria">Dias de Teoria</td>
            ${rowTeoria}
          </tr>
          <tr>
            <td class="a4-row-pratica">Dias de Prática</td>
            ${rowPratica}
          </tr>
          <tr>
            <td class="a4-row-ambiente">Ambiente</td>
            ${rowAmbiente}
          </tr>
        </tbody>
      </table>
    `;
  }

  const schoolHeadingHTML = escola ? `<h2>ESCOLA SENAI “${escola}”</h2>` : `<h2>ESCOLA SENAI</h2>`;

  return `
    <div class="page-a4">
      <header class="a4-header">
        <img src="logo_senai_oficial.png" alt="SENAI" class="senai-logo-img">
        <div class="a4-school-title">
          ${schoolHeadingHTML}
          <h1>Cronograma de Aulas</h1>
        </div>
      </header>

      <table class="a4-meta-table">
        <tbody>
          <tr>
            <td class="col-left">
              <div class="meta-field">
                <span class="meta-lbl">Curso:</span>
                <span class="meta-val">${nomeCurso}</span>
              </div>
            </td>
            <td class="col-right">
              <div class="meta-field">
                <span class="meta-lbl">Turma:</span>
                <span class="meta-val">${codigoTurma}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td class="col-left">
              <div class="meta-field">
                <span class="meta-lbl">Unidade Curricular:</span>
                <span class="meta-val">${unidadeCurricular || nomeCurso}</span>
              </div>
            </td>
            <td class="col-right">
              <div class="meta-field">
                <span class="meta-lbl">Carga Horária:</span>
                <span class="meta-val">${calcResult.cargaHorariaFormatada || (cargaHorariaTotal + " horas")}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td class="col-left">
              <div class="meta-field">
                <span class="meta-lbl">COORDENADOR:</span>
                <span class="meta-val">${coordenador}</span>
              </div>
            </td>
            <td class="col-right">
              <div class="meta-field">
                <span class="meta-lbl">Sem / Ano:</span>
                <span class="meta-val">${semAno}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td class="col-left">
              <div class="meta-field">
                <span class="meta-lbl">PROFESSOR / RESPONSÁVEL:</span>
                <span class="meta-val">${docente}</span>
              </div>
            </td>
            <td class="col-right">
              <div class="meta-field">
                <span class="meta-lbl">Vigência:</span>
                <span class="meta-val">${vigencia}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <main class="a4-months-container">
        ${monthTablesHTML}
      </main>

      <footer class="a4-footer">
        <table class="a4-signatures-table">
          <tbody>
            <tr>
              <td class="col-elab">Elaborador:<br><strong>${docente}</strong></td>
              <td class="col-data1">Data:<br>&nbsp;</td>
              <td class="col-aprov">Aprovador:<br><strong>${coordenador}</strong></td>
              <td class="col-data2">Data:<br>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        <div class="a4-footer-info">
          <span class="code">FR-1.02 – 66A (V.00)</span>
          <span class="legend-coral">Legenda: &nbsp;&nbsp; S – Sala &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; O – Oficina &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; L – Laboratório</span>
          <span class="page-num">1 de 1</span>
        </div>
      </footer>
    </div>
  `;
}

// 7. RENDERIZADOR DO GERENCIADOR INTERATIVO DE AULAS
function renderInteractiveDaysGrid() {
  const container = document.getElementById("interactive-days-grid");
  const badge = document.getElementById("ch-progress-badge");

  if (currentScheduleResult && badge) {
    const { horasPreenchidasFormatadas, totalCargaFormatada, minutosPreenchidos, totalCargaMinutos } = currentScheduleResult;
    badge.textContent = `${horasPreenchidasFormatadas} / ${totalCargaFormatada}`;
    badge.classList.remove("ch-full", "ch-overflow");
    if (minutosPreenchidos > 0 && minutosPreenchidos >= totalCargaMinutos) {
      badge.classList.add("ch-full"); // VERDE: sucesso na distribuição (mesmo se houver horas excedentes)
    } else {
      badge.classList.add("ch-overflow"); // VERMELHO: horas insuficientes ou pendentes
    }
  }

  if (!container) return;

  if (!activeLessons || activeLessons.length === 0) {
    if (currentScheduleResult && currentScheduleResult.emptyReason === "no_days_selected") {
      container.innerHTML = `<div style="color: #94a3b8; font-size: 12px; grid-column: 1/-1; text-align: center; padding: 18px;">Selecione os dias da semana com aula no painel lateral para distribuir as aulas.</div>`;
    } else {
      container.innerHTML = `<div style="color: #94a3b8; font-size: 12px; grid-column: 1/-1; text-align: center; padding: 12px;">Nenhuma aula calculada para os parâmetros atuais.</div>`;
    }
    return;
  }

  const horasPorDiaStr = document.getElementById("horasPorDia")?.value || "04:00";
  const minutosDiaPadrao = timeToMinutes(horasPorDiaStr) || 240;

  let html = "";
  let aulaCounter = 0;

  activeLessons.forEach((aula, idx) => {
    const isInactive = !!aula.isInactive;
    if (!isInactive) {
      aulaCounter++;
    }
    const numLabel = isInactive ? "Inativo" : `Aula ${aulaCounter}`;

    const isSplit = !!aula.isSplit;
    const isTeoria = aula.tipo === "teoria";
    const isPratica = aula.tipo === "pratica";

    let chipBaseClass = "chip-pratica";
    if (isSplit) {
      chipBaseClass = "chip-misto";
    } else if (isTeoria) {
      chipBaseClass = "chip-teoria";
    }

    const chipClass = isInactive ? `${chipBaseClass} chip-inactive` : chipBaseClass;

    let badgeClass = "badge-pratica";
    let badgeText = "PRÁTICA";
    if (isInactive) {
      badgeClass = "badge-inactive";
      badgeText = "INATIVO";
    } else if (isSplit) {
      const isPratFirst = aula.ordem === "pratica-teoria";
      badgeClass = isPratFirst ? "badge-misto-invert" : "badge-misto";
      badgeText = isPratFirst ? "PRÁTICA / TEORIA" : "TEORIA / PRÁTICA";
    } else if (isTeoria) {
      badgeClass = "badge-teoria";
      badgeText = "TEORIA";
    }

    // Horas deste dia
    const horasDiaStr = minutesToHHMM(aula.minutos);
    const isDifferentHours = !isInactive && (aula.minutos !== minutosDiaPadrao);
    const diffHoursClass = isDifferentHours ? "hours-different" : "";
    const hoursTooltip = isDifferentHours 
      ? `Carga deste dia: ${horasDiaStr} (diferente do padrão de ${minutesToHHMM(minutosDiaPadrao)})`
      : `Carga deste dia: ${horasDiaStr}`;

    // Exibição de ambiente no rodapé do card
    let ambDisplay = aula.ambiente;
    if (isSplit) {
      const pStr = `${aula.praticaAmbiente} (${minutesToHHMM(aula.praticaMinutos)})`;
      const tStr = `${aula.teoriaAmbiente} (${minutesToHHMM(aula.teoriaMinutos)})`;
      ambDisplay = aula.ordem === "pratica-teoria" ? `${pStr} • ${tStr}` : `${tStr} • ${pStr}`;
    }

    const tooltipText = isInactive
      ? "Dia desativado manualmente. Clique c/ botão direito para reativar."
      : "Clique: Alternar Teoria/Prática • Segure ou clique em ⋮: Editar ambiente/horas/divisão • Botão direito: Desativar dia";

    html += `
      <div class="lesson-chip ${chipClass}" data-index="${idx}" data-datekey="${aula.dataKey}" title="${tooltipText}">
        <div class="chip-header">
          <div style="display: flex; align-items: center; gap: 5px;">
            <span class="chip-idx" title="${numLabel}">${isInactive ? "✕" : aulaCounter}</span>
            <span class="chip-hours-pill ${diffHoursClass}" title="${hoursTooltip}">${horasDiaStr}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span class="chip-date">${aula.diaStr}/${String(aula.mesIdx + 1).padStart(2, "0")} (${aula.diaSemanaNome})</span>
            <button type="button" class="chip-menu-btn" title="Configurar este dia (ambiente, horas, divisão)" data-index="${idx}" data-datekey="${aula.dataKey}">⋮</button>
          </div>
        </div>
        <div class="chip-badge-wrapper">
          <span class="chip-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="chip-footer">
          <span class="chip-amb-val" style="width: 100%; text-align: center; ${isSplit ? 'font-size: 8.5px; padding: 2px 4px;' : ''}">${ambDisplay}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Vincular eventos de clique, long-press e contextmenu em cada chip
  attachChipEvents(container);
}

// VINCULAR EVENTOS NOS CARDS (CLIQUE, CLIQUE LONGO / LONG-PRESS E BOTÃO DIREITO)
function attachChipEvents(container) {
  const chips = container.querySelectorAll(".lesson-chip");
  chips.forEach(chip => {
    const idx = Number(chip.dataset.index);
    const dateKey = chip.dataset.datekey;
    let pressTimer = null;
    let isLongPress = false;
    let startX = 0;
    let startY = 0;

    const startPress = (e) => {
      if (e.button !== undefined && e.button !== 0) return; // apenas botão esquerdo
      isLongPress = false;
      chip.classList.add("is-pressing");
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      pressTimer = setTimeout(() => {
        isLongPress = true;
        chip.classList.remove("is-pressing");
        openDayOptionsModal(idx, dateKey);
      }, 500);
    };

    const cancelPress = () => {
      chip.classList.remove("is-pressing");
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const checkMove = (e) => {
      const curX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const curY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      if (Math.abs(curX - startX) > 10 || Math.abs(curY - startY) > 10) {
        cancelPress();
      }
    };

    // Eventos de Mouse (Desktop)
    chip.addEventListener("mousedown", startPress);
    chip.addEventListener("mouseup", cancelPress);
    chip.addEventListener("mouseleave", cancelPress);
    chip.addEventListener("mousemove", checkMove);

    // Eventos de Touch (Mobile/Tablet)
    chip.addEventListener("touchstart", startPress, { passive: true });
    chip.addEventListener("touchend", cancelPress);
    chip.addEventListener("touchcancel", cancelPress);
    chip.addEventListener("touchmove", checkMove, { passive: true });

    // Botão de menu (⋮)
    const menuBtn = chip.querySelector(".chip-menu-btn");
    if (menuBtn) {
      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        cancelPress();
        openDayOptionsModal(idx, dateKey);
      });
    }

    // Clique normal (botão esquerdo)
    chip.addEventListener("click", (e) => {
      if (isLongPress) {
        e.preventDefault();
        e.stopPropagation();
        isLongPress = false;
        return;
      }
      if (activeLessons[idx] && activeLessons[idx].isInactive) {
        toggleInactiveDay(dateKey);
      } else {
        toggleLessonType(idx);
      }
    });

    // Clique com botão direito: desativa ou reativa o dia no calendário
    chip.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      cancelPress();
      toggleInactiveDay(dateKey);
    });
  });
}

// TOGGLE INATIVIDADE DE UM DIA (BOTÃO DIREITO NO CHIP)
function toggleInactiveDay(dateKey) {
  if (!dateKey) return;
  if (inactiveDateKeys.has(dateKey)) {
    inactiveDateKeys.delete(dateKey);
    // Se havia registro em lessonCustomizations com 0 minutos gerado quando inativo, limpa para voltar à base cheia
    if (lessonCustomizations[dateKey] && lessonCustomizations[dateKey].minutos === 0) {
      delete lessonCustomizations[dateKey];
    }
  } else {
    inactiveDateKeys.add(dateKey);
  }
  updatePreview(true);
}

// ALTERNAR TIPO DE AULA (TEORIA <-> PRÁTICA) DE UM DIA ESPECÍFICO
function toggleLessonType(index) {
  if (!activeLessons[index]) return;

  const aula = activeLessons[index];
  const ambTeoria = document.getElementById("editorAmbienteTeoria")?.value || "S01";
  const ambPratica = document.getElementById("editorAmbientePratica")?.value || "L01";

  if (aula.isSplit) {
    // Se era misto e clicou normalmente, passa para Teoria pura
    aula.isSplit = false;
    aula.tipo = "teoria";
    aula.ambiente = ambTeoria;
    lessonCustomizations[aula.dataKey] = {
      tipo: "teoria",
      ambiente: ambTeoria,
      minutos: aula.minutos,
      isSplit: false
    };
  } else if (aula.tipo === "teoria") {
    aula.tipo = "pratica";
    aula.ambiente = ambPratica;
    lessonCustomizations[aula.dataKey] = {
      tipo: "pratica",
      ambiente: ambPratica,
      minutos: aula.minutos,
      isSplit: false
    };
  } else {
    aula.tipo = "teoria";
    aula.ambiente = ambTeoria;
    lessonCustomizations[aula.dataKey] = {
      tipo: "teoria",
      ambiente: ambTeoria,
      minutos: aula.minutos,
      isSplit: false
    };
  }

  // Recalcula agrupamento de meses preservando as alterações ativas
  updatePreview(true);
}

// ==========================================================================
// MODAL DE CONFIGURAÇÃO INDIVIDUAL DO DIA (AMBIENTE / HORAS / DIVISÃO)
// ==========================================================================
let currentModalDateKey = null;

function openDayOptionsModal(idx, dateKey) {
  const aula = activeLessons.find(a => a.dataKey === dateKey) || activeLessons[idx];
  if (!aula) return;

  currentModalDateKey = dateKey;
  const modal = document.getElementById("day-options-modal");
  if (!modal) return;

  const formData = getFormData();
  const defaultAmbTeoria = formData.ambienteTeoria || "S01";
  const defaultAmbPratica = formData.ambientePratica || "L01";
  const defaultMinutosDia = timeToMinutes(formData.horasPorDia) || 240;

  const custom = lessonCustomizations[dateKey] || {};

  // Título e subtítulo
  const titleEl = document.getElementById("modal-day-title");
  const subEl = document.getElementById("modal-day-subtitle");
  if (titleEl) titleEl.textContent = `Configurar Aula - ${aula.diaStr}/${String(aula.mesIdx + 1).padStart(2, "0")}/${aula.ano} (${aula.diaSemanaNome})`;
  if (subEl) subEl.textContent = `Aula: ${aula.isInactive ? "Inativo" : aula.diaStr + " " + aula.mesNome} • Padrão da turma: ${formData.horasPorDia}`;

  // 1. Ambiente deste dia
  const ambInput = document.getElementById("modal-input-ambiente");
  if (ambInput) {
    ambInput.value = custom.ambiente || aula.ambiente || (aula.tipo === "teoria" ? defaultAmbTeoria : defaultAmbPratica);
  }

  // 2. Carga horária deste dia
  const horasInput = document.getElementById("modal-input-horas");
  if (horasInput) {
    horasInput.value = minutesToHHMM(aula.minutos || defaultMinutosDia);
  }

  // 3. Divisão Teoria e Prática
  const toggleSplit = document.getElementById("modal-toggle-split");
  const splitContent = document.getElementById("modal-split-content");
  const groupSingleAmb = document.getElementById("group-single-ambiente");
  const isSplit = !!custom.isSplit || !!aula.isSplit;

  if (toggleSplit) toggleSplit.checked = isSplit;
  if (splitContent) splitContent.style.display = isSplit ? "block" : "none";
  if (groupSingleAmb) groupSingleAmb.style.display = isSplit ? "none" : "block";

  // Ordem
  const ordem = custom.ordem || aula.ordem || "teoria-pratica";
  const radios = document.querySelectorAll("input[name='splitOrder']");
  radios.forEach(r => {
    r.checked = (r.value === ordem);
  });

  // Campos Teoria
  const teoriaHorasInput = document.getElementById("modal-split-teoria-horas");
  const teoriaAmbInput = document.getElementById("modal-split-teoria-amb");
  const curTeoriaMin = custom.teoriaMinutos !== undefined ? custom.teoriaMinutos : (aula.teoriaMinutos || Math.floor((aula.minutos || defaultMinutosDia) / 2));
  if (teoriaHorasInput) teoriaHorasInput.value = minutesToHHMM(curTeoriaMin);
  if (teoriaAmbInput) teoriaAmbInput.value = custom.teoriaAmbiente || aula.teoriaAmbiente || defaultAmbTeoria;

  // Campos Prática
  const praticaHorasInput = document.getElementById("modal-split-pratica-horas");
  const praticaAmbInput = document.getElementById("modal-split-pratica-amb");
  const curPraticaMin = custom.praticaMinutos !== undefined ? custom.praticaMinutos : (aula.praticaMinutos || Math.ceil((aula.minutos || defaultMinutosDia) / 2));
  if (praticaHorasInput) praticaHorasInput.value = minutesToHHMM(curPraticaMin);
  if (praticaAmbInput) praticaAmbInput.value = custom.praticaAmbiente || aula.praticaAmbiente || defaultAmbPratica;

  modal.style.display = "flex";
}

function closeDayOptionsModal() {
  const modal = document.getElementById("day-options-modal");
  if (modal) modal.style.display = "none";
  currentModalDateKey = null;
}

function saveDayOptionsModal() {
  if (!currentModalDateKey) return;

  const toggleSplit = document.getElementById("modal-toggle-split")?.checked;
  const horasStr = document.getElementById("modal-input-horas")?.value || "04:00";
  const singleAmb = document.getElementById("modal-input-ambiente")?.value?.trim() || "";

  const formData = getFormData();
  const defaultMinutosDia = timeToMinutes(formData.horasPorDia) || 240;

  if (toggleSplit) {
    const ordemRadio = document.querySelector("input[name='splitOrder']:checked");
    const ordem = ordemRadio ? ordemRadio.value : "teoria-pratica";
    const tHorasStr = document.getElementById("modal-split-teoria-horas")?.value || "02:00";
    const pHorasStr = document.getElementById("modal-split-pratica-horas")?.value || "02:00";
    const tAmb = document.getElementById("modal-split-teoria-amb")?.value?.trim() || formData.ambienteTeoria || "S01";
    const pAmb = document.getElementById("modal-split-pratica-amb")?.value?.trim() || formData.ambientePratica || "L01";

    const tMin = timeToMinutes(tHorasStr);
    const pMin = timeToMinutes(pHorasStr);
    const totalMin = tMin + pMin;

    lessonCustomizations[currentModalDateKey] = {
      tipo: "misto",
      isSplit: true,
      ordem,
      minutos: totalMin,
      ambiente: ordem === "pratica-teoria" ? `${pAmb}/${tAmb}` : `${tAmb}/${pAmb}`,
      teoriaMinutos: tMin,
      teoriaAmbiente: tAmb,
      praticaMinutos: pMin,
      praticaAmbiente: pAmb
    };
  } else {
    const minutos = timeToMinutes(horasStr);
    const prevCustom = lessonCustomizations[currentModalDateKey] || {};
    const tipo = (prevCustom.tipo && prevCustom.tipo !== "misto") ? prevCustom.tipo : "pratica";

    lessonCustomizations[currentModalDateKey] = {
      tipo: tipo,
      isSplit: false,
      minutos: minutos,
      ambiente: singleAmb || (tipo === "teoria" ? formData.ambienteTeoria : formData.ambientePratica)
    };
  }

  closeDayOptionsModal();
  updatePreview(true);
}

function resetDayOptionsModal() {
  if (!currentModalDateKey) return;
  delete lessonCustomizations[currentModalDateKey];
  closeDayOptionsModal();
  updatePreview(true);
}

// DEFINIR TODAS AS AULAS EM LOTE
function setAllLessonsType(newTipo) {
  const ambTeoria = document.getElementById("editorAmbienteTeoria")?.value || "S01";
  const ambPratica = document.getElementById("editorAmbientePratica")?.value || "L01";

  activeLessons.forEach(a => {
    a.tipo = newTipo;
    a.ambiente = newTipo === "teoria" ? ambTeoria : ambPratica;
  });

  const formData = getFormData();
  const calcResult = calculateSchedule(formData, true);

  const target = document.getElementById("cronograma-render-target");
  if (target) {
    target.innerHTML = renderScheduleHTML(formData, calcResult);
  }

  renderInteractiveDaysGrid();
}

// ATUALIZAR AMBIENTES EM LOTE AO DIGITAR NOS INPUTS DO PAINEL
function updateEnvironmentBatch(tipoAlvo, novoAmbiente) {
  if (!novoAmbiente) return;

  activeLessons.forEach(a => {
    if (a.tipo === tipoAlvo) {
      a.ambiente = novoAmbiente;
    }
  });

  const formData = getFormData();
  const calcResult = calculateSchedule(formData, true);

  const target = document.getElementById("cronograma-render-target");
  if (target) {
    target.innerHTML = renderScheduleHTML(formData, calcResult);
  }

  renderInteractiveDaysGrid();
}

// 8. EXTRAÇÃO DOS DADOS DO FORMULÁRIO E RENDERIZAÇÃO
function getFormData() {
  return {
    nomeCurso: document.getElementById("nomeCurso")?.value || "",
    codigoTurma: document.getElementById("codigoTurma")?.value || "",
    escola: document.getElementById("escola")?.value || "",
    ambienteTeoria: document.getElementById("editorAmbienteTeoria")?.value || "",
    ambientePratica: document.getElementById("editorAmbientePratica")?.value || "",
    unidadeCurricular: document.getElementById("unidadeCurricular")?.value || "",
    docente: document.getElementById("docente")?.value || "",
    coordenador: document.getElementById("coordenador")?.value || "",
    horaInicio: document.getElementById("horaInicio")?.value || "13:00",
    horaFim: document.getElementById("horaFim")?.value || "17:00",
    cargaHorariaTotal: document.getElementById("cargaHorariaTotal")?.value || "120",
    horasPorDia: document.getElementById("horasPorDia")?.value || "04:00",
    dataInicioStr: document.getElementById("dataInicioStr")?.value || "2026-04-14",
    diasSemana: [...currentDays],
    manualDateOverrides: { ...manualDateOverrides },
    inactiveDates: Array.from(inactiveDateKeys),
    customLessons: JSON.parse(JSON.stringify(lessonCustomizations))
  };
}

function updatePreview(preserveCustom = false) {
  const formData = getFormData();
  const calcResult = calculateSchedule(formData, preserveCustom);
  const target = document.getElementById("cronograma-render-target");
  if (target) {
    target.innerHTML = renderScheduleHTML(formData, calcResult);
  }

  // Atualiza também o subtítulo da barra superior com a versão
  const schoolLabel = document.getElementById("topbar-school-label");
  if (schoolLabel) {
    schoolLabel.textContent = "V.01";
  }

  renderInteractiveDaysGrid();
}

// 9. PREENCHIMENTO AUTOMÁTICO COM PRESET
function applyPreset(presetKey) {
  let p = null;
  if (presetKey.startsWith("OFFICIAL_")) {
    const key = presetKey.replace("OFFICIAL_", "");
    p = PRESETS[key];
  } else if (presetKey.startsWith("SAVED_")) {
    const key = presetKey.replace("SAVED_", "");
    const saved = getSavedModels();
    p = saved[key];
  } else {
    p = PRESETS[presetKey] || getSavedModels()[presetKey];
  }

  if (!p) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined ? val : "";
  };

  setVal("nomeCurso", p.nomeCurso || "");
  setVal("codigoTurma", p.codigoTurma || "");
  setVal("escola", p.escola || "");
  setVal("unidadeCurricular", p.unidadeCurricular || "");
  setVal("editorAmbienteTeoria", p.ambienteTeoria || "");
  setVal("editorAmbientePratica", p.ambientePratica || p.ambiente || "");
  setVal("docente", p.docente || "");
  setVal("coordenador", p.coordenador || "");
  setVal("horaInicio", p.horaInicio);
  setVal("horaFim", p.horaFim);
  setVal("cargaHorariaTotal", p.cargaHorariaTotal);
  setVal("horasPorDia", p.horasPorDia || "04:00");
  setVal("dataInicioStr", p.dataInicioStr);

  currentDays = Array.isArray(p.diasSemana) ? [...p.diasSemana] : [];
  const dayBtns = document.querySelectorAll(".day-btn");
  dayBtns.forEach(btn => {
    const d = Number(btn.dataset.day);
    btn.classList.toggle("active", currentDays.includes(d));
  });

  if (p.manualDateOverrides && typeof p.manualDateOverrides === "object") {
    manualDateOverrides = { ...p.manualDateOverrides };
  } else {
    manualDateOverrides = {};
  }

  if (Array.isArray(p.inactiveDates)) {
    inactiveDateKeys = new Set(p.inactiveDates);
  } else {
    inactiveDateKeys = new Set();
  }

  if (p.customLessons && typeof p.customLessons === "object") {
    lessonCustomizations = JSON.parse(JSON.stringify(p.customLessons));
  } else {
    lessonCustomizations = {};
  }

  renderManualDatesList();

  // Recalcula do zero para o novo preset
  updatePreview(false);
}

// 10. SISTEMA DE GERENCIAMENTO DE TEMAS (Solarized, Claro, Conforto Visual)
function applyTheme(theme) {
  const validThemes = ["solarized", "claro", "conforto visual"];
  const selectedTheme = validThemes.includes(theme) ? theme : "solarized";
  document.documentElement.setAttribute("data-theme", selectedTheme);
  document.body.setAttribute("data-theme", selectedTheme);
}

function initThemeSystem() {
  const themeSelector = document.getElementById("theme-selector");
  const savedTheme = localStorage.getItem("theme") || "solarized";

  applyTheme(savedTheme);

  if (themeSelector) {
    themeSelector.value = savedTheme;
    themeSelector.addEventListener("change", (e) => {
      const newTheme = e.target.value;
      applyTheme(newTheme);
      localStorage.setItem("theme", newTheme);
    });
  }
}

// Aplicação imediata do tema para evitar FOUC
applyTheme(localStorage.getItem("theme") || "solarized");

// 11. EXPORTAÇÃO EM PDF (A4 PAISAGEM / LANDSCAPE - 1 PÁGINA ESTRITA)
async function exportToPDF() {
  const element = document.querySelector(".page-a4");
  if (!element) {
    alert("Nenhum cronograma gerado para exportação.");
    return;
  }

  const formData = getFormData();
  const rawTurma = formData.codigoTurma || "SENAI_TURMA";
  const filename = `Cronograma ${rawTurma}.pdf`;

  const oldTitle = document.title;
  document.title = `Cronograma ${rawTurma}`;

  const btn = document.getElementById("btn-export-pdf");
  if (btn) {
    btn.innerHTML = `Gerando PDF...`;
    btn.disabled = true;
  }

  // Desativa temporariamente o filtro de brilho do tema "conforto visual" durante a captura do PDF
  const originalFilter = element.style.filter;
  element.style.filter = "none";

  if (typeof window.html2pdf === "function") {
    const opt = {
      margin: 0,
      filename: filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
    };

    try {
      await window.html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Erro no html2pdf:", err);
      window.print();
    } finally {
      element.style.filter = originalFilter;
      document.title = oldTitle;
      if (btn) {
        btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Baixar PDF`;
        btn.disabled = false;
      }
    }
  } else {
    window.print();
    element.style.filter = originalFilter;
    document.title = oldTitle;
    if (btn) {
      btn.innerHTML = `Baixar PDF`;
      btn.disabled = false;
    }
  }
}

// 12. INICIALIZAÇÃO E EVENTOS DOM
document.addEventListener("DOMContentLoaded", () => {
  console.log("Inicializando Aplicação do Cronograma SENAI com Gerenciador Interativo de Aulas...");

  // Inicializar o seletor de tema
  initThemeSystem();

  populatePresetDropdown();
  populateHorarioPresetDropdown();

  // 1. Vincular Seletor de Presets / Modelos
  const presetSelect = document.getElementById("presetSelect");
  if (presetSelect) {
    presetSelect.addEventListener("change", (e) => {
      if (e.target.value) {
        applyPreset(e.target.value);
      }
    });
  }

  // 2. Vincular Seletor de Horários Pré-definidos com HH:MM
  const horarioPresetSelect = document.getElementById("horarioPresetSelect");
  if (horarioPresetSelect) {
    horarioPresetSelect.addEventListener("change", (e) => {
      if (e.target.value) {
        const [inicio, fim, turno, duracao] = e.target.value.split("|");
        const hi = document.getElementById("horaInicio");
        const hf = document.getElementById("horaFim");
        const tr = document.getElementById("turno");
        const hd = document.getElementById("horasPorDia");
        if (hi) hi.value = inicio;
        if (hf) hf.value = fim;
        if (tr && turno) tr.value = turno;
        if (hd && duracao) hd.value = duracao;
        updatePreview(true);
      }
    });
  }

  // Vincular botões de Adicionar e Remover do Preenchimento Rápido de Horários
  document.getElementById("btn-adicionar-horario-rapido")?.addEventListener("click", adicionarHorarioAoPreenchimentoRapido);
  document.getElementById("btn-remover-horario-rapido")?.addEventListener("click", removerHorarioDoPreenchimentoRapido);

  // Máscara e recálculo dinâmico para os campos de horário e duração
  const hiEl = document.getElementById("horaInicio");
  if (hiEl) {
    const handleHiChange = () => {
      calculateDurationFromStartEnd();
      updatePreview(true);
    };
    hiEl.addEventListener("input", handleHiChange);
    hiEl.addEventListener("change", handleHiChange);
  }

  const hfEl = document.getElementById("horaFim");
  if (hfEl) {
    const handleHfChange = () => {
      calculateDurationFromStartEnd();
      updatePreview(true);
    };
    hfEl.addEventListener("input", handleHfChange);
    hfEl.addEventListener("change", handleHfChange);
  }

  const hd = document.getElementById("horasPorDia");
  if (hd) {
    hd.addEventListener("input", (e) => {
      let val = e.target.value.replace(/\D/g, "");
      if (val.length > 4) val = val.slice(0, 4);
      if (val.length > 2) {
        val = val.slice(0, 2) + ":" + val.slice(2);
      }
      e.target.value = val;

      if (val.length === 5) {
        calculateEndFromStartAndDuration();
      }
      updatePreview(true);
    });

    hd.addEventListener("change", () => {
      calculateEndFromStartAndDuration();
      updatePreview(true);
    });
  }

  // 3. Vincular Botões de Dias da Semana
  const dayBtns = document.querySelectorAll(".day-btn");
  dayBtns.forEach(btn => {
    // Garante que o estado inicial das classes reflita currentDays (inicialmente vazio)
    const d = Number(btn.dataset.day);
    btn.classList.toggle("active", currentDays.includes(d));

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const d = Number(btn.dataset.day);
      if (currentDays.includes(d)) {
        currentDays = currentDays.filter(x => x !== d);
      } else {
        currentDays.push(d);
        currentDays.sort((a, b) => a - b);
      }

      dayBtns.forEach(b => {
        const bd = Number(b.dataset.day);
        b.classList.toggle("active", currentDays.includes(bd));
      });

      updatePreview(true);
    });
  });

  // 4. Vincular Inputs do Formulário Principal (Reatividade 100%)
  const inputIds = [
    "nomeCurso", "codigoTurma", "escola", "unidadeCurricular",
    "docente", "coordenador",
    "cargaHorariaTotal", "dataInicioStr"
  ];

  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => updatePreview(true));
      el.addEventListener("change", () => updatePreview(true));
    }
  });

  // 5. Vincular Inputs de Ambientes do Painel Interativo
  const ambTeoriaInput = document.getElementById("editorAmbienteTeoria");
  if (ambTeoriaInput) {
    ambTeoriaInput.addEventListener("input", (e) => {
      updateEnvironmentBatch("teoria", e.target.value);
    });
  }

  const ambPraticaInput = document.getElementById("editorAmbientePratica");
  if (ambPraticaInput) {
    ambPraticaInput.addEventListener("input", (e) => {
      const val = e.target.value;
      const mainAmb = document.getElementById("ambiente");
      if (mainAmb) mainAmb.value = val;
      updateEnvironmentBatch("pratica", val);
    });
  }

  // 6. Vincular Botões de Ações em Lote do Painel Interativo
  document.getElementById("btn-set-all-teoria")?.addEventListener("click", () => setAllLessonsType("teoria"));
  document.getElementById("btn-set-all-pratica")?.addEventListener("click", () => setAllLessonsType("pratica"));

  // 7. Vincular Botão de Exportação PDF
  document.getElementById("btn-export-pdf")?.addEventListener("click", exportToPDF);

  // 8. Vincular Botão Limpar / Reset (Esvaziar todos os campos)
  document.getElementById("btn-reset-form")?.addEventListener("click", resetFormToEmpty);

  // 9. Vincular Botões de Ação de Modelos
  document.getElementById("btn-salvar-modelo")?.addEventListener("click", saveCurrentModel);
  document.getElementById("btn-deletar-modelo")?.addEventListener("click", deleteSelectedModel);

  // 10. Vincular Botões de Exportar e Importar Perfil (Troca de PCs)
  document.getElementById("btn-export-profile")?.addEventListener("click", exportProfile);
  document.getElementById("btn-import-profile")?.addEventListener("click", () => {
    document.getElementById("input-import-profile")?.click();
  });
  document.getElementById("input-import-profile")?.addEventListener("change", importProfile);

  // 11. SUPORTE A COLAR (CLIPBOARD) NO FORMATO DD/MM/AAAA NOS CAMPOS DE DATA
  const setupDatePasteSupport = (inputElement) => {
    if (!inputElement) return;

    inputElement.addEventListener("paste", (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      const pastedText = clipboardData.getData("text");
      const isoDate = parseDateInputToISO(pastedText);
      if (isoDate) {
        e.preventDefault();
        inputElement.value = isoDate;
        inputElement.dispatchEvent(new Event("input", { bubbles: true }));
        inputElement.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  };

  const dataInicioEl = document.getElementById("dataInicioStr");
  setupDatePasteSupport(dataInicioEl);

  const manualDateInput = document.getElementById("input-manual-date");
  setupDatePasteSupport(manualDateInput);

  // 12. VINCULAR BOTÕES DE AJUSTE MANUAL DE DATAS (+ ADIÇÃO E - REMOÇÃO)
  document.getElementById("btn-manual-date-add")?.addEventListener("click", () => {
    addManualDateRule("add");
  });

  document.getElementById("btn-manual-date-remove")?.addEventListener("click", () => {
    addManualDateRule("remove");
  });

  manualDateInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addManualDateRule("add");
    }
  });

  // 13. VINCULAR EVENTOS DO MODAL DE OPÇÕES DO DIA (LONG-PRESS OU BOTÃO ⋮)
  document.getElementById("modal-btn-close")?.addEventListener("click", closeDayOptionsModal);
  document.getElementById("modal-btn-cancelar")?.addEventListener("click", closeDayOptionsModal);
  document.getElementById("modal-btn-salvar")?.addEventListener("click", saveDayOptionsModal);
  document.getElementById("modal-btn-restaurar-tudo")?.addEventListener("click", resetDayOptionsModal);

  document.getElementById("modal-toggle-split")?.addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    const splitContent = document.getElementById("modal-split-content");
    const groupSingleAmb = document.getElementById("group-single-ambiente");
    if (splitContent) splitContent.style.display = isChecked ? "block" : "none";
    if (groupSingleAmb) groupSingleAmb.style.display = isChecked ? "none" : "block";
  });

  document.getElementById("modal-btn-split-half")?.addEventListener("click", () => {
    const horasStr = document.getElementById("modal-input-horas")?.value;
    const totMin = timeToMinutes(horasStr) || 240;
    const half1 = Math.floor(totMin / 2);
    const half2 = totMin - half1;
    const tInput = document.getElementById("modal-split-teoria-horas");
    const pInput = document.getElementById("modal-split-pratica-horas");
    if (tInput) tInput.value = minutesToHHMM(half1);
    if (pInput) pInput.value = minutesToHHMM(half2);
  });

  document.getElementById("modal-btn-reset-horas")?.addEventListener("click", () => {
    const formData = getFormData();
    const horasInput = document.getElementById("modal-input-horas");
    if (horasInput) horasInput.value = formData.horasPorDia || "04:00";
  });

  // Fechar modal ao clicar no backdrop escurecido
  document.getElementById("day-options-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "day-options-modal") {
      closeDayOptionsModal();
    }
  });

  // Renderiza a lista inicial de datas ajustadas manualmente se houver
  renderManualDatesList();
  const saved = getSavedModels();
  const savedKeys = Object.keys(saved);
  if (savedKeys.length > 0) {
    const firstKey = savedKeys[0];
    applyPreset("SAVED_" + firstKey);
    if (presetSelect) presetSelect.value = "SAVED_" + firstKey;
  } else {
    updatePreview(false);
    if (presetSelect) presetSelect.value = "";
  }
});

function resetFormToEmpty() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal("nomeCurso", "");
  setVal("codigoTurma", "");
  setVal("escola", "");
  setVal("unidadeCurricular", "");
  setVal("editorAmbienteTeoria", "");
  setVal("editorAmbientePratica", "");
  setVal("docente", "");
  setVal("coordenador", "");
  setVal("horaInicio", "");
  setVal("horaFim", "");
  setVal("cargaHorariaTotal", "");
  setVal("horasPorDia", "");
  setVal("dataInicioStr", "");

  const presetSelect = document.getElementById("presetSelect");
  if (presetSelect) presetSelect.value = "";

  const horarioPresetSelect = document.getElementById("horarioPresetSelect");
  if (horarioPresetSelect) horarioPresetSelect.value = "";

  currentDays = [];
  lessonCustomizations = {};
  const dayBtns = document.querySelectorAll(".day-btn");
  dayBtns.forEach(btn => {
    btn.classList.remove("active");
  });

  manualDateOverrides = {};
  inactiveDateKeys.clear();
  renderManualDatesList();

  updatePreview(false);
}

// ==========================================================================
// GERENCIADOR DE AJUSTES MANUAIS DE DATAS (+ ADIÇÃO E - REMOÇÃO)
// ==========================================================================
function renderManualDatesList() {
  const container = document.getElementById("manual-dates-list");
  if (!container) return;

  const entries = Object.entries(manualDateOverrides);
  if (entries.length === 0) {
    container.innerHTML = "";
    return;
  }

  // Ordena cronologicamente
  entries.sort((a, b) => a[0].localeCompare(b[0]));

  let html = "";
  for (const [dateKey, action] of entries) {
    const isAdd = action === "add";
    const tagClass = isAdd ? "tag-add" : "tag-remove";
    const prefix = isAdd ? "+" : "-";
    const labelDesc = isAdd ? "Forçada" : "Excluída";
    const formattedDate = isoToDDMMAAAA(dateKey);

    html += `
      <div class="manual-date-tag ${tagClass}">
        <span><strong>${prefix}</strong> ${formattedDate} (${labelDesc})</span>
        <button type="button" class="manual-date-tag-btn" onclick="removeManualDateRule('${dateKey}')" title="Remover ajuste desta data">
          ✕
        </button>
      </div>
    `;
  }

  container.innerHTML = html;
}

function addManualDateRule(action) {
  const input = document.getElementById("input-manual-date");
  if (!input) return;

  const rawValue = input.value.trim();
  if (!rawValue) {
    alert("Digite ou cole uma data (ex: 15/04/2026 ou 2026-04-15) para ajustar manualmente.");
    input.focus();
    return;
  }

  const isoDate = parseDateInputToISO(rawValue);
  if (!isoDate) {
    alert("Formato de data inválido! Por favor use dd/mm/aaaa ou aaaa-mm-dd.");
    input.focus();
    return;
  }

  // Se o dia estava na lista de inativos por botão direito, remove para não haver conflito
  if (action === "add" && inactiveDateKeys.has(isoDate)) {
    inactiveDateKeys.delete(isoDate);
  }

  manualDateOverrides[isoDate] = action;
  input.value = "";
  renderManualDatesList();
  updatePreview(true);
}

function removeManualDateRule(dateKey) {
  if (manualDateOverrides[dateKey]) {
    delete manualDateOverrides[dateKey];
    renderManualDatesList();
    updatePreview(true);
  }
}


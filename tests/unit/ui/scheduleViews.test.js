// Created at: 2026-10-17 14:43
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ScheduleFormView } from "../../../src/ui/cronograma/ScheduleFormView.js";
import { DayOptionsModalView } from "../../../src/ui/cronograma/DayOptionsModalView.js";
import { SchedulePreviewView } from "../../../src/ui/cronograma/SchedulePreviewView.js";

describe("ScheduleFormView (UI Cronograma)", () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="form-root">
        <input id="nomeCurso" value="Técnico em Eletroeletrônica" />
        <input id="codigoTurma" value="EE-2026" />
        <input id="escola" value="SENAI Roberto Simonsen" />
        <input id="unidadeCurricular" value="Comandos Elétricos" />
        <input id="editorAmbienteTeoria" value="S02" />
        <input id="editorAmbientePratica" value="L04" />
        <input id="docente" value="Prof. Silva" />
        <input id="coordenador" value="Coord. Santos" />
        <input id="horaInicio" value="13:00" />
        <input id="horaFim" value="17:00" />
        <input id="cargaHorariaTotal" value="120" />
        <input id="horasPorAula" value="01:00" />
        <input id="aulasPorDia" value="4" />
        <input id="horasPorDia" value="04:00" />
        <input id="dataInicioStr" value="2026-04-14" />
        <select id="horarioPresetSelect"></select>
        <button class="day-btn" data-day="1">Seg</button>
        <button class="day-btn" data-day="2">Ter</button>
        <button class="day-btn" data-day="3">Qua</button>
        <button class="day-btn" data-day="4">Qui</button>
        <button class="day-btn" data-day="5">Sex</button>
      </div>
    `;
    root = document.getElementById("form-root");
  });

  it("deve inicializar com campos e ler os dados corretamente via getFormData", () => {
    const formView = new ScheduleFormView({ root });
    formView.init();

    const data = formView.getFormData();
    expect(data.codigoTurma).toBe("EE-2026");
    expect(data.unidadeCurricular).toBe("Comandos Elétricos");
    expect(data.horasPorDia).toBe("04:00");
    expect(data.diasSemana).toEqual([1, 2, 3, 4]);
  });

  it("deve alternar dias ativos ao clicar nos botões de dias da semana", () => {
    const onChange = vi.fn();
    const formView = new ScheduleFormView({ root, onFormChange: onChange });
    formView.init();

    const sexBtn = root.querySelector('.day-btn[data-day="5"]');
    expect(sexBtn.classList.contains("active")).toBe(false);

    sexBtn.click();
    expect(sexBtn.classList.contains("active")).toBe(true);
    expect(formView.currentDays).toContain(5);
    expect(onChange).toHaveBeenCalled();

    sexBtn.click();
    expect(sexBtn.classList.contains("active")).toBe(false);
    expect(formView.currentDays).not.toContain(5);
  });

  it("deve atualizar horasPorDia automaticamente ao selecionar um preset de horário", () => {
    const onChange = vi.fn();
    const formView = new ScheduleFormView({ root, onFormChange: onChange });
    formView.init();

    const select = root.querySelector("#horarioPresetSelect");
    expect(select.options.length).toBeGreaterThan(1);

    select.value = "18:00|22:00|Noite|04:00";
    select.dispatchEvent(new Event("change"));

    expect(root.querySelector("#horaInicio").value).toBe("18:00");
    expect(root.querySelector("#horaFim").value).toBe("22:00");
    expect(root.querySelector("#horasPorDia").value).toBe("04:00");
    expect(onChange).toHaveBeenCalled();
  });

  it("deve resetar os campos com resetForm", () => {
    const formView = new ScheduleFormView({ root });
    formView.init();

    formView.resetForm();
    const data = formView.getFormData();
    expect(data.codigoTurma).toBe("");
    expect(data.nomeCurso).toBe("");
    expect(data.diasSemana).toEqual([]);
  });
});

describe("DayOptionsModalView (UI Cronograma)", () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="modal-root">
        <div id="day-options-modal" style="display: none;">
          <h3 id="modal-day-title"></h3>
          <p id="modal-day-subtitle"></p>
          <div id="group-single-ambiente">
            <input id="modal-input-ambiente" value="" />
          </div>
          <input id="modal-input-horas" value="04:00" />
          <input type="checkbox" id="modal-toggle-split" />
          <div id="modal-split-content" style="display: none;">
            <input type="radio" name="splitOrder" value="teoria-pratica" checked />
            <input type="radio" name="splitOrder" value="pratica-teoria" />
            <input id="modal-split-teoria-horas" value="02:00" />
            <input id="modal-split-teoria-amb" value="S01" />
            <input id="modal-split-pratica-horas" value="02:00" />
            <input id="modal-split-pratica-amb" value="L01" />
          </div>
          <button id="btn-save-day-options">Salvar</button>
          <button id="btn-reset-day-options">Resetar</button>
          <button id="btn-close-day-options">Fechar</button>
        </div>
      </div>
    `;
    root = document.getElementById("modal-root");
  });

  it("deve abrir o modal preenchendo os dados da aula", () => {
    const modalView = new DayOptionsModalView({ root });
    modalView.init();

    const aula = {
      dataKey: "2026-04-14",
      diaStr: "14",
      mesIdx: 3,
      ano: 2026,
      diaSemanaNome: "Ter",
      minutos: 240,
      tipo: "pratica",
      ambiente: "L01"
    };

    modalView.open(aula, {}, { ambienteTeoria: "S01", ambientePratica: "L01", horasPorDia: "04:00" });

    const modalEl = root.querySelector("#day-options-modal");
    expect(modalEl.style.display).toBe("flex");
    expect(root.querySelector("#modal-day-title").textContent).toContain("14/04/2026");
    expect(root.querySelector("#modal-input-ambiente").value).toBe("L01");
    expect(root.querySelector("#modal-input-horas").value).toBe("04:00");
  });

  it("deve salvar customização sem divisão (single ambiente)", () => {
    const onSave = vi.fn();
    const modalView = new DayOptionsModalView({ root, onSave });
    modalView.init();

    const aula = { dataKey: "2026-04-14", tipo: "pratica", minutos: 240 };
    modalView.open(aula);

    root.querySelector("#modal-input-ambiente").value = "Lab de Informática";
    root.querySelector("#btn-save-day-options").click();

    expect(onSave).toHaveBeenCalledWith("2026-04-14", expect.objectContaining({
      isSplit: false,
      ambiente: "Lab de Informática",
      minutos: 240
    }));
    expect(root.querySelector("#day-options-modal").style.display).toBe("none");
  });

  it("deve alternar divisão de teoria e prática e salvar formato split", () => {
    const onSave = vi.fn();
    const modalView = new DayOptionsModalView({ root, onSave });
    modalView.init();

    const aula = { dataKey: "2026-04-15", tipo: "pratica", minutos: 240 };
    modalView.open(aula);

    const toggle = root.querySelector("#modal-toggle-split");
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));

    expect(root.querySelector("#modal-split-content").style.display).toBe("block");
    expect(root.querySelector("#group-single-ambiente").style.display).toBe("none");

    root.querySelector("#btn-save-day-options").click();

    expect(onSave).toHaveBeenCalledWith("2026-04-15", expect.objectContaining({
      tipo: "misto",
      isSplit: true,
      teoriaAmbiente: "S01",
      praticaAmbiente: "L01",
      minutos: 240
    }));
  });

  it("deve acionar reset e fechar o modal", () => {
    const onReset = vi.fn();
    const modalView = new DayOptionsModalView({ root, onReset });
    modalView.init();

    const aula = { dataKey: "2026-04-16" };
    modalView.open(aula);
    root.querySelector("#btn-reset-day-options").click();

    expect(onReset).toHaveBeenCalledWith("2026-04-16");
    expect(root.querySelector("#day-options-modal").style.display).toBe("none");
  });
});

describe("SchedulePreviewView (UI Cronograma)", () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="preview-root">
        <span id="ch-progress-badge"></span>
        <span id="cron-metric-aulas-count"></span>
        <span id="cron-metric-aulas-status"></span>
        <span id="cron-metric-ch-value"></span>
        <span id="cron-metric-ch-status"></span>
        <div id="interactive-days-grid"></div>
        <div id="cronograma-render-target"></div>
      </div>
    `;
    root = document.getElementById("preview-root");
  });

  it("deve renderizar os chips de aula e métricas de carga horária", () => {
    const previewView = new SchedulePreviewView({ root });
    const activeLessons = [
      {
        numAula: 1,
        dataKey: "2026-04-14",
        diaStr: "14",
        mesIdx: 3,
        ano: 2026,
        diaSemanaNome: "Ter",
        tipo: "teoria",
        ambiente: "S01",
        minutos: 240,
        isInactive: false
      },
      {
        numAula: 2,
        dataKey: "2026-04-15",
        diaStr: "15",
        mesIdx: 3,
        ano: 2026,
        diaSemanaNome: "Qua",
        tipo: "pratica",
        ambiente: "L01",
        minutos: 240,
        isInactive: false
      }
    ];

    const scheduleResult = {
      totalAulas: 2,
      horasPreenchidasFormatadas: "08:00",
      totalCargaFormatada: "08:00",
      minutosPreenchidos: 480,
      totalCargaMinutos: 480
    };

    previewView.renderChips(activeLessons, scheduleResult);

    const container = root.querySelector("#interactive-days-grid");
    const chips = container.querySelectorAll(".lesson-chip");
    expect(chips.length).toBe(2);

    expect(chips[0].classList.contains("is-teoria")).toBe(true);
    expect(chips[1].classList.contains("is-pratica")).toBe(true);
    expect(root.querySelector("#cron-metric-aulas-count").textContent).toContain("2 Encontros");
    expect(root.querySelector("#cron-metric-ch-value").textContent).toContain("08:00 / 08:00");
  });

  it("deve acionar callbacks ao interagir com o chip e o menu ⋮", () => {
    const onChipClick = vi.fn();
    const onChipMenuClick = vi.fn();
    const onChipContextMenu = vi.fn();

    const previewView = new SchedulePreviewView({
      root,
      onChipClick,
      onChipMenuClick,
      onChipContextMenu
    });

    const activeLessons = [
      {
        numAula: 1,
        dataKey: "2026-04-14",
        diaStr: "14",
        mesIdx: 3,
        ano: 2026,
        diaSemanaNome: "Ter",
        tipo: "pratica",
        ambiente: "L01",
        minutos: 240
      }
    ];

    previewView.renderChips(activeLessons, { totalAulas: 1 });

    const chip = root.querySelector(".lesson-chip");
    const menuBtn = root.querySelector(".chip-menu-btn");

    chip.click();
    expect(onChipClick).toHaveBeenCalledWith(activeLessons[0], 0);

    menuBtn.click();
    expect(onChipMenuClick).toHaveBeenCalledWith(activeLessons[0], 0);

    chip.dispatchEvent(new MouseEvent("contextmenu", { cancelable: true }));
    expect(onChipContextMenu).toHaveBeenCalled();
  });

  it("deve renderizar a tabela oficial A4 com dados da turma", () => {
    const previewView = new SchedulePreviewView({ root });
    const formData = {
      nomeCurso: "Eletroeletrônica",
      codigoTurma: "EE-01",
      escola: "SENAI",
      unidadeCurricular: "Instalações",
      docente: "Prof. Teste",
      coordenador: "Coord. Teste",
      cargaHorariaTotal: 80
    };

    const calcResult = {
      vigencia: "14/04/2026 a 30/06/2026",
      semAno: "1º / 2026",
      cargaHorariaFormatada: "80 horas",
      mesesSequenciais: [
        {
          nomeMes: "Abril / 2026",
          diasTeoria: ["14", "15"],
          diasPratica: ["16", "17"],
          ambientes: ["S01", "S01", "L01", "L01"]
        }
      ]
    };

    previewView.renderOfficialTable(formData, calcResult);

    const target = root.querySelector("#cronograma-render-target");
    expect(target.innerHTML).toContain("page-a4");
    expect(target.innerHTML).toContain("Eletroeletrônica");
    expect(target.innerHTML).toContain("EE-01");
    expect(target.innerHTML).toContain("Abril / 2026");
  });
});

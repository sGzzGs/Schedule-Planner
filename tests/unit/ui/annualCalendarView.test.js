// Created at: 2026-10-19 13:45
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnnualCalendarView } from "../../../src/ui/calendario/AnnualCalendarView.js";
import { HolidayService } from "../../../src/services/holidays/HolidayService.js";

describe("AnnualCalendarView (UI Calendário)", () => {
  let root;
  let holidayService;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="calendario-root">
        <div id="tab-calendario"></div>
      </div>
    `;
    root = document.getElementById("calendario-root");
    holidayService = new HolidayService();
  });

  it("deve exibir aviso quando o HolidayService não for fornecido", () => {
    const view = new AnnualCalendarView({ root });
    view.init();
    view.render();

    expect(root.textContent).toContain("Motor de feriados não carregado");
  });

  it("deve renderizar os 12 meses do ano com cabeçalho e legendas", () => {
    const view = new AnnualCalendarView({
      root,
      holidayService,
      anoInicial: 2026,
      anoTurma: 2026
    });
    view.init();
    view.render();

    const monthCards = root.querySelectorAll(".cal-month-card");
    expect(monthCards.length).toBe(12);

    expect(root.querySelector("#cal-label-year").textContent).toBe("2026");
    expect(root.querySelector("#cal-btn-ano-turma").textContent).toContain("2026");

    // Verificar se janeiro possui dias
    const janCard = monthCards[0];
    expect(janCard.textContent).toContain("Janeiro");
    const janDays = janCard.querySelectorAll(".day-cell[data-date]");
    expect(janDays.length).toBe(31);
  });

  it("deve navegar entre anos (anterior, próximo e ano da turma)", () => {
    const onYearChange = vi.fn();
    const view = new AnnualCalendarView({
      root,
      holidayService,
      anoInicial: 2026,
      anoTurma: 2027,
      onYearChange
    });
    view.init();
    view.render();

    root.querySelector("#cal-btn-next-year").click();
    expect(view.anoExibido).toBe(2027);
    expect(onYearChange).toHaveBeenCalledWith(2027);

    root.querySelector("#cal-btn-prev-year").click();
    expect(view.anoExibido).toBe(2026);
    expect(onYearChange).toHaveBeenCalledWith(2026);

    root.querySelector("#cal-btn-ano-turma").click();
    expect(view.anoExibido).toBe(2027);
    expect(onYearChange).toHaveBeenCalledWith(2027);
  });

  it("deve acionar callbacks de customização, impressão e clique no dia", () => {
    const onOpenCustomModal = vi.fn();
    const onPrint = vi.fn();
    const onDayClick = vi.fn();

    const view = new AnnualCalendarView({
      root,
      holidayService,
      anoInicial: 2026,
      onOpenCustomModal,
      onPrint,
      onDayClick
    });
    view.init();
    view.render();

    root.querySelector("#cal-btn-custom-modal").click();
    expect(onOpenCustomModal).toHaveBeenCalled();

    root.querySelector("#cal-btn-print").click();
    expect(onPrint).toHaveBeenCalled();

    const dayBtn = root.querySelector('.day-cell[data-date="2026-01-01"]');
    expect(dayBtn).not.toBeNull();
    dayBtn.click();
    expect(onDayClick).toHaveBeenCalledWith("2026-01-01", {});
  });

  it("deve destacar visualmente aulas ativas mapeadas da turma", () => {
    const view = new AnnualCalendarView({
      root,
      holidayService,
      anoInicial: 2026
    });
    view.init();

    const aulasMap = new Map([
      ["2026-04-14", { tipo: "pratica", minutos: 240 }],
      ["2026-04-15", { tipo: "teoria", minutos: 240 }]
    ]);

    view.render(aulasMap);

    const aulaDay1 = root.querySelector('.day-cell[data-date="2026-04-14"]');
    expect(aulaDay1.style.borderBottom).toContain("solid");
    expect(aulaDay1.getAttribute("title")).toContain("pratica");
  });
});

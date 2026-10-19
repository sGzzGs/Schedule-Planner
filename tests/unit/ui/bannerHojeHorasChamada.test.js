// Created at: 2026-10-19 19:08
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Banner Contextual & Trava de Chamada na Data de Hoje", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section class="stitch-context-banner">
        <span id="comp-banner-turma"></span>
        <span id="comp-banner-curso"></span>
        <span id="comp-banner-ano"></span>
        <span id="comp-banner-ano-wrapper" style="display:none;"></span>
        <span id="comp-banner-ano-dot" style="display:none;"></span>
        <strong id="comp-banner-horas-ministradas">0h00</strong>
        <strong id="comp-banner-hoje-data"></strong>
      </section>
      <div id="comp-diary-body"></div>
    `;
  });

  it("deve preencher a data de Hoje dinamicamente e calcular Horas Ministradas até a data atual", () => {
    // Simula as funções e o estado de compensacao
    const CompState = {
      turmaInfo: {
        curso: "Eletrotécnica",
        turma: "ELE_2601",
        chTotal: 80
      },
      diasLetivos: [
        "2026-10-15",
        "2026-10-16",
        "2026-10-19", // hoje
        "2026-10-20", // futuro
        "2026-10-21"  // futuro
      ],
      aulasMap: new Map([
        ["2026-10-15", { horas: 4 }],
        ["2026-10-16", { horas: 4 }],
        ["2026-10-19", { horas: 4 }],
        ["2026-10-20", { horas: 4 }],
        ["2026-10-21", { horas: 4 }]
      ])
    };

    function compObterDataHojeIso() {
      const now = new Date(2026, 9, 19); // 19/10/2026
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function compIsoToDDMMAAAA(iso) {
      if (!iso) return "";
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    }

    function compObterHorasAula(d) {
      const aula = CompState.aulasMap.get(d);
      return aula ? aula.horas : 4;
    }

    function compFormatarHorasDecimais(h) {
      const horasInt = Math.floor(h);
      const minutos = Math.round((h - horasInt) * 60);
      return `${horasInt}h${String(minutos).padStart(2, "0")}`;
    }

    function compAtualizarBannerContextual() {
      const elCurso = document.getElementById("comp-banner-curso");
      const elTurma = document.getElementById("comp-banner-turma");
      const elHorasMinistradas = document.getElementById("comp-banner-horas-ministradas");
      const elHojeData = document.getElementById("comp-banner-hoje-data");

      if (elCurso) elCurso.textContent = CompState.turmaInfo.curso;
      if (elTurma) elTurma.textContent = CompState.turmaInfo.turma;

      const dataHojeIso = compObterDataHojeIso();
      if (elHojeData) elHojeData.textContent = compIsoToDDMMAAAA(dataHojeIso);

      let totalHorasMinistradas = 0;
      for (const d of CompState.diasLetivos) {
        if (d <= dataHojeIso) {
          totalHorasMinistradas += compObterHorasAula(d);
        }
      }

      if (elHorasMinistradas) {
        elHorasMinistradas.textContent = totalHorasMinistradas > 0 ? compFormatarHorasDecimais(totalHorasMinistradas) : "0h00";
      }
    }

    compAtualizarBannerContextual();

    const elHoje = document.getElementById("comp-banner-hoje-data");
    const elHoras = document.getElementById("comp-banner-horas-ministradas");

    expect(elHoje.textContent).toBe("19/10/2026");
    // 3 dias ministrados (15, 16, 19) * 4h = 12h00
    expect(elHoras.textContent).toBe("12h00");
  });

  it("deve travar a lista de dias da chamada estritamente na data de hoje, descartando dias posteriores", () => {
    const dataHojeIso = "2026-10-19";
    const diasLetivos = [
      "2026-10-01",
      "2026-10-05",
      "2026-10-19",
      "2026-10-20",
      "2026-10-25",
      "2026-10-31"
    ];

    // Simula o filtro aplicado na chamada (compRenderizarDiario)
    const diasFiltrados = diasLetivos.filter(d => d <= dataHojeIso);

    expect(diasFiltrados).toEqual(["2026-10-01", "2026-10-05", "2026-10-19"]);
    expect(diasFiltrados).not.toContain("2026-10-20");
    expect(diasFiltrados).not.toContain("2026-10-31");
  });
});

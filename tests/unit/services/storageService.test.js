// Created at: 2026-10-16 01:57
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function initStorageEnvironment() {
  const rootDir = path.resolve(__dirname, "../../../");
  const rawHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
  const cleanHtml = rawHtml
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  document.documentElement.innerHTML = cleanHtml;

  // Carregar holidayService
  const holidayCode = fs.readFileSync(path.join(rootDir, "js/holidayService.js"), "utf-8");
  new Function("window", "document", "localStorage", holidayCode)(window, document, localStorage);

  // Carregar app.js
  const appCode = fs.readFileSync(path.join(rootDir, "js/app.js"), "utf-8");
  new Function("window", "document", "localStorage", appCode)(window, document, localStorage);

  // Carregar compensacao.js
  const compCode = fs.readFileSync(path.join(rootDir, "js/compensacao.js"), "utf-8");
  new Function("window", "document", "localStorage", compCode)(window, document, localStorage);

  return {
    CompState: window.CompState,
    compExportarDadosCompletos: window.compExportarDadosCompletos,
    compImportarDadosCompletos: window.compImportarDadosCompletos,
    compSalvarTurmaAtualStorage: window.compSalvarTurmaAtualStorage,
    compSincronizarAbaMae: window.compSincronizarAbaMae
  };
}

describe("StorageService & Persistência de Dados (SENAI)", () => {
  let CompState;
  let compExportarDadosCompletos;
  let compImportarDadosCompletos;
  let compSalvarTurmaAtualStorage;
  let compSincronizarAbaMae;

  beforeEach(() => {
    window.localStorage.clear();
    const env = initStorageEnvironment();
    CompState = env.CompState;
    compExportarDadosCompletos = env.compExportarDadosCompletos;
    compImportarDadosCompletos = env.compImportarDadosCompletos;
    compSalvarTurmaAtualStorage = env.compSalvarTurmaAtualStorage;
    compSincronizarAbaMae = env.compSincronizarAbaMae;

    // Configurar dados de turma para teste
    CompState.turmaInfo.turma = "JAVA_2602TG";
    CompState.turmaInfo.curso = "Desenvolvimento Java";
    CompState.turmaInfo.docente = "Professor Teste";
    CompState.turmaInfo.chTotal = 80;
    CompState.alunos = ["Ana Silva", "Carlos Souza"];
    CompState.faltasPorAluno = {
      "Ana Silva": { "2026-03-02": 4 },
      "Carlos Souza": { "2026-03-02": 4, "2026-03-03": 4 }
    };
    CompState.diasLetivos = ["2026-03-02", "2026-03-03"];
  });

  describe("1. Exportação e Integridade do Payload JSON", () => {
    it("deve gerar o payload consolidado contendo turmas, faltas e configurações", () => {
      const payload = compExportarDadosCompletos();

      expect(payload).toHaveProperty("turmasCompensacao");
      expect(payload).toHaveProperty("colAlunoWidth");
      expect(payload).toHaveProperty("parecerCoordenacao");
      expect(payload).toHaveProperty("configuracoes");

      const turmaSalva = payload.turmasCompensacao["JAVA_2602TG"];
      expect(turmaSalva).toBeDefined();
      expect(turmaSalva.alunos).toEqual(["Ana Silva", "Carlos Souza"]);
      expect(turmaSalva.faltasPorAluno["Ana Silva"]).toEqual({ "2026-03-02": 4 });
    });
  });

  describe("2. Importação e Mesclagem (Merge) Sem Perda de Dados", () => {
    it("deve mesclar novas turmas no LocalStorage sem sobrescrever turmas pré-existentes", () => {
      // 1. Salvar turma inicial
      compSalvarTurmaAtualStorage();

      // 2. Importar dados de uma outra turma diferente
      const dadosImportados = {
        turmasCompensacao: {
          "PYTHON_2504NG": {
            alunos: ["Bruna Alves", "Davi Tavares"],
            faltasPorAluno: { "Bruna Alves": { "2026-04-10": 4 } },
            subViewDiario: "compensacao"
          }
        },
        parecerCoordenacao: "Parecer da Coordenação Importado",
        colAlunoWidth: 240
      };

      compImportarDadosCompletos(dadosImportados);

      // 3. Verificar se o LocalStorage contém AMBAS as turmas
      const rawBanco = window.localStorage.getItem("SENAI_COMP_TURMAS_DATA");
      const banco = JSON.parse(rawBanco);

      expect(banco["JAVA_2602TG"]).toBeDefined();
      expect(banco["PYTHON_2504NG"]).toBeDefined();
      expect(banco["PYTHON_2504NG"].alunos).toContain("Bruna Alves");
      expect(window.localStorage.getItem("SENAI_COMP_COORD_PARECER")).toBe("Parecer da Coordenação Importado");
      expect(window.localStorage.getItem("SENAI_COMP_COL_ALUNO_WIDTH")).toBe("240");
    });
  });

  describe("3. Resiliência e Sanitização de Payload", () => {
    it("não deve corromper os dados existentes se payload for nulo ou inválido", () => {
      compSalvarTurmaAtualStorage();
      const antes = window.localStorage.getItem("SENAI_COMP_TURMAS_DATA");

      compImportarDadosCompletos(null);
      compImportarDadosCompletos(undefined);
      compImportarDadosCompletos("string_invalida");

      const depois = window.localStorage.getItem("SENAI_COMP_TURMAS_DATA");
      expect(depois).toBe(antes);
    });
  });

  describe("4. Limpeza Automática de Faltas Órfãs na Alteração de Datas", () => {
    it("deve purgar faltas de datas que deixaram de ser dias letivos válidos", () => {
      // Aluno possui falta em 02/03 e em 10/03
      CompState.faltasPorAluno["Ana Silva"] = {
        "2026-03-02": 4,
        "2026-03-10": 4 // Data órfã que não existirá no novo cronograma
      };

      // Novo activeLessons contendo APENAS a aula de 02/03
      window.activeLessons = [
        { dataKey: "2026-03-02", horas: 4, minutos: 240, isInactive: false }
      ];

      // Sincronizar com a Aba Mãe
      compSincronizarAbaMae();

      // A falta de 02/03 deve ser mantida, e a de 10/03 (órfã) deve ter sido purgada
      expect(CompState.faltasPorAluno["Ana Silva"]["2026-03-02"]).toBe(4);
      expect(CompState.faltasPorAluno["Ana Silva"]["2026-03-10"]).toBeUndefined();
    });
  });
});

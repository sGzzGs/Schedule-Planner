// Created at: 2026-10-16 02:03
import { describe, it, expect, beforeEach } from "vitest";
import { appStore, AppActions } from "@state/appStore.js";

describe("state/appStore.js - Store Centralizada da Aplicação", () => {
  beforeEach(() => {
    appStore.reset();
  });

  it("deve inicializar com aba de cronograma ativa", () => {
    expect(appStore.getState().activeTab).toBe("tab-cronograma");
  });

  it("deve alternar abas de navegação", () => {
    AppActions.setActiveTab("tab-compensacao");
    expect(appStore.getState().activeTab).toBe("tab-compensacao");

    AppActions.setActiveTab("tab-calendario");
    expect(appStore.getState().activeTab).toBe("tab-calendario");
  });

  it("deve atualizar campos do formulário de cronograma", () => {
    AppActions.updateScheduleForm({
      curso: "Python Avançado",
      turma: "PY_2601",
      cargaHorariaTotal: 80
    });

    const form = appStore.getState().scheduleForm;
    expect(form.curso).toBe("Python Avançado");
    expect(form.turma).toBe("PY_2601");
    expect(form.cargaHorariaTotal).toBe(80);
    expect(form.horasPorDia).toBe("04:00"); // Preserva outros campos
  });

  it("deve gerenciar turmas, alunos e registro de faltas", () => {
    AppActions.setActiveTurma("JAVA_2601");
    expect(appStore.getState().activeTurma).toBe("JAVA_2601");

    AppActions.setTurmaAlunos("JAVA_2601", ["Aluno A", "Aluno B"]);
    const turma = appStore.getState().turmasCompensacao["JAVA_2601"];
    expect(turma.alunos).toEqual(["Aluno A", "Aluno B"]);
    expect(appStore.getState().activeStudent).toBe("Aluno A");

    // Registrar falta
    AppActions.setAlunoFalta("JAVA_2601", "Aluno A", "2026-03-02", 4);
    const faltas = appStore.getState().turmasCompensacao["JAVA_2601"].faltasPorAluno["Aluno A"];
    expect(faltas["2026-03-02"]).toBe(4);

    // Remover falta
    AppActions.setAlunoFalta("JAVA_2601", "Aluno A", "2026-03-02", 0);
    const faltasAtualizadas = appStore.getState().turmasCompensacao["JAVA_2601"].faltasPorAluno["Aluno A"];
    expect(faltasAtualizadas["2026-03-02"]).toBeUndefined();
  });

  it("deve limitar largura da coluna de alunos aos limites de segurança", () => {
    AppActions.setColAlunoWidth(50); // Abaixo do mínimo de 75
    expect(appStore.getState().colAlunoWidth).toBe(75);

    AppActions.setColAlunoWidth(500); // Acima do máximo de 450
    expect(appStore.getState().colAlunoWidth).toBe(450);

    AppActions.setColAlunoWidth(250);
    expect(appStore.getState().colAlunoWidth).toBe(250);
  });
});

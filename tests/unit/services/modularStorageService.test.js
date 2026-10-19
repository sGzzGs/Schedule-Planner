// Created at: 2026-10-16 02:14
import { describe, it, expect, beforeEach } from "vitest";
import { StorageService, STORAGE_KEYS } from "@services/storage/StorageService.js";

describe("services/storage/StorageService.js - Serviço de Persistência", () => {
  let service;
  let mockStorage;

  beforeEach(() => {
    const map = new Map();
    mockStorage = {
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
      clear: () => map.clear()
    };
    service = new StorageService(mockStorage);
  });

  it("deve gravar e recuperar dados com serialização JSON transparente", () => {
    service.set("test_key", { a: 1, b: "SENAI" });
    expect(service.get("test_key")).toEqual({ a: 1, b: "SENAI" });
  });

  it("deve retornar defaultValue caso a chave não exista", () => {
    expect(service.get("inexistente", 42)).toBe(42);
  });

  it("deve gerenciar modelos e presets de cronograma", () => {
    service.saveModel("Modelo Python", { carga: 80, docente: "Renan" });
    const models = service.getSavedModels();
    expect(models["Modelo Python"]).toBeDefined();
    expect(models["Modelo Python"].carga).toBe(80);

    service.deleteModel("Modelo Python");
    expect(service.getSavedModels()["Modelo Python"]).toBeUndefined();
  });

  it("deve gerenciar turmas e faltas", () => {
    service.saveTurmaData("JAVA_2601", {
      alunos: ["Aluno 1"],
      faltasPorAluno: { "Aluno 1": { "2026-03-02": 4 } }
    });

    const turmas = service.getTurmasData();
    expect(turmas["JAVA_2601"].alunos).toEqual(["Aluno 1"]);
    expect(turmas["JAVA_2601"].faltasPorAluno["Aluno 1"]["2026-03-02"]).toBe(4);
  });

  it("deve exportar e importar backup completo com mesclagem segura", () => {
    service.saveTurmaData("T1", { alunos: ["Ana"] });
    service.saveModel("M1", { ch: 40 });

    const backup = service.exportCompleteBackup();
    expect(backup.version).toBe("3.0");
    expect(backup.turmasCompensacao["T1"]).toBeDefined();

    // Novo serviço simulando outra máquina
    const service2 = new StorageService(new Map());
    service2.saveTurmaData("T2", { alunos: ["Carlos"] });

    // Importar backup sem sobrescrever T2
    service2.importCompleteBackup(backup);
    const turmas2 = service2.getTurmasData();
    expect(turmas2["T1"]).toBeDefined();
    expect(turmas2["T2"]).toBeDefined();
  });

  it("deve sanitizar largura de coluna dentro dos limites (75 a 450)", () => {
    service.saveColAlunoWidth(50);
    expect(service.getColAlunoWidth()).toBe(75);

    service.saveColAlunoWidth(600);
    expect(service.getColAlunoWidth()).toBe(450);

    service.saveColAlunoWidth(220);
    expect(service.getColAlunoWidth()).toBe(220);
  });
});

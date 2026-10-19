// Created at: 2026-10-16 02:01
import { describe, it, expect } from "vitest";
import {
  calculateAttendance,
  evaluateAbsenceAlert,
  classifyStudentSituation,
  purgeOrphanAbsences,
  formatHoursToHHMM
} from "@core/compensation/compensationRules.js";

describe("core/compensation/compensationRules.js - Regras Puras de Compensação", () => {
  describe("1. calculateAttendance()", () => {
    it("deve retornar 100% de frequência para 0 faltas", () => {
      const { attendancePercent, absencePercent } = calculateAttendance(80, 0);
      expect(attendancePercent).toBe(100);
      expect(absencePercent).toBe(0);
    });

    it("deve aplicar Math.floor na assiduidade institucional", () => {
      // 15h de faltas em 40h -> (40 - 15) / 40 = 62.5% -> 62%
      const { attendancePercent, absencePercent } = calculateAttendance(40, 15);
      expect(attendancePercent).toBe(62);
      expect(absencePercent).toBe(38); // Math.round(15/40*100) = 38%
    });

    it("deve limitar entre 0% e 100%", () => {
      const { attendancePercent, absencePercent } = calculateAttendance(40, 60);
      expect(attendancePercent).toBe(0);
      expect(absencePercent).toBe(100);
    });
  });

  describe("2. evaluateAbsenceAlert()", () => {
    it("deve disparar 'danger' para faltas >= 25%", () => {
      const alert = evaluateAbsenceAlert({
        absencePercent: 25,
        absencesHours: 20,
        lastPrintedAbsences: 0
      });
      expect(alert.active).toBe(true);
      expect(alert.type).toBe("danger");
      expect(alert.reason).toContain("25% da carga");
    });

    it("deve disparar 'warning' para faltas entre 10% e 24%", () => {
      const alert = evaluateAbsenceAlert({
        absencePercent: 15,
        absencesHours: 12,
        lastPrintedAbsences: 0
      });
      expect(alert.active).toBe(true);
      expect(alert.type).toBe("warning");
      expect(alert.reason).toContain("10% de faltas atingido");
    });

    it("deve disparar 'warning' para 2 faltas consecutivas mesmo com faltas < 10%", () => {
      const alert = evaluateAbsenceAlert({
        absencePercent: 5,
        absencesHours: 4,
        consecutiveAbsences: 2,
        lastPrintedAbsences: 0
      });
      expect(alert.active).toBe(true);
      expect(alert.type).toBe("warning");
      expect(alert.reason).toContain("consecutivas");
    });

    it("deve desativar se todas as faltas foram impressas", () => {
      const alert = evaluateAbsenceAlert({
        absencePercent: 25,
        absencesHours: 20,
        lastPrintedAbsences: 20
      });
      expect(alert.active).toBe(false);
      expect(alert.type).toBeNull();
    });

    it("deve respeitar override manual explícito", () => {
      expect(evaluateAbsenceAlert({ absencePercent: 25, manualState: false }).active).toBe(false);
      expect(evaluateAbsenceAlert({ absencePercent: 5, manualState: true }).active).toBe(true);
      expect(evaluateAbsenceAlert({ absencePercent: 5, manualState: true }).type).toBe("warning");
      expect(evaluateAbsenceAlert({ absencePercent: 30, manualState: true }).type).toBe("danger");
    });
  });

  describe("3. classifyStudentSituation()", () => {
    it("deve classificar frequência >= 75%", () => {
      const sit = classifyStudentSituation(85);
      expect(sit.tenderNaoCert).toBe(true);
      expect(sit.naoCert).toBe(false);
      expect(sit.naoCertExcesso).toBe(false);
    });

    it("deve classificar frequência entre 40% e 74%", () => {
      const sit = classifyStudentSituation(60);
      expect(sit.tenderNaoCert).toBe(false);
      expect(sit.naoCert).toBe(true);
      expect(sit.naoCertExcesso).toBe(false);
    });

    it("deve classificar frequência < 40%", () => {
      const sit = classifyStudentSituation(35);
      expect(sit.tenderNaoCert).toBe(false);
      expect(sit.naoCert).toBe(false);
      expect(sit.naoCertExcesso).toBe(true);
    });
  });

  describe("4. purgeOrphanAbsences()", () => {
    it("deve purgar datas que não constam na lista de dias letivos válidos", () => {
      const map = {
        "2026-03-02": 4,
        "2026-03-03": 4,
        "2026-03-10": 4 // Data órfã
      };
      const valid = ["2026-03-02", "2026-03-03"];

      const purged = purgeOrphanAbsences(map, valid);
      expect(purged).toEqual({
        "2026-03-02": 4,
        "2026-03-03": 4
      });
      expect(purged["2026-03-10"]).toBeUndefined();
    });
  });

  describe("5. formatHoursToHHMM()", () => {
    it("deve formatar horas para string HH:MM", () => {
      expect(formatHoursToHHMM(0)).toBe("00:00");
      expect(formatHoursToHHMM(4)).toBe("04:00");
      expect(formatHoursToHHMM(12.5)).toBe("12:30");
      expect(formatHoursToHHMM(80)).toBe("80:00");
    });
  });
});

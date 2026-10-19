// Created at: 2026-10-19 14:19
/**
 * @fileoverview Base canônica institucional de feriados, emendas e eventos do SENAI (2026-2027).
 */

export const HOLIDAY_LEGENDS = [
  { id: "feriado", nome: "Feriados", cor: "#FF0000", cor_tema: "#FF0000", bloqueia_aula: true },
  { id: "emenda", nome: "Emenda de Feriado", cor: "#FFC000", cor_tema: "#FFC000", bloqueia_aula: true },
  { id: "ponto_facultativo", nome: "Ponto Facultativo", cor: "#808080", cor_tema: "#808080", bloqueia_aula: true },
  { id: "formatura", nome: "Formatura CAI/CT", cor: "#00B050", cor_tema: "#00B050", bloqueia_aula: true },
  { id: "ferias_fic", nome: "Férias FIC", cor: "#FFFF00", cor_tema: "#FFFF00", bloqueia_aula: true },
  { id: "a_decidir", nome: "A Decidir", cor: "#00B0F0", cor_tema: "#00B0F0", bloqueia_aula: true }
];

export const BASE_YEARS = {
  "2026": [
    { data: "2026-01-01", descricao: "Confraternização Universal", categoria_id: "feriado" },
    { data: "2026-01-25", descricao: "Aniversário de São Paulo", categoria_id: "feriado" },
    { data: "2026-02-14", descricao: "Sábado de Carnaval", categoria_id: "ponto_facultativo" },
    { data: "2026-02-16", descricao: "Segunda de Carnaval", categoria_id: "ponto_facultativo" },
    { data: "2026-02-17", descricao: "Terça de Carnaval", categoria_id: "feriado" },
    { data: "2026-04-03", descricao: "Sexta-feira Santa/Paixão", categoria_id: "feriado" },
    { data: "2026-04-04", descricao: "Emenda de feriado Sexta-feira Santa/Paixão - Sábado de Aleluia", categoria_id: "emenda" },
    { data: "2026-04-20", descricao: "Emenda de feriado - Tiradentes", categoria_id: "emenda" },
    { data: "2026-04-21", descricao: "Tiradentes", categoria_id: "feriado" },
    { data: "2026-05-01", descricao: "Dia do Trabalho", categoria_id: "feriado" },
    { data: "2026-06-04", descricao: "Corpus Christi", categoria_id: "feriado" },
    { data: "2026-06-05", descricao: "Emenda de feriado - Corpus Christi", categoria_id: "emenda" },
    { data: "2026-06-06", descricao: "Emenda de feriado - Corpus Christi", categoria_id: "emenda" },
    { data: "2026-06-24", descricao: "Formatura CAI", categoria_id: "formatura" },
    { data: "2026-07-09", descricao: "Revolução Constitucionalista de 1932", categoria_id: "feriado" },
    { data: "2026-07-10", descricao: "Emenda de feriado - Ver. Const. de 1932", categoria_id: "emenda" },
    { data: "2026-07-11", descricao: "Emenda de feriado - Ver. Const. de 1932", categoria_id: "emenda" },
    { data: "2026-09-07", descricao: "Independência", categoria_id: "feriado" },
    { data: "2026-10-12", descricao: "Padroeira do Brasil", categoria_id: "feriado" },
    { data: "2026-10-13", descricao: "Dia dos Professores - Antecipado", categoria_id: "ponto_facultativo" },
    { data: "2026-11-02", descricao: "Dia de Finados.", categoria_id: "feriado" },
    { data: "2026-11-15", descricao: "Proclamação da República", categoria_id: "feriado" },
    { data: "2026-11-20", descricao: "Consciência Negra", categoria_id: "feriado" },
    { data: "2026-12-21", descricao: "Formatura CAI", categoria_id: "formatura" },
    { data: "2026-12-22", descricao: "Confraternização Escolar", categoria_id: "ponto_facultativo" },
    { data: "2026-12-25", descricao: "Natal", categoria_id: "feriado" },
    { data: "2026-12-31", descricao: "Véspera de Ano Novo", categoria_id: "ponto_facultativo" }
  ],
  "2027": [
    { data: "2027-01-01", descricao: "Confratenização Universal", categoria_id: "feriado" },
    { data: "2027-01-25", descricao: "Aniversário de São Paulo", categoria_id: "feriado" },
    { data: "2027-02-06", descricao: "Sábado de Carnaval", categoria_id: "ponto_facultativo" },
    { data: "2027-02-08", descricao: "Segunda de Carnaval", categoria_id: "ponto_facultativo" },
    { data: "2027-02-09", descricao: "Terça de Carnaval", categoria_id: "feriado" },
    { data: "2027-03-26", descricao: "Sexta-feira Santa/Paixão", categoria_id: "feriado" },
    { data: "2027-04-04", descricao: "Emenda de feriado Sexta-feira Santa/Paixão - Sábado de Aleluia", categoria_id: "emenda" },
    { data: "2027-04-20", descricao: "Emenda de feriado - Tiradentes", categoria_id: "emenda" },
    { data: "2027-04-21", descricao: "Tiradentes", categoria_id: "feriado" },
    { data: "2027-05-01", descricao: "Dia do Trabalho", categoria_id: "feriado" },
    { data: "2027-05-27", descricao: "Corpus Christi", categoria_id: "feriado" },
    { data: "2027-06-05", descricao: "Emenda de feriado - Corpus Christi", categoria_id: "emenda" },
    { data: "2027-06-06", descricao: "Emenda de feriado - Corpus Christi", categoria_id: "emenda" },
    { data: "2027-06-24", descricao: "Formatura CAI", categoria_id: "formatura" },
    { data: "2027-07-09", descricao: "Revolução Constitucionalista de 1932", categoria_id: "feriado" },
    { data: "2027-07-10", descricao: "Emenda de feriado - Ver. Const. de 1932", categoria_id: "emenda" },
    { data: "2027-07-11", descricao: "Emenda de feriado - Ver. Const. de 1932", categoria_id: "emenda" },
    { data: "2027-09-07", descricao: "Independência", categoria_id: "feriado" },
    { data: "2027-10-12", descricao: "Padroeira do Brasil", categoria_id: "feriado" },
    { data: "2027-10-13", descricao: "Dia dos Professores - Antecipado", categoria_id: "ponto_facultativo" },
    { data: "2027-11-02", descricao: "Dia de Finados.", categoria_id: "feriado" },
    { data: "2027-11-15", descricao: "Proclamação da República", categoria_id: "feriado" },
    { data: "2027-11-20", descricao: "Consciência Negra", categoria_id: "feriado" },
    { data: "2027-12-21", descricao: "Formatura CAI", categoria_id: "formatura" },
    { data: "2027-12-22", descricao: "Confraternização Escolar", categoria_id: "ponto_facultativo" },
    { data: "2027-12-25", descricao: "Natal", categoria_id: "feriado" },
    { data: "2027-12-31", descricao: "Véspera de Ano Novo", categoria_id: "ponto_facultativo" }
  ]
};

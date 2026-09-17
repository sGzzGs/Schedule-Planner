# Plano de Ação e Especificação Técnica: Gerador de Cronograma SENAI FR-1.02-66A

## 1. Visão Geral do Projeto
Desenvolvimento de uma aplicação web moderna (HTML5, Vanilla CSS3 e JavaScript ES6+) para automatizar o planejamento e a emissão de cronogramas de aulas no modelo oficial **SENAI FR-1.02-66A**. O sistema processa regras de calendário institucional (`Feriados.json`), filtra dias da semana e semanas pares/ímpares conforme o padrão demonstrado em `ExemploExcel.png`, abate a carga horária de forma determinística e gera uma folha de impressão A4 com fidelidade visual aos gabaritos oficiais.

---

## 2. Análise de Dados e Regras de Negócio (Motor de Cálculo)

### 2.1. Interpretação da Base de Datas (`Feriados.json`)
A base de calendário contém duas estruturas fundamentais:
1. **`feriados`**: Lista pontual de datas com atributos `{ data: "YYYY-MM-DD", descricao: "...", tipo: "feriado" | "recesso" | "emenda" | "evento_interno" }`.
2. **`periodosFerias`**: Intervalos de recesso/férias com `{ descricao: "...", inicio: "YYYY-MM-DD", fim: "YYYY-MM-DD" }`.

**Estratégia de Indexação em Memória:**
- As datas pontuais serão mapeadas em uma tabela hash (`Map<string, HolidayEvent>`) para busca $O(1)$ por chave no formato `YYYY-MM-DD`.
- Os períodos de férias serão expandidos em chaves diárias (`tipo: "ferias"`), marcando cada dia contido no intervalo `[inicio, fim]`.
- **Dias Não Letivos Institucionais**: Qualquer data registrada como `feriado`, `recesso`, `emenda`, `evento_interno` ou `ferias` será bloqueada para aulas regulares, exceto se configurado evento especial.

### 2.2. Algoritmo de Iteração, Abatimento de Carga Horária e Dedução de Campos

```mermaid
flowchart TD
    A([Início: Entradas do Usuário]) --> B[Carregar e Indexar Feriados.json]
    B --> C[Inicializar: dataAtual = dataInicio, horasRestantes = CH_Total, aulas = []]
    C --> D{horasRestantes > 0?}
    D -- Não --> M[Calcular Resumos Finais]
    D -- Sim --> E{dataAtual é Domingo?}
    E -- Sim --> K[Avançar dataAtual +1 dia]
    E -- Não --> F{Dia da Semana Selecionado?}
    F -- Não --> K
    F -- Sim --> G{Regra de Semana Atendida?}
    G -- Não --> K
    G -- Sim --> H{Data está em Feriado/Férias/Recesso?}
    H -- Sim --> K
    H -- Não --> I[Alocar Aula: horas = min\\(horasPorDia, horasRestantes\\)]
    I --> J[horasRestantes -= horas; Salvar registro na lista 'aulas']
    J --> K
    K --> D
    M --> N[Deduzir Vigência: dataInicio a dataTermino]
    N --> O[Deduzir Sem/Ano e Horas Mensais]
    O --> P([Renderizar Grade A4 e Atualizar UI])
```

#### Regras do Algoritmo:
1. **Validação de Dias da Semana:**
   - O usuário seleciona os dias da semana de aula (ex: Segundas, Quartas e Sextas; ou Terças e Quintas; ou Sábados).
   - Validação via `date.getDay()` (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb).
2. **Regras de Frequência Semanal (do `ExemploExcel.png`):**
   - **Todas as semanas:** Sem restrição adicional.
   - **Semanas Pares / Semanas Ímpares:** Calculado pelo número da semana no ano (padrão ISO 8601: `getISOWeek(date) % 2 === 0` ou `=== 1`), permitindo suporte a turmas quinzenais de sábados ou rodízios.
3. **Abatimento da Carga Horária:**
   - A cada dia letivo válido, abate-se o valor de `horasPorDia` (ex: 4h/aula).
   - Se `horasRestantes < horasPorDia`, a última aula abate apenas o saldo residual restante.
   - A data da última aula alocada define o campo oficial `dataTermino`.
4. **Dedução Automática de `Vigência` e `Sem/Ano`:**
   - **`Vigência`**: Gerada no formato `"DD/MM/AAAA a DD/MM/AAAA"` (ex: `02/02/2026 a 27/04/2026`).
   - **`Sem/Ano`**: Deduzido a partir da data de início e término:
     - Se o curso inicia e termina até julho: `1º Semestre / {Ano}` (ex: `1º Sem/2026`).
     - Se inicia a partir de julho: `2º Semestre / {Ano}` (ex: `2º Sem/2026`).
     - Se cruza semestres: `1º e 2º Sem / {Ano}`.
   - Suporte adicional à leitura do código da turma (ex: `FUPYTHON_2602NG` -> ano 2026, semestre 1 ou 2).

---

## 3. Arquitetura da Aplicação

### 3.1. Estrutura de Arquivos do Projeto
```
Site_JS_Cronograma_A/
├── index.html                  # Interface principal (Split-screen: Formulário + Preview A4)
├── css/
│   ├── style.css               # Design System da aplicação, formulários, painéis e tema
│   ├── cronograma-a4.css       # Geometria e estilos visuais rígidos do modelo A4 FR-1.02-66A
│   └── print.css               # Regras @media print para saída vetorial nativa e limpa
├── js/
│   ├── app.js                  # Ponto de entrada, escutas de eventos e inicialização
│   ├── holidayService.js       # Carregador e analisador do Feriados.json
│   ├── scheduleEngine.js       # Motor matemático de cálculo de datas e abatimento de horas
│   ├── templateRenderer.js     # Renderizador do cabeçalho, grade mensal e legendas
│   ├── pdfExport.js            # Orquestrador de exportação PDF e impressão vetorial
│   └── state.js                # Gerenciamento reativo de estado e persistência (localStorage)
├── Feriados.json               # Base de feriados, emendas e recessos
└── ExemploExcel.png            # Referência visual de regras de negócio
```

### 3.2. Stack e Tecnologias
- **Frontend Core**: Vanilla JavaScript (ES6+ Modules), HTML5 semântico, Vanilla CSS3 (CSS Grid, Flexbox, Custom Properties).
- **Abordagem de Exportação PDF:**
  - **Exportação Primária (Padrão Ouro Vetorial):** `window.print()` estilizado com `@page { size: A4 portrait; margin: 8mm; }` e `@media print`. Garante tipografia 100% nítida, texto pesquisável e selecionável, tabelas com linhas precisas e zero distorção visual.
  - **Exportação Direta em Arquivo:** Integração com `html2pdf.js` / `jsPDF` configurado com alta resolução (`scale: 3`, `useCORS: true`) para permitir download imediato com 1 clique (ex: `Cronograma_FUPYTHON_2602NG.pdf`).
- **Persistência de Dados**: `localStorage` para manter os dados preenchidos pelo professor/coordenador entre sessões.

---

## 4. Mapeamento de Interface e Layout (SENAI FR-1.02-66A)

### 4.1. Divisão Visual da Tela (Split-Screen Interativo)
- **Painel Esquerdo (Controles e Formulário - 380px a 420px):**
  - Barra lateral com scroll independente, campos organizados em seções colapsáveis:
    1. *Identificação da Turma*: Curso, Código da Turma, Docente, Unidade Escolar, Ambiente Pedagógico.
    2. *Horários e Carga Horária*: Data de Início, Carga Horária Total (com chips rápidos: 20h, 40h, 60h, 80h, 120h, 160h), Horas/Dia, Turno (Manhã, Tarde, Noite, Sábado), Horário (ex: 18:45 às 22:45).
    3. *Frequência Semanal*: Botões de alternância para dias da semana (Seg, Ter, Qua, Qui, Sex, Sáb) e seletor de regra (Todas as semanas, Semanas Pares, Semanas Ímpares).
    4. *Proporção Teoria / Prática*: Divisão percentual ou em horas.
    5. *Ações*: Botão `Exportar PDF`, `Imprimir`, `Salvar como Padrão` e `Carregar Exemplo`.
- **Painel Direito (Viewport de Pré-visualização A4):**
  - Fundo neutro com folha A4 centralizada, sombra realista de papel e controles de zoom (50%, 75%, 100%, Ajustar à Tela).
  - Atualização instantânea a cada dígito ou clique do formulário.

### 4.2. Mapeamento de Células do Formulário para a Folha FR-1.02-66A

| Seção no Modelo FR-1.02-66A | Campo do Formulário / Origem | Exemplo de Valor Preenchido |
| :--- | :--- | :--- |
| **Cabeçalho - Instituição** | Institucional fixo / editável | `SENAI-SP - Escola SENAI "Sérgio Siqueira de Carvalho"` |
| **Cabeçalho - Código** | Identificador padrão | `CRONOGRAMA DE AULAS - FR-1.02-66A` |
| **Cabeçalho - Curso** | `input#nomeCurso` | `Fundamentos do Python 1` |
| **Cabeçalho - Turma** | `input#codigoTurma` | `FUPYTHON_2602NG` |
| **Cabeçalho - Docente** | `input#docente` | `Nome do Instrutor` |
| **Cabeçalho - Turno / Horário** | `select#turno` + `input#horario` | `Noite (18:45 às 22:45)` |
| **Cabeçalho - Carga Horária** | `input#cargaHorariaTotal` | `40 h` |
| **Cabeçalho - Vigência** | **Calculado pelo Motor** | `02/02/2026 a 27/04/2026` |
| **Cabeçalho - Sem/Ano** | **Calculado pelo Motor** | `1º Sem/2026` |
| **Cabeçalho - Ambiente** | `input#ambiente` | `Lab. Informática 03` |
| **Grade de Meses (Calendários)** | **Gerado dinamicamente** | Meses do período com dias `D S T Q Q S S` |
| ↳ *Dias Letivos (Aulas)* | Marcados pelo motor com nº de aula | Célula destacada com número de horas |
| ↳ *Feriados / Recessos* | Originados do `Feriados.json` | Célula sombreada em cinza |
| ↳ *Férias Escolares* | Originadas do `Feriados.json` | Célula destacada em amarelo |
| ↳ *Legenda de cada Mês* | Extraído do `Feriados.json` | Ex: `01/mai-> Dia do Trabalho` |
| **Rodapé - Totais de Horas** | Soma das aulas Teoria e Prática | Teoria: `16 h` \| Prática: `24 h` \| Total: `40 h` |
| **Rodapé - Assinaturas** | Bloco de Assinatura Formal | `Docente` e `Coordenação Técnica / Direção` |

---

## 5. Etapas Sequenciais de Implementação

1. **Etapa 1: Estruturação dos Módulos JS e Motor de Regras**
   - Configuração de `holidayService.js` para consumir `Feriados.json`.
   - Implementação de `scheduleEngine.js` com o algoritmo completo de cálculo de dias letivos, validação de paridade de semanas, abatimento de carga horária e dedução de `Vigência` e `Sem/Ano`.
2. **Etapa 2: Desenvolvimento do Template Visual A4 (FR-1.02-66A)**
   - Criação de `cronograma-a4.css` e `print.css` com dimensões métricas milimétricas rigorosas para formato A4.
   - Construção dos componentes de grade de calendário mensal idênticos ao `ExemploExcel.png` e às amostras em PDF.
3. **Etapa 3: Interface do Usuário e Painel de Controle**
   - Construção de `index.html` com layout dividido (sidebar de controles modernos + canvas de visualização).
   - Implementação da reatividade em tempo real (`app.js` e `state.js`).
4. **Etapa 4: Motor de Exportação e Impressão PDF**
   - Configuração de `@media print` para saída vetorial perfeita e integração de biblioteca para download direto de PDF.
5. **Etapa 5: Validação com Casos Reais e Ajustes Finos**
   - Teste e validação com os cursos exemplo (`FUPYTHON_2602NG`, `JAVA_2602TG`, `PYTHONFW_2601NG`, `GOOANTIG_2604NGv2`).
   - Verificação de quebras de página, legibilidade e fidelidade visual.

---

## 6. Plano de Verificação

### Verificação Automatizada e Manual
- **Teste de Cálculo 1 (Turma Noturna 2ª e 4ª feira):** Início em 02/02/2026, 40h totais, 4h/dia -> Verificar se salta Carnaval (16 e 17/fev) e Tiradentes (20 e 21/abr) e deduz a data final exata.
- **Teste de Cálculo 2 (Turma de Sábados):** Sábados quinzenais (semanas pares ou ímpares) -> Verificar se respeita o intervalo e salta o Sábado de Carnaval (14/fev) e Sábado de Aleluia (04/abr).
- **Teste de Layout e Impressão:** Visualização no navegador e teste de geração de PDF com folha A4 sem cortes ou sobreposições.

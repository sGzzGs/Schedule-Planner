-- ============================================================================
-- SENAI HUB DE REGISTROS • SCHEMA OFICIAL DE GOVERNANÇA E AUTENTICAÇÃO
-- Executar no SQL Editor do Supabase (https://eenkqrlmhdbqdyuhmzjw.supabase.co)
-- ============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de NIFs Autorizados (Códigos SN cadastrados pela Coordenação)
CREATE TABLE IF NOT EXISTS public.nifs_autorizados (
    nif TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria TEXT DEFAULT 'Docente Horista',
    unidade TEXT DEFAULT 'SENAI Humberto Reis Costa',
    autorizado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    utilizado BOOLEAN DEFAULT FALSE,
    utilizado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Perfis de Usuários (Docentes e Coordenação)
CREATE TABLE IF NOT EXISTS public.perfis_usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nif TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('coordenacao', 'docente')),
    unidade TEXT DEFAULT 'SENAI Humberto Reis Costa',
    senha_provisoria BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Solicitações de Redefinição de Senha
CREATE TABLE IF NOT EXISTS public.solicitacoes_reset (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nif TEXT NOT NULL,
    nome TEXT NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
    solicitada_em TIMESTAMPTZ DEFAULT NOW(),
    aprovada_em TIMESTAMPTZ,
    aprovada_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 5. Tabela de Turmas do Docente
CREATE TABLE IF NOT EXISTS public.turmas_docente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    codigo_turma TEXT NOT NULL,
    nome_curso TEXT NOT NULL,
    unidade_curricular TEXT,
    dados JSONB DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Alunos e Governança de Frequência / Evasão
CREATE TABLE IF NOT EXISTS public.alunos_governanca (
    id TEXT PRIMARY KEY, -- ex: "DES-2602TG_mat-982341"
    turma_id UUID REFERENCES public.turmas_docente(id) ON DELETE CASCADE,
    codigo_turma TEXT NOT NULL,
    docente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_discente TEXT NOT NULL,
    matricula TEXT NOT NULL,
    nif_discente TEXT,
    total_aulas INT DEFAULT 0,
    total_faltas INT DEFAULT 0,
    horas_faltadas INT DEFAULT 0,
    carga_total INT DEFAULT 320,
    perc_faltas NUMERIC(5,2) DEFAULT 0.00,
    
    -- Duplo Alerta de Impressão / Atesto
    faltas_ultima_impressao_docente INT DEFAULT 0,
    data_impressao_docente TIMESTAMPTZ,
    atestado_coordenacao BOOLEAN DEFAULT FALSE,
    data_atestado_coordenacao TIMESTAMPTZ,
    
    -- Fluxo de Evasão Escolar
    status_evasao TEXT DEFAULT 'ativo' CHECK (status_evasao IN ('ativo', 'recomendada_coordenacao', 'evadido')),
    motivo_evasao TEXT,
    recomendada_em TIMESTAMPTZ,
    recomendada_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    aceita_docente_em TIMESTAMPTZ,
    
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PRIVILÉGIOS DE SCHEMA E TABELAS PARA ROLES DO SUPABASE (anon, authenticated)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.nifs_autorizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_reset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas_docente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos_governanca ENABLE ROW LEVEL SECURITY;

-- Helper function: verifica se o usuário autenticado é da Coordenação
CREATE OR REPLACE FUNCTION public.is_coordenador()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE id = auth.uid() AND role = 'coordenacao'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies: nifs_autorizados
DROP POLICY IF EXISTS "Leitura de NIFs autorizados" ON public.nifs_autorizados;
CREATE POLICY "Leitura de NIFs autorizados" ON public.nifs_autorizados
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Coordenação gerencia NIFs autorizados" ON public.nifs_autorizados;
CREATE POLICY "Coordenação gerencia NIFs autorizados" ON public.nifs_autorizados
    FOR ALL TO authenticated USING (public.is_coordenador());

-- Policies: perfis_usuarios
DROP POLICY IF EXISTS "Leitura de perfis de usuário" ON public.perfis_usuarios;
CREATE POLICY "Leitura de perfis de usuário" ON public.perfis_usuarios
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuário edita próprio perfil" ON public.perfis_usuarios;
CREATE POLICY "Usuário edita próprio perfil" ON public.perfis_usuarios
    FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Inserção de perfil autenticado" ON public.perfis_usuarios;
CREATE POLICY "Inserção de perfil autenticado" ON public.perfis_usuarios
    FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Policies: solicitacoes_reset
DROP POLICY IF EXISTS "Qualquer um pode solicitar reset" ON public.solicitacoes_reset;
CREATE POLICY "Qualquer um pode solicitar reset" ON public.solicitacoes_reset
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Coordenação visualiza e aprova resets" ON public.solicitacoes_reset;
CREATE POLICY "Coordenação visualiza e aprova resets" ON public.solicitacoes_reset
    FOR ALL TO authenticated USING (public.is_coordenador() OR nif = (SELECT nif FROM public.perfis_usuarios WHERE id = auth.uid()));

-- Policies: turmas_docente
DROP POLICY IF EXISTS "Docente acessa suas turmas e Coordenação audita todas" ON public.turmas_docente;
CREATE POLICY "Docente acessa suas turmas e Coordenação audita todas" ON public.turmas_docente
    FOR SELECT TO authenticated USING (docente_id = auth.uid() OR public.is_coordenador());

DROP POLICY IF EXISTS "Docente insere e atualiza apenas suas turmas" ON public.turmas_docente;
CREATE POLICY "Docente insere e atualiza apenas suas turmas" ON public.turmas_docente
    FOR ALL TO authenticated USING (docente_id = auth.uid());

-- Policies: alunos_governanca
DROP POLICY IF EXISTS "Docente acessa seus alunos e Coordenação tem visão global" ON public.alunos_governanca;
CREATE POLICY "Docente acessa seus alunos e Coordenação tem visão global" ON public.alunos_governanca
    FOR SELECT TO authenticated USING (docente_id = auth.uid() OR public.is_coordenador());

DROP POLICY IF EXISTS "Docente atualiza seus alunos" ON public.alunos_governanca;
CREATE POLICY "Docente atualiza seus alunos" ON public.alunos_governanca
    FOR ALL TO authenticated USING (docente_id = auth.uid());

DROP POLICY IF EXISTS "Coordenação pode registrar recomendação e atesto" ON public.alunos_governanca;
CREATE POLICY "Coordenação pode registrar recomendação e atesto" ON public.alunos_governanca
    FOR UPDATE TO authenticated USING (public.is_coordenador())
    WITH CHECK (public.is_coordenador());

-- ============================================================================
-- DADOS INICIAIS (SEED)
-- ============================================================================

-- 1. Perfil oficial da Coordenação (login: carlos / cafe15)
-- O UUID 'ee2764b6-5f64-4947-b40a-aee3604b144c' é o ID gerado pelo Supabase Auth para carlos@senai.hub
INSERT INTO public.perfis_usuarios (id, nif, nome, role, unidade)
VALUES 
    ('ee2764b6-5f64-4947-b40a-aee3604b144c', 'carlos', 'Carlos Henrique (Coordenação)', 'coordenacao', 'SENAI Humberto Reis Costa')
ON CONFLICT (id) DO UPDATE SET role = 'coordenacao';

-- 2. Inserir NIFs de exemplo para os docentes do SENAI
INSERT INTO public.nifs_autorizados (nif, nome, categoria, unidade)
VALUES 
    ('491201', 'Prof. Leonardo Matos', 'Docente Horista', 'SENAI Humberto Reis Costa'),
    ('381022', 'Profª. Helena Albuquerque', 'Docente Mensalista', 'SENAI Humberto Reis Costa'),
    ('294813', 'Prof. Carlos Júnior', 'Docente Horista', 'SENAI Humberto Reis Costa'),
    ('771034', 'Prof. Marcos Vinícius', 'Docente Mensalista', 'SENAI Humberto Reis Costa'),
    ('992015', 'Profª. Carla Silveira', 'Docente Horista', 'SENAI Humberto Reis Costa')
ON CONFLICT (nif) DO NOTHING;

-- 3. Inserir Solicitações de Redefinição Pendentes para visualização inicial da Coordenação
INSERT INTO public.solicitacoes_reset (nif, nome, status, solicitada_em)
VALUES
    ('491201', 'Prof. Leonardo Matos', 'pendente', NOW() - INTERVAL '1 hour'),
    ('381022', 'Profª. Helena Albuquerque', 'pendente', NOW() - INTERVAL '3 hours'),
    ('771034', 'Prof. Marcos Vinícius', 'pendente', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ============================================
-- SCHEMA COMPLETO - PARTNERS ONBOARDING
-- ============================================

-- 1. CRIAR ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('colaborador', 'gestor', 'admin');
CREATE TYPE trail_type AS ENUM ('obrigatoria_global', 'obrigatoria_area', 'optativa');
CREATE TYPE module_type AS ENUM ('video', 'document', 'quiz');
CREATE TYPE notification_type AS ENUM ('atraso', 'nova_trilha', 'certificado');

-- 2. CRIAR TABELAS
-- ============================================

-- Tabela: areas
CREATE TABLE areas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    abbreviation text,
    color text,
    created_at timestamptz DEFAULT now()
);

-- Tabela: users
CREATE TABLE users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    name text NOT NULL,
    area_id uuid REFERENCES areas(id),
    role user_role NOT NULL DEFAULT 'colaborador',
    avatar_url text,
    created_at timestamptz DEFAULT now()
);

-- Tabela: trails
CREATE TABLE trails (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    type trail_type NOT NULL,
    area_id uuid REFERENCES areas(id),
    created_by uuid REFERENCES users(id),
    duration integer DEFAULT 0,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT trails_area_type_check CHECK (
        (type = 'obrigatoria_area' AND area_id IS NOT NULL) OR 
        (type IN ('obrigatoria_global', 'optativa') AND area_id IS NULL)
    )
);

-- Tabela: modules
CREATE TABLE modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trail_id uuid REFERENCES trails(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    type module_type NOT NULL,
    content_url text,
    duration integer DEFAULT 0,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Tabela: user_progress
CREATE TABLE user_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
    completed boolean DEFAULT false,
    score decimal,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, module_id)
);

-- Tabela: quiz_questions
CREATE TABLE quiz_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
    question text NOT NULL,
    options jsonb NOT NULL,
    correct_answer integer NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Tabela: certificates
CREATE TABLE certificates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    trail_id uuid REFERENCES trails(id) ON DELETE CASCADE NOT NULL,
    issued_at timestamptz DEFAULT now(),
    UNIQUE(user_id, trail_id)
);

-- Tabela: notifications
CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 3. HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR RLS POLICIES
-- ============================================

-- POLICIES: areas
-- Todos autenticados podem ler áreas
CREATE POLICY "areas_select_all" ON areas
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- POLICIES: trails
-- SELECT: filtro de visibilidade baseado no tipo
CREATE POLICY "trails_select_visible" ON trails
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            type = 'obrigatoria_global' OR
            type = 'optativa' OR
            (type = 'obrigatoria_area' AND area_id = (SELECT area_id FROM users WHERE id = auth.uid()))
        )
    );

-- INSERT/UPDATE/DELETE: admin qualquer, gestor só da área dele
CREATE POLICY "trails_insert_admin" ON trails
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "trails_insert_gestor" ON trails
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) = 'gestor' AND
        area_id = (SELECT area_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "trails_update_admin" ON trails
    FOR UPDATE
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "trails_update_gestor" ON trails
    FOR UPDATE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'gestor' AND
        area_id = (SELECT area_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "trails_delete_admin" ON trails
    FOR DELETE
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "trails_delete_gestor" ON trails
    FOR DELETE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'gestor' AND
        area_id = (SELECT area_id FROM users WHERE id = auth.uid())
    );

-- POLICIES: modules
-- SELECT: todos autenticados
CREATE POLICY "modules_select_all" ON modules
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE: admin qualquer, gestor só da área da trilha
CREATE POLICY "modules_insert_admin" ON modules
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "modules_insert_gestor" ON modules
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) = 'gestor' AND
        (SELECT area_id FROM trails WHERE id = trail_id) = (SELECT area_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "modules_update_admin" ON modules
    FOR UPDATE
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "modules_update_gestor" ON modules
    FOR UPDATE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'gestor' AND
        (SELECT area_id FROM trails WHERE id = trail_id) = (SELECT area_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "modules_delete_admin" ON modules
    FOR DELETE
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "modules_delete_gestor" ON modules
    FOR DELETE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'gestor' AND
        (SELECT area_id FROM trails WHERE id = trail_id) = (SELECT area_id FROM users WHERE id = auth.uid())
    );

-- POLICIES: user_progress
-- SELECT: colaborador próprio, gestor da área, admin todos
CREATE POLICY "user_progress_select_own" ON user_progress
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "user_progress_select_gestor" ON user_progress
    FOR SELECT
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'gestor' AND
        user_id IN (SELECT id FROM users WHERE area_id = (SELECT area_id FROM users WHERE id = auth.uid()))
    );

CREATE POLICY "user_progress_select_admin" ON user_progress
    FOR SELECT
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- INSERT/UPDATE: cada um só escreve o próprio
CREATE POLICY "user_progress_insert_own" ON user_progress
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_progress_update_own" ON user_progress
    FOR UPDATE
    USING (user_id = auth.uid());

-- POLICIES: quiz_questions
-- SELECT: todos autenticados (correct_answer não será exposto no client)
CREATE POLICY "quiz_questions_select_all" ON quiz_questions
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE: admin qualquer, gestor da área da trilha
CREATE POLICY "quiz_questions_insert_admin" ON quiz_questions
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "quiz_questions_insert_gestor" ON quiz_questions
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) = 'gestor' AND
        (SELECT area_id FROM trails WHERE id = (SELECT trail_id FROM modules WHERE id = module_id)) = 
        (SELECT area_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "quiz_questions_update_admin" ON quiz_questions
    FOR UPDATE
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "quiz_questions_update_gestor" ON quiz_questions
    FOR UPDATE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'gestor' AND
        (SELECT area_id FROM trails WHERE id = (SELECT trail_id FROM modules WHERE id = module_id)) = 
        (SELECT area_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "quiz_questions_delete_admin" ON quiz_questions
    FOR DELETE
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "quiz_questions_delete_gestor" ON quiz_questions
    FOR DELETE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'gestor' AND
        (SELECT area_id FROM trails WHERE id = (SELECT trail_id FROM modules WHERE id = module_id)) = 
        (SELECT area_id FROM users WHERE id = auth.uid())
    );

-- POLICIES: certificates
-- SELECT: próprio ou admin
CREATE POLICY "certificates_select_own" ON certificates
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "certificates_select_admin" ON certificates
    FOR SELECT
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- INSERT: só admin
CREATE POLICY "certificates_insert_admin" ON certificates
    FOR INSERT
    WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- POLICIES: notifications
-- SELECT/UPDATE: próprio
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- POLICIES: users
-- SELECT: usuário pode ler seu próprio registro
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    USING (id = auth.uid());

-- SELECT: colaborador todos (dados básicos), gestor área dele, admin todos
CREATE POLICY "users_select_colaborador" ON users
    FOR SELECT
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'colaborador'
    );

CREATE POLICY "users_select_gestor" ON users
    FOR SELECT
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'gestor' AND
        area_id = (SELECT area_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "users_select_admin" ON users
    FOR SELECT
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- UPDATE: só admin
CREATE POLICY "users_update_admin" ON users
    FOR UPDATE
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- 5. CRIAR INDEXES
-- ============================================

CREATE INDEX idx_users_area_id ON users(area_id);
CREATE INDEX idx_trails_type_area_id ON trails(type, area_id);
CREATE INDEX idx_modules_trail_id_sort ON modules(trail_id, sort_order);
CREATE INDEX idx_user_progress_user_module ON user_progress(user_id, module_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_certificates_user_id ON certificates(user_id);

-- 6. SEED DATA
-- ============================================

INSERT INTO areas (name, abbreviation, color) VALUES
    ('Comercial', 'COM', '#3B82F6'),
    ('Operações', 'OP', '#10B981'),
    ('RH', 'RH', '#991D7D'),
    ('TI', 'TI', '#E8580C');

-- ============================================
-- FIM DO SCRIPT
-- ============================================

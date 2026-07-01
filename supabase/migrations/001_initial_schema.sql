-- ============================================================
-- PlayGroup — Schema inicial + RLS
-- Execute no Supabase SQL Editor ou via CLI: supabase db push
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABELAS
-- ────────────────────────────────────────────────────────────

-- Perfis de usuário (estende auth.users do Supabase)
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  nickname      TEXT NOT NULL,
  avatar_url    TEXT,
  city          TEXT,
  bio           TEXT,
  sports        TEXT[]      DEFAULT '{}',
  skill_level   TEXT        NOT NULL DEFAULT 'intermediate'
                              CHECK (skill_level IN ('beginner','intermediate','advanced','professional')),
  is_guest      BOOLEAN     NOT NULL DEFAULT FALSE,
  push_token    TEXT,
  settings      JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Grupos esportivos
CREATE TABLE public.groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  slug          TEXT        UNIQUE NOT NULL,
  description   TEXT,
  sport         TEXT        NOT NULL,
  cover_url     TEXT,
  admin_id      UUID        NOT NULL REFERENCES public.users(id),
  access_type   TEXT        NOT NULL DEFAULT 'invite'
                              CHECK (access_type IN ('public','private','invite')),
  max_members   INTEGER     NOT NULL DEFAULT 20,
  monthly_fee   DECIMAL(10,2),
  per_event_fee DECIMAL(10,2),
  payment_day   INTEGER     CHECK (payment_day BETWEEN 1 AND 28),
  pix_key       TEXT,
  plan          TEXT        NOT NULL DEFAULT 'free'
                              CHECK (plan IN ('free','starter','pro','business')),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Membros de grupos
CREATE TABLE public.group_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID        NOT NULL REFERENCES public.groups(id)  ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  role          TEXT        NOT NULL DEFAULT 'participant'
                              CHECK (role IN ('admin','organizer','participant')),
  member_type   TEXT        NOT NULL DEFAULT 'regular'
                              CHECK (member_type IN ('monthly','regular','guest')),
  status        TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('pending','active','suspended','banned')),
  monthly_slot  BOOLEAN     DEFAULT FALSE,
  skill_rating  INTEGER     DEFAULT 3 CHECK (skill_rating BETWEEN 1 AND 5),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Códigos de convite
CREATE TABLE public.invite_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  code       TEXT        UNIQUE NOT NULL,
  created_by UUID        NOT NULL REFERENCES public.users(id),
  max_uses   INTEGER,
  uses       INTEGER     DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eventos
CREATE TABLE public.events (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                 UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title                    TEXT        NOT NULL,
  description              TEXT,
  sport                    TEXT        NOT NULL,
  starts_at                TIMESTAMPTZ NOT NULL,
  ends_at                  TIMESTAMPTZ NOT NULL,
  location_name            TEXT,
  location_address         TEXT,
  max_participants         INTEGER     NOT NULL DEFAULT 14,
  monthly_slots            INTEGER     NOT NULL DEFAULT 0,
  participant_count        INTEGER     NOT NULL DEFAULT 0,
  status                   TEXT        NOT NULL DEFAULT 'published'
                             CHECK (status IN ('draft','published','open','completed','cancelled')),
  is_recurring             BOOLEAN     DEFAULT FALSE,
  recurrence_rule          TEXT,
  monthly_confirm_deadline TIMESTAMPTZ,
  event_fee                DECIMAL(10,2),
  notes                    TEXT,
  created_by               UUID        REFERENCES public.users(id),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes de eventos
CREATE TABLE public.event_participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('confirmed','pending','declined','absent','present')),
  is_monthly   BOOLEAN     DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  goals        INTEGER     DEFAULT 0,
  assists      INTEGER     DEFAULT 0,
  is_late_cancel BOOLEAN   DEFAULT FALSE,
  payment_id   UUID,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Fila de espera
CREATE TABLE public.waitlists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  position   INTEGER     NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'waiting'
               CHECK (status IN ('waiting','notified','confirmed','expired','left')),
  is_monthly BOOLEAN     DEFAULT FALSE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

-- Pagamentos
CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES public.users(id),
  event_id        UUID        REFERENCES public.events(id),
  type            TEXT        NOT NULL
                    CHECK (type IN ('monthly','per_event','partial','fine')),
  amount          DECIMAL(10,2) NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','overdue','cancelled','refunded')),
  due_date        DATE        NOT NULL,
  paid_at         TIMESTAMPTZ,
  reference_month DATE,
  pix_key         TEXT,
  paid_by         UUID        REFERENCES public.users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Notificações
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  data       JSONB       DEFAULT '{}',
  is_read    BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- TRIGGERS
-- ────────────────────────────────────────────────────────────

-- Atualiza participant_count automaticamente
CREATE OR REPLACE FUNCTION update_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE events SET participant_count = participant_count + 1 WHERE id = NEW.event_id;

  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE events SET participant_count = GREATEST(0, participant_count - 1) WHERE id = OLD.event_id;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
      UPDATE events SET participant_count = participant_count + 1 WHERE id = NEW.event_id;
    ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
      UPDATE events SET participant_count = GREATEST(0, participant_count - 1) WHERE id = NEW.event_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_participant_count
  AFTER INSERT OR UPDATE OR DELETE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION update_participant_count();

-- updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_groups_updated_at   BEFORE UPDATE ON groups   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_events_updated_at   BEFORE UPDATE ON events   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Cria perfil automaticamente no primeiro login OAuth (evita usuário sem perfil)
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Só pré-popula se vier via OAuth (tem nome/avatar nos metadados)
  IF NEW.raw_user_meta_data->>'name' IS NOT NULL THEN
    INSERT INTO public.users (id, name, nickname, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário'),
      COALESCE(
        split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1),
        split_part(NEW.raw_user_meta_data->>'name', ' ', 1),
        'Usuário'
      ),
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ────────────────────────────────────────────────────────────
-- HELPERS (SECURITY DEFINER — bypass RLS para checagens internas)
-- ────────────────────────────────────────────────────────────

-- Verifica se o usuário é membro ativo do grupo sem acionar o RLS de group_members,
-- evitando recursão infinita nas políticas que consultam a própria tabela.
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id  = p_user_id
      AND status   = 'active'
  );
$$;

-- Pré-visualização de um convite por código, sem expor a tabela invite_codes
-- (que guarda os códigos de TODOS os grupos) nem colunas sensíveis de groups
-- (pix_key, admin_id etc.) para quem ainda não é membro.
CREATE OR REPLACE FUNCTION public.get_invite_preview(p_code TEXT)
RETURNS TABLE (
  is_valid      BOOLEAN,
  group_id      UUID,
  group_name    TEXT,
  description   TEXT,
  sport         TEXT,
  access_type   TEXT,
  monthly_fee   DECIMAL(10,2),
  per_event_fee DECIMAL(10,2),
  payment_day   INTEGER,
  member_count  INTEGER,
  is_member     BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_invite invite_codes%ROWTYPE;
  v_uid    UUID := auth.uid();
BEGIN
  SELECT * INTO v_invite FROM invite_codes WHERE code = p_code;

  IF v_invite.id IS NULL
     OR (v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now())
     OR (v_invite.max_uses IS NOT NULL AND v_invite.uses >= v_invite.max_uses) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT,
                         NULL::DECIMAL, NULL::DECIMAL, NULL::INTEGER, 0, FALSE;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    TRUE,
    g.id, g.name, g.description, g.sport, g.access_type,
    g.monthly_fee, g.per_event_fee, g.payment_day,
    (SELECT COUNT(*)::INTEGER FROM group_members gm WHERE gm.group_id = g.id AND gm.status = 'active'),
    (v_uid IS NOT NULL AND public.is_group_member(g.id, v_uid))
  FROM groups g
  WHERE g.id = v_invite.group_id AND g.deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_preview(TEXT) TO authenticated;

-- Prévia de membros (avatares) de um grupo a partir de um código de convite válido.
CREATE OR REPLACE FUNCTION public.get_invite_members(p_code TEXT)
RETURNS TABLE (
  member_id  UUID,
  role       TEXT,
  user_id    UUID,
  name       TEXT,
  nickname   TEXT,
  avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT gm.id, gm.role, gm.user_id, u.name, u.nickname, u.avatar_url
  FROM invite_codes ic
  JOIN group_members gm ON gm.group_id = ic.group_id AND gm.status = 'active'
  JOIN users u ON u.id = gm.user_id
  WHERE ic.code = p_code
    AND (ic.expires_at IS NULL OR ic.expires_at > now())
    AND (ic.max_uses IS NULL OR ic.uses < ic.max_uses)
  ORDER BY gm.joined_at
  LIMIT 8;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_members(TEXT) TO authenticated;

-- Resgata um convite: valida, insere o chamador em group_members e incrementa
-- o contador de usos — tudo atomicamente, sem exigir SELECT aberto em invite_codes.
CREATE OR REPLACE FUNCTION public.redeem_invite(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite invite_codes%ROWTYPE;
  v_uid    UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_invite FROM invite_codes WHERE code = p_code;
  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Código de convite inválido';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Este convite expirou';
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.uses >= v_invite.max_uses THEN
    RAISE EXCEPTION 'Este convite atingiu o limite de usos';
  END IF;

  IF EXISTS (SELECT 1 FROM group_members WHERE group_id = v_invite.group_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Você já é membro deste grupo';
  END IF;

  INSERT INTO group_members (group_id, user_id, role, member_type, status)
  VALUES (v_invite.group_id, v_uid, 'participant', 'regular', 'active');

  UPDATE invite_codes SET uses = uses + 1 WHERE id = v_invite.id;

  RETURN v_invite.group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_invite(TEXT) TO authenticated;

-- Pré-visualização do RSVP avulso: precisa funcionar para visitante 100% deslogado
-- (role "anon", sem sessão nenhuma ainda), não só "authenticated" — por isso
-- SECURITY DEFINER em vez de depender de RLS em events/groups.
CREATE OR REPLACE FUNCTION public.get_guest_event_preview(p_event_id UUID)
RETURNS TABLE (
  is_valid          BOOLEAN,
  event_id          UUID,
  group_id          UUID,
  title             TEXT,
  sport             TEXT,
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  location_name     TEXT,
  max_participants  INTEGER,
  participant_count INTEGER,
  group_name        TEXT,
  my_status         TEXT,
  is_member         BOOLEAN,
  has_profile       BOOLEAN,
  profile_nickname  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_event events%ROWTYPE;
  v_group groups%ROWTYPE;
  v_uid   UUID := auth.uid();
  v_nick  TEXT;
  v_status TEXT;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;

  IF v_event.id IS NOT NULL THEN
    SELECT * INTO v_group FROM groups WHERE id = v_event.group_id;
  END IF;

  IF v_event.id IS NULL
     OR v_group.id IS NULL
     OR v_group.deleted_at IS NOT NULL
     OR v_group.access_type = 'private'
     OR v_event.status NOT IN ('published','open') THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT,
                         NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TEXT,
                         NULL::INTEGER, 0, NULL::TEXT, NULL::TEXT, FALSE, FALSE, NULL::TEXT;
    RETURN;
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT nickname INTO v_nick FROM users WHERE id = v_uid;
    SELECT status INTO v_status FROM event_participants WHERE event_id = v_event.id AND user_id = v_uid;
  END IF;

  RETURN QUERY
  SELECT
    TRUE,
    v_event.id, v_event.group_id, v_event.title, v_event.sport,
    v_event.starts_at, v_event.ends_at, v_event.location_name,
    v_event.max_participants, COALESCE(v_event.participant_count, 0),
    v_group.name,
    v_status,
    (v_uid IS NOT NULL AND public.is_group_member(v_group.id, v_uid)),
    (v_nick IS NOT NULL),
    v_nick;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_event_preview(UUID) TO anon, authenticated;

-- Confirma presença avulsa: exige que o chamador já tenha uma sessão (anônima ou
-- não — criada pelo app antes de chamar esta função), cria o perfil de convidado
-- se necessário e grava a presença, tudo atomicamente.
CREATE OR REPLACE FUNCTION public.confirm_event_guest(p_event_id UUID, p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event  events%ROWTYPE;
  v_group  groups%ROWTYPE;
  v_uid    UUID := auth.uid();
  v_status TEXT;
  v_name   TEXT := NULLIF(TRIM(p_name), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF v_event.id IS NULL THEN
    RAISE EXCEPTION 'Evento não encontrado';
  END IF;

  SELECT * INTO v_group FROM groups WHERE id = v_event.group_id;
  IF v_group.id IS NULL OR v_group.deleted_at IS NOT NULL OR v_group.access_type = 'private' THEN
    RAISE EXCEPTION 'Este evento é privado';
  END IF;

  IF v_event.status NOT IN ('published','open') THEN
    RAISE EXCEPTION 'Este evento não está mais aceitando confirmações';
  END IF;

  -- Cria perfil mínimo de convidado só se ainda não existir (nunca sobrescreve
  -- o nome de quem já tem conta de verdade). Um convidado recém-criado sempre
  -- entra como "pending": ele ainda não é uma conta de verdade, então a vaga só
  -- é reservada de fato quando essa mesma sessão voltar aqui e confirmar.
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_uid) THEN
    IF v_name IS NULL THEN
      RAISE EXCEPTION 'Informe seu nome';
    END IF;
    INSERT INTO users (id, name, nickname, is_guest)
    VALUES (v_uid, v_name, split_part(v_name, ' ', 1), TRUE);
    v_status := 'pending';
  ELSE
    v_status := CASE WHEN COALESCE(v_event.participant_count, 0) < v_event.max_participants
                      THEN 'confirmed' ELSE 'pending' END;
  END IF;

  -- participant_count é mantido automaticamente pelo trigger trg_update_participant_count
  -- (dispara em INSERT/UPDATE de event_participants, inclusive dentro deste upsert).
  INSERT INTO event_participants (event_id, user_id, status, confirmed_at)
  VALUES (p_event_id, v_uid, v_status, CASE WHEN v_status = 'confirmed' THEN now() ELSE NULL END)
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET status = EXCLUDED.status, confirmed_at = EXCLUDED.confirmed_at;

  RETURN v_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_event_guest(UUID, TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;

-- Privilégios de base (RLS filtra as linhas; sem GRANT, a query falha com
-- "permission denied" antes mesmo de avaliar as policies).
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

-- users
CREATE POLICY "Perfis visíveis para autenticados"
  ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuário insere próprio perfil"
  ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuário atualiza próprio perfil"
  ON users FOR UPDATE USING (auth.uid() = id);

-- groups
-- (Pré-visualização por convite não passa por aqui — usa get_invite_preview(),
--  que só devolve os campos necessários, sem depender de RLS aberto nesta tabela.)
CREATE POLICY "Membros veem o grupo"
  ON groups FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      access_type = 'public'
      OR admin_id = auth.uid()
      OR public.is_group_member(id, auth.uid())
    )
  );
CREATE POLICY "Autenticados criam grupos"
  ON groups FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid());
CREATE POLICY "Admin atualiza grupo"
  ON groups FOR UPDATE USING (admin_id = auth.uid());
CREATE POLICY "Admin exclui grupo"
  ON groups FOR DELETE USING (admin_id = auth.uid());

-- group_members
CREATE POLICY "Membros veem outros membros do grupo"
  ON group_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));
-- Entrar num grupo existente só é permitido via redeem_invite() (SECURITY DEFINER,
-- valida o código atomicamente). Inserção direta só é aceita pra quem acabou de
-- criar o grupo, virando o próprio admin dele.
CREATE POLICY "Criador do grupo vira admin"
  ON group_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM groups WHERE id = group_id AND admin_id = auth.uid())
  );
CREATE POLICY "Admin gerencia membros"
  ON group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE id = group_id AND admin_id = auth.uid()
    )
  );
CREATE POLICY "Usuário sai do grupo"
  ON group_members FOR DELETE USING (user_id = auth.uid());

-- invite_codes
-- Não-membros nunca leem esta tabela diretamente: a pré-visualização e o resgate
-- do convite passam por get_invite_preview()/get_invite_members()/redeem_invite(),
-- que bypassam RLS internamente e só devolvem o necessário.
CREATE POLICY "Membros veem convites do grupo"
  ON invite_codes FOR SELECT TO authenticated
  USING (public.is_group_member(invite_codes.group_id, auth.uid()));
CREATE POLICY "Membros criam convites"
  ON invite_codes FOR INSERT TO authenticated
  WITH CHECK (public.is_group_member(invite_codes.group_id, auth.uid()));

-- events
-- (RSVP avulso não passa por aqui — usa get_guest_event_preview()/confirm_event_guest(),
--  que cobrem inclusive visitante sem sessão nenhuma, coisa que RLS "TO authenticated"
--  nunca cobriria.)
CREATE POLICY "Membros veem eventos do grupo"
  ON events FOR SELECT TO authenticated
  USING (public.is_group_member(events.group_id, auth.uid()));
CREATE POLICY "Organizadores criam eventos"
  ON events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = events.group_id
        AND user_id = auth.uid()
        AND role IN ('admin','organizer')
        AND status = 'active'
    )
  );
CREATE POLICY "Organizadores editam eventos"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = events.group_id
        AND user_id = auth.uid()
        AND role IN ('admin','organizer')
        AND status = 'active'
    )
  );

-- event_participants
CREATE POLICY "Membros veem participantes"
  ON event_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id AND public.is_group_member(e.group_id, auth.uid())
    )
  );
-- Convidado avulso nunca insere direto aqui — passa por confirm_event_guest().
CREATE POLICY "Usuário confirma própria presença"
  ON event_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_participants.event_id AND public.is_group_member(e.group_id, auth.uid())
    )
  );
CREATE POLICY "Usuário atualiza própria presença"
  ON event_participants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Organizadores gerenciam todos os participantes"
  ON event_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN group_members gm ON gm.group_id = e.group_id
      WHERE e.id = event_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('admin','organizer')
        AND gm.status = 'active'
    )
  );

-- waitlists
CREATE POLICY "Membros veem fila do evento"
  ON waitlists FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN group_members gm ON gm.group_id = e.group_id
      WHERE e.id = event_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );
CREATE POLICY "Usuário entra na fila"
  ON waitlists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Usuário atualiza própria posição na fila"
  ON waitlists FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Usuário sai da fila"
  ON waitlists FOR DELETE USING (user_id = auth.uid());

-- payments
CREATE POLICY "Usuário vê próprios pagamentos"
  ON payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Organizadores veem todos os pagamentos do grupo"
  ON payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = payments.group_id
        AND user_id = auth.uid()
        AND role IN ('admin','organizer')
        AND status = 'active'
    )
  );
CREATE POLICY "Organizadores criam pagamentos"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = payments.group_id
        AND user_id = auth.uid()
        AND role IN ('admin','organizer')
        AND status = 'active'
    )
  );
CREATE POLICY "Organizadores atualizam pagamentos"
  ON payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = payments.group_id
        AND user_id = auth.uid()
        AND role IN ('admin','organizer')
        AND status = 'active'
    )
  );

-- notifications
CREATE POLICY "Usuário vê próprias notificações"
  ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Usuário marca como lida"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- ÍNDICES
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_group_members_group_id    ON group_members(group_id);
CREATE INDEX idx_group_members_user_id     ON group_members(user_id);
CREATE INDEX idx_events_group_id           ON events(group_id);
CREATE INDEX idx_events_starts_at          ON events(starts_at);
CREATE INDEX idx_event_participants_event  ON event_participants(event_id);
CREATE INDEX idx_event_participants_user   ON event_participants(user_id);
CREATE INDEX idx_waitlists_event_id        ON waitlists(event_id);
CREATE INDEX idx_payments_user_id          ON payments(user_id);
CREATE INDEX idx_payments_group_id         ON payments(group_id);
CREATE INDEX idx_notifications_user_id     ON notifications(user_id);
CREATE INDEX idx_invite_codes_code         ON invite_codes(code);

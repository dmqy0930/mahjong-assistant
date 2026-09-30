-- 麻雀助手：对局房间
--
-- 使用方式：在 Supabase 控制台的 SQL Editor 里整段执行即可（可重复执行）。
--
-- 设计取舍：房间不需要登录、也没有口令，所以匿名 key 一旦能直接 select 表，
-- 就能把所有人的房间号列出来，"随机房间号"就失去意义了。
-- 因此这里对两张表开启 RLS 且**不建任何 policy**——匿名客户端无法直接读写，
-- 只能通过下面的 security definer 函数访问，而函数必须提供正确的房间号。

create table if not exists public.rooms (
  code text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.room_rounds (
  id bigserial primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  seq int not null,
  payload jsonb not null,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists room_rounds_room_code_seq_idx
  on public.room_rounds (room_code, seq, id);

alter table public.rooms enable row level security;
alter table public.room_rounds enable row level security;

-- 生成房间号：排除容易看错的 I O 0 1
create or replace function public.create_room(p_meta jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = candidate);
  end loop;

  insert into public.rooms (code, meta)
  values (candidate, coalesce(p_meta, '{}'::jsonb));
  return candidate;
end;
$$;

-- 读取房间快照：房间信息 + 全部对局
create or replace function public.room_snapshot(p_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'room', (
      select to_jsonb(r) from public.rooms r
      where r.code = upper(trim(coalesce(p_code, '')))
    ),
    'rounds', coalesce((
      select jsonb_agg(to_jsonb(rr) order by rr.seq, rr.id)
      from public.room_rounds rr
      where rr.room_code = upper(trim(coalesce(p_code, '')))
    ), '[]'::jsonb)
  );
$$;

-- 追加一局
create or replace function public.room_add_round(
  p_code text,
  p_payload jsonb,
  p_by text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := upper(trim(coalesce(p_code, '')));
  next_seq int;
  inserted jsonb;
begin
  if not exists (select 1 from public.rooms where code = target) then
    raise exception 'room_not_found' using errcode = 'P0002';
  end if;

  select coalesce(max(seq), 0) + 1 into next_seq
  from public.room_rounds where room_code = target;

  insert into public.room_rounds (room_code, seq, payload, created_by)
  values (target, next_seq, coalesce(p_payload, '{}'::jsonb), coalesce(p_by, ''))
  returning to_jsonb(public.room_rounds.*) into inserted;

  update public.rooms set updated_at = now() where code = target;
  return inserted;
end;
$$;

-- 修改某局
create or replace function public.room_update_round(
  p_code text,
  p_id bigint,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := upper(trim(coalesce(p_code, '')));
  updated jsonb;
begin
  update public.room_rounds
  set payload = coalesce(p_payload, '{}'::jsonb), updated_at = now()
  where id = p_id and room_code = target
  returning to_jsonb(public.room_rounds.*) into updated;

  if updated is null then
    raise exception 'round_not_found' using errcode = 'P0002';
  end if;
  return updated;
end;
$$;

-- 删除某局
create or replace function public.room_delete_round(p_code text, p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := upper(trim(coalesce(p_code, '')));
  removed int;
begin
  delete from public.room_rounds
  where id = p_id and room_code = target;
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

-- 更新房间设置（玩家名、人数、三麻规则、起始点等）
create or replace function public.room_set_meta(p_code text, p_meta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := upper(trim(coalesce(p_code, '')));
  updated jsonb;
begin
  update public.rooms
  set meta = coalesce(p_meta, '{}'::jsonb), updated_at = now()
  where code = target
  returning to_jsonb(public.rooms.*) into updated;

  if updated is null then
    raise exception 'room_not_found' using errcode = 'P0002';
  end if;
  return updated;
end;
$$;

-- 只允许匿名/登录用户调用上面这些函数，不允许直接读写表
revoke all on function public.create_room(jsonb) from public;
revoke all on function public.room_snapshot(text) from public;
revoke all on function public.room_add_round(text, jsonb, text) from public;
revoke all on function public.room_update_round(text, bigint, jsonb) from public;
revoke all on function public.room_delete_round(text, bigint) from public;
revoke all on function public.room_set_meta(text, jsonb) from public;

grant execute on function public.create_room(jsonb) to anon, authenticated;
grant execute on function public.room_snapshot(text) to anon, authenticated;
grant execute on function public.room_add_round(text, jsonb, text) to anon, authenticated;
grant execute on function public.room_update_round(text, bigint, jsonb) to anon, authenticated;
grant execute on function public.room_delete_round(text, bigint) to anon, authenticated;
grant execute on function public.room_set_meta(text, jsonb) to anon, authenticated;

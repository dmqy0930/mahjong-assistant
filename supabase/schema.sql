-- 麻雀助手：对局房间（含加入审核）
--
-- 使用方式：在 Supabase 控制台的 SQL Editor 里整段执行（可重复执行）。
--
-- 访问控制思路：
--   1. 两张数据表开启 RLS 且**不建任何 policy**，匿名 key 无法直接读写；
--      否则任何人都能用 anon key 把全部房间号列出来。
--   2. 所有操作走 security definer 函数。
--   3. 加入房间需要房主审核：客户端生成一个随机 token，房主批准后该 token
--      才被认作成员；之后所有写操作都要带上这个 token。
--
-- 注意：token 存在浏览器本地，等同于"房间内的钥匙"。它不绑定真实身份，
-- 但足以阻止「拿到房间号就能改数据」。

-- ---------------------------------------------------------------- 清理旧版本
--
-- 早期版本没有加入审核，那批函数不带 token 参数，任何人都能直接调用。
-- 如果之前执行过旧版脚本，必须先删掉它们，否则审核可以被绕过。

drop function if exists public.create_room(jsonb);
drop function if exists public.room_snapshot(text);
drop function if exists public.room_add_round(text, jsonb, text);
drop function if exists public.room_update_round(text, bigint, jsonb);
drop function if exists public.room_delete_round(text, bigint);
drop function if exists public.room_set_meta(text, jsonb);

-- ---------------------------------------------------------------- 表结构

create table if not exists public.rooms (
  code text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.room_members (
  id bigserial primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  token text not null,
  nickname text not null default '',
  status text not null default 'pending', -- pending | approved | rejected
  is_host boolean not null default false,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (room_code, token)
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
create index if not exists room_members_room_status_idx
  on public.room_members (room_code, status);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_rounds enable row level security;

-- ---------------------------------------------------------------- 内部辅助

create or replace function public.room_norm_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
$$;

-- 取成员；要求已通过审核，否则抛错
create or replace function public.room_require_member(p_code text, p_token text)
returns public.room_members
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := public.room_norm_code(p_code);
  found public.room_members;
begin
  if not exists (select 1 from rooms where code = target) then
    raise exception 'room_not_found' using errcode = 'P0002';
  end if;

  select * into found from room_members
  where room_code = target and token = coalesce(p_token, '');

  if found.id is null then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  if found.status = 'pending' then
    raise exception 'pending_approval' using errcode = '42501';
  end if;
  if found.status <> 'approved' then
    raise exception 'join_rejected' using errcode = '42501';
  end if;
  return found;
end;
$$;

create or replace function public.room_require_host(p_code text, p_token text)
returns public.room_members
language plpgsql
security definer
set search_path = public
as $$
declare
  member public.room_members;
begin
  member := public.room_require_member(p_code, p_token);
  if not member.is_host then
    raise exception 'not_host' using errcode = '42501';
  end if;
  return member;
end;
$$;

-- ---------------------------------------------------------------- 房间操作

-- 建房：p_code 为空则随机生成；p_token 由客户端生成，房主凭证
create or replace function public.create_room(
  p_meta jsonb default '{}'::jsonb,
  p_code text default null,
  p_token text default '',
  p_nickname text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
begin
  if coalesce(p_token, '') = '' then
    raise exception 'missing_token' using errcode = '22023';
  end if;

  candidate := public.room_norm_code(p_code);
  if candidate <> '' then
    if candidate !~ '^[A-HJ-NP-Z2-9]{6}$' then
      raise exception 'invalid_code_format' using errcode = '22023';
    end if;
    if exists (select 1 from rooms where code = candidate) then
      raise exception 'code_taken' using errcode = '23505';
    end if;
  else
    loop
      candidate := '';
      for i in 1..6 loop
        candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      end loop;
      exit when not exists (select 1 from rooms where code = candidate);
    end loop;
  end if;

  insert into rooms (code, meta) values (candidate, coalesce(p_meta, '{}'::jsonb));
  insert into room_members (room_code, token, nickname, status, is_host, decided_at)
  values (candidate, p_token, coalesce(p_nickname, ''), 'approved', true, now());

  return jsonb_build_object('code', candidate, 'token', p_token, 'status', 'approved', 'isHost', true);
end;
$$;

-- 查询房间状态：成员未通过时只回成员状态，不泄露对局数据
create or replace function public.room_status(p_code text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := public.room_norm_code(p_code);
  member public.room_members;
begin
  if not exists (select 1 from rooms where code = target) then
    return jsonb_build_object('room', null, 'rounds', '[]'::jsonb, 'member', null);
  end if;

  select * into member from room_members
  where room_code = target and token = coalesce(p_token, '');

  if member.id is null or member.status <> 'approved' then
    return jsonb_build_object(
      'room', null,
      'rounds', '[]'::jsonb,
      'member', case when member.id is null then null
                     else jsonb_build_object('status', member.status, 'isHost', member.is_host)
                end
    );
  end if;

  return jsonb_build_object(
    'room', (select to_jsonb(r) from rooms r where r.code = target),
    'rounds', coalesce((
      select jsonb_agg(to_jsonb(rr) order by rr.seq, rr.id)
      from room_rounds rr where rr.room_code = target
    ), '[]'::jsonb),
    'member', jsonb_build_object(
      'status', member.status,
      'isHost', member.is_host,
      'nickname', member.nickname
    )
  );
end;
$$;

-- 申请加入：重复调用不会产生多条申请
create or replace function public.room_request_join(
  p_code text,
  p_token text,
  p_nickname text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := public.room_norm_code(p_code);
  existing public.room_members;
begin
  if coalesce(p_token, '') = '' then
    raise exception 'missing_token' using errcode = '22023';
  end if;
  if not exists (select 1 from rooms where code = target) then
    raise exception 'room_not_found' using errcode = 'P0002';
  end if;

  select * into existing from room_members
  where room_code = target and token = p_token;

  if existing.id is not null then
    return jsonb_build_object('status', existing.status, 'isHost', existing.is_host);
  end if;

  insert into room_members (room_code, token, nickname, status)
  values (target, p_token, coalesce(p_nickname, ''), 'pending');

  return jsonb_build_object('status', 'pending', 'isHost', false);
end;
$$;

-- 房主查看待审核申请
create or replace function public.room_pending_members(p_code text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := public.room_norm_code(p_code);
begin
  perform public.room_require_host(target, p_token);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'nickname', m.nickname, 'createdAt', m.created_at
    ) order by m.id)
    from room_members m
    where m.room_code = target and m.status = 'pending'
  ), '[]'::jsonb);
end;
$$;

-- 房主批准 / 拒绝
create or replace function public.room_decide_member(
  p_code text,
  p_member_id bigint,
  p_token text,
  p_approve boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := public.room_norm_code(p_code);
  changed int;
begin
  perform public.room_require_host(target, p_token);

  update room_members
  set status = case when p_approve then 'approved' else 'rejected' end,
      decided_at = now()
  where id = p_member_id and room_code = target and status = 'pending';
  get diagnostics changed = row_count;
  return changed > 0;
end;
$$;

-- 追加一局
create or replace function public.room_add_round(
  p_code text,
  p_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := public.room_norm_code(p_code);
  member public.room_members;
  next_seq int;
  inserted jsonb;
begin
  member := public.room_require_member(target, p_token);

  select coalesce(max(seq), 0) + 1 into next_seq
  from room_rounds where room_code = target;

  insert into room_rounds (room_code, seq, payload, created_by)
  values (target, next_seq, coalesce(p_payload, '{}'::jsonb), member.nickname)
  returning to_jsonb(room_rounds.*) into inserted;

  update rooms set updated_at = now() where code = target;
  return inserted;
end;
$$;

-- 修改某一局
create or replace function public.room_update_round(
  p_code text,
  p_token text,
  p_id bigint,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := public.room_norm_code(p_code);
  updated jsonb;
begin
  perform public.room_require_member(target, p_token);

  update room_rounds
  set payload = coalesce(p_payload, '{}'::jsonb), updated_at = now()
  where id = p_id and room_code = target
  returning to_jsonb(room_rounds.*) into updated;

  if updated is null then
    raise exception 'round_not_found' using errcode = 'P0002';
  end if;
  return updated;
end;
$$;

-- 删除某一局
create or replace function public.room_delete_round(
  p_code text,
  p_token text,
  p_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := public.room_norm_code(p_code);
  removed int;
begin
  perform public.room_require_member(target, p_token);
  delete from room_rounds where id = p_id and room_code = target;
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

-- 修改房间设置（仅房主）
create or replace function public.room_set_meta(
  p_code text,
  p_token text,
  p_meta jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := public.room_norm_code(p_code);
  updated jsonb;
begin
  perform public.room_require_host(target, p_token);

  update rooms
  set meta = coalesce(p_meta, '{}'::jsonb), updated_at = now()
  where code = target
  returning to_jsonb(rooms.*) into updated;
  return updated;
end;
$$;

-- ---------------------------------------------------------------- 权限

revoke all on function public.room_norm_code(text) from public;
revoke all on function public.room_require_member(text, text) from public;
revoke all on function public.room_require_host(text, text) from public;
revoke all on function public.create_room(jsonb, text, text, text) from public;
revoke all on function public.room_status(text, text) from public;
revoke all on function public.room_request_join(text, text, text) from public;
revoke all on function public.room_pending_members(text, text) from public;
revoke all on function public.room_decide_member(text, bigint, text, boolean) from public;
revoke all on function public.room_add_round(text, text, jsonb) from public;
revoke all on function public.room_update_round(text, text, bigint, jsonb) from public;
revoke all on function public.room_delete_round(text, text, bigint) from public;
revoke all on function public.room_set_meta(text, text, jsonb) from public;

grant execute on function public.create_room(jsonb, text, text, text) to anon, authenticated;
grant execute on function public.room_status(text, text) to anon, authenticated;
grant execute on function public.room_request_join(text, text, text) to anon, authenticated;
grant execute on function public.room_pending_members(text, text) to anon, authenticated;
grant execute on function public.room_decide_member(text, bigint, text, boolean) to anon, authenticated;
grant execute on function public.room_add_round(text, text, jsonb) to anon, authenticated;
grant execute on function public.room_update_round(text, text, bigint, jsonb) to anon, authenticated;
grant execute on function public.room_delete_round(text, text, bigint) to anon, authenticated;
grant execute on function public.room_set_meta(text, text, jsonb) to anon, authenticated;

-- 新增函数后 PostgREST 需要刷新 schema 缓存，否则客户端会报
-- "Could not find the function ... in the schema cache"。
notify pgrst, 'reload schema';

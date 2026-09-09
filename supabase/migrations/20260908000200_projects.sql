-- Projects: the workspace the schema has always had a table for and the UI
-- never used. A song already carries project_id; nothing ever set it.

-- Renaming or reassigning must not be a way to smuggle changes into another
-- user's data, so both sides of a move are checked against the caller.
create or replace function move_songs_to_project(
  p_song_ids uuid[],
  p_project_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_count int;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_project_id is not null then
    perform 1 from projects
     where id = p_project_id and user_id = v_user and deleted_at is null;
    if not found then
      raise exception 'project_not_found' using errcode = 'no_data_found';
    end if;
  end if;

  perform set_config('app.privileged_write', 'on', true);
  update songs
     set project_id = p_project_id, updated_at = now()
   where id = any(p_song_ids) and user_id = v_user and deleted_at is null;
  get diagnostics v_count = row_count;
  perform set_config('app.privileged_write', 'off', true);

  return v_count;
end;
$$;

-- Deleting a project must not delete the work inside it: songs fall back to
-- the unfiled list rather than disappearing with the folder.
create or replace function delete_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  perform 1 from projects where id = p_project_id and user_id = v_user;
  if not found then
    raise exception 'project_not_found' using errcode = 'no_data_found';
  end if;

  perform set_config('app.privileged_write', 'on', true);
  update songs set project_id = null, updated_at = now()
   where project_id = p_project_id and user_id = v_user;
  perform set_config('app.privileged_write', 'off', true);

  update projects set deleted_at = now(), updated_at = now()
   where id = p_project_id and user_id = v_user;
end;
$$;

-- Song counts per project, so the sidebar does not need a query per row.
create or replace function project_summaries()
returns table (
  id          uuid,
  title       text,
  song_count  int,
  updated_at  timestamptz,
  created_at  timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id,
         p.title,
         count(s.id) filter (where s.deleted_at is null)::int,
         p.updated_at,
         p.created_at
    from projects p
    left join songs s on s.project_id = p.id
   where p.user_id = auth.uid() and p.deleted_at is null
   group by p.id
   order by p.updated_at desc;
$$;

grant execute on function move_songs_to_project(uuid[], uuid) to authenticated;
grant execute on function delete_project(uuid)                to authenticated;
grant execute on function project_summaries()                 to authenticated;

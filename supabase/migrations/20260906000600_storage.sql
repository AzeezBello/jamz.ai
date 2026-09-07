-- Buckets. Masters are private and only ever handed out as short-lived signed
-- URLs by the download function; cover art is public so it can be used in
-- <img> tags and social cards.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('audio',  'audio',  false, 104857600, array['audio/wav','audio/mpeg','audio/mp4','audio/ogg']),
  ('covers', 'covers', true,   10485760, array['image/jpeg','image/png','image/webp']),
  ('uploads','uploads', false, 104857600, array['audio/wav','audio/mpeg','audio/mp4','audio/ogg'])
on conflict (id) do nothing;

-- Owners may read their own masters directly; everything else goes through
-- the signed-URL function, which can also serve public songs.
create policy "audio owner read" on storage.objects for select
  using (bucket_id = 'audio' and owner = auth.uid());

create policy "covers public read" on storage.objects for select
  using (bucket_id = 'covers');

-- Reference-track uploads: users write and read under their own uuid prefix.
create policy "uploads owner rw" on storage.objects for all
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

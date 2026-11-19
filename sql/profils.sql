-- Profils : identité des utilisateurs + connexion par téléphone / nom d'utilisateur
-- À exécuter UNE fois : Supabase > SQL Editor > New query > coller > Run

create table if not exists profils(
  user_id uuid primary key references auth.users on delete cascade,
  nom text, prenom text, username text, telephone text, email text,
  created_at timestamptz default now());
create unique index if not exists profils_username_uq on profils(lower(username)) where username is not null;
create unique index if not exists profils_tel_uq on profils(telephone) where telephone is not null;
alter table profils enable row level security;
drop policy if exists "profil lecture perso" on profils;
drop policy if exists "profil maj perso" on profils;
create policy "profil lecture perso" on profils for select using (auth.uid()=user_id);
create policy "profil maj perso" on profils for update using (auth.uid()=user_id);

-- Crée le profil automatiquement à l'inscription (ne bloque jamais l'inscription)
create or replace function nouveau_profil() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into profils(user_id,nom,prenom,username,telephone,email)
  values(new.id,
    new.raw_user_meta_data->>'nom', new.raw_user_meta_data->>'prenom',
    lower(new.raw_user_meta_data->>'username'),
    new.raw_user_meta_data->>'telephone', new.email)
  on conflict do nothing;
  return new;
exception when others then return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function nouveau_profil();

-- Connexion : identifiant (nom d'utilisateur ou téléphone) -> e-mail
create or replace function resoudre_identifiant(ident text) returns text
language sql security definer set search_path=public stable as $$
  select email from profils
  where lower(username)=lower(ident) or telephone=ident limit 1 $$;

-- Inscription : disponibilité du nom d'utilisateur / téléphone
create or replace function identifiant_dispo(p_username text, p_tel text) returns jsonb
language sql security definer set search_path=public stable as $$
  select jsonb_build_object(
    'username', not exists(select 1 from profils where lower(username)=lower(p_username)),
    'telephone', not exists(select 1 from profils where telephone=p_tel)) $$;

grant execute on function resoudre_identifiant(text), identifiant_dispo(text,text) to anon, authenticated;

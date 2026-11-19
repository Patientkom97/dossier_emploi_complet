-- Clés d'accès Premium (générées par l'administrateur, saisies par l'utilisateur)
-- À exécuter UNE fois : Supabase > SQL Editor > New query > coller > Run
-- Puis, tout en bas, remplacer l'e-mail par le VÔTRE (compte administrateur).

create table if not exists admins(user_id uuid primary key references auth.users on delete cascade);
alter table admins enable row level security;   -- aucune règle : lisible uniquement via les fonctions ci-dessous

create table if not exists cles_acces(
  code text primary key,
  jours int not null check (jours between 1 and 3650),
  note text,
  cree_le timestamptz default now(),
  cree_par uuid references auth.users,
  utilise_par uuid references auth.users,
  utilise_le timestamptz,
  revoquee boolean default false);
alter table cles_acces enable row level security;  -- aucune règle : personne ne lit la table directement

create or replace function est_admin() returns boolean
language sql security definer set search_path=public stable as $$
  select exists(select 1 from admins where user_id=auth.uid()) $$;

-- Administrateur : générer une clé
create or replace function creer_cle(p_jours int, p_note text) returns text
language plpgsql security definer set search_path=public as $$
declare c text;
begin
  if not est_admin() then raise exception 'interdit'; end if;
  loop
    c:='AJ-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,4))||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,4))||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));
    exit when not exists(select 1 from cles_acces where code=c);
  end loop;
  insert into cles_acces(code,jours,note,cree_par) values(c,p_jours,nullif(trim(p_note),''),auth.uid());
  return c;
end $$;

-- Administrateur : liste des clés (avec l'e-mail de la personne qui l'a utilisée)
create or replace function lister_cles() returns table(code text,jours int,note text,cree_le timestamptz,utilise_par_email text,utilise_le timestamptz,revoquee boolean)
language plpgsql security definer set search_path=public as $$
begin
  if not est_admin() then raise exception 'interdit'; end if;
  return query select k.code,k.jours,k.note,k.cree_le,u.email::text,k.utilise_le,k.revoquee
    from cles_acces k left join auth.users u on u.id=k.utilise_par order by k.cree_le desc limit 300;
end $$;

-- Administrateur : annuler une clé non utilisée
create or replace function revoquer_cle(p_code text) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  if not est_admin() then raise exception 'interdit'; end if;
  update cles_acces set revoquee=true where code=upper(trim(p_code)) and utilise_par is null;
  return found;
end $$;

-- Utilisateur connecté : activer Premium avec une clé
create or replace function activer_cle(p_code text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare k cles_acces%rowtype; cur timestamptz; fin timestamptz;
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error','non_connecte'); end if;
  select * into k from cles_acces where code=upper(trim(p_code)) for update;
  if not found then return jsonb_build_object('ok',false,'error','invalide'); end if;
  if k.revoquee then return jsonb_build_object('ok',false,'error','revoquee'); end if;
  if k.utilise_par is not null then return jsonb_build_object('ok',false,'error','utilisee'); end if;
  select premium_until into cur from abonnements where user_id=auth.uid();
  fin:=greatest(coalesce(cur,now()),now())+make_interval(days=>k.jours);
  insert into abonnements(user_id,premium_until,note) values(auth.uid(),fin,'Clé '||k.code)
    on conflict (user_id) do update set premium_until=excluded.premium_until,note=excluded.note,updated_at=now();
  update cles_acces set utilise_par=auth.uid(),utilise_le=now() where code=k.code;
  return jsonb_build_object('ok',true,'premium_until',fin);
end $$;

revoke all on function creer_cle(int,text),lister_cles(),revoquer_cle(text) from public,anon;
grant execute on function est_admin(),activer_cle(text) to authenticated;
grant execute on function creer_cle(int,text),lister_cles(),revoquer_cle(text) to authenticated;

-- >>> VOTRE compte administrateur (remplacez l'e-mail) :
insert into admins(user_id) select id from auth.users where email='patientkom@gmail.com' on conflict do nothing;

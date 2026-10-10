# Dossier Emploi (version cloud) : mise en route

## 1. Projet Supabase (gratuit)
1. Créez un compte sur supabase.com puis un nouveau projet.
2. Dans **Project Settings > API**, copiez l'URL du projet et la clé `anon public`.
3. Ouvrez `index.html` et remplacez `SB_URL` et `SB_KEY` en haut du script.

## 2. Base de données et stockage
Dans **SQL Editor**, exécutez :

```sql
create table dossiers(
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now());
alter table dossiers enable row level security;
create policy "dossier perso" on dossiers for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);

insert into storage.buckets(id,name,public) values('pieces','pieces',false);
create policy "pieces perso" on storage.objects for all
  using (bucket_id='pieces' and (storage.foldername(name))[1]=auth.uid()::text)
  with check (bucket_id='pieces' and (storage.foldername(name))[1]=auth.uid()::text);
```
Chaque utilisateur ne voit que ses propres données et fichiers.

## 3. Connexion e-mail et Google
- **Authentication > Providers > Email** : activé par défaut.
- **Google** : créez un identifiant OAuth « Application Web » dans Google Cloud Console. Ajoutez comme URI de redirection l'URL `https://VOTRE-PROJET.supabase.co/auth/v1/callback`. Collez l'ID client et le secret dans **Providers > Google**.
- **Authentication > URL Configuration** : ajoutez l'adresse de votre site (Site URL et Redirect URLs).

## 4. Assistant IA (clé protégée côté serveur)
```
npm i -g supabase
supabase login
supabase link --project-ref VOTRE-REF
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy assistant
```

## 5. Mise en ligne
Déposez le dossier sur Netlify, Vercel ou Cloudflare Pages (fichier statique `index.html`). Pour tester en local : `npx serve .`

## Limites actuelles
- La synchronisation se fait à l'ouverture de la page : rechargez sur l'autre appareil pour voir les changements.
- L'export Word et le portfolio avec QR code ne sont pas encore faits.

# Ajira : structure et mise en route

## Fichiers
- `index.html` : structure de la page
- `css/style.css` : mise en forme
- `js/config.js` : adresse et clé publique Supabase
- `js/auth.js` : connexion (e-mail, Google, Apple)
- `js/app.js` : CV, lettre, signature, pièces, suivi, dossier

Déposer TOUS ces éléments (index.html + dossiers css et js) à la racine du dépôt GitHub Pages.

## Mémoire
Les données sont enregistrées à chaque modification : dans le navigateur (affichage immédiat au retour)
et dans le compte Supabase (synchronisation téléphone / ordinateur). La version la plus récente est reprise.
L'application rouvre aussi le dernier onglet utilisé.

## Supabase
Table `dossiers` et espace `pieces` : voir le SQL déjà exécuté (policies par utilisateur).
Authentication > URL Configuration : Site URL = https://patientkom97.github.io/dossier_emploi_complet/
Redirect URLs = https://patientkom97.github.io/**
Google et Apple : Authentication > Sign In / Providers (Apple demande un compte Apple Developer payant).

## Offre Premium (essai de 30 jours puis fonctions payantes)

Gratuit pour toujours : créer un CV, écrire une lettre, les télécharger en PDF.
Premium (après l’essai) : dossier complet (PDF fusionné / ZIP), signature, import d’un ancien CV, export Word.

### 1. Créer la table des abonnements (SQL Editor > New query > Run)
```sql
create table abonnements(
  user_id uuid primary key references auth.users on delete cascade,
  premium_until timestamptz not null,
  note text,
  updated_at timestamptz default now());
alter table abonnements enable row level security;
create policy "lecture perso" on abonnements for select using (auth.uid()=user_id);
```
Aucune règle d'écriture n'est créée : un utilisateur ne peut pas s'activer Premium lui-même.

### 2. Activer un abonné après paiement (remplacer l'e-mail et la référence)
```sql
insert into abonnements(user_id, premium_until, note)
select id, now() + interval '30 days', 'Mobile Money réf. XXXX'
from auth.users where email = 'client@exemple.com'
on conflict (user_id) do update
set premium_until = greatest(abonnements.premium_until, now()) + interval '30 days',
    note = excluded.note, updated_at = now();
```
Relancer la même requête à chaque renouvellement. Pour retirer l'accès :
`delete from abonnements where user_id = (select id from auth.users where email = 'client@exemple.com');`

### 3. Réglages dans js/config.js
TRIAL_DAYS, LAUNCH_DATE, PREMIUM_PRICE, PAY_INSTRUCTIONS (vos numéros Mobile Money), PAY_CONTACT (WhatsApp).
L'essai démarre à la création du compte, ou à LAUNCH_DATE pour les comptes plus anciens.


## Comptes : identité, connexion par téléphone / nom d'utilisateur
À l'inscription, l'utilisateur renseigne prénom, nom, nom d'utilisateur, e-mail, téléphone et mot de passe.
À la connexion, il peut saisir **e-mail, téléphone ou nom d'utilisateur** + mot de passe.

1. Supabase > SQL Editor > New query : coller le contenu de `sql/profils.sql` > Run (une seule fois).
2. Sans ce SQL, l'inscription et la connexion par e-mail marchent quand même ; seuls téléphone / nom d'utilisateur sont indisponibles.
3. Anciens comptes (créés avant) : connexion par e-mail uniquement (pas de profil).
4. Indicatif par défaut : `DEFAULT_CC` dans js/config.js (« 0812345678 » devient +243812345678).
5. Note : la recherche par nom d'utilisateur/téléphone renvoie l'e-mail au navigateur (compromis courant ; réduire en passant par une Edge Function si besoin).

## Paiement en ligne IntaSend (activation automatique de Premium)
1. js/config.js : `INTASEND_PUBLIC_KEY` (clé publique), `INTASEND_LIVE=false` (test) puis `true` en production.
2. Supabase > Edge Functions > Deploy a new function > nom exact `verifier-paiement` > coller `supabase/functions/verifier-paiement/index.ts` > Deploy.
   Dans les paramètres de la fonction, laisser « Verify JWT » activé.
3. Supabase > Edge Functions > Secrets : ajouter `INTASEND_SECRET_KEY` = clé secrète `ISSecretKey_test_...` (jamais dans le site).
   Optionnels : `INTASEND_LIVE=true` (production), `PREMIUM_AMOUNT=5`, `PREMIUM_DAYS=30`.
4. Test : bouton « Payer maintenant » dans la fenêtre Premium (mode test : aucun argent réel).
5. Production : approbation du compte IntaSend, puis clés `live`, `INTASEND_LIVE=true` des deux côtés.

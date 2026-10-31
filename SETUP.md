# Dossier Emploi : structure et mise en route

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

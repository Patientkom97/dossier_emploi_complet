// Configuration Supabase (la clé « publishable » est publique par conception)
const SB_URL='https://ncktrdsdmccwfqestdkk.supabase.co';
const SB_KEY='sb_publishable_rTwHXl1AUYkaxFy58OJHjw_h-KJYT9_';

// ---- Offre Premium (à adapter) ----
const TRIAL_DAYS=30;                 // durée de l'essai gratuit complet (les clés d'accès donnent Premium immédiatement)
const LAUNCH_DATE='2026-11-09';      // les comptes plus anciens démarrent leur essai à cette date
const PREMIUM_PRICE='5 USD par mois';  // prix affiché
const PREMIUM_DAYS=30;               // durée ajoutée par paiement (indicatif, voir SETUP.md)
const PAY_INSTRUCTIONS='Payez par Mobile Money (M-Pesa, Airtel Money ou Orange Money) au +243 XXX XXX XXX (nom du bénéficiaire : à compléter). Indiquez votre e-mail de compte comme référence.';
const PAY_CONTACT='243XXXXXXXXX';   // numéro WhatsApp pour envoyer la preuve de paiement (format international sans +)

// Indicatif pays par défaut (un numéro saisi « 0812345678 » devient +243812345678)
const DEFAULT_CC='243';

// Paiement en ligne IntaSend (clé PUBLIQUE uniquement ; la clé secrète va dans Supabase > Edge Functions > Secrets)
const INTASEND_PUBLIC_KEY='ISPubKey_test_6ec1cf55-2c01-4ece-8283-7d6224e871ca';
const INTASEND_LIVE=false;          // passer à true avec la clé ISPubKey_live_... en production
const PREMIUM_AMOUNT=5;             // doit correspondre à PREMIUM_AMOUNT de la fonction
const PREMIUM_CURRENCY='USD';

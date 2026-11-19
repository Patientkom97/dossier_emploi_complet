// Authentification : création de compte (formulaire), connexion par e-mail / téléphone / nom d'utilisateur, Google, Apple
// À capturer AVANT createClient : supabase-js efface le #fragment de l'adresse après lecture
const REC0 = /type=recovery/.test(location.hash + location.search);
const sb = supabase.createClient(SB_URL, SB_KEY);

// --- identifiants ---
const USER_RE = /^[a-z][a-z0-9._-]{2,19}$/;
function normPhone(raw) {
     let s = String(raw || '').replace(/[\s().-]/g, ''); if (!s) return '';
     if (s.startsWith('00')) s = '+' + s.slice(2);
     else if (s.startsWith('0')) s = '+' + DEFAULT_CC + s.slice(1);
     else if (!s.startsWith('+')) s = s.startsWith(DEFAULT_CC) ? '+' + s : '+' + DEFAULT_CC + s;
     return /^\+\d{8,15}$/.test(s) ? s : null
}
const looksPhone = v => /^\+?[\d\s().-]+$/.test(v.trim()) && v.replace(/\D/g, '').length >= 6;
// e-mail, téléphone ou nom d'utilisateur -> e-mail du compte (null si inconnu)
async function resolveEmail(ident) {
     const v = String(ident || '').trim(); if (!v) return null;
     if (v.includes('@')) return v;
     const key = looksPhone(v) ? normPhone(v) : v.toLowerCase(); if (!key) return null;
     const { data, error } = await sb.rpc('resoudre_identifiant', { ident: key });
     if (error) throw error; return data || null
}

// --- messages d'erreur en français ---
const tech = e => e ? ` [${[e.code, e.status].filter(Boolean).join(' / ') || '?'}]` : '';
const frErr = (e, A) => {
     const m = (e && (e.message || '')) + ' ' + (e && e.code || '');
     if (/Invalid login credentials|invalid_credentials/i.test(m)) return "Identifiant ou mot de passe incorrect. Touchez l'œil pour voir le mot de passe saisi. Si le compte a été créé avec Google ou Apple, utilisez ce bouton. Sinon, « Mot de passe oublié ? »." + tech(e);
     if (/not confirmed|email_not_confirmed/i.test(m)) { if (A) A('rs').style.display = ''; return "Adresse e-mail non confirmée : cliquez sur le lien reçu par e-mail, ou sur « Renvoyer l'e-mail de confirmation »." }
     if (/already registered|user_already_exists/i.test(m)) return "Cet e-mail a déjà un compte : retournez à la connexion (ou « Mot de passe oublié ? »).";
     if (/rate limit|over_email_send_rate_limit|over_request_rate_limit/i.test(m)) return "Trop de demandes : patientez environ une heure, ou connectez-vous si le compte existe déjà.";
     if (/at least 6|weak_password/i.test(m)) return "Le mot de passe doit contenir au moins 6 caractères.";
     if (/resoudre_identifiant|schema cache|does not exist|PGRST/i.test(m)) return "Connexion par téléphone ou nom d'utilisateur indisponible : le SQL des profils n'est pas encore installé (voir SETUP.md). Utilisez votre e-mail.";
     console.warn('Erreur auth', e); return 'Erreur : ' + (e && e.message || 'inconnue') + (e && e.code ? ' (' + e.code + ')' : '') + (e && e.status ? ' – HTTP ' + e.status : '')
};

async function authGate() {
     const A = id => document.getElementById(id), msg = t => A('amsg').textContent = t, rmsg = t => { A('rmsg').textContent = t; A('rmsg').scrollIntoView({ block: 'nearest' }) };
     let session = null;
     try { const r = await sb.auth.getSession(); session = r.data.session; if (r.error) throw r.error }
     catch (x) { console.warn('Session invalide, nettoyage', x); session = null; try { await sb.auth.signOut({ scope: 'local' }) } catch (y) { } }
     const REC = REC0;
     if (!session || REC) {
          A('auth').style.display = 'flex';
          const back = location.origin + location.pathname;
          const eye = (btn, inp) => btn.onclick = () => { const v = inp.type === 'password'; inp.type = v ? 'text' : 'password'; btn.classList.toggle('on', v); btn.setAttribute('aria-label', v ? 'Masquer le mot de passe' : 'Afficher le mot de passe') };
          eye(A('shw'), A('apw')); document.querySelectorAll('#viewReg .eye,#viewRec .eye').forEach(b => eye(b, b.previousElementSibling));

          // ----- lien « mot de passe oublié » : saisie du nouveau mot de passe -----
          if (REC && session) {
               A('viewLogin').hidden = true; A('viewRec').hidden = false;
               A('viewRec').onsubmit = async ev => {
                    ev.preventDefault(); const p = A('n_pw').value, q = A('n_pw2').value, m = t => A('nmsg').textContent = t;
                    if (p.length < 6) return m('Le mot de passe doit contenir au moins 6 caractères.'); if (p !== q) return m('Les deux mots de passe ne sont pas identiques.');
                    m('Enregistrement…'); const { error } = await sb.auth.updateUser({ password: p });
                    if (error) return m(frErr(error, null)); m('Mot de passe enregistré. Ouverture…'); history.replaceState(null, '', location.pathname); setTimeout(() => location.reload(), 900)
               };
               return null
          }
          // ----- vues -----
          const show = reg => { A('viewLogin').hidden = reg; A('viewReg').hidden = !reg; (reg ? A('r_prenom') : A('aem')).focus() };
          A('su').onclick = () => show(true); A('r_back').onclick = () => show(false);

          // ----- connexion -----
          A('apw').onkeydown = ev => { if (ev.key === 'Enter') A('li').click() };
          A('aem').onkeydown = ev => { if (ev.key === 'Enter') A('apw').focus() };
          A('li').onclick = async () => {
               const ident = A('aem').value, pw = A('apw').value;
               if (!ident.trim() || !pw) return msg('Entrez votre identifiant et votre mot de passe.');
               msg('Connexion…'); A('rs').style.display = 'none';
               try {
                    const email = await resolveEmail(ident);
                    if (!email) return msg(frErr({ code: 'invalid_credentials' }, A));
                    try { await sb.auth.signOut({ scope: 'local' }) } catch (y) { }
                    let { error } = await sb.auth.signInWithPassword({ email, password: pw });
                    if (error && pw !== pw.trim()) ({ error } = await sb.auth.signInWithPassword({ email, password: pw.trim() }));
                    error ? msg(frErr(error, A)) : location.reload()
               }
               catch (x) { msg(frErr(x, A)) }
          };
          A('rs').onclick = async () => { try { const email = await resolveEmail(A('aem').value); const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: back } }); msg(error ? frErr(error, A) : 'E-mail de confirmation renvoyé : vérifiez votre boîte (et les courriers indésirables).') } catch (x) { msg(frErr(x, A)) } };
          A('fg').onclick = async () => {
               try {
                    const email = await resolveEmail(A('aem').value); if (!email) return msg("Entrez d'abord votre e-mail, téléphone ou nom d'utilisateur ci-dessus.");
                    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: back }); msg(error ? frErr(error, A) : "E-mail de réinitialisation envoyé à l'adresse du compte.")
               } catch (x) { msg(frErr(x, A)) }
          };
          A('gg').onclick = () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back } }).then(r => r.error && msg('Erreur : ' + r.error.message));
          A('r_gg').onclick = () => A('gg').click(); A('r_ap').onclick = () => A('ap').click();
          A('ap').onclick = () => sb.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: back } }).then(r => r.error && msg('Erreur : ' + r.error.message));

          // ----- création de compte -----
          A('viewReg').onsubmit = async ev => {
               ev.preventDefault();
               const prenom = A('r_prenom').value.trim(), nom = A('r_nom').value.trim(), user = A('r_user').value.trim().toLowerCase(), email = A('r_email').value.trim(), telRaw = A('r_tel').value.trim(), pw = A('r_pw').value, pw2 = A('r_pw2').value;
               A('r_resend').style.display = 'none';
               if (!prenom || !nom) return rmsg('Entrez votre prénom et votre nom.');
               if (!USER_RE.test(user)) return rmsg("Nom d'utilisateur invalide : 3 à 20 caractères, il commence par une lettre (lettres, chiffres, point, tiret).");
               if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return rmsg('Adresse e-mail invalide.');
               const tel = normPhone(telRaw); if (!telRaw || tel === null) return rmsg('Numéro de téléphone invalide (8 à 15 chiffres, ex. +243 812 345 678).');
               if (pw.length < 6) return rmsg('Le mot de passe doit contenir au moins 6 caractères.');
               if (pw !== pw2) return rmsg('Les deux mots de passe ne sont pas identiques.');
               A('r_go').disabled = true; rmsg('Création du compte…');
               try {
                    const { data: dispo, error: de } = await sb.rpc('identifiant_dispo', { p_username: user, p_tel: tel });
                    if (de) console.warn('identifiant_dispo indisponible (SQL des profils non installé ?)', de);
                    else {
                         if (dispo && dispo.username === false) return rmsg("Ce nom d'utilisateur est déjà pris : choisissez-en un autre.");
                         if (dispo && dispo.telephone === false) return rmsg('Ce numéro de téléphone est déjà utilisé par un compte : connectez-vous avec.')
                    }
                    const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: back, data: { prenom, nom, username: user, telephone: tel } } });
                    if (error) return rmsg(frErr(error, null));
                    if (data.session) return location.reload();
                    if (data.user && data.user.identities && data.user.identities.length === 0) return rmsg('Cet e-mail a déjà un compte : retournez à la connexion (ou « Mot de passe oublié ? »).');
                    rmsg('Compte créé. Un e-mail de confirmation vous a été envoyé : cliquez sur le lien, puis connectez-vous avec votre e-mail, votre téléphone ou votre nom d\'utilisateur.');
                    A('r_resend').style.display = '';
                    A('r_resend').onclick = async () => { const { error: e2 } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: back } }); rmsg(e2 ? frErr(e2, null) : 'E-mail de confirmation renvoyé.') };
               } catch (x) { rmsg('Erreur réseau : ' + x.message) }
               finally { A('r_go').disabled = false }
          };
          return null
     }
     document.body.classList.add('in'); const md = session.user.user_metadata || {}; A('who').textContent = md.username || session.user.email || '';
     A('out').onclick = async () => { await sb.auth.signOut(); location.reload() };
     return session.user
}

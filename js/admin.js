// Terminal administrateur : génération et suivi des clés d'accès Premium
const sb=supabase.createClient(SB_URL,SB_KEY),$=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let last='';
const SITE=location.origin+location.pathname.replace(/admin\.html$/,'');
const msgWA=(code,j)=>`Bonjour, merci pour votre paiement ✅\nVotre clé d'accès Ajira Premium (${j} jours) :\n\n${code}\n\nPour l'activer : ouvrez ${SITE}, connectez-vous, cliquez sur « Passer à Premium » puis saisissez cette clé dans « J'ai une clé d'accès ».`;
async function init(){const{data:{session}}=await sb.auth.getSession();
 if(!session){$('aLogin').hidden=false;$('aApp').hidden=true;return}
 const{data:ok,error}=await sb.rpc('est_admin');
 if(error||!ok){await sb.auth.signOut();$('aLogin').hidden=false;$('aApp').hidden=true;$('aMsg').textContent=error?"SQL des clés non installé (voir sql/cles.sql).":"Ce compte n'est pas administrateur.";return}
 $('aLogin').hidden=true;$('aApp').hidden=false;$('aWho').textContent=session.user.email;load()}
$('agoBtn').onclick=async()=>{const{error}=await sb.auth.signInWithPassword({email:$('ae').value.trim(),password:$('ap').value});if(error)$('aMsg').textContent='Identifiants incorrects.';else{$('aMsg').textContent='';init()}};
$('ap').onkeydown=e=>{if(e.key==='Enter')$('agoBtn').click()};
$('aOut').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('aGen').onclick=async()=>{const j=+$('aj').value,n=$('an').value;$('aGen').disabled=true;
 const{data,error}=await sb.rpc('creer_cle',{p_jours:j,p_note:n});$('aGen').disabled=false;
 if(error)return alert('Erreur : '+error.message);
 last=data;$('aCode').textContent=data;$('aOutBox').hidden=false;$('aCopied').textContent='';$('aOutBox').dataset.j=j;load()};
const cp=async(t,ok)=>{try{await navigator.clipboard.writeText(t);$('aCopied').textContent=ok}catch(x){$('aCopied').textContent='Copie impossible : sélectionnez le texte à la main.'}};
$('aCopy').onclick=()=>cp(last,'Clé copiée.');
$('aCopyMsg').onclick=()=>cp(msgWA(last,$('aOutBox').dataset.j),'Message copié : collez-le dans WhatsApp.');
async function load(){const{data,error}=await sb.rpc('lister_cles');if(error)return $('aStat').textContent='Erreur : '+error.message;
 const nu=data.filter(k=>k.utilise_par_email).length;$('aStat').textContent=`${data.length} clé(s), ${nu} utilisée(s).`;
 $('aTab').tBodies[0].innerHTML=data.map(k=>{const st=k.utilise_par_email?`<span class="tag us">Utilisée par ${esc(k.utilise_par_email)}</span>`:k.revoquee?'<span class="tag rv">Annulée</span>':'<span class="tag ok">Disponible</span>';
  return`<tr><td><code>${esc(k.code)}</code></td><td>${k.jours} j</td><td>${esc(k.note)}</td><td>${new Date(k.cree_le).toLocaleDateString('fr-FR')}</td><td>${st}</td><td>${!k.utilise_par_email&&!k.revoquee?`<button class="btn alt rv" data-c="${esc(k.code)}" style="margin:0;padding:3px 8px">Annuler</button>`:''}</td></tr>`}).join('')}
$('aTab').onclick=async e=>{const b=e.target.closest('.rv');if(!b||!confirm('Annuler la clé '+b.dataset.c+' ?'))return;await sb.rpc('revoquer_cle',{p_code:b.dataset.c});load()};
init();

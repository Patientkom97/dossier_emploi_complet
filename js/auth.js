// Authentification : e-mail + mot de passe, Google, Apple
const sb=supabase.createClient(SB_URL,SB_KEY);
async function authGate(){const A=id=>document.getElementById(id),msg=t=>A('amsg').textContent=t;
const{data:{session}}=await sb.auth.getSession();
if(!session){A('auth').style.display='flex';
const cred=()=>({email:A('aem').value.trim(),password:A('apw').value}),back=location.origin+location.pathname;
A('li').onclick=async()=>{msg('Connexion…');try{const{error}=await sb.auth.signInWithPassword(cred());error?msg('Erreur : '+error.message):location.reload()}catch(x){msg('Erreur réseau : '+x.message)}};
A('su').onclick=async()=>{const c=cred();if(!c.email||c.password.length<6)return msg('Entrez un e-mail valide et un mot de passe de 6 caractères minimum.');msg('Création du compte…');
try{const{data,error}=await sb.auth.signUp({...c,options:{emailRedirectTo:back}});if(error)return msg('Erreur : '+error.message);
if(data.session)return location.reload();
if(data.user&&data.user.identities&&data.user.identities.length===0)return msg('Cet e-mail a déjà un compte : cliquez sur Se connecter.');
msg('Compte créé. Un e-mail de confirmation vous a été envoyé : cliquez sur le lien, puis connectez-vous.')}catch(x){msg('Erreur réseau : '+x.message)}};
A('gg').onclick=()=>sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:back}}).then(r=>r.error&&msg('Erreur : '+r.error.message));
A('ap').onclick=()=>sb.auth.signInWithOAuth({provider:'apple',options:{redirectTo:back}}).then(r=>r.error&&msg('Erreur : '+r.error.message));
A('fg').onclick=async()=>{const{error}=await sb.auth.resetPasswordForEmail(A('aem').value.trim(),{redirectTo:back});msg(error?error.message:'E-mail de réinitialisation envoyé.')};
return null}
document.body.classList.add('in');A('who').textContent=session.user.email||'';
A('out').onclick=async()=>{await sb.auth.signOut();location.reload()};
return session.user}

// Application : CV, lettre, signature, pièces, suivi, dossier
(async()=>{
const U=await authGate();if(!U)return;
const $=id=>document.getElementById(id),e=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const br=s=>e(s).replace(/\n/g,'<br>');
let S={cv:{},lt:'',lco:'',lpo:'',lfont:'Georgia,serif',lsig:'left',sig:null,sz:160,apps:[]},files=[];
{const{data:row}=await sb.from('dossiers').select('data').eq('user_id',U.id).maybeSingle();
let loc=null;try{loc=JSON.parse(localStorage.getItem('de_'+U.id))}catch(x){}
const cl=row&&row.data,best=(loc&&(!cl||(loc.upd||0)>(cl.upd||0)))?loc:cl;if(best)S=Object.assign(S,best);
const{data:ls}=await sb.storage.from('pieces').list(U.id);(ls||[]).forEach(n=>files.push({name:n.name.replace(/^\d+-/,''),path:U.id+'/'+n.name,on:true}))}
let tm;const hm=()=>new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
const push=async()=>{try{const{error}=await sb.from('dossiers').upsert({user_id:U.id,data:S,updated_at:new Date().toISOString()});$('sav').textContent=error?'Sauvegardé sur cet appareil':'Enregistré à '+hm()}catch(x){$('sav').textContent='Sauvegardé sur cet appareil'}};
const save=()=>{S.upd=Date.now();try{localStorage.setItem('de_'+U.id,JSON.stringify(S))}catch(x){}$('sav').textContent='Enregistrement…';clearTimeout(tm);tm=setTimeout(push,800)};
addEventListener('pagehide',()=>{clearTimeout(tm);push()});
const getBlob=async o=>o.f||(await sb.storage.from('pieces').download(o.path)).data;
// onglets
const tabs=[['cv','CV'],['lt','Lettre'],['sg','Signature'],['pj','Pièces'],['sv','Suivi'],['dp','Dossier']];
$('nav').innerHTML=tabs.map(t=>`<button data-t="${t[0]}">${t[1]}</button>`).join('');
function go(t){try{localStorage.setItem('de_tab',t)}catch(x){}document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id===t));document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));if(t==='dp')check()}
$('nav').onclick=ev=>{if(ev.target.dataset.t)go(ev.target.dataset.t)};const lastTab=(()=>{try{return localStorage.getItem('de_tab')}catch(x){}})();go(tabs.some(x=>x[0]===lastTab)?lastTab:'cv');
// CV
const F=['name','title','email','phone','city','summary','skills','hobbies','other','oath'];
S.cv.xp=S.cv.xp||[{}];
const mvB=(a,i)=>a.length>1?`<button class="btn alt" data-mv="-1" ${i?'':'disabled'}>↑ Monter</button><button class="btn alt" data-mv="1" ${i<a.length-1?'':'disabled'}>↓ Descendre</button>`:'';
const mois=v=>{if(!v)return'';const[a,m]=v.split('-');return new Date(a,m-1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})};
const xpDate=x=>[mois(x.d1),x.cur?"aujourd'hui":mois(x.d2)].filter(Boolean).join(' – ');
const expTxt=()=>S.cv.xp.map(x=>`${x.po||''}, ${x.co||''} (${xpDate(x)}) : ${x.tasks||''}`).join('\n');
function xpR(){$('xps').innerHTML=S.cv.xp.map((x,i)=>`<fieldset style="border:1px solid var(--line);border-radius:6px;margin:8px 0;padding:4px 12px 12px" data-i="${i}"><legend>Expérience ${i+1}</legend>
<div class="row"><div><label>Poste</label><input data-k="po" value="${e(x.po)}"></div><div><label>Entreprise ou organisation</label><input data-k="co" value="${e(x.co)}"></div></div>
<div class="row"><div><label>Début</label><input type="month" data-k="d1" value="${e(x.d1)}"></div><div><label>Fin</label><input type="month" data-k="d2" value="${e(x.d2)}" ${x.cur?'disabled':''}></div></div>
<label style="font-weight:400"><input type="checkbox" data-k="cur" style="width:auto" ${x.cur?'checked':''}> Toujours en cours</label>
<label>Tâches et responsabilités (une par ligne)</label><textarea data-k="tasks">${e(x.tasks)}</textarea>
${mvB(S.cv.xp,i)}${S.cv.xp.length>1?'<button class="btn alt" data-rm="1">Supprimer cette expérience</button>':''}</fieldset>`).join('')}
$('addXp').onclick=()=>{S.cv.xp.push({});save();xpR();cvR()};
$('xps').oninput=ev=>{const k=ev.target.dataset.k;if(!k)return;const x=S.cv.xp[+ev.target.closest('fieldset').dataset.i];x[k]=k==='cur'?ev.target.checked:ev.target.value;save();if(k==='cur')xpR();cvR()};
$('xps').onclick=ev=>{if(ev.target.dataset.rm){S.cv.xp.splice(+ev.target.closest('fieldset').dataset.i,1);save();xpR();cvR()}};
xpR();
S.cv.ed=S.cv.ed||[{}];if(S.cv.edu&&!S.cv.ed.some(x=>x.di||x.et)){S.cv.ed=[{info:S.cv.edu}];delete S.cv.edu}
const edDate=x=>[mois(x.d1),x.cur?'en cours':mois(x.d2)].filter(Boolean).join(' – ');
const edTxt=()=>S.cv.ed.map(x=>`${x.di||''}, ${x.et||''} (${edDate(x)}) ${x.info||''}`).join('\n');
function edR(){$('eds').innerHTML=S.cv.ed.map((x,i)=>`<fieldset style="border:1px solid var(--line);border-radius:6px;margin:8px 0;padding:4px 12px 12px" data-i="${i}"><legend>Études ${i+1}</legend>
<div class="row"><div><label>Diplôme, niveau ou classe</label><input data-k="di" value="${e(x.di)}" placeholder="Licence en Sciences Commerciales"></div><div><label>Établissement</label><input data-k="et" value="${e(x.et)}"></div></div>
<div class="row"><div><label>Début</label><input type="month" data-k="d1" value="${e(x.d1)}"></div><div><label>Fin</label><input type="month" data-k="d2" value="${e(x.d2)}" ${x.cur?'disabled':''}></div></div>
<label style="font-weight:400"><input type="checkbox" data-k="cur" style="width:auto" ${x.cur?'checked':''}> Toujours en cours</label>
<label>Option, mention, détails (un point par ligne)</label><textarea data-k="info">${e(x.info)}</textarea>
${mvB(S.cv.ed,i)}${S.cv.ed.length>1?'<button class="btn alt" data-rm="1">Supprimer cette formation</button>':''}</fieldset>`).join('')}
$('addEd').onclick=()=>{S.cv.ed.push({});save();edR();cvR()};
$('eds').oninput=ev=>{const k=ev.target.dataset.k;if(!k)return;const x=S.cv.ed[+ev.target.closest('fieldset').dataset.i];x[k]=k==='cur'?ev.target.checked:ev.target.value;save();if(k==='cur')edR();cvR()};
$('eds').onclick=ev=>{if(ev.target.dataset.rm){S.cv.ed.splice(+ev.target.closest('fieldset').dataset.i,1);save();edR();cvR()}};
edR();
const NV=['Langue maternelle','Courant','Bon','Intermédiaire','Notions'],NI=['Excellent','Bon','Moyen','Notions'];
const LS={
fc:{t:'Formation',f:[['di','Intitulé de la formation','i'],['et','Organisme','i'],['d1','Début','m'],['d2','Fin','m'],['cur','Toujours en cours','c'],['info','Détails (un point par ligne)','t']]},
lg:{t:'Langue',f:[['la','Langue','i'],['nv','Niveau','s',NV]]},
it:{t:'Compétence',f:[['lo','Logiciel ou compétence (Word, Excel, Internet…)','i'],['nv','Niveau','s',NI]]},
rf:{t:'Référence',f:[['no','Nom et prénom','i'],['fo','Fonction','i'],['or','Entreprise ou organisation','i'],['te','Téléphone','i'],['em','E-mail','i']]}};
function lsR(k){$('b_'+k).innerHTML=S.cv[k].map((x,i)=>`<fieldset style="border:1px solid var(--line);border-radius:6px;margin:8px 0;padding:4px 12px 12px" data-i="${i}"><legend>${LS[k].t} ${i+1}</legend><div class="row">${LS[k].f.map(([f,lb,ty,op])=>ty==='c'?`<label style="font-weight:400;flex:1 1 100%"><input type="checkbox" data-k="${f}" style="width:auto" ${x[f]?'checked':''}> ${lb}</label>`:`<div style="${ty==='t'?'flex:1 1 100%':''}"><label>${lb}</label>${ty==='t'?`<textarea data-k="${f}">${e(x[f])}</textarea>`:ty==='s'?`<select data-k="${f}"><option value=""></option>${op.map(o=>`<option ${x[f]===o?'selected':''}>${o}</option>`).join('')}</select>`:`<input ${ty==='m'?'type="month"':''} data-k="${f}" value="${e(x[f])}" ${f==='d2'&&x.cur?'disabled':''}>`}</div>`).join('')}</div>${mvB(S.cv[k],i)}<button class="btn alt" data-rm="1">Supprimer</button></fieldset>`).join('')}
Object.keys(LS).forEach(k=>{S.cv[k]=S.cv[k]||[];const b=$('b_'+k);
b.oninput=ev=>{const kk=ev.target.dataset.k;if(!kk)return;const x=S.cv[k][+ev.target.closest('fieldset').dataset.i];x[kk]=ev.target.type==='checkbox'?ev.target.checked:ev.target.value;save();if(kk==='cur')lsR(k);cvR()};
b.onclick=ev=>{if(ev.target.dataset.rm){S.cv[k].splice(+ev.target.closest('fieldset').dataset.i,1);save();lsR(k);cvR()}};
$('add_'+k).onclick=()=>{S.cv[k].push({});save();lsR(k);cvR()};lsR(k)});
const bul=t=>t?`<ul style="margin:3px 0 0;padding-left:16px">${t.split('\n').filter(l=>l.trim()).map(l=>`<li>${e(l.replace(/^[-•*]\s*/,''))}</li>`).join('')}</ul>`:'';
function extra(c){const A=k=>(c[k]||[]).filter(x=>Object.values(x).some(v=>v&&v!==true));const fc=A('fc'),lg=A('lg'),it=A('it'),rf=A('rf');let h='';
if(fc.length)h+='<h4>Formations complémentaires</h4>'+fc.map(x=>`<div class="xp" style="margin-bottom:8px"><b>${e(x.di)}</b>${x.di&&x.et?' – ':''}${e(x.et)}<div class="sub" style="font-size:10px">${e(edDate(x))}</div>${bul(x.info)}</div>`).join('');
if(lg.length)h+='<h4>Connaissances linguistiques</h4>'+lg.map(x=>`<span class="chip">${e(x.la)}${x.nv?' : '+e(x.nv):''}</span>`).join('');
if(it.length)h+='<h4>Maîtrise informatique</h4>'+it.map(x=>`<span class="chip">${e(x.lo)}${x.nv?' : '+e(x.nv):''}</span>`).join('');
if(c.hobbies)h+=`<h4>Centres d'intérêt</h4>${e(c.hobbies)}`;
if(c.other)h+=`<h4>Autres informations</h4>${br(c.other)}`;
if(rf.length)h+='<h4>Personnes de référence</h4>'+rf.map(x=>`<div class="xp" style="margin-bottom:6px"><b>${e(x.no)}</b>${x.fo?', '+e(x.fo):''}${x.or?' – '+e(x.or):''}<br>${[x.te&&'Tél : '+e(x.te),x.em&&e(x.em)].filter(Boolean).join(' | ')}</div>`).join('');
if(c.oathOn!==false&&c.oath){const d=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
h+=`<div class="xp" style="margin-top:18px"><p style="margin:0 0 8px">${e(c.oath)}</p><div style="text-align:right">${c.city?'Fait à '+e(c.city)+', le ':'Le '}${d}<br><b>${e(c.name)}</b>${S.sig?`<br><img src="${S.sig}" style="width:${S.sz*.7}px" alt="Signature">`:''}</div></div>`}
return h}
const mvI=(a,i,d)=>{const j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]]};
[['xps','xp',xpR],['eds','ed',edR],...Object.keys(LS).map(k=>['b_'+k,k,()=>lsR(k)])].forEach(([id,k,r])=>$(id).addEventListener('click',ev=>{const m=ev.target.dataset.mv;if(!m)return;mvI(S.cv[k],+ev.target.closest('fieldset').dataset.i,+m);save();r();cvR()}));
function pgs(){const el=$('cvPrev');if(!el||!el.clientWidth)return;const ph=el.clientWidth*273/210,n=Math.max(1,Math.ceil((el.offsetHeight-6)/ph));
for(let i=1;i<n;i++){const d=document.createElement('div');d.style.cssText=`position:absolute;left:0;right:0;top:${i*ph}px;border-top:2px dashed #e4572e;font-size:9px;color:#e4572e;text-align:right;padding-right:6px`;d.textContent='Page '+(i+1);el.appendChild(d)}
$('pgn').textContent=n+(n>1?' pages':' page')}
F.forEach(k=>{$(k).value=S.cv[k]||'';$(k).oninput=()=>{S.cv[k]=$(k).value;save();cvR();ltR()}});
const OATH="Je jure sur mon honneur que les informations ci-haut fournies sont exactes et conformes à la réalité.";
if(S.cv.oath==null){S.cv.oath=OATH;$('oath').value=OATH}
$('oathOn').checked=S.cv.oathOn!==false;$('oathOn').onchange=()=>{S.cv.oathOn=$('oathOn').checked;save();cvR()};
const mx=()=>Math.round((S.cv.mx||17)*3.05);
$('mx').value=S.cv.mx||17;$('mxv').textContent=$('mx').value;$('mx').oninput=()=>{S.cv.mx=+$('mx').value;$('mxv').textContent=S.cv.mx;save();cvR();ltR()};
$('tpl').value=S.cv.tpl||'t1';$('tpl').onchange=()=>{S.cv.tpl=$('tpl').value;save();cvR()};
$('photo').onchange=ev=>rd(ev.target.files[0],d=>{S.cv.photo=d;cvR()});
function rd(f,cb){if(!f)return;const r=new FileReader();r.onload=()=>cb(r.result);r.readAsDataURL(f)}
function cvHtml(t){const c=S.cv;return `<div class="paper ${t||c.tpl||'t1'}" style="--mx:${mx()}px"><div class="hd">${c.photo?`<img src="${c.photo}" alt="">`:''}<div><h3>${e(c.name)||'Votre nom'}</h3><div class="sub">${e(c.title)}</div><div class="sub">${[c.email,c.phone,c.city].filter(Boolean).map(e).join(' | ')}</div></div></div>
${c.summary?`<h4>Profil</h4>${br(c.summary)}`:''}${c.xp.some(x=>x.po||x.co)?`<h4>Expériences</h4>${c.xp.filter(x=>x.po||x.co).map(x=>`<div class="xp" style="margin-bottom:8px"><b>${e(x.po)}</b>${x.po&&x.co?' – ':''}${e(x.co)}<div class="sub" style="font-size:10px">${e(xpDate(x))}</div>${x.tasks?`<ul style="margin:3px 0 0;padding-left:16px">${x.tasks.split('\n').filter(t=>t.trim()).map(t=>`<li>${e(t.replace(/^[-•*]\s*/,''))}</li>`).join('')}</ul>`:''}</div>`).join('')}`:''}${(c.ed||[]).some(x=>x.di||x.et)?`<h4>Parcours académique</h4>${c.ed.filter(x=>x.di||x.et).map(x=>`<div class="xp" style="margin-bottom:8px"><b>${e(x.di)}</b>${x.di&&x.et?' – ':''}${e(x.et)}<div class="sub" style="font-size:10px">${e(edDate(x))}</div>${x.info?`<ul style="margin:3px 0 0;padding-left:16px">${x.info.split('\n').filter(t=>t.trim()).map(t=>`<li>${e(t.replace(/^[-•*]\s*/,''))}</li>`).join('')}</ul>`:''}</div>`).join('')}`:''}
${c.skills?`<h4>Compétences</h4>${c.skills.split(',').filter(s=>s.trim()).map(s=>`<span class="chip">${e(s.trim())}</span>`).join('')}`:''}${extra(c)}</div>`}
const TPL=[['t1','Classique'],['t2','Moderne'],['t3','Sobre'],['t4','Marine'],['t5','Minimal'],['t6','Corail']];
function galR(){$('gal').innerHTML=TPL.map(t=>`<button data-t="${t[0]}" class="${(S.cv.tpl||'t1')===t[0]?'on':''}"><div class="th"><div>${cvHtml(t[0])}</div></div>${t[1]}</button>`).join('')}
$('gal').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;S.cv.tpl=b.dataset.t;$('tpl').value=b.dataset.t;save();cvR()};
function cvR(){$('cvPrev').outerHTML=cvHtml().replace('class="paper','id="cvPrev" class="paper');galR();pgs()}
// Lettre
['lrec','lco','ladr','lpo','lfont','lsig'].forEach(k=>{$(k).value=S[k]||$(k).value;$(k).oninput=()=>{S[k]=$(k).value;save();ltR()}});
$('ltxt').innerHTML=S.lt;$('ltxt').oninput=()=>{S.lt=$('ltxt').innerHTML;save();ltR()};
document.querySelectorAll('[data-f]').forEach(b=>b.onmousedown=ev=>{ev.preventDefault();document.execCommand(b.dataset.f)});
function ltHtml(){const c=S.cv,d=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
const al=S.lsig==='left'?'left':'right';
const sg=S.lsig!=='none'?`<div style="margin-top:18px;text-align:${al}"><b>${e(c.name)}</b>${S.sig?`<br><img src="${S.sig}" style="width:${S.sz*.8}px" alt="Signature">`:''}</div>`:'';
const dest=(S.lrec||S.lco||S.ladr)?`<div style="margin:26px 0 0 auto;width:60%;text-align:right">${S.lrec?`<b>À l'attention de ${e(S.lrec)}</b><br>`:''}${e(S.lco)}${S.lco?'<br>':''}${S.ladr?`<b><u>${e(S.ladr)}</u></b>`:''}</div>`:'';
return `<div class="paper" style="--mx:${mx()}px;font-family:${S.lfont};font-size:11.5px;aspect-ratio:auto;min-height:0;overflow:visible"><div style="display:flex;justify-content:space-between;gap:12px"><div><b>${e(c.name)}</b><br>${e(c.title)}${c.title?'<br>':''}${c.phone?'Téléphone : '+e(c.phone)+'<br>':''}${c.email?'E-mail : '+e(c.email):''}</div><div style="text-align:right;white-space:nowrap">${c.city?e(c.city)+', ':''}le ${d}</div></div>${dest}
<div style="margin:22px 0 18px;border-left:4px solid #1d3557;background:#eef1f6;padding:4px 8px"><u><b>Objet</b></u> : <b>${e(S.lpo)||'…'}</b></div><div style="text-align:justify">${S.lt||'Rédigez votre lettre ici…'}</div>${sg}</div>`}
function ltR(){$('ltPrev').outerHTML=ltHtml().replace('class="paper"','id="ltPrev" class="paper"')}
// Signature
const cv=$('cnv'),cx=cv.getContext('2d');let dr=false;cx.lineWidth=3;cx.lineCap='round';cx.strokeStyle='#111';
const pt=ev=>{const r=cv.getBoundingClientRect();return[(ev.clientX-r.left)*cv.width/r.width,(ev.clientY-r.top)*cv.height/r.height]};
cv.onpointerdown=ev=>{dr=true;const p=pt(ev);cx.beginPath();cx.moveTo(...p);cv.setPointerCapture(ev.pointerId)};
cv.onpointermove=ev=>{if(dr){cx.lineTo(...pt(ev));cx.stroke()}};cv.onpointerup=()=>dr=false;
$('clr').onclick=()=>cx.clearRect(0,0,cv.width,cv.height);
$('saveSig').onclick=()=>{S.sig=cv.toDataURL();sigR()};
$('sigFile').onchange=ev=>rd(ev.target.files[0],d=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const p=x.getImageData(0,0,c.width,c.height),a=p.data;
for(let i=0;i<a.length;i+=4){const l=.3*a[i]+.59*a[i+1]+.11*a[i+2];if(l>170)a[i+3]=0}x.putImageData(p,0,0);S.sig=c.toDataURL();sigR()};im.src=d});
$('sz').value=S.sz;$('sz').oninput=()=>{S.sz=+$('sz').value;sigR()};
function sigR(){$('szv').textContent=S.sz;$('sigPrev').innerHTML=S.sig?`<img src="${S.sig}" style="width:${S.sz}px" alt="Signature">`:'<span class="hint">Aucune signature</span>';save();ltR()}
// Pièces
$('fileIn').onchange=async ev=>{for(const f of [...ev.target.files]){const path=U.id+'/'+Date.now()+'-'+f.name;const{error}=await sb.storage.from('pieces').upload(path,f);if(!error)files.push({f,name:f.name,path,on:true})}ev.target.value='';fl()};
function fl(){$('fileList').innerHTML=files.length?files.map((o,i)=>`<li><label style="margin:0;font-weight:400"><input type="checkbox" data-i="${i}" ${o.on?'checked':''} style="width:auto"> ${e(o.name)}</label><button class="btn alt" data-d="${i}" style="margin:0">Retirer</button></li>`).join(''):'<li class="hint">Aucun fichier pour le moment.</li>'}
$('fileList').onclick=ev=>{const d=ev.target.dataset.d;if(d!==undefined){const o=files.splice(+d,1)[0];sb.storage.from('pieces').remove([o.path]);fl()}};
$('fileList').onchange=ev=>{files[+ev.target.dataset.i].on=ev.target.checked};fl();
// IA
// Suivi
const fd=d=>d?new Date(d).toLocaleDateString('fr-FR'):'';
function apR(){const today=new Date().toISOString().slice(0,10);$('apps').innerHTML=S.apps.length?S.apps.map((a,i)=>`<tr><td>${e(a.co)}</td><td>${e(a.po)}</td><td>${fd(a.da)}</td><td><select data-s="1" data-i="${i}">${['Envoyée','En attente','Entretien','Refusée','Acceptée'].map(o=>`<option ${a.st===o?'selected':''}>${o}</option>`).join('')}</select></td><td>${fd(a.re)}${a.re&&a.re<=today&&['Envoyée','En attente'].includes(a.st)?' <b>(à relancer)</b>':''}</td><td>${br(a.no)}</td><td><button class="btn alt" data-x="${i}" style="margin:0">Supprimer</button></td></tr>`).join(''):'<tr><td colspan="7" class="hint">Ajoutez votre première candidature ci-dessus.</td></tr>'}
$('addApp').onclick=()=>{if(!$('a1').value.trim())return;S.apps.push({co:$('a1').value,po:$('a2').value,da:$('a3').value,st:$('a4').value,re:$('a5').value,no:$('a6').value});['a1','a2','a3','a5','a6'].forEach(k=>$(k).value='');save();apR()};
$('apps').onclick=ev=>{if(ev.target.dataset.x){S.apps.splice(+ev.target.dataset.x,1);save();apR()}};
$('apps').onchange=ev=>{if(ev.target.dataset.s){S.apps[+ev.target.dataset.i].st=ev.target.value;save();apR()}};
// Dossier
function check(){const ok=[[S.lt,'Lettre de motivation'],[S.cv.name,'CV'],[S.sig,'Signature'],[files.some(o=>o.on),'Pièces jointes']];
$('check').innerHTML=ok.map(o=>`<li><span>${o[1]}</span><span>${o[0]?'Prêt':'Manquant'}</span></li>`).join('')}
async function pr(parts){const w=x=>`<table class="pg"><thead><tr><td></td></tr></thead><tbody><tr><td>${x}</td></tr></tbody><tfoot><tr><td></td></tr></tfoot></table>`;let h='';if(parts.includes('lt'))h+=w(ltHtml());if(parts.includes('cv'))h+=w(cvHtml());
if(parts.includes('pj'))for(const o of files.filter(o=>o.on&&/\.(png|jpe?g|webp|gif)$/i.test(o.name)))h+=`<div class="paper im" style="display:flex;align-items:center"><img src="${URL.createObjectURL(await getBlob(o))}" style="max-width:100%;max-height:100%;margin:auto" alt=""></div>`;
$('pr').innerHTML=h;setTimeout(()=>window.print(),100)}
$('pdfCv').onclick=()=>pr(['cv']);$('pdfLt').onclick=()=>pr(['lt']);$('pdfAll').onclick=()=>pr(['lt','cv','pj']);
async function dl(name,data){const a=document.createElement('a');a.href=URL.createObjectURL(data);a.download=name;a.click()}
const page=h=>new Blob([`<meta charset="utf-8"><style>${[...document.styleSheets[0].cssRules].map(r=>r.cssText).join('')}</style><body style="background:#eee">${h}`],{type:'text/html'});
$('htmlCv').onclick=()=>dl('cv.html',page(cvHtml()));
$('zipAll').onclick=async()=>{const z=new JSZip();z.file('lettre.html',page(ltHtml()));z.file('cv.html',page(cvHtml()));
if(S.sig)z.file('signature.png',S.sig.split(',')[1],{base64:true});for(const o of files.filter(o=>o.on))z.file('pieces/'+o.name,await getBlob(o));
dl('dossier-candidature.zip',await z.generateAsync({type:'blob'}))};
// Import d'un ancien CV (analyse dans js/import.js)
if(sessionStorage.getItem('de_imp')){$('impMsg').textContent='CV importé : vérifiez chaque rubrique et corrigez si besoin.';sessionStorage.removeItem('de_imp')}
$('impBtn').onclick=()=>$('impFile').click();
$('impFile').onchange=async ev=>{const f=ev.target.files[0];ev.target.value='';if(!f)return;const m=$('impMsg');m.textContent='Lecture du fichier…';
try{const p=await CVImport.parse(f),n=p.xp.length+p.ed.length+p.fc.length+p.lg.length+p.it.length+p.rf.length;
if(!p.name&&!n&&!p.summary){m.textContent='Aucune information reconnue : le CV est peut-être une image scannée ou en colonnes.';return}
const rep=confirm("Importer ce CV ?\n\nOK : remplacer le contenu actuel du CV par celui du fichier.\nAnnuler : compléter seulement les champs vides.");
const c=S.cv,empty=a=>!a||!a.length||a.every(x=>!Object.values(x).some(v=>v&&v!==true));
['name','title','email','phone','city','summary','skills','hobbies','other'].forEach(k=>{if(p[k]&&(rep||!c[k]))c[k]=p[k]});
['xp','ed','fc','lg','it','rf'].forEach(k=>{if(p[k].length&&(rep||empty(c[k])))c[k]=p[k]});
if(!c.xp||!c.xp.length)c.xp=[{}];if(!c.ed||!c.ed.length)c.ed=[{}];
save();sessionStorage.setItem('de_imp','1');await push();location.reload()}
catch(x){m.textContent='Impossible de lire ce fichier : '+x.message}};
cvR();ltR();sigR();apR();
const PAL={vert:[['#0f6b5c','#d9efe9','#ffffff'],['#4cc2ab','#1c3a35','#0c1a17']],bleu:[['#1d5fd1','#dbe7fb','#ffffff'],['#6ea0ff','#1b2a4a','#0b1424']],violet:[['#6b3fc4','#e8defa','#ffffff'],['#b39bff','#2c2147','#150f26']],orange:[['#c2570c','#fbe5d3','#ffffff'],['#ffa05c','#43281a','#241208']]};
function applyTheme(){let t='auto',a='vert';try{t=localStorage.getItem('de_th')||'auto';a=localStorage.getItem('de_ac')||'vert'}catch(x){}
const r=document.documentElement,dk=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
t==='auto'?r.removeAttribute('data-theme'):r.setAttribute('data-theme',t);r.style.colorScheme=t==='auto'?'light dark':t;
const[c,so,on]=PAL[a][dk?1:0];r.style.setProperty('--acc',c);r.style.setProperty('--soft',so);r.style.setProperty('--on',on);$('thm').value=t;$('acc').value=a}
$('thm').onchange=()=>{try{localStorage.setItem('de_th',$('thm').value)}catch(x){}applyTheme()};
$('acc').onchange=()=>{try{localStorage.setItem('de_ac',$('acc').value)}catch(x){}applyTheme()};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);applyTheme();
})();

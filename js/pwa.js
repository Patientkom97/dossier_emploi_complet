// Installation de l'application (PWA)
if('serviceWorker' in navigator){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
let dp=null;const ib=document.getElementById('inst');
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
addEventListener('beforeinstallprompt',ev=>{ev.preventDefault();dp=ev;if(ib&&!standalone)ib.style.display=''});
if(ib){
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(ios&&!standalone)ib.style.display='';
  ib.onclick=async()=>{
    if(dp){dp.prompt();await dp.userChoice;dp=null;ib.style.display='none'}
    else alert(ios?"Sur iPhone : touchez le bouton Partager de Safari, puis « Sur l'écran d'accueil »."
                  :"Ouvrez le menu du navigateur (⋮), puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».");
  };
  addEventListener('appinstalled',()=>{ib.style.display='none'});
}

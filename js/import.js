// Import d'un ancien CV : lecture PDF / Word / texte, puis reconnaissance des rubriques.
// Fonctionne par règles (pas d'IA) : les résultats sont à vérifier après import.
(function () {
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    MAMMOTH = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
  const load = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('bibliothèque non chargée (connexion ?)')); document.head.appendChild(s) });
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* ---------- lecture des fichiers ---------- */
  async function pdfText(f) {
    await load(PDFJS); pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
    const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise, out = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const c = await (await pdf.getPage(p)).getTextContent(), rows = [];
      c.items.forEach(it => { if (!it.str.trim()) return; const y = Math.round(it.transform[5]); let r = rows.find(r => Math.abs(r.y - y) <= 2); if (!r) { r = { y, t: [] }; rows.push(r) } r.t.push([it.transform[4], it.str]) });
      rows.sort((a, b) => b.y - a.y).forEach(r => out.push(r.t.sort((a, b) => a[0] - b[0]).map(x => x[1]).join(' ')))
    }
    return out.join('\n')
  }
  async function docxText(f) { await load(MAMMOTH); const r = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() }); return r.value }
  async function readText(f) {
    const n = f.name.toLowerCase();
    if (n.endsWith('.pdf')) return pdfText(f); if (n.endsWith('.docx')) return docxText(f); if (n.endsWith('.txt')) return f.text();
    throw new Error('format non pris en charge (utilisez PDF, DOCX ou TXT)')
  }

  /* ---------- rubriques ---------- */
  const SEC = [
    ['it', /^(maitrise informatique|competences? informatiques?|informatique|bureautique|logiciels?|outils informatiques|it skills|computer skills)\b/],
    ['fc', /^(formations? (complementaires?|continue|professionnelle)|certifications?|certificats?|seminaires?)\b/],
    ['edu', /^(formations?|etudes?|parcours (scolaire|academique|universitaire)|education|diplomes?|cursus|academique)\b/],
    ['exp', /^(experiences?|parcours professionnel|work experience|work history|employment)\b/],
    ['sum', /^(profil|resume|objectifs?|a propos|summary|profile|objective|presentation)\b/],
    ['skills', /^(competences?|skills|aptitudes|qualites|atouts)\b/],
    ['lang', /^(langues?|connaissances? linguistiques?|languages?)\b/],
    ['hob', /^(centres? d.?interets?|loisirs|hobbies|interests|passions)\b/],
    ['refs', /^(references?|personnes? de reference|referees)\b/],
    ['other', /^(autres? informations?|divers|informations? (complementaires?|personnelles)|etat civil|identite)\b/]];
  function heading(line) {
    const t = line.replace(/[:\-–—_•·*#\s]+$/, '').replace(/^[\s\-–—•·*#.)]+/, '');
    if (!t || t.length > 45 || /\d/.test(t) || t.split(/\s+/).length > 4) return null; const n = norm(t);
    for (const [k, r] of SEC) if (r.test(n)) return k; return null
  }

  /* ---------- dates ---------- */
  const MO = '(?:janv?(?:ier)?|f[ée]vr?(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|ao[uû]t?|sept?(?:embre)?|oct(?:obre)?|nov(?:embre)?|d[ée]c(?:embre)?|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-zéû]*\\.?';
  const D = String.raw`(?:${MO}\s+)?(?:\d{1,2}[/.\-])?\d{4}`,
    CUR = 'pr[ée]sent|aujourd.?hui|actuel(?:lement)?|en cours|ce jour|current|now|present',
    RANGE = new RegExp(String.raw`(${D})\s*(?:[-–—]|à|au|to|jusqu.?à)\s*(${D}|${CUR})`, 'i'),
    CURRE = new RegExp('^(?:' + CUR + ')$', 'i');
  const MN = { jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, avr: 4, may: 5, mai: 5, jun: 6, jul: 7, aug: 8, aou: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function toMonth(s) {
    const y = (s.match(/\d{4}/) || [])[0]; if (!y) return ''; let m = 1;
    const num = s.match(/(\d{1,2})[\/.\-]\d{4}/);
    if (num) m = Math.min(12, +num[1] || 1); else { const w = norm(s).replace(/[^a-z]/g, ''); const k = w.startsWith('juin') ? 'jun' : w.startsWith('juil') ? 'jul' : w.slice(0, 3); if (MN[k]) m = MN[k] }
    return y + '-' + String(m).padStart(2, '0')
  }
  const clean = s => s.replace(/[()\[\]|]/g, ' ').replace(/^[\s,;:\-–—]+|[\s,;:\-–—]+$/g, '').replace(/\s+/g, ' ');
  function dateOf(line, year) {
    const m = line.match(RANGE);
    if (m) { const cur = CURRE.test(m[2].trim()); return { d1: toMonth(m[1]), d2: cur ? '' : toMonth(m[2]), cur, rest: clean(line.slice(0, m.index) + ' ' + line.slice(m.index + m[0].length)) } }
    if (year) {
      const a = line.match(/^\s*((?:19|20)\d{2})\b\s*[-–—:]?\s*(.*)$/); if (a) return { d1: '', d2: toMonth(a[1]), cur: false, rest: clean(a[2]) };
      const b = line.match(/^(.*?)\(?\b((?:19|20)\d{2})\)?\s*$/); if (b && b[1].trim()) return { d1: '', d2: toMonth(b[2]), cur: false, rest: clean(b[1]) }
    }
    return null
  }

  /* ---------- entrées datées (expériences, études, formations) ---------- */
  const BUL = /^\s*[-–—•·▪■●◦*>»]+\s*/;
  const splitTitle = t => { const m = t.split(/\s+(?:chez|at|@)\s+|\s+[-–—|]\s+|,\s+/i); return [(m[0] || '').trim(), m.slice(1).join(', ').trim()] };
  function entries(lines, A, B, C, year) {
    const out = []; let cur = null, trail = [];
    for (const raw of lines) {
      const line = raw.trim(); if (!line) continue; const bul = BUL.test(line), t = line.replace(BUL, '').trim(), dt = dateOf(line, year);
      if (dt) {
        let title = dt.rest;
        if (!title && trail.length) { let tl = trail.slice(-1); if (trail.length > 1 && !/\s[-–—|]\s|,|\schez\s/.test(tl[0]) && !/:/.test(trail[trail.length - 2])) tl = trail.slice(-2); if (cur) cur.c.splice(cur.c.length - tl.length, tl.length); title = tl.join(' - ') }
        cur = { a: '', b: '', c: [], d1: dt.d1, d2: dt.d2, cur: dt.cur }; trail = []; if (title) { [cur.a, cur.b] = splitTitle(title) } out.push(cur)
      }
      else if (!cur) { if (!bul && t.length <= 70) trail.push(t) }
      else if (!cur.a && !bul) cur.a = t;
      else if (!cur.b && !bul && t.length <= 70 && !cur.c.length) cur.b = t;
      else { cur.c.push(t); if (!bul && t.length <= 70) trail.push(t); else trail = [] }
    }
    let res = out.map(c => ({ [A]: c.a, [B]: c.b, [C]: c.c.join('\n'), d1: c.d1, d2: c.d2, cur: c.cur })).filter(e => e[A] || e[B]);
    if (!res.length) { let last = null; lines.forEach(l => { l = l.trim(); if (!l) return; if (BUL.test(l) && last) last[C] += (last[C] ? '\n' : '') + l.replace(BUL, ''); else { last = { [A]: l, [B]: '', [C]: '', d1: '', d2: '', cur: false }; res.push(last) } }) }
    return res.slice(0, 30)
  }

  /* ---------- listes simples ---------- */
  const tokens = lines => lines.join('\n').split(/[\n;,•·|]+/).map(x => x.replace(BUL, '').trim()).filter(x => x && x.length <= 50);
  function lvLang(s) { const n = norm(s); return /maternel|native/.test(n) ? 'Langue maternelle' : /courant|avance|fluent|\bc[12]\b|excellent|tres bien/.test(n) ? 'Courant' : /\bbon\b|good|\bb2\b|\bbien\b/.test(n) ? 'Bon' : /intermed|moyen|\bb1\b|passable/.test(n) ? 'Intermédiaire' : /notion|debutant|basic|\ba[12]\b|elementaire|scolaire/.test(n) ? 'Notions' : '' }
  function lvIt(s) { const n = norm(s); return /excellent|tres bon|avance|expert/.test(n) ? 'Excellent' : /\bbon\b|good|\bbien\b/.test(n) ? 'Bon' : /moyen|intermed/.test(n) ? 'Moyen' : /notion|debutant|basic/.test(n) ? 'Notions' : '' }
  const labeled = t => { const m = t.match(/^(.{2,30}?)\s*[:\-–—(]\s*(.+?)\)?\s*$/); return m ? [m[1].trim(), m[2].trim()] : [t, ''] };
  const langs = l => tokens(l).slice(0, 15).map(x => { const [a, b] = labeled(x); return { la: a, nv: lvLang(b) } });
  const itools = l => tokens(l).slice(0, 30).map(x => { const [a, b] = labeled(x); return { lo: a, nv: lvIt(b) } });
  function refs(lines) {
    const out = []; let c = null;
    for (const raw of lines) {
      const t = raw.replace(BUL, '').replace(/^(nom|fonction|poste|t[ée]l[ée]phone|t[ée]l|e-?mail|organisation|entreprise)\s*:\s*/i, '').trim(); if (!t) continue;
      const em = t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/), ph = t.match(/\+?\d[\d\s.\-()]{7,}\d/);
      const nameish = !em && !ph && /^[\p{Lu}][\p{L}'.\- ]+$/u.test(t) && t.split(/\s+/).length <= 5 && t.length <= 40;
      if (!c || (nameish && (c.te || c.em))) { c = { no: '', fo: '', or: '', te: '', em: '' }; out.push(c); if (nameish || !em && !ph) { c.no = t; continue } }
      if (em) c.em = em[0]; else if (ph) c.te = ph[0].trim(); else if (!c.no) c.no = t; else if (!c.fo) c.fo = t; else if (!c.or) c.or = t
    }
    return out.filter(r => r.no).slice(0, 10)
  }

  /* ---------- analyse complète ---------- */
  function parseText(text) {
    const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean), sec = { head: [] }; let k = 'head';
    for (const l of lines) {
      const m = l.match(/^([^:]{3,40}):\s*(.+)$/), h1 = m && heading(m[1]);
      if (h1) { k = h1; (sec[k] = sec[k] || []).push(m[2]); continue }
      const h = heading(l); if (h) { k = h; sec[k] = sec[k] || []; continue }
      (sec[k] = sec[k] || []).push(l)
    }
    const all = text, phoneOK = s => { const d = s.replace(/\D/g, '').length; return d >= 8 && d <= 15 };
    const email = (all.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [''])[0];
    const phone = ((all.match(/\+?\d[\d\s.\-()]{7,}\d/g) || []).find(s => phoneOK(s) && !RANGE.test(s)) || '').trim();
    const cm = all.match(/(?:adresse|ville|domicile|r[ée]sidence)\s*:\s*([^\n]+)/i);
    const city = cm ? cm[1].split(',').pop().replace(/[.;]+$/, '').trim().slice(0, 40) : '';
    let name = '', title = '';
    const isContact = l => /@|\d{5,}|^(t[ée]l|e-?mail|adresse|n[ée] |date|nationalit)/i.test(l);
    const head = sec.head.filter(l => !isContact(l) && !/^curriculum|^cv$|^resume$/i.test(l));
    for (const l of head) {
      const nm = l.match(/^(?:nom(?: et pr[ée]noms?)?|name)\s*:\s*(.+)$/i);
      if (nm) { name = nm[1].trim(); continue }
      if (!name && /^[\p{L}'.\- ]{3,50}$/u.test(l) && l.split(/\s+/).length <= 5) { name = l; continue }
      if (name && !title && l.length <= 80 && !l.includes(':')) { title = l }
    }
    const get = x => sec[x] || [];
    return {
      name, title, email, phone, city,
      summary: get('sum').join(' ').slice(0, 900),
      skills: tokens(get('skills')).slice(0, 40).join(', '),
      hobbies: tokens(get('hob')).slice(0, 20).join(', '),
      other: get('other').join('\n').slice(0, 600),
      xp: entries(get('exp'), 'po', 'co', 'tasks', false),
      ed: entries(get('edu'), 'di', 'et', 'info', true),
      fc: entries(get('fc'), 'di', 'et', 'info', true),
      lg: langs(get('lang')), it: itools(get('it')), rf: refs(get('refs'))
    }
  }

  window.CVImport = { parse: async f => parseText(await readText(f)), parseText };
})();

export const esc = (x = '') => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const slugify = value => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
export const prettyDate = iso => iso ? new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(iso)) : '';
export const readTime = text => Math.max(1,Math.ceil(String(text || '').trim().split(/\s+/).filter(Boolean).length / 220));
export const storyUrl = slug => `./?story=${encodeURIComponent(slug)}`;
export const coverUrl = value => { try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
export function renderMarkdown(markdown = '') {
  // Markdown is converted from HTML-escaped text. Raw HTML/scripts are never executed.
  const inline = value => {
    let s = esc(value);
    s = s.replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+)\*/g,'<em>$1</em>');
    s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,(_m,label,url) => `<a target="_blank" rel="noopener noreferrer nofollow" href="${url.replace(/&amp;/g,'&amp;')}">${label}</a>`);
    return s;
  };
  const rows = String(markdown).replace(/\r/g,'').split('\n');
  const html=[]; let list=null; let paragraph=[];
  const flushP = () => { if(paragraph.length){html.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);paragraph=[];} };
  const flushList = () => { if(list){html.push(`</${list}>`);list=null;} };
  for(const raw of rows){ const line=raw.trim();
    if(!line){flushP();flushList();continue;}
    const heading=line.match(/^(#{1,3})\s+(.+)$/);
    const bullet=line.match(/^[-*]\s+(.+)$/);
    const number=line.match(/^\d+[.)]\s+(.+)$/);
    if(heading){flushP();flushList();html.push(`<h${Math.max(2,heading[1].length)}>${inline(heading[2])}</h${Math.max(2,heading[1].length)}>`);}
    else if(line==='---'){flushP();flushList();html.push('<hr>');}
    else if(line.startsWith('> ')){flushP();flushList();html.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);}
    else if(bullet||number){flushP();const type=bullet?'ul':'ol';if(list!==type){flushList();html.push(`<${type}>`);list=type;}html.push(`<li>${inline((bullet||number)[1])}</li>`);}
    else{flushList();paragraph.push(line);}
  }
  flushP();flushList();return html.join('\n');
}
let toastTimer;
export function toast(message) {
 const node=document.querySelector('#toast'); if(!node)return;
 node.textContent=String(message);node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.hidden=true,4500);
}
export function fillBrand(site){
 document.querySelectorAll('[data-brand-name]').forEach(el=>el.textContent=site.name);
 document.title=`${site.name} — Stories`;
 const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();
}

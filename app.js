import { SITE } from './site-config.js';
import { getSupabase, isConfigured } from './supabase.js';
import { esc, prettyDate, readTime, storyUrl, renderMarkdown, coverUrl, fillBrand, toast } from './utils.js';

// These are original, clearly labeled placeholder texts for the unconnected preview.
// Once Supabase is connected, only stories published in your database are shown.
const PREVIEW_STORIES = [
  { id:'preview-1',slug:'the-space-between',title:'The space between where we are and where we go',subtitle:'A small reflection on beginnings.',excerpt:'There is a particular kind of courage in not knowing exactly what comes next — and choosing to move anyway.',category:'Reflections',published_at:'2026-09-17T12:00:00Z',cover_image:null,body:`Some seasons of life arrive without a name. We are no longer who we used to be, but not quite the person we're becoming, either. We stand somewhere in the middle, holding a map that hasn't yet been drawn.\n\nFor a long time, I thought uncertainty was something to overcome. A question that needed an answer. A chapter that needed to end.\n\nBut lately I've wondered whether the in-between is a place worth inhabiting. Not forever, of course. Just long enough to notice the things we hurry past when we're desperate for a destination.\n\n## The quiet work of becoming\n\nMaybe there is no single moment when everything clicks into place. Maybe we gather our lives in little pieces: a conversation we needed, a brave decision we nearly avoided, an ordinary morning that suddenly feels different.\n\n> The next chapter doesn't need a perfect first sentence.\n\nIt just needs us to begin.\n\n*This is sample text for your website preview. Replace it with your own writing after setup.*` },
  { id:'preview-2',slug:'letters-to-a-slow-sunday',title:'Letters to a slow Sunday',subtitle:'A few things I noticed when I stopped rushing.',excerpt:'On the mornings when nothing is expected of us, even the smallest details begin to feel like stories.',category:'Personal Essays',published_at:'2026-09-04T12:00:00Z',cover_image:null,body:`There was light coming through the kitchen window, and for once I wasn't in a hurry to be anywhere else. The kettle was beginning to hum. Somewhere outside, a bird was offering its opinion on the morning.\n\nIt struck me that I had spent so much time trying to make my days memorable that I had forgotten to pay attention to them.\n\n## Ordinary things\n\nA cup cooling on the table. The sound of a familiar song coming from another room. A conversation that doesn't need to lead anywhere.\n\nSometimes, that's enough.\n\n*This is sample text for your website preview. Replace it with your own writing after setup.*` },
  { id:'preview-3',slug:'all-the-places-we-carry',title:'All the places we carry',subtitle:'A note on memory and home.',excerpt:'Some places stay with us long after we have left them — not as addresses, but as feelings.',category:'Short Stories',published_at:'2026-08-22T12:00:00Z',cover_image:null,body:`In my memory, the street is always just after the rain. The pavement shines, the houses glow amber at their windows, and every sound seems to travel a little farther.\n\nIt is probably not how the place really looked. Memory, I've learned, is less a photograph than a storyteller. It keeps what matters and quietly rearranges the rest.\n\nI can still find my way around that street without thinking. But what I miss most isn't the place. It's the version of myself who lived there.\n\n*This is sample text for your website preview. Replace it with your own writing after setup.*` }
];

const main = document.getElementById('main-content');
let posts = [];
let supabase = null;
let currentUser = null;
const artLetters = ['&','A','✺','S','✦'];

function updateNavigation(view) {
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === view));
}
function visual(post, index = 0, cls = 'card-image') {
  const src = coverUrl(post.cover_image);
  const image = src ? `<img class="cover-img" src="${esc(src)}" alt="" loading="lazy" />` : `<span class="${cls === 'card-image' ? 'card-art' : ''}" aria-hidden="true">${artLetters[index % artLetters.length]}</span>`;
  return `<div class="${cls} tone-${index%5}">${image}</div>`;
}
function meta(post) {return `<div class="meta"><span>${esc(prettyDate(post.published_at || post.created_at))}</span><span class="meta-sep"></span><span>${readTime(post.body)} min read</span></div>`;}
function card(post,index){return `<article class="story-card"><a href="${storyUrl(post.slug)}" aria-label="Read ${esc(post.title)}">${visual(post,index)}</a><div class="card-info"><span class="eyebrow">${esc(post.category || 'Story')}</span><h3><a href="${storyUrl(post.slug)}">${esc(post.title)}</a></h3><p>${esc(post.excerpt || post.subtitle || '')}</p>${meta(post)}<a class="open-story" href="${storyUrl(post.slug)}">Read the story <span aria-hidden="true">→</span></a></div></article>`;}
function featured(post){return `<article class="featured-card"> <a href="${storyUrl(post.slug)}" aria-label="Read ${esc(post.title)}">${visual(post,0,'feature-visual')}</a><div class="feature-content"><span class="eyebrow">${esc(post.category || 'Story')}</span><h3>${esc(post.title)}</h3><p>${esc(post.excerpt || post.subtitle || '')}</p>${meta(post)}<a href="${storyUrl(post.slug)}" class="open-story">Continue reading <span aria-hidden="true">→</span></a></div></article>`;}
function previewNote(){return !isConfigured ? `<div class="preview-note">✦ Preview mode — the example stories are placeholders, and reader interactions aren't live yet.</div>` : ''}
function empty(label='No stories have been published yet.'){return `<div class="empty"><span class="eyebrow">THE NEXT CHAPTER</span><h3>A blank page, full of possibilities.</h3><p>${esc(label)}</p></div>`;}
function setDescription(value){const tag=document.querySelector('meta[name="description"]');if(tag)tag.setAttribute('content',String(value||SITE.description).slice(0,160));}

function renderHome(){
 updateNavigation('home');setDescription(SITE.description);document.title=`${SITE.name} — Stories`;
 const first=posts[0];
 main.innerHTML=`
 <section class="section home-latest site-shell"><div class="section-heading"><h1>Latest story<span class="wordmark-dot">.</span></h1><a href="./?view=stories" class="text-link">All stories ↗</a></div>${first ? featured(first) : empty()}${previewNote()}</section>
 <section class="section site-shell" style="padding-top:0"><div class="section-heading"><div><span class="eyebrow">FRESH FROM THE PAGE</span><h2>Recent writing<span class="wordmark-dot">.</span></h2></div><a href="./?view=stories" class="text-link">Browse library ↗</a></div>${posts.length > 1 ? `<div class="card-grid">${posts.slice(1,4).map((p,i)=>card(p,i+1)).join('')}</div>` : posts.length ? `<div class="section-intro">More stories are on their way.</div>` : empty()}</section>`;
}
function renderLibrary(){
 updateNavigation('stories');setDescription(`Browse stories and reflections by ${SITE.name}.`);
 const cats=['All stories',...new Set(posts.map(p=>p.category||'Story'))];
 main.innerHTML=`<div class="site-shell"><div class="page-heading"><span class="eyebrow">THE STORY COLLECTION</span><h1>Words worth <em style="color:var(--accent)">sharing.</em></h1><p>Thoughts, moments, and stories collected along the way. Take your time. Stay awhile.</p>${previewNote()}</div><section class="library-section"><div class="filter-bar"><div class="filter-chips" id="filter-chips">${cats.map((cat,i)=>`<button type="button" class="chip ${i===0?'active':''}" data-category="${esc(cat)}">${esc(cat)}</button>`).join('')}</div><label><span class="hidden">Search stories</span><input id="story-search" class="search-input" type="search" placeholder="Search stories..." aria-label="Search stories"></label></div><p class="library-count" id="library-count"></p><div class="card-grid" id="story-grid"></div></section></div>`;
 const grid=document.getElementById('story-grid'); const count=document.getElementById('library-count');let category='All stories';let search='';
 const refresh=()=>{const filtered=posts.filter(p=>(category==='All stories'||(p.category||'Story')===category)&&(`${p.title} ${p.excerpt||''} ${p.category||''}`.toLowerCase().includes(search)));grid.innerHTML=filtered.length?filtered.map((p,i)=>card(p,i)).join(''):empty('No stories match this search. Try a different word or category.');count.textContent=`${filtered.length} ${filtered.length===1?'story':'stories'}`;};
 document.getElementById('story-search').addEventListener('input',e=>{search=e.target.value.toLowerCase().trim();refresh();});
 document.getElementById('filter-chips').addEventListener('click',e=>{const button=e.target.closest('[data-category]');if(!button)return;category=button.dataset.category;document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active',c===button));refresh();});
 refresh();
}
async function renderStory(post){
 updateNavigation('stories');setDescription(post.excerpt||post.subtitle||post.title);document.title=`${post.title} — ${SITE.name}`;
 const src=coverUrl(post.cover_image);
 main.innerHTML=`<article class="site-shell story-article"><div class="article-header"><a class="back-link" href="./?view=stories">← All stories</a><div class="article-divider"></div><span class="eyebrow">${esc(post.category || 'Story')}</span><h1>${esc(post.title)}</h1>${post.subtitle?`<p class="article-subtitle">${esc(post.subtitle)}</p>`:''}${meta(post)}${!isConfigured?previewNote():''}</div><div class="article-cover tone-0">${src?`<img src="${esc(src)}" alt="Story cover image"/>`:'<span aria-hidden="true">✳</span>'}</div><div class="article-body">${renderMarkdown(post.body)}</div><div class="article-action-bar"><button type="button" id="like-btn" class="like-btn" aria-pressed="false">♡ <span id="like-label">Like this story</span> <span id="like-count"></span></button><button type="button" class="ghost-btn" id="share-btn">Share story ↗</button></div><section class="comments-section" id="comments"><span class="eyebrow">THE CONVERSATION</span><h2>Leave a thought<span class="wordmark-dot">.</span></h2><p class="comment-intro">Every story becomes richer when it's shared. I'd love to hear what you think.</p><div id="comments-list"><div class="comment-empty">Loading comments...</div></div><div id="reader-area"></div></section></article>`;
 document.getElementById('share-btn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Story link copied to clipboard.');}catch{toast('Copy the URL from your address bar to share.');}});
 if (!isConfigured){document.getElementById('like-btn').addEventListener('click',()=>toast('Connect Supabase to enable likes.'));document.getElementById('comments-list').innerHTML='<p class="comment-empty">Reader comments will appear here once your site is connected.</p>';document.getElementById('reader-area').innerHTML='<div class="login-panel"><h3>Reader discussion, coming soon.</h3><p class="form-hint">After you connect Supabase and configure sign-in emails, visitors can like and comment on your stories.</p></div>';return;}
 await renderEngagement(post);
}
async function renderEngagement(post){
 const likesEl=document.getElementById('like-count');const likeBtn=document.getElementById('like-btn');
 const fetchLikes=async()=>{const {data,error}=await supabase.rpc('story_like_count',{target_story_id:post.id});if(!error)likesEl.textContent=`(${data??0})`;};
 await fetchLikes();
 let liked=false;
 if(currentUser){const {data}=await supabase.from('story_likes').select('story_id').eq('story_id',post.id).eq('user_id',currentUser.id).maybeSingle();liked=Boolean(data);}
 const setLiked=()=>{likeBtn.classList.toggle('liked',liked);likeBtn.setAttribute('aria-pressed',String(liked));document.getElementById('like-label').textContent=liked?'Liked':'Like this story';likeBtn.firstChild.textContent=liked?'♥ ':'♡ ';};setLiked();
 likeBtn.addEventListener('click',async()=>{if(!currentUser){toast('Sign in below to like this story.');document.getElementById('reader-area').scrollIntoView({behavior:'smooth',block:'center'});return;}likeBtn.disabled=true;
  const {error}=liked?await supabase.from('story_likes').delete().eq('story_id',post.id).eq('user_id',currentUser.id):await supabase.from('story_likes').insert({story_id:post.id,user_id:currentUser.id});
  if(error){toast(`Couldn't update like: ${error.message}`);}else{liked=!liked;setLiked();await fetchLikes();}likeBtn.disabled=false;
 });
 const {data:comments,error:commentsError}=await supabase.from('comments').select('id,display_name,body,created_at,approved,user_id').eq('story_id',post.id).order('created_at',{ascending:true});
 const commentsEl=document.getElementById('comments-list');
 if(commentsError){commentsEl.innerHTML=`<div class="error-block"><strong>Comments unavailable.</strong><p>${esc(commentsError.message)}</p></div>`;}
 else if(!comments?.length){commentsEl.innerHTML='<p class="comment-empty">No comments yet. Be the first to share a thought.</p>';}
 else{commentsEl.innerHTML=comments.map(c=>`<div class="comment-card"><div class="comment-top"><span class="comment-name">${esc(c.display_name)}</span><span class="comment-date">${esc(prettyDate(c.created_at))}</span></div><p class="comment-body">${esc(c.body)}</p>${!c.approved?'<span class="comment-pending">Awaiting review — only you can see this comment</span>':''}</div>`).join('');}
 const area=document.getElementById('reader-area');
 if(!currentUser){area.innerHTML=`<div class="login-panel"><h3>Join the conversation</h3><p class="form-hint">Sign in with your email to like stories and leave a comment. No password needed.</p><form id="reader-login"><label for="login-email">Email address</label><input required type="email" id="login-email" class="form-input" autocomplete="email" placeholder="you@example.com" maxlength="254"><button class="primary-btn form-btn" type="submit">Send sign-in link ↗</button><p id="login-status" class="form-hint" aria-live="polite"></p></form></div>`;
  document.getElementById('reader-login').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;const email=e.target.querySelector('input').value.trim();const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.href.split('#')[0]}});document.getElementById('login-status').textContent=error?error.message:'Check your inbox for a sign-in link. Open it to return to this story.';btn.disabled=false;});return;}
 area.innerHTML=`<div class="signout-line">Commenting as <strong>${esc(currentUser.email||'a signed-in reader')}</strong>. <button id="reader-signout" type="button">Sign out</button></div><form id="comment-form" class="comment-form"><h3>Write a comment</h3><label for="comment-name">Display name</label><input id="comment-name" class="form-input" maxlength="50" minlength="2" required placeholder="Your name"><label for="comment-body">Your thoughts</label><textarea id="comment-body" class="form-textarea" required minlength="3" maxlength="1500" placeholder="What stayed with you from this story?"></textarea><p class="form-hint">Comments are reviewed before they become public. Be kind, and stay on topic.</p><button class="primary-btn form-btn" type="submit">Post comment ↗</button></form>`;
 document.getElementById('reader-signout').addEventListener('click',async()=>{await supabase.auth.signOut();location.reload();});
 document.getElementById('comment-form').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;const name=document.getElementById('comment-name').value.trim();const body=document.getElementById('comment-body').value.trim();if(name.length<2||body.length<3){toast('Please add a name and a longer comment.');btn.disabled=false;return;}
  const {error}=await supabase.from('comments').insert({story_id:post.id,user_id:currentUser.id,display_name:name,body});
  if(error){toast(`Couldn't submit comment: ${error.message}`);btn.disabled=false;}else{
   toast('Thanks! Your comment is awaiting approval.');
   const list=document.getElementById('comments-list');
   if(list.querySelector('.comment-empty')) list.innerHTML='';
   const pending=document.createElement('div');pending.className='comment-card';
   const top=document.createElement('div');top.className='comment-top';
   const display=document.createElement('span');display.className='comment-name';display.textContent=name;
   const date=document.createElement('span');date.className='comment-date';date.textContent='Just now';
   const text=document.createElement('p');text.className='comment-body';text.textContent=body;
   const status=document.createElement('span');status.className='comment-pending';status.textContent='Awaiting review — only you can see this comment';
   top.append(display,date);pending.append(top,text,status);list.append(pending);
   document.getElementById('comment-body').value='';btn.disabled=false;
  }
 });
}
async function initialize(){
 fillBrand(SITE);
 try{
  if(isConfigured){supabase=await getSupabase();const [{data,error},{data:userData}]=await Promise.all([supabase.from('stories').select('id,slug,title,subtitle,excerpt,body,category,cover_image,published_at,created_at').eq('published',true).order('published_at',{ascending:false}),supabase.auth.getUser()]);if(error)throw error;posts=data||[];currentUser=userData?.user||null;}
  else{posts=PREVIEW_STORIES;}
  const params=new URLSearchParams(location.search);
  const slug=params.get('story');const view=params.get('view');
  if(slug){const post=posts.find(p=>p.slug===slug);if(post){await renderStory(post);}else{main.innerHTML=`<div class="site-shell"><div class="error-block"><strong>Story not found.</strong><p>This story may have moved, or it may not be published yet.</p><a class="back-link" href="./?view=stories">← Back to stories</a></div></div>`;}}
  else if(view==='stories'){renderLibrary();}
  else{renderHome();}
 }catch(e){main.innerHTML=`<div class="site-shell"><div class="error-block"><strong>Something prevented the website from loading.</strong><p>${esc(e.message||String(e))}</p><p>Check your site-config.js settings, Supabase tables and access policies, or the browser network connection.</p></div></div>`;}
}
initialize();

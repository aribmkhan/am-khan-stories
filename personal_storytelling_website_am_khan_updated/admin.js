import { SITE } from './site-config.js';
import { getSupabase, isConfigured } from './supabase.js';
import { esc, slugify, prettyDate, renderMarkdown, fillBrand, toast, coverUrl } from './utils.js';

const root=document.getElementById('admin-main');
let db=null, user=null, stories=[], pendingComments=[], activeStory=null;

function authPanel(title,description,showForm=true){
 root.innerHTML=`<div class="admin-auth-card"><span class="eyebrow">WRITER'S DESK</span><h1>${esc(title)}</h1><p>${esc(description)}</p>${showForm?`<form id="desk-login"><label for="desk-email" style="font-size:11px;font-weight:700;display:block;margin:22px 0 7px">Your email address</label><input id="desk-email" type="email" class="form-input" autocomplete="email" required maxlength="254" placeholder="you@example.com"><button type="submit" class="primary-btn">Send sign-in link ↗</button><p id="desk-status" class="form-hint" aria-live="polite"></p></form>`:''}<p style="margin-top:25px"><a class="back-link" href="./">← Back to the website</a></p></div>`;
 if(showForm && db){document.getElementById('desk-login').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;const email=document.getElementById('desk-email').value.trim();const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:location.href.split('#')[0]}});document.getElementById('desk-status').textContent=error?error.message:'Check your inbox and follow the sign-in link.';btn.disabled=false;});}
}
async function loadData(){
 const [s,c]=await Promise.all([
  db.from('stories').select('*').order('created_at',{ascending:false}),
  db.from('comments').select('id,story_id,display_name,body,created_at,approved,stories(title)').eq('approved',false).order('created_at',{ascending:false})
 ]);
 if(s.error)throw s.error;if(c.error)throw c.error;
 stories=s.data||[];pendingComments=c.data||[];
}
function base(){
 root.innerHTML=`<div class="admin-intro"><span class="eyebrow">YOUR CREATIVE SPACE</span><h1>Writer's desk<span class="wordmark-dot">.</span></h1><div class="admin-status"><p class="muted">Signed in as ${esc(user.email)}</p><button id="desk-signout" type="button">Sign out</button></div></div><div class="admin-tabs" role="tablist" aria-label="Writer dashboard"><button type="button" data-tab="write" class="admin-tab active">Write / Edit</button><button type="button" data-tab="stories" class="admin-tab">Your stories (${stories.length})</button><button type="button" data-tab="comments" class="admin-tab">Review comments (${pendingComments.length})</button></div><div id="admin-content"></div>`;
 document.getElementById('desk-signout').addEventListener('click',async()=>{await db.auth.signOut();location.href='./admin.html';});
 document.querySelector('.admin-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)switchTab(b.dataset.tab);});
}
function switchTab(tab){
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 if(tab==='write')renderEditor();else if(tab==='stories')renderStoryList();else renderComments();
}
function renderEditor(){
 const p=activeStory || {};
 const c=document.getElementById('admin-content');
 c.innerHTML=`<div class="editor-grid"><form id="story-editor" class="editor-pane"><h2>${activeStory?'Edit your story':'Create a new story'}</h2><label for="story-title">Title *</label><input id="story-title" name="title" class="form-input" required maxlength="180" placeholder="The title of your story" value="${esc(p.title||'')}"><label for="story-slug">URL slug *</label><input id="story-slug" name="slug" class="form-input" required maxlength="100" placeholder="the-title-of-your-story" value="${esc(p.slug||'')}"><div class="two-col"><div><label for="story-category">Category *</label><input id="story-category" name="category" class="form-input" required maxlength="50" placeholder="Short Stories" value="${esc(p.category||'Reflections')}"></div><div><label for="story-subtitle">Subtitle (optional)</label><input id="story-subtitle" name="subtitle" class="form-input" maxlength="240" placeholder="A little more context" value="${esc(p.subtitle||'')}"></div></div><label for="story-excerpt">Short description *</label><textarea name="excerpt" id="story-excerpt" class="form-textarea" style="min-height:85px" required maxlength="350" placeholder="A short invitation to read this story">${esc(p.excerpt||'')}</textarea><label for="story-cover">Cover image URL (optional)</label><input type="url" name="cover_image" class="form-input" id="story-cover" placeholder="https://example.com/photo.jpg" value="${esc(p.cover_image||'')}"><p class="form-hint">Use an image you own or have permission to publish. Leave blank for the built-in illustrated cover.</p><label for="story-body">Story text * (supports simple Markdown)</label><textarea id="story-body" name="body" class="form-textarea" required minlength="10" placeholder="Start writing...\n\n## A section heading\n\nThe next paragraph...">${esc(p.body||'')}</textarea><p class="form-hint">Use ## for headings, **bold**, *italic*, > for quotes and - for bullet lists. Blank lines separate paragraphs.</p><div class="toggle-row"><input type="checkbox" id="story-published" name="published" ${p.published?'checked':''}><label for="story-published">Published (visible to everyone)</label></div><div class="editor-buttons"><button type="submit" class="primary-btn" id="save-story">${activeStory?'Save changes':'Save story'} ↗</button><button type="button" class="ghost-btn" id="new-story">New blank story</button></div><p id="editor-status" class="form-hint" aria-live="polite"></p></form><section class="preview-pane"><span class="eyebrow">LIVE PREVIEW</span><h2>How your words will look</h2><span id="preview-category" class="eyebrow"></span><h3 class="preview-title" id="preview-title">An untitled story</h3><p id="preview-excerpt" class="muted" style="font-size:12px"></p><div id="preview-body" class="preview-body"></div></section></div>`;
 const form=document.getElementById('story-editor');let slugTouched=Boolean(activeStory);
 const refreshPreview=()=>{document.getElementById('preview-category').textContent=form.elements.category.value||'CATEGORY';document.getElementById('preview-title').textContent=form.elements.title.value||'An untitled story';document.getElementById('preview-excerpt').textContent=form.elements.excerpt.value;document.getElementById('preview-body').innerHTML=renderMarkdown(form.elements.body.value)||'<p class="muted">Your story preview will appear here as you type.</p>';};
 form.addEventListener('input',e=>{if(e.target.id==='story-slug')slugTouched=true;if(e.target.id==='story-title'&&!slugTouched)form.elements.slug.value=slugify(form.elements.title.value);refreshPreview();});refreshPreview();
 document.getElementById('new-story').addEventListener('click',()=>{activeStory=null;renderEditor();});
 form.addEventListener('submit',async e=>{e.preventDefault();const button=document.getElementById('save-story');button.disabled=true;const published=form.elements.published.checked;
  const slug=slugify(form.elements.slug.value);
  const cover=form.elements.cover_image.value.trim();
  if(!slug || (cover&&!coverUrl(cover))){document.getElementById('editor-status').textContent='Please enter a valid slug and an http(s) cover image URL.';button.disabled=false;return;}
  const data={title:form.elements.title.value.trim(),slug,category:form.elements.category.value.trim(),subtitle:form.elements.subtitle.value.trim(),excerpt:form.elements.excerpt.value.trim(),body:form.elements.body.value.trim(),cover_image:cover||null,published,published_at:published?(activeStory?.published_at||new Date().toISOString()):null};
  if(data.title.length<2||data.body.length<10||data.excerpt.length<2){document.getElementById('editor-status').textContent='Please add a title, short description and full story text.';button.disabled=false;return;}
  let result;
  if(activeStory){result=await db.from('stories').update(data).eq('id',activeStory.id).select().single();}else{result=await db.from('stories').insert(data).select().single();}
  if(result.error){document.getElementById('editor-status').textContent=`Couldn't save: ${result.error.message}`;button.disabled=false;return;}
  activeStory=result.data;try{await loadData();document.getElementById('editor-status').textContent=published?'Published! Your story is live.':'Saved as a private draft.';toast(published?'Story published successfully.':'Draft saved successfully.');base();switchTab('write');}catch(error){toast(`Saved, but refreshing the dashboard failed: ${error.message}`);}button.disabled=false;
 });
}
function renderStoryList(){const target=document.getElementById('admin-content');
 target.innerHTML=`<section class="admin-panel"><h2>Your story library</h2><p class="form-hint">Drafts are private. Published stories are visible on the website. Edit a story any time.</p>${stories.length?`<div class="admin-list">${stories.map(p=>`<div class="admin-list-row"><div><strong>${esc(p.title)}</strong><p>${esc(p.category||'Story')} · ${p.published?'● Published':'○ Draft'} · ${esc(prettyDate(p.created_at))}</p></div><div class="list-actions"><button type="button" class="small-btn" data-edit="${esc(p.id)}">Edit</button>${p.published?`<a target="_blank" rel="noopener" class="small-btn" href="./?story=${encodeURIComponent(p.slug)}">View ↗</a>`:''}<button type="button" class="small-btn danger" data-delete="${esc(p.id)}">Delete</button></div></div>`).join('')}</div>`:'<p class="muted">No stories yet. Choose Write / Edit to publish your first one.</p>'}</section>`;
 target.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{activeStory=stories.find(p=>p.id===b.dataset.edit);switchTab('write');}));
 target.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{const post=stories.find(p=>p.id===b.dataset.delete);if(!post||!confirm(`Permanently delete "${post.title}" and all its likes and comments?`))return;b.disabled=true;const {error}=await db.from('stories').delete().eq('id',post.id);if(error){toast(error.message);b.disabled=false;return;}if(activeStory?.id===post.id)activeStory=null;await loadData();base();switchTab('stories');toast('Story deleted.');}));
}
function renderComments(){const target=document.getElementById('admin-content');
 target.innerHTML=`<section class="admin-panel"><h2>Comments awaiting review</h2><p class="form-hint">Only comments you approve will appear publicly. Unapproved comments can still be seen by their authors.</p>${pendingComments.length?`<div class="admin-list">${pendingComments.map(c=>`<div class="admin-list-row"><div><span class="eyebrow">${esc(c.stories?.title||'Story')}</span><p><strong style="font-family:var(--sans);font-size:13px;font-weight:700">${esc(c.display_name)}</strong> · ${esc(prettyDate(c.created_at))}</p><p class="comment-body">${esc(c.body)}</p></div><div class="list-actions"><button class="small-btn" type="button" data-approve="${esc(c.id)}">Approve</button><button class="small-btn danger" type="button" data-reject="${esc(c.id)}">Delete</button></div></div>`).join('')}</div>`:'<p class="muted">All caught up. No comments awaiting approval.</p>'}</section>`;
 target.querySelectorAll('[data-approve]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;const {error}=await db.from('comments').update({approved:true}).eq('id',b.dataset.approve);if(error){toast(error.message);b.disabled=false;return;}await loadData();base();switchTab('comments');toast('Comment approved and now visible.');}));
 target.querySelectorAll('[data-reject]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Delete this comment permanently?'))return;b.disabled=true;const {error}=await db.from('comments').delete().eq('id',b.dataset.reject);if(error){toast(error.message);b.disabled=false;return;}await loadData();base();switchTab('comments');toast('Comment deleted.');}));
}
async function initialize(){fillBrand(SITE);document.title=`Writer's Desk — ${SITE.name}`;
 try{
  if(!isConfigured){authPanel('Your stories, your space.','This is the writer dashboard. To activate publishing, set up Supabase and paste your project URL and publishable key into site-config.js. The README includes the exact steps.',false);return;}
  db=await getSupabase();const result=await db.auth.getUser();user=result.data?.user||null;
  if(!user){authPanel('Sign in to your desk.','Use the same email address you registered as the site administrator. You will receive a one-time sign-in link.');return;}
  const {data,isError,error}=await db.rpc('is_admin');
  if(error){throw error;}
  if(!data){authPanel('One more setup step.','You are signed in, but this account has not been granted editor access. Find your user ID in Supabase > Authentication > Users, then run the admin access SQL shown in the README.',false);return;}
  await loadData();base();switchTab('write');
 }catch(e){root.innerHTML=`<div class="error-block"><strong>Could not open the writer's desk.</strong><p>${esc(e.message||String(e))}</p><p>Check your Supabase configuration, database schema, and network connection.</p></div>`;}
}
initialize();

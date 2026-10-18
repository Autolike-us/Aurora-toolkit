// Offline page fixtures shaped like the three sites' comment areas (made-up data).
const COMMON = `<style>body{font:15px system-ui;margin:0;padding:20px;width:720px}a{color:#06c}[role=button],button{cursor:pointer}</style>`;
const FB = `<!doctype html><title>t</title>${COMMON}<body><div role="main"><div role="article" id="post"><h3><a href="/sunrisebakery">Sunrise Bakery</a></h3>
<div data-ad-preview="message"><div dir="auto">Fresh sourdough today!</div></div>
<ul id="list" style="list-style:none;padding:0">
 <li><div role="article" aria-label="Comment by Maya K" id="c1"><a href="/maya.k">Maya K</a><div dir="auto">Do you deliver on Sundays?</div><div><span role="button">Like</span> <span role="button" class="rp" data-who="Maya K">Reply</span> <a href="#"><span>2h</span></a></div>
  <div class="replies"><div role="article" aria-label="Reply by Sunrise Bakery" id="c1r"><a href="/sunrisebakery">Sunrise Bakery</a><div dir="auto">Hi Maya! Tuesday to Saturday only.</div><div><span role="button">Like</span> <span role="button" class="rp" data-who="Sunrise Bakery">Reply</span> <a href="#"><span>1h</span></a></div></div></div></div></li>
 <li><div role="article" aria-label="Comment by Tom B" id="c2"><a href="/tom.b">Tom B</a><div dir="auto">Love the rye 😍 how much for a whole loaf?</div><div><span role="button">Like</span> <span role="button" class="rp" data-who="Tom B">Reply</span> <a href="#"><span>3h</span></a></div></div></li>
</ul><div><div contenteditable="true" role="textbox" aria-label="Write a comment" id="main-box"></div></div></div></div>
<script>window.__events=[];addEventListener('submit',e=>window.__events.push('submit'),true);addEventListener('keydown',e=>{if(e.key==='Enter')window.__events.push('enter')},true);
document.addEventListener('click',e=>{const b=e.target.closest('.rp');if(!b)return;const art=b.closest('[role=article]');if(art.querySelector('.composer'))return;const d=document.createElement('div');d.className='composer';d.innerHTML='<div contenteditable="true" role="textbox" aria-label="Reply" id="reply-box"><span contenteditable="false" style="color:#06c">'+b.dataset.who+'</span>&nbsp;</div>';art.appendChild(d);d.firstChild.focus();});</script></body>`;
const IG = `<!doctype html><title>t</title>${COMMON}<body><main><article><header><a href="/sunrisebakery">sunrisebakery</a></header>
<ul style="list-style:none;padding:0"><li><h1>Fresh sourdough today! #bread</h1></li>
<li class="cm"><div><a href="/maya.k">maya.k</a> <span dir="auto">Do you deliver on Sundays?</span></div><div><time>2h</time> <button>Like</button> <div role="button" class="rp" data-who="maya.k">Reply</div></div></li>
<li class="cm"><div><a href="/tom_b">tom_b</a> <span dir="auto">Love the rye 😍 how much for a whole loaf?</span></div><div><time>3h</time> <button>Like</button> <div role="button" class="rp" data-who="tom_b">Reply</div></div></li></ul>
<form id="f"><textarea placeholder="Add a comment…" id="box"></textarea><button type="submit">Post</button></form></article></main>
<script>window.__events=[];addEventListener('submit',e=>{e.preventDefault();window.__events.push('submit')},true);addEventListener('keydown',e=>{if(e.key==='Enter')window.__events.push('enter')},true);
document.addEventListener('click',e=>{const b=e.target.closest('.rp');if(!b)return;const t=document.getElementById('box');t.value='@'+b.dataset.who+' ';t.focus();});</script></body>`;
const TT = `<!doctype html><title>t</title>${COMMON}<body><div data-e2e="browse-video-desc">Pasta in 60 seconds #food</div><span data-e2e="browse-username">chef</span>
<div class="DivCommentListContainer">
<div class="DivCommentItemContainer"><a href="/@maya.k" data-e2e="comment-username-1">maya.k</a><p data-e2e="comment-level-1">Recipe please!!</p><span>2h</span> <span data-e2e="comment-reply-1" class="rp">Reply</span></div>
<div class="DivCommentItemContainer"><a href="/@tom_b" data-e2e="comment-username-1">tom_b</a><p data-e2e="comment-level-1">Which flour do you use?</p><span>3h</span> <span data-e2e="comment-reply-1" class="rp">Reply</span></div></div>
<div data-e2e="comment-input"><div contenteditable="true" id="box"></div></div>
<script>window.__events=[];addEventListener('keydown',e=>{if(e.key==='Enter')window.__events.push('enter')},true);document.addEventListener('click',e=>{if(e.target.closest('.rp'))document.getElementById('box').focus();});</script></body>`;
module.exports = { FB, IG, TT };

/* "My journey" — the career as a ladder, built from Bahaghari's approved
 * design (mockup v10, side-on ladder). The art and the rig are Bahaghari's;
 * the data, copy and lifecycle (shadow root, API chapters, pager markers,
 * off-screen pause, cleanup) are the site's. Edit it here directly.
 *
 * mountJourney(host, chapters, options) draws the scene into a shadow root on
 * `host`, so its generic class names (.stage, .card, .nav…) can never meet the
 * site's, and returns a cleanup function.
 *
 * Motion: scroll only sets a target. A critically damped follower (SmoothDamp)
 * chases it, keeping its velocity when the target moves, capped at a human
 * climbing pace, so the figure never jumps or restarts. Each stop owns one
 * band of scroll: hold 30%, climb 50%, hold 20%. Limbs are driven by the
 * distance travelled, so the pose always follows the position. Only transform
 * and opacity are written per frame.
 *
 * Nothing on the stage reports progress: no counters, no filling bars. The
 * year plate on the wall is a static marker for the card on screen.
 *
 * Below 1024 wide, and in landscape no taller than 540, mountCompact draws
 * the journey one stop at a time instead; mountJourney swaps between the two.
 * Neither scrolls inside itself and neither places a scroll-snap point: only
 * the page scrolls. View more on a card calls options.onMore, which opens
 * JourneyStopModal in the light DOM.
 */

const CSS = `
:host{display:block;--display:var(--font-display);--body:var(--font-body);--mono:var(--font-mono,ui-monospace,monospace);
--accent:#c2766b;--stage-bg:#0f0e0c;--line:#2a2823;--rule:#3a3830;--ink:#eceae4;--muted:#a9a49a;--faint:#8c877d;
--ease-out:cubic-bezier(.23,1,.32,1);font-family:var(--body);color:#f2f0ea}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
button{font:inherit}
a{color:inherit;text-decoration:none}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.track{position:relative}
.stage{position:sticky;top:var(--header-h,72px);height:calc(100svh - var(--header-h,72px));min-height:540px;display:grid;grid-template-columns:1fr 1fr;background:var(--stage-bg);overflow:hidden;color:#f2f0ea}
.scene{position:relative;min-height:0}
.scene svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.t-mono{font-family:var(--mono)}.t-display{font-family:var(--display)}.t-body{font-family:var(--body)}
.side{display:grid;place-items:center;min-height:0;padding:32px var(--page-x,64px)}
.breath{transform-box:fill-box;transform-origin:50% 100%;animation:breathe 3.6s ease-in-out infinite}
@keyframes breathe{0%,100%{transform:none}50%{transform:scale(1.012,1.018)}}
#figS,#figF{transition:opacity 200ms ease}
#bub,#rbub{opacity:0;transition:opacity 240ms ease}
#bub[data-on=true],#rbub[data-on=true]{opacity:1}
.plq .hi{opacity:0;transition:opacity 240ms ease}
.plq[data-on=true] .hi{opacity:1}
.mouth{transform-box:fill-box;transform-origin:50% 0}
#figF[data-talk=true] .mouth{animation:talk 160ms ease-in-out 12 alternate}
@keyframes talk{to{transform:scaleY(1.7)}}

.card{width:min(500px,100%)}
.card__body{transition:opacity 240ms var(--ease-out),transform 240ms var(--ease-out)}
.card__body[data-state=out]{opacity:0;transform:translate3d(0,-6px,0);transition-duration:150ms}
.card__body[data-state=in]{opacity:0;transform:translate3d(0,8px,0);transition:none}
.kind{display:inline-flex;align-items:center;gap:6px;font-size:.6875rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
.kind svg{width:13px;height:13px}
.card h3{margin-top:12px;font:600 clamp(1.625rem,2.4vw,2.125rem)/1.05 var(--display);letter-spacing:-.015em;color:#f2f0ea}
.org{margin-top:6px;font-size:1rem;color:var(--muted)}
.facts{display:grid;grid-auto-flow:column;grid-auto-columns:max-content;gap:0 28px;margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
.lbl{font-size:.625rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.val{margin-top:6px;font-size:.875rem;font-weight:500;color:var(--ink)}
.val--mono{font:600 .8125rem/1.3 var(--mono)}
.short{margin-top:16px;font-size:1rem;line-height:1.5;color:#e4e1da}
.clamp3{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
.sec{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
.did{list-style:none;display:grid;gap:6px;margin-top:10px}
.did li{position:relative;padding-left:16px;font-size:.875rem;line-height:1.4;color:#d9d5cc}
.did li::before{content:'';position:absolute;left:0;top:.55em;width:6px;height:6px;border-radius:50%;background:var(--accent)}
.did--short li{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.more{display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px 8px;min-height:44px;margin-top:4px;padding:0 2px;background:none;border:0;cursor:pointer;color:#f2f0ea;font-size:.875rem;font-weight:600;text-align:left;text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:2px;text-underline-offset:6px;transition:text-decoration-color 160ms ease,transform 160ms ease;touch-action:manipulation;-webkit-user-select:none;user-select:none}
.more span{display:inline-block;font-weight:500;color:var(--faint)}
.more svg{width:12px;height:12px;color:var(--accent);transition:transform 200ms var(--ease-out)}
.close{margin-top:12px;font-size:1.0625rem;line-height:1.55;color:#cfcac0}
.nav{display:flex;align-items:center;gap:8px;margin-top:28px}
.nav[hidden]{display:none}
.pill{min-height:44px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--rule);border-radius:999px;background:transparent;color:#f2f0ea;font-size:.8125rem;font-weight:500;cursor:pointer;transition:border-color 160ms ease,color 160ms ease,transform 160ms ease}
.pill--fill{background:#24221d;border-color:#24221d}
.pill svg{width:12px;height:12px}
.pill:disabled{opacity:.4;cursor:not-allowed}
.hint{margin-left:auto;display:flex;align-items:center;gap:4px;font-size:.6875rem;color:var(--faint)}
.hint kbd{display:inline-grid;place-items:center;width:18px;height:18px;border:1px solid var(--rule);border-radius:4px;font:500 .625rem var(--mono)}
@media (hover:hover) and (pointer:fine){
  .pill:hover:not(:disabled){border-color:var(--accent);color:#fff}
  .more:hover{text-decoration-color:#f2f0ea}.more:hover svg{transform:translate(1px,-1px)}
}
.pill:active:not(:disabled),.more:active{transform:scale(.97)}

.kick{display:flex;align-items:center;gap:10px;font-size:.6875rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.kick::before{content:'';width:22px;height:2px;background:currentColor}
.intro-t{margin-top:14px;font:600 clamp(2.25rem,4vw,3.25rem)/1.02 var(--display);letter-spacing:-.02em;color:#f2f0ea}
.intro-l{margin-top:16px;max-width:30em;font-size:clamp(1rem,1.3vw,1.125rem);line-height:1.5;color:#e4e1da}
.intro-l span{opacity:0;transition:opacity 300ms ease}
.intro-l[data-on=true] span{opacity:1}
.intro-how{margin-top:12px;max-width:32em;font-size:.9375rem;line-height:1.55;color:var(--muted)}
.cue{display:flex;align-items:center;gap:8px;margin-top:22px;font-size:.6875rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.cue svg{width:12px;height:12px}
.skip{margin-top:48px}

/* Below 1024 wide, and in short landscape, mountCompact draws the journey
   instead, so this layout only meets laptop and desktop heights. The card
   never scrolls inside itself: on a short screen it tightens instead. */
@media (max-height:820px){
  .side{padding:24px var(--page-x,64px)}
  .card h3{margin-top:10px}
  .facts{margin-top:14px;padding-top:12px}
  .short{margin-top:12px}.clamp3{-webkit-line-clamp:2}
  .sec{margin-top:12px;padding-top:12px}
  .did--short li{-webkit-line-clamp:1}
  .nav{margin-top:20px}
}
:host([data-reduce=true]) .track{height:auto!important}
:host([data-reduce=true]) .stage{position:relative;top:0;height:min(92svh,820px)}
:host([data-reduce=true]) .breath,:host([data-reduce=true]) .mouth{animation:none!important}
:host([data-reduce=true]) .card__body,:host([data-reduce=true]) .intro-l span,:host([data-reduce=true]) #figS,:host([data-reduce=true]) #figF,:host([data-reduce=true]) #bub,:host([data-reduce=true]) #rbub,:host([data-reduce=true]) .plq .hi,:host([data-reduce=true]) .pill,:host([data-reduce=true]) .more,:host([data-reduce=true]) .more svg{transition:none}
`;

const MARKUP = `
<div class="track" id="track">
  <div class="stage" id="stage">
    <div class="scene" aria-hidden="true">
      <svg id="svg" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="spot"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".28"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></radialGradient>
          <linearGradient id="ft" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="#0f0e0c"/><stop offset="1" stop-color="#0f0e0c" stop-opacity="0"/></linearGradient>
          <linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f0e0c" stop-opacity="0"/><stop offset="1" stop-color="#0f0e0c"/></linearGradient>
          <linearGradient id="rail" x1="0" x2="1"><stop offset="0" stop-color="#ece8de"/><stop offset=".55" stop-color="#d4d0c6"/><stop offset="1" stop-color="#a9a59b"/></linearGradient>
          <linearGradient id="railF" x1="0" x2="1"><stop offset="0" stop-color="#8a867d"/><stop offset="1" stop-color="#5f5c55"/></linearGradient>
          <linearGradient id="rung" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2ded4"/><stop offset=".5" stop-color="#b3afa5"/><stop offset="1" stop-color="#6f6b63"/></linearGradient>
          <linearGradient id="wall" x1="0" x2="1"><stop offset="0" stop-color="#1a1813"/><stop offset=".3" stop-color="#151410"/><stop offset="1" stop-color="#11100d"/></linearGradient>
          <pattern id="palm" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
            <rect width="14" height="14" fill="#e9e6df"/>
            <path d="M7 13.5C6.6 10.4 7 7.8 7.6 5.6M7.6 5.6C5 3.6 2.6 4 1 6M7.6 5.6C6 2.6 3.6 1.2 1.6 1.6M7.6 5.6C9.6 2.6 12 1.6 13.6 2.4M7.6 5.6C10.4 4.4 12.6 5.2 13.4 7" stroke="#1d1d1f" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          </pattern>
        </defs>
        <g id="cam"></g>
        <rect x="-400" y="-300" width="1200" height="520" fill="url(#ft)"/>
        <rect x="-400" y="520" width="1200" height="200" fill="url(#fb)"/>
      </svg>
    </div>
    <div class="side">
      <article class="card">
        <div class="card__body" id="body" aria-live="polite"></div>
        <div class="nav" id="nav">
          <button type="button" class="pill" id="prev"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M3 7l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>Previous</button>
          <button type="button" class="pill pill--fill" id="next">Next<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10V2M3 5l3-3 3 3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>
          <span class="hint" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd>&nbsp;to climb</span>
        </div>
      </article>
    </div>
  </div>
</div>`;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ICON={education:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 6l7-3 7 3-7 3-7-3zm3 1.5V11c1 1 2.5 1.5 4 1.5s3-.5 4-1.5V7.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',work:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 5h12v8H2zM6 5V3h4v2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>'};
const DOWN='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M3 7l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const COUNT=['No','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'];
const plateText=s=>{const y=String(s.period).match(/\d{4}/g);return y?[...new Set(y)].join('–'):''};
const MORE='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2h6v6M10 2 2 10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const END_KIND='Still climbing',END_TITLE='Still moving forward',END_SAY='Looking for better opportunities, still learning, and building my empire.';
const END_HTML=`<p class="kind">${END_KIND}</p><h3>${END_TITLE}</h3><p class="close">${END_SAY}</p>`;
const stopsWord=N=>`${COUNT[N]??String(N)} stop${N===1?'':'s'}`;
/* Desktop (the ladder scene) */
const ledeOf=N=>`College at the bottom, every job a rung above it, from junior to senior. ${stopsWord(N)} so far, and I’m still climbing.`;
const HOW='Scroll to climb. I stop at every role to tell you what it was: the company, what I did in plain words, the tools I used, and what I built there.';
/* Compact (below 1024 and short landscape): there is no ladder there, so no ladder words */
const C_TITLE='My career, one stop at a time.';
const cLedeOf=N=>`From college to senior roles. ${stopsWord(N)} so far, and I’m still moving forward.`;
const C_HOW='Scroll, or use <kbd>↑</kbd> <kbd>↓</kbd>, to go through each role: the company, what I did in plain words, the tools I used, and what I built there.';

/* A stop's card, the same on every screen: kind, position, organisation,
   when / where / sector, the summary (clamped), the first three things done,
   and View more, which opens JourneyStopModal with everything else. */
function stopHTML(s,k){
  const did=s.did??[],rest=did.length-3;
  const extra=[rest>0?`${rest} more`:'',s.tools?.length?'tools':'',s.projects.length?'Built here':''].filter(Boolean).join(', ');
  return `<p class="kind">${ICON[s.kind]??ICON.work}${s.kind==='education'?'School':'Work'}</p><h3>${esc(s.title)}</h3><p class="org">${esc(s.org)}</p>
  <div class="facts"><div><p class="lbl">When</p><p class="val val--mono">${esc(s.period)}</p></div><div><p class="lbl">Where</p><p class="val">${esc(s.loc)}</p></div>${s.sector?`<div><p class="lbl">Sector</p><p class="val">${esc(s.sector)}</p></div>`:''}</div>
  ${s.short?`<p class="short clamp3">${esc(s.short)}</p>`:''}
  <div class="sec">${did.length?`<p class="lbl">What I did</p><ul class="did did--short">${did.slice(0,3).map(d=>`<li>${esc(d)}</li>`).join('')}</ul>`:''}<button type="button" class="more" data-more="${k}" aria-haspopup="dialog" aria-label="View more about ${esc(s.title)} at ${esc(s.org)}">View more${extra?` <span>${esc(extra)}</span>`:''}${MORE}</button></div>`;
}

function mountLadder(host, root, chapters, options) {
  root.innerHTML = `<style>${CSS}</style>${MARKUP}`;
  const $ = (id) => root.getElementById(id);
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mq.matches;
  const S = chapters;
  const N = S.length;
  const markers = options.markers ?? [];
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
    return t;
  };

const INTRO=-1,END=N,RH=17,PER=4,D=180/Math.PI;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),lerp=(a,b,t)=>a+(b-a)*t,f=n=>n.toFixed(2);
const smooth=t=>t*t*(3-2*t),smoother=t=>t*t*t*(t*(6*t-15)+10),easeSine=t=>-(Math.cos(Math.PI*t)-1)/2;

/* ---------- the card: stopHTML (module scope), the intro and the closing line ---------- */
function intro(){
  const lede=ledeOf(N);
  return `<p class="kick">The Journey</p><h2 class="intro-t">This ladder is my career.</h2><p class="intro-l" id="lede">${lede.split(' ').map(w=>`<span>${esc(w)} </span>`).join('')}</p>
  <p class="intro-how">${HOW}</p>
  <p class="cue">${DOWN}Scroll to begin</p><button type="button" class="pill skip" id="skip">Skip intro</button>`;
}
function cardHTML(k){
  if(k===INTRO)return intro();
  if(k===END)return END_HTML;
  return stopHTML(S[k],k);
}
let swapT=0,first=true;
function fill(k){
  $('body').innerHTML=cardHTML(k);$('nav').hidden=k===INTRO;
  if(k!==INTRO)return;
  $('skip').onclick=()=>scrollToBand(1);
  const l=$('lede');
  if(reduce){l.dataset.on='true';return}
  [...l.children].forEach((s,i)=>{s.style.transitionDelay=i*40+'ms'});
  requestAnimationFrame(()=>requestAnimationFrame(()=>{l.dataset.on='true'}));
}
function render(k){
  const b=$('body');clearTimeout(swapT);timers.delete(swapT);
  if(reduce||first){first=false;b.dataset.state='';fill(k);return}
  b.dataset.state='out';
  swapT=later(()=>{fill(k);b.dataset.state='in';requestAnimationFrame(()=>requestAnimationFrame(()=>{b.dataset.state=''}))},150);
}
const onRootClick=e=>{
  const more=e.target.closest('button[data-more]');
  if(more){options.onMore?.(Number(more.dataset.more),more);return}
  const link=e.target.closest('a[data-nav]');
  if(!link)return;
  e.preventDefault();
  options.navigate(link.getAttribute('href'));
};
root.addEventListener('click',onRootClick);

/* ---------- Chrys: a jointed side rig (climbing) and a front rig (talking) ---------- */
const SK='#c98e5e',SKF='#a7714a',TEE='#1e1e21',TEEF='#161618',HAIR='#141110',EAR='#b5784b',LINE='#9a6340';
const sneaker=c=>`<path d="M-5 -4C-5.4 -6 1 -6.4 3.4 -4.4L10.5 -2C13.6 -1 14.2 2.4 12.6 3.4L-5 3.4C-6 1.4-5.8 -1.8-5 -4Z" fill="${c}"/><path d="M-5.2 3.4H12.8" stroke="#3a3833" stroke-width="1.8" stroke-linecap="round"/><path d="M1 -4L4 -1.6" stroke="#cfccc4" stroke-width="1"/>`;
const toe=`<path d="M-5.2 -3.6C-5.2 -5.6 5.2 -5.6 5.2 -3.6L5.8 3.4H-5.8Z" fill="#f4f3ef"/><path d="M-5.8 3.4H5.8" stroke="#3a3833" stroke-width="1.8"/>`;
const SHORTS='M-7 -3C-7.6 5-7.2 12-6.6 18.5L6.4 18.5C7 12 7.4 5 6.8 -3C3 -6-3 -6-7 -3Z';
const legM=(id,far,shoe)=>{const sk=far?SKF:SK;return `<g id="${id}"><path d="M-4.7 13C-4.9 18-4.4 23-4.1 26L4.1 26C4.4 23 4.9 18 4.7 13Z" fill="${sk}"/><path d="${SHORTS}" fill="url(#palm)"/>${far?`<path d="${SHORTS}" fill="#000" opacity=".38"/>`:''}<path d="M-6.6 18.5H6.4" stroke="#1d1d1f" stroke-width="1"/>
 <g id="${id}b"><circle r="4.4" fill="${sk}"/><path d="M-4.4 0C-6.4 6-5.2 14-3.2 21L3 21C3.8 14 4.8 7 4.4 0Z" fill="${sk}"/><rect x="-3.6" y="19.5" width="7" height="4.5" rx="1.6" fill="#f2f0ea"/><g id="${id}e">${shoe}</g></g></g>`};
const armM=(id,far,watch)=>{const sk=far?SKF:SK;return `<g id="${id}"><path d="M-3.9 -1C-4.1 7-3.5 14-3.2 19L3.2 19C3.5 14 4.1 7 3.9 -1Z" fill="${sk}"/><path d="M-6 -4C-6.6 3-6 9-5.4 12.5L5.6 12.5C6.2 9 6.6 3 6 -4C3 -7.5-3 -7.5-6 -4Z" fill="${far?TEEF:TEE}"/>
 <g id="${id}b"><circle r="3.2" fill="${sk}"/><path d="M-3.2 0C-3.3 7-2.7 13-2.5 18L2.5 18C2.7 13 3.3 7 3.2 0Z" fill="${sk}"/>${watch?'<rect x="-3.2" y="13" width="6.4" height="3.2" rx="1" fill="#c9ccd1"/><rect x="-3.2" y="13" width="6.4" height="1" fill="#eef0f2"/>':''}
 <g id="${id}e"><path d="M-3.2 -.5C-4 3.4-2.6 7.6.8 8C3.8 8.2 4.6 4.2 3.6 -.5Z" fill="${sk}"/><path d="M2.8 1.2C5 1.8 5.6 3.8 4.4 5" fill="none" stroke="${sk}" stroke-width="2.2" stroke-linecap="round"/></g></g></g>`};
const SIDE_HEAD=`<path d="M-4.6 1L-4.2 -8L4.6 -8L4.9 1Z" fill="#b07a4e"/><g transform="translate(1.5 -18)">
 <path d="M-9.4 -1C-9.8 -9-5 -13 1 -13C6.4 -13 10 -9.6 10.2 -4.4C10.4 -2.6 10.6 -1.4 11.2 -.2C12 1.4 13 2.8 13 3.6C13 4.4 12.2 4.6 11.2 4.6C11.4 5.4 11.6 6 11.2 6.6C11.6 7.2 11.4 8 10.6 8.4C10.8 9.4 10.2 10.6 8.6 11.4C6.4 12.6 3 12.8 .6 12C-4.6 11-8.6 6.6-9.4 -1Z" fill="${SK}"/>
 <path d="M.6 12C3 11 5.2 9.4 6.4 7.4" stroke="#a86f45" stroke-width=".8" fill="none" opacity=".6"/>
 <path d="M-10 -.8C-11 -9.6-5.4 -14.6 1.2 -14.4C7.4 -14.2 10.8 -10.6 10.4 -6C8.6 -8.4 5.6 -9.4 2 -9.2C-1 -9-3.4 -7.8-4.6 -5.6C-5.6 -3.8-6.4 -1.6-6.8 1C-8.6 1.4-9.8 .4-10 -.8Z" fill="${HAIR}"/>
 <path d="M-6.8 1C-6.8 3-6.2 4.6-5.4 5.6" stroke="#3a302a" stroke-width="2" opacity=".45" fill="none"/>
 <path d="M-3.8 -1.6C-6.2 -2.2-7 1-6 3.6C-5.4 5-4 5.2-3.4 4.4Z" fill="${EAR}"/><path d="M-4.6 0C-5.4 1-5.2 2.6-4.4 3.2" stroke="#8f5a35" stroke-width=".7" fill="none"/>
 <path d="M5.4 -4.4C6.8 -5.2 8.4 -5.2 9.6 -4.6" stroke="${HAIR}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
 <path d="M6.2 -1.8C7 -2.6 8.4 -2.6 9.2 -1.8C8.4 -1.1 7 -1.1 6.2 -1.8Z" fill="#f4efe8"/><circle cx="8.2" cy="-1.8" r=".9" fill="#2a1a10"/><path d="M6 -2C7 -3 8.6 -3 9.4 -2" stroke="#2a1a10" stroke-width=".7" fill="none"/>
 <path d="M11 3.8C11.4 4.2 11.8 4.2 12.2 4" stroke="${LINE}" stroke-width=".7" fill="none"/><path d="M10.6 6.8H11.6" stroke="#7a3f2a" stroke-width=".8"/>
 <path id="ssmile" d="M9.6 6.2C10.2 7.6 11.2 7.8 11.9 6.6" stroke="#7a3f2a" stroke-width=".9" fill="none" stroke-linecap="round" opacity="0"/><path d="M6.4 5.4C7.4 6.2 8.4 6.4 9 6" stroke="#b5784b" stroke-width=".7" fill="none" opacity=".5"/></g>`;
const sideRig=p=>armM(p+'aF',true,false)+legM(p+'lF',true,sneaker('#dcdad4'))+
 `<g id="${p}tor"><g class="breath"><path d="M-11 4C-12.6 -8-12.4 -24-9.6 -35C-5 -40 5.5 -40 9.4 -35.5C12.6 -28 13.6 -14 11.8 4C4 6-4 6-11 4Z" fill="${TEE}"/><path d="M-11 4C-12.6 -8-12.4 -24-9.6 -35C-8.6 -36-7.8 -36.6-7 -37C-8.8 -26-9 -10-8 5C-9 4.8-10 4.5-11 4Z" fill="#000" opacity=".2"/><path d="M4 -20C6 -14 7 -8 7.5 1" stroke="#2e2e33" stroke-width="1" fill="none"/><circle cx="6" cy="-27" r="1.4" fill="#55524b"/></g></g>`+
 `<g id="${p}hd">${SIDE_HEAD}</g>`+legM(p+'lN',false,sneaker('#f4f3ef'))+armM(p+'aN',false,true);
const TORSO_W='M-13 4C-14 -10-14 -26-12.4 -36C-6 -40.6 6 -40.6 12.4 -36C14 -26 14 -10 13 4Z';
const frontRig=p=>legM(p+'lR',true,toe)+legM(p+'lL',false,toe)+
 `<g id="${p}tor"><g class="breath"><path d="${TORSO_W}" fill="${TEE}"/><path d="M-5 -38.6C-3 -35.2 3 -35.2 5 -38.6" stroke="#2e2e33" stroke-width="1.4" fill="none"/><circle cx="6" cy="-28" r="1.4" fill="#55524b"/><path d="M-6 -20C-5 -12-5 -5-6 3M7 -16C7.6 -9 7.6 -3 7 3" stroke="#2a2a2e" stroke-width="1" fill="none"/></g></g>`+
 armM(p+'aR',false,false)+armM(p+'aL',false,true)+
 `<g id="${p}hd"><path d="M-4.6 0L-4.2 -8L4.2 -8L4.6 0Z" fill="#b07a4e"/><path d="M-4.4 -3C-1.6 -1.4 1.6 -1.4 4.4 -3" stroke="#9a6340" stroke-width=".8" fill="none" opacity=".6"/><g transform="translate(0 -18)">
  <path d="M-10.6 -1.5C-13.2 -2.4-14 1.6-12.6 4.2C-11.8 5.6-10.6 5.6-10 5Z" fill="${EAR}"/><path d="M10.6 -1.5C13.2 -2.4 14 1.6 12.6 4.2C11.8 5.6 10.6 5.6 10 5Z" fill="${EAR}"/>
  <path d="M-10.4 -2C-10.6 -9.6-5.8 -13 0 -13C5.8 -13 10.6 -9.6 10.4 -2C10.4 3 9.6 7 7.4 9.6C5.4 11.8 2.8 12.8 0 12.8C-2.8 12.8-5.4 11.8-7.4 9.6C-9.6 7-10.4 3-10.4 -2Z" fill="${SK}"/>
  <path d="M-7.4 9.6C-5.4 11.8-2.8 12.8 0 12.8C2.8 12.8 5.4 11.8 7.4 9.6C5 11 2.6 11.6 0 11.6C-2.6 11.6-5 11-7.4 9.6Z" fill="#a86f45" opacity=".5"/>
  <path d="M-10.6 -2.5C-11.4 -10.5-6 -14.6 0 -14.6C6 -14.6 11.4 -10.5 10.6 -2.5C10.2 -5.4 9.4 -7.2 8 -8.2C5.4 -9.4 2.6 -9.6 0 -9.6C-2.6 -9.6-5.4 -9.4-8 -8.2C-9.4 -7.2-10.2 -5.4-10.6 -2.5Z" fill="${HAIR}"/>
  <path d="M-10.6 -2.5C-10.6 0-10.4 1.6-10 2.6M10.6 -2.5C10.6 0 10.4 1.6 10 2.6" stroke="#3a302a" stroke-width="1.6" opacity=".55" fill="none"/>
  <path d="M-7 -4.6C-5.4 -5.6-3.6 -5.6-2.2 -4.8M2.2 -4.8C3.6 -5.6 5.4 -5.6 7 -4.6" stroke="${HAIR}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <ellipse cx="-4.4" cy="-1.4" rx="2" ry="1.2" fill="#f4efe8"/><ellipse cx="4.4" cy="-1.4" rx="2" ry="1.2" fill="#f4efe8"/>
  <circle cx="-4" cy="-1.4" r="1" fill="#2a1a10"/><circle cx="4.8" cy="-1.4" r="1" fill="#2a1a10"/>
  <path d="M-6.4 -1.8C-5 -3-3.6 -3-2.4 -1.9M2.4 -1.9C3.6 -3 5 -3 6.4 -1.8" stroke="#2a1a10" stroke-width=".8" fill="none"/>
  <path d="M-.6 -.6C-.8 1.8-1.6 3.4-2.2 4.2C-1.4 5 1.4 5 2.2 4.2" stroke="${LINE}" stroke-width=".9" fill="none" stroke-linecap="round"/>
  <g class="mouth"><path d="M-3.4 7.2C-1.2 8.2 1.2 8.2 3.4 7.2C2 9-2 9-3.4 7.2Z" fill="#8a4a36"/><path d="M-3.4 7.2C-1.2 6.6 1.2 6.6 3.4 7.2" stroke="#7a3f2a" stroke-width=".7" fill="none"/></g></g></g>`;
const bubble=`<g id="bub"><rect x="0" y="-48" width="190" height="48" rx="8" fill="#f2f0ea"/><path d="M8 -1L2 9L18 -1Z" fill="#f2f0ea"/><text class="t-body" fill="#14130f"><tspan x="10" y="-32" font-size="10.5" font-weight="600">Hi, I’m Chrys.</tspan><tspan x="10" y="-19" font-size="9.5" fill="#3a3833">This is the ladder of my journey,</tspan><tspan x="10" y="-7" font-size="9.5" fill="#3a3833">and I’m still climbing it.</tspan></text></g>`;
/* the stop bubble: period, role, then one plain sentence built from the stop's facts */
const RW=208;
const rbubble=`<g id="rbub"><rect id="rbr" x="0" width="${RW}" rx="10" fill="#f2f0ea"/><path id="rbt" fill="#f2f0ea"/><text id="rbtx"></text></g>`;
function wrap(t,max){const out=[];let line='';for(const w of String(t).split(' ')){if(line&&(line+' '+w).length>max){out.push(line);line=w}else line=(line+' '+w).trim()}if(line)out.push(line);return out}

/* ---------- the ladder: 3/4 side view, near and far stiles, round rungs ---------- */
const E={};const el=id=>E[id]||(E[id]=$(id)),set=(id,t)=>el(id).setAttribute('transform',t);
function world(){
  const top=(N+40)*PER,H=top*RH;let rungs='',rv='',br='',seams='',plq='';
  for(let i=1;i<=top;i++){const y=-i*RH;
    rungs+=`<rect x="4" y="${y-1.7}" width="13" height="3.4" rx="1.7" fill="url(#rung)"/>`;
    rv+=`<circle cx="3" cy="${y}" r="1.9" fill="#c9c5bb"/><circle cx="3" cy="${y}" r=".8" fill="#7d7970"/>`}
  for(let i=3;i<=top;i+=5){const y=-i*RH-8;br+=`<rect x="19" y="${y-1.5}" width="22" height="3" fill="#4a4741"/><rect x="19" y="${y-1.5}" width="22" height="1" fill="#625e57"/><rect x="40" y="${y-5}" width="3" height="10" fill="#3a3833"/>`}
  for(let y=96;y<H+300;y+=96)seams+=`<line x1="43" y1="${-y}" x2="940" y2="${-y}"/>`;
  S.forEach((s,i)=>{const y=-i*PER*RH-RH*.5;
    plq+=`<g class="plq" id="plq${i}" transform="translate(52 ${y})"><rect x="0" y="-8" width="46" height="16" rx="2" fill="#1d1c18" stroke="#3a3830"/><rect class="hi" x="0" y="-8" width="46" height="16" rx="2" fill="none" stroke="#c2766b" stroke-width="1.4"/><rect class="hi" x="-6" y="-1" width="6" height="2" fill="#c2766b"/><text class="t-mono" x="23" y="2.6" text-anchor="middle" font-size="7" font-weight="600" fill="#a9a49a">${esc(plateText(s))}</text></g>`});
  return `<rect x="43" y="${-H-300}" width="900" height="${H+300}" fill="url(#wall)"/><g stroke="#1d1b16" stroke-width="1">${seams}</g><rect x="43" y="${-H-300}" width="2.5" height="${H+300}" fill="#0a0907"/>`+
    `<rect x="-700" y="0" width="1640" height="400" fill="#13120e"/><rect x="-700" y="0" width="1640" height="1" fill="#2e2c26"/>`+
    `<ellipse cx="-30" cy="2" rx="190" ry="18" fill="url(#spot)"/><circle cx="-20" cy="-80" r="200" fill="url(#spot)" opacity=".3"/>`+plq+
    `<rect x="15" y="${-H}" width="4" height="${H}" fill="url(#railF)"/>${br}<rect x="13.5" y="-3" width="7" height="3.5" rx="1" fill="#2a2925"/>${rungs}`+
    `<ellipse cx="0" cy="1.5" rx="34" ry="3" fill="#000" opacity=".45"/>`+
    `<g id="figS">${sideRig('s')}</g><g id="figF">${frontRig('f')}</g>`+
    `<rect x="0" y="${-H}" width="6" height="${H}" fill="url(#rail)"/><rect x="5.2" y="${-H}" width=".8" height="${H}" fill="#8f8b82"/>`+
    `<g>${rv}</g><rect x="-1.5" y="-3" width="9" height="3.5" rx="1" fill="#2a2925"/>`+bubble+rbubble;
}

/* ---------- rig maths: two-bone IK per limb, gait driven by distance ---------- */
const rot=(p,d)=>{const r=d/D,c=Math.cos(r),s=Math.sin(r);return{x:p.x*c-p.y*s,y:p.x*s+p.y*c}};
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y}),mix=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});
function gait(c,o){const s=(c-o)/2,n=Math.floor(s),t=s-n,base=o+2*n;return t<.5?{p:base+2*smoother(t/.5),m:Math.sin(Math.PI*t/.5)}:{p:base+2,m:0}}
function gait4(c,off,shift){const s=c/2-off,n=Math.floor(s),t=s-n,base=2*n+2*off+shift;return t<.25?{p:base+2*smoother(t/.25),m:Math.sin(Math.PI*t/.25)}:{p:base+2,m:0}}
function seg(id,R,T,a,b,pick,level,lim){
  const dx=T.x-R.x,dy=T.y-R.y,d=clamp(Math.hypot(dx,dy),Math.abs(a-b)+.5,a+b-.05),bs=Math.atan2(dy,dx),al=Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1));
  let J=pick({x:R.x+a*Math.cos(bs+al),y:R.y+a*Math.sin(bs+al)},{x:R.x+a*Math.cos(bs-al),y:R.y+a*Math.sin(bs-al)});
  if(lim!==undefined&&J.x>lim&&Math.abs(lim-R.x)<a)J={x:lim,y:R.y+Math.sqrt(a*a-(lim-R.x)**2)};
  const a1=Math.atan2(J.y-R.y,J.x-R.x)*D-90,a2=Math.atan2(T.y-J.y,T.x-J.x)*D-90;
  set(id,`translate(${f(R.x)} ${f(R.y)}) rotate(${f(a1)})`);set(id+'b',`translate(0 ${a}) rotate(${f(a2-a1)})`);
  set(id+'e',`translate(0 ${b}) rotate(${level?f(-a2):0})`);
}
function segFS(id,R,T,a,b,side){
  const dx=T.x-R.x,dy=T.y-R.y,d0=Math.hypot(dx,dy)||1,d=Math.min(d0,a+b),ux=dx/d0,uy=dy/d0,r=d/(a+b);
  const J={x:R.x+ux*d*a/(a+b)+side*5*Math.sqrt(Math.max(0,1-r*r)),y:R.y+uy*d*a/(a+b)},T2={x:R.x+ux*d,y:R.y+uy*d};
  const s1=Math.hypot(J.x-R.x,J.y-R.y)/a,s2=Math.hypot(T2.x-J.x,T2.y-J.y)/b;
  const a1=Math.atan2(J.y-R.y,J.x-R.x)*D-90,a2=Math.atan2(T2.y-J.y,T2.x-J.x)*D-90;
  set(id,`translate(${f(R.x)} ${f(R.y)}) rotate(${f(a1)}) scale(1 ${f(s1)})`);
  set(id+'b',`translate(0 ${a}) scale(1 ${f(1/s1)}) rotate(${f(a2-a1)}) scale(1 ${f(s2)})`);
  set(id+'e',`translate(0 ${b}) scale(1 ${f(1/s2)}) rotate(${f(-a2)})`);
}
function sidePose(p,hip,lean,feet,hands,tilt,b,klim){
  const sh=add(hip,rot({x:1,y:-33},lean)),nk=add(hip,rot({x:1,y:-37},lean)),Hd=hands(sh);
  const knee=(q,r)=>q.x>r.x?q:r,elbow=(q,r)=>(q.y*b-q.x*(1-b))>(r.y*b-r.x*(1-b))?q:r;
  seg(p+'lF',hip,feet[0],25,25,knee,true,klim);seg(p+'lN',hip,feet[1],25,25,knee,true,klim);
  seg(p+'aN',sh,Hd[0],19,18,elbow,false);seg(p+'aF',sh,Hd[1],19,18,elbow,false);
  set(p+'tor',`translate(${f(hip.x)} ${f(hip.y)}) rotate(${f(lean)})`);
  set(p+'hd',`translate(${f(nk.x)} ${f(nk.y)}) rotate(${f(lean*.6+tilt)})`);
  return nk;
}
const SOLE=3.4;
function frontPose(gx,g){
  const hy=-49,L=(q,r)=>q.x<r.x?q:r,dn=(q,r)=>q.y>r.y?q:r;
  segFS('flR',{x:gx-6,y:hy},{x:gx-7,y:-SOLE},25,25,-1);segFS('flL',{x:gx+6,y:hy},{x:gx+7,y:-SOLE},25,25,1);
  seg('faR',{x:gx-12,y:hy-33},{x:gx-15,y:hy-4},19,18,L,false);
  seg('faL',{x:gx+12,y:hy-33},mix({x:gx+15,y:hy-4},{x:gx+28,y:hy-31},g),19,18,dn,false);
  set('ftor',`translate(${f(gx)} ${hy})`);set('fhd',`translate(${f(gx)} ${hy-37})`);
  return{x:gx,y:hy-37};
}
function walkT(gx){const cw=gx/22;return{hip:{x:gx,y:-49-1.4*Math.abs(Math.sin(Math.PI*cw))},feet:[0,1].map(o=>{const w=gait(cw,o);return{x:w.p*22-11,y:-SOLE-9*w.m}})}}
const swing=(W,k)=>sh=>[0,1].map(o=>({x:sh.x+(W.feet[o].x-W.hip.x)*k,y:sh.y+33}));
const footB=p=>-p*RH-SOLE-2.2*clamp(p);
function climbB(c,idle){const s=Math.sin(Math.PI*c);
  const ks=[[.25,-.5],[.75,-.5]].map(([o,sh])=>gait4(c,o,sh));
  const feet=ks.map(k=>({x:-7-7*k.m,y:footB(k.p)-4*k.m}));
  return{hip:{x:-26+.6*s,y:(footB(ks[0].p)+footB(ks[1].p))/2-37+idle},lean:2+.6*s,feet,
    hands:[[0,0],[.5,0]].map(([o,sh])=>{const k=gait4(c,o,sh);return{x:-5-4*k.m,y:-(k.p+4)*RH-1-4*k.m}})}}

/* P < -1: walk in from off-left. P = -1: face you, talk. -1…-0.25: walk to the ladder. -0.25…0: step on. P ≥ 0: climb (1 = one stop). */
const XS=-90,XM=-26,P0=-1.85;
const gxOf=P=>P<-1?XS+(P+1)*180:P<-.25?lerp(XS,XM,(P+1)/.75):XM;
let CX=220,CY=330;
const G={P:P0,v:0,u:0,crawl:0,rk:-1,rAt:0,rT0:0,reactOn:false,react:0,look:0,idle:0,g:0,front:false,last:0,now:0,wasFront:false,started:false,shown:-2,manual:N-1};
function pose(P,idle,g,react,look,front){
  const b=smooth(clamp((P+.25)/.25)),c=Math.max(0,P)*PER,gx=gxOf(P),W=walkT(gx);
  const head=frontPose(gx,g);
  const K=climbB(c,idle),hip=mix(W.hip,K.hip,b),feet=[0,1].map(o=>mix(W.feet[o],K.feet[o],b)),ws=swing(W,.7);
  /* the stop gesture: the near hand lets go, waves twice away from the ladder, then re-grips */
  const wt=(G.now-G.rT0)/1000,wave=3.2*Math.sin(wt*Math.PI*2.2)*Math.exp(-wt*.9);
  const nk=sidePose('s',hip,lerp(3,K.lean-5*react,b),feet,sh=>ws(sh).map((h,o)=>{
      const grip=mix(h,K.hands[o],b);if(o||!react)return grip;
      return mix(grip,{x:sh.x-11+wave,y:sh.y-23},smooth(react))}),
    -4*idle*b-2*b-7*look,b,lerp(99,-2.5,b));
  el('ssmile').style.opacity=String(look);
  set('cam',`translate(${CX} ${f(CY-lerp(-49,-c*RH-46,b))})`);
  el('figF').style.opacity=front?'1':'0';el('figS').style.opacity=front?'0':'1';
  set('bub',`translate(${f(head.x+10)} ${f(head.y-30)})`);el('bub').dataset.on=String(front);
  const left=Math.max(-CX+8,nk.x-RW+40),tx=clamp(nk.x+4-left,16,RW-16);
  set('rbub',`translate(${f(left)} ${f(nk.y-44)})`);el('rbt').setAttribute('d',`M${f(tx-9)} -1L${f(tx+2)} 10L${f(tx+5)} -1Z`);
  if(front!==G.wasFront){G.wasFront=front;el('figF').dataset.talk='false';if(front)requestAnimationFrame(()=>{el('figF').dataset.talk='true'})}
}
/* re-rendered only on arrival at a stop */
function setBubble(k){
  const s=S[k],lines=wrap(s.say,34),h=48+lines.length*12.5;
  el('rbr').setAttribute('y',f(-h));el('rbr').setAttribute('height',f(h));
  el('rbtx').innerHTML=`<tspan class="t-mono" x="12" y="${f(-h+15)}" font-size="8.5" font-weight="500" fill="#6a6762">${esc(s.period)}</tspan>`+
    `<tspan class="t-display" x="12" y="${f(-h+30)}" font-size="11" font-weight="600" fill="#14130f">${esc(s.title)}</tspan>`+
    lines.map((l,i)=>`<tspan class="t-body" x="12" y="${f(-h+45+i*12.5)}" font-size="9.8" font-weight="500" fill="#3a3833">${esc(l)}</tspan>`).join('');
}

/* ---------- the motion engine ----------
   scroll → target P (per band: hold 30% / climb 50% / hold 20%) → SmoothDamp
   follower that keeps its velocity on retarget, capped at a climbing pace. */
const TB=k=>k<=0?-1:k<=N?k-1:N-1+.6;
function targetOf(u){const k=Math.min(Math.floor(u),N),fr=u-k;return lerp(TB(k),TB(k+1),easeSine(clamp((fr-.3)/.5)))}
function sd(c,t,v,st,ms,dt){
  if(dt<=0)return[c,v];const o=2/st,x=o*dt,e=1/(1+x+.48*x*x+.235*x*x*x),T=t,mc=ms*st;
  const ch=clamp(c-t,-mc,mc);t=c-ch;const tmp=(v+o*ch)*dt;v=(v-o*tmp)*e;let out=t+(ch+tmp)*e;
  if((T-c>0)===(out>T)){out=T;v=0}return[out,v];
}
let geometry={top:0,scrollable:0,stageH:0};
function scrollToBand(k){
  window.scrollTo({top:geometry.top+geometry.scrollable*k/(N+1),behavior:reduce?'auto':'smooth'});
}
function fit(){
  const w=$('stage').querySelector('.scene').clientWidth,ph=w<560;
  $('svg').setAttribute('viewBox',ph?'0 0 300 450':'0 0 400 600');CX=ph?165:220;CY=ph?285:330;
}
function go(d){
  if(reduce){G.manual=clamp(G.manual+d,0,END);return}
  scrollToBand(clamp(Math.round(G.u)+d,0,N+1));
}
$('prev').onclick=()=>go(-1);$('next').onclick=()=>go(1);
const onKey=e=>{
  if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;
  if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey)return;
  const t=e.composedPath()[0];if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.closest?.('[aria-modal="true"]')))return;
  const r=$('stage').getBoundingClientRect();if(r.top>innerHeight*.5||r.bottom<innerHeight*.5)return;
  e.preventDefault();go(e.key==='ArrowUp'?1:-1);
};
document.addEventListener('keydown',onKey);

function tick(now){
  const dt=Math.min(.064,(now-(G.last||now))/1000);G.last=now;G.now=now;let shown,front=false;
  if(!reduce){
    const sc=geometry.scrollable,y=window.scrollY;
    G.u=sc>0?clamp((y-geometry.top)/sc)*(N+1):0;
    if(G.u>N+.95)G.crawl+=dt*.14;else G.crawl=0;   /* past the last stop he keeps climbing into the dark */
    const T=targetOf(G.u)+G.crawl;
    if(G.started){const ms=.5+.9*Math.max(0,Math.abs(T-G.P)-1),r=sd(G.P,T,G.v,.35,ms,dt);G.P=r[0];G.v=r[1]}
    const still=Math.abs(G.v)<.02;
    let k=-1;if(still){const r=Math.round(G.P);if(r>=0&&r<N&&Math.abs(G.P-r)<.006&&Math.abs(T-r)<.01)k=r}
    if(k!==G.rk){G.rk=k;G.rAt=0;G.reactOn=false;el('rbub').dataset.on='false';if(k>=0){setBubble(k);G.rAt=now+250}}
    if(G.rAt&&now>=G.rAt){G.rAt=0;G.reactOn=true;G.rT0=now;el('rbub').dataset.on='true'}
    if(G.reactOn&&now-G.rT0>1800)G.reactOn=false;     /* the wave ends; the bubble and the look stay while he waits */
    G.react+=((G.reactOn?1:0)-G.react)*(1-Math.pow(G.reactOn?.004:.0002,dt));
    G.look+=((G.rk>=0&&!G.rAt?1:0)-G.look)*(1-Math.pow(.01,dt));
    G.idle+=((still?1:0)-G.idle)*(1-Math.pow(.02,dt));
    G.front=G.front?Math.abs(G.P+1)<.02&&Math.abs(T+1)<.01:G.started&&still&&Math.abs(G.P+1)<.006&&Math.abs(T+1)<.01;
    front=G.front;
    G.g+=((front?1:0)-G.g)*(1-Math.pow(.004,dt));
    shown=G.P<-.5?INTRO:G.P>N-1+.3?END:clamp(Math.round(G.P),0,N-1);
  }else{G.idle=1;G.g=0;G.react=0;G.look=0;shown=G.manual;G.P=shown===END?N-1+.5:shown;el('rbub').dataset.on='false'}
  pose(G.P,G.idle,G.g,G.react,G.look,front);
  if(shown!==G.shown){
    G.shown=shown;render(shown);
    S.forEach((_,i)=>{el('plq'+i).dataset.on=String(i===shown)});
    $('prev').disabled=shown===(reduce?0:INTRO);$('next').disabled=shown===END;
  }
}

/* ---------------------------------------------------------------- lifecycle */
/* Where each stop is held on the page, for the section pager: the start of the band after its climb. */
function measurePage(){
  if(!host.isConnected)return;
  const tr=$('track').getBoundingClientRect(),stageH=$('stage').offsetHeight;
  geometry={top:tr.top+window.scrollY,scrollable:Math.max(0,tr.height-stageH),stageH};
  markers.forEach((m,k)=>{m.dataset.substepY=String(Math.round(geometry.top+geometry.scrollable*(k+1)/(N+1)))});
  fit();
}
function pagerState(){
  const y=window.scrollY;
  const on=!reduce&&geometry.scrollable>0&&y>=geometry.top-4&&y<=geometry.top+geometry.scrollable+4;
  document.documentElement.dataset.journeyActive=on?'on':'off';
  if(on)document.documentElement.dataset.journeyStop=String(clamp(Math.round(G.P),0,N-1));
}
function applyReduce(){
  host.dataset.reduce=String(reduce);
  $('track').style.height=reduce?'auto':`${(N+2)*100}svh`;
  G.shown=-2;G.manual=N-1;G.reactOn=false;G.react=0;G.rk=-1;
  if(reduce)G.started=true;else{G.P=P0;G.v=0;G.started=false}
  measurePage();
}
const onReduce=()=>{reduce=mq.matches;applyReduce()};
mq.addEventListener('change',onReduce);
window.addEventListener('resize',measurePage);

/* He waits off-stage until the journey is in view; off-screen, nothing runs. */
let visible=false;
const io=new IntersectionObserver(entries=>{
  for(const e of entries){visible=e.isIntersecting;if(e.intersectionRatio>=.4)G.started=true}
  if(visible){G.last=0;measurePage()}
},{threshold:[0,.4]});
io.observe($('stage'));

let raf=0;
function frame(now){
  if(visible){
    try{tick(now);pagerState()}catch(err){console.error(err)}
  }
  raf=requestAnimationFrame(frame);
}
$('cam').innerHTML=world();
applyReduce();
tick(performance.now());
raf=requestAnimationFrame(frame);

return ()=>{
  cancelAnimationFrame(raf);
  io.disconnect();
  mq.removeEventListener('change',onReduce);
  window.removeEventListener('resize',measurePage);
  document.removeEventListener('keydown',onKey);
  root.removeEventListener('click',onRootClick);
  timers.forEach(clearTimeout);timers.clear();
  delete document.documentElement.dataset.journeyActive;
  delete document.documentElement.dataset.journeyStop;
  root.innerHTML='';
};
}

/* ======================================================================
 * Below 1024 wide, and in landscape no taller than 540: the journey one
 * stop at a time (approved v6). No ladder here, so no ladder words: an
 * intro, a sticky strip (count, progress ticks, ↑ previous / ↓ next) under
 * the header, then one screen-tall stop per role in normal page flow. While
 * you are inside the journey the page settles on a stop when the scroll
 * ends near one (proximity: a mandatory snap held a mouse wheel on the stop
 * it was on), and the hero above and the contact band below scroll freely. Each stop fades
 * and drifts with the scroll; only transform and opacity move.
 *
 * Never a fixed-height pinned stage: on 320×568 and 360×780 one cut off the
 * heading and the nav. Each stop fits itself instead (f1–f4 below).
 * ==================================================================== */
const COMPACT_Q='(max-width:1023px), (orientation:landscape) and (max-height:540px)';
/** The strip's height, also in the snap offset below the header. */
const BAR_H=52;
const SNAP_CLASS='jw-snap';

const CSS_C = `
:host{display:block;--display:var(--font-display);--body:var(--font-body);--mono:var(--font-mono,ui-monospace,monospace);
--accent:#c2766b;--stage-bg:#0f0e0c;--line:#2a2823;--rule:#3a3830;--ink:#eceae4;--muted:#a9a49a;--faint:#8c877d;
--ease-out:cubic-bezier(.23,1,.32,1);--hh:var(--header-h,72px);--bar-h:${BAR_H}px;--px:40px;font-family:var(--body);color:#f2f0ea}
@media (max-width:599px){:host{--px:20px}}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
a{color:inherit;text-decoration:none}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
.jw{background:var(--stage-bg);color:#f2f0ea}

.head{max-width:1100px;margin:0 auto;padding:28px var(--px) 20px;scroll-snap-align:start}
.kick{display:flex;align-items:center;gap:10px;font-size:.6875rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.kick::before{content:'';width:22px;height:2px;background:currentColor}
.head h2{margin-top:12px;font:600 clamp(1.875rem,6.4vw,2.75rem)/1.04 var(--display);letter-spacing:-.02em;color:#f2f0ea}
.head .lede{margin-top:12px;max-width:32em;font-size:1rem;line-height:1.5;color:#e4e1da}
.head .how{margin-top:8px;max-width:34em;font-size:.875rem;line-height:1.55;color:var(--muted)}
.head .how kbd{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 4px;margin:0 1px;border:1px solid var(--rule);border-radius:3px;font:600 .6875rem/1 var(--mono);color:#cfcac0;vertical-align:1px}

/* the strip: under the header for as long as the journey is on screen */
.jbar{position:sticky;top:var(--hh);z-index:3;height:var(--bar-h);display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;
  padding:0 calc(var(--px) - 8px) 0 var(--px);background:color-mix(in srgb,var(--stage-bg) 92%,transparent);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.count{font:600 .75rem/1 var(--mono);color:#cfcac0;letter-spacing:.06em;white-space:nowrap}
.count b{color:#f2f0ea}
.count span{margin-left:10px;color:var(--faint)}
@media (max-width:359px){.count span{display:none}}
.ticks{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;height:3px;max-width:220px}
.ticks i{display:block;position:relative;overflow:hidden;border-radius:2px;background:#2a2823}
.ticks i::after{content:'';position:absolute;inset:0;background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform 240ms var(--ease-out)}
.ticks i[data-on=true]::after{transform:scaleX(1)}
.jnav{display:flex}
.ibtn{width:44px;height:44px;display:grid;place-items:center;border-radius:50%;color:#f2f0ea;transition:transform 160ms ease;touch-action:manipulation}
.ibtn span{width:32px;height:32px;display:grid;place-items:center;border:1px solid var(--rule);border-radius:50%;transition:border-color 160ms ease}
.ibtn svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.5}
@media (hover:hover){.ibtn:hover:not(:disabled) span{border-color:var(--accent)}}
.ibtn:active:not(:disabled){transform:scale(.94)}
.ibtn:focus-visible{outline:none}
.ibtn:focus-visible span{outline:2px solid var(--accent);outline-offset:2px}
.ibtn:disabled{opacity:.35;cursor:not-allowed}

/* one stop: exactly one screen under the header and the strip */
.stop{height:calc(100svh - var(--hh) - var(--bar-h));display:flex;flex-direction:column;justify-content:center;padding:24px var(--px) 28px;border-top:1px solid var(--line);
  scroll-snap-align:start;scroll-snap-stop:always;overflow:clip;overflow-clip-margin:24px}
.jbar+.stop{border-top:0}
.stop-in{width:100%;max-width:960px;margin:0 auto;transform-origin:50% 50%}
@media (min-width:600px),(orientation:landscape){
  .stop-in{display:grid;grid-template-columns:clamp(140px,22vw,200px) minmax(0,1fr);gap:32px;align-items:start}
}
@media (orientation:landscape) and (max-height:540px){.stop{padding:16px var(--px)}.stop-in{gap:24px}}
.stop-mark{display:flex;align-items:center;gap:12px;margin-bottom:18px}
@media (min-width:600px),(orientation:landscape){.stop-mark{flex-direction:column;align-items:flex-start;gap:10px;margin:2px 0 0}}
.plaque{display:inline-flex;align-items:center;font:600 .8125rem/1 var(--mono);color:#f2f0ea;letter-spacing:.02em}
.plaque::before{content:'';width:12px;height:2px;background:var(--accent)}
.plaque b{padding:7px 10px;border:1.5px solid var(--accent);border-radius:3px;background:#1d1c18;font-weight:600}
.stop-no{font:600 .6875rem/1 var(--mono);color:var(--faint);letter-spacing:.08em;text-transform:uppercase}

.card{min-width:0}
.kind{display:inline-flex;align-items:center;gap:6px;font-size:.6875rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
.kind svg{width:13px;height:13px}
.card h3{margin-top:10px;font:600 clamp(1.5rem,6.4vw,2rem)/1.08 var(--display);letter-spacing:-.015em;color:#f2f0ea;overflow-wrap:anywhere}
.org{margin-top:6px;font-size:.9375rem;line-height:1.4;color:var(--muted)}
.facts{display:grid;grid-template-columns:repeat(3,minmax(0,auto));justify-content:start;gap:12px 28px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
.lbl{font-size:.625rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.val{margin-top:6px;font-size:.875rem;font-weight:500;color:var(--ink);overflow-wrap:anywhere}
.val--mono{font:600 .8125rem/1.3 var(--mono)}
.short{margin-top:14px;max-width:36em;font-size:.9375rem;line-height:1.55;color:#e4e1da}
.sec{margin-top:16px;padding-top:12px;border-top:1px solid var(--line)}
.did{list-style:none;display:grid;gap:8px;margin-top:10px}
.did li{position:relative;padding-left:16px;font-size:.875rem;line-height:1.45;color:#d9d5cc}
.did li::before{content:'';position:absolute;left:0;top:.55em;width:6px;height:6px;border-radius:50%;background:var(--accent)}
.more{display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px 8px;min-height:44px;margin-top:4px;padding:0 2px;color:#f2f0ea;font-size:.875rem;font-weight:600;text-align:left;text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:2px;text-underline-offset:6px;transition:text-decoration-color 160ms ease,transform 160ms ease;touch-action:manipulation}
.more span{display:inline-block;font-weight:500;color:var(--faint)}
.more svg{width:12px;height:12px;color:var(--accent)}
@media (hover:hover){.more:hover{text-decoration-color:#f2f0ea}}
.more:active{transform:scale(.97)}
.more:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
@media (max-width:419px){.facts{grid-template-columns:1fr;gap:6px}.facts>div{display:flex;align-items:baseline;gap:10px}.facts .val{margin-top:0}}

/* the last stop: where the climb is now */
.close{margin-top:10px;max-width:32em;font-size:1rem;line-height:1.55;color:#cfcac0}
.climb-lbl{margin-top:18px}
.climb-list{list-style:none;display:grid;gap:2px;margin-top:8px;padding-top:10px;border-top:1px solid var(--line)}
.climb-list li{display:grid;grid-template-columns:5.5em minmax(0,1fr);gap:12px;align-items:baseline;padding:5px 0;font-size:.875rem;color:#d9d5cc}
.climb-list li span{font:600 .75rem/1 var(--mono);color:var(--faint)}
.btn-ink{display:inline-flex;align-items:center;gap:10px;min-height:44px;margin-top:18px;padding:0 20px;border:1px solid #f2f0ea;border-radius:999px;font:600 .875rem/1 var(--body);color:#f2f0ea;transition:background-color 160ms ease,color 160ms ease,transform 180ms cubic-bezier(.2,.8,.2,1)}
.cta-dot{flex:none;width:8px;height:8px;border-radius:50%;background:currentColor;animation:blink 460ms ease-in-out infinite alternate}
@keyframes blink{to{opacity:.08}}
@media (hover:hover){.btn-ink:hover{background:#f2f0ea;color:#0f0e0c;transform:translateY(-1px)}.btn-ink:hover .cta-dot{animation:none;opacity:1}}
.btn-ink:active{transform:scale(.97)}
.btn-ink:focus-visible{outline:2px solid var(--accent);outline-offset:3px}

/* fit: each stop steps down until it fits its screen, measured in fit() */
.stop.f1 .short{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.stop.f1 .facts{margin-top:12px;padding-top:10px}
.stop.f1 .sec{margin-top:12px;padding-top:10px}
.stop.f1 .stop-mark{margin-bottom:14px}
.stop.f2 .short{display:none}
.stop.f2 .did{gap:5px;margin-top:8px}
.stop.f2 .climb-lbl{margin-top:12px}
.stop.f2 .btn-ink{margin-top:12px}
.stop.f3 .card h3{font-size:1.375rem}
.stop.f3 .org{font-size:.875rem}
.stop.f3 .did li:nth-child(n+3){display:none}
.stop.f3 .climb-list li:nth-child(n+4){display:none}
.stop.f3 .close{font-size:.9375rem}
.stop.f4 .sec .lbl,.stop.f4 .did{display:none}
.stop.f4 .sec{border:0;padding-top:0;margin-top:6px}
.stop.f4 .climb-lbl,.stop.f4 .climb-list{display:none}

/* reduced motion: the stops only fade, nothing moves or eases */
:host([data-reduce=true]) .ticks i::after{transition:none}
:host([data-reduce=true]) .cta-dot{animation:none}
:host([data-reduce=true]) .ibtn:active,:host([data-reduce=true]) .more:active,:host([data-reduce=true]) .btn-ink:active{transform:none}
`;

const UP_ARROW='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10V2M3 5l3-3 3 3"/></svg>';
const DOWN_ARROW='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M3 7l3 3 3-3"/></svg>';
const pad2=n=>String(n).padStart(2,'0');

/* The closing stop: where the climb is now, and every rung so far, newest first. */
function endCardHTML(S){
  const done=S.map(s=>({p:plateText(s),t:s.title})).reverse();
  return `<p class="kind">${UP_ARROW.replace('<path','<path fill="none" stroke="currentColor" stroke-width="1.5"')}${END_KIND}</p><h3>${END_TITLE}</h3><p class="close">${END_SAY}</p>
  <p class="lbl climb-lbl">The climb so far</p>
  <ol class="climb-list">${done.map(d=>`<li><span>${esc(d.p)}</span>${esc(d.t)}</li>`).join('')}</ol>
  <a class="btn-ink" href="/contact" data-nav><span class="cta-dot" aria-hidden="true"></span>Send a message</a>`;
}

function mountCompact(host, root, chapters, options) {
  const S=chapters,N=S.length,M=N+1;           /* every stop, then "Still climbing" */
  const markers=options.markers??[];
  const html=document.documentElement;
  const mq=matchMedia('(prefers-reduced-motion: reduce)');
  let rm=mq.matches;
  const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
  const years=[...S.map(plateText),'next'];
  const titles=[...S.map(s=>s.title),END_TITLE];

  const stopsHTML=[...S.map((s,i)=>stopHTML(s,i)),endCardHTML(S)].map((card,k)=>`<article class="stop" aria-label="Stop ${k+1} of ${M}">
    <div class="stop-in"${k?' inert':''}>
      <div class="stop-mark"><span class="plaque" aria-hidden="true"><b>${esc(years[k])}</b></span><span class="stop-no">Stop ${pad2(k+1)} of ${pad2(M)}</span></div>
      <div class="card">${card}</div>
    </div></article>`).join('');
  root.innerHTML=`<style>${CSS_C}</style><section class="jw">
  <div class="head"><p class="kick">The Journey</p><h2>${C_TITLE}</h2><p class="lede">${esc(cLedeOf(N))}</p><p class="how">${C_HOW}</p></div>
  <div class="jbar">
    <span class="count" id="jCount"></span>
    <div class="ticks" aria-hidden="true">${'<i></i>'.repeat(M)}</div>
    <div class="jnav">
      <button type="button" class="ibtn" id="jUp" aria-label="Previous stop (scroll up)"><span>${UP_ARROW}</span></button>
      <button type="button" class="ibtn" id="jDown" aria-label="Next stop (scroll down)"><span>${DOWN_ARROW}</span></button>
    </div>
  </div>
  ${stopsHTML}
  <p class="sr" role="status" id="jLive"></p>
  </section>`;
  const $=id=>root.getElementById(id);
  const head=root.querySelector('.head'),stops=[...root.querySelectorAll('.stop')],ins=stops.map(s=>s.firstElementChild);
  const ticks=[...root.querySelectorAll('.ticks i')],up=$('jUp'),down=$('jDown'),count=$('jCount'),live=$('jLive');

  /* The snap offset: the header, then the strip. */
  const offset=()=>(parseFloat(getComputedStyle(host).getPropertyValue('--header-h'))||72)+BAR_H;
  const snapTop=el=>el.getBoundingClientRect().top+window.scrollY-offset();

  /* Each stop steps down f1→f4 until its content fits its screen. */
  function fit(){
    stops.forEach(s=>{
      const cs=getComputedStyle(s),avail=s.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
      for(let lv=0;lv<=4;lv++){
        for(let n=1;n<=4;n++)s.classList.toggle('f'+n,n<=lv);
        if(s.firstElementChild.offsetHeight<=avail)break;
      }
    });
    markers.forEach((m,k)=>{if(stops[k])m.dataset.substepY=String(Math.round(snapTop(stops[k])))});
  }

  /* Snapping only while you are inside the journey: from the intro's snap
     point to the last stop's. One pixel past either end switches it off, so
     the page above and below scrolls freely and nothing is trapped. */
  function snapState(){
    const y=window.scrollY,from=snapTop(head)-1,to=snapTop(stops[M-1])+1;
    html.classList.toggle(SNAP_CLASS,y>=from&&y<=to);
  }

  let shown=-1,inIntro=true;
  function setIdx(k){
    if(k===shown)return;
    const announce=shown!==-1;
    shown=k;
    ins.forEach((el,j)=>{el.inert=j!==k});
    ticks.forEach((t,j)=>{t.dataset.on=String(j<=k)});
    count.innerHTML=`<b>${pad2(k+1)}</b> / ${pad2(M)}<span>${esc(k===M-1?'now':years[k])}</span>`;
    up.disabled=k===0;down.disabled=k===M-1;
    if(announce)live.textContent=`Stop ${k+1} of ${M}: ${titles[k]}`;
  }

  /* Each stop fades and drifts with its distance d from its snap point, in
     screens. Reduced motion: opacity only. */
  function paint(){
    const off=offset(),vh=Math.max(1,window.innerHeight-off);
    let k=0;
    stops.forEach((s,j)=>{
      const d=(s.getBoundingClientRect().top-off)/vh,a=Math.abs(d);
      if(d<=.5)k=j;
      if(j===0)inIntro=d>.5;
      const el=ins[j];
      if(a>1.2){el.style.opacity='0';return}
      el.style.opacity=(1-clamp(a/.7)).toFixed(3);
      el.style.transform=rm?'none':`translate3d(0,${(d*28).toFixed(1)}px,0) scale(${(1-.03*clamp(a)).toFixed(4)})`;
    });
    setIdx(k);
  }

  function pagerState(){
    const y=window.scrollY,on=y>=snapTop(stops[0])-4&&y<=snapTop(stops[M-1])+4;
    html.dataset.journeyActive=on?'on':'off';
    if(on)html.dataset.journeyStop=String(clamp(shown,0,N-1));
  }

  let raf=0;
  const onScroll=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;snapState();paint();pagerState()})};
  window.addEventListener('scroll',onScroll,{passive:true});

  /* ↑ previous scrolls up, ↓ next scrolls down: the arrows follow the scroll.
     The keyboard's ArrowUp/Down and PageUp/Down already do the same through
     the snap, so there is no key handler here. */
  const goTo=k=>{
    const i=clamp(k,0,M-1);
    html.classList.add(SNAP_CLASS);
    window.scrollTo({top:snapTop(stops[i]),behavior:rm?'auto':'smooth'});
  };
  up.onclick=()=>goTo(shown-1);
  // From the intro, ↓ goes to the first stop, not past it.
  down.onclick=()=>goTo(inIntro?0:shown+1);

  const onClick=e=>{
    const more=e.target.closest('button[data-more]');
    if(more){options.onMore?.(Number(more.dataset.more),more);return}
    const link=e.target.closest('a[data-nav]');
    if(!link||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault();
    options.navigate(link.getAttribute('href'));
  };
  root.addEventListener('click',onClick);

  const applyRm=()=>{host.dataset.reduce=String(rm);paint()};
  const onReduce=()=>{rm=mq.matches;applyRm()};
  mq.addEventListener('change',onReduce);
  const relayout=()=>{fit();snapState();paint()};
  const ro=new ResizeObserver(relayout);
  ro.observe(host);
  let alive=true;
  document.fonts?.ready.then(()=>{if(alive)relayout()});
  host.dataset.reduce=String(rm);
  relayout();

  return ()=>{
    alive=false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    mq.removeEventListener('change',onReduce);
    window.removeEventListener('scroll',onScroll);
    root.removeEventListener('click',onClick);
    html.classList.remove(SNAP_CLASS);
    delete html.dataset.journeyActive;
    delete html.dataset.journeyStop;
    root.innerHTML='';
  };
}

/* Draws the journey into a shadow root on `host` — the ladder scene from
   1024 up, one snapped stop at a time below it and in short landscape —
   and swaps between them when the viewport crosses over (the compact
   cleanup takes its snap class off <html>). Returns the cleanup. */
export function mountJourney(host, chapters, options) {
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  const cq = matchMedia(COMPACT_Q);
  let stop = null;
  const mount = () => {
    stop?.();
    stop = (cq.matches ? mountCompact : mountLadder)(host, root, chapters, options);
  };
  mount();
  cq.addEventListener('change', mount);
  return () => {
    cq.removeEventListener('change', mount);
    stop?.();
    stop = null;
  };
}

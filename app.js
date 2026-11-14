// 주말 어디갈까: 지역·날씨를 고르면 data/places.json 에서 장소를 사진 카드로 6곳씩 보여 준다.
// 고른 상태는 주소(#r=제주&f=실내)에 담겨 링크로 나눌 수 있다.
const PAGE = 6;
const FILTERS = ['전체', '실내', '실외'];
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const safeURL = u => /^https:\/\//.test(u || '') ? u : '';

let places = [], regions = [];
const state = {region: '', filter: '전체', page: 0};

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (regions.includes(h.get('r'))) state.region = h.get('r');
  if (FILTERS.includes(h.get('f'))) state.filter = h.get('f');
}
function writeHash() {
  const h = new URLSearchParams({r: state.region, f: state.filter});
  history.replaceState(null, '', `#${h}`);
}

function list() {
  return places.filter(p => p.region === state.region && (state.filter === '전체' || (state.filter === '실내') === p.indoor));
}

function card(p) {
  const img = safeURL(p.image);
  const photo = img
    ? `<img src="${esc(img)}" alt="${esc(p.name)} 사진" loading="lazy" referrerpolicy="no-referrer">`
    : `<span>사진 없음</span>`;
  const map = Number.isFinite(p.lat) && Number.isFinite(p.lng)
    ? `https://map.kakao.com/link/map/${encodeURIComponent(p.name)},${p.lat},${p.lng}`
    : `https://map.kakao.com/?q=${encodeURIComponent(`${p.region} ${p.name}`)}`;
  const home = safeURL(p.homepage);
  return `<li class="card">
    <div class="photo">${photo}</div>
    <div class="body">
      <h2 class="name">${esc(p.name)}</h2>
      <div class="badges">${p.type ? `<span class="badge">${esc(p.type)}</span>` : ''}<span class="badge ${p.indoor ? 'in' : 'out'}">${p.indoor ? '실내' : '실외'}</span></div>
      <p class="addr">${esc(p.addr || p.desc || '')}</p>
      <div class="links"><a href="${esc(map)}" target="_blank" rel="noopener">지도에서 보기</a>${home ? `<a href="${esc(home)}" target="_blank" rel="noopener">홈페이지</a>` : ''}</div>
    </div>
  </li>`;
}

function render() {
  for (const b of $('regions').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.region === state.region));
  for (const b of $('filters').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.filter === state.filter));
  const all = list();
  const pages = Math.max(1, Math.ceil(all.length / PAGE));
  if (state.page >= pages) state.page = 0;
  const from = state.page * PAGE;
  const shown = all.slice(from, from + PAGE);
  const label = state.filter === '전체' ? '' : ` · ${state.filter}`;
  $('count').innerHTML = all.length
    ? `<b>${esc(state.region)}${label}</b> ${all.length}곳 중 ${from + 1}–${from + shown.length}`
    : `<b>${esc(state.region)}${label}</b> 0곳`;
  $('more').disabled = all.length <= PAGE;
  $('cards').innerHTML = shown.length
    ? shown.map(card).join('')
    : `<li class="empty">${esc(state.region)}에는 아직 ${state.filter === '전체' ? '' : esc(state.filter) + ' '}장소가 없어요.${state.filter === '전체' ? ' 다른 지역을 골라 보세요.' : ' "전체"로 바꿔 보세요.'}</li>`;
  for (const img of $('cards').querySelectorAll('img')) img.addEventListener('error', () => { img.parentElement.innerHTML = '<span>사진을 불러오지 못했어요</span>'; }, {once: true});
  writeHash();
}

function toast(text) {
  let t = $('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = text; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2000);
}

fetch('data/places.json')
  .then(r => r.json())
  .then(data => {
    places = data.places || [];
    regions = data.regions || [...new Set(places.map(p => p.region))];
    state.region = regions[0];
    readHash();
    $('regions').innerHTML = regions.map(r => `<button type="button" data-region="${esc(r)}">${esc(r)}</button>`).join('');
    $('regions').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { state.region = b.dataset.region; state.page = 0; render(); } });
    $('filters').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { state.filter = b.dataset.filter; state.page = 0; render(); } });
    $('more').addEventListener('click', () => { state.page++; render(); $('cards').scrollIntoView({block: 'nearest'}); });
    $('share').addEventListener('click', () => {
      navigator.clipboard?.writeText(location.href).then(() => toast('링크를 복사했어요'), () => toast('주소창의 링크를 복사해 주세요'));
    });
    window.addEventListener('hashchange', () => { readHash(); state.page = 0; render(); });
    $('source').textContent = data.source || '';
    $('credit').textContent = data.credit || '';
    render();
  })
  .catch(() => { $('cards').innerHTML = '<li class="empty">장소 정보를 불러오지 못했어요. 잠시 후 다시 열어 주세요.</li>'; });

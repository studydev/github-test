// 지역을 고르면 data/places.json 에서 장소 3곳을 카드로 보여준다.
const regionsEl = document.getElementById('regions');
const cardsEl = document.getElementById('cards');
let places = [];
let current = '서울';
const rainyEl = document.getElementById('rainy');

function show(region) {
  current = region;
  for (const b of regionsEl.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.region === region));
  const list = places.filter(p => p.region === region && (!rainyEl.checked || p.indoor)).slice(0, 3);
  if (!list.length) { cardsEl.innerHTML = '<li class="empty">아직 이 지역 장소가 없어요. 다른 지역을 골라 보세요.</li>'; return; }
  cardsEl.innerHTML = list.map(p => `<li><b>${p.name}</b><span>${p.desc}</span> <a href="https://map.kakao.com/?q=${encodeURIComponent(p.name)}" target="_blank" rel="noopener">지도</a>${p.homepage ? ` <a href="${p.homepage}" target="_blank" rel="noopener">홈페이지</a>` : ''}</li>`).join('');
}

fetch('data/places.json')
  .then(r => r.json())
  .then(data => {
    places = data.places;
    const regions = ['서울', '부산', '강릉', '제주'];
    regionsEl.innerHTML = regions.map(r => `<button type="button" data-region="${r}">${r}</button>`).join('');
    regionsEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.region); });
    document.getElementById('source').textContent = data.source;
    rainyEl.addEventListener('change', () => show(current));
    show('서울');
  });

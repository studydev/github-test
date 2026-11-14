// 장소 데이터가 올바른지 검사한다.  node scripts/check-data.js [파일]  (기본 data/places.json)
// 필수: region·name·indoor. 있으면 검사: image(https), lat·lng(숫자), type, regions 목록.
const fs = require('fs');
const file = process.argv[2] || 'data/places.json';
let data;
try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { console.error('JSON 형식 오류:', e.message); process.exit(1); }
const bad = [];
const places = data.places || [];
if (!places.length) bad.push('장소가 하나도 없음');
places.forEach((p, i) => {
  const who = p.name ? `"${p.name}"` : `${i + 1}번째 장소`;
  for (const key of ['region', 'name']) if (typeof p[key] !== 'string' || !p[key].trim()) bad.push(`${who} 에 ${key} 가 없음`);
  if (typeof p.indoor !== 'boolean') bad.push(`${who} 에 indoor(실내 여부) 값이 없음`);
  if ('image' in p && !/^https:\/\//.test(p.image || '')) bad.push(`${who} 의 사진 주소가 https 가 아님`);
  if ('lat' in p || 'lng' in p) {
    if (!(p.lat >= 33 && p.lat <= 39 && p.lng >= 124 && p.lng <= 132)) bad.push(`${who} 의 좌표가 한국 범위가 아님`);
  }
  if (data.regions && !data.regions.includes(p.region)) bad.push(`${who} 의 지역 "${p.region}" 이 regions 목록에 없음`);
});
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
const regions = [...new Set(places.map(p => p.region))];
console.log(`장소 ${places.length}곳 (${regions.join('·')}) 검사 통과`);

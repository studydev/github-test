// data/places.json 이 올바른 JSON 이고, 모든 장소에 region·name·indoor 가 있는지 검사한다.
const fs = require('fs');
let data;
try { data = JSON.parse(fs.readFileSync('data/places.json', 'utf8')); }
catch (e) { console.error('JSON 형식 오류:', e.message); process.exit(1); }
const bad = [];
(data.places || []).forEach((p, i) => {
  for (const key of ['region', 'name']) if (typeof p[key] !== 'string' || !p[key]) bad.push(`${i + 1}번째 장소에 ${key} 가 없음`);
  if (typeof p.indoor !== 'boolean') bad.push(`"${p.name}" 에 indoor(실내 여부) 값이 없음`);
});
if (!data.places?.length) bad.push('장소가 하나도 없음');
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log(`장소 ${data.places.length}곳 검사 통과`);

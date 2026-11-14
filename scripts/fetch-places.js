// 한국관광공사 국문 관광정보 서비스(KorService2, 공공데이터포털)에서 지역별 장소를 받아 data/places.json 을 만든다.
// GitHub Actions 에서만 실행한다. 인증키는 비밀값 TOUR_API_KEY 로 받고, 출력하지 않는다.
// 실내 여부는 콘텐츠 유형으로 정한다: 14(문화시설: 박물관·미술관 등) = 실내, 12(관광지) = 실외 (근사값).
const fs = require('fs');

const raw = process.env.TOUR_API_KEY || '';
if (!raw) { console.error('TOUR_API_KEY 비밀값이 없습니다. 저장소 Settings → Secrets and variables → Actions 에 등록하세요.'); process.exit(1); }
const key = raw.includes('%') ? decodeURIComponent(raw) : raw; // Encoding 키를 넣었어도 동작하게

const REGIONS = [
  {region: '서울', lDongRegnCd: '11'},
  {region: '부산', lDongRegnCd: '26'},
  {region: '강릉', lDongRegnCd: '51', lDongSignguCd: '150'},
  {region: '제주', lDongRegnCd: '50'},
];
const TYPES = [{contentTypeId: '12', indoor: false}, {contentTypeId: '14', indoor: true}];

async function call(params) {
  const q = new URLSearchParams({serviceKey: key, MobileOS: 'ETC', MobileApp: 'weekend-places', _type: 'json', numOfRows: '6', pageNo: '1', arrange: 'Q', ...params});
  const res = await fetch(`https://apis.data.go.kr/B551011/KorService2/areaBasedList2?${q}`);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`JSON 이 아닌 응답 (HTTP ${res.status}): ${text.slice(0, 300)}`); }
  const header = json.response?.header;
  if (header?.resultCode !== '0000') throw new Error(`API 오류 ${header?.resultCode}: ${header?.resultMsg} ${text.slice(0, 200)}`);
  const item = json.response.body?.items?.item;
  return Array.isArray(item) ? item : item ? [item] : [];
}

(async () => {
  const places = [];
  for (const r of REGIONS) {
    for (const t of TYPES) {
      const {region, ...area} = r;
      const items = await call({...area, contentTypeId: t.contentTypeId});
      for (const it of items) places.push({region, name: it.title, desc: (it.addr1 || '').split(' ').slice(0, 3).join(' '), indoor: t.indoor});
      console.log(`${region} 유형 ${t.contentTypeId}: ${items.length}곳`);
    }
  }
  if (!places.length) { console.error('받은 장소가 없습니다.'); process.exit(1); }
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const data = {source: `한국관광공사 국문 관광정보 서비스 (공공데이터포털) · ${today} 갱신 · ${places.length}곳`, places};
  fs.writeFileSync('data/places.json', JSON.stringify(data, null, 2) + '\n');
  console.log(`data/places.json: ${places.length}곳`);
})().catch(e => { console.error(e.message); process.exit(1); });

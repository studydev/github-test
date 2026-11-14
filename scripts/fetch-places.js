// 한국관광공사 국문 관광정보 서비스(KorService2, 공공데이터포털)에서 지역별 장소를 받아 data/places.json 을 만든다.
// GitHub Actions 에서만 실행한다. 인증키는 비밀값 TOUR_API_KEY 로 받고, 출력하지 않는다.
// 사진 이용: 한국관광공사 제공 사진(공공누리). 화면 아래에 출처를 표기한다.
const fs = require('fs');

const raw = process.env.TOUR_API_KEY || '';
if (!raw) { console.error('TOUR_API_KEY 비밀값이 없습니다. 저장소 Settings → Secrets and variables → Actions 에 등록하세요.'); process.exit(1); }
const key = raw.includes('%') ? decodeURIComponent(raw) : raw; // Encoding 키를 넣었어도 동작하게
const OUT = process.argv[2] || 'data/places.json';

// 주말 여행지로 많이 가는 곳. lDongRegnCd = 시·도 법정동 코드. 시·군은 이름(signgu)으로 법정동 코드 조회(ldongCode2)에서 찾는다.
const REGIONS = [
  {region: '서울', lDongRegnCd: '11'},
  {region: '부산', lDongRegnCd: '26'},
  {region: '강릉', lDongRegnCd: '51', signgu: '강릉시'},
  {region: '경주', lDongRegnCd: '47', signgu: '경주시'},
  {region: '여수', lDongRegnCd: '46', signgu: '여수시'},
  {region: '제주', lDongRegnCd: '50'},
];
const TYPES = [{contentTypeId: '12', type: '관광지'}, {contentTypeId: '14', type: '문화시설'}];
// 주말 나들이로 보기 어려운 기념 표지류
const SKIP = /의거지|추념탑|기념비|표지석|비석|유허비|순국|어학센터|대사관/;
// 이름으로 실내를 더 정확히 판단하는 단서
const INDOOR = /박물관|미술관|기념관|과학관|전시관|아쿠아리움|아쿠아플라넷|수족관|워터파크|아쿠아나|갤러리|도서관|공연장|극장|체험관|실내/;
const OUTDOOR = /해변|해수욕장|공원|산$|오름|계곡|폭포|숲|길$|마을|섬$|해안/;

async function api(operation, params) {
  const q = new URLSearchParams({serviceKey: key, MobileOS: 'ETC', MobileApp: 'weekend-places', _type: 'json', ...params});
  const res = await fetch(`https://apis.data.go.kr/B551011/KorService2/${operation}?${q}`);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${operation}: JSON 이 아닌 응답 (HTTP ${res.status}): ${text.slice(0, 300)}`); }
  const header = json.response?.header;
  if (header?.resultCode !== '0000') throw new Error(`${operation}: API 오류 ${header?.resultCode}: ${header?.resultMsg}`);
  const item = json.response.body?.items?.item;
  return Array.isArray(item) ? item : item ? [item] : [];
}
const call = params => api('areaBasedList2', {numOfRows: '30', pageNo: '1', arrange: 'Q', ...params});

// 시·도 안에서 시·군 이름으로 lDongSignguCd 를 찾는다
async function signguCode(lDongRegnCd, name) {
  const items = await api('ldongCode2', {lDongRegnCd, numOfRows: '100', pageNo: '1'});
  const hit = items.find(it => Object.values(it).some(v => String(v).trim() === name));
  const code = hit && Object.entries(hit).find(([k]) => /signgu.*cd/i.test(k))?.[1];
  if (!code) throw new Error(`${name} 의 시군구 코드를 찾지 못함 (응답 ${items.length}건, 항목 예: ${JSON.stringify(items[0] || {})})`);
  return String(code);
}

const https = url => (url || '').replace(/^http:\/\//, 'https://');
const shortAddr = addr => (addr || '').replace(/^(\S+?)(특별자치도|특별자치시|특별시|광역시|도)\s/, '$1 ').split(' ').slice(0, 3).join(' ');
function indoorOf(name, type) {
  if (INDOOR.test(name)) return true;
  if (OUTDOOR.test(name)) return false;
  return type === '문화시설';
}

(async () => {
  const places = [], seen = new Set();
  for (const r of REGIONS) {
    const {region, signgu, ...area} = r;
    if (signgu) { area.lDongSignguCd = await signguCode(area.lDongRegnCd, signgu); console.log(`${signgu} 시군구 코드: ${area.lDongSignguCd}`); }
    for (const t of TYPES) {
      const items = await call({...area, contentTypeId: t.contentTypeId});
      let kept = 0;
      for (const it of items) {
        if (!it.firstimage || SKIP.test(it.title) || seen.has(it.contentid)) continue;
        const lat = Number(it.mapy), lng = Number(it.mapx);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !lat || !lng) continue;
        seen.add(it.contentid);
        places.push({region, name: it.title.trim(), addr: shortAddr(it.addr1), type: t.type, indoor: indoorOf(it.title, t.type), image: https(it.firstimage2 || it.firstimage), lat, lng});
        kept++;
      }
      console.log(`${region} ${t.type}: 받음 ${items.length} → 사용 ${kept}`);
    }
  }
  if (!places.length) { console.error('받은 장소가 없습니다.'); process.exit(1); }
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const data = {
    source: `한국관광공사 국문 관광정보 서비스 (공공데이터포털) · ${today} 갱신 · ${places.length}곳`,
    credit: '장소 정보·사진: 한국관광공사',
    regions: REGIONS.map(r => r.region),
    places,
  };
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
  console.log(`${OUT}: ${places.length}곳`);
})().catch(e => { console.error(e.message); process.exit(1); });

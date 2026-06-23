/**
 * Blog/Magazine clean content 분리 검증 스크립트
 * 실행: npx tsx scripts/test-content-storage.ts
 */
import {
  getBlogContentForStorage,
  getBlogSourceForChannels,
  getBlogSourceForMagazine,
} from "../src/lib/blog/getBlogContentForStorage";
import { parseBlogContent } from "../src/lib/blog/parseBlogContent";
import { parseMagazineContent } from "../src/lib/magazine/parseMagazineContent";
import {
  getMagazineContentForStorage,
  sanitizeMagazineRaw,
} from "../src/lib/magazine/sanitizeMagazineRaw";
import { retainOnlyAllowedMagazineEmojis } from "../src/lib/magazine/emojiRules";

const SAMPLE_BLOG = `제목
콜센터 번아웃, 성수기 전에 CS 대행으로 막는 법

본문
성수기가 시작되면 🔥 콜센터 상담사들은 가장 먼저 무너집니다.

추천 태그
#콜센터 #CS대행

대체 제목
A: 번아웃 막는 법

이미지 삽입 제안
| 위치 | 유형 | 이미지 내용 | 캡션 |
| 도입부 | 인포그래픽 | 번아웃 사이클 | 번아웃 |

[자기점검]
- 키워드 반복 횟수: 3회
- 글자 수: 2100자`;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const parsed = parseBlogContent(SAMPLE_BLOG);
const storage = getBlogContentForStorage(SAMPLE_BLOG, { blogParsed: parsed });
const source = getBlogSourceForChannels({ blogParsed: parsed });
const magazineSource = getBlogSourceForMagazine({ blogParsed: parsed });

assert(storage.includes("콜센터 번아웃"), "storage should include title");
assert(storage.includes("성수기가 시작되면"), "storage should include body");
assert(!storage.includes("추천 태그"), "storage should exclude tags");
assert(!storage.includes("대체 제목"), "storage should exclude alt titles");
assert(!storage.includes("[자기점검]"), "storage should exclude self check");
assert(!storage.includes("이미지 삽입"), "storage should exclude image suggestions");

assert(Boolean(source?.body.includes("성수기가 시작되면")), "source body");
assert(!source?.body.includes("추천 태그"), "source excludes tags");
assert(Boolean(magazineSource?.body.includes("성수기가 시작되면")), "magazine source body");
assert(!magazineSource?.body.includes("🔥"), "magazine source strips blog emojis");

const magazineRawInput = `헤드라인
성수기 CS 운영, 전문 대행으로 안정화하기

본문
성수기에는 상담 인력의 피로도가 급격히 높아질 수 있습니다.

🔎 자주 묻는 질문
CS 대행은 언제 도입해야 하나요?
✅ 성수기 2~3개월 전 검토를 권장합니다.

📌 오늘의 핵심 3가지
1️⃣ 성수기 전 선제 대응이 중요합니다.
2️⃣ 시간제 서비스로 비용을 최적화할 수 있습니다.
3️⃣ 검증된 전문 상담사 투입이 가능합니다.

[시각화 자료 1: 제목: 번아웃 사이클, 주요1: 피로 누적]`;

const magParsed = parseMagazineContent(magazineRawInput);
const magStorage = sanitizeMagazineRaw(magParsed);
assert(!magStorage.includes("#"), "magazine raw no markdown headers");
assert(!magStorage.includes("<"), "magazine raw no html");
assert(!magStorage.includes("|"), "magazine raw no table syntax");
assert(!magStorage.includes("[시각화 자료"), "magazine raw no visual placeholder");
assert(magStorage.includes("🔎"), "magazine raw keeps allowed emoji");
assert(magStorage.includes("1️⃣"), "magazine raw keeps numbered emoji");
assert(magStorage.includes("✅"), "magazine raw keeps check emoji");

const emojiFiltered = retainOnlyAllowedMagazineEmojis("블로그🔥 허용✅ 금지");
assert(emojiFiltered.includes("✅"), "allowed emoji kept");
assert(!emojiFiltered.includes("🔥"), "disallowed emoji removed");

const magForSave = getMagazineContentForStorage(
  { magazineContentRaw: magStorage },
  magazineRawInput
);
assert(magForSave === magStorage, "magazine save uses raw");

console.log("✓ Blog storage sample:\n", storage.slice(0, 120), "...");
console.log("✓ Magazine source (emoji stripped):\n", magazineSource?.body.slice(0, 100), "...");
console.log("✓ Magazine storage sample:\n", magForSave.slice(0, 160), "...");
console.log("\nAll content storage tests passed.");

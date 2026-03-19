# AI TIMES 🗞️
> 댓글 민심이 만드는 AI 신문 · 매일 발행

## 배포 방법 (5분)

### 1. Vercel 배포
1. https://vercel.com 가입 (GitHub 로그인 가능)
2. "New Project" 클릭
3. 이 폴더 업로드 또는 GitHub에 올린 후 연결
4. Environment Variables 에서 추가:
   - `ANTHROPIC_API_KEY` = `sk-ant-...` (platform.anthropic.com에서 발급)
5. Deploy 클릭

### 2. 로컬 실행
```bash
npm install
npm run dev
```
http://localhost:3000 접속

## 구조
- `/pages/index.js` — 신문 메인 페이지
- `/pages/api/news.js` — 댓글 크롤링 + AI 분석 API

## 기사 업데이트 방법
`/pages/api/news.js` 의 `SECTIONS` 에서 기사 ID 변경:
```js
const SECTIONS = {
  economy: { name: '경제', articles: ['015/0005100000'] },
  // oid/aid 형식 — 네이버 뉴스 URL에서 확인
}
```

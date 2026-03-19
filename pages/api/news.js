import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 네이버 뉴스 섹션별 대표 기사 ID들 (매일 업데이트 가능)
const SECTIONS = {
  politics: { name: '정치', articles: ['032/0003320000', '469/0000793000'] },
  economy:  { name: '경제', articles: ['015/0005100000', '009/0005200000'] },
  society:  { name: '사회', articles: ['028/0002700000', '081/0003500000'] },
  culture:  { name: '문화', articles: ['109/0004900000', '117/0003800000'] },
  sports:   { name: '스포츠', articles: ['408/0000189000', '241/0003380000'] },
  world:    { name: '세계', articles: ['001/0015000000', '421/0007900000'] },
};

async function fetchNaverComments(oid, aid) {
  try {
    const url = `https://apis.naver.com/commentBox/cbox/web_neo_list_jsonp.json?ticket=news&templateId=view&lang=ko&country=KR&objectId=news${oid},${aid}&pageSize=30&sort=FAVORITE`;
    const res = await axios.get(url, {
      headers: {
        'Referer': `https://n.news.naver.com/article/${oid}/${aid}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000
    });
    const text = res.data.replace(/^_callback\(/, '').replace(/\);?$/, '');
    const json = JSON.parse(text);
    return json.result?.commentList || [];
  } catch (e) {
    return [];
  }
}

async function fetchNaverArticleTitle(oid, aid) {
  try {
    const res = await axios.get(`https://n.news.naver.com/article/${oid}/${aid}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    const match = res.data.match(/<title>(.*?)<\/title>/);
    return match ? match[1].replace(' : 네이버 뉴스', '').trim() : '기사';
  } catch (e) {
    return '기사';
  }
}

async function generateArticle(sectionName, title, comments) {
  const commentTexts = comments
    .slice(0, 20)
    .map(c => `[👍${c.sympathyCount || 0}] ${c.contents}`)
    .join('\n');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `당신은 AI TIMES의 기자입니다. 아래 뉴스 기사에 달린 댓글들을 분석해서 "민심"을 신문 기사 형식으로 작성해주세요.

섹션: ${sectionName}
기사 제목: ${title}
댓글 (좋아요 순):
${commentTexts}

다음 JSON 형식으로만 출력하세요:
{
  "headline": "핵심을 담은 임팩트 있는 헤드라인",
  "subheadline": "부제목 한 문장",
  "body": "댓글 민심을 분석한 기사 본문 3문단 (각 문단 \\n\\n으로 구분)",
  "sentiment": "positive | negative | mixed",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`
    }]
  });

  const raw = msg.content[0].text;
  const m = raw.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const results = [];

  for (const [key, section] of Object.entries(SECTIONS)) {
    const sectionArticles = [];

    for (const articleId of section.articles) {
      const [oid, aid] = articleId.split('/');
      const [title, comments] = await Promise.all([
        fetchNaverArticleTitle(oid, aid),
        fetchNaverComments(oid, aid)
      ]);

      if (comments.length > 0) {
        const article = await generateArticle(section.name, title, comments);
        if (article) {
          sectionArticles.push({
            originalTitle: title,
            commentCount: comments.length,
            ...article
          });
        }
      }
    }

    results.push({
      key,
      name: section.name,
      articles: sectionArticles
    });
  }

  res.status(200).json({
    date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    edition: `Vol. ${Math.floor((Date.now() - new Date('2025-01-01')) / 86400000)}`,
    sections: results
  });
}

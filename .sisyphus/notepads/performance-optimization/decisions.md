# Decisions

## 아키텍처 결정

### 캐시 전략
- 미인증: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
- 인증: `Cache-Control: private, no-cache`
- Vary: Cookie

### Sentry 축소
- tracesSampleRate: 1.0 → 0.1 (10%)
- 에러 캡처는 유지 (100%)

### Prefetch 전략
- GlobalNav: render → intent (hover에만 prefetch)
- 글쓰기 CTA 링크: prefetch="none" (ArticleEditor 청크 방지)
- SmartLink 기본값: intent → viewport (또는 none)

### DB 쿼리 구조
- Round 1 유지: D1 batch (JOIN 컬럼 충돌로 분리 불가)
- Round 2 통합: recentRecords + recentSentences + activity 병렬
- cohort 파라미터로 resolveStageCohort 중복 제거

### Import 패턴
- 크리티컬 패스 2개 파일만 static import 전환
- `.server.ts` 접미사 파일만 (서버 번들 격리)

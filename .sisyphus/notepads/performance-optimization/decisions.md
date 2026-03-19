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

### learners/:slug 성능 최적화 (2026-03-19)
- `fetchAdaProfile`는 상세 loader에서 호출하지 않고, `learner_profiles` 캐시 필드 및 로컬 bio 우선 전략으로 대체한다.
- `getLearnerStageActivity`는 `currentStageId`를 optional 인자로 받아 상위 loader가 값을 알고 있으면 재조회하지 않는다.
- stage/records/questions 조회는 함수 내부에서 병렬 실행하고, loader 레벨에서도 batch 쿼리를 포함한 단일 `Promise.all` 구조를 유지한다.

### /learners 목록 최신 기록 조회 최적화 (2026-03-19)
- `getLearnersWithActivity`는 author별 전체 visible record를 로드하지 않고, SQL 상관 서브쿼리로 최신 1건만 조회한다.
- 최신 판단 기준은 `created_at DESC, id DESC` tie-breaker를 사용해 같은 시각 생성 레코드에도 결정적 순서를 보장한다.
- stage 메타 조회는 latest record 조회와 병렬 처리해 라운드트립 지연을 줄인다.

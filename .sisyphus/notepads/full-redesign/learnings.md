# full-redesign Learnings

## [2026-03-17] Wave 0 Baseline

### Dev Server Setup
- 워크트리: `/Users/hellosunghyun/Documents/Github/divelog-redesign`
- 개발 서버: `pnpm dev` → localhost:5173
- D1 마이그레이션 필요: `wrangler d1 migrations apply DB --local`
- 시드 데이터: `wrangler d1 execute DB --local --file=seeds/seed.sql`

### Bundle Baseline (before redesign)
- Total client assets: 1.9 MB (uncompressed)
- CSS: 92.29 KB (16.02 KB gzip)
- ArticleEditor (TipTap): 677.92 KB (208.18 KB gzip) — 가장 큰 청크
- Entry client: 418.74 KB (135.71 KB gzip)
- 목표: +20KB gzip 이내 증가

### Critical CTA Texts (변경 금지)
- 여정, 기록, 챌린지, 러너, 가이드 (nav)
- 여정 보기, 기록 남기기, 응답 남기기 (CTA)
- 공명, 질문, 연결, 제안 (response types)
- 남겨진 질문, 연결된 기록, 모든 응답을 환영합니다 (sections)

### Forbidden Texts (verified absent)
- 좋아요, 인기순, 베스트, 추천순, Crew

### Worktree Pattern
- 코드 작업: `/Users/hellosunghyun/Documents/Github/divelog-redesign`
- 증거/플랜: `/Users/hellosunghyun/Documents/Github/divelog/.sisyphus/`
- 두 경로를 명확히 구분해야 에이전트 혼란 방지

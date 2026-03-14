# Learnings — divelog-fullbuild

## Project Context
- React Router 7 (Vite) + Cloudflare Pages + D1 + Drizzle ORM + @adakrpos/auth
- Domain: divelog.ada-kr-pos.com
- Auth: External via ada-kr-pos.com (@adakrpos/auth/generic ONLY)
- Session cookie: adakrpos_session (.ada-kr-pos.com domain)
- UI Language: Korean (한국어)
- Design: Quiet Depth, no marine illustrations/fish icons
- No: likes, rankings, leaderboards, rich text editors, image upload, auto-save

## Key Patterns
- verifyRequest: called ONCE per request via WeakMap cache in auth.server.ts
- learner_profiles: auto-provisioned on first authenticated visit
- All writes: requireVerified (isVerified=true only)
- Admin access: ADMIN_USER_ID env var auto-bootstraps admin role
- cohort filtering: string value "cohort-2026" in schema columns
- Drizzle queries: db.batch() for multi-query pages

## Tech Constraints
- Edge runtime (no Node.js APIs)
- No KV binding
- No Better Auth (completely removed)
- @adakrpos/auth/generic entry point ONLY
- STRICT SQLite tables, unixepoch() timestamps

## [2026-03-14] Task T1: Project Initialization
- RR7 Cloudflare template scaffolded
- wrangler.toml: DB (D1), R2, QUEUE bindings only (no KV)
- Package manager: pnpm
- Key packages: @adakrpos/auth, drizzle-orm, drizzle-kit, zod, tailwindcss
- .dev.vars: placeholder env vars created

## [2026-03-14] Task T2: Design Tokens

### Files Created
- `app/styles/tokens.css` — CSS custom properties (Quiet Depth design system)
- `app/styles/global.css` — Reset, base typography, focus ring

### Design Decisions
- **Stage accent colors**: prelude(indigo #5B6AF0), bridge(teal #0B9488), challenge(amber #DC6803), epilogue(violet #7C3AED)
- **Admin palette**: dark sidebar (#111827), neutral surfaces (#F3F4F6), utilitarian tone
- **Reading width**: 680px (--max-reading-width)
- **Card radius**: 24px (--radius-lg), Input radius: 16px (--radius-md)
- **Font stack**: system-ui, -apple-system, 'Pretendard', sans-serif (no Inter)

### Tailwind v4 Integration
- Uses `@import "tailwindcss" source(".")` and `@theme {}` in app.css
- CSS custom properties defined in tokens.css
- `@theme` block references CSS variables for Tailwind utilities
- tailwind.config.ts also references CSS variables for compatibility

### Key Constraints
- Deep ocean colors (#0B2447, #146C94) only for backgrounds/depth — NO marine illustrations or fish icons
- Soft shadows only (no dramatic shadows)
- 8px spacing grid
- Reduced motion support via @media query

## [2026-03-14] Task T3: Drizzle Schema
- learner_profiles: user_id(AdakrposUser.id), slug, display_name, profile_photo_url, cohort 캐시 필드 구성
- Better Auth 잔재 테이블(user/session/account/verification) 미생성, 인증 정보는 외부 위임 유지
- cohorts 테이블 미생성, 코호트는 도메인 테이블별 TEXT 컬럼으로 관리
- M:N 관계는 junction 테이블 + composite primary key로 구성(challenge_stages, collaboration_members, memory_*)
- Record 도메인 필드 확정: format(note|article), type(personal|challenge|collaboration), rhythm(sprint|weekly|monthly|free), visibility(draft|cohort|public)
- Response 도메인 5종 유지: resonance|question|connection|suggestion|self_answer
- timestamp 컬럼은 전부 INTEGER + unixepoch() 기본값 사용

## [2026-03-14] Task T4: D1 Migrations + Seed
- Migration files generated in drizzle/migrations/
- Seed data includes 5 stages, 6 learners, 3 challenges, 1 collaboration unit, 25 records, 12 questions, 15 responses, 12 saved sentences, 8 templates, 2 collective memories
- Fixed QA slugs verified: prelude-1(active,is_current), bridge-1(completed), challenge-1, bridge-2, epilogue-1, first-note, challenge-article, learner-hana, team-challenge, solo-challenge, collab-alpha
- All cohort-bearing seed rows use "cohort-2026"
- Placeholder learner IDs use usr-seed-* values only; no Better Auth tables or session data seeded
- wrangler d1 local commands lock under parallel access, so verification should run sequentially

## [2026-03-14] Task T6: @adakrpos/auth Setup
- `getAuth()`는 `WeakMap<Request, AuthContext>` 캐시를 사용해 요청당 `verifyRequest` 호출을 최대 1회로 제한
- `@adakrpos/auth/generic`에서 `verifyRequest`를 사용하고, `AuthContext` 타입은 `@adakrpos/auth` 루트 export에서 가져와 타입 안정성 유지
- SDK 에러 시 앱 크래시를 피하기 위해 unauthenticated context로 폴백 캐시
- `requireAuth` 미인증 리다이렉트는 `https://ada-kr-pos.com/login?returnUrl=` 고정 (`/auth/login` 미사용)
- `requireVerified`는 `isVerified=false`인 경우 `/guide`로 이동
- `requireRole`은 D1 `user_roles` 조회로 권한을 확인하고 실패 시 로그인 리다이렉트
- `bootstrapAdmin`은 `ADMIN_USER_ID` 환경변수 기반으로 admin 역할이 없을 때만 idempotent 삽입

## [2026-03-14] Task T5: Data Access Layer
- `db()` factory는 `D1Database` 바인딩을 인자로 받아 요청 단위 Drizzle client를 생성
- `getOrCreateLearnerProfile`는 `AdakrposUser` 기반으로 `learner_profiles`를 upsert하고 표시 이름/프로필/cohort를 캐시
- slug 생성은 sanitize + 충돌 시 suffix 증가, 100회 초과 시 `nanoid(6)` 폴백
- `searchAll`은 `db.batch([...])`로 record/question/learner/sentence 검색을 병렬 실행
- cohort 필터는 대부분 optional parameter로 처리하고 미지정 시 전체 코호트 대상 조회
- `nanoid` 유틸은 edge 호환 `crypto.getRandomValues`를 사용 (Node `crypto` 미사용)

## [2026-03-14] Task T7: Public Shell
- `_public.tsx`: layout route with loader calling `getAuth()` + `getOrCreateLearnerProfile()`
- `GlobalNav` uses `useRouteLoaderData("_public")` to get auth state from layout loader
- Login URL: `https://ada-kr-pos.com/login?returnUrl=...` (NOT `/auth/login`)
- NO Crew in global navigation
- Korean UI: 여정, 기록, 검색, 인박스, 내 공간, 기록하기, 로그인
- Mobile: hamburger menu with same links
- SVG icons need `<title>` for accessibility + `aria-hidden="true"` when decorative
- Button elements need explicit `type="button"`

## [2026-03-14] Task T8: Admin Shell
- _admin.tsx: bootstrapAdmin() first (idempotent), then requireRole('admin')
- AdminSidebar: 14 menu items, dark background (#111827), active highlight (#374151)
- AdminContextBar: shows current page title based on pathname
- Design: utilitarian, neutral, NO ocean/marine elements
- Admin sidebar uses Link component for SPA navigation
- React Router Link uses `to=` prop, not `href=`

## [2026-03-14] Task T21: 기록 상세 페이지 (/logs/:recordSlug)
- loader는 단건 record 조회 후 db.batch()로 질문/응답/저장문장/연결 기록을 병렬 로딩
- draft visibility는 404 처리로 차단
- 응답/문장 저장 action은 requireVerified로 보호하고 intent 분기(create_response, save_sentence) 사용
- 응답 카드는 ResponseCard 컴포넌트를 사용해 카드형 표현 유지
- 연결 기록은 linked_record_id 양방향(현재를 가리키는 기록, 현재가 가리키는 기록) 조건으로 조회

## T24: Challenge Pages (2026-03-14)

### Pattern: Challenge List & Detail Pages
- Challenge list page (`_public.challenges._index.tsx`) uses HeroSection with `variant="challenge"`
- Challenge detail page uses `accentTone="challenge"` for consistent amber theming
- Both pages use inline styles with CSS variables from `tokens.css`
- STATUS_LABELS map for Korean status display (진행 중, 완료, 예정)

### Graceful "No Collaboration" State
- When `challengeCollabs.length === 0`, show message: "이 챌린지는 개인 탐색 중심으로 진행됩니다."
- Secondary message: "혼자서의 탐구도 소중한 탐구입니다."
- Same pattern used in Stage detail pages

### DB Query Pattern
- `database.batch([...])` for parallel queries (records + collabs)
- Left join with `learnerProfiles` for author info
- Filter by `challengeId` and exclude draft visibility

## [2026-03-14] T22: 기록 작성 페이지 (/write)
- write 라우트 loader는 `requireVerified` 이후 `db.batch()`로 활성 템플릿, 현재 stage, 활성 collaboration unit을 한 번에 로딩
- action은 `createRecordSchema.safeParse`로 핵심 필드를 검증하고, 선택 질문은 `createQuestionSchema`로 별도 검증 후 `questions`에 조건부 삽입
- slug 생성은 한글/영문/숫자만 유지한 base slug + `nanoid` 접미사(6자리) 조합으로 충돌 가능성 완화
- 입력 UI는 radio/select + `textarea`만 사용해 리치 텍스트/이미지 업로드/자동 저장 없이 요구사항을 충족

- 2026-03-14 F2 quality review: `pnpm exec tsc --noEmit` and `pnpm run build` both passed; `app/` contains 0 matches for `as any`, `@ts-ignore`/`@ts-expect-error`, empty `catch`, and `console.log`; `app/lib/auth.server.ts` still uses `WeakMap`; route file count is 41.

- 2026-03-14 F4 scope fidelity check: Must-NOT and auth migration 12/12 PASS (Better Auth 잔재 없음, KV 바인딩 없음, `@adakrpos/auth/generic` 사용, WeakMap 캐시 1회 확인, cohorts 테이블/비밀번호 필드/이미지 업로드/고정 Daily 카테고리 미존재).

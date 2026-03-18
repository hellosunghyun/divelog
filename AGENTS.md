# AGENTS.md — divelog.ada-kr-pos.com

## 언어

이 프로젝트의 모든 UI 텍스트, 에러 메시지, 빈 상태 안내, CTA, seed 데이터, 커밋 메시지 설명은 **한국어**를 사용한다. 코드(변수명, 함수명, 타입명)는 영어.

---

## 제품 개요

Apple Developer Academy @ POSTECH Learner의 아홉 달을 **Journey-first reflective archive**로 구현하는 웹 애플리케이션. 최신 피드가 아니라 여정의 구조가 먼저 보이고, 댓글 대신 Dialogue Layer(공명/질문/연결/제안/자기답변)를 사용한다. 좋아요·추천·인기순·랭킹은 **절대 만들지 않는다**.

---

## 기술 스택

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React Router 7 (Vite) | `@react-router/cloudflare`, flat routes, type-safe |
| Hosting | Cloudflare Pages | Pages Functions (edge runtime) |
| Database | Cloudflare D1 | SQLite, STRICT tables, `unixepoch()` |
| ORM | Drizzle ORM | `drizzle-orm/d1`, schema-first migrations |
| Auth | `@adakrpos/auth` | 외부 인증 (ada-kr-pos.com), `@adakrpos/auth/generic` 진입점만 사용 |
| Sessions | `adakrpos_session` 쿠키 | `.ada-kr-pos.com` 도메인, 7일 TTL, 자동 갱신 |
| CSS | Tailwind CSS v4 | Quiet Depth 디자인 토큰 |
| Validation | Zod | 폼 검증, loader/action 입력 검증 |
| Storage | Cloudflare R2 | 이미지 업로드, /api/upload + /api/images/* |
| Rich Text Editor | Tiptap v3 | ProseMirror 기반, 에디터 확장 포함 |
| Error Tracking | Sentry | `@sentry/cloudflare` + `@sentry/react-router` |
| UI Primitives | Radix UI | Dialog, Select, Checkbox, Radio, Popover 등 |
| Icons | Phosphor Icons | stroke 기반 아이콘 |
| Animation | Framer Motion | reduced motion 지원 |
| Font | Geist | CDN (jsdelivr), variable weight |
| Queues | Cloudflare Queues | 알림, 모더레이션 비동기 처리 |
| Package Manager | pnpm | |

### 사용하지 않는 것
- ❌ KV 바인딩 (제거됨)
- ❌ Better Auth (완전 제거)
- ❌ `@adakrpos/auth/hono`, `@adakrpos/auth/express` (generic만)
- ❌ Node.js 전용 API (edge runtime 호환 필수)

### 구현 완료 (이전 제약에서 이동)
- ✅ Tiptap 리치 텍스트 에디터 (Phase 1에서 도입)
- ✅ 이미지 업로드 (R2 + /api/upload)
- ✅ 자동 저장 (/api/autosave + localStorage)

---

## 프로젝트 구조

```
app/
├── routes/
│   ├── _public.tsx                    → Public 레이아웃 (verifyRequest 1회)
│   ├── _admin.tsx                     → Admin 레이아웃 (requireRole)
│   ├── public/
│   │   ├── index.tsx                  → / (홈)
│   │   ├── journey/
│   │   │   └── index.tsx              → /journey
│   │   ├── questions.tsx              → /questions (열린 질문)
│   │   ├── logs/
│   │   │   ├── index.tsx              → /logs
│   │   │   ├── $recordSlug.tsx        → /logs/:recordSlug
│   │   │   ├── $recordSlug.edit.tsx   → /logs/:recordSlug/edit
│   │   │   └── $recordSlug.details.tsx→ /logs/:recordSlug/details
│   │   ├── write/
│   │   │   ├── index.tsx              → /write (requireVerified)
│   │   │   ├── note.tsx               → /write/note
│   │   │   ├── article.tsx            → /write/article
│   │   │   └── meta.$recordId.tsx     → /write/meta/:recordId
│   │   ├── learners/
│   │   │   ├── index.tsx              → /learners
│   │   │   └── $learnerSlug.tsx       → /learners/:learnerSlug
│   │   ├── tags/
│   │   │   ├── index.tsx              → /tags
│   │   │   └── $tagSlug.tsx           → /tags/:tagSlug
│   │   ├── search.tsx                 → /search
│   │   ├── inbox.tsx                  → /inbox (requireAuth)
│   │   ├── me.tsx                     → /me (requireAuth)
│   │   ├── settings.tsx               → /settings (requireAuth)
│   │   ├── guide.tsx                  → /guide
│   │   ├── guide/
│   │   │   └── full.tsx               → /guide/full
│   │   ├── terms.tsx                  → /terms
│   │   ├── privacy.tsx                → /privacy
│   │   └── style-reference.tsx        → /style-reference
│   │   # DISABLED:
│   │   # ├── journey/$stageSlug.tsx   → /journey/:stageSlug [STAGE_DISABLED]
│   │   # ├── groups/$groupSlug.tsx    → /groups/:groupSlug [COLLAB_DISABLED]
│   │   # ├── memories/$stageSlug.tsx  → /memories/:stageSlug [STAGE_DISABLED]
│   │   # 미구현:
│   │   # ├── challenges/              → /challenges (아직 구현되지 않음)
│   │   # └── challenges/$challengeSlug.tsx → /challenges/:challengeSlug
│   ├── admin/
│   │   ├── index.tsx                  → /admin (Dashboard)
│   │   ├── stages/
│   │   │   ├── index.tsx              → /admin/stages
│   │   │   └── $stageId.tsx           → /admin/stages/:stageId
│   │   ├── learners/
│   │   │   ├── index.tsx              → /admin/learners
│   │   │   └── $learnerId.tsx         → /admin/learners/:learnerId
│   │   ├── records/
│   │   │   ├── index.tsx              → /admin/records
│   │   │   └── $recordId.tsx          → /admin/records/:recordId
│   │   ├── dialogue/
│   │   │   ├── index.tsx              → /admin/dialogue
│   │   │   └── $responseId.tsx        → /admin/dialogue/:responseId
│   │   ├── curation.tsx               → /admin/curation
│   │   ├── templates/
│   │   │   ├── index.tsx              → /admin/templates
│   │   │   └── $templateId.tsx        → /admin/templates/:templateId
│   │   ├── tags.tsx                   → /admin/tags
│   │   ├── analytics.tsx              → /admin/analytics
│   │   ├── settings.tsx               → /admin/settings
│   │   ├── roles.tsx                  → /admin/roles
│   │   ├── audit.tsx                  → /admin/audit
│   │   # DISABLED:
│   │   # ├── collaboration/           → [COLLAB_DISABLED]
│   │   # ├── memories/
│   │   # │   ├── index.tsx            → /admin/memories [STAGE_DISABLED]
│   │   # │   └── $stageId.tsx         → /admin/memories/:stageId [STAGE_DISABLED]
│   │   # 미구현:
│   │   # ├── challenges/
│   │   # │   ├── index.tsx            → /admin/challenges (아직 구현되지 않음)
│   │   # │   └── $challengeId.tsx     → /admin/challenges/:challengeId
│   └── api/
│       ├── upload.tsx                 → POST /api/upload (R2 이미지)
│       ├── images.$.tsx               → /api/images/* (이미지 서빙)
│       ├── autosave.tsx               → POST /api/autosave (초안 자동저장)
│       ├── notifications.tsx          → /api/notifications
│       ├── search-records.tsx         → /api/search-records
│       ├── search-learners.tsx        → /api/search-learners
│       ├── track-read.tsx             → /api/track-read (읽음 추적)
│       ├── toggle-bookmark.tsx        → /api/toggle-bookmark
│       ├── preview-learner.tsx        → /api/preview-learner
│       └── preview-record.tsx         → /api/preview-record
├── components/
│   ├── layout/
│   │   ├── GlobalNav.tsx
│   │   ├── Footer.tsx
│   │   └── FloatingWriteCTA.tsx
│   ├── cards/
│   │   ├── SceneCard.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── ResponseCard.tsx
│   │   ├── LearnerCard.tsx
│   │   ├── CompactTimelineCard.tsx
│   │   ├── HighlightedSentenceCard.tsx
│   │   ├── SelfAnswerCard.tsx
│   │   └── CollaborationUnitCard.tsx
│   ├── sections/
│   │   ├── HeroSection.tsx
│   │   ├── StageStrip.tsx
│   │   └── CTABand.tsx
│   ├── views/
│   │   ├── TimelineView.tsx
│   │   ├── CalendarView.tsx
│   │   ├── QuestionTimeline.tsx
│   │   └── ViewToggle.tsx
│   ├── feedback/
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── Spinner.tsx
│   │   ├── SubmitButton.tsx
│   │   ├── AutosaveIndicator.tsx
│   │   └── NavigationBlockerDialog.tsx
│   ├── content/
│   │   ├── ContentRenderer.tsx
│   │   ├── SmartLink.tsx
│   │   ├── MentionPreview.tsx
│   │   └── DraftRecoveryPrompt.tsx
│   ├── filters/
│   │   ├── FilterBar.tsx
│   │   ├── FilterBottomSheet.tsx
│   │   └── SortBar.tsx
│   ├── record/
│   │   ├── RhythmDateInput.tsx
│   │   ├── WeekPicker.tsx
│   │   └── MonthPicker.tsx
│   ├── editor/editors/
│   │   ├── NoteEditor.tsx
│   │   ├── ArticleEditor.tsx
│   │   └── SlashCommandMenu.tsx
│   ├── revision/
│   │   ├── RevisionTimeline.tsx
│   │   └── RevisionDiffView.tsx
│   ├── activity/
│   │   ├── ActivityFeed.tsx
│   │   └── NarrativeDigest.tsx
│   ├── admin/
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminContextBar.tsx
│   │   └── admin-patterns.tsx
│   ├── ui/                            → Radix UI 기반 프리미티브 (13개)
│   ├── PersonSearch.tsx
│   ├── RecordSearch.tsx
│   └── TagSelector.tsx
├── db/
│   ├── schema.server.ts        → Drizzle 스키마 (27 테이블, cohort 지원)
│   ├── relations.server.ts     → Drizzle relations
│   ├── client.server.ts        → Drizzle 클라이언트 팩토리
│   └── queries/                → 도메인별 쿼리 모듈 (35+)
│       ├── journey/
│       │   └── stages.server.ts
│       ├── records/
│       │   ├── records.server.ts
│       │   ├── tags.server.ts
│       │   ├── drafts.server.ts
│       │   ├── sentences.server.ts
│       │   ├── savedRecords.server.ts
│       │   ├── recordReads.server.ts
│       │   ├── recordLinks.server.ts
│       │   ├── references.server.ts
│       │   ├── participants.server.ts
│       │   └── revisions.server.ts
│       ├── dialogue/
│       │   ├── questions.server.ts
│       │   ├── responses.server.ts
│       │   ├── selfAnswers.server.ts
│       │   └── mentions.server.ts
│       ├── learners/
│       │   └── learners.server.ts
│       ├── social/
│       │   ├── notifications.server.ts
│       │   ├── activity.server.ts
│       │   └── collaboration.server.ts
│       ├── misc/
│       │   ├── search.server.ts
│       │   └── reminders.server.ts
│       └── admin/
│           ├── data/ (stages, learners, records, collaboration)
│           ├── ops/ (curation, dialogue, roles, settings, templates)
│           └── insights/ (analytics, audit)
├── lib/
│   ├── auth/
│   │   ├── auth.server.ts      → getAuth (WeakMap 캐시, 요청당 1회)
│   │   ├── auth.middleware.ts   → requireAuth, requireVerified, requireRole, getOptionalUser, bootstrapAdmin, ensureAdminByEmail
│   │   └── validation.ts       → Zod 스키마 (15+ 스키마)
│   ├── content/
│   │   ├── content.server.ts   → Tiptap JSON 렌더링, plaintext 추출
│   │   ├── editor-config.ts    → Tiptap 에디터 설정
│   │   ├── editor-extensions.ts → Tiptap 확장 (link, image, mention 등)
│   │   ├── compress-image.ts   → 이미지 압축
│   │   └── extract-references.server.ts → 콘텐츠 참조 추출
│   ├── infra/
│   │   ├── logger.server.ts    → 구조화된 로깅 (요청 ID, 민감정보 마스킹)
│   │   ├── draft-storage.ts    → localStorage 기반 초안 관리
│   │   ├── read-storage.ts     → 읽음 상태 추적
│   │   └── r2-cleanup.server.ts → R2 고아 이미지 정리
│   ├── utils/
│   │   ├── utils.server.ts     → nanoid() ID 생성
│   │   ├── utils.ts            → cn() Tailwind 클래스 병합
│   │   ├── hangul.ts           → 한글 검색 (초성 분리)
│   │   ├── calendar.ts         → 캘린더 날짜 생성
│   │   ├── date-groups.ts      → 날짜 그룹핑
│   │   ├── record-diff.ts      → 기록 변경 감지
│   │   └── thread-tree.ts      → 응답 스레드 트리 구성
│   ├── motion/
│   │   ├── motion.tsx          → Framer Motion 프로바이더
│   │   └── motion-utils.ts     → 모션 유틸리티
│   └── constants/
│       └── visibility.ts       → Visibility 상수
└── styles/
    ├── global.css              → CSS custom properties (Quiet Depth 토큰), Tailwind v4 @theme
    ├── editor.css              → ProseMirror 에디터 스타일 (708줄)
    ├── fonts.css               → Geist 폰트 선언
    └── tokens.css              → (비어있음 — 토큰은 global.css에 inline)

workers/
└── app.ts                      → Cloudflare Workers 진입점 (Sentry, 캐시 헤더)

drizzle/migrations/             → D1 마이그레이션 파일 (16개)
seeds/seed.sql                  → 한국어 seed data
wrangler.toml                   → D1, R2, Queues 바인딩
.dev.vars                       → ADAKRPOS_API_KEY, ADMIN_USER_ID, ADMIN_EMAILS, LOG_LEVEL, TEST_*_SESSION
```

---

## 인증 아키텍처

자체 로그인/회원가입 UI 없음. 모든 인증은 `ada-kr-pos.com` 외부 위임.

```
사용자 → divelog.ada-kr-pos.com
  ↓ 브라우저: adakrpos_session 쿠키 자동 전달
서버: getAuth(request, apiKey) → WeakMap 캐시 → verifyRequest 1회
  ↓
인증됨 → 정상 진행 + learner_profiles get-or-create
미인증 + 보호 페이지 → ada-kr-pos.com/login?returnUrl= 리다이렉트
```

### 미들웨어 계층
| 함수 | 용도 | 사용처 |
|------|------|--------|
| `getOptionalUser` | 선택적 사용자 조회 | 모든 Public 페이지 |
| `requireAuth` | 인증 필수 | /inbox, /me, /settings |
| `requireVerified` | isVerified=true 필수 | /write, 응답 작성 action |
| `requireRole` | 역할 필수 | Admin 전체 |
| `bootstrapAdmin` | ADMIN_USER_ID로 최초 admin 역할 설정 | _admin.tsx 레이아웃 |
| `ensureAdminByEmail` | ADMIN_EMAILS 기반 admin 역할 자동 부여 | _public.tsx (waitUntil) |

### 핵심 규칙
- `verifyRequest`는 요청당 **1회만** 호출 (WeakMap 캐시)
- `ADAKRPOS_API_KEY`는 서버에서만 사용, 클라이언트 노출 금지
- `@adakrpos/auth/generic` 진입점만 사용 (hono/express 금지)
- `ADMIN_EMAILS`로 이메일 기반 관리자 자동 부여 (background task)
- `learner_profiles`는 첫 인증 시 자동 생성 (display_name, profile_photo_url, cohort 캐시)

---

## 데이터 로딩 패턴

```typescript
// 레이아웃 로더 (_public.tsx) — 1회만 인증 + learner_profiles get-or-create
export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);
  if (auth.isAuthenticated) {
    await getOrCreateLearnerProfile(context.cloudflare.env.DB, auth.user);
  }
  return { auth };
}

// 페이지 로더 — getAuth 재호출 (WeakMap 캐시, API 중복 호출 없음)
export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);
  const database = db(context.cloudflare.env.DB);
  // Drizzle 쿼리...
  return { data };
}

// 클라이언트에서 레이아웃 auth 접근
const parentData = useRouteLoaderData("_public");
```

---

## 설계 문서 참조 가이드

`.docs/` 디렉토리에 13개의 설계 문서가 있다. 작업 유형별로 참조해야 할 문서:

### `.docs/prd.md` — 제품 요구사항
**참조 시점**: 제품 철학, 비목표, 성공 상태, 디자인 방향을 확인할 때
- 제품 정의와 원칙 (Journey-first, Quiet Depth, Dialogue over Comments)
- Must NOT have (좋아요, 인기순, 말풍선, 해양 일러스트 등)
- 디자인 요구사항 (Quiet Depth, 접근성 기준)
- 성공 지표 (건강도 중심, 경쟁 지표 배제)

### `.docs/frd.md` — 기능 요구사항
**참조 시점**: 페이지/기능 구현 시 세부 요구사항 확인
- FR-001~FR-033: 모든 기능의 상세 요구사항과 수용 기준
- 사용자 역할 7개 (Learner, Mentor, Operator, Curator, Moderator, Admin, Public Reader)
- 핵심 객체 정의 (Stage, Record, Left Question, Response, Collaboration Unit 등)
- 기록 필드 (format, type, rhythm, visibility)
- Dialogue Layer (응답 유형 5종: 공명/질문/연결/제안/자기답변)
- Admin 기능 요구사항 (FR-020~FR-033)

### `.docs/auth.md` — 인증 연동 가이드
**참조 시점**: 인증 관련 코드 작성 시 **반드시** 참조
- SDK 설치 및 진입점 (`@adakrpos/auth/generic`)
- `verifyRequest` 패턴 (CF Workers용)
- `AdakrposUser`, `AdakrposSession`, `AuthContext` 타입 정의
- HTTP API 엔드포인트 (verify-session, users/:id, verify-key)
- 에러 코드 (401, 403, 404, 429)
- 세션 쿠키 규약 (adakrpos_session, `.ada-kr-pos.com` 도메인)

### `.docs/frontend.md` — 프론트엔드 설계
**참조 시점**: UI 컴포넌트 구현, 레이아웃, 스타일 작업 시
- 기술 기준 (TypeScript strict, Tailwind, 접근성)
- 공통 컴포넌트 사양 (GlobalNav, SceneCard, QuestionCard, ResponseCard 등)
- 화면별 기본 구조 (홈, 여정, Stage, 기록 등)
- 스타일 토큰 (색상, 반경, 그림자, 타이포)
- 상태 처리 원칙 (빈 상태, 로딩, 에러)
- 접근성 요구사항 (16px↑, 44px↑ 타겟, focus ring, reduced motion)

### `.docs/wireframe.md` — 와이어프레임 명세
**참조 시점**: 화면 레이아웃 구현 시 구조 확인
- Public 17개 화면 + Admin 22개 화면의 구조, 섹션, 와이어프레임
- 공통 레이아웃 규칙 (Public Shell, Admin Shell)
- 상태별 표시 (빈 상태, 에러, 로딩)
- 반응형 원칙 (모바일 1열, 태블릿 1~2열, 데스크톱 2~3열)

### `.docs/sitemap.md` — 사이트맵
**참조 시점**: 라우트 구조, URL 설계 확인 시
- Public 영역 URL 구조와 각 페이지 하위 구성
- Admin 영역 URL 구조와 관리 화면 목록

### `.docs/user-flow.md` — 사용자 플로우
**참조 시점**: 인터랙션 흐름, 상태 전이 구현 시
- 25개 사용자 플로우 (첫 방문, 기록 작성, 질문, 응답, 자기답변, 검색 등)
- 시작 조건 → 흐름 → 기대 결과
- 협업 없는 상태 / 있는 상태 플로우
- 운영자 플로우 (Stage 변경, 큐레이션, moderation, Collective Memory 발행)

### `.docs/admin.md` — 어드민 설계
**참조 시점**: Admin 페이지 구현 시
- Admin 역할 6개 (Admin, Operator, Curator, Moderator, Mentor Viewer, Analytics Viewer)
- Admin 정보 구조 (사이드바 14개 메뉴)
- 각 관리 화면 상세 사양 (Dashboard, Stage, Challenge, Learner, Records, Dialogue, Collaboration, Curation, Memory, Templates, Analytics, Settings, Roles, Audit)
- Admin 디자인 원칙 (utilitarian, dense, neutral, 해저 감성 제거)

### `.docs/operational-principles.md` — 운영 원칙
**참조 시점**: UI 문구 작성, CTA 톤, 안내 메시지 작성 시
- 핵심 원칙 (평가 대신 질문, 비교 대신 연결, 조언보다 공명)
- 운영 문장 원칙 (허가형 문구: "완성된 글이 아니어도 괜찮습니다")
- 권장/지양 표현 목록
- 모더레이션 허용/불허 기준
- 알림 원칙 (맥락 중심, 과도한 실시간성 피함)

### `.docs/glossary.md` — 용어집
**참조 시점**: 도메인 용어, 필드명, 상태값 확인 시
- 47개 용어 정의 (Stage, Record, Note, Article, Rhythm, Left Question, Response 등)
- 응답 유형 (Resonance, Question Response, Connection, Suggestion, Self-answer)
- 협업 상태 (Forming, Active, Restructured, Archived)
- Visibility (Draft, Cohort, Public)

### `.docs/design.md` — Quiet Depth 디자인 가이드라인
**참조 시점**: UI 구현, 스타일링, 컴포넌트 디자인 작업 시 **반드시** 참조
- 디자인 철학 (Content-first, Journey-first, Quiet Depth, Reflection over Stimulation)
- 색상 팔레트 (Core Palette, Stage Tone Mapping)
- 타이포그래피 스케일 (Hero 48~64px ~ Caption 12px)
- 간격 시스템 (4px 배수 기반)
- 카드 스펙 (radius 20~24px, padding 20~28px)
- 레이아웃 폭 (1440/1200/720px)
- 네비게이션, Hero, Journey Strip, 각종 카드 디자인 가이드
- 모션 가이드 (허용/금지), 아이콘/일러스트 가이드
- 접근성 가이드, Admin 디자인 가이드
- 품질 체크리스트

---

## Quiet Depth 디자인 가이드라인

> 전체 원본은 `.docs/design.md` 참조. 아래는 구현에 필요한 핵심 규칙 요약.

### 디자인 철학

이 사이트는 **"예쁜 바다 사이트"가 아니라 Learner의 질문과 기록이 조용하고 깊게 읽히는 공간**이다.

| 원칙 | 설명 |
|------|------|
| Content-first | 기록이 주인공. 배경·애니메이션·그래픽은 보조 |
| Journey-first | 피드가 아니라 여정. "지금 어디를 지나고 있는가"를 먼저 |
| Quiet Depth | 깊이감 = 얇은 경계선 + 부드러운 surface + 채도 낮은 블루 + 충분한 여백 |
| Reflection over Stimulation | SNS식 즉각 반응/자극 금지. 읽고, 머물고, 다시 생각하게 |
| Belonging without Competition | 연결하되 비교하지 않음. 지표보다 질문과 공명 중심 |

시각적 북극성: **에디토리얼** + **수면 아래의 깊이감** + **정제된 현대성**

### 색상 시스템

```
Background:        #F6F8FB
Surface:           #FFFFFF
Surface Secondary: #F2F5F8
Border:            #E3E8EF

Text Primary:      #1D1D1F
Text Secondary:    #6E6E73
Text Tertiary:     #8C8C91

Deep Ocean:        #0B2447
Ocean Blue:        #146C94
Reef Cyan:         #6CC4D6
Mist Blue:         #EAF4FA
```

**Stage Tone Mapping**: Prelude=Mist, Bridge=Cyan, Challenge=Deep Ocean, Epilogue=Mist+Neutral

**색 사용 규칙**:
- 본문은 높은 대비의 중립 텍스트
- 강조는 컬러보다 weight와 spacing으로 먼저
- 상태색은 semantic 목적에만
- 카드마다 다른 accent 남발 금지
- 링크는 텍스트처럼 보이되 hover/active에서 식별 가능
- 배경은 완전 흰색보다 옅은 블루-그레이 (`#F6F8FB`)

### 타이포그래피

**폰트**: Geist (CDN), 한글 fallback system-ui / Apple SD Gothic Neo

| 용도 | 크기 | 무게 | line-height |
|------|------|------|-------------|
| Hero Title | 48 ~ 64px | 600 | 1.1 ~ 1.2 |
| Page Title | 32 ~ 40px | 600 | 1.1 ~ 1.2 |
| Section Title | 22 ~ 28px | 600 | 1.2 |
| Card Title | 18 ~ 20px | 600 | 1.2 |
| Body Large | 18px | 400 | 1.6 ~ 1.75 |
| Body Default | 16px | 400 | 1.6 ~ 1.75 |
| Meta | 13 ~ 14px | 500 | 1.5 |
| Caption | 12px | 500 | 1.5 |

**규칙**: 제목은 무게로 강조(색 절제), 같은 계층 제목 크기 일관, 본문 폭 제한, bold 남발 금지

### 간격 시스템

**기본 scale**: 4의 배수 — `4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96`

**섹션 간 간격**: 모바일 48~64px, 데스크톱 80~120px

**여백 우선순위**: 페이지 외곽 → 섹션 간 → 카드 내부 패딩 → 요소 간

**핵심**: 고급스러움 = 넉넉한 여백 + 통일된 간격. 질문 카드/기록 본문 주변은 일반 카드보다 여유 있게.

### 레이아웃

| 요소 | 폭 |
|------|-----|
| 전체 캔버스 최대 | 1440px |
| 콘텐츠 최대 | 1200px |
| 읽기 중심 상세 | 720px |
| 보조 레일 | 280 ~ 320px |

- 모바일: 1열 / 태블릿: 1~2열 / 데스크톱: 12-column grid
- Hero 이후 섹션은 왼쪽 정렬 기본
- centered layout 남발 금지
- 같은 계층 카드/텍스트는 baseline 정렬

### 카드 시스템

**기본 스펙**: 배경 Surface, border 1px solid `#E3E8EF`, radius 20~24px, shadow 매우 약하게, padding 20~28px

| 카드 | 특성 |
|------|------|
| Scene Card | 가장 기본. hover 시 미세한 상승만 |
| Question Card | 더 조용하고 여유 있는 여백. 질문이 가장 크게 |
| Response Card | 더 단순하고 플랫. 말풍선 아닌 정리된 메모 카드 |
| Highlighted Sentence Card | 큰 인용문 + 남긴 이유 + 남긴 사람. 타이포로 해결 |
| Learner Card | 프로필보다 질문이 먼저. 아바타는 보조 |
| Collaboration Unit Card | 팀 장식보다 질문 중심. 협업 후에만 등장 |
| Summary Card | 요약/안내 중심, 텍스트 비중 높음 |

**깊이감 순서**: 배경 톤 차이 → border 명도 차이 → 여백 차이 → blur/material → 마지막으로만 shadow

### 네비게이션

**구성**: 로고 / 여정 / 기록 / 챌린지 / Learner / 가이드 / 검색 / 기록 남기기 CTA

**원칙**: 얇고 조용, sticky 가능, 배경 투명 또는 약한 material, 수평 간격 넉넉, 현재 위치는 underline-less 강조

**모바일**: 햄버거 메뉴 허용, 하단 탭바 사용 안 함, 검색/기록 CTA 우선순위 유지

### Hero

- 역할: 제품 설명이 아닌, 사용자를 정서 상태로 데려가는 공간
- 구성: Eyebrow + 큰 타이틀 + 짧은 설명 + CTA + 배경 visual
- 비주얼: 직접 해양 일러스트 금지, 수면 아래 빛의 층위/푸른 안개/깊이감 gradient
- 카피: 짧고 선명, 과도한 브랜딩 슬로건 금지, 문학적이되 모호하지 않게

### Journey Strip

- 각 Stage는 capsule 또는 세로 기둥
- 현재 Stage: 진한 톤 + 약한 glow
- 과거: 채도 낮게, 미래: outline 위주
- hover 시 설명 노출, click 시 Stage 상세
- 모바일: 세로 스택 또는 horizontal scroll
- 금지: game-like progress UI, 퍼센트 진행률 과장

### 폼 / 에디터

- distraction-free, 쓰기 흐름 방해 최소
- 입력창 radius는 카드보다 약간 작게, border 얇게
- focus: semantic blue 또는 deep tone
- textarea: line-height 충분히, placeholder는 안내형 문장
- 질문 입력: 본문과 다른 배경 톤, 작은 라벨
- Visibility/응답 선호도: segmented control 또는 chip group

### 모션 가이드

| 허용 | 금지 |
|------|------|
| fade-up | bubble animation |
| subtle hover elevation | parallax 남발 |
| slow background drift | wave animation 남발 |
| sheet/drawer 자연스러운 전환 | bouncing microinteraction |
| | confetti/reward animation |

**원칙**: 모션은 존재를 느끼게만 하고, 시선을 잡아끌지 않는다.

### 아이콘 / 일러스트

- 아이콘: stroke 기반, 단순하고 얇은 계열, 크기 일관, 텍스트 옆 보조
- 금지: 3D/skeuomorphic 아이콘, 만화적 잠수부/물고기, 감정형 이모지 남발
- 일러스트: 최소화. 필요 시 abstract gradient / layered shapes 우선

### 접근성

- 본문 최소 16px, 충분한 색 대비
- 인터랙티브 요소 터치 타깃 44px↑
- 키보드 포커스 명확, focus ring 충분한 두께와 명도차
- outline 제거 금지, hover와 focus 같은 시각 효과 금지
- reduced motion 지원, 스크린리더 라벨 제공
- 장식용 얇은 회색 텍스트 남발 금지

### 카피 톤

| 지향 | 지양 |
|------|------|
| plain, warm, precise, non-judgmental | 베스트, 인기, 정답, 상위, 완벽한 기록 |
| "완성된 글이 아니어도 괜찮습니다" | 강요하는 어조 |
| "무엇이 남았는지부터 적어도 좋습니다" | urgency tone |

**UI 카피**: 버튼은 짧고 행동 중심, 에러는 plain language, 빈 상태는 다음 행동 제안, 허가의 어조

### Admin 디자인

Public과 다른 톤: neutral, calm, efficient, dense, readable

| 항목 | Public | Admin |
|------|--------|-------|
| 여백 | 넉넉 | compact |
| radius | 20~24px | 약간 줄이기 |
| 정보 밀도 | 낮음 | 높음 |
| Hero | 감성적 | 금지 |
| 블루 테마 | Quiet Depth | 과하지 않게 |
| 테이블 | 미사용 | dense table 허용 |

**구조**: 좌측 네비 + 상단 context bar + main canvas + optional inspector drawer
**우선순위**: 빠른 스캔 → 빠른 편집 → 빠른 필터링 → preview → bulk action

### 디자인 품질 체크리스트

- [ ] 같은 계층 제목 크기 일관적인가
- [ ] 여백 체계가 흔들리지 않는가
- [ ] Stage 톤이 명확히 구분되는가
- [ ] 해저 감성이 과하지 않은가
- [ ] 기록과 질문이 가장 먼저 보이는가
- [ ] 본문 읽기 폭 안정적인가
- [ ] 질문 카드가 충분히 구분되는가
- [ ] 응답이 댓글처럼 보이지 않는가
- [ ] focus 상태 선명한가, contrast 충분한가
- [ ] 모바일 터치 영역, 텍스트 크기 적절한가

---

## 핵심 제약사항 (Guardrails)

### 절대 만들지 않는 것
- 좋아요, 추천, 싫어요, 인기순 정렬, 베스트 댓글
- 말풍선/채팅 버블 (editorial card만)
- 해양 일러스트, 물고기 아이콘 (해저 감성은 배경/깊이감/톤에만)
- Daily를 고정 카테고리로
- Crew를 글로벌 네비에
- leaderboard, 개인 비교 차트, 상위 작성자 랭킹
- 숫자 차트 기반 Check-in (서술형만)
- 자체 로그인/회원가입 UI
- Settings에서 name/bio 편집 (ada-kr-pos.com에서 관리)
- cohorts 관리 UI / cohorts 테이블

### 구현 완료 (이전 제약에서 이동)
- ✅ Rich text 에디터 → Tiptap v3 도입
- ✅ 이미지 업로드 → R2 + /api/upload
- ✅ 자동 저장 → /api/autosave + localStorage

### 코드 품질
- `as any`, `@ts-ignore`, `@ts-expect-error` 금지
- 빈 catch 블록 금지
- JSON 배열로 M:N 관계 저장 금지 (junction table 사용)
- 글로벌 DB 인스턴스 금지 (매 요청마다 바인딩에서 생성)
- N+1 쿼리 금지 (batch 또는 JOIN)

---

## 빌드 & 개발 명령어

```bash
pnpm dev                                    # 로컬 개발 서버
pnpm build                                  # 프로덕션 빌드 (react-router build + patch-worker)
pnpm typecheck                              # 타입 체크 (cf-typegen + react-router typegen + tsc)
pnpm test                                   # 테스트 실행 (vitest)
pnpm deploy                                 # 배포 (build + wrangler deploy)
wrangler d1 migrations apply DB --local     # 마이그레이션 적용
wrangler d1 execute DB --local --file=seeds/seed.sql  # 시드 데이터
```

---

## 작업 계획

전체 실행 계획은 `.sisyphus/plans/divelog-fullbuild.md`에 있다. 8개 Wave, 48개 태스크 + 4개 최종 검증.

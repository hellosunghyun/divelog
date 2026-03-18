# 프론트엔드 설계서
## divelog.page Frontend Architecture Spec

## 문서 목적
이 문서는 `divelog.page`의 공개 사용자 영역과 Learner 사용 흐름을 구현하기 위한 프론트엔드 설계 기준을 정의한다.
목표는 다음 세 가지다.

- 제품 철학을 일관된 UI 구조로 번역한다.
- 개발 에이전트와 프론트엔드 개발자가 같은 기준으로 화면을 구현하게 한다.
- 디자인 시스템, 정보 구조, 상태 처리, 컴포넌트 경계를 명확히 한다.

---

## 제품 정의
`divelog.page`는 Apple Developer Academy @ POSTECH Learner의 아홉 달을 게시글 목록이 아니라 **Journey-first reflective archive**로 구현하는 웹 애플리케이션이다.

핵심 구조는 다음과 같다.

- **Journey-first**: 최신 피드보다 여정의 구조가 먼저 보인다.
- **Learner-first**: 기본 단위는 팀이 아니라 Learner다.
- **Dialogue Layer**: 댓글 대신 질문–응답–연결 구조를 사용한다.
- **Optional Collaboration**: 협업 단위는 나중에 생길 수 있는 선택적 레이어다.
- **Quiet Depth**: 해저 감성은 배경과 깊이감으로만 절제해서 사용한다.

---

## 구현 범위
프론트엔드 범위에는 아래가 포함된다.

- 글로벌 네비게이션
- 홈
- 여정
- Stage 상세
- 기록 목록
- 기록 상세
- 기록 작성
- 챌린지 목록 및 상세
- Learner 목록 및 상세
- Collaboration Unit 상세
- 검색
- 인박스
- 내 공간
- 설정
- 가이드
- Collective Memory

---

## 기술 기준
- React Router 7 (Vite, `@react-router/cloudflare`)
- TypeScript strict mode
- Tailwind CSS v4 (CSS-first 설정, @theme inline)
- Tiptap v3 리치 텍스트 에디터 (ProseMirror 기반)
- Radix UI 헤드리스 프리미티브 (Dialog, Select, Checkbox 등)
- Framer Motion 애니메이션 (reduced motion 지원)
- Sentry 에러 모니터링
- Cloudflare Pages + D1 + R2 + Queues (edge runtime)
- Drizzle ORM 스키마 기반 데이터 레이어
- Zod 폼/입력 검증
- SEO와 메타데이터는 page loader 단위로 관리
- 접근성 기본 적용
- light theme 우선, dark mode는 확장 가능 구조로 준비

---

## 프로젝트 구조
실제 구조는 아래와 같다.

- `app/routes/public/`  
  공개 영역 라우트
- `app/routes/admin/`
  관리자 영역 라우트
- `app/routes/api/`
  API 엔드포인트
- `app/components/`
  공통 컴포넌트 (14개 하위 디렉토리: layout, cards, sections, views, feedback, content, filters, record, editor, revision, activity, admin, ui, search)
- `app/db/schema.server.ts`
  Drizzle ORM 스키마 (27 테이블)
- `app/db/queries/`
  도메인별 쿼리 모듈 (35+ 파일: journey, records, dialogue, learners, social, misc, admin)
- `app/lib/auth/`
  인증 및 미들웨어 (getAuth, requireAuth, requireVerified, requireRole)
- `app/lib/content/`
  Tiptap 콘텐츠 처리 (렌더링, 에디터 설정, 이미지 압축)
- `app/lib/infra/`
  인프라 유틸리티 (로깅, 초안 저장, R2 정리)
- `app/lib/utils/`
  공통 유틸리티 (한글 검색, 캘린더, ID 생성 등)
- `app/lib/auth/validation.ts`
  Zod 스키마 (15+ 검증 스키마)
- `app/styles/`
  CSS (global.css, editor.css, fonts.css)
- `workers/app.ts`
  Cloudflare Workers 진입점

---

## 라우트 구조
공개 영역 라우트는 아래와 같다.

- `/`
- `/journey`
- `/journey/:stageSlug`
- `/questions`
- `/logs`
- `/logs/:recordSlug`
- `/logs/:recordSlug/edit`
- `/logs/:recordSlug/details`
- `/write`
- `/write/note`
- `/write/article`
- `/write/meta/:recordId`
- `/learners`
- `/learners/:learnerSlug`
- `/tags`
- `/tags/:tagSlug`
- `/guide`
- `/search`
- `/inbox`
- `/me`
- `/settings`
- `/terms`
- `/privacy`
- `/style-reference`

미구현: `/challenges`, `/challenges/:challengeSlug`  
비활성화: `/groups/:groupSlug` [COLLAB_DISABLED], `/memories/:stageSlug` [STAGE_DISABLED]

---

## 레이아웃 원칙

### Public Root Layout
모든 공개 페이지는 아래 셸을 공유한다.

- 상단 글로벌 네비게이션
- ambient background
- max-width container
- 콘텐츠 영역
- 하단 푸터

### 콘텐츠 폭 규칙
- 전체 캔버스는 넓게 쓴다.
- 읽기 본문은 반드시 좁게 제한한다.
- 목록형 화면은 2열 또는 3열까지 허용한다.
- 상세 읽기 화면은 본문 컬럼을 별도로 분리한다.

### 반응형 원칙
- 모바일은 한 컬럼
- 태블릿은 한 컬럼 우선, 일부 그리드만 2열
- 데스크톱에서만 2열/3열 적극 사용
- 모바일에서 주요 CTA는 하단 sticky를 선택적으로 허용

---

## 정보 구조 원칙
상단 구조는 아래로 고정한다.

- 여정
- 기록
- 챌린지
- Learner
- 가이드

중요한 점:
- `Crew`는 상단 고정 메뉴가 아니다.
- 협업은 제품의 선택 레이어다.
- 사용자는 어떤 화면에 있든 지금의 Stage 맥락을 잃지 않아야 한다.

---

## 공통 컴포넌트

컴포넌트는 14개 하위 디렉토리에 총 70개 이상 파일로 구성되어 있다.

### GlobalNav
역할:
- 전역 탐색
- 현재 위치 강조
- 기록 남기기 CTA
- 검색 진입

필수 요소:
- 로고 `divelog.page`
- 여정 / 기록 / 챌린지 / Learner / 가이드
- 검색 버튼
- 기록 남기기 버튼

---

### HeroSection
역할:
- 화면의 목적과 태도 전달

변형:
- 홈 Hero
- Stage Hero
- Challenge Hero
- Learner Hero
- Collective Memory Hero

---

### StageStrip
역할:
- 전체 여정을 시각적으로 보여준다.

표현 원칙:
- Prelude / Bridge / Challenge / Epilogue를 톤으로 구분
- 현재 Stage 강조
- 과거/미래 Stage는 채도 또는 border 차이로 구분

---

### SceneCard
역할:
- 기록 카드의 공통 단위

포함 요소:
- 제목 또는 첫 문장
- 작성자
- Stage
- 개인 기록 / 챌린지 기록
- Note / Article
- 남겨둔 질문 여부
- 자기답변 여부

---

### QuestionCard
역할:
- 남겨둔 질문을 별도 객체로 강조

포함 요소:
- 질문 문장
- 질문 방향
- 작성자
- 연결된 Stage
- 응답 CTA

원칙:
- 일반 카드보다 여백이 넓어야 한다.
- 문장 자체가 가장 크게 보여야 한다.

---

### ResponseCard
역할:
- Dialogue Layer의 응답 표시

포함 요소:
- 응답 유형
- 작성자
- 본문
- 관련 기록 링크

원칙:
- 좋아요, 점수, 추천 없음
- 댓글 말풍선처럼 보이지 않게
- flat editorial card 형태 유지

---

### HighlightedSentenceCard
역할:
- 남겨두고 싶은 문장 표시

포함 요소:
- 문장
- 이유 한 줄
- 남긴 사람
- 원문 링크

원칙:
- 평가가 아니라 공명처럼 보여야 한다.

---

### LearnerCard
역할:
- Learner 목록 및 홈 Spotlight 카드

포함 요소:
- 이름
- 지금 붙들고 있는 질문
- 최근 기록
- 현재 Stage

원칙:
- 얼굴보다 질문이 먼저 보여야 한다.

---

### CollaborationUnitCard
역할:
- 실제 협업 단위가 생겼을 때만 등장

포함 요소:
- 이름
- 현재 질문
- 관련 Challenge / Stage
- 최근 장면

원칙:
- 팀 소개보다 질문이 먼저 보여야 한다.

---

### CTA Band
역할:
- 기록 시작, 다음 Stage 이동, Collective Memory 진입 같은 큰 전환 유도

원칙:
- CTA는 많아도 두 개 이하
- 카피는 허가형 문장 우선

---

### CompactTimelineCard
역할:
- 목록 뷰에서 사용하는 간략한 타임라인 카드

---

### SelfAnswerCard
역할:
- 자기답변을 시간 흐름과 함께 표시

---

### ViewToggle
역할:
- 타임라인/캘린더 뷰 간 전환

---

### TimelineView / CalendarView
역할:
- 기록을 타임라인 또는 캘린더 형태로 표시

---

### ContentRenderer
역할:
- Tiptap JSON을 HTML로 렌더링, 멘션 프리뷰 포함

---

### MentionPreview
역할:
- @멘션 및 기록 참조에 대한 호버 프리뷰

---

### NoteEditor / ArticleEditor
역할:
- Tiptap 기반 노트/아티클 에디터 (슬래시 커맨드 포함)

---

### AutosaveIndicator
역할:
- 자동 저장 상태 표시 (저장 중, 저장됨, 오류)

---

### NavigationBlockerDialog
역할:
- 저장하지 않은 변경사항 경고 다이얼로그

---

### DraftRecoveryPrompt
역할:
- 이전 초안 복구 안내

---

### RhythmDateInput / WeekPicker / MonthPicker
역할:
- 리듬 기반 날짜/기간 선택 컴포넌트

---

### RevisionTimeline / RevisionDiffView
역할:
- 기록 수정 이력 타임라인 및 변경사항 비교

---

### ActivityFeed / NarrativeDigest
역할:
- 활동 피드 및 서사형 요약

---

### FilterBottomSheet
역할:
- 모바일 바텀시트 필터 UI

---

### FloatingWriteCTA
역할:
- 하단 플로팅 기록 작성 버튼

---

### PersonSearch / RecordSearch / TagSelector
역할:
- 검색 및 선택 컴포넌트 (멀티셀렉트 지원)

---

### UI 프리미티브 (app/components/ui/)
Radix UI 기반 13개 프리미티브:
- Button, Input, Textarea, Label, Checkbox
- RadioGroup, Select, Dialog, AlertDialog
- Popover, Badge, Calendar, Table

---

## 화면별 기본 구조

### 홈
- Hero
- Cohort Journey Strip
- Current Dive
- 이번 구간의 열린 질문
- Recent Scenes
- 남겨두고 싶은 문장
- Learner Spotlight
- Start Logging CTA

### 여정
- 페이지 소개
- 전체 Stage 타임라인
- 선택된 Stage 미리보기
- 지난 구간 / 예정 구간

### Stage 상세
- Stage Hero
- Stage Context
- Quiet Check-in Summary
- 열린 질문
- Recent Scenes
- Collaboration Layer
- Carry Forward 또는 Collective Memory

### 기록 목록
- 페이지 소개
- 필터 영역
- 정렬 영역
- 결과 목록

### 기록 상세
- 메타 정보
- 본문
- 남겨둔 질문
- 응답 작성기
- 응답 목록
- 이어진 기록
- 남겨두고 싶은 문장
- 관련 기록

### 기록 작성
- 맥락 선택
- 형식 선택
- 리듬 선택
- 에디터
- 남겨둔 질문
- 응답 선호도
- 공개 범위
- 저장 / 발행

### Learner 상세
- 소개
- 현재 질문
- 최근 기록
- 내가 남긴 질문
- 내가 다시 답한 질문
- 남겨두고 싶은 문장
- 협업 흔적

### 챌린지 상세
- 문제 정의
- 현재 질문
- 개인 탐색 기록
- Collaboration Layer
- 전환점
- 회고

### Collective Memory
- Stage 요약 Hero
- 열린 질문
- 오래 남은 문장
- 대표 장면
- 이어진 기록
- 다음 Stage로 가져갈 질문

---

## 상태 처리 원칙

### 빈 상태
빈 상태는 “없음”으로 끝내지 않는다.
반드시 다음 행동을 제안해야 한다.

예:
- 아직 질문이 없습니다 → 이 구간의 첫 질문을 남겨보세요
- 아직 협업이 없습니다 → 지금은 개인 탐색 중심입니다

### 로딩 상태
- skeleton 사용
- 본문 페이지는 제목, 메타, 본문 블록 skeleton
- 목록 페이지는 card skeleton

### 에러 상태
- plain language
- 재시도 버튼
- 치명적이지 않은 오류는 인라인 안내

---

## 상호작용 원칙

### Search
- 전역 검색 진입은 항상 보인다.
- 검색은 overlay 또는 dedicated page를 사용한다.
- 결과는 기록 / 질문 / Learner / 문장으로 구분한다.

### Filter
- 기록 목록과 챌린지 목록에는 URL 기반 필터를 사용한다.
- 필터 변경은 가능한 한 페이지 새로고침 없이 반영한다.

### Write Flow
- 다단계지만 짧아야 한다.
- 사용자가 무엇을 쓰는지 모를 때도 자유 형식으로 바로 진입 가능해야 한다.

### Dialogue Layer
- 댓글처럼 끝없이 중첩되지 않는다.
- 응답은 깊어져도 별도 기록으로 파생되게 유도한다.

---

## 스타일 토큰

### 색상
- Background: `#F6F8FB`
- Surface: `#FFFFFF`
- Border: `#E3E8EF`
- Text Primary: `#1D1D1F`
- Text Secondary: `#6E6E73`
- Deep Ocean: `#0B2447`
- Ocean Blue: `#146C94`
- Reef Cyan: `#6CC4D6`
- Mist Blue: `#EAF4FA`

### 반경
- Card radius: 24px
- Input radius: 16px

### 그림자
- soft shadow만 사용
- 강조는 shadow보다 background / border / spacing으로 해결

### 타이포
- 제목: system-ui / SF Pro 계열
- 본문: system-ui / Pretendard fallback
- 본문 기본 16px 이상
- line-height 넉넉하게

---

## 접근성 요구사항
- 본문 최소 16px
- contrast 충분히 확보
- interactive target 44px 이상
- focus ring visible
- reduced motion 대응
- screen reader label 제공
- 모든 아이콘 버튼은 accessible name 필요
- 질문 / 응답 / 문장 카드는 의미 구조가 명확해야 함

---

## 프론트엔드 상태 관리 원칙
- 서버 데이터는 React Router loader/action에서 처리
- URL search params로 필터와 정렬을 표현
- local state는 상호작용 상태에만 사용
- draft autosave는 localStorage + /api/autosave 연계
- 읽음 추적은 /api/track-read + localStorage 연계

---

## 데이터 레이어 원칙
- Drizzle ORM + Cloudflare D1을 사용하여 서버에서 직접 쿼리
- `app/db/queries/` 디렉토리에서 도메인별 쿼리 모듈 관리
- 페이지 loader에서 Drizzle 쿼리를 직접 호출
- record, question, response, stage, learner는 독립 쿼리 가능 구조
- Zod 스키마로 모든 입력값 검증 (app/lib/auth/validation.ts)

---

## 완료 기준
프론트엔드 구현 완료 상태는 아래를 만족해야 한다.

- 모든 공개 페이지가 접근 가능하다.
- Journey-first 구조가 모든 핵심 화면에서 유지된다.
- Dialogue Layer가 댓글처럼 보이지 않는다.
- 협업이 없어도 화면이 어색하지 않다.
- 모바일 / 데스크톱 모두 자연스럽다.
- 빈 상태, 로딩 상태, 에러 상태가 정의되어 있다.
- 디자인이 해저 테마 과잉 없이 조용하고 깊게 유지된다.
# 에디터 UI 디벨롭

## TL;DR

> BubbleMenu를 SVG 아이콘 기반으로 전면 교체하고, 에디터 상단 고정 툴바를 추가하고, 슬래시 메뉴를 카테고리 그룹핑으로 개선하여 Notion 수준의 에디터 UX를 달성한다.
>
> **Deliverables**: BubbleMenu 개선, 고정 툴바, 슬래시 메뉴 그룹핑, 에디터 스타일 개선
> **Estimated Effort**: Short (2-4h)
> **Parallel Execution**: YES - 3 waves

---

## Work Objectives

### Core Objective
에디터 UI를 Notion 수준으로 직관적이고 사용하기 좋게 개선

### Must Have
- BubbleMenu: SVG 아이콘 + 그룹 구분선 + 취소선/링크/형광펜 추가
- 에디터 상단 고정 툴바 (블록 타입 선택 + 서식 버튼)
- 글자 수 카운터
- 모바일에서도 사용 가능한 터치 타겟

### Must NOT Have
- 새 npm 패키지 설치
- 자체 로그인/회원가입 UI
- 좋아요/인기순/랭킹

---

## TODOs

### Wave 1 (기반)

- [x] 1. BubbleMenu SVG 아이콘 전면 교체

  **What to do**:
  - BubbleBtn 헬퍼 컴포넌트 생성 (active 상태 + 아이콘 children)
  - 기존 텍스트 버튼 → SVG 아이콘 교체: Bold, Italic, Underline, Strikethrough
  - 코드/링크/형광펜 그룹 추가
  - H1/H2/H3 제목 그룹 추가
  - 그룹 사이 세로 구분선 (bubble-sep)
  - ColorPickerMenu는 기존 유지
  - CSS: `.bubble-toolbar`, `.bubble-btn`, `.bubble-sep` 스타일 추가

  **Files**: 
  - `app/components/editor/ArticleEditor.tsx` (BubbleMenu 부분)
  - `app/styles/editor.css` (새 스타일)

  **Category**: `quick`

---

- [x] 2. 에디터 상단 고정 툴바 추가

  **What to do**:
  - EditorContent 위에 sticky 툴바 div 추가
  - 왼쪽: 블록 타입 드롭다운 select (본문/제목1/제목2/제목3/인용구/코드블록)
  - 중앙: 서식 아이콘 버튼 (B/I/U/S̶/Code/Link) — BubbleBtn 재사용
  - 오른쪽: 체크리스트/표/이미지 삽입 버튼
  - 에디터 focus 시에만 표시 (또는 항상 표시)
  - 모바일: 가로 스크롤 가능

  **Files**:
  - `app/components/editor/ArticleEditor.tsx` (EditorContent 위에 추가)
  - `app/styles/editor.css` (`.editor-toolbar` 스타일)

  **Category**: `visual-engineering`

---

### Wave 2 (개선)

- [x] 3. 슬래시 메뉴 카테고리 그룹핑

  **What to do**:
  - SlashCommandItem에 `category` 필드 추가
  - 렌더링 시 카테고리별 헤더 표시 (기본/목록/미디어/콜아웃/꾸미기/색상)
  - 색상 커맨드는 `/색상` 또는 `/빨강` 등으로 필터 시에만 표시
  - 카테고리 헤더 스타일: 작은 회색 텍스트

  **Files**:
  - `app/components/editor/SlashCommandMenu.tsx`
  - `app/styles/editor.css`

  **Category**: `quick`

---

- [x] 4. 에디터 스타일 마무리

  **What to do**:
  - 글자 수 카운터 (에디터 하단 우측)
  - 에디터 border 개선 (포커스 시 ocean-blue)
  - placeholder italic 제거 (현재 기울임체)
  - 모바일 툴바 가로 스크롤

  **Files**:
  - `app/components/editor/ArticleEditor.tsx`
  - `app/styles/editor.css`

  **Category**: `quick`

---

### Wave 3 (검증)

- [x] 5. 빌드 + Playwright 테스트 + 배포

  **What to do**:
  - `npx tsc --noEmit` 통과
  - `pnpm run build` 성공
  - `npx playwright test` 전체 통과
  - `npx wrangler deploy --config wrangler.deploy.toml`
  - git commit + push

  **Category**: `quick`

---

## Success Criteria
- [ ] BubbleMenu에 SVG 아이콘 표시, 그룹 구분선 있음
- [ ] 상단 고정 툴바에서 블록 타입 변경 가능
- [ ] 모바일에서 툴바 가로 스크롤 가능
- [ ] Playwright 19개 테스트 통과
- [ ] 빌드 성공 + 프로덕션 배포

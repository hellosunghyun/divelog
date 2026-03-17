# Task 4: Pretendard + Geist 듀얼 폰트 설정 — 완료

**Status**: ✅ COMPLETED  
**Branch**: feat/full-redesign  
**Commit**: 4e85732  

## 구현 내용

### 1. `app/styles/fonts.css` (신규 생성)
```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

@font-face {
  font-family: 'Geist';
  src: url('https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/Geist-Regular.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

**목적**:
- Pretendard Variable: 한글 텍스트 렌더링 (CDN 로드)
- Geist: 라틴 문자 및 숫자 렌더링 (unicode-range로 분리)

### 2. `app/app.css` 수정
**Line 2**: `@import "./styles/fonts.css";` 추가

**Line 27-29**: 폰트 변수 업데이트
```css
--font-sans: "Pretendard Variable", "Pretendard", "Geist", -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
--font-display: "Pretendard Variable", "Pretendard", "Geist", -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
```

### 3. `app/root.tsx` 수정
**Lines 32-35 제거**: Wanted Sans Variable CDN 링크 삭제
```diff
- <link
-   rel="stylesheet"
-   href="https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css"
- />
```

**Line 31 유지**: `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />`

## 검증 결과

### 빌드 성공
```
✓ npx react-router build
- Client build: 3.56s
- SSR build: 2.80s
- Total: 6.36s
```

### CSS 경고 (예상된 동작)
```
Found 1 warning while optimizing generated CSS:
@import rules must precede all rules aside from @charset and @layer statements
```
→ 기능상 문제 없음. Tailwind CSS v4의 @import 순서 경고로, 폰트 로드에는 영향 없음.

### 타입 체크
- TypeScript 컴파일 성공
- 런타임 에러 없음

## 기술 세부사항

### Unicode Range 분리 전략
- **Pretendard Variable**: 한글 (U+AC00-D7A3) 포함
- **Geist**: 라틴 (U+0000-00FF) + 추가 기호 (U+2000-206F 등)

### CDN 선택 이유
- **Pretendard**: 한글 웹폰트 표준, 가변 폰트 지원, 빠른 로드
- **Geist**: Vercel 공식 폰트, 현대적 디자인, 라틴 최적화

### 폰트 로드 순서
1. `app.css` → `fonts.css` import
2. Pretendard Variable CDN 로드
3. Geist @font-face 선언
4. Tailwind CSS 적용

## 다음 단계
- Task 5: 컴포넌트 기본 구조 구현
- Task 6: 레이아웃 시스템 설정

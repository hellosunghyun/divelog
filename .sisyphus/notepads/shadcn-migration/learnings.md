# shadcn/ui Migration Learnings

## Task 1: shadcn/ui Initialization (2026-03-16)

### What Worked
1. **Manual file creation over CLI**: The shadcn CLI can be unreliable in non-interactive environments. Creating `components.json`, `app/lib/utils.ts`, and `app/components/ui/button.tsx` manually was faster and more reliable.

2. **Tailwind v4 compatibility**: 
   - Set `tailwind.config: ""` (empty string) in components.json for Tailwind v4
   - Do NOT set `tailwind.config: "tailwind.config.ts"` — v4 is CSS-first
   - This prevents shadcn from trying to modify the config

3. **Import path aliases**:
   - Use `~/*` alias (already defined in tsconfig.cloudflare.json)
   - Do NOT add `@/*` alias — stick with existing `~/` pattern
   - All shadcn components must import from `~/lib/utils` not `@/lib/utils`

4. **Dependency installation**:
   - `class-variance-authority` (CVA for component variants)
   - `clsx` (conditional class names)
   - `tailwind-merge` (merge Tailwind classes without conflicts)
   - `@radix-ui/react-slot` (for asChild pattern)
   - All installed successfully with pnpm

5. **Build success**:
   - `npx react-router build` completed in 2.83s
   - No TypeScript errors in shadcn files
   - build/client and build/server directories created correctly

### What Didn't Work
1. **wrangler pages dev**: Has known issues with pages-shim.js module not found. This is unrelated to shadcn initialization and appears to be a wrangler version issue (4.69.0). Not blocking for shadcn PoC.

### Key Decisions
1. **Manual button.tsx creation**: Rather than relying on `pnpm dlx shadcn@latest add button`, I wrote the full Button component manually. This ensures:
   - Correct import paths from the start
   - Full control over the implementation
   - No CLI quirks or failures

2. **components.json structure**: Followed shadcn's new-york style with:
   - `rsc: false` (React Router doesn't use RSC)
   - `cssVariables: true` (for Tailwind v4 CSS variable support)
   - All aliases pointing to `~/` prefix

### Edge Runtime Compatibility
- Button component uses only edge-compatible APIs:
  - React.forwardRef (standard React)
  - Radix UI Slot (no Node.js dependencies)
  - CVA (pure JS, no Node.js)
  - No dynamic imports or server-only code
- Ready for Cloudflare Pages edge runtime

### Next Steps
1. Add more shadcn components as needed (input, select, dialog, etc.)
2. Test components in actual routes
3. Verify Tailwind v4 CSS variable integration
4. Consider wrangler version upgrade if edge runtime testing needed

### Files Created
- `components.json` — shadcn configuration
- `app/lib/utils.ts` — cn() utility function
- `app/components/ui/button.tsx` — Button component
- Dependencies: CVA, clsx, tailwind-merge, @radix-ui/react-slot

## [2026-03-16] Task 1: shadcn/ui 초기화

### 성공 패턴
- shadcn CLI 대신 수동 파일 생성이 더 안정적 (CLI는 인터랙티브 모드)
- components.json 수동 작성: rsc:false, tailwind.config:"", aliases에 ~/  패턴 사용
- button.tsx 수동 작성: ~/lib/utils import, React.forwardRef 패턴

### 설치된 의존성
- class-variance-authority@0.7.1
- clsx@2.1.1  
- tailwind-merge@3.5.0
- @radix-ui/react-slot@1.2.4

### 알려진 이슈
- wrangler 4.69.0: "No such module wrangler:modules-watch" 오류 발생
  - 원인: wrangler 버전 불일치 (최신 4.74.0 필요)
  - 영향: edge runtime 로컬 테스트 불가 — shadcn과 무관
  - 해결: wrangler 업그레이드 or 빌드 검증으로 대체

### import 경로 규칙
- ALWAYS use ~/lib/utils (NOT @/lib/utils)
- tsconfig.cloudflare.json의 ~/* → ./app/* alias 사용

## Task 2: shadcn/ui Theme Variables Mapping

### Key Findings

1. **CSS Variable Mapping Strategy**
   - shadcn/ui expects 20 CSS variables in `:root` selector
   - All variables successfully mapped to existing Quiet Depth palette
   - No new colors introduced; pure mapping exercise

2. **Color Mapping Details**
   - `--background` → `#F6F8FB` (color-bg)
   - `--primary` → `#146C94` (color-ocean-blue)
   - `--accent` → `#EAF4FA` (color-mist-blue)
   - `--destructive` → `#DC2626` (color-error from tokens.css)
   - All semantic colors derived from existing Quiet Depth palette

3. **Tailwind v4 Integration**
   - Initial attempt to use `@theme inline` block failed (Tailwind-specific syntax disabled)
   - Solution: CSS variables alone are sufficient for shadcn/ui
   - Tailwind will consume these variables via tailwind.config.ts

4. **File Structure**
   - shadcn variables added to `app/styles/global.css` (after `@import "./tokens.css"`)
   - tokens.css remains untouched (integrity preserved)
   - No modifications to tailwind.config.ts needed at this stage

5. **Build Verification**
   - Build succeeds in 3.46s
   - No CSS syntax errors
   - Sentry sourcemap upload fails (unrelated to CSS changes)

### Lessons for Future Tasks

- shadcn/ui CSS variables are simple CSS custom properties, not Tailwind-specific
- Keep shadcn variables separate from Quiet Depth tokens for clarity
- Comments documenting mapping source are essential for maintainability
- Build verification must check both CSS syntax and TypeScript compilation

### Next Steps (Task 3+)

- Verify shadcn components consume these variables correctly
- Test color contrast and accessibility
- Validate Tailwind utility classes use the mapped colors

## Task 3: shadcn/ui Form Primitives

### Key Findings
- `pnpm dlx shadcn@latest add input textarea label` executed, but this worktree generated files under literal `~/components/ui/` instead of `app/components/ui/`.
- For this React Router + `~/* -> ./app/*` setup, manual relocation and cleanup are safer than trusting the generated file path.
- `Input` and `Textarea` should use `rounded-[var(--radius)]`, `bg-card`, and `focus-visible:ring-*` utilities to stay aligned with Quiet Depth form styling without hardcoded colors.
- `Label` works cleanly with `@radix-ui/react-label` plus `~/lib/utils`; keep the import alias consistent and do not introduce `@/lib/utils`.
- `npx react-router build` still exits successfully after adding the three primitives.

## Task 4: shadcn/ui Selection Primitives

### Key Findings
- `SelectTrigger` should visually track `Input` with `h-12`, `bg-card`, `border-input`, and semantic focus ring utilities so form controls feel like one Quiet Depth family.
- `SelectContent` benefits from a slightly larger radius than the trigger plus border/shadow layering; semantic classes like `bg-popover`, `border-border`, and `text-popover-foreground` are enough without hardcoded colors.
- `Checkbox` and `RadioGroupItem` feel closer to the design system when they use card surfaces, subtle shadows, and `data-[state=checked]` state styling instead of shadcn's more generic defaults.
- Keep all imports on `~/lib/utils`; this worktree still must not introduce `@/lib/utils` in any generated shadcn file.
- Direct `pnpm add` for Radix packages remains the most reliable setup path in this worktree.

## Task 5: shadcn/ui Data Display + Overlay

### Key Findings
- `Table` should be shipped as an admin-only dense primitive, so the wrapper itself can carry Quiet Depth border/surface treatment while headers stay compact and uppercase for quick scanning.
- `Badge` works best as a restrained status chip when it leans on semantic shadcn tokens (`primary`, `secondary`, `destructive`, `outline`) instead of adding new hardcoded color values.
- `Dialog` and `AlertDialog` feel aligned with Quiet Depth when overlays use subdued foreground tint + light blur, content uses `bg-card`/`border-border`, and close/actions preserve the existing button focus-ring language.
- Keep every new primitive on the established `~/lib/utils` import path; no `@/lib/utils` alias should leak in during manual shadcn-style creation.
- `npx react-router build` still completes successfully in this worktree even though Sentry sourcemap upload warnings appear afterward.

## Task 6: Shared app components migration

### Key Findings
- Radix `SelectItem`는 빈 문자열 값을 허용하지 않아서, "전체" 옵션은 `__all__` 같은 sentinel 문자열로 매핑한 뒤 `onValueChange`에서 다시 빈 값으로 되돌려야 기존 searchParams 삭제 로직을 유지할 수 있다.
- `Select`는 네이티브 `onChange` 대신 `onValueChange`를 쓰므로, `URLSearchParams` 갱신 로직은 그대로 두고 이벤트 부분만 value 기반으로 치환하는 방식이 가장 안전하다.
- 모바일 검색 입력은 `Input`으로 바꾸더라도 기존 절대 위치 아이콘 오프셋을 유지하려면 `pl-10`, `rounded-full`, `shadow-none` 같은 클래스 override가 필요하다.
- shadcn `Button`으로 교체할 때 기존 Quiet Depth pill 버튼 느낌은 `variant="ghost"`에 border, radius, hover 색을 className으로 덧씌우는 방식으로 보존할 수 있다.
- 이 worktree의 `npx react-router build`는 Sentry sourcemap upload 경고를 출력해도 종료 코드는 0이므로 빌드 검증은 성공으로 판단해도 된다.

## Task 7: note.tsx 폼 마이그레이션

### Key Findings
- `Select`의 `name` prop은 기본 네이티브 제출 흐름과 잘 맞지만, 빈 값 선택지가 필요한 경우에는 hidden input과 sentinel 값을 함께 써야 action 로직을 건드리지 않고 `"" -> undefined` 흐름을 유지할 수 있다.
- `stageId`처럼 "미지정" 상태가 필요한 필드는 `__none__` 같은 sentinel을 UI 상태에만 쓰고, 실제 제출 값은 hidden input에서 빈 문자열로 변환하는 방식이 가장 안전하다.
- `visibility`처럼 항상 유효한 값이 있는 필드는 `Select name="visibility" defaultValue="cohort"`만으로 FormData 호환이 가능하다.
- 기존 Quiet Depth 간격/타이포는 유지하고, 실제 상호작용 표면만 `Label`, `Select`, `Button`으로 교체하면 시각 톤을 크게 흔들지 않고 shadcn 도입이 가능하다.

## Task 8: edit/details 폼 마이그레이션

### Key Findings
- 선택 해제 상태가 필요한 `templateId`, `collaborationUnitId` 같은 optional select는 `Select`를 제어 컴포넌트로 두고 hidden input에서 sentinel 값을 빈 문자열로 되돌려야 기존 action validation을 그대로 통과한다.
- `RadioGroup`은 `name` + `defaultValue`만으로 FormData 제출이 가능해서, 기존 라디오 입력을 교체할 때 loader/action 수정 없이 유지하기 좋다.
- 조건부로 나타나는 `questionDirection`도 `RadioGroup`으로 바꿔도 문제없고, `Textarea`는 기존 상태 업데이트 로직을 그대로 붙여서 마이그레이션할 수 있다.

## Task 9: record detail 인라인 폼 마이그레이션

### Key Findings
- 선택 가능한 해제 상태가 있는 `questionId`는 `SelectItem`에 빈 문자열을 줄 수 없어서 `__none__` sentinel + hidden input 조합으로 기존 optional FormData 동작을 유지해야 한다.
- 필수 `type`처럼 기본값이 항상 존재하는 필드는 `Select name="type" defaultValue={...}`만으로 action 스키마를 건드리지 않고 네이티브 select를 안전하게 대체할 수 있다.
- 기록 상세의 인라인 액션 버튼은 `Button variant="ghost" size="sm"` 위에 기존 pill 스타일 클래스를 덧씌우면 shadcn으로 바꾸면서도 Quiet Depth 톤을 거의 그대로 유지할 수 있다.
- Highlighted Sentence 폼의 본문은 `Input`, 이유는 `Textarea`로 나누면 사용자 지시를 맞추면서도 hidden inputs와 서버 액션 로직은 그대로 둬도 된다.

## Task 10: article.tsx 폼 마이그레이션

### Key Findings
- `article.tsx`도 `note.tsx`와 같은 방식으로 optional select를 hidden input + `__none__` sentinel로 감싸면 `stageId`와 `templateId`의 빈 값 제출을 action 변경 없이 유지할 수 있다.
- `visibility`처럼 항상 값이 존재하는 필드는 `Select name="visibility" defaultValue="cohort"`만으로 FormData 제출이 가능해 네이티브 select를 바로 대체할 수 있다.
- 제어형 제목 필드는 `Input`에 기존 `value`/`onChange`를 그대로 전달하고, `aria-invalid`만 더해주면 현재 검증 UX를 유지하면서 shadcn 스타일로 전환할 수 있다.
- 저장 버튼은 `Button`으로 바꾸되 기존 spacing 클래스를 유지하면 write 화면의 Quiet Depth 리듬을 크게 흔들지 않는다.

## Task 11: settings/inbox/remaining public 폼 마이그레이션

### Key Findings
- 설정 화면의 필수 select 2개는 `Select name=... defaultValue=...`만으로 action 로직을 건드리지 않고 그대로 제출할 수 있고, Label/Trigger 조합으로 기존 조용한 폼 밀도를 유지할 수 있다.
- shadcn `Checkbox`는 `name` + `defaultChecked` 조합으로 네이티브 체크박스와 같은 FormData 흐름을 유지하므로 `notificationEmailEnabled === "on"` 비교를 그대로 둘 수 있다.
- 링크처럼 보이던 인박스 액션 버튼은 `Button variant="ghost"`에 `p-0`, `h-auto`, `hover:bg-transparent`를 덧씌우면 hidden inputs를 유지하면서도 기존 텍스트 액션 톤을 보존할 수 있다.
- optional 필터 select는 빈 문자열 대신 `__all__` sentinel을 UI 값으로 쓰고 `onValueChange`에서 다시 `""`로 매핑해야 URLSearchParams 삭제 로직이 깨지지 않는다.

## Task 12: Admin Tables A

### Key Findings
- admin 리스트 테이블은 `TableHead`와 `TableCell`에 직접 compact padding(`py-2`, `px-3`/`px-4`)을 덮어써야 shadcn 기본 밀도보다 더 조밀한 운영 화면 리듬을 유지할 수 있다.
- 기존 `<table>` 래퍼 박스는 `Table` 컴포넌트가 이미 border, radius, overflow를 제공하므로 중복 컨테이너를 제거하는 편이 더 깔끔하다.
- 상태 컬럼은 plain text보다 `Badge`가 스캔성이 좋아서 `visibility`는 `outline`, `moderationStatus`는 상태에 따라 `secondary`/`destructive`로 매핑하는 방식이 안전하다.

## Task 13: Admin Tables B

### Key Findings
- Admin index 테이블 5종도 Task 12와 같은 방식으로 `Table` 래퍼를 직접 쓰고, 별도 `div` 컨테이너는 제거해야 shadcn의 border/radius/overflow 처리가 중복되지 않는다.
- 헤더는 모든 파일에서 `text-xs uppercase tracking-widest text-muted-foreground`를 명시하고, 셀은 `px-3`/`px-4` + `py-2`로 통일해야 dense admin 스캔 리듬이 유지된다.
- 상태성 값은 텍스트 그대로 두기보다 `Badge`로 감싸는 편이 목록 가독성이 좋아서 `active/default`, `flagged/destructive`, 초안류 `outline` 같은 단순 매핑이 안전하다.

## Task 14: Admin Tables C

### Key Findings
- `curation.tsx`, `audit.tsx`, `tags.tsx`, `roles.tsx`도 Task 12/13과 같은 패턴으로 wrapper `div`보다 `Table` 자체를 직접 쓰는 편이 admin 테이블 밀도와 일관성을 유지하기 쉽다.
- `tags.tsx`의 삭제 확인은 `window.confirm()` 대신 `AlertDialog`로 바꾸되, 각 행의 기존 POST form은 유지하고 `AlertDialogAction`에서 `form.requestSubmit()`을 호출하면 React Router action 흐름을 건드리지 않아도 된다.
- `roles.tsx`의 grant 폼은 shadcn `Select`를 UI에만 쓰고 hidden input으로 실제 `userId`/`role` 값을 제출하면 placeholder sentinel 값과 기존 서버 action을 안전하게 분리할 수 있다.
- `tags.tsx`의 `<input type="color">`는 shadcn 대체 컴포넌트가 없으므로 네이티브로 남기고, 주변 레이블/텍스트 입력/버튼만 shadcn으로 맞추는 방식이 가장 안전하다.

## Task 15: Admin Forms A

### Key Findings
- admin detail 폼처럼 기본값이 항상 존재하는 상태 필드는 hidden input 없이 `Select name=... defaultValue=...`로 바로 교체해도 기존 FormData 흐름을 유지할 수 있다.
- `Checkbox`는 `name`과 `defaultChecked`만 유지하면 기존 `f.get("isCurrent") === "on"` 비교를 바꾸지 않고도 네이티브 체크박스를 대체할 수 있다.
- admin 폼 밀도는 shadcn 기본 높이보다 낮아야 기존 운영 화면 톤과 맞아서 `Input`/`SelectTrigger`/`Button`에 `h-9` 또는 `h-10`, `border-admin-border`, `bg-admin-surface` 같은 클래스 오버라이드를 주는 편이 안전하다.
- `AdminSidebar` 접기 버튼은 `Button variant="ghost"`로 바꾸고 기존 sidebar focus ring 클래스를 유지하면 접근성을 해치지 않으면서 `<button>` 태그를 제거할 수 있다.

## Task 16: Admin Forms B

### Key Findings
- 템플릿 편집의 optional select 3종(`context`, `form`, `rhythm`)은 `SelectItem`에 빈 문자열을 줄 수 없어서 `__all__` sentinel + hidden input 조합으로 유지해야 action을 건드리지 않고 `null` 저장 흐름을 보존할 수 있다.
- 설정 토글처럼 여러 체크박스를 map으로 렌더링하는 화면도 `Checkbox id/name/defaultChecked`와 `Label htmlFor`를 짝지으면 기존 FormData 제출과 접근성을 함께 유지할 수 있다.
- admin 폼 B 파일들도 이전 Task 15와 동일하게 `border-admin-border`, `bg-admin-surface`, `h-10`, `text-sm` override를 주면 shadcn primitive로 교체해도 운영 화면의 조밀한 톤이 크게 흔들리지 않는다.
- 검토/메모리 편집처럼 필수 상태값 select는 `Select name=... defaultValue=...`만으로 충분하고, placeholder는 남겨도 실제 제출 값은 기본값으로 안정적으로 유지된다.

## Task 17: 빌드/타입/잔존 요소 최종 검증

### Key Findings
- `<button>`/`<label>` 잔존은 실제 기능 코드보다 태그칩 예외 구간과 nav 토글 같은 마지막 변환 누락에서 주로 발생하므로, `app/routes` + `app/components` 전체 정규식 스캔이 가장 빠른 마무리 점검 방식이다.
- hidden/color input은 예외 대상이지만 멀티라인 JSX에서는 단순 grep 필터가 누락될 수 있어, `type="hidden"`/`type="color"`를 한 줄로 정리하면 검증 신뢰도가 올라간다.
- 최종 검증 단계에서 `@/lib/utils`, `as any`, `@ts-ignore`, `@ts-expect-error`는 모두 0건이어야 하고, 예외 허용 파일(tag-chip, editor/ui)만 남는 상태를 명시적으로 기록해야 이후 회귀를 막기 쉽다.
- 빌드(`npx react-router build`)와 타입체크(`tsc --noEmit`)가 둘 다 통과한 뒤 LSP diagnostics까지 clean 확인하면 마이그레이션 마감 품질 기준을 안정적으로 충족할 수 있다.

# Sentry 에러 리포팅 전체 정비

## TL;DR

> **Quick Summary**: 전체 코드베이스에서 Sentry 에러 캡처 갭을 수정하고, 유저 컨텍스트 설정, handleError 강화, 디버그 코드 정리를 수행
> 
> **Deliverables**:
> - 에러가 삼켜지는 13곳에 `Sentry.captureException` 추가
> - 레이아웃 loader에 `Sentry.setUser()` 추가 (유저 식별)
> - `handleError` 에 요청 컨텍스트 추가
> - 디버그 코드 2곳 제거
> - admin ErrorBoundary 추가 (Sentry 캡처 + 사용자 친화 UI)
> - root ErrorBoundary 개선
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES — 2 waves

---

## Context

### 감사 결과 요약

전체 코드베이스에서 에러가 Sentry에 보고되지 않는 갭 16개 발견:

| 심각도 | 수 | 대표 사례 |
|--------|-----|-----------|
| CRITICAL | 1 | `Sentry.setUser()` 전혀 없음 — 에러 발생 시 유저 식별 불가 |
| HIGH | 4 | auth API 실패, background task, autosave, R2 upload 에러 삼킴 |
| MEDIUM | 8 | 디버그 코드, handleError 컨텍스트 부족, hydration 에러, audit log |
| LOW | 1 | content 렌더링 에러 |

### 핵심 원리

에러 캡처는 **3개 레이어**에서 이루어져야 함:

1. **Worker**: `wrapRequestHandler` — 미처리 예외 자동 캡처 ✅ (이미 작동)
2. **SSR**: `entry.server.tsx handleError` — loader/action 에러 ✅ (보강 필요)
3. **Client**: `entry.client.tsx Sentry.init` — 클라이언트 에러 ✅ (보강 필요)

개별 라우트에서 try-catch로 에러를 잡으면 위 레이어를 우회하므로, **catch한 에러는 반드시 `Sentry.captureException` 호출 후 re-throw하거나 보고해야 함**.

---

## Verification Strategy

### QA Policy
- `npx react-router build` 성공
- `wrangler deploy` 성공
- https://divelog.ada-kr-pos.com/admin 정상 로드
- https://divelog.ada-kr-pos.com/ 정상 로드

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 중앙 인프라 + 레이아웃):
├── Task 1: entry.server.tsx handleError 강화 [quick]
├── Task 2: entry.client.tsx hydration 에러 보고 [quick]
├── Task 3: root.tsx ErrorBoundary 개선 [quick]
├── Task 4: _admin.tsx 디버그 제거 + ErrorBoundary + setUser [quick]
├── Task 5: admin/index.tsx 디버그 제거 [quick]
├── Task 6: _public.tsx background task + setUser [quick]
└── Task 7: auth.server.ts 에러 보고 [quick]

Wave 2 (After Wave 1 — 라우트별 갭 수정):
├── Task 8: auth.middleware.ts getOptionalUser [quick]
├── Task 9: api/autosave.tsx catch [quick]
├── Task 10: records.server.ts audit log [quick]
├── Task 11: content.server.ts 렌더링 에러 [quick]
├── Task 12: _public.tsx background task 에러 [quick]
└── Task 13: 빌드 + 배포 + 검증 [quick]
```

---

## TODOs

- [ ] 1. `app/entry.server.tsx` — handleError에 요청 컨텍스트 추가

  **What to do**:
  handleError 함수에 요청 메서드, 경로, 쿼리 정보를 Sentry 컨텍스트로 추가.

  **현재 코드** (lines 43-51):
  ```typescript
  export const handleError = (
    error: unknown,
    { request }: { request: Request },
  ) => {
    if (!request.signal.aborted) {
      Sentry.captureException(error);
      console.error(error);
    }
  };
  ```

  **변경 후**:
  ```typescript
  export const handleError = (
    error: unknown,
    { request }: { request: Request },
  ) => {
    if (request.signal.aborted) return;
    const url = new URL(request.url);
    Sentry.captureException(error, {
      contexts: {
        request: {
          method: request.method,
          url: url.pathname + url.search,
        },
      },
    });
  };
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] handleError가 request context를 Sentry에 전달
  - [ ] `console.error` 제거 (Sentry가 에러를 캡처하므로 중복)

---

- [ ] 2. `app/entry.client.tsx` — hydration 에러 Sentry 보고

  **What to do**:
  onRecoverableError에서 Sentry.captureException 호출 추가.

  **현재 코드** (lines 23-30):
  ```typescript
  onRecoverableError(error) {
    if (import.meta.env.DEV) {
      console.warn("[hydration]", error);
    }
  }
  ```

  **변경 후**:
  ```typescript
  onRecoverableError(error) {
    Sentry.captureException(error, { tags: { type: "hydration" } });
  }
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] hydration 에러가 Sentry에 보고됨
  - [ ] `hydration` 태그가 붙음

---

- [ ] 3. `app/root.tsx` — ErrorBoundary 개선

  **What to do**:
  - `Sentry.captureException`을 if/else 분기 전으로 이동
  - unknown 에러도 캡처
  - production에서 error.message 표시

  **변경 후 (전체 ErrorBoundary)**:
  ```tsx
  export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    if (error instanceof Error) {
      Sentry.captureException(error);
    }

    let message = "오류가 발생했습니다";
    let details = "예상치 못한 오류가 발생했습니다.";
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
      message = error.status === 404 ? "404" : "오류";
      details =
        error.status === 404
          ? "요청하신 페이지를 찾을 수 없습니다."
          : error.statusText || "예상치 못한 오류가 발생했습니다.";
    } else if (error instanceof Error) {
      details = error.message;
      if (import.meta.env.DEV) {
        stack = error.stack;
      }
    }

    return (
      <main className="pt-16 p-4 container mx-auto">
        <h1>{message}</h1>
        <p>{details}</p>
        {stack && (
          <pre className="w-full p-4 overflow-x-auto">
            <code>{stack}</code>
          </pre>
        )}
      </main>
    );
  }
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] captureException이 분기 전에 호출
  - [ ] production에서 error.message 표시

---

- [ ] 4. `app/routes/_admin.tsx` — 디버그 제거 + ErrorBoundary + setUser

  **What to do**:
  - 디버그 try-catch 제거 (loader를 간결하게)
  - `import * as Sentry` 추가
  - `Sentry.setUser()` 호출 (인증 성공 후)
  - ErrorBoundary에 `Sentry.captureException` 추가

  **변경 후 (전체 파일)**:
  ```tsx
  import { Outlet, isRouteErrorResponse } from "react-router";
  import * as Sentry from "@sentry/react-router/cloudflare";
  import type { Route } from "./+types/_admin";
  import { requireRole, bootstrapAdmin } from "~/lib/auth/auth.middleware";
  import AdminSidebar from "~/components/admin/AdminSidebar";
  import AdminContextBar from "~/components/admin/AdminContextBar";

  export async function loader({ request, context }: Route.LoaderArgs) {
    const { createLogger } = await import("~/lib/infra/logger.server");
    const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.layout" });
    logger.info("loader_start");
    await bootstrapAdmin(context);
    const auth = await requireRole(request, context, "admin");

    Sentry.setUser({ id: auth.user!.id, username: auth.user!.nickname ?? auth.user!.name ?? undefined });

    return {
      adminUser: {
        id: auth.user!.id,
        name: auth.user!.nickname ?? auth.user!.name ?? "관리자",
      },
    };
  }

  export function shouldRevalidate({
    formMethod,
    defaultShouldRevalidate,
  }: {
    formMethod?: string;
    defaultShouldRevalidate: boolean;
  }): boolean {
    if (formMethod && formMethod !== "GET") {
      return defaultShouldRevalidate;
    }
    return false;
  }

  export default function AdminLayout() {
    return (
      <div className="flex min-h-screen overflow-hidden bg-admin-bg">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminContextBar />
          <main className="flex-1 overflow-y-auto p-5">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    if (error instanceof Error) {
      Sentry.captureException(error);
    }

    let message = "Admin 오류";
    let details = "예상치 못한 오류가 발생했습니다.";

    if (isRouteErrorResponse(error)) {
      message = `오류 ${error.status}`;
      details = error.statusText || details;
    } else if (error instanceof Error) {
      details = error.message;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-admin-bg">
        <div className="max-w-md w-full bg-admin-surface border border-admin-border rounded-lg p-8 text-center">
          <p className="text-sm font-medium text-error mb-2">{message}</p>
          <p className="text-sm text-admin-text-secondary mb-6">{details}</p>
          <a href="/admin" className="text-sm text-admin-accent hover:underline">
            대시보드로 이동
          </a>
        </div>
      </div>
    );
  }
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] 디버그 try-catch 없음
  - [ ] `Sentry.setUser()` 호출됨
  - [ ] ErrorBoundary에 Sentry 캡처 있음

---

- [ ] 5. `app/routes/admin/index.tsx` — 디버그 try-catch 제거

  **What to do**:
  loader의 try-catch 래퍼 제거. 원래의 간결한 loader로 복원.

  **oldString** (현재 try-catch 포함):
  ```
    logger.info("loader_start");
    try {
      const database = db(context.cloudflare.env.DB);
      ...
      return { ... };
    } catch (thrown) {
      ...throw new Response(JSON.stringify({...}))...
    }
  ```

  **newString**:
  ```
    logger.info("loader_start");
    const database = db(context.cloudflare.env.DB);
    const [currentStage, recentRecords, flaggedRecords, allLearners] = await database.batch([
      database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
      database.select({ record: records, author: { displayName: learnerProfiles.displayName } }).from(records).leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId)).orderBy(desc(records.createdAt)).limit(5),
      database.select().from(records).where(eq(records.moderationStatus, "flagged")).limit(5),
      database.select().from(learnerProfiles),
    ]);
    return { currentStage: currentStage[0] ?? null, recentRecords, flaggedRecords, learnerCount: allLearners.length };
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] try-catch 없음
  - [ ] `JSON.stringify` + `source` 패턴 없음

---

- [ ] 6. `app/routes/_public.tsx` — background task Sentry 보고 + setUser

  **What to do**:
  - 인증 성공 시 `Sentry.setUser()` 호출
  - waitUntil catch 블록에 `Sentry.captureException` 추가

  **변경 방법**:
  1. `import * as Sentry from "@sentry/react-router/cloudflare"` 추가
  2. auth 성공 후 `Sentry.setUser({ id: auth.user.id, username: auth.user.nickname ?? auth.user.name ?? undefined })` 추가
  3. `.catch((err) => { ... })` 안에 `Sentry.captureException(err)` 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] Sentry.setUser() 호출됨
  - [ ] background task 에러가 Sentry에 보고됨

---

- [ ] 7. `app/lib/auth/auth.server.ts` — 인증 API 에러 Sentry 보고

  **What to do**:
  getAuth 함수의 catch 블록 (lines 106-122)에서 최종 실패 시 `Sentry.captureException` 추가.

  **변경 방법**:
  1. `import * as Sentry from "@sentry/react-router/cloudflare"` 추가
  2. 최종 실패 catch (line 115-121)에 `Sentry.captureException(e, { tags: { type: "auth_api" } })` 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] 인증 API 최종 실패 시 Sentry 보고

---

- [ ] 8. `app/lib/auth/auth.middleware.ts` — getOptionalUser Sentry 보고

  **What to do**:
  getOptionalUser의 catch 블록 (line 28-32)에 `Sentry.captureException` 추가.

  **변경 방법**:
  1. `import * as Sentry from "@sentry/react-router/cloudflare"` 추가
  2. catch 블록에 `Sentry.captureException(error, { tags: { type: "auth_optional" } })` 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] getOptionalUser 에러가 Sentry에 보고됨

---

- [ ] 9. `app/routes/api/autosave.tsx` — catch 블록 Sentry 보고

  **What to do**:
  autosave action의 catch 블록에 `Sentry.captureException` 추가.

  **변경 방법**:
  1. `import * as Sentry from "@sentry/react-router/cloudflare"` 추가
  2. `catch {` → `catch (error) {` 으로 변경하고 `Sentry.captureException(error)` 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] autosave 에러가 Sentry에 보고됨

---

- [ ] 10. `app/db/queries/records/records.server.ts` — audit log 에러 Sentry 보고

  **What to do**:
  createRecord 내 audit log catch 블록 (lines 130-141)에 `Sentry.captureException` 추가.

  **변경 방법**:
  1. `import * as Sentry from "@sentry/react-router/cloudflare"` 추가
  2. catch 블록에 `Sentry.captureException(err, { tags: { type: "audit_log" } })` 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] audit log 실패가 Sentry에 보고됨

---

- [ ] 11. `app/lib/content/content.server.ts` — 렌더링 에러 Sentry 보고

  **What to do**:
  tiptapJsonToHtml catch 블록에 `Sentry.captureException` 추가.

  **변경 방법**:
  1. `import * as Sentry from "@sentry/react-router/cloudflare"` 추가
  2. catch 블록에 `Sentry.captureException(err, { tags: { type: "content_render" } })` 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] 콘텐츠 렌더링 에러가 Sentry에 보고됨

---

- [ ] 12. 빌드 + 배포 + 검증

  **What to do**:
  - `npx react-router build` → 성공 확인
  - `wrangler deploy` → Version ID 확인
  - https://divelog.ada-kr-pos.com/admin 접속 → 대시보드 정상 로드
  - https://divelog.ada-kr-pos.com/ 접속 → 홈 정상 로드

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] 빌드 exit code 0
  - [ ] 배포 성공
  - [ ] admin 200 또는 302
  - [ ] home 200

  **Commit**: YES
  - Message: `fix: Sentry 에러 캡처 전체 정비 — 유저 컨텍스트, handleError 강화, 갭 수정`
  - Files: `entry.server.tsx`, `entry.client.tsx`, `root.tsx`, `_admin.tsx`, `admin/index.tsx`, `_public.tsx`, `auth.server.ts`, `auth.middleware.ts`, `api/autosave.tsx`, `records.server.ts`, `content.server.ts`

---

## Success Criteria

### Final Checklist
- [ ] 디버그 try-catch 모두 제거 (`_admin.tsx`, `admin/index.tsx`)
- [ ] `Sentry.setUser()` — `_public.tsx` + `_admin.tsx`에서 호출
- [ ] `handleError` — 요청 컨텍스트 (method, path) 추가
- [ ] 에러 삼킴 갭 — auth, background task, autosave, audit log, content render 모두 Sentry 보고
- [ ] hydration 에러 — 클라이언트에서 Sentry 보고
- [ ] root ErrorBoundary — production에서 error.message 표시
- [ ] admin ErrorBoundary — Sentry 캡처 + 사용자 친화 UI
- [ ] 빌드 + 배포 성공
- [ ] admin + home 페이지 정상 동작

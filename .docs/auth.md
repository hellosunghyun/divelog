# ada-kr-pos.com 인증 연동 가이드

## 인증 방식
모든 API 요청에 Authorization 헤더를 포함하세요.
`Authorization: Bearer <API_KEY>`

## 세션 쿠키
- 이름: `adakrpos_session`
- Domain: `.ada-kr-pos.com` (모든 *.ada-kr-pos.com 서브도메인에 자동 전달)
- SameSite: Lax
- TTL: 7일 (50% 경과 시 자동 갱신)
- 값: Opaque UUID (JWT 아님)

## SDK 설치
```
npm install @adakrpos/auth
```

### 진입점
- `@adakrpos/auth` — 코어 클라이언트 (모든 환경)
- `@adakrpos/auth/hono` — Hono 미들웨어
- `@adakrpos/auth/express` — Express 미들웨어
- `@adakrpos/auth/generic` — Web API Request (CF Workers, Deno, Bun)

### 코어 클라이언트
```typescript
import { createAdakrposAuth } from "@adakrpos/auth";

const auth = createAdakrposAuth({
  apiKey: "ak_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  authUrl: "https://ada-kr-pos.com", // 기본값, 생략 가능
});

// 세션 검증 — 사용자 + 세션 정보 반환
const result = await auth.verifySession(sessionId);
if (result) {
  result.user;    // AdakrposUser
  result.session; // AdakrposSession
}

// 세션에서 사용자만 꺼내기
const user = await auth.getCurrentUser(sessionId);

// 사용자 ID로 프로필 조회
const user = await auth.getUser("user-uuid");
```

### Hono 미들웨어
```typescript
import { adakrposAuth, getAuth } from "@adakrpos/auth/hono";

app.use("*", adakrposAuth({ apiKey: process.env.ADAKRPOS_API_KEY! }));

app.get("/api/me", async (c) => {
  const auth = await getAuth(c);
  if (!auth.isAuthenticated) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ user: auth.user });
});

// 인증 필수 미들웨어
import { requireAuth } from "@adakrpos/auth/hono";
app.use("/api/protected/*", requireAuth({ apiKey: process.env.ADAKRPOS_API_KEY! }));
```

### Express 미들웨어
```typescript
import { adakrposAuthExpress } from "@adakrpos/auth/express";

app.use(adakrposAuthExpress({ apiKey: process.env.ADAKRPOS_API_KEY! }));

app.get("/dashboard", async (req, res) => {
  const auth = await req.auth!();
  if (!auth.isAuthenticated) return res.redirect("https://ada-kr-pos.com/login");
  res.json({ user: auth.user });
});

// 인증 필수 미들웨어
import { requireAuthExpress } from "@adakrpos/auth/express";
app.use("/api", requireAuthExpress({ apiKey: process.env.ADAKRPOS_API_KEY! }));
```

### Generic (CF Workers, Deno, Bun)
```typescript
import { verifyRequest } from "@adakrpos/auth/generic";

const auth = await verifyRequest(request, { apiKey: env.ADAKRPOS_API_KEY });
if (!auth.isAuthenticated) return new Response("Unauthorized", { status: 401 });
// auth.user, auth.session 사용
```

## 타입 정의
```typescript
interface AdakrposUser {
  id: string;
  email: string | null;         // Apple 계정 이메일
  verifiedEmail: string | null; // @pos.idserve.net 인증 이메일
  nickname: string | null;
  name: string | null;
  profilePhotoUrl: string | null;
  bio: string | null;
  contact: string | null;
  snsLinks: Record<string, string>;
  cohort: string | null;        // e.g. "cohort-2026"
  isVerified: boolean;          // pos.idserve.net 인증 여부
  createdAt: number;            // Unix 타임스탬프 (ms)
  updatedAt: number;            // Unix 타임스탬프 (ms)
}

interface AdakrposSession {
  id: string;
  userId: string;
  expiresAt: number;  // Unix 타임스탬프 (ms)
  createdAt: number;  // Unix 타임스탬프 (ms)
}

type AuthContext =
  | { user: AdakrposUser; session: AdakrposSession; isAuthenticated: true }
  | { user: null; session: null; isAuthenticated: false };

interface AdakrposAuthConfig {
  apiKey: string;
  authUrl?: string; // 기본값: "https://ada-kr-pos.com"
}
```

## HTTP API

### POST /api/sdk/verify-session
세션 ID를 검증하고 사용자 정보를 반환합니다.
```
POST https://ada-kr-pos.com/api/sdk/verify-session
Content-Type: application/json
Authorization: Bearer <API_KEY>

{ "sessionId": "쿠키에서 읽은 adakrpos_session 값" }
```
성공 (200): `{ "user": AdakrposUser, "session": AdakrposSession }`
실패: 404 (세션 없음), 401 (API 키 무효)

### GET /api/sdk/users/:id
사용자 ID로 프로필을 조회합니다.
```
GET https://ada-kr-pos.com/api/sdk/users/{userId}
Authorization: Bearer <API_KEY>
```
성공 (200): `AdakrposUser`
실패: 404 (사용자 없음), 401 (API 키 무효)

### POST /api/sdk/verify-key
API 키 유효성을 확인합니다.
```
POST https://ada-kr-pos.com/api/sdk/verify-key
Authorization: Bearer <API_KEY>
```
성공 (200): `{ "valid": true }`
실패: 401 (키 무효), 403 (키 비활성)

## 에러 코드
- 401: API 키 누락 또는 유효하지 않음
- 403: API 키 비활성 상태
- 404: 세션 또는 사용자를 찾을 수 없음
- 429: 요청 한도 초과

## 로그인 리다이렉트 (callbackUrl)
미인증 사용자를 로그인 페이지로 보낼 때 `callbackUrl` 파라미터를 사용하면 로그인 후 원래 페이지로 돌아옵니다.

```
https://ada-kr-pos.com/login?callbackUrl=https://your-app.ada-kr-pos.com/current-page
```

- callbackUrl은 `https://` + `*.ada-kr-pos.com` 도메인만 허용 (Open Redirect 방지)
- callbackUrl이 없거나 유효하지 않으면 기본 /mypage로 이동
- Apple 로그인, 매직링크 모두 지원

### 예시 (Hono)
```typescript
if (!auth.isAuthenticated) {
  const loginUrl = new URL("https://ada-kr-pos.com/login");
  loginUrl.searchParams.set("callbackUrl", c.req.url);
  return c.redirect(loginUrl.toString());
}
```

### 예시 (Express)
```typescript
if (!auth.isAuthenticated) {
  const loginUrl = new URL("https://ada-kr-pos.com/login");
  loginUrl.searchParams.set("callbackUrl", `${req.protocol}://${req.get("host")}${req.originalUrl}`);
  return res.redirect(loginUrl.toString());
}
```

## 참고
- SDK는 401/403 응답 시 해당 API 키를 30초간 무효로 캐시합니다.
- 키 교체 후 즉시 반영하려면: `import { clearApiKeyCache } from "@adakrpos/auth"; clearApiKeyCache();`
- 미인증 사용자는 `https://ada-kr-pos.com/login?callbackUrl=<현재URL>` 로 리다이렉트하세요.

## divelog 로컬 미들웨어

divelog은 `@adakrpos/auth/generic`의 `verifyRequest`를 감싸서 다음 미들웨어 함수를 구현합니다.

### 위치
`app/lib/auth/auth.middleware.ts`

### 함수 목록

| 함수 | 용도 | 사용처 |
|------|------|--------|
| `getOptionalUser` | 선택적 사용자 조회 (비인증 허용) | 모든 Public 페이지 |
| `requireAuth` | 인증 필수 (미인증 시 로그인 리다이렉트) | /inbox, /me, /settings |
| `requireVerified` | isVerified=true 필수 (미인증 시 /guide 리다이렉트) | /write/*, 기록 편집 |
| `requireRole` | 특정 역할 필수 (DB user_roles 확인) | Admin 전체 (role="admin") |
| `bootstrapAdmin` | ADMIN_USER_ID 환경변수로 최초 admin 설정 | _admin.tsx 레이아웃 |
| `ensureAdminByEmail` | ADMIN_EMAILS 기반 admin 역할 자동 부여 | _public.tsx (waitUntil) |

### WeakMap 캐싱
`getAuth(request, apiKey)` 함수는 WeakMap으로 요청당 1회만 `verifyRequest`를 호출합니다.
동일 요청 내 여러 미들웨어가 `getAuth()`를 호출해도 API 중복 호출이 발생하지 않습니다.

### 무한 리다이렉트 방지
`requireAuth`는 `auth_retry=1` 쿼리 파라미터로 리다이렉트 루프를 감지합니다.
로그인 후 돌아왔는데도 인증이 안 되면, 무한 루프 대신 에러를 표시합니다.

---
active: true
iteration: 1
completion_promise: "DONE"
initial_completion_promise: "DONE"
started_at: "2026-03-17T15:18:32.680Z"
session_id: "ses_3039f715effeIsakcxdlQTxXi3"
ultrawork: true
strategy: "continue"
message_count_at_start: 1
---
아래 내용 참고해서 적극적으로 코드베이스를 최적화 하도록 해. 과정에서를 chrome-dev-tools mcp를 적극 활용하도록해. 최대한으로. 목표 측정치를 정하고 해당 측정치에 달성할때 까지 최적화를 멈추지 마. 로컬에서의 테스트가 힘들다면 원격 배포하고 배포 다될때까지 기다리고 테스트 진행 하도록 해. 깊은 리서치 통해 계획 세워. [Pasted ~688 lines] # React Router v7 Framework Mode 속도 최적화 딥리서치 리포트

## Executive summary

본 리포트는 **“특정 제약 없음(앱 규모·트래픽 패턴·호스팅 미지정)”**을 전제로, React Router v7 **Framework Mode**에서 “체감 속도”와 “측정 가능한 속도”를 함께 올리는 방법을 **우선순위/트레이드오프/계측 방식** 중심으로 정리합니다. React Router Framework Mode는 **라우트 모듈(Route Module)** 을 중심으로 **자동 코드 스플리팅**, **Lazy Route Discovery(매니페스트 점진 로딩)**, **프리페치**, **SSR/Pre-render/SPA 모드**, **Suspense 기반 스트리밍**, **계측(Instrumentation)** 등을 제공하며, 이 기능들의 조합이 성능의 핵심 레버입니다. citeturn7search2turn4search17turn1search4turn1search19turn0search13

가장 높은 ROI 순서(권장):

1. **계측부터 구축**: Router Instrumentation으로 “전환 지연을 구간별로(매니페스트/모듈/loader/render)” 분해하고, web-vitals로 LCP/INP를 함께 모니터링합니다. 최적화는 “원인 분해” 없이 하면 50% 이상이 낭비로 끝나기 쉽습니다. citeturn0search13turn3search0turn3search8  
2. **Framework Mode 기본 성능 기능을 ‘의도적으로’ 사용**:  
   - 자동 코드 스플리팅을 유지/확인하고(라우트 모듈이 곧 번들 entry), citeturn7search2  
   - Lazy Route Discovery의 배포/캐시 키를 정합하게 잡고(`/__manifest`의 `version`,`paths`), citeturn0search1turn4search17  
   - 링크 프리페치를 **핵심 경로에만** `intent/viewport`로 걸어 “전환 워터폴”을 숨깁니다. citeturn2search4turn2search0  
3. **데이터 파이프라인을 ‘전환 지연’ 관점으로 재설계**: loader가 느리면 전환이 느립니다(Framework Mode 기본 동작). Pending UI, revalidation 제어, clientLoader/캐시/스트리밍으로 “대기 구간”을 쪼개야 합니다. citeturn4search2turn5search14turn1search19turn7search1  
4. **SSR/Pre-render 전략을 선택**: Framework Mode는 CSR/SSR/Static Pre-render를 공식 지원합니다. 초기 로드(LCP/TTFB/하이드레이션)와 운영 비용(서버/캐시)을 함께 고려해 선택합니다. citeturn1search4turn1search0  
5. **Split Route Modules(미래 플래그)로 clientLoader 병렬화**: route module 구성 편의성 때문에 생기는 “clientLoader가 큰 컴포넌트 다운로드를 기다리는 문제”를 줄입니다. 단, “공유 코드”가 있으면 최적화가 해제될 수 있어 구조를 맞춰야 하고, 플래그는 “unstable”이므로 충분한 빌드/프로덕션 테스트가 필요합니다. citeturn7search4turn7search6turn6search2

아래는 “전환 지연”을 **정량적으로** 보는 가장 실용적인 모델입니다.

- **전환 지연(체감)** ≈ `T(매니페스트 패치) + max(T(라우트 모듈 다운로드/실행), T(필수 loader), T(render/commit)) + T(부가: 스크롤/애널리틱스/트랜지션)`  
- 프리페치가 숨길 수 있는 시간 상한: `min(사용자 다음 클릭까지 여유 시간, 위 합산 시간)`  
- 스트리밍(Suspense)이 숨길 수 있는 시간 상한: `비필수 데이터 await로 막혀 있던 시간`

**핵심 원칙**: “초기 진입(Initial Load)” 최적화와 “라우트 전환(Navigation)” 최적화를 분리하고, 각 단계에서 **전송량(바이트)·워터폴(순차 의존)·메인스레드 점유(렌더/JS 실행)** 중 하나를 반드시 줄이도록 설계합니다. citeturn7search2turn1search19turn3search8

**주요 원문 URL(요구사항: raw URL 제공)**

```text
https://reactrouter.com/explanation/code-splitting
https://reactrouter.com/explanation/lazy-route-discovery
https://reactrouter.com/api/components/Link
https://reactrouter.com/api/components/PrefetchPageLinks
https://reactrouter.com/how-to/instrumentation
https://reactrouter.com/start/framework/rendering
https://reactrouter.com/how-to/suspense
https://remix.run/blog/split-route-modules
https://remix.run/blog/faster-lazy-loading
https://github.com/remix-run/react-router/discussions/13463
https://github.com/remix-run/react-router/issues/13193
https://react.dev/blog/2022/03/29/react-v18
https://react.dev/reference/react-dom/server/renderToPipeableStream
https://www.npmjs.com/package/web-vitals
https://googlechrome.github.io/lighthouse-ci/docs/getting-started.html
https://docs.webpagetest.org/running-lighthouse/
```

## Framework Mode 성능 속성별 분석 틀

Framework Mode는 `app/routes.ts`에서 URL 패턴과 라우트 모듈 파일을 연결하고, 라우트 모듈이 **데이터·에러 경계·하이드레이션·코드 스플리팅**의 단위가 됩니다. citeturn7search16turn4search1  
따라서 “속성별 최적화”도 라우트 모듈·매니페스트·로더/액션의 구조를 중심으로 보는 것이 가장 정확합니다.

### 초기 로드(Initial load)

초기 로드는 대체로 아래 4개 합으로 결정됩니다.

- **초기 전달 바이트(brotli/gzip 기준 JS/CSS/HTML)**  
- **JS 파싱/실행(메인 스레드)**  
- **SSR/Pre-render 여부에 따른 TTFB/LCP 변화**  
- **하이드레이션 비용(SSR일 때)**

Framework Mode는 **라우트 모듈 기반 자동 코드 스플리팅**으로 “초기 진입 URL에 필요한 라우트 모듈만” 번들링/로딩하도록 설계되어 있습니다. citeturn7search2  
또한 Lazy Route Discovery는 초기 매니페스트를 최소화하고, 미방문 라우트는 `/__manifest`로 점진 패치합니다. citeturn4search17turn0search1

### 네비게이션 지연(Navigation latency)

Framework Mode에서는 “다음 페이지 렌더” 전에 loader들을 await하는 것이 기본 전제이므로, **느린 loader = 느린 전환**이 됩니다. citeturn4search2  
이에 대한 공식적 대응 수단이 다음 세 가지 축입니다.

- **프리페치(Link/PrefetchPageLinks)**로 네트워크 대기를 사전에 소비 citeturn2search4turn2search0  
- **스트리밍(Suspense)**로 비필수 데이터를 “후순위로 밀어” 초기 UI를 먼저 그림 citeturn1search19  
- **Split Route Modules / 라우트 모듈 분해**로 clientLoader가 큰 컴포넌트를 기다리지 않게 병렬화 citeturn7search4turn7search6

### 번들 크기·코드 스플리팅

Framework Mode에서는 라우트 모듈이 번들 entry가 되어 라우트 단위로 나뉘는 것이 기본입니다. citeturn7search2  
추가로, v7.5의 `route.lazy` Object API는 “라우트 속성별” lazy(예: loader/Component/middleware 분리)를 통해 워터폴을 줄이는 방향으로 진화했습니다(Framework Mode·성능 민감 앱에 유용하다고 릴리즈 노트/블로그가 명시). citeturn0search3turn0search0

다만 **라우트 매칭에 필요한 속성(path/index/children 등)은 lazy 불가**합니다. 라우트 매칭이 먼저여야 lazy 함수를 실행할 수 있기 때문입니다. citeturn5search9turn5search3

### 데이터 페칭·캐싱·메모리

- React Router는 loader/action/revalidation으로 “서버 상태 동기화(캐시 관리)”를 내장하고, 전통적 클라이언트 캐시 라이브러리가 중복이 될 수 있음을 공식 문서에서 설명합니다. citeturn4search0  
- 그러나 Framework Mode에서도 clientLoader를 이용해 **메모리/localStorage 캐시를 직접 구성**할 수 있고, `clientLoader.hydrate`로 초기 하이드레이션 시 캐시 프라이밍 패턴도 제시합니다. citeturn7search1  
- 캐시는 속도를 올리지만 **메모리 사용량과 무효화 복잡도**를 올립니다. “어떤 데이터가 전환의 critical path인가”를 기준으로 캐시 우선순위를 정해야 합니다.

### 리렌더·라우트 레벨 상태·중첩 라우트

- 중첩 라우트는 `<Outlet />`으로 렌더되며, 부모 경로+자식 경로 형태로 URL이 구성됩니다. citeturn5search31turn2search26  
- “라우트 레벨 상태”는 URL(search params), loaderData, fetcher 상태로 모델링하면(특히 서버 상태) 클라이언트 전역 상태/캐시 중복을 줄일 수 있다는 것이 React Router의 권장 방향입니다. citeturn4search0  
- 리렌더 비용은 React 프로파일링으로 보며, Router 측 계측으로 “전환(네비게이션) vs 렌더”를 분리해서 판단하는 것이 실용적입니다. citeturn0search13turn1search7

### 라우트 매칭 비용·대규모 라우트 트리

기본적으로 Data Router는 **전체 라우트 트리를 upfront로 제공**해 동기 매칭을 하고, 그 대가로 초기 번들이 커질 수 있다고 공식 API 문서에 명시되어 있습니다. 아주 큰 앱에서는 라우트 정의 자체가 부담이 될 수 있어 `patchRoutesOnNavigation` 같은 고급 API가 존재합니다. citeturn5search21turn1search20  
Framework Mode에서는 Lazy Route Discovery가 “매니페스트”를 점진화하여 이 문제를 완화하는 축입니다. citeturn4search17

### SSR/SSG/ISR·하이드레이션·HydrateFallback

Framework Mode는 3가지 렌더링 전략을 명시합니다: CSR, SSR, Static Pre-render. citeturn1search4  
또한 v7 업그레이드/플래그 문서에는 **partial hydration(v7_partialHydration)** 과 `HydrateFallback` 전환(fallbackElement deprecate)이 명시되어 있습니다. citeturn2search5turn4search19  
라우트 모듈 문서는 `clientLoader`가 초기 로드에서 완료될 때까지 route component 렌더가 지연될 수 있고, 이를 `HydrateFallback`으로 완화하는 패턴을 제공합니다. citeturn6search9

### 트랜지션(startTransition/View Transitions)·스크롤 복원·애널리틱스

- v7에서는 Router state 업데이트가 기본적으로 `React.startTransition`으로 감싸진다는 점을 React Router가 명시합니다. citeturn1search2  
- View Transitions는 `Link viewTransition` 등으로 `document.startViewTransition()`을 사용해 전환 애니메이션을 지원합니다. citeturn1search6  
- 스크롤 복원은 `<ScrollRestoration getKey>`로 키를 제어할 수 있고, 링크 클릭 시 스크롤 리셋을 막는 `preventScrollReset`도 있습니다. citeturn2search2turn1search1  
- 애널리틱스/에러 로깅은 Instrumentation과 `HydratedRouter onError`를 결합하면 “UI 리렌더에 좌우되지 않는” 1회성 로깅 훅을 구현할 수 있습니다. citeturn0search13turn2search23

## 우선순위 체크리스트

아래 표는 **Framework Mode에서 실제 구현 가능한 기법**을 “속도 중심”으로 정리한 것입니다.  
**복잡도**: S/M/L/XL (구현 변경량+리스크 기준).  
**영향(정량)**은 가능하면 “숨길 수 있는 시간/줄일 수 있는 바이트”로 표현합니다(앱 조건이 미지정이므로 절대값 대신 상한/구조적 효과를 제시).

### 최적화 테이블

| 우선 | 기법 | 주요 속성(요청 항목) | 기대 영향(정량/상한) | 복잡도 | 트레이드오프/리스크 | 1차 측정법 |
|---:|---|---|---|---|---|---|
| P0 | Router Instrumentation + web-vitals + Lighthouse CI로 **baseline** | 전환, 로드, 리렌더, 애널리틱스, 툴링 | “원인 구간” 분해 → 이후 최적화 효율 급상승 | M | 계측 오버헤드(샘플링 필요) | Perf Mark + INP/LCP/RUM citeturn0search13turn3search0turn2search29 |
| P0 | **Link prefetch**를 핵심 링크에 `intent/viewport` 적용 | 전환 지연, 프리페치 | 숨길 수 있는 시간 ≤ `(T모듈+T데이터)` | S | 과다 프리페치=트래픽/메모리↑, CSS 선택자 영향 가능 | 전환 p95 감소, Network waterfall citeturn2search4turn2search0turn2search4 |
| P0 | Lazy Route Discovery 배포 점검(`/__manifest` 캐시 키) | 초기 로드, 매칭/매니페스트, 캐싱 | 초기 매니페스트 바이트 감소, 대규모 라우트에서 특히 유리 | M | CDN 캐시 키 오류 시 잘못된 매니페스트로 전환 실패 | `/__manifest` 요청/캐시 헤더 확인 citeturn0search1turn4search17 |
| P0 | 자동 코드 스플리팅이 “의도대로” 동작하는지 번들 확인 | 초기 로드, 번들 사이즈, 코드 스플리팅 | 초기 JS 바이트를 “현재 URL에 필요한 route module” 수준으로 제한 | M | route module에 큰 공용 import가 있으면 청크 구성이 나빠짐 | 번들 분석(stats) + LCP citeturn7search2 |
| P1 | **PrefetchPageLinks**로 “리스트→디테일” 같은 주요 플로우 사전 로딩 | 전환 지연, 프리페치 | 숨길 수 있는 시간 ≤ `(T모듈+T데이터)`; 링크가 없어도 프리페치 가능 | M | 예측 실패 시 낭비 트래픽 | 전환 p95/p99, 캐시 HIT citeturn2search0turn2search4 |
| P1 | `future.unstable_splitRouteModules`로 clientLoader/Component 병렬화 | 전환 지연, 코드 스플리팅, lazy 로딩 | **clientLoader 시작 지연 감소**(=기존 “컴포넌트 다운로드 대기”만큼) | M~L | unstable 플래그, “공유 코드” 있으면 최적화 해제/빌드 실패(enforce) | 전환 타임라인(계측) citeturn7search4turn7search6 |
| P1 | route module의 **공유 코드를 분리**해 “chunk de-optimization” 제거 | 전환 지연, 번들, 리렌더 | splitRouteModules 효과를 안정화 | M | 파일 수 증가/구조 변경 | splitRouteModules enforce 통과 citeturn7search4turn7search6 |
| P1 | loader를 “필수/비필수”로 분해하고 **Suspense 스트리밍** 적용 | 초기 로드, 전환 지연, Suspense/streaming | LCP/첫 렌더를 막던 await 시간만큼 앞당김 | M | UI 설계 필요, 비필수 데이터는 error 처리/경계 필요 | LCP+전환 마크+waterfall citeturn1search19turn1search3 |
| P1 | revalidation 제어: `unstable_defaultShouldRevalidate={false}`로 “좁게” 끄기 | 데이터 페칭, 전환, 네트워크 | 불필요 loader 재호출 제거(=절감된 요청 시간만큼) | M | stale 위험, 케이스 누락 시 버그 | loader 호출 횟수/시간 감소 citeturn5search14turn5search7turn4search0 |
| P1 | clientLoader 캐시(메모리/localStorage) + 무효화(clientAction) | 데이터 페칭, 캐싱, 메모리 | 재방문/뒤로가기 등에서 server hop 제거 | L | 무효화 설계/메모리 증가/동기화 이슈 | cache HIT ratio, 전환 p95 citeturn7search1turn4search0 |
| P2 | SSR/CSR/Pre-render 전략 재선택(`ssr`, `prerender`) | SSR/SSG/“ISR 유사”, 하이드레이션 | 초기 콘텐츠 표시(SEO/LCP) 개선 가능 | L~XL | 운영 복잡도(캐시/서버 비용), 하이드레이션 이슈 | TTFB/LCP/INP 비교 citeturn1search4turn1search0 |
| P2 | `HydrateFallback`/partial hydration 정리 | 하이드레이션, lazy 로딩 | 초기 하이드레이션 구간 UX 개선, 경고 제거 | M | 설정 누락 시 경고/빈 화면 이슈 가능 | 하이드레이션 경고/전환 계측 citeturn2search5turn6search9turn6search25 |
| P2 | Root `Layout`로 “app shell remount/FOUC” 방지 | 초기 로드, CSS/FOUC | 스타일 재삽입/FOUC 방지 → 체감 안정성 | S~M | root 구조 정리 필요 | Lighthouse layout shift/FOUC 관찰 citeturn4search18 |
| P2 | ScrollRestoration 키 전략 + `preventScrollReset` | 스크롤 복원, 전환 체감 | 불필요 스크롤 점프/연산 감소 | S | 스크롤 컨테이너가 window가 아니면 추가 구현 필요 | UX/스크롤 버그 리포트 감소 citeturn2search2turn1search1turn2search10 |
| P3 | View Transitions(`viewTransition`)는 “체감 속도” 강화용으로 제한 적용 | transitions/view | 실제 시간 단축은 제한적, 체감 개선 가능 | M | 애니메이션 과다 시 오히려 느려 보임 | INP/전환 만족도/trace citeturn1search6turn1search33 |
| P3 | dev startup 최적화(대규모 라우트): `virtual:react-router/server-build` 점검 | dev 성능, 메모리 | dev restart 시간 단축(300+ 라우트에서 중요) | M | 근본적으로 서버는 전체 라우트 지식 필요(제약) | dev server start time citeturn0search2 |

### 영향/노력 매트릭스(요약)

|  | 노력 S/M | 노력 L/XL |
|---|---|---|
| 영향 큼 | Link prefetch(핵심만), PrefetchPageLinks, splitRouteModules(조건 충족 시) citeturn2search4turn2search0turn7search4 | SSR/Pre-render 전환, clientLoader 캐시/무효화 체계 citeturn1search4turn7search1 |
| 영향 중간 | ScrollRestoration/PreventScrollReset, Root Layout(FOUC) citeturn2search2turn4search18 | Lazy Route Discovery “정교 튜닝”(opt-out/대규모 링크) citeturn4search17turn0search22 |

## 핵심 기법 코드 예제 (Framework Mode 중심)

요청된 항목 중 Framework Mode에서 “직접 적용”되는 예제는 route module, config, HydratedRouter 중심으로 제시하고, `route.lazy object API`는 **Framework Mode와 동일한 원리(워터폴 줄이기·속성별 lazy)를 이해하기 위한 보완 예제**로 함께 제공합니다(Framework Mode 자체는 자동 스플리팅이 기본). citeturn7search2turn0search0

### Link prefetch 모드와 discover 제어

React Router의 `<Link>`는 `prefetch` 옵션을 `none/intent/render/viewport`로 제공하며, 이는 모듈+데이터 프리페치 동작을 제어합니다. citeturn2search4  
또한 Lazy Route Discovery에서 라우트 “discover” 동작을 제어할 수 있습니다(링크 렌더 시 매니페스트 탐색을 할지). citeturn0search32turn4search17

**Before**

```tsx
import { Link } from "react-router";

export function Sidebar() {
  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/reports">Reports</Link>
      <Link to="/admin">Admin</Link>
    </nav>
  );
}
```

**After (핵심 경로만 프리페치, 무거운 경로는 보수적으로)**

```tsx
import { Link } from "react-router";

export function Sidebar() {
  return (
    <nav>
      {/* "곧 누를 확률"이 높은 경로: intent */}
      <Link to="/dashboard" prefetch="intent">
        Dashboard
      </Link>

      {/* 모바일/스크롤 기반 탐색: viewport */}
      <Link to="/reports" prefetch="viewport">
        Reports
      </Link>

      {/* 드물고 무거운 경로: prefetch/discover 최소화 */}
      <Link to="/admin" prefetch="none" discover="none">
        Admin
      </Link>
    </nav>
  );
}
```

실무 팁: `prefetch="render"`는 가장 공격적이라 초기 로드 경쟁을 만들기 쉬워, “전환 p95가 확실히 줄어드는 경우에만” 제한적으로 쓰는 편이 안전합니다. citeturn2search4turn2search0

### PrefetchPageLinks로 “리스트→디테일” 즉시 전환 만들기

`<PrefetchPageLinks>`는 특정 page의 모듈/데이터 프리페치 태그를 직접 렌더해 “링크가 없어도” 프리페치를 수행할 수 있습니다. citeturn2search0

**Before (사용자 클릭 후에야 모든 것이 시작)**

```tsx
import { Link } from "react-router";

export function ListItem({ id, title }: { id: string; title: string }) {
  return <Link to={`/items/${id}`}>{title}</Link>;
}
```

**After (hover/포커스/리스트 노출 등 신호를 이용해 선행 프리페치)**

```tsx
import { Link, PrefetchPageLinks } from "react-router";
import { useState } from "react";

export function ListItem({ id, title }: { id: string; title: string }) {
  const [warm, setWarm] = useState(false);
  const page = `/items/${id}`;

  return (
    <div onMouseEnter={() => setWarm(true)} onFocus={() => setWarm(true)}>
      {warm ? <PrefetchPageLinks page={page} /> : null}
      <Link to={page} prefetch="none">
        {title}
      </Link>
    </div>
  );
}
```

포인트: `<Link prefetch>`도 내부적으로 PrefetchPageLinks를 사용하지만, “프리페치 트리거를 커스텀”하려면 PrefetchPageLinks가 더 직접적입니다. citeturn2search0turn2search4

### Split Route Modules로 clientLoader 병렬화 + de-optimization 제거

Split Route Modules는 Framework Mode에서 route module의 exports를 분해해, **clientLoader와 Component를 병렬 다운로드/실행**하도록 만드는 기능입니다(초기에는 `future.unstable_splitRouteModules` 플래그로 opt-in). citeturn7search4turn7search6turn6search2

**react-router.config.ts (opt-in / enforce 옵션 포함)**

```ts
import type { Config } from "@react-router/dev/config";

export default {
  future: {
    // true: 최적화 적용 시도, "분리 불가"여도 빌드는 통과(성능 이득만 못 얻음)
    // "enforce": 분리 불가 시 빌드 실패 → 성능 민감 앱에서 회귀 차단에 유용
    unstable_splitRouteModules: "enforce",
  },
} satisfies Config;
```

분리 불가(=de-optimized) 패턴은 “공유 코드가 같은 파일에 있을 때” 발생할 수 있고, 해결책은 공유 코드를 별도 모듈로 추출하는 것입니다. citeturn7search4turn7search6

**Before (공유 코드가 같은 파일에 있어 분리 불가 가능)**

```tsx
import { MassiveComponent } from "~/components";

const shared = () => console.log("hello");

export async function clientLoader() {
  shared();
  const data = await fetch("/api/items").then((r) => r.json());
  return data;
}

export default function Component({ loaderData }: { loaderData: any }) {
  shared();
  return <MassiveComponent data={loaderData} />;
}
```

**After (공유 코드를 분리해 분해 가능하게)**

```tsx
// shared.ts
export const shared = () => console.log("hello");
```

```tsx
// routes/items.tsx
import { MassiveComponent } from "~/components";
import { shared } from "./shared";

export async function clientLoader() {
  shared();
  const data = await fetch("/api/items").then((r) => r.json());
  return data;
}

export default function Component({ loaderData }: { loaderData: any }) {
  shared();
  return <MassiveComponent data={loaderData} />;
}
```

### HydrateFallback/partial hydration과 clientLoader.hydrate 패턴

v7의 partial hydration은 RouterProvider(데이터 라우터) 하이드레이션 동작이 바뀌는 흐름에서 중요한 개념이고, 문서가 `HydrateFallback` 제공과 `fallbackElement` deprecate를 명시합니다. citeturn2search5turn4search19  
Framework Mode에서 route module은 `HydrateFallback`과 `clientLoader`를 함께 사용해 초기 로드 UX를 개선할 수 있습니다. citeturn6search9turn7search1

**Before (clientLoader 완료까지 화면이 늦게 뜨는 체감)**

```tsx
// routes/game.tsx
export async function clientLoader() {
  const data = await fetch("/api/game").then((r) => r.json());
  return data;
}

export default function Component({ loaderData }: any) {
  return <Game data={loaderData} />;
}
```

**After (HydrateFallback로 초기 skeleton 제공)**

```tsx
// routes/game.tsx
export async function clientLoader() {
  const data = await fetch("/api/game").then((r) => r.json());
  return data;
}

export function HydrateFallback() {
  return <p>Loading game...</p>;
}

export default function Component({ loaderData }: any) {
  return <Game data={loaderData} />;
}
```

또한 clientLoader 캐싱 패턴(메모리/localStorage)과 `clientLoader.hydrate`를 통한 초기 프라이밍은 공식 how-to에 제시되어 있습니다. citeturn7search1  
주의: “HydrateFallback 없이 SSR 후 hydration 시 clientLoader 실행” 구성에서는 **loader와 clientLoader의 초기 반환 데이터가 달라지면 hydration mismatch** 위험이 커지므로, 문서가 “동일 데이터 반환”을 강조합니다. citeturn7search1

### route.lazy Object API (보완 예제: 속성별 lazy로 워터폴 줄이기)

Framework Mode는 자동 코드 스플리팅이 기본이지만, v7.5+의 `route.lazy` Object API는 “속성별로 lazy를 쪼개 워터폴을 줄이는” 방향을 보여주는 중요한 기법입니다. React Router 릴리즈 노트/Remix 블로그는 이를 Framework Mode와 성능 민감 앱에 유용하다고 명시합니다. citeturn0search3turn0search0turn5search6

**Before (단일 lazy → 로더/컴포넌트/미들웨어 등 한 번에 대기)** citeturn0search0

```ts
const routes = [
  {
    path: "/projects",
    lazy: () => import("./projects"),
  },
];
```

**After (속성별 lazy → 필요만 먼저/병렬화 가능)** citeturn0search0

```ts
const routes = [
  {
    path: "/projects",
    lazy: {
      loader: async () => (await import("./projects/loader")).loader,
      Component: async () => (await import("./projects/component")).Component,
      // middleware까지 lazy하려면 object API가 필요하다는 언급이 있습니다.
      // middleware: async () => (await import("./projects/mw")).middleware,
    },
  },
];
```

중요 제약: 라우트 매칭 속성(path/index/children 등)은 lazy로 정의할 수 없습니다. (매칭이 먼저여야 lazy를 실행 가능) citeturn5search9turn5search3

### Instrumentation(Framework Mode)로 전환을 “구간별 로그”로 만들기

Instrumentation은 라우트 핸들러 코드를 수정하지 않고도 로깅/성능 트레이싱을 주입할 수 있다고 설명합니다. citeturn0search13  
Framework Router(`HydratedRouter`)는 전역 에러 훅 `onError`를 제공하여 ErrorBoundary 리렌더에 영향받지 않는 “에러당 1회” 로깅을 할 수 있습니다. citeturn2search23

**예시: 클라이언트에서 Performance API 마킹 + 에러 로깅**

```tsx
import { HydratedRouter } from "react-router";

const perfInstrumentation = {
  router({ instrument }: any) {
    instrument({
      navigate: (fn: any, { to, currentUrl }: any) =>
        measure(`nav:${currentUrl}->${to}`, fn),
      fetch: (fn: any, { href }: any) => measure(`fetch:${href}`, fn),
    });
  },
  route({ instrument, id }: any) {
    instrument({
      loader: (fn: any) => measure(`loader:${id}`, fn),
      action: (fn: any) => measure(`action:${id}`, fn),
    });
  },
};

async function measure(label: string, cb: () => Promise<any>) {
  performance.mark(`start:${label}`);
  await cb();
  performance.mark(`end:${label}`);
  performance.measure(label, `start:${label}`, `end:${label}`);
}

export default function ClientEntry() {
  return (
    <HydratedRouter
      unstable_instrumentations={[perfInstrumentation]}
      onError={(error) => {
        // 예: Sentry/OTel 전송 (동기 블로킹 금지)
        console.error("router error", error);
      }}
    />
  );
}
```

Instrumentation 문서의 핵심 의도는 “프로덕션 관측 가능성(성능/에러)을 라우트 코드 수정 없이 확보”하는 데 있습니다. citeturn0search13

## 측정 도구·방법·샘플 테스트 플랜

### 무엇을 측정할지: Lab + Field의 분업

- **Field(RUM)**: 실제 유저의 **LCP/INP/CLS** 같은 Core Web Vitals를 수집합니다. web.dev는 CWV 기준치(예: LCP 2.5s, INP 200ms)를 제시합니다. citeturn3search8  
- **Lab**: Lighthouse(진단), WebPageTest(워터폴/멀티스텝, Lighthouse 실행 포함)를 사용해 변경 전후 비교를 반복합니다. Lighthouse CI는 반복 실행·저장·assert를 쉽게 하는 도구 모음입니다. citeturn2search3turn2search11  
- **Router 내부 관측**: Instrumentation으로 **“전환 지연의 내부 구성요소(매니페스트/로더/렌더)”**를 분리해, “네트워크가 느린 건지 / 라우트 모듈이 큰 건지 / 리렌더가 큰 건지”를 결정합니다. citeturn0search13turn4search17

### Lighthouse CI 세팅(명령/설정)

Lighthouse CI Getting Started는 레포에 CI로 Lighthouse를 붙이는 워크플로를 제시합니다. citeturn2search29  
assert 구성은 audit ID 기반으로 가능하다고 설명합니다. citeturn2search7

**명령 예시**

```bash
npm i -D @lhci/cli
npx lhci autorun
```

**lighthouserc 예시(핵심 예산/회귀 차단)**

```js
module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:5173/",
        "http://localhost:5173/dashboard",
        "http://localhost:5173/items/1",
      ],
      numberOfRuns: 5,
      startServerCommand: "npm run start",
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.85 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
      },
    },
  },
};
```

### WebPageTest: 워터폴/멀티스텝 + Lighthouse

WebPageTest 문서는 Lighthouse를 WebPageTest에서 실행할 수 있다고 설명합니다. citeturn2search11  
멀티스텝은 “스크립팅”으로 구현하며, 커뮤니티/문서 스펙은 “탭 구분”을 강조합니다(공식 문서 소스 레포도 존재). citeturn8search1turn8search14  
또한 Catchpoint가 제공하는 WebPageTest API 레시피 레포는 멀티스텝/스크립팅/워터폴 등 자동화 예제를 제공합니다. citeturn8search5

**멀티스텝 스크립트 예시(전환 시나리오)**

```text
logData    1
navigate   https://your-app.example/

logData    0
execAndWait    document.querySelector('a[href="/items/1"]').click()

logData    1
execAndWait    document.querySelector('a[href="/dashboard"]').click()
```

(주의: 스크립트는 탭 구분이 필수라는 점이 반복 언급됩니다.) citeturn8search1turn8search2

### web-vitals로 RUM 수집

web-vitals 패키지는 INP/LCP/CLS 등의 리포팅 조건(예: INP는 상호작용이 없으면 보고되지 않음)을 명시합니다. citeturn3search0

**예시(최소 구성)**

```ts
import { onLCP, onINP, onCLS } from "web-vitals";

function sendToAnalytics(metric: any) {
  // beacon/비동기 전송 권장
  navigator.sendBeacon("/vitals", JSON.stringify(metric));
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

### 샘플 테스트 플랜(“회귀 방지” 중심)

1) **대표 사용자 여정 정의(3~5개)**  
- Cold start: `/`  
- 핵심 전환: 리스트→디테일(`/items/:id`), 탭/필터 변경(쿼리스트링), 로그인 후 대시보드 등  
- Back/Forward: 스크롤 복원 포함

2) **Baseline 수집(배포 전 최소 1~3일)**  
- RUM: INP/LCP 75p  
- Router: `nav:*`, `loader:*` p95/p99

3) **변경은 1회 1개 레버만**  
예: `Link prefetch="intent"`를 “상위 5개 링크”에만 먼저 적용 → 전환 p95가 줄어드는지 확인. citeturn2search4

4) **Lab 반복(신뢰도 확보)**  
- LHCI: 동일 URL 5회 실행, median/optimistic 설정  
- WebPageTest: 동일 지역/디바이스/네트워크로 멀티스텝 3~9회

5) **회귀 게이트**  
- LHCI assert로 performance score, LCP 상한, total JS/unused JS 등을 gate  
- Router instrumentation p95 상한(예: `nav:*` 400ms)도 별도 체크(커스텀)

## Framework Mode에서 자주 터지는 함정과 디버깅 팁

### `/__manifest` 캐싱 키 누락과 캐시 헤더 문제

Lazy Route Discovery 배포 시 CDN 캐시 키에 `version`과 `paths` 쿼리 파라미터를 포함하라고 문서가 명시합니다. citeturn0search1turn4search17  
실제로 `/__manifest` 응답의 Cache-Control이 강하게 설정되어 CDNs(예: entity["company","Amazon CloudFront","cdn service"])가 장기간 캐시할 수 있다는 버그 리포트가 있습니다. citeturn0search11

**디버깅 체크리스트**
- `/__manifest?version=...&paths=...` 요청이 **정상적으로 origin까지 가는지**  
- CDN 캐시 키가 query를 포함하는지  
- 헤더가 `immutable`로 과하게 설정되어 업데이트가 막히지 않는지

### Lazy Route Discovery가 “링크가 너무 많은 페이지”에서 오버헤드가 되는 케이스

수천 개 링크를 렌더하는 페이지에서 fog-of-war(라우트 discover) 오버헤드가 불필요할 수 있고, 이를 비활성화/제어하고 싶다는 이슈가 존재합니다. citeturn0search22  
이 경우는 **`discover="none"`** 혹은 prefetch 전략을 보수적으로 바꾸는 쪽이 실전 대응입니다. citeturn0search32turn2search4

### dev startup: `virtual:react-router/server-build`가 모든 라우트를 eager import

Framework Mode + Vite에서 dev 서버 재시작 시 `virtual:react-router/server-build`가 라우트를 모두 import해 느려진다는 Discussion이 보고되었습니다(300+ 라우트). citeturn0search2  
이는 런타임 성능이 아니라 **개발 생산성** 병목이지만, 대형 앱에서는 “route module의 top-level import 무게”가 dev startup에도 그대로 반영됩니다.

**완화 방향**
- route module에서 **큰 UI 컴포넌트/차트**를 top-level에서 당기지 말고, 실제 사용 지점에서 분리(가능하면 splitRouteModules와 호환되게) citeturn7search4turn7search6  
- “route module 공유 코드 분리”로 prod 성능뿐 아니라 dev에서도 모듈 그래프를 단순화

### Split Route Modules가 적용되지 않는 “chunk de-optimization”

Split Route Modules는 공유 코드가 같은 파일에 있으면 분리가 불가능해지고, 이를 피하려면 공유 코드를 별도 모듈로 추출하라고 명시합니다. 또한 `"enforce"` 옵션은 분리 불가 시 빌드를 실패시켜 회귀를 막을 수 있습니다. citeturn7search4turn7search6

### HydrateFallback 누락/경고와 초기 로드 빈 화면

HydrateFallback 관련 경고/이슈(“No HydrateFallback element provided”) 리포트가 있으며, v7_partialHydration/route module 구성에서 누락되기 쉬운 포인트입니다. citeturn6search25turn2search5

### ScrollRestoration이 “window 스크롤” 가정

`<ScrollRestoration>`은 window 기반 스크롤 복원에 가까운 동작을 하며, 스크롤 컨테이너가 window가 아닌 앱(예: grid 레이아웃의 특정 pane만 스크롤)에서는 기대대로 동작하지 않는다는 Discussion이 오래 전부터 존재합니다. citeturn2search10turn2search2  
이 경우는 “컨테이너 스크롤 복원”을 별도 구현하거나 getKey 전략을 보강해야 합니다.

### startTransition 기본 동작과 Suspense/Promise 사용 규칙

React Router는 v7에서 router state 업데이트가 기본적으로 `React.startTransition`으로 감싸진다고 설명하며, 일부 패턴(컴포넌트 내부에서 React.lazy/Promise 생성)은 호환 문제가 될 수 있음을 업그레이드 문서에서 경고합니다. citeturn1search2turn4search19

## 추천 라이브러리·설정 스니펫(Vite/webpack/SSR/edge)

### react-router.config.ts (Framework Mode 핵심 설정)

`react-router.config.ts`는 SSR, 디렉토리, 빌드 설정을 제어할 수 있는 프레임워크 설정 파일로 문서화되어 있습니다. citeturn1search27  
렌더링 전략은 Framework Mode Rendering 문서에서 `ssr: true|false`, `prerender` 예제를 제시합니다. citeturn1search4

```ts
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true, // 또는 false (SPA)
  prerender: ["/", "/about", "/pricing"],

  // Lazy Route Discovery 커스터마이즈
  routeDiscovery: {
    mode: "lazy",
    manifestPath: "/__manifest",
  },

  future: {
    unstable_splitRouteModules: "enforce",
  },
} satisfies Config;
```

Lazy Route Discovery는 기본적으로 “초기 필요 라우트만 매니페스트에 포함하고, 나머지는 `/__manifest`로 패치”한다는 프로세스를 문서가 상세히 설명합니다. citeturn4search17

### Vite 설정(Framework Mode + 분석 + 수동 청크 힌트)

React Router는 Vite 플러그인을 통해 framework bundling을 제공합니다(업그레이드 가이드에서 플러그인 추가 단계를 안내). citeturn6search6  
Vite는 청크 전략을 `manualChunks`로 조정 가능하지만, 2026 기준 Vite 문서에서 `build.rollupOptions`가 `build.rolldownOptions`의 alias(Deprecated)로 안내되는 점을 주의해야 합니다. citeturn3search10  
또한 manualChunks는 잘못 쓰면 로딩 순서 문제를 만들 수 있어(Vite 이슈 사례) “분석 후 최소 개입”이 안전합니다. citeturn3search37turn3search22

```ts
import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    reactRouter(),
    visualizer({ filename: "stats.html", emitFile: true }),
  ],
  build: {
    // Vite 최신 문서 기준: rollupOptions는 deprecated alias일 수 있음
    // 실제 환경에서는 build.rolldownOptions 사용 여부를 버전별 확인 권장
    rollupOptions: {
      output: {
        // "힌트" 수준으로만: vendor를 크게 쪼개면 LCP/INP가 나빠질 수 있음
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
```

**manualChunks 운영 원칙(권장)**  
- stats(visualizer)로 “가장 큰 청크/중복 의존성”을 확인한 뒤, 딱 필요한 1~2개 그룹만 분리  
- “React/Router 런타임”보다 먼저 로드되는 청크가 생기지 않도록 로드 순서 점검(Vite 이슈에서 유사 문제가 보고됨) citeturn3search37

### webpack 설정(특정 환경/레거시/라이브러리 모드 병행 시)

webpack의 SplitChunksPlugin은 캐싱/병렬 로딩을 위해 코드를 청크로 분리한다고 공식 문서가 설명합니다. citeturn3search7turn3search3  
한국어 문서(webpack.kr)도 cacheGroups/name 등의 옵션을 설명합니다. citeturn3search11

```js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: "all",
      // cacheGroups로 vendor를 세분화해 캐시 효율을 높일 수 있음
    },
  },
};
```

### Node SSR/Edge: 스트리밍·캐시·매니페스트 캐싱

React 18은 `startTransition`과 Suspense 지원 **스트리밍 SSR**을 주요 기능으로 소개합니다. citeturn1search3  
Node 환경에서는 `renderToPipeableStream`이 스트리밍 SSR API로 문서화되어 있고, Web Streams 환경(Edge 등)은 `renderToReadableStream`을 권장합니다. citeturn1search7turn1search34

Framework Mode에서 “Streaming with Suspense”는 loader/action에서 Promise를 반환해 UI를 unblock 한다고 설명합니다. citeturn1search19

서버 캐싱은 크게 두 층으로 나뉩니다.

- **라우트 데이터 캐싱**: `Cache-Control`을 loader에서 활용할 수 있지만, 문서에서는 보통 백엔드/서버 캐시가 더 이득일 수 있다고 경고합니다. citeturn7search7  
- **매니페스트 캐싱**: Lazy Route Discovery의 `/__manifest`는 **cache key**를 정확히 잡아야 하며, `version`/`paths` 포함이 문서에 명시됩니다. citeturn0search1turn4search17

### 구현 타임라인(mermaid)

```mermaid
flowchart TD
  A[Baseline 계측 구축<br/>Router Instrumentation + web-vitals + LHCI]

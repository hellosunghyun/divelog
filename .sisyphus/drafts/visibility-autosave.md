# Draft: Visibility 4단계 + 자동 저장 기능

## Requirements (confirmed)
- **자동 저장 제약 해제**: AGENTS.md의 "자동 저장" 금지 항목 제거하고 구현
- **Visibility 4단계**: 임시(작성 중) → 나만 보기(완성, 비공개) → 코호트(Academy 내부) → 전체공개
- **기존 Draft → 임시 매핑**: 기존 DB의 "draft" 값은 "임시"로 매핑
- **주기적 저장 + 복원**: 글이 자동으로 저장되고 불러올 수 있어야 함

## Research Findings (탐색 에이전트 결과)

### ⚠️ 핵심 발견: 자동 저장 시스템이 이미 존재함!
AGENTS.md에는 "자동 저장" 금지로 되어있지만, 코드베이스에 이미 구현되어 있음:
- `app/hooks/useAutosave.ts` — 클라이언트 debounce 3000ms 후 서버 전송
- `app/routes/api/autosave.tsx` — POST /api/autosave 엔드포인트
- `app/db/queries/records/drafts.server.ts` — drafts 테이블 CRUD
- `app/lib/infra/draft-storage.ts` — localStorage 30일 TTL
- `app/components/content/DraftRecoveryPrompt.tsx` — 복원 UI 컴포넌트

### 현재 Visibility 시스템
- **스키마**: `text("visibility")` — "draft" | "cohort" | "public"
- **기본값**: "cohort"
- **Zod 검증**: 6개 스키마에서 enum 정의
- **접근 제어**: draft는 작성자만 조회 가능, cohort는 인증된 사용자, public은 모두

### 변경 필요 위치 (예상)
1. `app/db/schema.server.ts` — 4개 테이블의 visibility 필드
2. `app/lib/auth/validation.ts` — 6개 Zod 스키마
3. `app/routes/public/write/note.tsx` — 폼 셀렉터
4. `app/routes/public/write/article.tsx` — 폼 셀렉터
5. `app/routes/public/logs/$recordSlug.edit.tsx` — 편집 폼 셀렉터
6. `app/routes/public/logs/$recordSlug.tsx` — 표시 로직 + 접근 제어
7. `app/db/queries/records/records.server.ts` — 쿼리 WHERE 절
8. `app/routes/admin/records/index.tsx` — 어드민 필터
9. `app/routes/api/autosave.tsx` — 자동 저장 visibility 하드코딩
10. D1 마이그레이션 — 기존 데이터 변환

## Technical Decisions

### Visibility 4단계 (confirmed)
| UI 라벨 | DB 값 | 접근 규칙 |
|---------|--------|-----------|
| 임시 | `temp` | 작성자만 (자동 저장/작성 중 상태) |
| 나만 보기 | `private` | 작성자만, 완전 비공개 (URL 알아도 404) |
| 코호트 | `cohort` | 같은 코호트 인증 사용자 |
| 전체공개 | `public` | 모든 사용자 |

### DB Enum 전략: 전체 리네이밍
- `draft` → `temp` (마이그레이션 필요)
- `private` 새로 추가
- `cohort`, `public` 유지
- 기존 "draft" 데이터 전부 → "temp"로 변환

### Response Visibility: 3단계 확장
- 기존: `cohort` | `public`
- 변경: `private` | `cohort` | `public`

### "나만 보기" 접근 규칙
- 완전 비공개: 작성자 본인만 볼 수 있음
- 직접 링크(URL)를 알아도 다른 사용자는 404
- 목록/검색에 표시 안 됨
- /me 대시보드에서만 확인 가능

### 자동 저장 개선 (confirmed)
1. **다중 임시저장**: format당 1개 제한 해제 → 여러 글 동시 작성 가능 (drafts 테이블 unique 제약 변경)
2. **저장 상태 UI**: "저장 중...", "저장됨", "마지막 저장: N분 전" 표시
3. **전용 관리 페이지**: 임시저장 목록 전용 페이지 신설 (이어쓰기, 삭제 등)
4. **저장 주기 조절**: 사용자 설정에서 debounce 간격 조절 가능

### AGENTS.md 변경
- "자동 저장" 금지 항목 제거
- visibility 3단계 → 4단계 업데이트

## Open Questions
- 테스트 전략: 프로젝트에 테스트 인프라가 있는가?
- 전용 페이지 URL: /drafts? /me/drafts?

## Scope Boundaries
- INCLUDE: visibility 4단계, DB 마이그레이션(enum 리네이밍), 자동 저장 개선 4건, Response visibility 3단계, AGENTS.md 업데이트, 어드민 필터 업데이트
- EXCLUDE: (TBD)

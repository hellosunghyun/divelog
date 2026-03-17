# Task 38+39: Admin Stages + Challenges 관리 UI

## 상태: 완료

## 검증 결과

### TypeScript 검증
```bash
$ npx tsc --noEmit
# 0 errors
```

### LSP Diagnostics
- `app/routes/admin/stages/index.tsx` - No diagnostics
- `app/routes/admin/stages/$stageId.tsx` - No diagnostics
- `app/routes/admin/challenges/index.tsx` - No diagnostics
- `app/routes/admin/challenges/$challengeId.tsx` - No diagnostics

## 구현 내용

### /admin/stages (목록)
**파일**: `app/routes/admin/stages/index.tsx`

기능:
- Stage 목록 테이블 표시
- 컬럼: 순서, 이름, 유형, 상태, 시작일, 종료일, 현재, 작업
- 빈 상태 처리 (EmptyState 컴포넌트)
- 정렬: order ASC

UI 패턴:
- Table, TableHeader, TableBody, TableRow, TableCell, TableHead 컴포넌트 사용
- hover 스타일 적용
- 편집 링크로 상세 페이지 이동

### /admin/stages/:stageId (상세/편집)
**파일**: `app/routes/admin/stages/$stageId.tsx`

기능:
- Stage 정보 로드 및 표시
- 폼 필드: 이름, 설명, 상태, 현재 Stage 여부
- 저장 시 DB 업데이트 후 목록으로 리다이렉트
- 404 처리 (Stage 없음)

UI 패턴:
- Input, Textarea, Select, Checkbox 컴포넌트 사용
- Label 컴포넌트로 필드 라벨링
- 저장/취소 버튼

### /admin/challenges (목록)
**파일**: `app/routes/admin/challenges/index.tsx`

기능:
- 챌린지 목록 테이블 표시
- 컬럼: 이름, 상태, 코호트, 작업
- 빈 상태 처리
- 정렬: name ASC
- 상태 Badge 표시

UI 패턴:
- Table 컴포넌트 사용
- Badge로 상태 표시
- 편집 링크

### /admin/challenges/:challengeId (상세/편집)
**파일**: `app/routes/admin/challenges/$challengeId.tsx`

기능:
- 챌린지 정보 로드 및 표시
- 폼 필드: 이름, 문제 정의, 현재 질문, 상태
- 저장 시 DB 업데이트 후 목록으로 리다이렉트
- 404 처리

UI 패턴:
- Input, Textarea, Select 컴포넌트 사용
- Label 컴포넌트로 필드 라벨링
- 저장/취소 버튼

## 디자인 원칙 준수

### Admin 디자인 가이드라인 적용
- ✅ utilitarian 스타일 (감성적 요소 배제)
- ✅ dense 레이아웃 (compact 테이블)
- ✅ neutral 톤 (admin-* 색상 변수 사용)
- ✅ Double-Bezl 없음
- ✅ spring physics, staggered entry 없음

### 공통 패턴 사용
- ✅ `admin-*` CSS 변수 사용
- ✅ Table UI 컴포넌트 사용
- ✅ shadcn/ui 컴포넌트 (Button, Input, Label, Select, Textarea, Checkbox)
- ✅ 빈 상태: EmptyState 컴포넌트

## 코드 품질
- ✅ `as any` 미사용
- ✅ `@ts-ignore` 미사용
- ✅ 타입 안전 (Route 타입 사용)
- ✅ 에러 처리 (404, data throw)
- ✅ 로깅 (createLogger 사용)

## 참고
- 외부 인증 시스템(ada-kr-pos.com)으로 인해 스크린샷 촬영 불가
- 구현은 완료되었으며 TypeScript 및 LSP 검증 통과

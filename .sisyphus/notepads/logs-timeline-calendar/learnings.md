# Logs Timeline Calendar — Learnings

## Task 7: ViewToggle 3-way 확장 (캘린더 추가)

### Completed
- ✓ RecordView 타입 확장: `"grid" | "timeline"` → `"grid" | "timeline" | "calendar"`
- ✓ CalendarIcon SVG 정의 (stroke 기반, 달력 형태)
- ✓ OPTIONS 배열에 캘린더 보기 버튼 추가
- ✓ 기존 grid/timeline 버튼 동작 보존
- ✓ pnpm typecheck 신규 에러 없음
- ✓ 커밋: `feat(ui): ViewToggle 3-way 확장 (캘린더 추가)`

### Key Insights
1. **SVG 아이콘 스타일 일관성**: 기존 GridIcon, TimelineIcon과 동일한 viewBox, strokeWidth, className 사용
2. **CalendarIcon 구조**:
   - `<rect>` (테두리): x="3" y="4" width="18" height="18" rx="2"
   - `<path>` (구분선): M3 10h18 (월/일 구분), M8 1v6M16 1v6 (요일 표시)
   - `<rect>` (날짜 셀): 3개 행, fill="currentColor"로 강조
3. **타입 안전성**: RecordView 타입 확장 후 모든 참조 자동 업데이트 (TypeScript strict mode)
4. **한국어 라벨**: "캘린더 보기" (기존 "그리드 보기", "타임라인 보기"와 일관)

### Next Steps
- Task 8: 캘린더 뷰 컴포넌트 구현 (CalendarView.tsx)
- Task 9: 캘린더 뷰 로직 (월별 기록 그룹화, 날짜 셀 렌더링)

## Task 8: 기간순 정렬 옵션 + 로더 확장

### Completed
- ✓ `recordFilterSchema`에 `sort: "recent" | "oldest" | "stage"` 추가
- ✓ `getRecords()`가 `sort=stage`에서 `stages.order ASC, records.createdAt DESC` 정렬 지원
- ✓ `/logs` 로더가 `view=timeline|calendar`에서 200건 전체 로드 + 페이지네이션 비활성화
- ✓ `/logs` 로더가 `month=YYYY-MM`를 정규화하고 `view=calendar`에서 해당 월 범위만 조회
- ✓ SortBar 옵션에 `기간순` 추가

### Key Insights
1. **중간 단계 통합 전략**: `view=calendar` 전용 컴포넌트가 아직 없어서, 로더는 달력용 데이터 범위를 미리 지원하고 화면은 비그리드 경로로 유지해 다음 통합 작업(T11)과 충돌을 줄였다.
2. **월 파라미터 정규화**: 잘못된 `month` 값은 현재 월(`YYYY-MM`)로 폴백하고, 서버에서 월 시작/다음 달 시작 epoch를 계산해 범위 필터를 적용했다.
3. **검증 포인트 분리**: 변경 파일은 LSP diagnostics clean, 전체 `pnpm typecheck` 실패는 기존 admin/dialogue/test 영역의 선행 에러로 확인했다.

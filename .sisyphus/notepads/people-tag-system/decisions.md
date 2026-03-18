# Decisions — people-tag-system

## [2026-03-18] Session Start

### Architecture Decisions
- 언급 전략: 명시 UI 우선, regex 보조 유지, 중복 제거 적용
- 참여자 권한: 작성자만 추가 가능, 역할은 표시 전용(display-only)
- SceneCard N+1: 배치 JOIN 로딩 + 3명 초과 시 "+N명" 트렁케이션
- 알림 중복: 동일 (recipientId, recordId) 기준 1건만 발송
- 글쓰기 폼 복잡도: 접을 수 있는(collapsible) 부가 섹션으로 배치
- `syncAllMentionsForRecord` 하나의 통합 함수로 explicit + regex 병합 (Set), 1회 delete+insert

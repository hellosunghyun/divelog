# Decisions — dialogue-reply-threading

## 2026-03-18 아키텍처 결정

- adjacency list 패턴 (parentResponseId nullable)
- flat 쿼리 + 클라이언트 트리 빌딩 (recursive CTE 사용 안 함)
- 시각적 인덴트 3단계 cap (4단계부터 flatten)
- 삭제 시 tombstone 패턴 (자식 있으면 [삭제된 응답])
- self_answer 타입은 답글에서 제외
- 답글 시 부모 응답 작성자에게 알림 (record 작성자와 같으면 1회만)

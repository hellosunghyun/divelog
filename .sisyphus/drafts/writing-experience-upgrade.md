# Draft: 글쓰기 경험 업그레이드 + 서비스 풍부화

## 사용자 요구사항 (확인됨)

### 에디터 방향: 듀얼 모드
- **짧은 글**: 빠르고 간단하게 입력 (twitter-like quick entry)
- **긴 글**: Notion 스타일 블록 에디터 (이미지, 코드블록 등)
- 컨텍스트에 따라 자동 전환 또는 사용자 선택

### 풍부함의 방향: 전방위 (5가지 모두 선택)
1. **콘텐츠 표현력** — 이미지, 코드, 수식, 임베드 등 다양한 블록
2. **인터랙션 깊이** — Dialogue Layer 강화, 하이라이트 문장, 협업 유닛
3. **탐색과 발견** — 검색, 추천, 연결된 기록, 태그 기반 브라우징
4. **개인 여정 시각화** — 내 기록의 여정, 성장 타임라인, 기록 통계
5. **실시간/소셜** — 실시간 알림, 활동 피드, 동료 활동 인지

## 현재 상태 (리서치 결과)

### 에디터 현황
- **입력**: 순수 textarea (16 rows), 메타데이터 필드들 (type, format, rhythm, visibility 등)
- **저장**: plain text (content 필드, max 50000 chars)
- **렌더링**: `whitespace-pre-wrap`으로 그대로 출력 — 마크다운 처리 없음
- **마크다운 프리뷰**: 설계 문서에는 있으나 미구현
- **드래프트 자동저장**: 미구현
- **템플릿 콘텐츠 주입**: 선택 UI는 있으나 실제 주입 안 됨
- **에디터 라이브러리**: package.json에 없음

### 기존 제약 (AGENTS.md)
- ❌ Rich text 에디터 (textarea + markdown preview만)
- ❌ 이미지 업로드 (Phase 1)
- → **사용자가 이 제약을 넘어서는 방향을 원함** (확인됨)

### 스키마 관련
- `records.content`: text 필드, 50000자 제한
- `records.format`: "note" | "article" — 이미 짧은 글/긴 글 구분 존재
- R2 바인딩은 wrangler.toml에 설정되어 있음 (Phase 2용이었으나 활용 가능)

## 리서치 대기 중
- [x] 서비스 기능 현황 인벤토리 (bg_289331a3) ✅
- [ ] 에디터 솔루션 비교 (bg_a45e8b2d)

## 서비스 현황 요약

### 구현 완료 (높은 완성도)
- Home (487줄, hero+journey+questions+records+sentences+learners)
- Journey + Stage detail
- Records CRUD + 상세 페이지 (Dialogue Layer 포함)
- Dialogue Layer 완전 구현 (질문, 응답 5종, 하이라이트 문장, 연결된 기록)
- Challenges + Collaboration Units
- Learner 프로필 상세
- Collective Memory
- Search, Inbox, My Space, Settings, Guide
- Admin 22개 라우트 전체

### 부분 구현 / 갭
- **Self-Answer 생성 UI 없음** — 스키마/타입은 있으나 Learner가 자기 질문에 답하는 UI 없음
- **Learners 목록 스텁** — 35줄, 필터링/정렬/리치 카드 없음
- **에디터 순수 textarea** — 마크다운 처리 없음, 프리뷰 없음

### 서비스 풍부화 기회 (리서치 기반)
1. Self-Answer 생성 UI (FR-010 갭)
2. Learners 목록 강화 (필터, 정렬, 리치 카드)
3. Stage 상세 풍부화 (진행 메트릭, 핵심 질문, 추천 기록)
4. 개인 여정 타임라인 시각화
5. 문장 컬렉션/테마별 그룹화
6. 유사 질문/연결된 Learner 발견
7. 응답에 대한 응답 (현재 flat)

## Open Questions
- 이미지 업로드: R2를 지금 활성화할 것인가?
- 코드블록 syntax highlighting: 어떤 언어들을 지원할 것인가?
- 기존 format 필드("note"/"article")와 듀얼 모드의 관계?
- 서비스 풍부화 우선순위: 5가지 방향 중 어디서부터?
- 실시간/소셜: 기존 "Reflection over Stimulation" 철학과의 균형?

## 에디터 솔루션 리서치 결과

### 비교 요약
| 에디터 | Edge 호환 | 블록 편집 | Slash 명령 | 번들 | 커뮤니티 |
|--------|-----------|-----------|------------|------|----------|
| **Tiptap** | ✅✅✅ | ⭐⭐⭐⭐⭐ | 확장 | ~56KB | 1.2M/주 |
| Novel | ✅✅ | ⭐⭐⭐⭐ | 내장 | Tiptap기반 | 3K/주, **정체** |
| BlockNote | ❌ | ⭐⭐⭐⭐⭐ | 내장 | - | 9K stars |
| Plate | ✅✅ | ⭐⭐⭐ | 플러그인 | ~45KB | 550K/주 |
| Milkdown | ✅✅✅ | ⭐⭐ | 플러그인 | 경량 | 소규모 |

### 핵심 발견
- **BlockNote**: Notion-like 최고지만 JSDOM 필요 → Cloudflare Workers 불가
- **Novel**: 좋으나 2025.02 이후 릴리즈 없음, AI SDK 의존성
- **Tiptap 추천**: Edge 완전 호환, 확장성 최고, 커뮤니티 최대
- **Milkdown**: 마크다운 네이티브지만 블록 편집 약함

### 듀얼 모드 UX 패턴 (Notion/Linear/Arc 참고)
- Notion: 같은 에디터에서 `/` 명령으로 점진적 복잡성
- Linear: 키보드 중심 + 컨텍스트 인식 제안
- Arc: 분할 인터페이스 (빠른 메모 + 메인 에디터)

## 기술적 결정 (확정)
- **에디터**: Tiptap 듀얼 모드 — Note=간결 입력, Article=블록 에디터
- **저장 포맷**: JSON 블록 구조 (Tiptap/ProseMirror JSON)
- **이미지**: R2 업로드 포함 (드래그&드롭 + 클립보드)
- **듀얼 모드**: format 필드("note"/"article")와 연동
- **실시간/소셜**: 여정 활동 피드 (조용한 흐름, SNS형 아님)

## 풍부화 범위 (확정 — 전부 포함)
1. ✅ 콘텐츠 표현력 — 에디터 업그레이드로 해결
2. ✅ 인터랙션 깊이 — Self-Answer UI, 응답에 대한 응답, 문장 컬렉션
3. ✅ 탐색과 발견 — 연결된 기록, 태그, 검색 개선, 유사 질문
4. ✅ 개인 여정 시각화 — 타임라인, Stage별 기록 분포, 성장 시각화
5. ✅ 여정 활동 피드 — 조용한 흐름형 피드

## 최종 결정 (확정)
- **마이그레이션**: 일괄 마이그레이션 (plain text → JSON paragraph 블록)
- **테스트**: Vitest 세팅 + 핵심 로직 테스트 + QA 시나리오
- **우선순위**: 전부 동시에 (대규모 단일 계획)

## 작업 범위 정리
1. Tiptap 듀얼 모드 에디터 (Note=간결, Article=블록)
2. R2 이미지 업로드 (드래그&드롭, 클립보드)
3. JSON 블록 저장 + 콘텐츠 렌더러
4. 기존 데이터 일괄 마이그레이션
5. Self-Answer 생성 UI
6. 연결된 기록 탐색 / 태그 / 검색 개선 / 유사 질문
7. 개인 여정 타임라인 / Stage별 분포 / 성장 시각화
8. 여정 활동 피드 (조용한 흐름)
9. Vitest 테스트 인프라
10. Learners 목록 강화

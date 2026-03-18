# Learner Profile Information Enrichment Plan

## TL;DR

> **Quick Summary**: `/learners/:learnerSlug`를 사람 소개와 글 탐색이 균형 잡히는 프로필로 보강하되, 여전히 `질문과 변화의 흐름`이 먼저 읽히도록 유지한다.
>
> **Deliverables**:
> - ada-kr-pos 자기소개 기반 소개/역할/관심사 태그 블록
> - 현재 Stage, 최근 활동, 읽기 시작 가이드, 자기답변까지 포함한 프로필 정보 구조
> - Vitest/Playwright 기반 TDD 검증 세트
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 -> Task 5 -> Task 6 -> Task 10 -> Task 11

---

## TODOs

- [x] 1. Profile enrichment contract + test fixtures
- [x] 2. Derived interest tags query + tests
- [x] 3. Self-answer summary query + tests
- [x] 4. Stage/recent activity query + tests
- [x] 5. ada-profile fetch/fallback adapter + context-line mapper tests
- [x] 6. Loader enrichment + route-data tests
- [x] 7. Profile intro/context block component + tests
- [x] 8. Discovery helper blocks component + tests
- [x] 9. Self-answer section component + tests
- [x] 10. Learner route integration + empty states + meta polish
- [x] 11. Playwright learner-profile journeys
- [x] 12. Accessibility/responsive regression tests and final TDD refactor

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Code Quality Review** — `unspecified-high`
- [ ] F3. **Real Manual QA** — `unspecified-high`
- [ ] F4. **Scope Fidelity Check** — `deep`

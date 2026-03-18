# 프론트엔드 및 어드민 화면별 와이어프레임 명세서

## 문서 목적
이 문서는 `divelog.page`의 공개 사용자 화면과 어드민 콘솔 화면을 **로우~미드 피델리티 수준**에서 정리한 와이어프레임 명세서다.

목적은 다음과 같다.

- 디자이너가 화면 구조를 바로 시안화할 수 있게 한다.
- 프론트엔드 개발자가 페이지별 모듈과 레이아웃을 이해하게 한다.
- 운영자가 어떤 정보가 화면에 드러나는지 확인하게 한다.

> **구현 상태**: 이 문서는 설계 명세입니다. 현재 구현 상태는 AGENTS.md의 라우트 섹션을 참조하세요.
> 챌린지 화면 (9-10번, 21-22번)은 미구현, Collaboration 화면 (11번, 29-30번)은 비활성화, Collective Memory 화면 (17번, 32-33번)은 비활성화 상태입니다.

---

## 공통 레이아웃 규칙

### Public Shell
- 상단 글로벌 네비
- 넓은 배경 캔버스
- 중앙 콘텐츠 컨테이너
- 하단 푸터

### Public 레이아웃 원칙
- 읽기 본문은 좁고 안정적이어야 한다.
- 목록 화면은 2열 또는 3열 가능
- 질문과 응답은 카드형
- 바다 느낌은 배경과 깊이감에서만

### Admin Shell
- 좌측 사이드 네비
- 상단 컨텍스트 바
- 메인 캔버스
- 선택적 우측 preview / inspector drawer

### Admin 레이아웃 원칙
- dense, utilitarian
- 빠른 스캔과 수정 우선
- neutral base + semantic status color
- 감성적 Hero 없음

---

## Public 화면 명세

---

## 1. 홈

### 목적
현재 코호트가 어디를 지나고 있고 어떤 질문이 살아 있는지 보여주는 첫 장면

### 구조
- Hero
- Cohort Journey Strip
- Current Dive
- 이번 구간의 열린 질문
- Recent Scenes
- 남겨두고 싶은 문장
- Learner Spotlight
- Start Logging CTA

### 와이어프레임
- 상단: 로고 / 네비 / 검색 / 기록 남기기
- Hero 좌측: 제품 카피와 CTA
- Hero 우측: 조용한 해저 배경 또는 현재 Stage 카드
- Journey Strip: Stage 흐름 가로 배치
- Current Dive와 열린 질문: 2열
- Recent Scenes: 카드 그리드
- 문장 섹션: 가로 카드 리스트
- Learner: 질문 중심 카드 리스트
- 하단 CTA: 기록 시작

### 상태
- 열린 질문 없음 → 질문 남기기 제안 카드
- 협업 없음 → Current Dive에 `개인 탐색 중심` 문구
- Recent Scenes 없음 → 첫 기록 유도

---

## 2. 여정

### 목적
전체 Stage 구조를 지도처럼 보여주는 페이지

### 구조
- 페이지 헤더
- 전체 Stage 타임라인
- 선택된 Stage 미리보기
- 과거 / 예정 Stage 보조 목록

### 와이어프레임
- 상단 제목과 설명
- 중앙에 전체 타임라인
- 하단에 선택된 Stage 설명 카드
- 현재 Stage 강조
- 과거 Stage는 채도 낮춤
- 예정 Stage는 outline 중심

### 상태
- 현재 Stage 없음 상태는 허용하지 않음
- Stage가 많아질 경우 스크롤 가능한 strip 허용

---

## 3. Stage 상세

### 목적
한 Stage의 맥락, 질문, 분위기, 기록, 협업 여부를 읽는 핵심 화면

### 구조
- Stage Hero
- Stage Context
- Quiet Check-in Summary
- 열린 질문
- Recent Scenes
- Collaboration Layer
- Carry Forward 또는 Collective Memory

### 와이어프레임
- Hero: Stage 이름 / 타입 / 설명 / 기록 CTA
- Context: 구간 설명 문장 블록
- Check-in: 짧은 서술 카드들
- 열린 질문: 질문 카드 그리드
- Recent Scenes: 기록 카드 리스트
- Collaboration Layer:
  - 협업 없음 → 안내 카드
  - 협업 있음 → Unit 카드
- 하단:
  - 진행 중 → 다음 Stage로 가져갈 질문
  - 종료 후 → Collective Memory 링크

---

## 4. 기록 목록

### 목적
모든 기록을 필터 기반으로 탐색

### 구조
- 페이지 헤더
- 주요 필터
- 보조 필터
- 결과 목록

### 와이어프레임
- 헤더: 제목 / 설명
- 필터 바:
  - 전체 / 개인 / 챌린지
  - Note / Article
  - Stage
  - Rhythm
  - 질문 있음
  - 자기답변 있음
  - 협업 연결 있음
- 결과 영역:
  - grid/list 전환 가능
  - Scene Card 반복

### 상태
- 검색 결과 없음 → 필터 재설정 제안
- 기록 없음 → 첫 기록 작성 CTA

---

## 5. 기록 상세

### 목적
하나의 기록을 읽고 질문과 응답이 이어지는 핵심 화면

### 구조
- Breadcrumb + 메타
- Record Header
- 본문
- 남겨둔 질문
- 응답 작성기
- 응답 목록
- 이어진 기록
- 남겨두고 싶은 문장
- 관련 기록

### 와이어프레임
- 상단 메타: Stage / 작성자 / Visibility / 형식
- 본문 컬럼: 좁은 읽기 폭
- 우측 레일:
  - 문장
  - 관련 기록
  - 같은 질문 흐름
- 본문 아래 큰 질문 카드
- 그 아래 응답 작성기
- 응답 리스트
- 이어진 기록 리스트

### 상태
- 질문 없음 → 질문 섹션 최소화
- 응답 없음 → 첫 응답 유도
- 이어진 기록 없음 → 새 기록으로 이어 쓰기 CTA

---

## 6. 기록 작성

### 목적
맥락을 잃지 않으면서도 가볍게 시작할 수 있는 작성 화면

### 구조
- 작성 시작 플로우
- 에디터
- 질문 추가
- 응답 선호도
- Visibility
- 저장 / 발행

### 와이어프레임
- 시작 선택 화면:
  - 개인 / 챌린지
  - 짧게 / 길게
  - Rhythm
- 에디터 화면:
  - 메타 헤더
  - Prompt Strip
  - 제목
  - 본문
  - 남겨둔 질문
  - 응답 선호도
  - 공개 범위
  - Draft / Preview / Publish

### 상태
- 협업 단위 없으면 관련 선택 비노출
- 템플릿 선택 안 하면 자유 형식으로 시작

---

## 7. Learner 목록

### 목적
Learner를 질문 중심으로 탐색

### 구조
- 페이지 헤더
- 필터
- Learner 카드 그리드

### 와이어프레임
- 카드:
  - 이름
  - 현재 질문
  - 최근 기록
  - 현재 Stage
  - 협업 흔적(있을 때만)

### 상태
- 현재 질문 없는 Learner는 최근 기록 중심 표시

---

## 8. Learner 상세

### 목적
한 Learner의 아홉 달을 질문과 자기답변 흐름으로 읽는 공간

### 구조
- Hero
- 현재 질문
- 최근 기록
- 내가 남긴 질문
- 내가 다시 답한 질문
- 남겨두고 싶은 문장
- 기록 아카이브
- 협업 흔적

### 와이어프레임
- Hero: 이름 / 소개 / 현재 Stage / 현재 질문
- 최근 기록: Scene card 리스트
- 질문 섹션: question card 리스트
- 자기답변 섹션: paired card 또는 timeline
- 문장 섹션
- Stage별 기록 묶음
- 협업 흔적은 존재할 때만

---

## 9. 챌린지 목록 [미구현]

### 목적
문제 해결 중심 구간을 목록으로 본다.

### 구조
- 헤더
- Challenge 카드 목록

### 카드 요소
- 제목
- 문제 정의 한 줄
- 현재 질문
- 상태
- 협업 여부

---

## 10. 챌린지 상세 [미구현]

### 목적
하나의 문제 해결 여정을 입체적으로 읽는 화면

### 구조
- Hero
- 문제 정의
- 현재 질문
- 개인 챌린지 기록
- Collaboration Layer
- 전환점
- 회고

### 와이어프레임
- Hero: 이름 / 상태 / 설명
- 문제 정의 카드
- 질문 카드
- 개인 기록 섹션
- 협업 단위 섹션
- 전환점 타임라인
- 회고 카드

### 상태
- 협업 없음 → 개인 탐색 중심 안내
- 협업 있음 → Collaboration Unit 카드 리스트

---

## 11. Collaboration Unit 상세 [비활성화]

### 목적
실제 협업 단위가 생겼을 때만 존재하는 허브

### 구조
- Hero
- 멤버
- 현재 질문
- 최근 장면
- 전환점
- 회고

### 와이어프레임
- Hero: 이름 / 상태 / 관련 Stage / 관련 Challenge
- 현재 질문 카드
- 멤버 리스트
- Scene card 리스트
- 전환점 타임라인
- 회고 카드

### 상태
- archived일 경우 배지 표시

---

## 12. 검색

### 목적
기록, 질문, Learner, 문장을 통합 검색

### 구조
- 검색창
- 결과 탭
- 결과 리스트

### 와이어프레임
- 상단 큰 검색창
- 탭:
  - 기록
  - 질문
  - Learner
  - 문장
- 각 탭마다 compact row 또는 small card

---

## 13. 인박스

### 목적
응답과 전환 알림을 조용하게 확인

### 구조
- 헤더
- 읽지 않음 / 전체 탭
- 알림 리스트

### 알림 아이템 요소
- 알림 유형
- 제목
- 짧은 설명
- 관련 Stage 또는 Record
- 시간

---

## 14. 내 공간

### 목적
Draft, 북마크, 질문, 저장한 문장을 관리

### 구조
- Overview
- Drafts
- Saved Sentences
- My Questions
- Bookmarks

### 와이어프레임
- 상단 탭 또는 세로 네비
- 각 섹션은 compact list 중심

---

## 15. 설정

### 목적
개인 프로필과 기본 동작 설정 관리

### 구조
- 프로필
- Visibility 기본값
- 응답 선호도
- 알림 설정

### 와이어프레임
- form layout
- 섹션별 저장
- 위험 작업 분리

---

## 16. 가이드

### 목적
기록과 응답의 문화를 설명

### 구조
- Hero
- 기록하기
- 질문 남기기
- 응답하기
- Visibility
- 운영 원칙
- FAQ

### 와이어프레임
- 문장 중심 레이아웃
- 예시 카드 적극 사용

---

## 17. Collective Memory [비활성화]

### 목적
한 Stage를 공동 서사로 다시 읽는 화면

### 구조
- Stage Summary Hero
- 열린 질문
- 오래 남은 문장
- 대표 장면
- 이어진 기록
- 다음 Stage로 가져갈 질문

### 와이어프레임
- Hero: Stage 이름 + 요약 문장
- 질문 섹션
- 문장 섹션
- Scene cards
- Carry Forward 질문 카드

---

## Admin 화면 명세

---

## 18. Admin Dashboard

### 목적
현재 운영 상태를 한눈에 파악

### 구조
- 상단 요약
- 현재 Stage 패널
- moderation 대기
- 큐레이션 필요 항목
- Collaboration 현황
- 최근 시스템 알림

### 와이어프레임
- 좌측 사이드바
- 상단 컨텍스트 바
- 카드형 status panel
- 큐 리스트
- preview drawer 가능

---

## 19. Admin Stage 목록

### 목적
모든 Stage를 관리

### 구조
- 헤더
- 필터
- Stage table
- 생성 버튼

### 테이블 컬럼
- 이름
- 타입
- 상태
- 기간
- 순서
- 현재 Stage 여부
- 수정

---

## 20. Admin Stage 상세

### 목적
Stage 편집

### 구조
- 기본 정보
- 타입 / 상태
- 설명 / Hero copy
- 날짜 / 순서
- accent tone
- 표시 여부
- 관련 Challenge
- Collective Memory 링크

### 와이어프레임
- 좌측 form
- 우측 preview panel

---

## 21. Admin Challenge 목록 [미구현]

### 목적
Challenge 관리

### 구조
- 테이블
- 상태 필터
- 생성 버튼

### 컬럼
- 이름
- 관련 Stage
- 상태
- Collaboration 존재 여부
- 최근 수정

---

## 22. Admin Challenge 상세 [미구현]

### 목적
문제 정의와 연결 구조 편집

### 구조
- 기본 정보
- 문제 정의
- 현재 질문
- 관련 Stage
- 관련 Unit
- 결과물 링크

---

## 23. Admin Learner 목록

### 목적
Learner 활동과 상태 관리

### 구조
- 검색
- 필터
- 테이블
- quick preview

### 컬럼
- 이름
- 현재 Stage
- 최근 활동
- 현재 질문
- 플래그
- 상태

---

## 24. Admin Learner 상세

### 목적
Learner 상태 심층 확인

### 구조
- 프로필
- 최근 기록
- 질문
- 자기답변
- 협업 이력
- 설정/제한 상태

---

## 25. Admin Records 목록

### 목적
기록 moderation 및 curation 관리

### 구조
- dense table
- bulk action bar
- preview drawer

### 컬럼
- 제목
- 작성자
- Stage
- 개인/챌린지
- Note/Article
- Visibility
- 상태
- 질문 여부
- 플래그 여부

---

## 26. Admin Record 상세

### 목적
기록 하나를 깊게 검토하고 수정

### 구조
- 메타 정보
- 본문 preview
- 질문
- 응답
- visibility 변경
- curation toggle
- moderation notes
- audit history

---

## 27. Admin Dialogue 목록

### 목적
응답 관리

### 구조
- 필터
- response table
- moderation 상태
- 대상 질문 / 대상 기록 preview

### 컬럼
- 유형
- 작성자
- 대상 기록
- Stage
- visibility
- 플래그
- 상태

---

## 28. Admin Dialogue 상세

### 목적
응답 검토와 조치

### 구조
- 원문 질문
- 원문 기록
- 응답 본문
- 관련 기록
- moderation action panel
- action history

---

## 29. Admin Collaboration 목록 [비활성화]

### 목적
Collaboration Unit 관리

### 구조
- 테이블
- 생성 버튼
- 상태 필터

### 컬럼
- 이름
- 상태
- 관련 Stage
- 관련 Challenge
- 멤버 수
- 최근 활동

---

## 30. Admin Collaboration 상세 [비활성화]

### 목적
협업 단위 편집

### 구조
- 기본 정보
- 상태 전환
- 질문
- 멤버
- 관련 기록
- archive 관리

---

## 31. Admin Curation

### 목적
홈과 주요 영역을 수동 정렬

### 구조
- 현재 홈 슬롯 미리보기
- 추천 후보 목록
- slot별 편집 패널

### 다루는 슬롯
- 홈 Recent Scenes
- 열린 질문
- 남겨두고 싶은 문장
- Learner Spotlight
- Stage featured scene

---

## 32. Admin Collective Memory 목록 [비활성화]

### 목적
Stage별 공동 기억 작업 상태 확인

### 구조
- 리스트
- 상태
- 발행 여부
- 최근 수정 시각

---

## 33. Admin Collective Memory 상세 [비활성화]

### 목적
Collective Memory 편집 및 발행

### 구조
- 요약 문장
- 질문 후보
- 문장 후보
- 기록 후보
- 이어진 기록 후보
- carry-forward 질문
- preview
- publish

---

## 34. Admin Templates 목록

### 목적
기록 템플릿과 프롬프트 관리

### 구조
- 테이블
- 필터
- 생성 버튼

### 컬럼
- 이름
- 적용 맥락
- 형식
- Stage 타입
- 활성화 여부

---

## 35. Admin Template 상세

### 목적
템플릿 하나의 내용 편집

### 구조
- 기본 정보
- prompt body
- context
- form
- rhythm
- stage kind
- active flag

---

## 36. Admin Analytics

### 목적
건강도 지표 확인

### 구조
- summary cards
- trend charts
- stage health
- dialogue health
- memory revisit
- dormant signal

### 원칙
- ranking 금지
- cohort health 중심

---

## 37. Admin Settings

### 목적
사이트 전역 설정 관리

### 구조
- 홈 섹션 on/off
- 기본 Visibility 정책
- Response 타입 on/off
- 검색 동작
- 테마 preset

---

## 38. Admin Roles & Permissions

### 목적
역할과 권한 매트릭스 관리

### 구조
- 역할 목록
- 권한 표
- 사용자 할당
- cohort scope 설정

---

## 39. Admin Audit Log

### 목적
운영 이력 추적

### 구조
- 로그 테이블
- 필터
- 상세 drawer

### 컬럼
- 시간
- 사용자
- 대상
- 작업
- 변경 전/후 요약

---

## 공통 상태 명세

### Public 빈 상태
- 기록 없음 → 첫 기록 유도
- 질문 없음 → 첫 질문 유도
- 협업 없음 → 개인 탐색 안내
- 검색 결과 없음 → 다른 키워드 제안

### Admin 빈 상태
- Stage 없음 → 생성 유도
- moderation 없음 → 대기 항목 없음
- curation 후보 없음 → 자동 추천 대기

### 로딩 상태
- public: card skeleton
- detail: title / meta / body skeleton
- admin: row skeleton / panel skeleton

### 에러 상태
- plain language
- retry CTA
- 권한 오류와 시스템 오류 분리

---

## 반응형 원칙

### Public
- 모바일 1열
- 태블릿 1열 우선
- 데스크톱 2~3열 허용
- 본문 컬럼은 항상 좁게 유지

### Admin
- 데스크톱 우선 설계
- 태블릿에서는 sidebar collapse
- 모바일에서는 최소 관리 기능만 고려, 전체 운영은 데스크톱 최적화

---

## 완료 기준
이 명세서 기준 화면 설계 완료 상태는 아래를 만족해야 한다.

- 모든 핵심 Public 페이지가 여정 중심 구조를 유지한다.
- 모든 핵심 Admin 페이지가 운영 효율 중심 구조를 가진다.
- 기록, 질문, 응답, 문장, 협업 단위, Collective Memory가 각각 화면에서 독립된 객체로 표현된다.
- 협업이 없어도 제품 흐름이 자연스럽다.
- 댓글과 좋아요 없이도 연결 구조가 분명하다.
- Public과 Admin의 톤이 명확히 구분된다.
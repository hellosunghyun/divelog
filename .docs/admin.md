# 어드민 설계서
## divelog.page Admin / Ops Architecture Spec

## 문서 목적
이 문서는 `divelog.page`의 운영자 콘솔 구조와 관리 기능을 정의한다.
목표는 다음과 같다.

- 운영자가 Stage, Record, Dialogue, Curation, Collaboration을 효율적으로 관리할 수 있게 한다.
- Public 제품 철학이 운영 콘솔에서도 흔들리지 않게 한다.
- moderation, visibility, collective memory, analytics까지 포함한 운영 도구를 정의한다.

---

> **구현 상태 안내**: 이 문서는 설계 명세입니다. 일부 기능은 아직 구현되지 않았습니다.
> - `[구현됨]` — 라우트와 기능이 구현됨
> - `[미구현]` — 설계만 존재, 라우트 미구현
> - `[비활성화]` — 코드 존재하나 라우트에서 비활성화됨

## 어드민 역할
어드민 콘솔은 공공-facing 서비스가 아니라 **운영 효율과 안전성**을 위한 도구다.

기본 역할은 다음과 같다.

- **Admin**: 전체 관리
- **Operator**: Stage / Challenge / Visibility / Home 운영
- **Curator**: 홈과 Collective Memory 큐레이션
- **Moderator**: Dialogue와 공개 기록 moderation
- **Mentor Viewer**: 읽기 중심 접근
- **Analytics Viewer**: 건강도 지표 확인

권한은 역할 매트릭스로 제어한다.

---

## 어드민 정보 구조

좌측 사이드바 기준 기본 구조는 아래와 같다.

- Dashboard [구현됨]
- Stage [구현됨]
- Challenge [미구현]
- Learner [구현됨]
- Records [구현됨]
- Dialogue [구현됨]
- Collaboration [비활성화]
- Curation [구현됨]
- Collective Memory [비활성화]
- Templates [구현됨]
- Tags [구현됨]
- Analytics [구현됨]
- Settings [구현됨]
- Roles & Permissions [구현됨]
- Audit Log [구현됨]

---

## 어드민 레이아웃 원칙

### 기본 셸
- 좌측 사이드 네비
- 상단 컨텍스트 바
- 중앙 콘텐츠 패널
- 선택적 우측 인스펙터 드로어

### 톤
- public보다 훨씬 utilitarian
- 색은 neutral base + semantic accent
- 해저 감성은 거의 제거
- 정보 밀도는 높지만 가독성 유지

### 우선순위
- 빠른 스캔
- 빠른 수정
- 빠른 이동
- bulk action
- preview
- auditability

---

## 대시보드

### 목적
운영자가 현재 상태를 한눈에 파악한다.

### 필수 패널
- 현재 Stage 상태
- 최근 기록 흐름
- 새 응답 및 moderation 대기
- 홈 큐레이션 필요 항목
- Collective Memory 발행 필요 상태
- Collaboration Unit 생성/변경 현황

### 표시 원칙
- KPI 나열보다 상태와 액션 아이템 우선
- 위험 항목은 상단 배치
- 현재 Stage 관련 패널을 가장 크게

---

## Stage 관리

### 목적
여정의 구조를 관리한다.

### 목록 화면
필수 요소:
- Stage 이름
- 타입
- 상태
- 기간
- 순서
- 현재 Stage 여부
- 공개 상태

기능:
- 생성
- 수정
- 복제
- 순서 변경
- 상태 전환
- 현재 Stage 지정

### 상세/편집 화면
섹션:
- 기본 정보
- 타입 / 상태
- 설명 / Hero 카피
- 날짜 / 순서
- Accent tone
- 표시 여부
- 관련 Challenge
- Collective Memory 연결

### 운영 원칙
- 코호트당 현재 Stage는 하나만 가능
- Stage 변경은 audit log 남김
- 홈 반영 여부를 미리 확인할 수 있어야 함

---

## Challenge 관리

### 목적
Challenge 관련 정보와 연결 구조를 관리한다.

### 목록 화면
- Challenge 이름
- 연결된 Stage
- 상태
- Collaboration 존재 여부
- 최근 활동

### 상세 화면
- 기본 정보
- 문제 정의
- 현재 질문
- 관련 기록
- 관련 Collaboration Unit
- 전환점 관리
- 결과물 링크
- 상태 변경

### 운영 포인트
- 협업이 없어도 Challenge는 존재 가능
- 문제 정의와 질문을 계속 갱신할 수 있어야 함

---

## Learner 관리

### 목적
Learner의 상태와 프로필, 활동 흐름을 관리한다.

### 목록 화면
- 이름
- 현재 Stage
- 최근 활동
- 현재 질문
- visibility 이슈
- moderation flag 유무

### 상세 화면
- 프로필
- 현재 질문
- 최근 기록
- 남겨둔 질문
- 자기답변
- 협업 참여 이력
- 알림 상태
- 계정 상태

### 운영 포인트
- Learner를 결과물보다 질문 중심으로 이해할 수 있어야 한다.
- 비활성 / 제한 / 유예 상태를 운영자가 구분 가능해야 한다.

---

## Records 관리

### 목적
모든 기록을 조회, 필터링, 검토, 조정한다.

### 목록 화면
필수 기능:
- dense table 또는 compact list
- filter
- search
- bulk actions
- quick preview

필터:
- 개인 기록 / 챌린지 기록
- Note / Article
- Stage
- visibility
- draft / published / archived
- 질문 있음
- 자기답변 있음
- flag 있음

### 상세 화면
- 본문 미리보기
- 메타데이터
- visibility 변경
- featured 지정
- moderation note
- 관련 질문
- 관련 응답
- 관련 문장
- audit history

### 운영 포인트
- 삭제보다 archived / hidden 우선
- visibility 변경은 신중히
- quick preview로 맥락을 빠르게 확인 가능해야 함

---

## Dialogue 관리

### 목적
응답 문화가 평가나 공격으로 흐르지 않도록 관리한다.

### 목록 화면
- 응답 유형
- 작성자
- 대상 기록
- 대상 질문
- Stage
- 플래그 상태
- visibility

### 상세 화면
- 원문 기록
- 남겨둔 질문
- 응답 본문
- 관련 기록 링크
- moderation action
- history

### 주요 기능
- hide / unhide
- visibility 조정
- warning note
- 삭제
- restore

### 운영 포인트
- 공명과 연결 중심 문화를 해치지 않는 moderation
- 조롱 / 비교 / 채점형 응답에 빠르게 대응
- 과도한 조언만 반복되는 패턴도 관찰 가능해야 함

---

## Collaboration 관리

### 목적
실제 협업이 생겼을 때만 등장하는 단위를 관리한다.

### 목록 화면
- 이름
- 상태
- 관련 Stage / Challenge
- 멤버 수
- 최근 활동

### 상세 화면
- 기본 정보
- 현재 질문
- 멤버 관리
- 상태 변경
- 공개 범위
- 관련 기록
- 전환점
- archive 관리

### 운영 포인트
- 기본 시스템은 Learner-first이므로, 협업이 없는 상태도 정상으로 취급
- Collaboration Unit을 생성했을 때만 관련 화면에 노출

---

## Curation

### 목적
홈과 주요 노출 영역을 운영자 의도로 정렬한다.

### 다루는 대상
- 홈 Recent Scenes
- 이번 구간의 열린 질문
- 남겨두고 싶은 문장
- Learner spotlight
- Stage featured scenes
- Collective Memory 구성 요소

### 기능
- 추천 후보 보기
- pin
- hide
- position 조정
- 기간 지정
- stage scope 지정

### 운영 포인트
- 최신순 자동 노출만으로 끝내지 않는다.
- 현재 Stage 맥락이 드러나게 큐레이션한다.
- 완성도 높은 글만 반복 노출하지 않는다.

---

## Collective Memory 편집

### 목적
Stage 종료 후 공동 기억 페이지를 발행한다.

### 목록 화면
- Stage별 상태
- draft / published / archived
- 발행 여부
- 최근 수정 시각

### 상세 편집 화면
섹션:
- 기본 정보
- 요약 문장
- 열린 질문 후보
- 문장 후보
- 기록 후보
- 이어진 기록 후보
- 다음 Stage로 가져갈 질문
- 발행 설정

### 기능
- 후보 선택
- 순서 변경
- pin/hide
- summary 작성
- preview
- publish / unpublish

### 운영 포인트
- 통계 리포트처럼 편집하지 않는다.
- 질문과 문장이 중심이 되게 정리한다.

---

## Templates

### 목적
기록 작성 프롬프트와 템플릿을 관리한다.

### 목록
- 이름
- 적용 맥락
- 형식
- Stage 타입
- 활성화 여부

### 상세
- 제목
- 설명
- prompt body
- context
- form
- rhythm
- stage kind
- activation

### 운영 포인트
- 특정 Stage에 맞는 프롬프트를 켜고 끌 수 있어야 한다.
- 템플릿은 학습 강제가 아니라 시작점이어야 한다.

---

## Analytics

### 목적
경쟁 지표가 아니라 건강도 지표를 본다.

### 핵심 지표
- 첫 기록 작성률
- Stage 간 기록 지속성
- 남겨둔 질문 생성
- 자기답변 생성
- Cohort 공개 사용률
- 응답 다양성
- Collective Memory 재방문
- 과거 Stage 재방문

### 표시 원칙
- leaderboards 금지
- 개인 비교 금지
- 코호트 건강도 / Stage 건강도 중심
- 분포와 추세 중심

### 화면 구성
- Summary cards
- trend charts
- stage comparison
- question health
- dialogue health
- dormant learner signals

---

## Settings

### 목적
사이트 전역 설정을 조정한다.

### 관리 항목
- 홈 섹션 표시 여부
- 기본 Visibility 정책
- 응답 타입 on/off
- Ocean tone 강도
- 검색 동작
- 기본 템플릿 노출 정책

### 운영 포인트
- 제품 철학을 흔드는 설정은 제한
- 자유도보다 안정성 우선

---

## Roles & Permissions

### 목적
역할 기반 접근 제어를 관리한다.

### 기능
- 역할 목록
- 권한 매트릭스
- 사용자별 역할 부여
- 역할 회수
- cohort scope 설정

### 권한 예시
- Learner
- Mentor
- Operator
- Curator
- Moderator
- Admin

---

## Audit Log

### 목적
운영자의 중요한 조치와 변경을 추적한다.

### 기록 대상
- Stage 상태 변경
- visibility 변경
- moderation action
- curation 변경
- roles 변경
- Collaboration 상태 전환
- Collective Memory 발행

### 표시 요소
- 시간
- 행위자
- 대상
- 작업
- 변경 전
- 변경 후

---

## 어드민 디자인 원칙

### 톤
- utilitarian
- dense but calm
- neutral surfaces
- semantic colors only for state

### 금지
- public의 감성적 Hero 사용
- 과한 해저 테마
- decorative motion
- 정보보다 비주얼이 앞서는 구조

### 필수
- 빠른 스캔
- 빠른 비교
- bulk action
- preview drawer
- keyboard friendly tables

---

## 공통 상태 처리

### 빈 상태
운영자가 무엇을 해야 하는지 명확히 안내해야 한다.

예:
- 아직 생성된 Stage가 없습니다 → 새 Stage 생성
- moderation 대상이 없습니다 → 현재 대기 중인 항목 없음

### 에러 상태
- plain language
- 재시도 가능
- 시스템 오류와 권한 오류를 구분

### 로딩 상태
- table skeleton
- panel skeleton
- preview skeleton

---

## 완료 기준
어드민 구현 완료 상태는 아래를 만족해야 한다.

- 운영자는 Stage, Record, Dialogue, Curation, Collaboration, Memory를 별도 개발 도움 없이 관리할 수 있다.
- moderation과 visibility 변경 흐름이 명확하다.
- 홈과 Collective Memory를 실제 서비스 운영 수준으로 큐레이션할 수 있다.
- analytics는 경쟁보다 건강도 지표를 중심으로 제공된다.
- audit log로 중요한 운영 행위를 추적할 수 있다.
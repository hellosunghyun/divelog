# 사이트맵

## Public 영역

- `/`
  - 홈
  - Hero
  - Cohort Journey
  - Current Dive
  - 이번 구간의 열린 질문
  - Recent Scenes
  - 남겨두고 싶은 문장
  - Learner Spotlight
  - Start Logging CTA

- `/journey`
  - 전체 여정 개요
  - Stage 타임라인
  - 현재 Stage 강조
  - Stage 미리보기

- `/journey/[stageSlug]`
  - Stage 상세
  - Stage Hero
  - Stage Context
  - Quiet Check-in Summary
  - 열린 질문
  - Recent Scenes
  - Collaboration Layer
  - Carry Forward 또는 Collective Memory 진입

- `/logs`
  - 기록 목록
  - 필터
    - 개인 기록 / 챌린지 기록
    - Note / Article
    - Stage
    - Rhythm
    - 질문 있음
    - 자기답변 있음
    - 협업 연결 있음

- `/logs/[recordSlug]`
  - 기록 상세
  - 본문
  - 남겨둔 질문
  - 응답 작성기
  - 응답 목록
  - 이어진 기록
  - 남겨두고 싶은 문장
  - 관련 기록

- `/write`
  - 기록 작성 시작
  - 기록 맥락 선택
  - 형식 선택
  - Rhythm 선택
  - 본문 작성
  - 남겨둔 질문
  - 응답 선호도
  - Visibility 선택

- `/challenges`
  - 챌린지 목록
  - 현재 / 종료 상태
  - 주요 질문
  - 협업 유무

- `/challenges/[challengeSlug]`
  - 챌린지 상세
  - 문제 정의
  - 현재 질문
  - 개인 챌린지 기록
  - Collaboration Layer
  - 전환점
  - 회고

- `/learners`
  - Learner 목록
  - 현재 질문 중심 카드
  - 최근 기록
  - 필터

- `/learners/[learnerSlug]`
  - Learner 상세
  - 소개
  - 지금 붙들고 있는 질문
  - 최근 기록
  - 내가 남긴 질문
  - 내가 다시 답한 질문
  - 남겨두고 싶은 문장
  - 협업 흔적

- `/groups/[groupSlug]`
  - Collaboration Unit 상세
  - 존재할 때만 접근 가능
  - 질문
  - 멤버
  - 최근 장면
  - 전환점
  - 회고

- `/guide`
  - 기록 가이드
  - 응답 가이드
  - Visibility 안내
  - 운영 원칙
  - FAQ

- `/search`
  - 통합 검색
  - 기록
  - 질문
  - Learner
  - 문장

- `/inbox`
  - 새 응답
  - 자기답변 리마인드
  - Stage 전환 알림
  - Collective Memory 발행 알림

- `/me`
  - 내 공간
  - Draft
  - 저장한 문장
  - 내가 남긴 질문
  - 아직 답하지 않은 질문
  - 북마크

- `/settings`
  - 프로필
  - 기본 공개 범위
  - 응답 선호도
  - 알림 설정

- `/memories/[stageSlug]`
  - Collective Memory
  - 열린 질문
  - 오래 남은 문장
  - 대표 장면
  - 이어진 기록
  - 다음 Stage로 가져갈 질문

---

## Admin 영역

- `/admin`
  - Dashboard
  - 현재 Stage 상태
  - 최근 기록 흐름
  - moderation 대기
  - 큐레이션 작업

- `/admin/stages`
  - Stage 목록
  - 순서 조정
  - 상태 변경

- `/admin/stages/[stageId]`
  - Stage 편집
  - Hero 문구
  - 설명
  - 타입
  - 노출 설정

- `/admin/challenges`
  - Challenge 목록

- `/admin/challenges/[challengeId]`
  - Challenge 편집
  - 문제 정의
  - 주요 질문
  - 관련 Stage
  - 관련 Collaboration Unit

- `/admin/learners`
  - Learner 목록
  - 활동 상태
  - visibility 이슈

- `/admin/learners/[learnerId]`
  - Learner 상세 관리
  - 프로필
  - 활동 내역
  - 플래그 상태

- `/admin/records`
  - Record 목록
  - quick preview
  - 필터
  - bulk action

- `/admin/records/[recordId]`
  - Record 상세 관리
  - visibility 변경
  - moderation note
  - feature 지정

- `/admin/dialogue`
  - Response 목록
  - moderation queue

- `/admin/dialogue/[responseId]`
  - Response 상세
  - 원문 질문
  - 원문 기록
  - 조치 내역

- `/admin/collaboration`
  - Collaboration Unit 목록

- `/admin/collaboration/[groupId]`
  - Collaboration Unit 관리
  - 멤버
  - 상태
  - 질문
  - 관련 기록

- `/admin/curation`
  - 홈 큐레이션
  - 열린 질문 선별
  - 문장 선별
  - Learner spotlight

- `/admin/memories`
  - Collective Memory 목록

- `/admin/memories/[stageId]`
  - Collective Memory 편집
  - 질문 선택
  - 문장 선택
  - 기록 선택
  - 요약 작성
  - 발행

- `/admin/templates`
  - 템플릿 목록
  - 프롬프트 라이브러리

- `/admin/templates/[templateId]`
  - 템플릿 상세 편집
  - 맥락
  - 형식
  - Stage 연동
  - 활성화 여부

- `/admin/analytics`
  - 건강도 지표
  - 기록 지속성
  - 질문 생성
  - 자기답변
  - 재방문

- `/admin/settings`
  - 사이트 설정
  - 홈 섹션 on/off
  - 기본 Visibility
  - Response 타입 설정

- `/admin/roles`
  - 역할 목록
  - 권한 매트릭스
  - 사용자별 역할 부여

- `/admin/audit`
  - 감사 로그
  - 운영 이력
  - 변경 전후 추적
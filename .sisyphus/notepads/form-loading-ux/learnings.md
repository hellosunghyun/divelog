# Form Loading UX - Learnings

## 2026-03-18 기록 상세 SubmitButton 적용

- `app/routes/public/logs/$recordSlug.tsx`에서 `useNavigation` 기반 intent 분기(`isSubmitting*`)를 제거하고 `SubmitButton` + `formDataMatch`로 로딩 상태를 위임했다.
- 응답 등록, 자기답변 등록, 문장 저장, 응답 수정 저장, 답글 등록 버튼만 교체했고 `bookmarkFetcher.Form`은 그대로 유지했다.
- 답글 등록은 메인 응답과 같은 `create_response` intent를 공유하므로 두 위치가 동일한 제출 중 상태를 보여도 허용된다.
- 문장 저장 팝업은 실제 제출이 `submit(formData)` 호출 기반이어서 `SubmitButton`에 `type="button"`과 `onClick={handleSentencePopupSave}`를 함께 써서 기존 동작을 유지했다.
- 응답 스레드 컨텍스트에서 더 이상 쓰지 않는 `isSubmittingResponseEdit` / `isSubmittingResponseDelete` 속성을 제거해 context shape를 정리했다.

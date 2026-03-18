DELETE FROM memory_questions;
DELETE FROM memory_sentences;
DELETE FROM memory_records;
DELETE FROM question_reminders;
DELETE FROM question_carry_overs;
DELETE FROM saved_records;
DELETE FROM personal_stage_reflections;
DELETE FROM drafts;
DELETE FROM notifications;
DELETE FROM responses;
DELETE FROM self_answers;
DELETE FROM questions;
DELETE FROM sentences;
DELETE FROM challenge_stages;
DELETE FROM collaboration_members;
DELETE FROM curation_slots;
DELETE FROM audit_logs;
DELETE FROM collective_memories;
DELETE FROM record_tags;
DELETE FROM record_links;
DELETE FROM mentions;
DELETE FROM records;
DELETE FROM tags;
DELETE FROM collaboration_units;
DELETE FROM templates;
DELETE FROM challenges;
DELETE FROM learner_profiles;
DELETE FROM user_roles;
DELETE FROM settings;
DELETE FROM stages;

INSERT INTO stages (
  id, name, slug, type, status, description, accent_tone, "order",
  start_date, end_date, is_current, hero_content, cohort, created_at, updated_at
) VALUES
  ('stage-prelude', 'Prelude', 'prelude', 'prelude', 'completed', '무엇을 깊이 들여다보고 싶은지 천천히 알아가는 시기입니다. 아직 문장이 흐릿해도 괜찮습니다.', 'prelude', 1, 1773014400, 1773360000, 0, '완성된 답보다 오래 붙들고 싶은 질문을 찾아봅니다.', 'cohort-2026', 1773014400, 1773014400),
  ('stage-challenge-1', 'Challenge 1', 'challenge-1', 'challenge', 'active', 'CBL을 통해 기본 역량을 쌓고 탐구의 기초를 다지는 시기입니다.', 'challenge', 2, 1773619200, 1775174400, 1, 'Learn basic skills with CBL', 'cohort-2026', 1773619200, 1773619200),
  ('stage-bridge-1', 'Bridge 1', 'bridge-1', 'bridge', 'upcoming', '첫 도전을 지나 더 또렷한 질문으로 건너가는 시기입니다.', 'bridge', 3, 1775433600, 1775779200, 0, '지금까지의 기록을 돌아보며 다음 탐구를 준비합니다.', 'cohort-2026', 1775433600, 1775433600),
  ('stage-challenge-2', 'Challenge 2', 'challenge-2', 'challenge', 'upcoming', '나의 기술을 한 단계 더 발전시키는 시기입니다.', 'challenge', 4, 1776038400, 1776988800, 0, 'Improve my skills', 'cohort-2026', 1776038400, 1776038400),
  ('stage-bridge-2', 'Bridge 2', 'bridge-2', 'bridge', 'upcoming', '도전에서 얻은 감각을 정리하고 다음 구간을 준비하는 시기입니다.', 'bridge', 5, 1777248000, 1777593600, 0, '이전 기록을 다시 읽으며 다음 질문을 남깁니다.', 'cohort-2026', 1777248000, 1777248000),
  ('stage-challenge-3', 'Challenge 3', 'challenge-3', 'challenge', 'upcoming', 'Apple 기술을 탐구하며 더 깊은 질문을 던지는 시기입니다.', 'challenge', 6, 1777852800, 1781136000, 0, 'Apple Technology', 'cohort-2026', 1777852800, 1777852800),
  ('stage-bridge-3', 'Bridge 3', 'bridge-3', 'bridge', 'upcoming', '기술 탐구를 되돌아보며 사용자 경험으로 시선을 넓히는 시기입니다.', 'bridge', 7, 1781481600, 1781827200, 0, '기술과 사용자의 접점을 생각합니다.', 'cohort-2026', 1781481600, 1781481600),
  ('stage-challenge-4', 'Challenge 4', 'challenge-4', 'challenge', 'upcoming', '사용자 경험을 이해하고 공감의 시선을 기르는 시기입니다.', 'challenge', 8, 1782086400, 1784851200, 0, 'Understanding User Experience', 'cohort-2026', 1782086400, 1782086400),
  ('stage-bridge-4', 'Bridge 4', 'bridge-4', 'bridge', 'upcoming', 'UX 탐구를 정리하고 AI 시대의 질문으로 전환하는 시기입니다.', 'bridge', 9, 1785110400, 1785456000, 0, '경험을 정리하며 다음 탐구를 설계합니다.', 'cohort-2026', 1785110400, 1785110400),
  ('stage-challenge-5', 'Challenge 5', 'challenge-5', 'challenge', 'upcoming', 'AI 시대를 준비하며 새로운 가능성을 탐색하는 시기입니다.', 'challenge', 10, 1785715200, 1787270400, 0, 'Preparing for AI era', 'cohort-2026', 1785715200, 1785715200),
  ('stage-bridge-5', 'Bridge 5', 'bridge-5', 'bridge', 'upcoming', 'AI 탐구를 마무리하고 최종 도전을 준비하는 시기입니다.', 'bridge', 11, 1787529600, 1787875200, 0, '지금까지의 여정을 하나로 엮어봅니다.', 'cohort-2026', 1787529600, 1787529600),
  ('stage-challenge-6', 'Challenge 6', 'challenge-6', 'challenge', 'upcoming', '아홉 달의 모든 배움을 모아 최종 도전에 임하는 시기입니다.', 'challenge', 12, 1788134400, 1795132800, 0, 'Final Challenge', 'cohort-2026', 1788134400, 1788134400),
  ('stage-epilogue', 'Epilogue', 'epilogue', 'epilogue', 'upcoming', '아홉 달의 흐름을 돌아보며 다음 여정을 상상하는 시기입니다.', 'epilogue', 13, 1795392000, 1796688000, 0, '지나온 기록을 엮어 나만의 결을 발견합니다.', 'cohort-2026', 1795392000, 1795392000);

INSERT INTO learner_profiles (
  user_id,
  slug,
  display_name,
  profile_photo_url,
  cohort,
  bio,
  current_stage_id,
  current_question,
  notification_email_enabled,
  default_visibility,
  default_response_preference,
  created_at,
  updated_at
) VALUES
  ('hana', 'learner-hana', '이하나', NULL, 'cohort-2026', '탐구를 서두르지 않고 기록으로 생각을 정리합니다.', 'stage-challenge-1', '지금 나를 가장 오래 붙드는 질문은 무엇일까?', 1, 'cohort', 'open', unixepoch() - 86400 * 80, unixepoch() - 86400 * 1),
  ('jiwon', 'learner-jiwon', '박지원', NULL, 'cohort-2026', '질문을 오래 붙들며 타인의 기록에서 실마리를 찾습니다.', 'stage-challenge-1', '실패를 다시 읽으면 무엇이 남을까?', 1, 'cohort', 'open', unixepoch() - 86400 * 78, unixepoch() - 86400 * 3),
  ('minjun', 'learner-minjun', '최민준', NULL, 'cohort-2026', '혼자보다 함께 탐구할 때 더 넓게 생각할 수 있다고 믿습니다.', 'stage-challenge-1', '서로 다른 시선을 어떻게 한 질문으로 묶을 수 있을까?', 1, 'cohort', 'open', unixepoch() - 86400 * 76, unixepoch() - 86400 * 2),
  ('soyeon', 'learner-soyeon', '정소연', NULL, 'cohort-2026', '짧은 메모 속에서 오래 남는 질문을 발견하는 편입니다.', 'stage-challenge-1', '학습은 무엇을 바꿀 때 시작될까?', 1, 'cohort', 'question_only', unixepoch() - 86400 * 74, unixepoch() - 86400 * 2),
  ('hyunjin', 'learner-hyunjin', '김현진', NULL, 'cohort-2026', '불확실한 상태를 기록으로 견디며 방향을 찾습니다.', 'stage-challenge-1', '기록은 어떻게 나를 다시 보게 만들까?', 1, 'public', 'open', unixepoch() - 86400 * 72, unixepoch() - 86400 * 4),
  ('jaemin', 'learner-jaemin', '오재민', NULL, 'cohort-2026', '시작이 느려도 꾸준히 남기는 힘을 연습하고 있습니다.', 'stage-challenge-1', '작은 시작을 계속 이어가려면 무엇이 필요할까?', 1, 'cohort', 'open', unixepoch() - 86400 * 70, unixepoch() - 86400 * 5);

INSERT INTO challenges (
  id,
  name,
  slug,
  problem_definition,
  current_question,
  description,
  status,
  cohort,
  created_at,
  updated_at
) VALUES
  ('challenge-team', '팀과 함께하는 탐색', 'team-challenge', '함께 묻고 함께 정리할 때 더 선명해지는 문제는 무엇인지 탐구합니다.', '지금 우리 팀이 함께 붙들어야 할 질문은 무엇인가요?', '서로 다른 관점을 모아 하나의 탐구 흐름으로 엮는 공동 챌린지입니다.', 'active', 'cohort-2026', unixepoch() - 86400 * 18, unixepoch() - 86400 * 1),
  ('challenge-solo', '나만의 탐구 여정', 'solo-challenge', '혼자서 오래 붙들고 싶은 문제를 정하고 기록으로 밀도를 높입니다.', '지금 나 혼자서 가장 깊게 들여다보고 싶은 것은 무엇인가요?', '개인 기록과 자기 질문을 중심으로 이어가는 단독 챌린지입니다.', 'active', 'cohort-2026', unixepoch() - 86400 * 18, unixepoch() - 86400 * 2),
  ('challenge-writing', '기록의 의미 탐구', 'writing-challenge', '기록이 학습과 성찰을 어떻게 바꾸는지 돌아봅니다.', '나는 왜 기록을 남기고 있는가?', '기록을 남기는 행위 자체를 탐구 대상으로 삼는 챌린지입니다.', 'completed', 'cohort-2026', unixepoch() - 86400 * 55, unixepoch() - 86400 * 22);

INSERT INTO challenge_stages (challenge_id, stage_id) VALUES
  ('challenge-team', 'stage-challenge-1'),
  ('challenge-solo', 'stage-challenge-1'),
  ('challenge-writing', 'stage-bridge-1');

INSERT INTO collaboration_units (
  id,
  name,
  slug,
  challenge_id,
  stage_id,
  status,
  current_question,
  description,
  cohort,
  created_at,
  updated_at
) VALUES
  ('collab-unit-alpha', '알파 팀', 'collab-alpha', 'challenge-team', 'stage-challenge-1', 'active', '우리가 함께 탐구하는 질문을 어떻게 모두의 언어로 바꿀 수 있을까요?', '세 명의 학습자가 각자의 기록을 모아 하나의 흐름으로 정리하는 협업 유닛입니다.', 'cohort-2026', unixepoch() - 86400 * 12, unixepoch() - 86400 * 1);

INSERT INTO collaboration_members (unit_id, learner_id, role, joined_at) VALUES
  ('collab-unit-alpha', 'minjun', 'lead', unixepoch() - 86400 * 12),
  ('collab-unit-alpha', 'soyeon', 'member', unixepoch() - 86400 * 11),
  ('collab-unit-alpha', 'hyunjin', 'member', unixepoch() - 86400 * 11);

INSERT INTO records (
  id,
  slug,
  author_id,
  stage_id,
  challenge_id,
  collaboration_unit_id,
  linked_record_id,
  title,
  content,
  content_text,
  format,
  type,
  rhythm,
  visibility,
  response_preference,
  is_featured,
  moderation_status,
  cohort,
  created_at,
  updated_at
) VALUES
  ('record-001', 'first-note', 'hana', 'stage-challenge-1', NULL, NULL, NULL, '탐색의 첫 번째 노트', '처음 이곳에 왔을 때 나는 무엇을 원하는지 또렷하게 말할 수 없었습니다. 다만 막연한 답답함이 있었고, 그 답답함을 따라가 보자는 마음이 생겼습니다. 기록을 시작하자 완성된 문장이 없어도 질문은 자랄 수 있다는 사실을 조금씩 알게 되었습니다.', '처음 이곳에 왔을 때 나는 무엇을 원하는지 또렷하게 말할 수 없었습니다. 다만 막연한 답답함이 있었고, 그 답답함을 따라가 보자는 마음이 생겼습니다. 기록을 시작하자 완성된 문장이 없어도 질문은 자랄 수 있다는 사실을 조금씩 알게 되었습니다.', 'note', 'personal', 'free', 'public', 'open', 1, 'clean', 'cohort-2026', unixepoch() - 86400 * 9, unixepoch() - 86400 * 1),
   ('record-002', 'challenge-article', 'hana', 'stage-challenge-1', 'challenge-solo', NULL, 'record-001', '챌린지를 시작하며', '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"혼자서 탐구를 이어가기"}]},{"type":"paragraph","content":[{"type":"text","text":"혼자서 탐구를 이어가는 일은 처음에는 외롭게 느껴졌습니다. 그런데 기록을 남기다 보니 내 생각이 흩어지는 대신 한곳으로 모이기 시작했습니다."}]},{"type":"paragraph","content":[{"type":"text","text":"누군가와 바로 대화하지 않아도 기록이 나를 다시 불러 세운다는 사실이 든든했습니다. 이번 주에는 그 든든함을 더 깊이 느껴 보고 싶습니다."}]}]}', '혼자서 탐구를 이어가기 혼자서 탐구를 이어가는 일은 처음에는 외롭게 느껴졌습니다. 그런데 기록을 남기다 보니 내 생각이 흩어지는 대신 한곳으로 모이기 시작했습니다. 누군가와 바로 대화하지 않아도 기록이 나를 다시 불러 세운다는 사실이 든든했습니다. 이번 주에는 그 든든함을 더 깊이 느껴 보고 싶습니다.', 'article', 'challenge', 'weekly', 'cohort', 'open', 1, 'clean', 'cohort-2026', unixepoch() - 86400 * 7, unixepoch() - 86400 * 7),
  ('record-003', 'hana-weekly-1', 'hana', 'stage-challenge-1', NULL, NULL, NULL, '이번 주 메모: 질문을 찾아서', '이번 주에는 진짜 궁금한 것이 무엇인지 알아보려 했습니다. 아직 한 문장으로 정리되지는 않았지만, 내가 오래 머무는 장면과 자꾸 돌아보는 문장은 분명해졌습니다. 질문은 갑자기 떠오르기보다 천천히 드러난다는 사실을 배웠습니다.', '이번 주에는 진짜 궁금한 것이 무엇인지 알아보려 했습니다. 아직 한 문장으로 정리되지는 않았지만, 내가 오래 머무는 장면과 자꾸 돌아보는 문장은 분명해졌습니다. 질문은 갑자기 떠오르기보다 천천히 드러난다는 사실을 배웠습니다.', 'note', 'personal', 'weekly', 'cohort', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 5, unixepoch() - 86400 * 5),
  ('record-004', 'jiwon-first', 'jiwon', 'stage-challenge-1', NULL, NULL, NULL, '나의 탐색 시작점', '모든 것이 낯설지만 그 낯섦이 오히려 나를 움직이게 합니다. 익숙한 답을 반복하는 대신 아직 잘 모르는 감각을 따라가 보고 싶습니다. 이번 기록은 그 첫 번째 표시입니다.', '모든 것이 낯설지만 그 낯섦이 오히려 나를 움직이게 합니다. 익숙한 답을 반복하는 대신 아직 잘 모르는 감각을 따라가 보고 싶습니다. 이번 기록은 그 첫 번째 표시입니다.', 'note', 'personal', 'free', 'cohort', 'question_only', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 11, unixepoch() - 86400 * 11),
   ('record-005', 'minjun-collab', 'minjun', 'stage-challenge-1', 'challenge-team', 'collab-unit-alpha', NULL, '팀과 함께 발견한 것들', '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"다른 시선이 모일 때"}]},{"type":"paragraph","content":[{"type":"text","text":"혼자서는 지나쳤을 문장을 팀과 함께 읽으니 전혀 다른 의미가 보였습니다."}]},{"type":"paragraph","content":[{"type":"text","text":"누군가는 질문을 붙들고, 누군가는 장면을 떠올리고, 누군가는 흐름을 정리했습니다. 각자의 역할이 자연스럽게 나타났습니다."}]},{"type":"paragraph","content":[{"type":"text","text":"다른 시선이 모일수록 탐구가 더 넓어질 수 있다는 사실을 체감했습니다. 이것이 팀 탐구의 가장 큰 선물입니다."}]}]}', '다른 시선이 모일 때 혼자서는 지나쳤을 문장을 팀과 함께 읽으니 전혀 다른 의미가 보였습니다. 누군가는 질문을 붙들고, 누군가는 장면을 떠올리고, 누군가는 흐름을 정리했습니다. 각자의 역할이 자연스럽게 나타났습니다. 다른 시선이 모일수록 탐구가 더 넓어질 수 있다는 사실을 체감했습니다. 이것이 팀 탐구의 가장 큰 선물입니다.', 'article', 'collaboration', 'weekly', 'cohort', 'open', 1, 'clean', 'cohort-2026', unixepoch() - 86400 * 4, unixepoch() - 86400 * 2),
  ('record-006', 'soyeon-question', 'soyeon', 'stage-challenge-1', NULL, NULL, NULL, '지금 나에게 남겨진 질문', '이번 구간에서 가장 오래 붙잡힌 문장은 학습이 결국 무엇을 바꾸는가라는 질문이었습니다. 지식을 더하는 일인지, 태도를 바꾸는 일인지, 나를 대하는 방식을 바꾸는 일인지 아직 말하기 어렵습니다. 그래서 당분간은 이 질문을 정답 없이 들고 다니려 합니다.', '이번 구간에서 가장 오래 붙잡힌 문장은 학습이 결국 무엇을 바꾸는가라는 질문이었습니다. 지식을 더하는 일인지, 태도를 바꾸는 일인지, 나를 대하는 방식을 바꾸는 일인지 아직 말하기 어렵습니다. 그래서 당분간은 이 질문을 정답 없이 들고 다니려 합니다.', 'note', 'personal', 'free', 'public', 'question_only', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 3, unixepoch() - 86400 * 3),
  ('record-007', 'hyunjin-sprint', 'hyunjin', 'stage-challenge-1', 'challenge-team', 'collab-unit-alpha', NULL, '스프린트 기록: 첫 주', '팀 챌린지의 첫 주는 분명하지 않은 상태를 버티는 시간에 가까웠습니다. 우리는 아직 같은 결론에 도달하지 못했지만, 서로가 무엇을 중요하게 여기는지는 조금씩 보이기 시작했습니다. 그 차이를 서둘러 없애지 않는 것이 중요하다고 느꼈습니다.', '팀 챌린지의 첫 주는 분명하지 않은 상태를 버티는 시간에 가까웠습니다. 우리는 아직 같은 결론에 도달하지 못했지만, 서로가 무엇을 중요하게 여기는지는 조금씩 보이기 시작했습니다. 그 차이를 서둘러 없애지 않는 것이 중요하다고 느꼈습니다.', 'note', 'collaboration', 'sprint', 'cohort', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 8, unixepoch() - 86400 * 8),
   ('record-008', 'hana-reflection', 'hana', 'stage-bridge-1', NULL, NULL, NULL, '전환점에서 돌아보기', '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"막막함을 읽는 방법"}]},{"type":"paragraph","content":[{"type":"text","text":"처음의 막막함은 사라지지 않았지만, 이제는 그 막막함을 읽는 방법을 조금 알게 되었습니다."}]},{"type":"paragraph","content":[{"type":"text","text":"무엇을 모르고 있는지 말할 수 있게 되자 다음 질문도 자연스럽게 따라왔습니다. 모름이 질문의 시작이 될 수 있다는 깨달음이 가장 컸습니다."}]},{"type":"paragraph","content":[{"type":"text","text":"전환은 갑작스러운 도약보다 서서히 바뀌는 시선에 더 가까웠습니다. 그 변화를 기록으로 남길 수 있어서 다행입니다."}]}]}', '막막함을 읽는 방법 처음의 막막함은 사라지지 않았지만, 이제는 그 막막함을 읽는 방법을 조금 알게 되었습니다. 무엇을 모르고 있는지 말할 수 있게 되자 다음 질문도 자연스럽게 따라왔습니다. 모름이 질문의 시작이 될 수 있다는 깨달음이 가장 컸습니다. 전환은 갑작스러운 도약보다 서서히 바뀌는 시선에 더 가까웠습니다. 그 변화를 기록으로 남길 수 있어서 다행입니다.', 'article', 'personal', 'monthly', 'public', 'open', 1, 'clean', 'cohort-2026', unixepoch() - 86400 * 31, unixepoch() - 86400 * 31),
  ('record-009', 'jiwon-deep', 'jiwon', 'stage-challenge-1', NULL, NULL, NULL, '깊어지는 탐구', '표면적인 질문에서 더 깊은 질문으로 내려간다는 것은 답을 줄이는 일이 아니라 모르는 지점을 더 선명하게 보는 일이었습니다. 조급함은 여전히 남아 있지만, 그 조급함도 기록에 남기면 탐구의 일부가 된다는 것을 배웠습니다.', '표면적인 질문에서 더 깊은 질문으로 내려간다는 것은 답을 줄이는 일이 아니라 모르는 지점을 더 선명하게 보는 일이었습니다. 조급함은 여전히 남아 있지만, 그 조급함도 기록에 남기면 탐구의 일부가 된다는 것을 배웠습니다.', 'note', 'personal', 'free', 'cohort', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 13, unixepoch() - 86400 * 13),
  ('record-010', 'minjun-team-2', 'minjun', 'stage-challenge-1', 'challenge-team', 'collab-unit-alpha', 'record-005', '팀 탐구 두 번째 기록', '오늘 팀 미팅에서는 우리가 결과를 너무 빨리 정리하려 했다는 사실을 함께 확인했습니다. 질문이 충분히 열려 있지 않으면 기록도 얇아진다는 이야기가 나왔고, 그 말이 오래 남았습니다. 잠시 멈춰서 질문을 다시 적어 보는 시간이 필요했습니다.', '오늘 팀 미팅에서는 우리가 결과를 너무 빨리 정리하려 했다는 사실을 함께 확인했습니다. 질문이 충분히 열려 있지 않으면 기록도 얇아진다는 이야기가 나왔고, 그 말이 오래 남았습니다. 잠시 멈춰서 질문을 다시 적어 보는 시간이 필요했습니다.', 'note', 'collaboration', 'free', 'cohort', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 2, unixepoch() - 86400 * 2),
  ('record-011', 'jaemin-start', 'jaemin', 'stage-challenge-1', NULL, NULL, NULL, '시작하는 마음', '무엇을 써야 할지 모르겠지만 일단 시작해 보기로 했습니다. 작은 기록이라도 남겨 두면 다음 문장이 조금 더 쉬워질 것 같았습니다. 오늘의 기록은 그 마음을 잊지 않기 위한 표시입니다.', '무엇을 써야 할지 모르겠지만 일단 시작해 보기로 했습니다. 작은 기록이라도 남겨 두면 다음 문장이 조금 더 쉬워질 것 같았습니다. 오늘의 기록은 그 마음을 잊지 않기 위한 표시입니다.', 'note', 'personal', 'free', 'cohort', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 1, unixepoch() - 86400 * 1),
   ('record-012', 'hyunjin-solo', 'hyunjin', 'stage-challenge-1', 'challenge-solo', NULL, NULL, '나만의 탐구: 기록의 힘', '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"기록은 거울이다"}]},{"type":"paragraph","content":[{"type":"text","text":"혼자서 탐구할 때 기록은 내가 지나온 생각을 다시 비추는 거울이 됩니다."}]},{"type":"paragraph","content":[{"type":"text","text":"쓰는 순간에는 알지 못했던 감정과 망설임이 나중에 읽을 때 더 선명하게 보입니다. 그 선명함이 다음 탐구를 열어줍니다."}]},{"type":"paragraph","content":[{"type":"text","text":"그래서 기록은 결과물이 아니라 다시 생각하게 만드는 장치라고 느낍니다. 이것이 나만의 탐구를 계속하게 하는 힘입니다."}]}]}', '기록은 거울이다 혼자서 탐구할 때 기록은 내가 지나온 생각을 다시 비추는 거울이 됩니다. 쓰는 순간에는 알지 못했던 감정과 망설임이 나중에 읽을 때 더 선명하게 보입니다. 그 선명함이 다음 탐구를 열어줍니다. 그래서 기록은 결과물이 아니라 다시 생각하게 만드는 장치라고 느낍니다. 이것이 나만의 탐구를 계속하게 하는 힘입니다.', 'article', 'challenge', 'weekly', 'public', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 15, unixepoch() - 86400 * 15),
  ('record-013', 'soyeon-bridge', 'soyeon', 'stage-bridge-1', NULL, NULL, NULL, '전환의 시기에 쓰는 메모', '이 시기가 불편한 이유를 곰곰이 적어 보니 변화 그 자체보다 방향을 놓칠까 봐 두려운 마음이 컸습니다. 두려움을 없애는 대신 문장으로 적어 두니 내가 무엇을 지키고 싶은지 조금 더 보였습니다.', '이 시기가 불편한 이유를 곰곰이 적어 보니 변화 그 자체보다 방향을 놓칠까 봐 두려운 마음이 컸습니다. 두려움을 없애는 대신 문장으로 적어 두니 내가 무엇을 지키고 싶은지 조금 더 보였습니다.', 'note', 'personal', 'free', 'cohort', 'question_only', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 26, unixepoch() - 86400 * 26),
  ('record-014', 'hana-question-record', 'hana', 'stage-challenge-1', NULL, NULL, NULL, '남겨두고 싶은 질문들', '탐색을 이어가면서 답보다 질문을 잘 간직하는 일이 더 중요하다는 생각이 커졌습니다. 질문은 곧바로 해결되지 않아도 나를 다시 움직이게 합니다. 그래서 이 기록은 해결 목록이 아니라 오래 남길 질문 목록에 가깝습니다.', '탐색을 이어가면서 답보다 질문을 잘 간직하는 일이 더 중요하다는 생각이 커졌습니다. 질문은 곧바로 해결되지 않아도 나를 다시 움직이게 합니다. 그래서 이 기록은 해결 목록이 아니라 오래 남길 질문 목록에 가깝습니다.', 'note', 'personal', 'free', 'public', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 12, unixepoch() - 86400 * 12),
  ('record-015', 'jiwon-collab', 'jiwon', 'stage-challenge-1', 'challenge-team', 'collab-unit-alpha', NULL, '팀 챌린지에 합류하며', '처음에는 각자가 다른 방향을 보고 있어서 조금 조심스러웠습니다. 하지만 서로의 기록을 읽고 질문을 주고받는 사이에 공통의 관심사가 보이기 시작했습니다. 다름을 바로 맞추기보다 먼저 듣는 태도가 중요하다는 것을 느꼈습니다.', '처음에는 각자가 다른 방향을 보고 있어서 조금 조심스러웠습니다. 하지만 서로의 기록을 읽고 질문을 주고받는 사이에 공통의 관심사가 보이기 시작했습니다. 다름을 바로 맞추기보다 먼저 듣는 태도가 중요하다는 것을 느꼈습니다.', 'note', 'collaboration', 'free', 'cohort', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 6, unixepoch() - 86400 * 6),
  ('record-016', 'minjun-solo', 'minjun', 'stage-challenge-1', NULL, NULL, NULL, '혼자서 생각한 것들', '팀 기록과는 별개로 혼자 있을 때 떠오르는 질문들을 따로 모아 보았습니다. 같이 탐구하는 시간과 혼자 생각하는 시간이 서로를 보완한다는 사실이 흥미로웠습니다.', '팀 기록과는 별개로 혼자 있을 때 떠오르는 질문들을 따로 모아 보았습니다. 같이 탐구하는 시간과 혼자 생각하는 시간이 서로를 보완한다는 사실이 흥미로웠습니다.', 'note', 'personal', 'free', 'cohort', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 14, unixepoch() - 86400 * 14),
   ('record-017', 'soyeon-writing', 'soyeon', 'stage-challenge-1', 'challenge-writing', NULL, NULL, '기록이란 무엇인가', '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"기록의 세 가지 역할"}]},{"type":"paragraph","content":[{"type":"text","text":"이 챌린지를 하면서 기록은 과거를 저장하는 일만은 아니라는 생각이 들었습니다."}]},{"type":"paragraph","content":[{"type":"text","text":"기록은 다음의 나에게 말을 거는 방식이기도 하고, 아직 이름 붙이지 못한 감정을 붙잡아 두는 방식이기도 했습니다."}]},{"type":"paragraph","content":[{"type":"text","text":"그리고 기록은 나 혼자만의 것이 아니라 누군가와 나누는 대화의 시작이 될 수도 있습니다. 이 깨달음이 가장 소중합니다."}]}]}', '기록의 세 가지 역할 이 챌린지를 하면서 기록은 과거를 저장하는 일만은 아니라는 생각이 들었습니다. 기록은 다음의 나에게 말을 거는 방식이기도 하고, 아직 이름 붙이지 못한 감정을 붙잡아 두는 방식이기도 했습니다. 그리고 기록은 나 혼자만의 것이 아니라 누군가와 나누는 대화의 시작이 될 수도 있습니다. 이 깨달음이 가장 소중합니다.', 'article', 'challenge', 'monthly', 'public', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 21, unixepoch() - 86400 * 21),
  ('record-018', 'hyunjin-reflection', 'hyunjin', 'stage-bridge-1', NULL, NULL, NULL, '중간 회고', '여기까지 오면서 내가 모른다고 말하는 방식이 달라졌습니다. 예전에는 모름이 막막함으로만 남았지만, 지금은 다음 질문의 출발점으로 남습니다. 그 변화를 기록으로 남겨 두고 싶었습니다.', '여기까지 오면서 내가 모른다고 말하는 방식이 달라졌습니다. 예전에는 모름이 막막함으로만 남았지만, 지금은 다음 질문의 출발점으로 남습니다. 그 변화를 기록으로 남겨 두고 싶었습니다.', 'article', 'personal', 'monthly', 'cohort', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 36, unixepoch() - 86400 * 36),
  ('record-019', 'jaemin-week1', 'jaemin', 'stage-challenge-1', NULL, NULL, NULL, '첫 주 메모', '첫 주가 지나고 나니 기록이 생각보다 부담스럽지 않다는 사실을 알게 되었습니다. 길게 쓰지 않아도 그날의 생각을 붙잡아 두는 것만으로 충분했습니다.', '첫 주가 지나고 나니 기록이 생각보다 부담스럽지 않다는 사실을 알게 되었습니다. 길게 쓰지 않아도 그날의 생각을 붙잡아 두는 것만으로 충분했습니다.', 'note', 'personal', 'weekly', 'cohort', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 7, unixepoch() - 86400 * 7),
  ('record-020', 'hana-draft', 'hana', 'stage-challenge-1', NULL, NULL, NULL, '[초안] 아직 정리되지 않은 생각', '문장이 아직 매끄럽지 않지만 지금의 흐릿함도 남겨 두고 싶었습니다. 나중에 다시 읽으면 어디에서 머뭇거렸는지 더 잘 보일 것 같습니다.', '문장이 아직 매끄럽지 않지만 지금의 흐릿함도 남겨 두고 싶었습니다. 나중에 다시 읽으면 어디에서 머뭇거렸는지 더 잘 보일 것 같습니다.', 'note', 'personal', 'free', 'draft', 'closed', 0, 'clean', 'cohort-2026', unixepoch() - 3600 * 12, unixepoch() - 3600 * 12),
  ('record-026', 'jiwon-private', 'jiwon', 'stage-challenge-1', NULL, NULL, NULL, '나만 간직하는 기록', '아직 누구에게 보여줄 준비는 안 되었지만 이 생각은 분명히 중요한 것 같습니다. 나중에 다시 꺼내 볼 수 있도록 여기에 남겨 둡니다. 완성된 문장은 아니어도 지금의 감각을 잊고 싶지 않았습니다.', '아직 누구에게 보여줄 준비는 안 되었지만 이 생각은 분명히 중요한 것 같습니다. 나중에 다시 꺼내 볼 수 있도록 여기에 남겨 둡니다. 완성된 문장은 아니어도 지금의 감각을 잊고 싶지 않았습니다.', 'note', 'personal', 'free', 'private', 'closed', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 4, unixepoch() - 86400 * 4),
  ('record-021', 'soyeon-short', 'soyeon', 'stage-challenge-1', NULL, NULL, NULL, '오늘의 한 줄', '탐구는 정답을 서둘러 고르는 일이 아니라 더 오래 남는 질문을 찾는 일에 가깝다.', '탐구는 정답을 서둘러 고르는 일이 아니라 더 오래 남는 질문을 찾는 일에 가깝다.', 'note', 'personal', 'sprint', 'cohort', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 2, unixepoch() - 86400 * 2),
   ('record-022', 'minjun-article', 'minjun', 'stage-challenge-1', 'challenge-team', 'collab-unit-alpha', 'record-010', '팀 탐구의 전환점', '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"다름을 자원으로 읽기"}]},{"type":"paragraph","content":[{"type":"text","text":"세 번의 팀 미팅을 지나며 각자의 다름이 걸림돌이 아니라 자원이라는 사실을 더 분명히 알게 되었습니다."}]},{"type":"paragraph","content":[{"type":"text","text":"누군가의 메모가 다른 사람의 질문을 열고, 그 질문이 다시 다음 기록을 만들었습니다. 이 순환이 팀 탐구의 생명력입니다."}]},{"type":"paragraph","content":[{"type":"text","text":"함께 쓰는 탐구는 한 사람의 확신보다 여러 사람의 망설임을 견디는 일에 가까웠습니다. 그 망설임 속에서 가장 깊은 질문이 나타났습니다."}]}]}', '다름을 자원으로 읽기 세 번의 팀 미팅을 지나며 각자의 다름이 걸림돌이 아니라 자원이라는 사실을 더 분명히 알게 되었습니다. 누군가의 메모가 다른 사람의 질문을 열고, 그 질문이 다시 다음 기록을 만들었습니다. 이 순환이 팀 탐구의 생명력입니다. 함께 쓰는 탐구는 한 사람의 확신보다 여러 사람의 망설임을 견디는 일에 가까웠습니다. 그 망설임 속에서 가장 깊은 질문이 나타났습니다.', 'article', 'collaboration', 'monthly', 'public', 'open', 1, 'clean', 'cohort-2026', unixepoch() - 86400 * 16, unixepoch() - 86400 * 16),
  ('record-023', 'jiwon-question', 'jiwon', 'stage-challenge-1', NULL, NULL, NULL, '질문이 생겼습니다', '이번 주에는 학습에서 실패가 어떤 역할을 하는지 계속 마음에 남았습니다. 실패를 피해야 하는 일로만 보면 놓치는 것이 있는 것 같습니다. 실패를 다시 읽는 방식이 필요하다는 생각이 들었습니다.', '이번 주에는 학습에서 실패가 어떤 역할을 하는지 계속 마음에 남았습니다. 실패를 피해야 하는 일로만 보면 놓치는 것이 있는 것 같습니다. 실패를 다시 읽는 방식이 필요하다는 생각이 들었습니다.', 'note', 'personal', 'free', 'public', 'question_only', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 10, unixepoch() - 86400 * 10),
  ('record-024', 'hyunjin-sprint2', 'hyunjin', 'stage-challenge-1', 'challenge-team', 'collab-unit-alpha', 'record-007', '스프린트 기록: 두 번째 주', '두 번째 주에도 여전히 불확실함은 남아 있었지만, 그 불확실함을 설명하는 말이 조금 더 늘어났습니다. 우리는 방향을 정하기 전에 서로가 어디에 서 있는지 먼저 확인하기로 했습니다.', '두 번째 주에도 여전히 불확실함은 남아 있었지만, 그 불확실함을 설명하는 말이 조금 더 늘어났습니다. 우리는 방향을 정하기 전에 서로가 어디에 서 있는지 먼저 확인하기로 했습니다.', 'note', 'collaboration', 'sprint', 'cohort', 'open', 0, 'clean', 'cohort-2026', unixepoch() - 86400 * 11, unixepoch() - 86400 * 11),
   ('record-025', 'hana-prelude-end', 'hana', 'stage-challenge-1', NULL, NULL, 'record-003', '탐색의 시작을 마치며', '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"질문의 변화"}]},{"type":"paragraph","content":[{"type":"text","text":"처음의 질문과 지금의 질문은 많이 달라졌습니다."}]},{"type":"paragraph","content":[{"type":"text","text":"예전에는 잘하고 싶다는 막연한 마음뿐이었다면, 이제는 무엇을 왜 오래 들여다보고 싶은지 조금 더 말할 수 있습니다."}]},{"type":"paragraph","content":[{"type":"text","text":"질문의 변화 자체가 이 구간에서 내가 얻은 가장 큰 흔적입니다. 다음 구간에서는 이 질문을 더 깊이 탐구하고 싶습니다."}]}]}', '질문의 변화 처음의 질문과 지금의 질문은 많이 달라졌습니다. 예전에는 잘하고 싶다는 막연한 마음뿐이었다면, 이제는 무엇을 왜 오래 들여다보고 싶은지 조금 더 말할 수 있습니다. 질문의 변화 자체가 이 구간에서 내가 얻은 가장 큰 흔적입니다. 다음 구간에서는 이 질문을 더 깊이 탐구하고 싶습니다.', 'article', 'personal', 'monthly', 'public', 'open', 1, 'clean', 'cohort-2026', unixepoch() - 86400 * 61, unixepoch() - 86400 * 61);

INSERT INTO tags (id, name, slug, description, color, created_by, created_at, updated_at) VALUES
  ('tag-001', '기술', 'tech', '기술 관련 기록과 탐구', '#146C94', 'hana', unixepoch() - 86400 * 30, unixepoch() - 86400 * 30),
  ('tag-002', '회고', 'retrospect', '반성과 성찰의 기록', '#7C3AED', 'hana', unixepoch() - 86400 * 30, unixepoch() - 86400 * 30),
  ('tag-003', '협업', 'collaboration', '함께 탐구하는 경험과 배움', '#EC4899', 'minjun', unixepoch() - 86400 * 28, unixepoch() - 86400 * 28),
  ('tag-004', '질문', 'question', '오래 붙드는 질문과 탐구', '#F59E0B', 'jiwon', unixepoch() - 86400 * 25, unixepoch() - 86400 * 25),
  ('tag-005', '기록의 의미', 'meaning-of-writing', '기록을 남기는 이유와 역할', '#10B981', 'soyeon', unixepoch() - 86400 * 22, unixepoch() - 86400 * 22),
  ('tag-006', '전환', 'transition', '구간의 전환과 변화', '#8B5CF6', 'hyunjin', unixepoch() - 86400 * 20, unixepoch() - 86400 * 20),
  ('tag-007', '학습', 'learning', '학습의 과정과 의미', '#06B6D4', 'jaemin', unixepoch() - 86400 * 18, unixepoch() - 86400 * 18);

INSERT INTO record_tags (record_id, tag_id, created_at) VALUES
  ('record-002', 'tag-001', unixepoch() - 86400 * 7),
  ('record-002', 'tag-004', unixepoch() - 86400 * 7),
  ('record-005', 'tag-003', unixepoch() - 86400 * 4),
  ('record-005', 'tag-004', unixepoch() - 86400 * 4),
  ('record-008', 'tag-006', unixepoch() - 86400 * 31),
  ('record-008', 'tag-002', unixepoch() - 86400 * 31),
  ('record-012', 'tag-005', unixepoch() - 86400 * 15),
  ('record-012', 'tag-007', unixepoch() - 86400 * 15),
  ('record-017', 'tag-005', unixepoch() - 86400 * 21),
  ('record-022', 'tag-003', unixepoch() - 86400 * 16),
  ('record-022', 'tag-006', unixepoch() - 86400 * 16),
  ('record-025', 'tag-004', unixepoch() - 86400 * 61);

INSERT INTO questions (id, record_id, content, direction, is_open, created_at) VALUES
  ('q-001', 'record-001', '탐색을 시작하면서 가장 먼저 떠오른 질문은 무엇이었나요?', 'outward', 1, unixepoch() - 86400 * 8),
  ('q-002', 'record-001', '완성되지 않은 상태를 견딜 수 있게 해 준 것은 무엇이었나요?', 'inward', 1, unixepoch() - 86400 * 8),
  ('q-003', 'record-002', '혼자서 탐구할 때 외로움이 지나가도록 돕는 것은 무엇인가요?', 'outward', 1, unixepoch() - 86400 * 6),
  ('q-004', 'record-006', '학습은 결국 무엇을 바꾸는 일이라고 생각하시나요?', 'outward', 1, unixepoch() - 86400 * 3),
  ('q-005', 'record-008', '전환점에서 가장 크게 달라진 것은 무엇이었나요?', 'inward', 1, unixepoch() - 86400 * 30),
  ('q-006', 'record-012', '기록이 나를 다시 보게 만든 순간이 있었나요?', 'outward', 1, unixepoch() - 86400 * 14),
  ('q-007', 'record-014', '답보다 질문을 오래 들고 간다는 것은 어떤 태도일까요?', 'outward', 1, unixepoch() - 86400 * 11),
  ('q-008', 'record-017', '기록이 미래를 준비하는 일이라는 말에 어떻게 답하고 싶나요?', 'outward', 1, unixepoch() - 86400 * 20),
  ('q-009', 'record-022', '팀 안에서 다름이 강점이 되었던 순간은 언제였나요?', 'outward', 1, unixepoch() - 86400 * 15),
  ('q-010', 'record-023', '학습에서 실패를 다시 읽는 일은 왜 중요할까요?', 'outward', 1, unixepoch() - 86400 * 9),
  ('q-011', 'record-025', '처음 질문과 지금 질문은 어떻게 달라졌나요?', 'inward', 1, unixepoch() - 86400 * 60),
  ('q-012', 'record-003', '진짜 궁금한 것을 찾는 과정에서 어떤 장면이 단서가 되었나요?', 'outward', 1, unixepoch() - 86400 * 4);

INSERT INTO self_answers (id, question_id, author_id, content, created_at, updated_at) VALUES
  ('sa-001', 'q-001', 'hana', '처음 떠오른 질문은 내가 무엇을 잘하고 싶은지가 아니라 무엇을 오래 붙들 수 있는지에 관한 것이었습니다. 그 질문을 인정하자 탐색이 조금 덜 막막해졌습니다.', unixepoch() - 86400 * 7, unixepoch() - 86400 * 7),
  ('sa-002', 'q-002', 'hana', '완성되지 않은 상태를 견디게 한 것은 작은 기록이었습니다. 짧은 메모라도 남겨 두면 다음 날 다시 이어갈 수 있었습니다.', unixepoch() - 86400 * 6, unixepoch() - 86400 * 6),
  ('sa-003', 'q-005', 'hana', '전환점에서 가장 크게 달라진 것은 모른다는 상태를 두려움만으로 보지 않게 되었다는 점입니다. 이제는 그 상태를 다음 질문의 시작으로 읽을 수 있습니다.', unixepoch() - 86400 * 28, unixepoch() - 86400 * 28);

INSERT INTO responses (
  id,
  record_id,
  question_id,
  author_id,
  type,
  content,
  visibility,
  moderation_status,
  created_at,
  updated_at
) VALUES
  ('resp-001', 'record-001', 'q-001', 'jiwon', 'resonance', '막막함을 시작점으로 읽어낸 문장이 많이 와닿았습니다. 저도 처음에는 모른다는 사실이 부끄러웠는데, 지금은 그 모름이 질문의 자리라고 느끼고 있습니다.', 'cohort', 'clean', unixepoch() - 86400 * 7, unixepoch() - 86400 * 7),
  ('resp-002', 'record-001', 'q-001', 'minjun', 'question', '막연한 답답함을 따라가 보기로 결심하게 만든 장면이 있었나요?', 'cohort', 'clean', unixepoch() - 86400 * 6, unixepoch() - 86400 * 6),
  ('resp-003', 'record-002', 'q-003', 'soyeon', 'connection', '저도 혼자 탐구할 때 기록이 가장 든든한 동반자였습니다. 쓰는 행위가 외로움을 없애지는 않지만, 외로움을 설명할 언어를 만들어 주었습니다.', 'cohort', 'clean', unixepoch() - 86400 * 5, unixepoch() - 86400 * 5),
  ('resp-004', 'record-006', 'q-004', 'hyunjin', 'resonance', '학습이 무엇을 바꾸는가라는 질문이 오래 남습니다. 저는 요즘 학습이 나를 대하는 말투를 바꾸는 일일 수도 있다고 생각합니다.', 'cohort', 'clean', unixepoch() - 86400 * 2, unixepoch() - 86400 * 2),
  ('resp-005', 'record-012', 'q-006', 'jaemin', 'resonance', '기록이 거울처럼 느껴진다는 표현에 많이 공감했습니다. 저는 지난 메모를 다시 읽을 때 그날의 망설임이 더 선명하게 보이곤 했습니다.', 'cohort', 'clean', unixepoch() - 86400 * 12, unixepoch() - 86400 * 12),
  ('resp-006', 'record-014', 'q-007', 'jiwon', 'suggestion', '질문을 오래 들고 가기 어렵다면 같은 질문을 다른 날의 문장으로 다시 적어 보는 것도 좋았습니다. 질문의 결이 조금씩 바뀌는 것이 보였습니다.', 'cohort', 'clean', unixepoch() - 86400 * 10, unixepoch() - 86400 * 10),
  ('resp-007', 'record-017', 'q-008', 'minjun', 'question', '미래를 준비하는 기록이라면, 지금의 나는 무엇을 잊지 않기 위해 쓰고 있는 걸까요?', 'cohort', 'clean', unixepoch() - 86400 * 18, unixepoch() - 86400 * 18),
  ('resp-008', 'record-022', 'q-009', 'soyeon', 'connection', '저도 팀 안에서 다름이 걸림돌이 아니라 자원이 되는 순간을 경험했습니다. 서로 다른 문장이 한 질문을 더 넓게 만들어 주었습니다.', 'cohort', 'clean', unixepoch() - 86400 * 14, unixepoch() - 86400 * 14),
  ('resp-009', 'record-023', 'q-010', 'hyunjin', 'resonance', '실패를 다시 읽는 일의 필요성을 저도 자주 느낍니다. 지나간 일을 지우지 않고 다시 보는 태도가 다음 시도를 다르게 만든다고 생각합니다.', 'cohort', 'clean', unixepoch() - 86400 * 8, unixepoch() - 86400 * 8),
  ('resp-010', 'record-001', NULL, 'soyeon', 'resonance', '처음의 흐릿한 마음을 솔직하게 남겨 주셔서 좋았습니다. 정리되지 않은 상태가 오히려 더 진하게 전달되었습니다.', 'cohort', 'clean', unixepoch() - 86400 * 5, unixepoch() - 86400 * 5),
  ('resp-011', 'record-008', 'q-005', 'jiwon', 'connection', '전환을 서서히 바뀌는 시선이라고 표현한 부분이 인상 깊었습니다. 저도 급격한 변화보다 문장을 읽는 방식이 달라졌을 때 전환을 느꼈습니다.', 'cohort', 'clean', unixepoch() - 86400 * 27, unixepoch() - 86400 * 27),
  ('resp-012', 'record-025', 'q-011', 'minjun', 'question', '질문의 변화가 가장 크게 느껴졌던 순간은 언제였나요?', 'cohort', 'clean', unixepoch() - 86400 * 58, unixepoch() - 86400 * 58),
  ('resp-013', 'record-003', 'q-012', 'jaemin', 'suggestion', '저는 진짜 궁금한 것을 찾기 위해 먼저 마음이 움직이지 않는 질문들을 적어 보고 지웠습니다. 남는 질문이 의외로 또렷했습니다.', 'cohort', 'clean', unixepoch() - 86400 * 3, unixepoch() - 86400 * 3),
  ('resp-014', 'record-005', NULL, 'jiwon', 'resonance', '함께 읽을 때 보이는 장면이 달라진다는 말이 기억에 남습니다. 저도 누군가의 시선이 들어올 때 기록이 넓어진다고 느낍니다.', 'cohort', 'clean', unixepoch() - 86400 * 1, unixepoch() - 86400 * 1),
  ('resp-015', 'record-009', NULL, 'hyunjin', 'connection', '모르는 지점을 더 선명하게 본다는 문장이 제 경험과도 닮아 있습니다. 깊어지는 탐구는 답을 많이 아는 일이 아니라 질문을 더 정확히 보는 일 같았습니다.', 'cohort', 'clean', unixepoch() - 86400 * 4, unixepoch() - 86400 * 4);

INSERT INTO sentences (id, record_id, saved_by_id, content, reason, paragraph_index, created_at) VALUES
  ('sent-001', 'record-001', 'jiwon', '완성된 문장이 없어도 질문은 자랄 수 있다는 사실을 조금씩 알게 되었습니다.', '질문을 두려워하지 않게 만드는 문장이라 저장했습니다.', 0, unixepoch() - 86400 * 7),
  ('sent-002', 'record-002', 'soyeon', '기록이 나를 다시 불러 세운다는 사실이 든든했습니다.', '기록의 역할을 간결하게 보여 주는 문장입니다.', 0, unixepoch() - 86400 * 5),
  ('sent-003', 'record-006', 'hyunjin', '학습이 결국 무엇을 바꾸는가라는 질문이었습니다.', '구간 전체를 관통하는 질문처럼 느껴졌습니다.', 0, unixepoch() - 86400 * 2),
  ('sent-004', 'record-008', 'minjun', '전환은 갑작스러운 도약보다 서서히 바뀌는 시선에 더 가까웠습니다.', '전환의 감각을 차분하게 설명해 준 문장입니다.', 0, unixepoch() - 86400 * 28),
  ('sent-005', 'record-012', 'jaemin', '기록은 결과물이 아니라 다시 생각하게 만드는 장치라고 느낍니다.', '기록의 기능을 새롭게 이해하게 된 문장입니다.', 0, unixepoch() - 86400 * 13),
  ('sent-006', 'record-017', 'hana', '기록은 다음의 나에게 말을 거는 방식이기도 했습니다.', '기록을 남기는 이유를 오래 떠올리게 하는 문장입니다.', 0, unixepoch() - 86400 * 19),
  ('sent-007', 'record-022', 'soyeon', '각자의 다름이 걸림돌이 아니라 자원이라는 사실을 더 분명히 알게 되었습니다.', '협업의 태도를 잘 드러내는 문장이라 저장했습니다.', 0, unixepoch() - 86400 * 15),
  ('sent-008', 'record-025', 'jiwon', '질문의 변화 자체가 이 구간에서 내가 얻은 가장 큰 흔적입니다.', '성장을 비교가 아니라 질문의 변화로 말하는 방식이 좋았습니다.', 0, unixepoch() - 86400 * 59),
  ('sent-009', 'record-014', 'minjun', '질문은 곧바로 해결되지 않아도 나를 다시 움직이게 합니다.', '질문을 붙드는 태도를 잘 보여 줍니다.', 0, unixepoch() - 86400 * 10),
  ('sent-010', 'record-009', 'jaemin', '모르는 지점을 더 선명하게 보는 일이었습니다.', '탐구의 깊이를 설명하는 표현이 인상적이었습니다.', 0, unixepoch() - 86400 * 12),
  ('sent-011', 'record-021', 'hyunjin', '탐구는 정답을 서둘러 고르는 일이 아니라 더 오래 남는 질문을 찾는 일에 가깝다.', '한 문장으로 탐구의 태도를 또렷하게 보여 줍니다.', 0, unixepoch() - 86400 * 2),
  ('sent-012', 'record-018', 'hana', '이제는 그 상태를 다음 질문의 시작으로 읽을 수 있습니다.', '모름을 받아들이는 태도의 변화가 잘 담겨 있습니다.', 0, unixepoch() - 86400 * 35);

INSERT INTO templates (
  id,
  name,
  description,
  prompt_body,
  context,
  form,
  rhythm,
  stage_kind,
  active,
  created_at,
  updated_at
) VALUES
  ('tmpl-001', '오늘의 한 줄', '오늘 가장 오래 남은 문장을 한 줄로 적는 템플릿입니다.', '오늘 탐구에서 가장 오래 남은 문장을 한 줄로 적어 보세요.', 'personal', 'note', 'sprint', 'prelude', 1, unixepoch() - 86400 * 30, unixepoch() - 86400 * 30),
  ('tmpl-002', '이번 주 메모', '한 주 동안의 탐구 흐름을 자유롭게 정리하는 템플릿입니다.', '이번 주에 발견한 것, 오래 남은 질문, 다음에 더 보고 싶은 장면을 적어 보세요.', 'personal', 'note', 'weekly', NULL, 1, unixepoch() - 86400 * 30, unixepoch() - 86400 * 30),
  ('tmpl-003', '스프린트 기록', '짧은 탐구 기간의 흐름을 남기는 템플릿입니다.', '이번 스프린트에서 시도한 것, 흔들린 지점, 다음에 이어갈 질문을 적어 보세요.', 'personal', 'note', 'sprint', NULL, 1, unixepoch() - 86400 * 30, unixepoch() - 86400 * 30),
  ('tmpl-004', '구간 회고', '구간을 마무리하며 질문의 변화를 돌아보는 템플릿입니다.', '이 구간을 마치며 처음 질문과 지금 질문이 어떻게 달라졌는지, 가장 크게 남은 장면은 무엇인지 적어 보세요.', 'personal', 'article', 'monthly', NULL, 1, unixepoch() - 86400 * 30, unixepoch() - 86400 * 30),
  ('tmpl-005', '개인 회고', '나만의 탐구를 길게 돌아보는 글 템플릿입니다.', '이 기간 동안 무엇을 탐구했고 무엇을 놓쳤으며 다음에는 무엇을 붙들고 싶은지 적어 보세요.', 'personal', 'article', 'monthly', NULL, 1, unixepoch() - 86400 * 30, unixepoch() - 86400 * 30),
  ('tmpl-006', '함께하는 탐색 기록', '협업 유닛이 공동의 흐름을 남길 때 사용하는 템플릿입니다.', '함께 본 장면, 서로 다른 관점, 지금 함께 붙드는 질문, 다음에 확인할 것을 적어 보세요.', 'collaboration', 'note', 'free', NULL, 1, unixepoch() - 86400 * 30, unixepoch() - 86400 * 30),
  ('tmpl-007', '자유 형식', '형식 없이 떠오르는 생각을 적는 템플릿입니다.', '정리되지 않은 생각이어도 괜찮습니다. 지금 마음에 남아 있는 것을 자유롭게 적어 보세요.', 'personal', 'note', 'free', NULL, 1, unixepoch() - 86400 * 30, unixepoch() - 86400 * 30),
  ('tmpl-008', '챌린지 일지', '챌린지 과정에서 생기는 질문과 시도를 기록하는 템플릿입니다.', '오늘 챌린지에서 시도한 것, 예상과 달랐던 점, 새롭게 생긴 질문을 적어 보세요.', 'challenge', 'note', 'sprint', 'challenge', 1, unixepoch() - 86400 * 30, unixepoch() - 86400 * 30);

INSERT INTO collective_memories (
  id,
  stage_id,
  summary,
  carry_forward_question,
  status,
  cohort,
  created_at,
  updated_at
) VALUES
  ('memory-bridge-1', 'stage-bridge-1', '첫 번째 전환 구간에서 학습자들은 막막함을 없애기보다 읽는 법을 배우기 시작했습니다. 많은 기록이 완성보다 질문의 지속을 더 중요하게 다루었고, 모른다는 상태가 다음 탐구의 출발점이 될 수 있다는 감각을 나누었습니다. 이 구간의 공통된 결은 더 좋은 질문을 오래 붙드는 태도였습니다.', '다음 구간에서 우리는 어떤 질문을 함께 더 오래 붙들고 싶나요?', 'published', 'cohort-2026', unixepoch() - 86400 * 20, unixepoch() - 86400 * 20),
  ('memory-prelude-1', 'stage-prelude', '탐색의 시작 구간은 아직 진행 중이지만, 학습자들은 이미 질문을 서둘러 정리하지 않는 태도를 익혀 가고 있습니다. 작은 메모와 짧은 문장이 각자의 시작을 지탱하고 있습니다.', NULL, 'draft', 'cohort-2026', unixepoch() - 86400 * 4, unixepoch() - 86400 * 4);

INSERT INTO memory_questions (memory_id, question_id, position) VALUES
  ('memory-bridge-1', 'q-005', 0),
  ('memory-bridge-1', 'q-011', 1);

INSERT INTO memory_sentences (memory_id, sentence_id, position) VALUES
  ('memory-bridge-1', 'sent-004', 0),
  ('memory-bridge-1', 'sent-008', 1),
  ('memory-bridge-1', 'sent-011', 2);

INSERT INTO memory_records (memory_id, record_id, position) VALUES
  ('memory-bridge-1', 'record-008', 0),
  ('memory-bridge-1', 'record-013', 1),
  ('memory-bridge-1', 'record-018', 2),
  ('memory-bridge-1', 'record-025', 3);

INSERT INTO notifications (
  id,
  recipient_id,
  type,
  title,
  content,
  record_id,
  question_id,
  is_read,
  created_at
) VALUES
  ('notif-001', 'hana', 'response', '이하나님의 기록에 공명이 도착했습니다', '박지원님이 탐색의 첫 번째 노트에 공명을 남겼습니다.', 'record-001', NULL, 0, unixepoch() - 86400 * 7),
  ('notif-002', 'hana', 'response', '이하나님의 기록에 질문이 남겨졌습니다', '최민준님이 탐색의 첫 번째 노트에 질문을 남겼습니다.', 'record-001', 'q-001', 0, unixepoch() - 86400 * 6),
  ('notif-003', 'hana', 'response', '이하나님의 질문에 응답이 도착했습니다', '박지원님이 전환점에서 돌아보기의 질문에 연결을 남겼습니다.', 'record-008', 'q-005', 1, unixepoch() - 86400 * 27),
  ('notif-004', 'jiwon', 'response', '박지원님의 기록에 연결이 남겨졌습니다', '김현진님이 깊어지는 탐구에 연결점을 남겼습니다.', 'record-009', NULL, 0, unixepoch() - 86400 * 4),
  ('notif-005', 'soyeon', 'response', '정소연님의 기록에 공명이 도착했습니다', '김현진님이 지금 나에게 남겨진 질문에 공명을 남겼습니다.', 'record-006', 'q-004', 1, unixepoch() - 86400 * 2),
  ('notif-006', 'minjun', 'response', '최민준님의 기록에 연결이 남겨졌습니다', '정소연님이 팀과 함께 발견한 것들에 연결점을 남겼습니다.', 'record-005', NULL, 0, unixepoch() - 86400 * 1),
  ('notif-007', 'hana', 'memory', '첫 번째 전환 구간의 공동 기억이 발행되었습니다', '여러 기록과 문장이 하나의 공동 기억으로 엮였습니다.', NULL, NULL, 1, unixepoch() - 86400 * 19),
  ('notif-008', 'hyunjin', 'response', '김현진님의 질문에 응답이 도착했습니다', '오재민님이 나만의 탐구: 기록의 힘에 공명을 남겼습니다.', 'record-012', 'q-006', 0, unixepoch() - 86400 * 12);

INSERT INTO curation_slots (
  id,
  slot_type,
  target_id,
  target_type,
  position,
  pinned,
  hidden,
  created_at,
  updated_at
) VALUES
  ('slot-001', 'scene', 'record-001', 'record', 0, 1, 0, unixepoch() - 86400 * 1, unixepoch() - 86400 * 1),
  ('slot-002', 'scene', 'record-022', 'record', 1, 0, 0, unixepoch() - 86400 * 1, unixepoch() - 86400 * 1),
  ('slot-003', 'question', 'q-004', 'question', 0, 1, 0, unixepoch() - 86400 * 1, unixepoch() - 86400 * 1),
  ('slot-004', 'sentence', 'sent-011', 'sentence', 0, 1, 0, unixepoch() - 86400 * 1, unixepoch() - 86400 * 1),
  ('slot-005', 'learner', 'hana', 'learner', 0, 0, 0, unixepoch() - 86400 * 1, unixepoch() - 86400 * 1);

INSERT INTO audit_logs (
  id,
  actor_id,
  target_type,
  target_id,
  action,
  before_state,
  after_state,
  created_at
) VALUES
  ('audit-001', 'hana', 'record', 'record-001', 'created', NULL, '{"slug":"first-note"}', unixepoch() - 86400 * 9),
  ('audit-002', 'minjun', 'record', 'record-005', 'created', NULL, '{"slug":"minjun-collab"}', unixepoch() - 86400 * 4),
  ('audit-003', 'hana', 'record', 'record-008', 'created', NULL, '{"slug":"hana-reflection"}', unixepoch() - 86400 * 31),
  ('audit-004', 'hana', 'record', 'record-025', 'created', NULL, '{"slug":"hana-prelude-end"}', unixepoch() - 86400 * 61),
  ('audit-005', 'soyeon', 'record', 'record-017', 'created', NULL, '{"slug":"soyeon-writing"}', unixepoch() - 86400 * 21),
  ('audit-006', 'jiwon', 'record', 'record-009', 'created', NULL, '{"slug":"jiwon-deep"}', unixepoch() - 86400 * 13);

INSERT INTO settings (id, key, value, updated_at) VALUES
  ('setting-001', 'home_show_scenes', 'true', unixepoch()),
  ('setting-002', 'home_show_questions', 'true', unixepoch()),
  ('setting-003', 'home_show_sentences', 'true', unixepoch()),
  ('setting-004', 'home_show_learners', 'true', unixepoch()),
  ('setting-005', 'default_visibility', 'cohort', unixepoch()),
  ('setting-006', 'search_enabled', 'true', unixepoch()),
   ('setting-007', 'templates_policy', 'optional', unixepoch());

-- QA FIXTURES
INSERT INTO stages (
  id, name, slug, type, status, description, accent_tone, "order",
  start_date, end_date, is_current, hero_content, cohort, created_at, updated_at
) VALUES (
  'stage-test-closed',
  '테스트 종료 구간',
  'test-closed-stage',
  'bridge',
  'closed',
  'QA용 종료 구간입니다.',
  'bridge',
  99,
  unixepoch() - 86400 * 3,
  unixepoch() - 86400,
  0,
  'QA 종료 상태 검증용 구간',
  'cohort-2026',
  unixepoch() - 86400 * 3,
  unixepoch() - 86400 * 2
);

INSERT INTO records (
  id,
  slug,
  author_id,
  stage_id,
  challenge_id,
  collaboration_unit_id,
  linked_record_id,
  title,
  content,
  content_text,
  format,
  type,
  rhythm,
  visibility,
  response_preference,
  is_featured,
  moderation_status,
  cohort,
  created_at,
  updated_at
) VALUES (
  'record-test-timeline',
  'test-record-with-timeline',
  'hana',
  'stage-test-closed',
  NULL,
  NULL,
  NULL,
  '타임라인 검증용 기록',
  'QA에서 질문/자가응답 타임라인을 검증하기 위한 기록입니다.',
  'QA에서 질문/자가응답 타임라인을 검증하기 위한 기록입니다.',
  'note',
  'personal',
  'weekly',
  'cohort',
  'open',
  0,
  'clean',
  'cohort-2026',
  unixepoch() - 7200,
  unixepoch() - 1800
);

INSERT INTO questions (id, record_id, content, direction, is_open, created_at, updated_at, closed_at) VALUES
  (
    'q-test-timeline-001',
    'record-test-timeline',
    '이 구간에서 다음으로 가져갈 질문은 무엇인가요?',
    'outward',
    0,
    unixepoch() - 7100,
    unixepoch() - 3500,
    unixepoch() - 3400
  );

INSERT INTO self_answers (id, question_id, author_id, content, created_at, updated_at) VALUES
  (
    'sa-test-timeline-001',
    'q-test-timeline-001',
    'hana',
    '첫 번째 자기답변입니다. 아직 문장이 짧아도 괜찮다고 적어 둡니다.',
    unixepoch() - 6800,
    unixepoch() - 6800
  ),
  (
    'sa-test-timeline-002',
    'q-test-timeline-001',
    'hana',
    '두 번째 자기답변입니다. 질문의 결을 더 또렷하게 남깁니다.',
    unixepoch() - 3200,
    unixepoch() - 3200
  );

INSERT INTO responses (
  id,
  record_id,
  question_id,
  author_id,
  type,
  content,
  visibility,
  moderation_status,
  created_at,
  updated_at
) VALUES (
  'resp-test-timeline-001',
  'record-test-timeline',
  'q-test-timeline-001',
  'jiwon',
  'question',
  '이 질문을 다음 구간에서 어떻게 다시 확인해 보고 싶으신가요?',
  'cohort',
  'clean',
  unixepoch() - 3000,
  unixepoch() - 3000
);

INSERT INTO record_links (id, source_record_id, target_record_id, link_type, quoted_text, created_at) VALUES
  (
    'rl-test-timeline-001',
    'record-test-timeline',
    'record-001',
    'expansion',
    '질문은 자랄 수 있다',
    unixepoch() - 2500
  ),
  (
    'rl-test-timeline-002',
    'record-test-timeline',
    'record-002',
    'reference',
    '혼자서 탐구를 이어가기',
    unixepoch() - 2400
  );

INSERT INTO question_carry_overs (
  id,
  original_question_id,
  new_question_id,
  from_stage_id,
  to_stage_id,
  carried_at
) VALUES (
  'co-test-timeline-001',
  'q-test-timeline-001',
  NULL,
  'stage-challenge-1',
  'stage-test-closed',
  unixepoch() - 2000
);

-- record_participants 샘플 데이터
-- 협업 기록에 참여자 추가 (작성자 본인 제외)
INSERT OR IGNORE INTO record_participants (record_id, participant_user_id, added_by_id, role, created_at) VALUES
  ('record-005', 'jiwon', 'minjun', 'coauthor', unixepoch() - 86400 * 4),
  ('record-005', 'soyeon', 'minjun', 'coauthor', unixepoch() - 86400 * 4),
  ('record-022', 'jiwon', 'minjun', 'companion', unixepoch() - 86400 * 16),
  ('record-022', 'soyeon', 'minjun', 'companion', unixepoch() - 86400 * 16),
  ('record-022', 'hyunjin', 'minjun', 'companion', unixepoch() - 86400 * 16),
  ('record-010', 'jaemin', 'minjun', 'mentor', unixepoch() - 86400 * 2);

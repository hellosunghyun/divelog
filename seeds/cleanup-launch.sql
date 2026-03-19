BEGIN TRANSACTION;

DELETE FROM curation_slots
WHERE id IN ('slot-001', 'slot-002', 'slot-003', 'slot-004', 'slot-005')
   OR target_id IN ('record-001', 'record-022', 'q-004', 'sent-011', 'hana');

DELETE FROM notifications
WHERE id IN (
  'notif-001', 'notif-002', 'notif-003', 'notif-004',
  'notif-005', 'notif-006', 'notif-007', 'notif-008'
)
   OR recipient_id IN ('hana', 'jiwon', 'minjun', 'soyeon', 'hyunjin', 'jaemin')
   OR actor_id IN ('hana', 'jiwon', 'minjun', 'soyeon', 'hyunjin', 'jaemin')
   OR record_id IN (
     'record-001', 'record-002', 'record-003', 'record-004', 'record-005', 'record-006',
     'record-007', 'record-008', 'record-009', 'record-010', 'record-011', 'record-012',
     'record-013', 'record-014', 'record-015', 'record-016', 'record-017', 'record-018',
     'record-019', 'record-020', 'record-021', 'record-022', 'record-023', 'record-024',
     'record-025', 'record-026', 'record-test-timeline'
   )
   OR question_id IN (
     'q-001', 'q-002', 'q-003', 'q-004', 'q-005', 'q-006', 'q-007',
     'q-008', 'q-009', 'q-010', 'q-011', 'q-012', 'q-test-timeline-001'
   );

DELETE FROM audit_logs
WHERE id IN ('audit-001', 'audit-002', 'audit-003', 'audit-004', 'audit-005', 'audit-006')
   OR actor_id IN ('hana', 'jiwon', 'minjun', 'soyeon', 'hyunjin', 'jaemin')
   OR target_id IN ('record-001', 'record-005', 'record-008', 'record-009', 'record-017', 'record-025');

DELETE FROM drafts
WHERE author_id IN ('hana', 'jiwon', 'minjun', 'soyeon', 'hyunjin', 'jaemin');

DELETE FROM user_roles
WHERE user_id IN ('hana', 'jiwon', 'minjun', 'soyeon', 'hyunjin', 'jaemin');

DELETE FROM records
WHERE id IN (
  'record-001', 'record-002', 'record-003', 'record-004', 'record-005', 'record-006',
  'record-007', 'record-008', 'record-009', 'record-010', 'record-011', 'record-012',
  'record-013', 'record-014', 'record-015', 'record-016', 'record-017', 'record-018',
  'record-019', 'record-020', 'record-021', 'record-022', 'record-023', 'record-024',
  'record-025', 'record-026', 'record-test-timeline'
)
   OR slug = 'test-record-with-timeline';

DELETE FROM collaboration_units
WHERE id = 'collab-unit-alpha'
   OR slug = 'collab-alpha';

DELETE FROM learner_profiles
WHERE user_id IN ('hana', 'jiwon', 'minjun', 'soyeon', 'hyunjin', 'jaemin');

DELETE FROM stages
WHERE id = 'stage-test-closed'
   OR slug = 'test-closed-stage';

COMMIT;

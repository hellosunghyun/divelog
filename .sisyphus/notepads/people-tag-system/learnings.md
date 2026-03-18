# Learnings — people-tag-system

- `app/routes/public/write/note.tsx` now passes `currentUserId` from the loader into `PersonSearch` so the author can be excluded from both participant and mention pickers.
- Note creation syncs structured selections separately: `participantsJson` goes to `syncParticipantsForRecord()`, and `mentionUserIds` is merged with editor mentions via `syncAllMentionsForRecord()`.

- 2026-03-18 F1 audit: Must Have 12/12 and Must NOT Have 3/3 passed in `divelog-people-tag`, but `.sisyphus/plans/people-tag-system.md` was missing, so verdict stayed REJECT.
- Evidence saved to `/Users/hellosunghyun/Documents/Github/divelog/.sisyphus/evidence/f1-must-have-audit.txt`.

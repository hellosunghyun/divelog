# Learnings — people-tag-system

- `app/routes/public/write/note.tsx` now passes `currentUserId` from the loader into `PersonSearch` so the author can be excluded from both participant and mention pickers.
- Note creation syncs structured selections separately: `participantsJson` goes to `syncParticipantsForRecord()`, and `mentionUserIds` is merged with editor mentions via `syncAllMentionsForRecord()`.

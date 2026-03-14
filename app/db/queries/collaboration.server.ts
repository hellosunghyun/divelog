import { eq } from "drizzle-orm";

import { db } from "../client.server";
import { collaborationMembers, collaborationUnits, learnerProfiles } from "../schema.server";

export async function getCollaborationUnitBySlug(d1: D1Database, slug: string) {
  const database = db(d1);
  const result = await database
    .select()
    .from(collaborationUnits)
    .where(eq(collaborationUnits.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

export async function getCollaborationUnitsByChallengeId(d1: D1Database, challengeId: string) {
  const database = db(d1);

  return database.select().from(collaborationUnits).where(eq(collaborationUnits.challengeId, challengeId));
}

export async function getCollaborationMembers(d1: D1Database, unitId: string) {
  const database = db(d1);

  return database
    .select({
      member: collaborationMembers,
      learner: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      },
    })
    .from(collaborationMembers)
    .leftJoin(learnerProfiles, eq(collaborationMembers.learnerId, learnerProfiles.userId))
    .where(eq(collaborationMembers.unitId, unitId));
}

export async function getLearnerCollaborationUnits(d1: D1Database, learnerId: string) {
  const database = db(d1);

  return database
    .select({
      unit: collaborationUnits,
    })
    .from(collaborationMembers)
    .leftJoin(collaborationUnits, eq(collaborationMembers.unitId, collaborationUnits.id))
    .where(eq(collaborationMembers.learnerId, learnerId));
}

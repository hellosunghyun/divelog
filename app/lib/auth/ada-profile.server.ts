/**
 * ada-profile.server.ts
 *
 * Server-side adapter for fetching ada-kr-pos user profiles and resolving
 * profile intro/context line with fallback logic.
 *
 * - fetchAdaProfile: Fetches external ada profile, returns null on any error
 * - resolveProfileIntro: Prefers external ada bio, falls back to local bio
 * - resolveContextLine: Derives context from local cohort + stage name only
 */

export interface AdaProfileData {
  id: string;
  email: string | null;
  verifiedEmail: string | null;
  nickname: string | null;
  name: string | null;
  profilePhotoUrl: string | null;
  bio: string | null;
  contact: string | null;
  snsLinks: Record<string, string>;
  cohort: string | null;
  isVerified: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Fetches user profile from ada-kr-pos API.
 *
 * @param userId - User ID to fetch
 * @param apiKey - ADAKRPOS_API_KEY (server-only, never expose to client)
 * @returns AdaProfileData on success, null on any error (network, 404, 401, parse error)
 */
export async function fetchAdaProfile(
  userId: string,
  apiKey: string
): Promise<AdaProfileData | null> {
  try {
    const response = await fetch(`https://ada-kr-pos.com/api/sdk/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as AdaProfileData;
  } catch {
    // Network error, JSON parse error, or any other error
    return null;
  }
}

/**
 * Resolves profile intro by preferring external ada bio over local bio.
 *
 * Priority:
 * 1. ada profile bio (if ada profile exists and has bio)
 * 2. local bio (fallback)
 * 3. null (if both are absent)
 *
 * @param adaProfile - External ada profile data (can be null)
 * @param localBio - Local bio from learner_profiles table (can be null)
 * @returns Resolved bio string or null
 */
export function resolveProfileIntro(
  adaProfile: AdaProfileData | null,
  localBio: string | null
): string | null {
  if (adaProfile?.bio) {
    return adaProfile.bio;
  }
  return localBio ?? null;
}

/**
 * Derives a short context line from local data only (cohort + stage name).
 *
 * Format examples:
 * - "2기 · Bridge 단계" (both cohort and stage)
 * - "2기" (cohort only)
 * - "Bridge 단계" (stage only)
 * - null (both absent or empty)
 *
 * Note: This function uses LOCAL data only, never external ada fields.
 *
 * @param cohort - Cohort identifier from learner_profiles (e.g., "2기")
 * @param stageName - Stage name from stages table (e.g., "Bridge 단계")
 * @returns Context line string or null
 */
export function resolveContextLine(
  cohort: string | null,
  stageName: string | null
): string | null {
  const cohortTrimmed = cohort?.trim() ?? null;
  const stageNameTrimmed = stageName?.trim() ?? null;

  if (cohortTrimmed && stageNameTrimmed) {
    return `${cohortTrimmed} · ${stageNameTrimmed}`;
  }

  if (cohortTrimmed) {
    return cohortTrimmed;
  }

  if (stageNameTrimmed) {
    return stageNameTrimmed;
  }

  return null;
}

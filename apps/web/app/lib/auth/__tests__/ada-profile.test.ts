import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchAdaProfile,
  resolveProfileIntro,
  resolveContextLine,
  type AdaProfileData,
} from "../ada-profile.server";

describe("ada-profile.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAdaProfile", () => {
    it("should fetch user profile from ada-kr-pos API", async () => {
      const mockProfile: AdaProfileData = {
        id: "user-123",
        email: "user@example.com",
        verifiedEmail: "user@pos.idserve.net",
        nickname: "john",
        name: "John Doe",
        profilePhotoUrl: "https://example.com/photo.jpg",
        bio: "External bio from ada",
        contact: "john@example.com",
        snsLinks: {},
        cohort: "cohort-2026",
        isVerified: true,
        createdAt: 1000000,
        updatedAt: 2000000,
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      }));

      const result = await fetchAdaProfile("user-123", "test-api-key");

      expect(result).toEqual(mockProfile);
      expect(fetch).toHaveBeenCalledWith(
        "https://ada-kr-pos.com/api/sdk/users/user-123",
        {
          headers: {
            Authorization: "Bearer test-api-key",
          },
        }
      );
    });

    it("should return null on network error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Network error")));

      const result = await fetchAdaProfile("user-123", "test-api-key");

      expect(result).toBeNull();
    });

    it("should return null on 404 response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      }));

      const result = await fetchAdaProfile("user-123", "test-api-key");

      expect(result).toBeNull();
    });

    it("should return null on 401 response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      }));

      const result = await fetchAdaProfile("user-123", "test-api-key");

      expect(result).toBeNull();
    });

    it("should return null on JSON parse error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      }));

      const result = await fetchAdaProfile("user-123", "test-api-key");

      expect(result).toBeNull();
    });
  });

  describe("resolveProfileIntro", () => {
    it("should prefer external ada bio over local bio", () => {
      const adaProfile: AdaProfileData = {
        id: "user-123",
        email: "user@example.com",
        verifiedEmail: null,
        nickname: "john",
        name: "John Doe",
        profilePhotoUrl: null,
        bio: "External bio from ada",
        contact: null,
        snsLinks: {},
        cohort: null,
        isVerified: false,
        createdAt: 1000000,
        updatedAt: 2000000,
      };

      const result = resolveProfileIntro(adaProfile, "Local bio");

      expect(result).toBe("External bio from ada");
    });

    it("should fall back to local bio when ada bio is null", () => {
      const adaProfile: AdaProfileData = {
        id: "user-123",
        email: "user@example.com",
        verifiedEmail: null,
        nickname: "john",
        name: "John Doe",
        profilePhotoUrl: null,
        bio: null,
        contact: null,
        snsLinks: {},
        cohort: null,
        isVerified: false,
        createdAt: 1000000,
        updatedAt: 2000000,
      };

      const result = resolveProfileIntro(adaProfile, "Local bio");

      expect(result).toBe("Local bio");
    });

    it("should fall back to local bio when ada profile is null", () => {
      const result = resolveProfileIntro(null, "Local bio");

      expect(result).toBe("Local bio");
    });

    it("should return null when both ada and local bio are null", () => {
      const adaProfile: AdaProfileData = {
        id: "user-123",
        email: "user@example.com",
        verifiedEmail: null,
        nickname: "john",
        name: "John Doe",
        profilePhotoUrl: null,
        bio: null,
        contact: null,
        snsLinks: {},
        cohort: null,
        isVerified: false,
        createdAt: 1000000,
        updatedAt: 2000000,
      };

      const result = resolveProfileIntro(adaProfile, null);

      expect(result).toBeNull();
    });

    it("should return null when both ada profile and local bio are null", () => {
      const result = resolveProfileIntro(null, null);

      expect(result).toBeNull();
    });
  });

  describe("resolveContextLine", () => {
    it("should return stage name when cohort and stage are both present", () => {
      const result = resolveContextLine("2기", "Bridge 단계");

      expect(result).toBe("Bridge 단계");
    });

    it("should return null when stage name is null", () => {
      const result = resolveContextLine("2기", null);

      expect(result).toBeNull();
    });

    it("should return only stage name when cohort is null", () => {
      const result = resolveContextLine(null, "Bridge 단계");

      expect(result).toBe("Bridge 단계");
    });

    it("should return null when both cohort and stage name are null", () => {
      const result = resolveContextLine(null, null);

      expect(result).toBeNull();
    });

    it("should return null when both cohort and stage name are empty strings", () => {
      const result = resolveContextLine("", "");

      expect(result).toBeNull();
    });

    it("should handle empty cohort with valid stage name", () => {
      const result = resolveContextLine("", "Bridge 단계");

      expect(result).toBe("Bridge 단계");
    });

    it("should handle valid cohort with empty stage name", () => {
      const result = resolveContextLine("2기", "");

      expect(result).toBeNull();
    });
  });
});

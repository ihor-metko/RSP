/**
 * Tests for useCanEditClub hook
 */

import { renderHook } from "@testing-library/react";
import { useCanEditClub } from "@/hooks/useCanEditClub";
import { useUserStore } from "@/stores/useUserStore";
import { ClubMembershipRole } from "@/constants/roles";

// Mock the user store
jest.mock("@/stores/useUserStore");

describe("useCanEditClub", () => {
  const mockUseUserStore = useUserStore as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Root Admin", () => {
    it("should allow root admin to edit any club", () => {
      mockUseUserStore.mockImplementation((selector) =>
        selector({
          user: { id: "user-1", email: "root@test.com", name: "Root Admin", isRoot: true },
          clubMemberships: [],
        })
      );

      const { result } = renderHook(() => useCanEditClub("club-123"));

      expect(result.current).toBe(true);
    });
  });

  describe("Club Owner", () => {
    it("should allow club owner to edit their club", () => {
      mockUseUserStore.mockImplementation((selector) =>
        selector({
          user: { id: "user-1", email: "owner@test.com", name: "Club Owner", isRoot: false },
          clubMemberships: [
            { clubId: "club-123", role: ClubMembershipRole.CLUB_OWNER },
          ],
        })
      );

      const { result } = renderHook(() => useCanEditClub("club-123"));

      expect(result.current).toBe(true);
    });

    it("should not allow club owner to edit other clubs", () => {
      mockUseUserStore.mockImplementation((selector) =>
        selector({
          user: { id: "user-1", email: "owner@test.com", name: "Club Owner", isRoot: false },
          clubMemberships: [
            { clubId: "club-123", role: ClubMembershipRole.CLUB_OWNER },
          ],
        })
      );

      const { result } = renderHook(() => useCanEditClub("club-456"));

      expect(result.current).toBe(false);
    });
  });

  describe("Club Admin", () => {
    it("should allow club admin to edit their club", () => {
      mockUseUserStore.mockImplementation((selector) =>
        selector({
          user: { id: "user-1", email: "admin@test.com", name: "Club Admin", isRoot: false },
          clubMemberships: [
            { clubId: "club-123", role: ClubMembershipRole.CLUB_ADMIN },
          ],
        })
      );

      const { result } = renderHook(() => useCanEditClub("club-123"));

      expect(result.current).toBe(true);
    });

    it("should not allow club admin to edit other clubs", () => {
      mockUseUserStore.mockImplementation((selector) =>
        selector({
          user: { id: "user-1", email: "admin@test.com", name: "Club Admin", isRoot: false },
          clubMemberships: [
            { clubId: "club-123", role: ClubMembershipRole.CLUB_ADMIN },
          ],
        })
      );

      const { result } = renderHook(() => useCanEditClub("club-456"));

      expect(result.current).toBe(false);
    });
  });

  describe("Regular Member", () => {
    it("should not allow regular member to edit club", () => {
      mockUseUserStore.mockImplementation((selector) =>
        selector({
          user: { id: "user-1", email: "member@test.com", name: "Member", isRoot: false },
          clubMemberships: [
            { clubId: "club-123", role: ClubMembershipRole.MEMBER },
          ],
        })
      );

      const { result } = renderHook(() => useCanEditClub("club-123"));

      expect(result.current).toBe(false);
    });
  });

  describe("No Membership", () => {
    it("should not allow user without club membership to edit", () => {
      mockUseUserStore.mockImplementation((selector) =>
        selector({
          user: { id: "user-1", email: "user@test.com", name: "User", isRoot: false },
          clubMemberships: [],
        })
      );

      const { result } = renderHook(() => useCanEditClub("club-123"));

      expect(result.current).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should return false when clubId is null", () => {
      mockUseUserStore.mockImplementation((selector) =>
        selector({
          user: { id: "user-1", email: "admin@test.com", name: "Club Admin", isRoot: false },
          clubMemberships: [
            { clubId: "club-123", role: ClubMembershipRole.CLUB_ADMIN },
          ],
        })
      );

      const { result } = renderHook(() => useCanEditClub(null));

      expect(result.current).toBe(false);
    });

    it("should return false when clubId is undefined", () => {
      mockUseUserStore.mockImplementation((selector) =>
        selector({
          user: { id: "user-1", email: "admin@test.com", name: "Club Admin", isRoot: false },
          clubMemberships: [
            { clubId: "club-123", role: ClubMembershipRole.CLUB_ADMIN },
          ],
        })
      );

      const { result } = renderHook(() => useCanEditClub(undefined));

      expect(result.current).toBe(false);
    });

    it("should handle multiple club memberships correctly", () => {
      mockUseUserStore.mockImplementation((selector) =>
        selector({
          user: { id: "user-1", email: "admin@test.com", name: "Multi Admin", isRoot: false },
          clubMemberships: [
            { clubId: "club-123", role: ClubMembershipRole.CLUB_ADMIN },
            { clubId: "club-456", role: ClubMembershipRole.CLUB_OWNER },
            { clubId: "club-789", role: ClubMembershipRole.MEMBER },
          ],
        })
      );

      // Can edit club-123 (admin)
      const { result: result1 } = renderHook(() => useCanEditClub("club-123"));
      expect(result1.current).toBe(true);

      // Can edit club-456 (owner)
      const { result: result2 } = renderHook(() => useCanEditClub("club-456"));
      expect(result2.current).toBe(true);

      // Cannot edit club-789 (member)
      const { result: result3 } = renderHook(() => useCanEditClub("club-789"));
      expect(result3.current).toBe(false);

      // Cannot edit club-999 (no membership)
      const { result: result4 } = renderHook(() => useCanEditClub("club-999"));
      expect(result4.current).toBe(false);
    });
  });
});

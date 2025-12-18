/**
 * Custom hook for managing user data fetching in the wizard
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import type { WizardUser, PredefinedData } from "../types";

interface UseWizardUsersOptions {
  isOpen: boolean;
  currentStep: number;
  predefinedData?: PredefinedData;
}

interface UseWizardUsersReturn {
  users: WizardUser[];
  isLoading: boolean;
  error: string | null;
  createUser: (name: string, email: string) => Promise<WizardUser | null>;
}

/**
 * Hook for fetching and managing users in the wizard
 * Also provides user creation functionality
 */
export function useWizardUsers({
  isOpen,
  currentStep,
  predefinedData,
}: UseWizardUsersOptions): UseWizardUsersReturn {
  const t = useTranslations();
  const [users, setUsers] = useState<WizardUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simpleUsers = useAdminUsersStore((state) => state.simpleUsers);
  const fetchSimpleUsers = useAdminUsersStore((state) => state.fetchSimpleUsers);

  // Memoize the mapped users to avoid unnecessary computations
  const mappedUsers = useMemo(
    () => simpleUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    })),
    [simpleUsers]
  );

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isOpen || currentStep !== 5) {
        return;
      }

      // Skip if user is predefined
      if (predefinedData?.userId) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await fetchSimpleUsers();
        setUsers(mappedUsers);
      } catch {
        setError(t("auth.errorOccurred"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, currentStep, predefinedData, fetchSimpleUsers, mappedUsers, t]);

  const createUser = useCallback(
    async (name: string, email: string): Promise<WizardUser | null> => {
      setError(null);

      try {
        const response = await fetch("/api/admin/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name || null,
            email,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || t("auth.errorOccurred"));
          return null;
        }

        const newUser: WizardUser = await response.json();
        
        // Add new user to the list
        setUsers((prev) => [...prev, newUser]);
        
        return newUser;
      } catch {
        setError(t("auth.errorOccurred"));
        return null;
      }
    },
    [t]
  );

  return {
    users,
    isLoading,
    error,
    createUser,
  };
}

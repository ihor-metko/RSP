"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Modal, IMLink } from "@/components/ui";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { PriceRuleForm, PriceRuleFormData } from "@/components/admin/PriceRuleForm";
import { formatPrice } from "@/utils/price";
import { useCourtStore } from "@/stores/useCourtStore";
import { useUserStore } from "@/stores/useUserStore";


interface PriceRule {
  id: string;
  courtId: string;
  ruleType: string;
  dayOfWeek: number | null;
  date: string | null;
  holidayId: string | null;
  startTime: string;
  endTime: string;
  priceCents: number;
  createdAt: string;
  updatedAt: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
}

interface Court {
  id: string;
  name: string;
  clubId: string;
  club?: {
    id: string;
    name: string;
  };
}

const DAY_OF_WEEK_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function PriceRulesPage({
  params,
}: {
  params: Promise<{ courtId: string }>;
}) {
  const router = useRouter();

  // Use store for auth
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  const [courtId, setCourtId] = useState<string | null>(null);
  const [court, setCourt] = useState<Court | null>(null);
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<PriceRule | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setCourtId(resolvedParams.courtId);
    });
  }, [params]);

  const fetchRules = useCallback(async () => {
    if (!courtId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/courts/${courtId}/price-rules`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Court not found");
          return;
        }
        throw new Error("Failed to fetch price rules");
      }
      const data = await response.json();
      setRules(data.rules);
      setError("");
    } catch {
      setError("Failed to load price rules");
    } finally {
      setLoading(false);
    }
  }, [courtId]);

  const ensureCourtByIdFromStore = useCourtStore((state) => state.ensureCourtById);

  const fetchCourt = useCallback(async () => {
    if (!courtId) return;

    try {
      const courtData = await ensureCourtByIdFromStore(courtId);
      setCourt(courtData as Court);
      
      // Fetch holidays for the club
      if (courtData?.clubId) {
        const holidaysResponse = await fetch(`/api/admin/clubs/${courtData.clubId}/holidays`);
        if (holidaysResponse.ok) {
          const holidaysData = await holidaysResponse.json();
          setHolidays(holidaysData.holidays || []);
        }
      }
    } catch {
      setError("Failed to load court");
    }
  }, [ensureCourtByIdFromStore, courtId]);

  useEffect(() => {
    if (!isHydrated || isLoading) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    if (courtId) {
      fetchCourt();
      fetchRules();
    }
  }, [isLoggedIn, isLoading, router, courtId, fetchCourt, fetchRules, isHydrated]);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: PriceRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (rule: PriceRule) => {
    setDeletingRule(rule);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingRule(null);
  };

  const handleSubmit = async (formData: PriceRuleFormData) => {
    if (!courtId) return;

    setSubmitting(true);
    try {
      const url = editingRule
        ? `/api/admin/courts/${courtId}/price-rules/${editingRule.id}`
        : `/api/admin/courts/${courtId}/price-rules`;
      const method = editingRule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save price rule");
      }

      handleCloseModal();
      fetchRules();
      showToast("success", editingRule ? "Price rule updated" : "Price rule created");
    } catch (err) {
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRule || !courtId) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/courts/${courtId}/price-rules/${deletingRule.id}`,
        { method: "DELETE" }
      );

      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete price rule");
      }

      handleCloseDeleteModal();
      fetchRules();
      showToast("success", "Price rule deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete price rule");
    } finally {
      setSubmitting(false);
    }
  };

  const formatRuleDay = (rule: PriceRule): string => {
    switch (rule.ruleType) {
      case "SPECIFIC_DATE":
        return rule.date ? new Date(rule.date).toLocaleDateString() : "Unknown";
      case "SPECIFIC_DAY":
        return rule.dayOfWeek !== null ? DAY_OF_WEEK_LABELS[rule.dayOfWeek] : "Unknown";
      case "WEEKDAYS":
        return "Weekdays (Mon-Fri)";
      case "WEEKENDS":
        return "Weekends (Sat-Sun)";
      case "ALL_DAYS":
        return "All Days";
      case "HOLIDAY":
        const holiday = holidays.find((h) => h.id === rule.holidayId);
        return holiday ? `Holiday: ${holiday.name}` : "Holiday (deleted)";
      default:
        return "Unknown";
    }
  };

  const getRuleTypeLabel = (ruleType: string): string => {
    const labels: Record<string, string> = {
      SPECIFIC_DATE: "Specific Date",
      SPECIFIC_DAY: "Day of Week",
      WEEKDAYS: "Weekdays",
      WEEKENDS: "Weekends",
      ALL_DAYS: "All Days",
      HOLIDAY: "Holiday",
    };
    return labels[ruleType] || ruleType;
  };

  if (status === "loading" || loading) {
    return (
      <main className="rsp-container p-6">
        <PageHeaderSkeleton showDescription />
        <TableSkeleton rows={5} columns={6} showHeader />
      </main>
    );
  }

  return (
    <main className="rsp-container p-6">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${toast.type === "success"
            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
            : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
            }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      <header className="rsp-header flex items-center justify-between mb-8">
        <div>
          <h1 className="rsp-title text-3xl font-bold">
            Price Rules - {court?.name || "Loading..."}
          </h1>
          <p className="rsp-subtitle text-gray-500 mt-2">
            {court?.club?.name || "Loading..."} - Manage time-based pricing for this court
          </p>
        </div>
      </header>

      <section className="rsp-content">
        <div className="flex justify-between items-center mb-6">
          <IMLink href={`/admin/courts/${courtId}`}>
            ← Back to Court Details
          </IMLink>
          <Button onClick={handleOpenCreateModal}>+ Add Price Rule</Button>
        </div>

        {error && (
          <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
            {error}
          </div>
        )}

        <Card>
          <div className="rsp-price-rules-table overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr
                  className="border-b"
                  style={{ borderColor: "var(--rsp-border)" }}
                >
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Day/Date</th>
                  <th className="py-3 px-4 font-semibold">Start Time</th>
                  <th className="py-3 px-4 font-semibold">End Time</th>
                  <th className="py-3 px-4 font-semibold">Price/Hour</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No price rules defined. Default court price will be used.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      style={{ borderColor: "var(--rsp-border)" }}
                    >
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-1 rounded-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {getRuleTypeLabel(rule.ruleType)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{formatRuleDay(rule)}</span>
                      </td>
                      <td className="py-3 px-4">{rule.startTime}</td>
                      <td className="py-3 px-4">{rule.endTime}</td>
                      <td className="py-3 px-4">{formatPrice(rule.priceCents)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleOpenEditModal(rule)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleOpenDeleteModal(rule)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRule ? "Edit Price Rule" : "Add Price Rule"}
      >
        <PriceRuleForm
          initialValues={
            editingRule
              ? {
                ruleType: editingRule.ruleType,
                dayOfWeek: editingRule.dayOfWeek,
                date: editingRule.date,
                holidayId: editingRule.holidayId,
                startTime: editingRule.startTime,
                endTime: editingRule.endTime,
                priceCents: editingRule.priceCents,
              }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          isSubmitting={submitting}
          holidays={holidays}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Price Rule"
      >
        <p className="mb-4">
          Are you sure you want to delete this price rule (
          {deletingRule && formatRuleDay(deletingRule)}: {deletingRule?.startTime} - {deletingRule?.endTime}
          )?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCloseDeleteModal}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={submitting}
            className="bg-red-500 hover:bg-red-600"
          >
            {submitting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </main>
  );
}

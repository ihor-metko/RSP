"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Modal, Input, Select } from "@/components/ui";
import type { CoachWeeklyAvailabilitySlot, DayOfWeek } from "@/types/coach";
import { DAYS_OF_WEEK } from "@/types/coach";
import "./CoachWeeklyAvailability.css";

interface CoachWeeklyAvailabilityProps {
  coachId: string;
}

// Business hours configuration
const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 22;

// Generate hours array for header
function generateHours(): number[] {
  const hours: number[] = [];
  for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
    hours.push(h);
  }
  return hours;
}

const HOURS = generateHours();

// Format hour for display
function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

// Convert time string to hour number
function timeToHour(time: string): number {
  const [hour] = time.split(":").map(Number);
  return hour;
}

// Convert time string to minutes from midnight
function timeToMinutes(time: string): number {
  const [hour, min] = time.split(":").map(Number);
  return hour * 60 + min;
}

// Check if a slot covers a specific hour (any part of the hour)
function slotCoversHour(slot: CoachWeeklyAvailabilitySlot, hour: number): boolean {
  const slotStartMinutes = timeToMinutes(slot.startTime);
  const slotEndMinutes = timeToMinutes(slot.endTime);
  const hourStartMinutes = hour * 60;
  const hourEndMinutes = (hour + 1) * 60;
  
  return slotStartMinutes < hourEndMinutes && slotEndMinutes > hourStartMinutes;
}

// Check if an hour is the start of a slot
function isSlotStart(slot: CoachWeeklyAvailabilitySlot, hour: number): boolean {
  return timeToHour(slot.startTime) === hour;
}

// Check if an hour is the end of a slot (slot ends within this hour)
function isSlotEnd(slot: CoachWeeklyAvailabilitySlot, hour: number): boolean {
  const endHour = timeToHour(slot.endTime);
  const endMinutes = timeToMinutes(slot.endTime);
  const hourEndMinutes = (hour + 1) * 60;
  return endHour === hour || (endMinutes > hour * 60 && endMinutes <= hourEndMinutes);
}

// Day options for select
const DAY_OPTIONS = DAYS_OF_WEEK.map((day, index) => ({
  value: index.toString(),
  label: day,
}));

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="tm-coach-availability-skeleton" aria-label="Loading availability">
      <div className="tm-coach-week-grid">
        <div className="tm-coach-week-grid-inner">
          {/* Header row */}
          <div className="tm-coach-grid-corner" />
          {HOURS.map((h) => (
            <div key={`header-${h}`} className="tm-coach-availability-skeleton-cell" />
          ))}
          {/* Day rows */}
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <div key={`row-${day}`} className="contents">
              <div className="tm-coach-grid-day-label" />
              {HOURS.map((h) => (
                <div key={`${day}-${h}`} className="tm-coach-availability-skeleton-cell" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CoachWeeklyAvailability({ coachId }: CoachWeeklyAvailabilityProps) {
  const [slots, setSlots] = useState<CoachWeeklyAvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<CoachWeeklyAvailabilitySlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "12:00",
    note: "",
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  
  const fetchSlots = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/coaches/${coachId}/availability`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch availability");
      }
      
      const data = await response.json();
      setSlots(data.slots || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [coachId]);
  
  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);
  
  const handleAddSlot = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/coaches/${coachId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: parseInt(formData.dayOfWeek),
          startTime: formData.startTime,
          endTime: formData.endTime,
          note: formData.note || undefined,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add availability slot");
      }
      
      showToast("Availability slot added successfully", "success");
      setIsAddModalOpen(false);
      resetForm();
      fetchSlots();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add slot", "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUpdateSlot = async () => {
    if (!selectedSlot) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/coaches/${coachId}/availability/${selectedSlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: parseInt(formData.dayOfWeek),
          startTime: formData.startTime,
          endTime: formData.endTime,
          note: formData.note || null,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update availability slot");
      }
      
      showToast("Availability slot updated successfully", "success");
      setIsEditModalOpen(false);
      setSelectedSlot(null);
      resetForm();
      fetchSlots();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update slot", "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteSlot = async () => {
    if (!selectedSlot) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/coaches/${coachId}/availability/${selectedSlot.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete availability slot");
      }
      
      showToast("Availability slot deleted successfully", "success");
      setIsEditModalOpen(false);
      setSelectedSlot(null);
      resetForm();
      fetchSlots();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete slot", "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      dayOfWeek: "1",
      startTime: "09:00",
      endTime: "12:00",
      note: "",
    });
  };
  
  const openAddModal = (dayOfWeek?: number, hour?: number) => {
    setFormData({
      dayOfWeek: dayOfWeek !== undefined ? dayOfWeek.toString() : "1",
      startTime: hour !== undefined ? formatHour(hour) : "09:00",
      endTime: hour !== undefined ? formatHour(Math.min(hour + 2, BUSINESS_END_HOUR)) : "12:00",
      note: "",
    });
    setIsAddModalOpen(true);
  };
  
  const openEditModal = (slot: CoachWeeklyAvailabilitySlot) => {
    setSelectedSlot(slot);
    setFormData({
      dayOfWeek: slot.dayOfWeek.toString(),
      startTime: slot.startTime,
      endTime: slot.endTime,
      note: slot.note || "",
    });
    setIsEditModalOpen(true);
  };
  
  const handleCellClick = (dayOfWeek: DayOfWeek, hour: number) => {
    // Check if there's a slot covering this cell
    const existingSlot = slots.find(
      (slot) => slot.dayOfWeek === dayOfWeek && slotCoversHour(slot, hour)
    );
    
    if (existingSlot) {
      openEditModal(existingSlot);
    } else {
      openAddModal(dayOfWeek, hour);
    }
  };
  
  const handleCellKeyDown = (e: React.KeyboardEvent, dayOfWeek: DayOfWeek, hour: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCellClick(dayOfWeek, hour);
    }
  };
  
  // Get slots for a specific day
  const getSlotsForDay = (dayOfWeek: DayOfWeek): CoachWeeklyAvailabilitySlot[] => {
    return slots.filter((slot) => slot.dayOfWeek === dayOfWeek);
  };
  
  // Determine cell class based on slot coverage
  const getCellClass = (dayOfWeek: DayOfWeek, hour: number): string => {
    const daySlots = getSlotsForDay(dayOfWeek);
    const coveringSlot = daySlots.find((slot) => slotCoversHour(slot, hour));
    
    if (coveringSlot) {
      let classes = "tm-coach-availability-cell tm-coach-availability-cell--available";
      if (isSlotStart(coveringSlot, hour)) {
        classes += " tm-coach-availability-cell--start";
      }
      if (isSlotEnd(coveringSlot, hour)) {
        classes += " tm-coach-availability-cell--end";
      }
      return classes;
    }
    
    return "tm-coach-availability-cell tm-coach-availability-cell--empty";
  };
  
  // Get slot for a cell (if any)
  const getSlotForCell = (dayOfWeek: DayOfWeek, hour: number): CoachWeeklyAvailabilitySlot | undefined => {
    return getSlotsForDay(dayOfWeek).find((slot) => slotCoversHour(slot, hour));
  };
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (error) {
    return (
      <div className="tm-coach-availability">
        <div className="tm-coach-availability-container">
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchSlots}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="tm-coach-availability" ref={containerRef}>
      {/* Toast notification */}
      {toast && (
        <div
          role="alert"
          className={`tm-toast tm-toast--${toast.type}`}
        >
          {toast.message}
        </div>
      )}
      
      <div className="tm-coach-availability-container">
        <div className="tm-coach-availability-header">
          <div>
            <h2 className="tm-coach-availability-title">Weekly Availability</h2>
            <p className="tm-coach-availability-subtitle">
              Set your working hours for each day of the week
            </p>
          </div>
          <div className="tm-coach-availability-actions">
            <Button
              onClick={() => openAddModal()}
            >
              + Add Slot
            </Button>
          </div>
        </div>
        
        <div className="tm-coach-availability-instructions">
          Click on any cell to add or edit availability. Green cells indicate available time slots.
        </div>
        
        {/* Weekly Grid */}
        <div className="tm-coach-week-grid" role="grid" aria-label="Weekly availability calendar">
          <div className="tm-coach-week-grid-inner">
            {/* Header row */}
            <div className="tm-coach-grid-header" role="row">
              <div className="tm-coach-grid-corner" role="columnheader">
                Day / Hour
              </div>
              {HOURS.map((hour) => (
                <div
                  key={`header-${hour}`}
                  className="tm-coach-grid-hour-header"
                  role="columnheader"
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>
            
            {/* Day rows */}
            {DAYS_OF_WEEK.map((dayName, dayIndex) => (
              <div key={dayName} className="tm-coach-grid-row" role="row">
                <div className="tm-coach-grid-day-label" role="rowheader">
                  {dayName}
                </div>
                {HOURS.map((hour) => {
                  const slot = getSlotForCell(dayIndex as DayOfWeek, hour);
                  const isStart = slot && isSlotStart(slot, hour);
                  
                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className={getCellClass(dayIndex as DayOfWeek, hour)}
                      role="gridcell"
                      tabIndex={0}
                      aria-label={`${dayName} ${formatHour(hour)}${slot ? `, available${slot.note ? `: ${slot.note}` : ""}` : ", click to add"}`}
                      onClick={() => handleCellClick(dayIndex as DayOfWeek, hour)}
                      onKeyDown={(e) => handleCellKeyDown(e, dayIndex as DayOfWeek, hour)}
                    >
                      {isStart && slot?.note && (
                        <span className="text-xs text-white truncate px-1" title={slot.note}>
                          {slot.note}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="tm-coach-availability-legend">
          <div className="tm-coach-legend-item">
            <span className="tm-coach-legend-dot tm-coach-legend-dot--available" />
            <span>Available</span>
          </div>
          <div className="tm-coach-legend-item">
            <span className="tm-coach-legend-dot tm-coach-legend-dot--empty" />
            <span>Not Set</span>
          </div>
        </div>
      </div>
      
      {/* Add Slot Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Add Availability Slot"
      >
        <form
          className="tm-slot-modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddSlot();
          }}
        >
          <Select
            label="Day of Week"
            id="add-day-of-week"
            options={DAY_OPTIONS}
            value={formData.dayOfWeek}
            onChange={(value) => setFormData({ ...formData, dayOfWeek: value as string })}
            required
          />
          
          <div className="tm-slot-modal-row">
            <Input
              label="Start Time"
              id="add-start-time"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
            />
            <Input
              label="End Time"
              id="add-end-time"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              required
            />
          </div>
          
          <Input
            label="Note (optional)"
            id="add-note"
            type="text"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="e.g., Morning sessions, Beginner lessons"
          />
          
          <div className="tm-slot-modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Slot"}
            </Button>
          </div>
        </form>
      </Modal>
      
      {/* Edit Slot Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSlot(null);
          resetForm();
        }}
        title="Edit Availability Slot"
      >
        <form
          className="tm-slot-modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdateSlot();
          }}
        >
          <Select
            label="Day of Week"
            id="edit-day-of-week"
            options={DAY_OPTIONS}
            value={formData.dayOfWeek}
            onChange={(value) => setFormData({ ...formData, dayOfWeek: value as string })}
            required
          />
          
          <div className="tm-slot-modal-row">
            <Input
              label="Start Time"
              id="edit-start-time"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
            />
            <Input
              label="End Time"
              id="edit-end-time"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              required
            />
          </div>
          
          <Input
            label="Note (optional)"
            id="edit-note"
            type="text"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="e.g., Morning sessions, Beginner lessons"
          />
          
          <div className="tm-slot-modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteSlot}
              disabled={isSubmitting}
              className="mr-auto text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedSlot(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

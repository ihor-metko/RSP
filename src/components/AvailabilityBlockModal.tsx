"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input } from "@/components/ui";

interface Court {
  id: string;
  name: string;
  type: string | null;
  indoor: boolean;
}

export interface AvailabilityBlockEdit {
  id?: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  action: "create" | "update" | "delete";
}

interface AvailabilityBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  hour: number;
  courts: Court[];
  existingBlocks: AvailabilityBlockEdit[];
  onSave: (blocks: AvailabilityBlockEdit[]) => void;
}

export function AvailabilityBlockModal({
  isOpen,
  onClose,
  date,
  hour,
  courts,
  existingBlocks,
  onSave,
}: AvailabilityBlockModalProps) {
  const [blocks, setBlocks] = useState<AvailabilityBlockEdit[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<string>("");
  const [startTime, setStartTime] = useState<string>(`${hour.toString().padStart(2, "0")}:00`);
  const [endTime, setEndTime] = useState<string>(`${(hour + 1).toString().padStart(2, "0")}:00`);
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      // Load existing blocks for this hour
      const hourBlocks = existingBlocks.filter((b) => {
        const blockHour = parseInt(b.startTime.split(":")[0], 10);
        return b.date === date && blockHour === hour;
      });
      setBlocks(hourBlocks);
      setSelectedCourtId(courts.length > 0 ? courts[0].id : "");
      setStartTime(`${hour.toString().padStart(2, "0")}:00`);
      setEndTime(`${(hour + 1).toString().padStart(2, "0")}:00`);
      setReason("");
    }
  }, [isOpen, date, hour, existingBlocks, courts]);

  const handleAddBlock = () => {
    if (!selectedCourtId) return;

    const newBlock: AvailabilityBlockEdit = {
      courtId: selectedCourtId,
      date,
      startTime,
      endTime,
      reason: reason || undefined,
      action: "create",
    };

    setBlocks([...blocks, newBlock]);
    setReason("");
  };

  const handleRemoveBlock = (index: number) => {
    const block = blocks[index];
    if (block.id) {
      // Mark existing block for deletion
      setBlocks(
        blocks.map((b, i) => (i === index ? { ...b, action: "delete" as const } : b))
      );
    } else {
      // Remove new block that hasn't been saved yet
      setBlocks(blocks.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    onSave(blocks);
    onClose();
  };

  const getCourtName = (courtId: string) => {
    const court = courts.find((c) => c.id === courtId);
    return court ? court.name : "Unknown Court";
  };

  const activeBlocks = blocks.filter((b) => b.action !== "delete");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Availability - ${date} ${hour}:00`}>
      <div className="space-y-4">
        {/* Existing blocks */}
        <div>
          <h4 className="text-sm font-medium mb-2">Current Blocks</h4>
          {activeBlocks.length === 0 ? (
            <p className="text-sm text-gray-500">No blocks for this hour</p>
          ) : (
            <div className="space-y-2">
              {activeBlocks.map((block, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded"
                >
                  <div className="text-sm">
                    <div className="font-medium">{getCourtName(block.courtId)}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {block.startTime} - {block.endTime}
                      {block.reason && ` • ${block.reason}`}
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => handleRemoveBlock(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new block */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Add New Block</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Court</label>
              <select
                className="rsp-input w-full"
                value={selectedCourtId}
                onChange={(e) => setSelectedCourtId(e.target.value)}
              >
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Input
                label="End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <Input
              label="Reason (optional)"
              placeholder="e.g., Maintenance, Event"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <Button variant="outline" onClick={handleAddBlock}>
              Add Block
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

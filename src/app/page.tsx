"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button, Card, Input, Modal, DarkModeToggle } from "@/components/ui";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";

export default function Home() {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="rsp-container min-h-screen p-8">
      <header className="rsp-header flex items-center justify-between mb-8">
        <h1 className="rsp-title text-3xl font-bold">Paddle Club MVP</h1>
        <div className="flex items-center gap-4">
          <UserRoleIndicator />
          <DarkModeToggle />
        </div>
      </header>

      <section className="rsp-content max-w-2xl mx-auto">
        <Card title="Welcome to Paddle Club">
          <p className="rsp-text mb-4">
            This is an example card component using rsp- prefixed classes for
            structure and styling.
          </p>
          <div className="rsp-form-group mb-4">
            <Input
              label="Your Name"
              placeholder="Enter your name"
              type="text"
            />
          </div>
          <div className="rsp-button-group flex gap-2">
            <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
            <Button variant="outline">Secondary Action</Button>
          </div>
        </Card>

        <Card title="Quick Links" className="mt-6">
          <div className="rsp-links flex flex-col gap-2">
            {session?.user?.role === "player" && (
              <Link href="/clubs" className="rsp-link text-blue-500 hover:underline">
                View Clubs →
              </Link>
            )}

            {session?.user?.role === "coach" && (
              <>
                <Link href="/coach/dashboard" className="rsp-link text-blue-500 hover:underline">
                  Dashboard
                </Link>
              </>
            )}
            {session?.user?.role === "admin" && (
              <>
                <Link href="/admin/clubs" className="rsp-link text-blue-500 hover:underline">
                  Manage Clubs (Admin) →
                </Link>
                <Link href="/admin/coaches" className="rsp-link text-blue-500 hover:underline">
                  Manage Coaches (Admin) →
                </Link>
              </>
            )}
          </div>
        </Card>
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal"
      >
        <p className="rsp-modal-content">
          This is an example modal dialog. Press Escape or click outside to
          close.
        </p>
        <div className="rsp-modal-actions mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
        </div>
      </Modal>
    </main>
  );
}

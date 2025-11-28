import Link from "next/link";
import { Card, Button } from "@/components/ui";

export default function ClubsPage() {
  return (
    <main className="rsp-container min-h-screen p-8">
      <header className="rsp-header mb-8">
        <h1 className="rsp-title text-3xl font-bold">Clubs</h1>
        <p className="rsp-subtitle text-gray-500 mt-2">
          Browse available paddle clubs
        </p>
      </header>

      <section className="rsp-club-list grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Club Alpha">
          <p className="rsp-club-description mb-4">
            A premier paddle club with state-of-the-art facilities.
          </p>
          <Button>View Details</Button>
        </Card>

        <Card title="Club Beta">
          <p className="rsp-club-description mb-4">
            Family-friendly club with beginner courses.
          </p>
          <Button>View Details</Button>
        </Card>

        <Card title="Club Gamma">
          <p className="rsp-club-description mb-4">
            Professional training center for competitive players.
          </p>
          <Button>View Details</Button>
        </Card>
      </section>

      <div className="rsp-navigation mt-8">
        <Link href="/" className="rsp-link text-blue-500 hover:underline">
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}

/**
 * Reusable loading skeleton components for Suspense fallbacks
 */

import "./EntityLogo.styles.css";

interface SkeletonProps {
  className?: string;
}

/**
 * Club card skeleton for loading states
 */
export function ClubCardSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`rsp-club-card animate-pulse ${className}`}>
      <div className="rsp-club-card-header">
        <div className="rsp-club-logo-placeholder-skeleton bg-gray-200 dark:bg-gray-700" />
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>
      <div className="rsp-club-details space-y-2">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-md" />
        <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>
      <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md mt-4" />
    </div>
  );
}

/**
 * Grid of club card skeletons
 */
export function ClubCardsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="rsp-popular-clubs-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ClubCardSkeleton key={`club-skeleton-${i}`} />
      ))}
    </div>
  );
}

/**
 * Personalized section skeleton for loading states
 */
export function PersonalizedSectionSkeleton() {
  return (
    <section className="tm-personalized-section py-8 px-4 md:px-8" aria-label="Loading personalized content">
      <div className="w-7xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-6" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={`personalized-skeleton-${i}`} className="tm-personalized-block">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-4" />
              <div className="space-y-3">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

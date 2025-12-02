/**
 * Auth Layout
 * Authentication pages layout without header for a cleaner auth experience.
 * Footer anchored to bottom of viewport.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

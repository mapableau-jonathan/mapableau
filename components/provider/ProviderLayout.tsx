export default function ProviderLayout({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <main className="divide-y divide-border lg:col-span-2 [&>*]:py-8 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          {children}
        </main>

        {/* Sidebar - sticky on desktop */}
        <aside className="lg:sticky lg:top-8 lg:self-start">{sidebar}</aside>
      </div>
    </div>
  );
}

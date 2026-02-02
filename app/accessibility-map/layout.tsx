export default function AccessibilityMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-7rem)]"
      role="region"
      aria-label="Accessibility Map"
    >
      {children}
    </div>
  );
}

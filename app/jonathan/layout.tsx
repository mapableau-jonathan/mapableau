import { JonathanNav } from "@/app/jonathan/JonathanNav";

export default function JonathanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header id="main-nav" aria-label="Jonathan section navigation">
        <JonathanNav />
      </header>
      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  );
}

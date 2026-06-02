import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-end px-6 py-4 sm:px-10">
        <Link href="/design-system" className={buttonVariants({ size: "sm" })}>
          Design System
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <h1 className="font-sans text-5xl font-semibold tracking-tight sm:text-6xl">
          Bieper
        </h1>
        <p className="max-w-md text-center text-lg text-muted-foreground">
          A timer for combat sports training. Coming soon.
        </p>
      </main>
    </div>
  );
}

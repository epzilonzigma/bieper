import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioPreview } from "./audio-preview";

type Swatch = {
  name: string;
  hex: string;
  cssVar?: string;
  usage: string;
};

const coreColours: Swatch[] = [
  { name: "Midnight", hex: "#0B1120", cssVar: "--background", usage: "Main app background" },
  { name: "Deep Navy", hex: "#131B2E", cssVar: "--card / --popover / --surface", usage: "Cards, panels, dialogs" },
  { name: "Slate", hex: "#1C2640", cssVar: "--secondary / --muted / --surface-raised", usage: "Elevated elements, input fields" },
  { name: "Steel", hex: "#2A3550", cssVar: "--border / --input", usage: "Borders, dividers" },
  { name: "Ice White", hex: "#E8EDF5", cssVar: "--foreground", usage: "Headings, timer digits" },
  { name: "Cool Grey", hex: "#8B95A8", cssVar: "--muted-foreground", usage: "Labels, descriptions, muted text" },
  { name: "Dim Grey", hex: "#4D576A", usage: "Disabled / placeholder text" },
];

const accentColours: Swatch[] = [
  { name: "Electric Blue", hex: "#3B82F6", cssVar: "--primary / --ring", usage: "Primary buttons, active timer ring, links" },
  { name: "Bright Blue", hex: "#60A5FA", cssVar: "--primary-hover", usage: "Hover / focus state for primary" },
  { name: "Cyan", hex: "#06B6D4", cssVar: "--accent", usage: "Secondary actions, interval indicators" },
  { name: "Emerald", hex: "#10B981", usage: "Timer running, 'go' state, start button" },
  { name: "Amber", hex: "#F59E0B", usage: "Get-ready countdown, warning prompts" },
  { name: "Red", hex: "#EF4444", cssVar: "--destructive", usage: "Timer stopped, reset, destructive actions" },
  { name: "Vivid Violet", hex: "#8B5CF6", usage: "Reaction-time flash cue, highlight on trigger" },
];

const timerStates: Swatch[] = [
  { name: "Idle", hex: "#8B95A8", cssVar: "--timer-idle", usage: "Timer not started" },
  { name: "Ready", hex: "#F59E0B", cssVar: "--timer-ready", usage: "Countdown before round starts" },
  { name: "Active", hex: "#10B981", cssVar: "--timer-active", usage: "Round in progress" },
  { name: "Rest", hex: "#06B6D4", cssVar: "--timer-rest", usage: "Rest interval between rounds" },
  { name: "Stopped", hex: "#EF4444", cssVar: "--timer-stopped", usage: "Timer paused or ended" },
  { name: "React", hex: "#8B5CF6", cssVar: "--timer-react", usage: "Reaction cue flash" },
];

function SwatchCard({ swatch }: { swatch: Swatch }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div
        className="h-20 w-full rounded-md border border-border"
        style={{ backgroundColor: swatch.hex }}
      />
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-sans text-sm font-semibold text-foreground">
            {swatch.name}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {swatch.hex}
          </span>
        </div>
        {swatch.cssVar && (
          <code className="font-mono text-xs text-accent">{swatch.cssVar}</code>
        )}
        <p className="text-xs text-muted-foreground">{swatch.usage}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  intent,
  children,
}: {
  title: string;
  intent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-sans text-2xl font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{intent}</p>
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-full w-full bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 sm:px-10">
        <header className="flex flex-col gap-3 border-b border-border pb-8">
          <Badge className="w-fit bg-accent text-accent-foreground">
            Design system preview
          </Badge>
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-foreground">
            Bieper — Design System
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Living reference for the colours, typography, and component
            primitives wired into the Bieper app. Every token below is sourced
            from{" "}
            <code className="font-mono text-accent">.claude/docs/design.md</code>{" "}
            and exposed via CSS variables in{" "}
            <code className="font-mono text-accent">app/globals.css</code>.
          </p>
        </header>

        <Section
          title="Core colours"
          intent="Backgrounds, surfaces, borders, and text. Dark-first; chosen for high-contrast readability during training."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {coreColours.map((s) => (
              <SwatchCard key={s.name} swatch={s} />
            ))}
          </div>
        </Section>

        <Section
          title="Accent colours"
          intent="Vibrant accents for actions and feedback. Reserve each colour for the role listed — consistency drives instant recognition."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {accentColours.map((s) => (
              <SwatchCard key={s.name} swatch={s} />
            ))}
          </div>
        </Section>

        <Section
          title="Timer-state colours"
          intent="Drive the visual feedback of the timer. Each state owns one colour; do not reuse these for unrelated UI."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {timerStates.map((s) => (
              <div
                key={s.name}
                className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full border-4"
                  style={{ borderColor: s.hex }}
                >
                  <span
                    className="font-mono text-2xl font-semibold"
                    style={{ color: s.hex }}
                  >
                    0:30
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="font-sans text-sm font-semibold text-foreground">
                    {s.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {s.hex}
                  </span>
                  {s.cssVar && (
                    <code className="font-mono text-xs text-accent">
                      {s.cssVar}
                    </code>
                  )}
                  <p className="text-xs text-muted-foreground">{s.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Typography"
          intent="Geist Sans for UI and headings, Geist Mono for timer digits and code-like tokens."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Heading XL · font-sans · semibold · text-4xl
                </span>
                <code className="font-mono text-xs text-accent">
                  Geist Sans
                </code>
              </div>
              <h1 className="font-sans text-4xl font-semibold tracking-tight text-foreground">
                Round 3 of 5
              </h1>
              <Separator />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Heading L · font-sans · semibold · text-2xl
              </span>
              <h2 className="font-sans text-2xl font-semibold text-foreground">
                Workout settings
              </h2>
              <Separator />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Body · font-sans · regular · text-base · text-foreground
              </span>
              <p className="text-base text-foreground">
                Three minutes work, one minute rest. Bell on every interval.
              </p>
              <Separator />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Body muted · font-sans · regular · text-sm · text-muted-foreground
              </span>
              <p className="text-sm text-muted-foreground">
                Used for labels, helper text, and any secondary information.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Timer digits · font-mono · text-8xl
                </span>
                <code className="font-mono text-xs text-accent">
                  Geist Mono
                </code>
              </div>
              <div
                className="flex items-center justify-center rounded-md py-6"
                style={{ backgroundColor: "var(--surface-raised)" }}
              >
                <span className="font-mono text-8xl font-semibold tracking-tighter text-foreground">
                  02:45
                </span>
              </div>
              <Separator />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Timer label · font-mono · text-2xl
              </span>
              <span className="font-mono text-2xl text-muted-foreground">
                ROUND 03 / 05
              </span>
              <Separator />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Inline code · font-mono · text-sm · text-accent
              </span>
              <code className="font-mono text-sm text-accent">
                new Audio(&apos;/audio/timer-start.mp3&apos;)
              </code>
            </div>
          </div>
        </Section>

        <Section
          title="Buttons"
          intent="shadcn/ui Button variants mapped to the theme. Use the variant whose semantic matches the action."
        >
          <Card>
            <CardContent className="flex flex-col gap-6 p-6">
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Primary · default variant · Start / confirm actions
                </span>
                <div className="flex flex-wrap gap-3">
                  <Button>Start round</Button>
                  <Button size="lg">Start round</Button>
                  <Button size="sm">Start</Button>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Secondary · secondary variant · Lower-emphasis actions
                </span>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary">Adjust settings</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Destructive · destructive variant · Reset / stop / delete
                </span>
                <div className="flex flex-wrap gap-3">
                  <Button variant="destructive">Reset timer</Button>
                  <Button variant="destructive" size="sm">
                    Stop
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section
          title="Form primitives"
          intent="Inputs and labels for the workout configuration screen."
        >
          <Card>
            <CardHeader>
              <CardTitle>Workout configuration</CardTitle>
              <CardDescription>
                Card + CardHeader + CardContent — used for settings panels and
                grouped controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rounds">Rounds</Label>
                <Input id="rounds" type="number" defaultValue={5} />
                <span className="text-xs text-muted-foreground">
                  Label + Input · standard form control
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="work">Work (seconds)</Label>
                <Input id="work" type="number" defaultValue={180} />
                <span className="text-xs text-muted-foreground">
                  Numeric duration input
                </span>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section
          title="Badges & status pills"
          intent="Compact status indicators. Pair with timer-state colours for at-a-glance state."
        >
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge
              style={{
                backgroundColor: "var(--timer-active)",
                color: "#0B1120",
              }}
            >
              Active
            </Badge>
            <Badge
              style={{
                backgroundColor: "var(--timer-ready)",
                color: "#0B1120",
              }}
            >
              Ready
            </Badge>
            <Badge
              style={{
                backgroundColor: "var(--timer-rest)",
                color: "#0B1120",
              }}
            >
              Rest
            </Badge>
          </div>
        </Section>

        <Section
          title="Tabs"
          intent="Tabs primitive for switching between timer modes (e.g. Rounds / Intervals / Reaction)."
        >
          <Tabs defaultValue="rounds">
            <TabsList>
              <TabsTrigger value="rounds">Rounds</TabsTrigger>
              <TabsTrigger value="intervals">Intervals</TabsTrigger>
              <TabsTrigger value="reaction">Reaction</TabsTrigger>
            </TabsList>
            <TabsContent value="rounds">
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Rounds tab content — boxing-style round/rest timer.
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="intervals">
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Intervals tab content — HIIT-style work/rest intervals.
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="reaction">
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Reaction tab content — random flash cue for reflex training.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Section>

        <Section
          title="Border radius"
          intent="Default --radius is 0.625rem. Use rounded-lg for cards, rounded-full for the timer ring and icon buttons."
        >
          <div className="flex flex-wrap gap-4">
            {[
              { label: "sm · 0.375rem", cls: "rounded-sm" },
              { label: "md · 0.5rem", cls: "rounded-md" },
              { label: "lg · 0.625rem · default", cls: "rounded-lg" },
              { label: "xl · 0.875rem", cls: "rounded-xl" },
              { label: "full · timer ring", cls: "rounded-full" },
            ].map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-20 w-20 items-center justify-center border border-border bg-secondary ${r.cls}`}
                />
                <span className="text-xs text-muted-foreground">{r.label}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Audio cues"
          intent="Timer sounds live in public/audio/ and are played client-side via new Audio('/audio/<file>.mp3'). Click Play to preview each cue."
        >
          <Card>
            <CardContent className="p-6">
              <AudioPreview />
            </CardContent>
          </Card>
        </Section>

        <footer className="border-t border-border pt-8 pb-4">
          <p className="text-xs text-muted-foreground">
            Tokens defined in{" "}
            <code className="font-mono text-accent">app/globals.css</code> ·
            Source of truth:{" "}
            <code className="font-mono text-accent">
              .claude/docs/design.md
            </code>
          </p>
        </footer>
      </div>
    </div>
  );
}

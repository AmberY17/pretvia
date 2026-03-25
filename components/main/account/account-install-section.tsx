"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const INSTALL_DISMISSED_KEY = "pretvia-install-dismissed";

const googleAppNoteIOS = (
  <p className="mt-3 text-xs text-muted-foreground">
    Using the Google app?{" "}
    <span className="font-medium text-foreground">
      Open this page in Safari or Chrome first.
    </span>
  </p>
);

const googleAppNoteAndroid = (
  <p className="mt-3 text-xs text-muted-foreground">
    Using the Google app?{" "}
    <span className="font-medium text-foreground">
      Open this page in Chrome first.
    </span>
  </p>
);

function InstallSteps({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-foreground">{children}</strong>;
}

export function AccountInstallSection() {
  const [dismissed, setDismissed] = useState(true); // default true prevents flash

  useEffect(() => {
    try {
      setDismissed(!!localStorage.getItem(INSTALL_DISMISSED_KEY));
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <section id="install" className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
        <Smartphone className="h-4 w-4" />
        Install the App
      </h2>

      <Tabs defaultValue="ios">
        <TabsList className="mb-4 flex h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="ios" className="rounded-full border border-border text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">
            iPhone / iPad
          </TabsTrigger>
          <TabsTrigger value="android" className="rounded-full border border-border text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">
            Android
          </TabsTrigger>
          <TabsTrigger value="desktop" className="rounded-full border border-border text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">
            Desktop
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ios" className="space-y-5">
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">Safari</p>
            <InstallSteps
              steps={[
                <>Tap the menu button (...) in the bottom-right corner</>,
                <>Tap <B>Share</B></>,
                <>Tap <B>Add to Home Screen</B></>,
                <>Tap <B>Add</B></>,
              ]}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">Chrome</p>
            <InstallSteps
              steps={[
                <>Tap the Share button (⬆) at the bottom</>,
                <>Tap <B>Add to Home Screen</B></>,
                <>Tap <B>Add</B></>,
              ]}
            />
          </div>
          {googleAppNoteIOS}
        </TabsContent>

        <TabsContent value="android">
          <p className="mb-1 text-sm font-medium text-foreground">Chrome</p>
          <InstallSteps
            steps={[
              <>Tap the menu button (⋮) in the top-right corner</>,
              <>Tap <B>Add to Home Screen</B></>,
              <>Tap <B>Install</B></>,
            ]}
          />
          {googleAppNoteAndroid}
        </TabsContent>

        <TabsContent value="desktop" className="space-y-5">
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">Chrome / Edge</p>
            <InstallSteps
              steps={[
                <>Click the install icon in the address bar (a monitor with a download arrow)</>,
                <>Click <B>Install</B></>,
              ]}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">
              Safari{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (macOS Sonoma or later)
              </span>
            </p>
            <InstallSteps
              steps={[
                <>Click the <B>File</B> menu in the menu bar</>,
                <>Click <B>Add to Dock</B></>,
                <>Click <B>Add</B></>,
              ]}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 border-t border-border pt-4">
        <Button variant="outline" size="sm" onClick={handleDismiss}>
          I&apos;ve installed the app
        </Button>
      </div>
    </section>
  );
}

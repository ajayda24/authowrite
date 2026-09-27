"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const LABELS: Record<string, string> = { github: "GitHub", google: "Google" };

export function SocialButtons({ providers, next }: { providers: string[]; next: string }) {
  if (providers.length === 0) return null;
  return (
    <div className="space-y-2">
      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => authClient.signIn.social({ provider: provider as "github" | "google", callbackURL: next })}
        >
          Continue with {LABELS[provider] ?? provider}
        </Button>
      ))}
      <div className="flex items-center gap-3 py-2 text-xs text-subtle-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthHeading, FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    if (error && error.status === 429) return setError("Too many requests. Please try again later.");
    // Always show the same message so accounts can't be discovered.
    setSent(true);
  }

  return (
    <>
      <AuthHeading title="Reset your password" subtitle="We'll email you a link to choose a new one." />
      {sent ? (
        <p className="rounded-md border bg-muted px-4 py-3 leading-relaxed">
          If an account exists for that email, a reset link is on its way. Check your inbox.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={error} />
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="underline underline-offset-4">Back to sign in</Link>
      </p>
    </>
  );
}

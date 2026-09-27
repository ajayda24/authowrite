"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { normalizeUsername, validateUsername } from "@/lib/usernames";
import { FormError } from "./auth-card";

export function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [username, setUsername] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const problem = validateUsername(username);
    if (problem) return setUsernameError(problem);
    if (!name) return setError("Please enter your name.");
    if (password.length < 8) return setError("Use a password with at least 8 characters.");

    setPending(true);
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      username: normalizeUsername(username),
      displayUsername: username.trim(),
    });
    if (error) {
      setPending(false);
      const message = error.message ?? "";
      if (/username/i.test(message)) setUsernameError("That username is taken. Try another.");
      else if (/exist/i.test(message))
        setError("An account with that email already exists. Try signing in.");
      else setError(message || "We couldn't create your account. Please try again.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <Field
        label="Your name"
        htmlFor="name"
        hint="Shown on your stories. You can change it later."
      >
        <Input id="name" name="name" autoComplete="name" required autoFocus />
      </Field>
      <Field
        label="Username"
        htmlFor="username"
        error={usernameError}
        hint={
          username ? `Your page: /${normalizeUsername(username)}` : "Letters, numbers, - and _."
        }
      >
        <Input
          id="username"
          name="username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={username}
          aria-invalid={Boolean(usernameError)}
          onChange={(e) => {
            setUsername(e.target.value);
            setUsernameError(null);
          }}
          onBlur={() => username && setUsernameError(validateUsername(username))}
        />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}

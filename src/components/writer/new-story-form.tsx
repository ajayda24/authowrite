"use client";

import { ArrowRightIcon } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStoryAction } from "@/server/actions/stories";

export function NewStoryForm() {
  const [state, action, pending] = useActionState(createStoryAction, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      <label htmlFor="title" className="sr-only">Story title</label>
      <Input
        id="title"
        name="title"
        required
        maxLength={160}
        autoFocus
        autoComplete="off"
        placeholder="The Last Monsoon"
        className="h-14 font-display text-2xl"
        aria-invalid={state && !state.ok ? true : undefined}
        aria-describedby={state && !state.ok ? "title-error" : undefined}
      />
      {state && !state.ok ? (
        <p id="title-error" role="alert" className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Start writing"} <ArrowRightIcon />
      </Button>
    </form>
  );
}

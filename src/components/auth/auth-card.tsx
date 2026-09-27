export function AuthHeading({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      {subtitle ? <p className="text-muted-foreground mt-2">{subtitle}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
    >
      {message}
    </p>
  );
}

/** Only allow same-site relative redirects after sign-in. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return fallback;
  return next;
}

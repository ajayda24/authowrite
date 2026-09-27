import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHeading, safeNext } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SocialButtons } from "@/components/auth/social-buttons";
import { enabledProviders } from "@/server/auth/providers";
import { getViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { next } = await props.searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  if (await getViewer()) redirect(target);
  return (
    <>
      <AuthHeading title="Welcome back" subtitle="Sign in to keep writing and reading." />
      <SocialButtons providers={enabledProviders()} next={target} />
      <SignInForm next={target} />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href={`/sign-up${next ? `?next=${encodeURIComponent(target)}` : ""}`} className="font-medium text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}

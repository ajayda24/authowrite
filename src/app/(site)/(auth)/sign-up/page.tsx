import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHeading, safeNext } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { SocialButtons } from "@/components/auth/social-buttons";
import { enabledProviders } from "@/server/auth/providers";
import { getViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage(props: PageProps<"/sign-up">) {
  const { next } = await props.searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  if (await getViewer()) redirect(target);
  return (
    <>
      <AuthHeading title="Start writing" subtitle="Create a free account. It takes less than a minute." />
      <SocialButtons providers={enabledProviders()} next={target} />
      <SignUpForm next={target} />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}

import type { Metadata } from "next";
import { ProfileForm } from "@/components/settings/profile-form";
import { requireViewer } from "@/server/auth/session";
import { getProfileSettings } from "@/server/services/users";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer("/settings");
  const profile = await getProfileSettings(viewer);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Settings</h1>
      <p className="mt-2 text-muted-foreground">How you appear to readers.</p>
      <ProfileForm
        initial={{
          name: profile.name,
          username: profile.displayUsername ?? profile.username ?? "",
          bio: profile.bio,
          image: profile.image,
          email: profile.email,
        }}
      />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { uploadImageFile } from "@/lib/upload-client";
import { normalizeUsername, validateUsername } from "@/lib/usernames";
import { updateProfileAction } from "@/server/actions/profile";

export function ProfileForm({
  initial,
}: {
  initial: { name: string; username: string; bio: string; image: string | null; email: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [image, setImage] = useState(initial.image);
  const [name, setName] = useState(initial.name);
  const [username, setUsername] = useState(initial.username);
  const [uploading, setUploading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      setImage((await uploadImageFile(file)).url);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validateUsername(username);
    if (problem) return setUsernameError(problem);
    const bio = String(new FormData(event.currentTarget).get("bio") ?? "");
    startTransition(async () => {
      const result = await updateProfileAction({ name, username, bio, image });
      if (result.ok) {
        toast.success("Profile saved.");
        router.refresh();
      } else toast.error(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={name || "?"} src={image} size={72} />
        <div className="flex gap-2">
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="sr-only" id="avatar" onChange={(e) => onAvatar(e.target.files?.[0])} />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? "Uploading…" : "Change photo"}
          </Button>
          {image ? <Button type="button" variant="ghost" size="sm" onClick={() => setImage(null)}>Remove</Button> : null}
        </div>
      </div>
      <Field label="Name" htmlFor="name">
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
      </Field>
      <Field label="Username" htmlFor="username" error={usernameError} hint={`Your profile: /${normalizeUsername(username)}`}>
        <Input
          id="username"
          value={username}
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(usernameError)}
          onChange={(e) => {
            setUsername(e.target.value);
            setUsernameError(null);
          }}
        />
      </Field>
      <Field label="Bio" htmlFor="bio" hint="A line or two about you and what you write.">
        <Textarea id="bio" name="bio" defaultValue={initial.bio} maxLength={500} rows={4} />
      </Field>
      <Field label="Email" htmlFor="email" hint="Used for signing in and password resets. Never shown publicly.">
        <Input id="email" value={initial.email} disabled readOnly />
      </Field>
      <Button type="submit" disabled={pending || uploading}>{pending ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}

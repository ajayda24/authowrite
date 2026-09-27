"use client";

import {
  BookmarkIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { ThemePicker } from "./theme-menu";

export function UserMenu({
  viewer,
}: {
  viewer: { name: string; username: string; image: string | null };
}) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label="Account menu"
      >
        <Avatar name={viewer.name} src={viewer.image} size={30} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-foreground">
          <span className="block truncate font-medium">{viewer.name}</span>
          <span className="text-muted-foreground block truncate">@{viewer.username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboardIcon /> My stories
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/bookmarks">
            <BookmarkIcon /> Bookmarks
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${viewer.username}`}>
            <UserIcon /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-1.5 py-1">
          <ThemePicker />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await authClient.signOut();
            router.push("/");
            router.refresh();
          }}
        >
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

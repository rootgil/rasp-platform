"use client";

import { Bell, Search, ChevronDown, LogOut, User, Settings, Menu, ShieldCheck, ShieldAlert, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

interface Notification {
  id:        string;
  projectId: string;
  createdAt: string;
  rule: {
    id:             string;
    name:           string;
    type:           string;
    severity:       string;
    description:    string | null;
    yamlDefinition: string | null;
  };
  project: {
    id:   string;
    name: string;
  };
}

const SEVERITY_COLORS: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high:     "destructive",
  medium:   "secondary",
  low:      "outline",
};

interface TopbarProps {
  onMenuClick:      () => void;
  onNotifCountChange?: (count: number) => void;
}

export function Topbar({ onMenuClick, onNotifCountChange }: TopbarProps) {
  const { data: session } = useSession();
  const name = session?.user?.name ?? session?.user?.email ?? "User";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expandedYaml, setExpandedYaml]   = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch("/api/project-rules/notifications");
      if (!res.ok) return;
      const data = await res.json() as { notifications: Notification[]; totalCount: number };
      setNotifications(data.notifications);
      onNotifCountChange?.(data.totalCount);
    } catch {
      // Fail silently
    }
  }, [onNotifCountChange]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function handleAccept(notifId: string, ruleName: string) {
    try {
      const res = await fetch(`/api/project-rules/notifications/${notifId}/accept`, { method: "POST" });
      if (res.ok) {
        toast.success(`Rule "${ruleName}" activated - don't forget to publish`);
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
        onNotifCountChange?.(notifications.length - 1);
      } else {
        toast.error("Failed to activate rule");
      }
    } catch {
      toast.error("Failed to activate rule");
    }
  }

  async function handleDecline(notifId: string) {
    try {
      const res = await fetch(`/api/project-rules/notifications/${notifId}/decline`, { method: "POST" });
      if (res.ok) {
        toast.info("Rule declined - you can activate it later from the Rules page");
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
        onNotifCountChange?.(notifications.length - 1);
      } else {
        toast.error("Failed to decline");
      }
    } catch {
      toast.error("Failed to decline");
    }
  }

  const pendingCount = notifications.length;

  return (
    <header className="fixed top-0 left-0 lg:left-[260px] right-0 h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 z-30">
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden flex items-center justify-center h-9 w-9 rounded-md hover:bg-border-light transition-colors mr-2 shrink-0"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-text-secondary" />
      </button>

      {/* Logo - mobile only, centered */}
      <div className="sm:hidden absolute left-1/2 -translate-x-1/2">
        <Image src="/logo.png" alt="queno" width={90} height={26} className="object-contain" style={{ width: "auto" }} />
      </div>

      {/* Search - disabled until implemented */}
      <div className="relative max-w-sm w-full hidden sm:block opacity-50 cursor-not-allowed">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search events, agents, endpoints..."
          disabled
          className="w-full h-9 pl-9 pr-4 text-sm rounded-md border border-border bg-background text-text-primary placeholder:text-text-muted cursor-not-allowed"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Environment selector */}
        <div className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-sm font-medium text-text-secondary bg-background cursor-pointer hover:bg-white transition-colors">
          <span className="h-2 w-2 rounded-full bg-success" />
          Production
          <ChevronDown size={14} className="text-text-muted" />
        </div>

        {/* Notifications Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-border-light transition-colors">
              <Bell size={18} className="text-text-secondary" />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-critical flex items-center justify-center text-[10px] font-bold text-white leading-none">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96 max-h-[480px] overflow-y-auto p-0">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-text-primary">Security Notifications</p>
              {pendingCount > 0 && (
                <p className="text-xs text-text-secondary mt-0.5">
                  {pendingCount} new rule{pendingCount > 1 ? "s" : ""} require your action
                </p>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <ShieldCheck size={24} className="mx-auto text-success mb-2" />
                <p className="text-sm text-text-secondary">All rules reviewed</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notif) => (
                  <div key={notif.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <ShieldAlert size={13} className="text-critical shrink-0" />
                          <span className="text-sm font-medium text-text-primary">{notif.rule.name}</span>
                          <Badge variant={SEVERITY_COLORS[notif.rule.severity] ?? "outline"} className="text-[10px] px-1.5 py-0">
                            {notif.rule.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-text-muted">Project: {notif.project.name}</p>
                        {notif.rule.description && (
                          <p className="text-xs text-text-secondary">{notif.rule.description}</p>
                        )}
                      </div>
                    </div>

                    {notif.rule.yamlDefinition && (
                      <div>
                        <button
                          className="text-xs text-brand hover:underline"
                          onClick={() => setExpandedYaml(expandedYaml === notif.id ? null : notif.id)}
                        >
                          {expandedYaml === notif.id ? "Hide YAML" : "View YAML"}
                        </button>
                        {expandedYaml === notif.id && (
                          <pre className="mt-1.5 p-2 rounded bg-background border border-border text-[10px] font-mono overflow-x-auto max-h-32 text-text-primary">
                            {notif.rule.yamlDefinition}
                          </pre>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => handleAccept(notif.id, notif.rule.name)}
                      >
                        <Check size={12} className="mr-1" />
                        Activate
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
                            <X size={12} className="mr-1" />
                            Ignore
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Ignore this security rule?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <strong>{notif.rule.name}</strong> (severity: {notif.rule.severity}) protects against{" "}
                              <strong>{notif.rule.type.replace(/_/g, " ")}</strong> attacks.
                              <br /><br />
                              You can activate it later from the Rules page. Are you sure you want to ignore it now?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleDecline(notif.id)}
                            >
                              Yes, ignore
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-9 px-2 rounded-md hover:bg-border-light transition-colors">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-xs font-semibold">
                {initials}
              </div>
              <span className="hidden md:block text-sm font-medium text-text-primary max-w-[120px] truncate">
                {name}
              </span>
              <ChevronDown size={14} className="text-text-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{session?.user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                <User size={14} className="mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                <Settings size={14} className="mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-critical focus:text-critical cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={14} className="mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

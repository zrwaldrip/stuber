import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { View } from "@/components/AppHeader";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type AdminUserRow = {
  user_id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  user_level: string;
  profile_photo_path?: string | null;
  car_id?: number | null;
};

interface AdminUsersViewProps {
  actingUserId: number;
  onNavigate: (view: View) => void;
}

const AdminUsersView = ({ actingUserId, onNavigate }: AdminUsersViewProps) => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    userLevel: "user" as "user" | "admin",
  });
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { "X-Acting-User-Id": String(actingUserId) },
      });
      if (response.status === 403 || response.status === 401) {
        setForbidden(true);
        setUsers([]);
        return;
      }
      if (!response.ok) throw new Error("Failed to load users");
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Could not load users.",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [actingUserId]);

  const openEdit = (u: AdminUserRow) => {
    setEditing(u);
    setForm({
      firstName: u.first_name ?? "",
      lastName: u.last_name ?? "",
      username: u.username ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
      userLevel: u.user_level === "admin" ? "admin" : "user",
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${editing.user_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Acting-User-Id": String(actingUserId),
        },
        body: JSON.stringify({
          firstName: form.firstName.trim() || null,
          lastName: form.lastName.trim() || null,
          username: form.username.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim().toLowerCase(),
          userLevel: form.userLevel,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Save failed");
      }
      toast({ title: "Saved", description: "User updated." });
      setEditing(null);
      await fetchUsers();

      if (editing.user_id === actingUserId && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("blueride.user");
          if (raw) {
            const parsed = JSON.parse(raw);
            localStorage.setItem(
              "blueride.user",
              JSON.stringify({ ...parsed, ...payload })
            );
          }
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Could not save.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (u: AdminUserRow) => {
    if (u.user_id === actingUserId) {
      toast({
        title: "Not allowed",
        description: "You cannot delete your own account here.",
        variant: "destructive",
      });
      return;
    }
    if (
      !window.confirm(
        `Delete ${u.first_name} ${u.last_name} (@${u.username})? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(u.user_id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${u.user_id}`, {
        method: "DELETE",
        headers: { "X-Acting-User-Id": String(actingUserId) },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Delete failed");
      }
      toast({ title: "User deleted", description: `${u.first_name} ${u.last_name} was removed.` });
      if (editing?.user_id === u.user_id) setEditing(null);
      await fetchUsers();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Could not delete user.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in px-4 py-6 pb-24">
        <p className="text-center text-sm text-muted-foreground">
          You do not have access to this page.
        </p>
        <Button variant="outline" className="mt-4 w-full" onClick={() => onNavigate("profile")}>
          Back to profile
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg animate-fade-in px-4 py-6 pb-24">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onNavigate("profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground">Manage users and roles</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border/70 bg-card p-8 text-center dark:border-white/15">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading users…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u, i) => (
            <div
              key={u.user_id}
              className="animate-slide-up flex items-stretch gap-2 rounded-xl border border-border/70 bg-card shadow-sm dark:border-white/15"
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
            >
              <button
                type="button"
                onClick={() => openEdit(u)}
                className="min-w-0 flex-1 p-4 text-left transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  {u.user_level === "admin" ? (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <Shield className="h-3 w-3" />
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-xs">
                      User
                    </Badge>
                  )}
                </div>
              </button>
              {u.user_id !== actingUserId ? (
                <div className="flex shrink-0 items-center border-l border-border/70 pr-2 dark:border-white/15">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={deletingId === u.user_id}
                    aria-label={`Delete ${u.first_name} ${u.last_name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(u);
                    }}
                  >
                    {deletingId === u.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="adm-fn">First name</Label>
              <Input
                id="adm-fn"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adm-ln">Last name</Label>
              <Input
                id="adm-ln"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adm-un">Username</Label>
              <Input
                id="adm-un"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adm-em">Email</Label>
              <Input
                id="adm-em"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adm-ph">Phone</Label>
              <Input
                id="adm-ph"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>User level</Label>
              <Select
                value={form.userLevel}
                onValueChange={(v) => setForm((f) => ({ ...f, userLevel: v as "user" | "admin" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {editing && editing.user_id !== actingUserId ? (
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={saving || deletingId === editing.user_id}
                onClick={() => handleDeleteUser(editing)}
              >
                {deletingId === editing?.user_id ? "Deleting…" : "Delete user"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersView;

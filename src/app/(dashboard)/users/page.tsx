"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, getApiErrorMessage } from "@/lib/api";
import { User, CreateUserDto, UserRole } from "@/types";
import { formatDate, getRoleMeta, cn } from "@/lib/utils";
import { Plus, Search, Save, X, Shield, UserCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // All hooks above — admin guard below
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
    enabled: isAdmin,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      usersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User status updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (!isAdmin) {
    router.replace("/dashboard");
    return null;
  }

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: Shield, color: "text-brand-700", bg: "bg-brand-50" },
          { label: "Active", value: activeCount, icon: UserCheck, color: "text-green-700", bg: "bg-green-50" },
          { label: "Inactive", value: users.length - activeCount, icon: UserX, color: "text-red-700", bg: "bg-red-50" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="stat-card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg}`}>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 font-display">{c.value}</p>
                <p className="text-xs text-slate-600">{c.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search users…" className="form-input pl-8 w-64 py-1.5 text-sm"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select w-auto py-1.5 text-sm" value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}>
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="DEPARTMENT_OFFICER">Department Officer</option>
            <option value="DATA_ENTRY">Data Entry</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
        <button onClick={() => { setEditItem(null); setDialogOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-th">User</th>
              <th className="table-th">Role</th>
              <th className="table-th">Department</th>
              <th className="table-th">Phone</th>
              <th className="table-th">Status</th>
              <th className="table-th">Joined</th>
              <th className="table-th" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="table-td"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="table-td text-center py-12 text-slate-400">No users found.</td></tr>
            ) : (
              filtered.map((u) => {
                const roleMeta = getRoleMeta(u.role);
                const isActive = u.status === "ACTIVE";
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-700 text-xs font-semibold">
                            {u.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{u.fullName}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <span className={cn("badge", roleMeta.color)}>{roleMeta.label}</span>
                    </td>
                    <td className="table-td text-slate-600 text-sm">{u.department ?? "—"}</td>
                    <td className="table-td text-slate-600 text-sm">{u.phone ?? "—"}</td>
                    <td className="table-td">
                      <button
                        onClick={() => statusMutation.mutate({ id: u.id, status: isActive ? "INACTIVE" : "ACTIVE" })}
                        className={cn(
                          "badge cursor-pointer hover:opacity-80 transition-opacity",
                          isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}
                        disabled={statusMutation.isPending}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="table-td text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="table-td">
                      <button onClick={() => { setEditItem(u); setDialogOpen(true); }} className="btn-ghost text-xs py-1">
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <UserDialog user={editItem} onClose={() => { setDialogOpen(false); setEditItem(null); }} />
      )}
    </div>
  );
}

function UserDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateUserDto>({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "VIEWER",
    department: user?.department ?? "",
    phone: user?.phone ?? "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      user
        ? usersApi.update(user.id, { fullName: form.fullName, role: form.role, department: form.department, phone: form.phone })
        : usersApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(user ? "User updated" : "User created");
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{user ? "Edit User" : "New User"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Email Address *</label>
            <input type="email" className="form-input" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!user} />
          </div>
          {!user && (
            <div>
              <label className="form-label">Password *</label>
              <input type="password" className="form-input" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          )}
          <div>
            <label className="form-label">Role *</label>
            <select className="form-select" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              <option value="VIEWER">Viewer</option>
              <option value="DATA_ENTRY">Data Entry</option>
              <option value="DEPARTMENT_OFFICER">Department Officer</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="form-label">Department</label>
            <input className="form-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Agriculture, Horticulture…" />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9XXXXXXXXX" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.fullName || !form.email || (!user && !form.password)}
            className="btn-primary"
          >
            {mutation.isPending ? "Saving…" : <><Save className="w-3.5 h-3.5" /> {user ? "Update" : "Create User"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

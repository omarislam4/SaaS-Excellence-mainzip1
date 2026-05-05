import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Trash2, Edit2, Check, X, Shield, UserCheck } from "lucide-react";
import { doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { useMembers } from "@/hooks/useMembers";
import { useSpaces } from "@/hooks/useSpaces";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/shared/EmptyState";
import { MemberRowSkeleton } from "@/components/shared/SkeletonLoader";
import { toast } from "sonner";
import { UserDoc } from "@/contexts/AuthContext";

export default function Members() {
  const { members, loading } = useMembers();
  const { spaces } = useSpaces();
  const { isAdmin } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ displayName: "", email: "", role: "member" as "admin" | "member" });
  const [editForm, setEditForm] = useState<Partial<UserDoc>>({});

  if (!isAdmin) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full">
        <Shield className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-foreground font-semibold">Admin access required</p>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.displayName.trim()) return;
    try {
      await addDoc(collection(db, "users"), {
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        role: form.role,
        avatar: "",
        spaceIds: [],
        createdAt: serverTimestamp(),
      });
      toast.success("Member added");
      setShowCreate(false);
      setForm({ displayName: "", email: "", role: "member" });
    } catch {
      toast.error("Failed to add member");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateDoc(doc(db, "users", id), editForm);
      toast.success("Member updated");
      setEditing(null);
    } catch {
      toast.error("Failed to update member");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "users", id));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to delete member");
    }
  };

  const handleSpaceToggle = async (member: UserDoc, spaceId: string) => {
    const hasSpace = member.spaceIds?.includes(spaceId);
    const newSpaceIds = hasSpace
      ? (member.spaceIds || []).filter((id) => id !== spaceId)
      : [...(member.spaceIds || []), spaceId];
    try {
      await updateDoc(doc(db, "users", member.id), { spaceIds: newSpaceIds });
      const spaceDoc = spaces.find((s) => s.id === spaceId);
      if (spaceDoc) {
        const newMemberIds = hasSpace
          ? (spaceDoc.memberIds || []).filter((id) => id !== member.id)
          : [...(spaceDoc.memberIds || []), member.id];
        await updateDoc(doc(db, "spaces", spaceId), { memberIds: newMemberIds });
      }
      toast.success(hasSpace ? "Removed from space" : "Added to space");
    } catch {
      toast.error("Failed to update space access");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{members.length} team member{members.length !== 1 ? "s" : ""}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          data-testid="add-member-btn"
        >
          <Plus className="w-4 h-4" /> Add Member
        </motion.button>
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="bg-card border border-border rounded-xl p-5 mb-6 overflow-hidden"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Add New Member</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Name</label>
                <input
                  value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Full name"
                  className="w-full px-3 py-2.5 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  data-testid="input-member-name" required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Email</label>
                <input
                  type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="member@company.com"
                  className="w-full px-3 py-2.5 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  data-testid="input-member-email" required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Role</label>
              <select
                value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "admin" | "member" }))}
                className="px-3 py-2.5 text-sm bg-background border border-input rounded-xl focus:outline-none"
                data-testid="select-role"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors" data-testid="submit-member">Add Member</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Members list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          Array(4).fill(0).map((_, i) => <MemberRowSkeleton key={i} />)
        ) : members.length === 0 ? (
          <EmptyState icon={Users} title="No members yet" description="Add team members to collaborate on tasks." action={{ label: "Add Member", onClick: () => setShowCreate(true) }} />
        ) : (
          members.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="border-b border-border last:border-0"
              data-testid={`member-row-${member.id}`}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {(member.displayName || member.email || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {editing === member.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editForm.displayName || member.displayName}
                        onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                        className="text-sm bg-background border border-input rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        data-testid={`edit-name-${member.id}`}
                      />
                      <button onClick={() => handleUpdate(member.id)} className="text-emerald-500 hover:text-emerald-600 transition-colors" data-testid={`save-member-${member.id}`}><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-foreground truncate">{member.displayName || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </>
                  )}
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${member.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {member.role}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditing(member.id); setEditForm({ displayName: member.displayName }); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    data-testid={`edit-member-${member.id}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    data-testid={`delete-member-${member.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Space access */}
              {spaces.length > 0 && (
                <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Spaces:
                  </span>
                  {spaces.map((space) => {
                    const hasAccess = member.spaceIds?.includes(space.id);
                    return (
                      <button
                        key={space.id}
                        onClick={() => handleSpaceToggle(member, space.id)}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-all ${hasAccess ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                        data-testid={`space-access-${member.id}-${space.id}`}
                      >
                        {hasAccess && <span className="mr-1">✓</span>}{space.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

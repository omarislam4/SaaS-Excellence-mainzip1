import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Bell, Calendar, Clock, User, Send,
  CheckCircle2, AlertCircle, Activity, Loader2, MessageSquare,
} from "lucide-react";
import {
  doc, updateDoc, arrayUnion, serverTimestamp, Timestamp, onSnapshot,
} from "firebase/firestore";
import { useEffect } from "react";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Task, TaskStatus, TaskPriority, ActivityLog } from "@/hooks/useTasks";
import { useMembers } from "@/hooks/useMembers";
import { useSenders } from "@/hooks/useSenders";
import { useSpaces } from "@/hooks/useSpaces";
import { TaskStatusBadge, statusOptions, statusConfig } from "@/components/tasks/TaskStatusBadge";
import { TaskPriorityBadge, priorityOptions } from "@/components/tasks/TaskPriorityBadge";
import { AvatarGroup } from "@/components/shared/AvatarGroup";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { toast } from "sonner";
import { format } from "date-fns";

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function mapTaskDoc(id: string, d: Record<string, unknown>): Task {
  const rawLog = Array.isArray(d.activityLog) ? d.activityLog : [];
  const activityLog: ActivityLog[] = (rawLog as Record<string, unknown>[]).map((item, idx) => ({
    id: `${id}-${idx}`,
    type: (item.type as ActivityLog["type"]) || "message",
    source: (item.source as ActivityLog["source"]) || "manual",
    text: (item.text as string) || "",
    timestamp: typeof item.timestamp === "number" ? item.timestamp : Date.now(),
    sender: item.sender as string | undefined,
  }));

  return {
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigneeIds: [],
    senderId: "",
    spaceId: "",
    estimatedHours: 0,
    progress: 0,
    createdBy: "",
    ...d,
    id,
    deadline: toDate(d.deadline),
    createdAt: toDate(d.createdAt) ?? new Date(),
    completedAt: toDate(d.completedAt),
    activityLog,
  } as Task;
}

export default function TaskDetail() {
  const { spaceId, taskId } = useParams<{ spaceId: string; taskId: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const { isAdmin, userDoc } = useAuth();
  const { members } = useMembers();
  const { senders } = useSenders();
  const { spaces } = useSpaces();
  const [, navigate] = useLocation();
  const editTitleRef = useRef<HTMLHeadingElement>(null);

  const space = spaces.find((s) => s.id === spaceId);
  const spaceMembers = space?.memberIds ? members.filter((m) => space.memberIds.includes(m.id)) : members;

  // Listen to task document in real-time (activityLog lives here)
  useEffect(() => {
    if (!taskId) return;
    const unsub = onSnapshot(doc(db, "tasks", taskId), (snap) => {
      if (snap.exists()) {
        setTask(mapTaskDoc(snap.id, snap.data() as Record<string, unknown>));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [taskId]);

  // Update task fields and optionally append a notification to activityLog
  const updateTask = async (updates: Partial<Task>, activityText?: string) => {
    if (!taskId || !task) return;
    try {
      const payload: Record<string, unknown> = {
        ...updates,
        ...(updates.status === "done" && { completedAt: serverTimestamp() }),
      };

      if (activityText && userDoc) {
        const entry = {
          type: "notification",
          source: "manual",
          text: activityText,
          timestamp: Date.now(),
          sender: userDoc.displayName || userDoc.email || "Unknown",
        };
        payload.activityLog = arrayUnion(entry);
      }

      await updateDoc(doc(db, "tasks", taskId), payload);
    } catch {
      toast.error("Failed to update task");
    }
  };

  // Send WhatsApp reminder and log it in activityLog
  const handleSendReminder = async () => {
    if (!task) return;
    setSending(true);
    try {
      const assigneeMembers = members.filter((m) => task.assigneeIds.includes(m.id));
      const membersWithPhone = assigneeMembers.filter((m) => m.phone && m.phone.trim() !== "");

      if (membersWithPhone.length === 0) {
        toast.error("No assignees have a phone number set. Ask them to add it in Settings.");
        return;
      }

      const { getDoc: fsGetDoc, doc: fsDoc } = await import("firebase/firestore");
      const settingsSnap = await fsGetDoc(fsDoc(db, "settings", "global"));
      const webhookUrl = settingsSnap.exists()
        ? settingsSnap.data().webhookUrl
        : "https://n8n.bodhosting.com/webhook/manual-send-notification";

      const targetUrl = webhookUrl
        ? webhookUrl.replace(/\/webhook\/[^/]+$/, "/webhook/manual-send-notification")
        : "https://n8n.bodhosting.com/webhook/manual-send-notification";

      const phones = membersWithPhone.map((m) => `${m.countryCode || ""}${m.phone}`.replace(/\s/g, ""));
      const assignees = membersWithPhone.map((m) => m.displayName || m.email || "");
      const memberIds = membersWithPhone.map((m) => m.id);

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "manual_notify",
          task: {
            id: task.id,
            name: task.title,
            deadline: task.deadline ? task.deadline.toISOString() : "",
            progress: String(task.progress || 0),
          },
          phones,
          assignees,
          memberIds,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Webhook returned ${res.status}: ${text}`);
      }

      // Save notification in activityLog on the task document
      const names = membersWithPhone.map((m) => m.displayName || m.phone).join(", ");
      await updateDoc(doc(db, "tasks", task.id), {
        activityLog: arrayUnion({
          type: "notification",
          source: "manual",
          text: `Reminder sent via WhatsApp to ${names}`,
          timestamp: Date.now(),
          sender: userDoc?.displayName || userDoc?.email || "Admin",
        }),
      });

      toast.success(`Reminder sent to ${membersWithPhone.length} member(s) via WhatsApp`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to send reminder: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  // Add a manual comment to activityLog
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId || !userDoc) return;
    setAddingComment(true);
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        activityLog: arrayUnion({
          type: "comment",
          source: "manual",
          text: newComment.trim(),
          timestamp: Date.now(),
          sender: userDoc.displayName || userDoc.email || "Unknown",
        }),
      });
      setNewComment("");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setAddingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-32" />
          <div className="h-10 bg-muted rounded w-3/4" />
          <div className="grid grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-foreground font-semibold">Task not found</p>
        <button onClick={() => navigate(`/spaces/${spaceId}`)} className="mt-4 text-sm text-primary hover:underline">
          Back to space
        </button>
      </div>
    );
  }

  const sender = senders.find((s) => s.id === task.senderId);

  // Sort activity newest first
  const sortedActivity = [...(task.activityLog || [])].sort((a, b) => b.timestamp - a.timestamp);

  const activityIcon = {
    reply: "💬",
    notification: "🔔",
    message: "📨",
    comment: "✏️",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/spaces/${spaceId}`)}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-xs text-muted-foreground flex items-center gap-1">
          <span className="hover:text-foreground cursor-pointer" onClick={() => navigate("/spaces")}>Spaces</span>
          <span>/</span>
          <span className="hover:text-foreground cursor-pointer" onClick={() => navigate(`/spaces/${spaceId}`)}>{space?.name}</span>
          <span>/</span>
          <span className="text-foreground font-medium">Task</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSendReminder}
          disabled={sending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-border bg-card text-foreground rounded-xl hover:bg-muted transition-all disabled:opacity-60"
          data-testid="send-reminder-btn"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          Send Reminder
        </motion.button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div>
            <h1
              ref={editTitleRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const newTitle = e.currentTarget.textContent?.trim();
                if (newTitle && newTitle !== task.title) {
                  updateTask({ title: newTitle });
                }
              }}
              className="text-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/30 rounded-lg px-1 -mx-1 cursor-text"
              data-testid="task-title-editable"
            >
              {task.title}
            </h1>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Description</label>
            <textarea
              defaultValue={task.description || ""}
              placeholder="Add a description..."
              rows={4}
              onBlur={(e) => {
                if (e.target.value !== task.description) {
                  updateTask({ description: e.target.value });
                }
              }}
              className="w-full px-3 py-2.5 text-sm bg-card border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              data-testid="task-description"
            />
          </div>

          {/* Progress */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Progress</label>
              <span className="text-sm font-bold text-foreground">{task.progress}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={task.progress}
              onChange={(e) => updateTask({ progress: Number(e.target.value) })}
              className="w-full accent-primary cursor-pointer"
              data-testid="task-progress-slider"
            />
            <div className="mt-2">
              <ProgressBar value={task.progress} color="primary" />
            </div>
          </div>

          {/* Activity */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Activity</h3>
              {sortedActivity.length > 0 && (
                <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 ml-auto">
                  {sortedActivity.length}
                </span>
              )}
            </div>

            {/* Comment input */}
            <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                data-testid="comment-input"
              />
              <button
                type="submit"
                disabled={addingComment || !newComment.trim()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
                data-testid="comment-submit"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Activity list — only messages, replies, notifications, comments */}
            {sortedActivity.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {sortedActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
                      {activityIcon[a.type] ?? "💬"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {a.sender && (
                          <span className="text-xs font-semibold text-foreground">{a.sender}</span>
                        )}
                        <span className="text-xs text-muted-foreground capitalize">{a.type}</span>
                        {a.source === "whatsapp" && (
                          <span className="text-xs bg-emerald-500/10 text-emerald-600 rounded-full px-1.5 py-0.5">WhatsApp</span>
                        )}
                      </div>
                      <p className="text-xs text-foreground mt-0.5 bg-muted rounded-lg px-3 py-1.5 break-words">{a.text}</p>
                      <span className="text-xs text-muted-foreground/60">
                        {format(new Date(a.timestamp), "MMM d, HH:mm")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <MessageSquare className="w-8 h-8 opacity-30" />
                <p className="text-sm">No activity yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Status</label>
            <select
              value={task.status}
              onChange={(e) => updateTask({ status: e.target.value as TaskStatus })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              data-testid="select-task-status"
            >
              {statusOptions.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
            </select>
            <div className="mt-2">
              <TaskStatusBadge status={task.status} />
            </div>
          </div>

          {/* Priority */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Priority</label>
            <select
              value={task.priority}
              onChange={(e) => updateTask({ priority: e.target.value as TaskPriority })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              data-testid="select-task-priority"
            >
              {priorityOptions.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <div className="mt-2">
              <TaskPriorityBadge priority={task.priority} />
            </div>
          </div>

          {/* Assignees */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Assignees</label>
            <div className="mb-2">
              <AvatarGroup memberIds={task.assigneeIds} members={members} max={5} size="md" />
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {spaceMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-2">No members in this space</p>
              ) : spaceMembers.map((m) => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={task.assigneeIds.includes(m.id)}
                    onChange={(e) => {
                      const newIds = e.target.checked
                        ? [...task.assigneeIds, m.id]
                        : task.assigneeIds.filter((id) => id !== m.id);
                      updateTask({ assigneeIds: newIds });
                    }}
                    className="accent-primary"
                    data-testid={`assignee-${m.id}`}
                  />
                  <span className="text-xs text-foreground">{m.displayName || m.email}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5" /> Deadline
            </label>
            <input
              type="date"
              defaultValue={task.deadline ? format(task.deadline, "yyyy-MM-dd") : ""}
              onBlur={(e) => {
                const val = e.target.value ? new Date(e.target.value) : null;
                updateTask({ deadline: val as Task["deadline"] });
              }}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              data-testid="input-task-deadline"
            />
          </div>

          {/* Estimated hours */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5" /> Estimated Hours
            </label>
            <input
              type="number"
              defaultValue={task.estimatedHours}
              min={0}
              onBlur={(e) => updateTask({ estimatedHours: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              data-testid="input-task-hours"
            />
          </div>

          {/* Sender */}
          {sender && (
            <div className="bg-card border border-border rounded-xl p-4">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5" /> Sender
              </label>
              <p className="text-sm font-medium text-foreground">{sender.name}</p>
              {sender.company && <p className="text-xs text-muted-foreground">{sender.company}</p>}
              {sender.email && <p className="text-xs text-muted-foreground">{sender.email}</p>}
            </div>
          )}

          {/* Created info */}
          <div className="px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p>Created {format(task.createdAt, "MMM d, yyyy")}</p>
            {task.completedAt && (
              <p className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="w-3 h-3" />
                Completed {format(task.completedAt, "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

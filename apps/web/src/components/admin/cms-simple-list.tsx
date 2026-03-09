"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash,
  PencilSimple,
  CircleNotch,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Sparkle,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import { CmsHowToUse, type GuideItem } from "./cms-how-to-use";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CmsColumn {
  /** Field key in the data object */
  key: string;
  /** Display header */
  label: string;
  /** Placeholder for input */
  placeholder?: string;
  /** Whether this column is required when adding */
  required?: boolean;
  /** Width class (tailwind) */
  width?: string;
}

interface CmsItem {
  id: string;
  is_active: boolean;
  order_index?: number;
  [key: string]: unknown;
}

interface CmsSimpleListProps {
  /** API slug: "skills" | "industries" | "levels" */
  tableName: string;
  /** Column definitions */
  columns: CmsColumn[];
  /** Label for the add button, e.g. "Add Skill" */
  addLabel: string;
  /** Guide items for the how-to-use panel */
  guideItems: GuideItem[];
  /** Tip text for the guide */
  guideTip?: string;
  /** Whether to show reorder controls (for levels) */
  showReorder?: boolean;
  /** Noun for empty state, e.g. "skills" */
  noun: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CmsSimpleList({
  tableName,
  columns,
  addLabel,
  guideItems,
  guideTip,
  showReorder = false,
  noun,
}: CmsSimpleListProps) {
  const [items, setItems] = useState<CmsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CmsItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add-row state: keyed by column key
  const [addValues, setAddValues] = useState<Record<string, string>>({});
  const [addError, setAddError] = useState<string | null>(null);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    id: string;
    key: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/cms/${tableName}`);
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to load items");
      }
      const data: CmsItem[] = await res.json();
      setItems(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load items",
      );
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // -------------------------------------------------------------------------
  // Add
  // -------------------------------------------------------------------------

  async function handleAdd() {
    setAddError(null);

    // Validate required
    for (const col of columns) {
      if (col.required && !addValues[col.key]?.trim()) {
        setAddError(`${col.label} is required`);
        return;
      }
    }

    const payload: Record<string, unknown> = {};
    for (const col of columns) {
      const val = addValues[col.key]?.trim();
      if (val) {
        payload[col.key] = val;
      }
    }

    // For levels, auto-assign next order_index
    if (showReorder) {
      const maxIdx = items.reduce(
        (max, item) =>
          typeof item.order_index === "number"
            ? Math.max(max, item.order_index)
            : max,
        -1,
      );
      payload.order_index = maxIdx + 1;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cms/${tableName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to add item");
      }
      const newItem: CmsItem = await res.json();
      setItems((prev) => {
        if (showReorder) {
          // Insert in order
          const updated = [...prev, newItem];
          updated.sort(
            (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
          );
          return updated;
        }
        return [newItem, ...prev];
      });
      setAddValues({});
      toast.success(`${addLabel.replace("Add ", "")} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Inline edit
  // -------------------------------------------------------------------------

  function startEdit(item: CmsItem, key: string) {
    setEditingCell({ id: item.id, key });
    setEditValue(String(item[key] ?? ""));
    // Focus after render
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditValue("");
  }

  async function saveEdit() {
    if (!editingCell) return;

    const { id, key } = editingCell;
    const trimmed = editValue.trim();

    // Find the column to check if required
    const col = columns.find((c) => c.key === key);
    if (col?.required && !trimmed) {
      toast.error(`${col.label} cannot be empty`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cms/${tableName}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: trimmed || null }),
      });
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to update");
      }
      const updated: CmsItem = await res.json();
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      toast.success("Updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
      setEditingCell(null);
      setEditValue("");
    }
  }

  // -------------------------------------------------------------------------
  // Toggle active
  // -------------------------------------------------------------------------

  async function toggleActive(item: CmsItem) {
    const newActive = !item.is_active;
    try {
      const res = await fetch(`/api/admin/cms/${tableName}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to update status");
      }
      if (newActive) {
        // Re-activated — re-fetch to get it back in the list
        const updated: CmsItem = await res.json();
        setItems((prev) => prev.map((it) => (it.id === item.id ? updated : it)));
        toast.success("Activated");
      } else {
        // Deactivated — remove from the active list (API only returns active)
        setItems((prev) => prev.filter((it) => it.id !== item.id));
        toast.success("Deactivated");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  }

  // -------------------------------------------------------------------------
  // Delete (soft-delete via API)
  // -------------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/cms/${tableName}/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete");
      }
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  // -------------------------------------------------------------------------
  // Reorder (levels)
  // -------------------------------------------------------------------------

  async function handleReorder(item: CmsItem, direction: "up" | "down") {
    const sorted = [...items].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
    );
    const idx = sorted.findIndex((it) => it.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const current = sorted[idx];
    const swap = sorted[swapIdx];
    const currentOrder = current.order_index ?? idx;
    const swapOrder = swap.order_index ?? swapIdx;

    // Optimistic update
    setItems((prev) => {
      const updated = prev.map((it) => {
        if (it.id === current.id)
          return { ...it, order_index: swapOrder };
        if (it.id === swap.id)
          return { ...it, order_index: currentOrder };
        return it;
      });
      updated.sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
      );
      return updated;
    });

    try {
      // PATCH both items
      const [res1, res2] = await Promise.all([
        fetch(`/api/admin/cms/${tableName}/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_index: swapOrder }),
        }),
        fetch(`/api/admin/cms/${tableName}/${swap.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_index: currentOrder }),
        }),
      ]);

      if (handleSessionExpired(res1) || handleSessionExpired(res2)) return;

      if (!res1.ok || !res2.ok) {
        throw new Error("Failed to reorder");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
      // Revert on failure
      fetchItems();
    }
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function renderEditableCell(item: CmsItem, col: CmsColumn) {
    const isEditing =
      editingCell?.id === item.id && editingCell?.key === col.key;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            ref={editInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            onBlur={saveEdit}
            className="h-7 text-[13px]"
            disabled={saving}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={saveEdit}
            className="shrink-0 text-teal-600 hover:text-teal-700"
            aria-label="Save"
          >
            <Check size={14} weight="bold" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelEdit}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Cancel"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      );
    }

    const value = item[col.key];
    const displayValue = value != null && value !== "" ? String(value) : "";

    return (
      <button
        type="button"
        onClick={() => startEdit(item, col.key)}
        className="group flex items-center gap-1.5 text-left text-[13px] hover:text-teal-700 transition-colors w-full"
        title="Click to edit"
      >
        <span className={displayValue ? "" : "text-muted-foreground italic"}>
          {displayValue || "Click to add"}
        </span>
        <PencilSimple
          size={12}
          weight="bold"
          className="shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground transition-opacity"
        />
      </button>
    );
  }

  // -------------------------------------------------------------------------
  // Loading skeleton
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-4">
        <CmsHowToUse items={guideItems} tip={guideTip} />
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  const sortedItems = showReorder
    ? [...items].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
      )
    : items;

  return (
    <div className="space-y-4">
      <CmsHowToUse items={guideItems} tip={guideTip} />

      {/* Add row */}
      <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm">
        <div className="flex items-end gap-3">
          {columns.map((col) => (
            <div key={col.key} className={col.width ?? "flex-1"}>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                {col.label}
                {col.required && (
                  <span className="text-destructive ml-0.5">*</span>
                )}
              </label>
              <Input
                value={addValues[col.key] ?? ""}
                onChange={(e) =>
                  setAddValues((prev) => ({
                    ...prev,
                    [col.key]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                placeholder={col.placeholder ?? col.label}
                className="h-8 text-[13px]"
                disabled={saving}
              />
            </div>
          ))}
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={saving}
            className="shrink-0"
          >
            {saving ? (
              <CircleNotch size={16} weight="bold" className="animate-spin" />
            ) : (
              <Plus size={16} weight="bold" />
            )}
            {addLabel}
          </Button>
        </div>
        {addError && (
          <p className="mt-2 text-[12px] text-destructive">{addError}</p>
        )}
      </div>

      {/* Table or empty state */}
      {sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-cream-50 py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
            <Sparkle size={24} weight="duotone" className="text-teal-500" />
          </div>
          <h3 className="text-[15px] font-semibold">No {noun} yet</h3>
          <p className="mt-1 max-w-sm text-center text-[13px] text-muted-foreground">
            Add your first {noun.slice(0, -1)} using the form above. They will
            appear in playbook creation wizards.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {showReorder && (
                  <TableHead className="w-[80px] text-[12px]">
                    Order
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`text-[12px] ${col.width ?? ""}`}
                  >
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="w-[120px] text-right text-[12px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item, idx) => (
                <TableRow key={item.id} className="group">
                  {showReorder && (
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleReorder(item, "up")}
                          disabled={idx === 0}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Move up"
                        >
                          <ArrowUp size={14} weight="bold" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorder(item, "down")}
                          disabled={idx === sortedItems.length - 1}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Move down"
                        >
                          <ArrowDown size={14} weight="bold" />
                        </button>
                        <span className="ml-1 text-[11px] text-muted-foreground tabular-nums">
                          {(item.order_index ?? idx) + 1}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {renderEditableCell(item, col)}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => toggleActive(item)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={
                          item.is_active ? "Deactivate" : "Activate"
                        }
                        aria-label={
                          item.is_active ? "Deactivate" : "Activate"
                        }
                      >
                        {item.is_active ? (
                          <Eye size={14} weight="duotone" />
                        ) : (
                          <EyeSlash size={14} weight="duotone" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash size={14} weight="duotone" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t border-border/30 bg-muted/10 px-4 py-2 text-[12px] text-muted-foreground">
            {sortedItems.length} {sortedItems.length === 1 ? noun.slice(0, -1) : noun}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget
                ? String(
                    deleteTarget[columns[0]?.key] ?? "this item",
                  )
                : "this item"}
            </span>
            ? This will deactivate the item so it no longer appears in new
            playbooks.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <CircleNotch
                  size={16}
                  weight="bold"
                  className="animate-spin mr-1"
                />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

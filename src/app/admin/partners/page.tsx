"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  rotation_start_date: string | null;
  created_at: string;
  updated_at: string;
}

async function apiFetch<T>(
  url: string,
  opts?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, opts);
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error || "Request failed" };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export default function AdminPartnersPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{
    id: string;
    field: "name" | "description";
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const loadPartners = useCallback(async () => {
    const result = await apiFetch<{ partners: Partner[] }>(
      "/api/admin/partners"
    );
    if (!result.ok) {
      if (result.error === "Unauthorized") {
        router.push("/auth/login");
        return;
      }
      setError(result.error || "Failed to load partners");
    } else {
      setPartners(result.data?.partners || []);
      setError("");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingField]);

  async function updatePartner(id: string, fields: Partial<Partner>) {
    setSaving(id);
    const result = await apiFetch("/api/admin/partners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    if (!result.ok) {
      setError(result.error || "Failed to update");
    } else {
      await loadPartners();
    }
    setSaving(null);
  }

  async function addPartner() {
    setSaving("new");
    const maxOrder = partners.reduce(
      (max, p) => Math.max(max, p.display_order),
      0
    );
    const result = await apiFetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Partner",
        description: "",
        display_order: maxOrder + 1,
        is_active: false,
        is_featured: false,
      }),
    });
    if (!result.ok) {
      setError(result.error || "Failed to create partner");
    } else {
      await loadPartners();
    }
    setSaving(null);
  }

  async function deletePartner(id: string) {
    setSaving(id);
    const result = await apiFetch(`/api/admin/partners?id=${id}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      setError(result.error || "Failed to delete partner");
    } else {
      setDeleteConfirm(null);
      await loadPartners();
    }
    setSaving(null);
  }

  async function swapOrder(indexA: number, indexB: number) {
    const a = partners[indexA];
    const b = partners[indexB];
    if (!a || !b) return;
    setSaving(a.id);
    // Update both partners' display_order
    await apiFetch("/api/admin/partners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, display_order: b.display_order }),
    });
    await apiFetch("/api/admin/partners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, display_order: a.display_order }),
    });
    await loadPartners();
    setSaving(null);
  }

  function startEditing(id: string, field: "name" | "description", value: string) {
    setEditingField({ id, field });
    setEditValue(value || "");
  }

  function commitEdit() {
    if (!editingField) return;
    updatePartner(editingField.id, { [editingField.field]: editValue });
    setEditingField(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue("");
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted">Loading partners...</p>
      </div>
    );
  }

  if (error === "Unauthorized") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-navy mb-2">
            Admin Access Required
          </h1>
          <p className="text-muted">
            Sign in with an admin account to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-navy">
              Finance Partners
            </h1>
            <p className="text-muted text-sm mt-1">
              Manage featured finance partners displayed on the platform.
            </p>
          </div>
          <button
            onClick={addPartner}
            disabled={saving === "new"}
            className="inline-flex items-center gap-2 rounded-lg bg-ardhi px-5 py-2.5 text-sm font-medium text-white hover:bg-ardhi/90 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {saving === "new" ? "Adding..." : "Add Partner"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-2xl font-bold text-navy">{partners.length}</p>
            <p className="text-xs text-muted mt-1">Total Partners</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-2xl font-bold text-navy">
              {partners.filter((p) => p.is_active).length}
            </p>
            <p className="text-xs text-muted mt-1">Active</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-2xl font-bold text-navy">
              {partners.filter((p) => p.is_featured).length}
            </p>
            <p className="text-xs text-muted mt-1">Featured</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-2xl font-bold text-navy">
              {partners.filter((p) => !p.is_active).length}
            </p>
            <p className="text-xs text-muted mt-1">Inactive</p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError("")}
              className="text-xs text-red-500 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Table */}
        {partners.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted">
              No partners yet. Click &quot;Add Partner&quot; to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg">
                <tr>
                  <th className="px-4 py-3 font-semibold text-navy w-20">
                    Order
                  </th>
                  <th className="px-4 py-3 font-semibold text-navy">Name</th>
                  <th className="px-4 py-3 font-semibold text-navy hidden md:table-cell">
                    Description
                  </th>
                  <th className="px-4 py-3 font-semibold text-navy text-center w-24">
                    Active
                  </th>
                  <th className="px-4 py-3 font-semibold text-navy text-center w-24">
                    Featured
                  </th>
                  <th className="px-4 py-3 font-semibold text-navy text-right w-36">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {partners.map((partner, idx) => (
                  <tr
                    key={partner.id}
                    className={`hover:bg-bg/50 transition-colors ${
                      saving === partner.id ? "opacity-60" : ""
                    }`}
                  >
                    {/* Order */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-muted text-xs font-mono w-6 text-center">
                          {partner.display_order}
                        </span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => swapOrder(idx, idx - 1)}
                            disabled={idx === 0 || saving !== null}
                            className="p-0.5 text-muted hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => swapOrder(idx, idx + 1)}
                            disabled={
                              idx === partners.length - 1 || saving !== null
                            }
                            className="p-0.5 text-muted hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      {editingField?.id === partner.id &&
                      editingField.field === "name" ? (
                        <input
                          ref={inputRef as React.RefObject<HTMLInputElement>}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-full rounded border border-ardhi/30 bg-white px-2 py-1 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-ardhi"
                        />
                      ) : (
                        <button
                          onClick={() =>
                            startEditing(partner.id, "name", partner.name)
                          }
                          className="text-left font-medium text-navy hover:text-ardhi cursor-pointer transition-colors"
                          title="Click to edit"
                        >
                          {partner.name}
                        </button>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {editingField?.id === partner.id &&
                      editingField.field === "description" ? (
                        <textarea
                          ref={
                            inputRef as React.RefObject<HTMLTextAreaElement>
                          }
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              commitEdit();
                            }
                            if (e.key === "Escape") cancelEdit();
                          }}
                          rows={2}
                          className="w-full rounded border border-ardhi/30 bg-white px-2 py-1 text-sm text-muted focus:outline-none focus:ring-1 focus:ring-ardhi resize-none"
                        />
                      ) : (
                        <button
                          onClick={() =>
                            startEditing(
                              partner.id,
                              "description",
                              partner.description || ""
                            )
                          }
                          className="text-left max-w-[250px] truncate text-muted text-xs cursor-pointer hover:text-navy transition-colors block"
                          title={
                            partner.description
                              ? `${partner.description} — click to edit`
                              : "Click to add description"
                          }
                        >
                          {partner.description || (
                            <span className="italic text-muted/50">
                              Add description...
                            </span>
                          )}
                        </button>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          updatePartner(partner.id, {
                            is_active: !partner.is_active,
                          })
                        }
                        disabled={saving !== null}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          partner.is_active ? "bg-ardhi" : "bg-gray-300"
                        }`}
                        title={partner.is_active ? "Active" : "Inactive"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            partner.is_active
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>

                    {/* Featured toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          updatePartner(partner.id, {
                            is_featured: !partner.is_featured,
                          })
                        }
                        disabled={saving !== null}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          partner.is_featured
                            ? "bg-trust-amber"
                            : "bg-gray-300"
                        }`}
                        title={partner.is_featured ? "Featured" : "Standard"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            partner.is_featured
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {deleteConfirm === partner.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => deletePartner(partner.id)}
                            disabled={saving !== null}
                            className="rounded px-2 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="rounded px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(partner.id)}
                          disabled={saving !== null}
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete partner"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

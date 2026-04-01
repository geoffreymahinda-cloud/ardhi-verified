"use client";

import { useState, useEffect, useCallback } from "react";
import { getEnquiries, getStats, updateEnquiryStatus } from "./actions";

interface Enquiry {
  id: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_location: string | null;
  message: string | null;
  journey_stage: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  listing_id: number | null;
}

interface Stats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

const stageLabels: Record<string, string> = {
  enquiry: "Listing EOI",
  concierge: "Concierge",
  contact: "Contact",
  waitlist: "Waitlist",
};

const stageColors: Record<string, string> = {
  enquiry: "bg-ardhi/10 text-ardhi",
  concierge: "bg-trust-amber/10 text-trust-amber",
  contact: "bg-navy/10 text-navy",
  waitlist: "bg-purple-100 text-purple-700",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  responded: "bg-trust-green/10 text-trust-green",
  in_progress: "bg-trust-amber/10 text-trust-amber",
  completed: "bg-gray-100 text-gray-600",
};

export default function AdminPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, byType: {}, byStatus: {} });
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [enqResult, statsResult] = await Promise.all([
        getEnquiries(filter),
        getStats(),
      ]);
      if (enqResult.error) {
        setError(enqResult.error);
      } else {
        setEnquiries(enqResult.enquiries);
        setError("");
      }
      setStats(statsResult);
    } catch {
      setError("Unauthorized — admin access required.");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleStatusChange(id: number, newStatus: string) {
    await updateEnquiryStatus(id, newStatus);
    loadData();
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (error === "Unauthorized — admin access required.") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-navy mb-2">Admin Access Required</h1>
          <p className="text-muted">Sign in with an admin account to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-3xl font-bold text-navy mb-8">Admin Dashboard</h1>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-2xl font-bold text-navy">{stats.total}</p>
            <p className="text-xs text-muted mt-1">Total Submissions</p>
          </div>
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="rounded-xl border border-border bg-card p-5">
              <p className="text-2xl font-bold text-navy">{count}</p>
              <p className="text-xs text-muted mt-1">{stageLabels[type] || type}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["all", "enquiry", "concierge", "contact", "waitlist"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-ardhi text-white"
                  : "bg-card border border-border text-muted hover:text-text"
              }`}
            >
              {f === "all" ? "All" : stageLabels[f] || f}
            </button>
          ))}
        </div>

        {/* Enquiries table */}
        {enquiries.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted">No submissions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg">
                <tr>
                  <th className="px-4 py-3 font-semibold text-navy">Name</th>
                  <th className="px-4 py-3 font-semibold text-navy">Email</th>
                  <th className="px-4 py-3 font-semibold text-navy hidden md:table-cell">Phone</th>
                  <th className="px-4 py-3 font-semibold text-navy">Type</th>
                  <th className="px-4 py-3 font-semibold text-navy">Status</th>
                  <th className="px-4 py-3 font-semibold text-navy hidden lg:table-cell">Message</th>
                  <th className="px-4 py-3 font-semibold text-navy">Date</th>
                  <th className="px-4 py-3 font-semibold text-navy">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-bg/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-navy">{enq.buyer_name}</td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${enq.buyer_email}`} className="text-ardhi hover:underline">
                        {enq.buyer_email}
                      </a>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted">
                      {enq.buyer_phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${stageColors[enq.journey_stage] || "bg-gray-100 text-gray-600"}`}>
                        {stageLabels[enq.journey_stage] || enq.journey_stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[enq.status] || "bg-gray-100 text-gray-600"}`}>
                        {enq.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="max-w-[200px] truncate text-muted text-xs" title={enq.message || ""}>
                        {enq.message || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {new Date(enq.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={enq.status}
                        onChange={(e) => handleStatusChange(enq.id, e.target.value)}
                        className="rounded-lg border border-border bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ardhi"
                      >
                        <option value="new">New</option>
                        <option value="responded">Responded</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
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

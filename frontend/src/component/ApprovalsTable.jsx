import React, { useMemo, useState } from "react";

/**
 * ApprovalsTable.jsx
 * - Drop into: src/component/ApprovalsTable.jsx
 * - TailwindCSS required for styling
 *
 * Props (optional):
 * - items: array of approval objects to seed the table (shape below)
 *
 * Approval item shape:
 * {
 *   id: number|string,
 *   type: "leave" | "assignment" | "shift" | string,
 *   requester: string,
 *   createdAt: "2025-09-01T12:00:00Z",
 *   details: "Some short reason",
 *   status: "pending" | "approved" | "rejected"
 * }
 */

const defaultData = [
  {
    id: 1,
    type: "leave",
    requester: "Asha Patel",
    createdAt: "2025-09-01T09:12:00Z",
    details: "Medical leave for 3 days",
    status: "pending",
  },
  {
    id: 2,
    type: "assignment",
    requester: "Rahul Sharma",
    createdAt: "2025-09-02T11:25:00Z",
    details: "Request crew swap for flight AI101",
    status: "approved",
  },
  {
    id: 3,
    type: "shift",
    requester: "Maya Singh",
    createdAt: "2025-09-03T08:42:00Z",
    details: "Overtime compensation request",
    status: "pending",
  },
  {
    id: 4,
    type: "leave",
    requester: "John Doe",
    createdAt: "2025-09-03T14:00:00Z",
    details: "Personal leave - 1 day",
    status: "rejected",
  },
];

function StatusBadge({ status }) {
  const map = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-medium ${map[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}

export default function ApprovalsTable({ items = defaultData }) {
  const [rows, setRows] = useState(items);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        String(r.requester).toLowerCase().includes(q) ||
        String(r.type).toLowerCase().includes(q) ||
        String(r.details).toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  function updateStatus(id, newStatus) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    console.log(`Item ${id} -> ${newStatus}`);
  }

  function handleApprove(id) {
    updateStatus(id, "approved");
    // TODO: call API here
  }
  function handleReject(id) {
    updateStatus(id, "rejected");
    // TODO: call API here
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Approvals</h3>
          <p className="text-sm text-slate-500">Manage pending approvals and requests</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search requester, type, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left table-auto">
          <thead>
            <tr className="text-sm text-slate-600 border-b">
              <th className="py-2 px-3">Requester</th>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Details</th>
              <th className="py-2 px-3">Requested</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-6 text-center text-sm text-slate-500">
                  No items found.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 align-top">
                    <div className="font-medium">{row.requester}</div>
                  </td>

                  <td className="py-3 px-3 align-top">
                    <div className="text-sm text-slate-600">{row.type}</div>
                  </td>

                  <td className="py-3 px-3 align-top">
                    <div className="text-sm text-slate-700">{row.details}</div>
                  </td>

                  <td className="py-3 px-3 align-top">
                    <div className="text-sm text-slate-500">
                      {new Date(row.createdAt).toLocaleString()}
                    </div>
                  </td>

                  <td className="py-3 px-3 align-top">
                    <StatusBadge status={row.status} />
                  </td>

                  <td className="py-3 px-3 align-top">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(row.id)}
                        disabled={row.status === "approved"}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          row.status === "approved"
                            ? "bg-green-50 text-green-400 cursor-not-allowed"
                            : "bg-green-100 text-green-800 hover:bg-green-200"
                        }`}
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => handleReject(row.id)}
                        disabled={row.status === "rejected"}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          row.status === "rejected"
                            ? "bg-red-50 text-red-400 cursor-not-allowed"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

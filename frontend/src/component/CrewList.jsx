// src/components/CrewList.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getCrewList } from "../api/crewapi";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

const Badge = ({ children, variant = "muted" }) => {
  const base = "text-sm px-3 py-1 rounded-full font-medium";
  const variants = {
    muted: "bg-gray-100 text-gray-700",
    primary: "bg-indigo-100 text-indigo-700",
    danger: "bg-red-100 text-red-700",
    success: "bg-green-100 text-green-700",
  };
  return <span className={`${base} ${variants[variant]}`}>{children}</span>;
};

const initialsFrom = (name) => {
  if (!name) return "--";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function CrewList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const pageParam = Number(searchParams.get("page")) || DEFAULT_PAGE;
  const limitParam = Number(searchParams.get("limit")) || DEFAULT_LIMIT;

  const [crew, setCrew] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // UI state: search & filters
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");

  // small create form fields (unused in this snippet)
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newBase, setNewBase] = useState("");

  const fetchCrew = useCallback(
    async (p = pageParam, l = limitParam) => {
      setLoading(true);
      setError("");
      try {
        const data = await getCrewList(p, l); // expects { data: [...], meta? }
        const items = Array.isArray(data?.data) ? data.data : [];

        // Normalize status for each item to "active" | "inactive"
        const normalized = items.map((it) => {
          const raw = (it.status ?? "").toString().trim().toLowerCase();
          let status = "inactive";
          if (raw === "active" || raw === "available" || raw === "1" || raw === "true") {
            status = "active";
          }
          return { ...it, status };
        });

        setCrew(normalized);

        if (data?.meta?.total) setTotal(Number(data.meta.total));
        else if (!data?.meta) setTotal(normalized.length); // fallback
      } catch (err) {
        setError(err?.data?.message || err?.message || "Failed to fetch crew");
      } finally {
        setLoading(false);
      }
    },
    [pageParam, limitParam]
  );

  useEffect(() => {
    fetchCrew(pageParam, limitParam);
  }, [fetchCrew, pageParam, limitParam]);

  // Derived filtered list (client-side)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return crew.filter((c) => {
      const name = (c.full_name || "").toLowerCase();
      const base = (c.base_airport || c.base || "").toLowerCase();
      const role = (c.role || "").toLowerCase();
      const status = (c.status || "").toLowerCase();
      const quals = (c.qualifications || "").toLowerCase();

      if (roleFilter !== "all" && (c.role || "").toLowerCase() !== String(roleFilter).toLowerCase()) {
        return false;
      }
      if (statusFilter !== "All" && (c.status || "") !== statusFilter) return false;

      if (!q) return true;
      return (
        name.includes(q) ||
        base.includes(q) ||
        role.includes(q) ||
        quals.includes(q) ||
        (c.crew_code || "").toLowerCase().includes(q)
      );
    });
  }, [crew, query, roleFilter, statusFilter]);

  // helpers left as-is (delete/create are placeholders in your original)
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this crew member?")) return;
    const before = crew;
    setCrew((c) => c.filter((x) => (x.id ?? x._id ?? x.crew_code) !== id));
    try {
      // await deleteCrew(id);
      fetchCrew(pageParam, limitParam);
    } catch (err) {
      setCrew(before);
      alert(err?.data?.message || err?.message || "Delete failed");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName || !newRole) {
      alert("Please enter name & role");
      return;
    }
    try {
      const payload = {
        full_name: newName,
        role: newRole,
        base_airport: newBase || "DEL",
      };
      // const created = await createCrew(payload);
      // const createdObj = created?.data ? created.data : created;
      // setCrew((p) => [createdObj, ...p]);
      setTotal((t) => (typeof t === "number" ? t + 1 : t));
      setNewName("");
      setNewRole("");
      setNewBase("");
    } catch (err) {
      alert(err?.data?.message || err?.message || "Create failed");
    }
  };

  const handlePrev = () => {
    const prev = Math.max(1, pageParam - 1);
    const next = {};
    if (prev > 1) next.page = String(prev);
    if (limitParam !== DEFAULT_LIMIT) next.limit = String(limitParam);
    setSearchParams(next, { replace: false });
  };

  const handleNext = () => {
    const nextPage = pageParam + 1;
    const next = { page: String(nextPage) };
    if (limitParam !== DEFAULT_LIMIT) next.limit = String(limitParam);
    setSearchParams(next, { replace: false });
  };

  const handlePerPageChange = (e) => {
    const newLimit = Number(e.target.value);
    const next = { page: "1" };
    if (newLimit !== DEFAULT_LIMIT) next.limit = String(newLimit);
    setSearchParams(next, { replace: false });
  };

  const openDetail = (id) => {
    navigate(`/crew/${id}`);
  };

  // collect available roles & statuses for filters
  const roleOptions = useMemo(() => {
    const s = new Set();
    crew.forEach((c) => {
      if (c.role) s.add(c.role);
    });
    return ["all", ...Array.from(s)];
  }, [crew]);

  const statusOptions = useMemo(() => {
    const s = new Set();
    crew.forEach((c) => {
      if (c.status) s.add(c.status);
    });
    return ["All", ...Array.from(s)];
  }, [crew]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Crew List</h1>

      {/* Header / Search / Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="text-xl font-semibold">Crew</h2>
            <div className="text-sm text-gray-500">List of crew members and quick actions</div>
          </div>

          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, base, role..."
              className="border rounded px-3 py-2 w-72"
            />

            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border rounded px-3 py-2">
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-3 py-2">
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Create small form (left intentionally minimal) */}
      <form onSubmit={handleAdd} className="flex gap-2 items-center mb-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" className="border rounded px-3 py-2" />
        <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Role" className="border rounded px-3 py-2" />
        <input value={newBase} onChange={(e) => setNewBase(e.target.value)} placeholder="Base" className="border rounded px-3 py-2" />
        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Add Crew</button>
      </form>

      {/* List container */}
      <div className="bg-white rounded-lg shadow divide-y">
        {loading ? (
          <div className="p-6 text-center text-indigo-600">Loading...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-gray-600">No crew found.</div>
        ) : (
          filtered.map((c) => {
            const id = c.id ?? c._id ?? c.crew_code;
            const name = c.full_name ?? c.name ?? "—";
            const role = c.role ?? c.designation ?? "—";
            const base = c.base_airport ?? c.base ?? "—";
            const subtitle = c.qualifications ? `${Array.isArray(c.qualifications) ? c.qualifications.join(", ") : c.qualifications}` : (c.rank ? c.rank : "");
            const status = c.status ?? "unknown";
            const isActive = String(status).toLowerCase() === "active";

            return (
              <div key={id} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-700 font-semibold text-lg">
                    {initialsFrom(name)}
                  </div>

                  <div>
                    <div className="text-lg font-medium">{name}</div>
                    <div className="text-sm text-gray-500">
                      {role} • {base}
                    </div>
                    {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Only show status badge — other action buttons removed as requested */}
                  <Badge variant={isActive ? "success" : "muted"}>{isActive ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination / controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          <label>Per page:</label>
          <select value={limitParam} onChange={handlePerPageChange} className="border rounded px-2 py-1">
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => fetchCrew(pageParam, limitParam)} className="px-3 py-1 border rounded">Refresh</button>
          <button onClick={handlePrev} disabled={pageParam <= 1} className="px-3 py-1 border rounded disabled:opacity-50">◀ Prev</button>
          <div className="text-sm text-gray-600">Page {pageParam}{total ? ` of ${Math.max(1, Math.ceil(total / limitParam))} — ${total} total` : ""}</div>
          <button onClick={handleNext} className="px-3 py-1 border rounded">Next ▶</button>
        </div>
      </div>
    </div>
  );
}

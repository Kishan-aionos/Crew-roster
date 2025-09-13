// src/components/CrewAvailable.jsx
import React, { useEffect, useState, useCallback } from "react";
import { getCrewAvailability } from "../api/crewapi";

const formatDate = (iso) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

const SmallBadge = ({ children, variant = "muted" }) => {
  const base = "text-sm px-2 py-1 rounded-full font-medium";
  const styles = {
    muted: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    info: "bg-indigo-100 text-indigo-800",
  };
  return <span className={`${base} ${styles[variant] || styles.muted}`}>{children}</span>;
};

export default function CrewAvailable() {
  // form fields (controlled)
  const [airport, setAirport] = useState("BLR");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [useCustomPayload, setUseCustomPayload] = useState(false);
  const [customPayloadText, setCustomPayloadText] = useState(
    JSON.stringify(
      {
        airport: "BLR",
        date: new Date().toISOString().slice(0, 10),
        // optional additional fields your backend might accept:
        // include_arrivals: true,
        // role: "captain"
      },
      null,
      2
    )
  );

  // last request tracker so Refresh works
  const [lastRequest, setLastRequest] = useState(null);

  const [payload, setPayload] = useState(null); // full response
  const [available, setAvailable] = useState([]); // available_crew array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generic fetcher that supports two calling styles:
  // 1. fetchAvailability({ airport, date, ... }) -> will pass object to getCrewAvailability
  // 2. fetchAvailability(airport, date) -> will call getCrewAvailability(airport, date)
  const fetchAvailability = useCallback(
    async (arg1, arg2) => {
      setLoading(true);
      setError("");
      try {
        let res;
        if (typeof arg1 === "object" && arg1 !== null) {
          // assume full JSON payload (POST body style)
          res = await getCrewAvailability(arg1);
          setLastRequest({ kind: "payload", payload: arg1 });
        } else {
          // assume airport, date signature (query style)
          const airportArg = arg1 ?? airport;
          const dateArg = arg2 ?? date;
          res = await getCrewAvailability(airportArg, dateArg);
          setLastRequest({ kind: "query", airport: airportArg, date: dateArg });
        }

        setPayload(res);
        setAvailable(Array.isArray(res?.available_crew) ? res.available_crew : []);
      } catch (err) {
        console.error(err);
        // try to show meaningful message
        setError(err?.data?.message || err?.message || "Failed to fetch availability");
        setPayload(null);
        setAvailable([]);
      } finally {
        setLoading(false);
      }
    },
    [airport, date]
  );

  // initial load (optional) -- comment out if you don't want an automatic fetch
  useEffect(() => {
    // load initial using default airport/date (query style)
    fetchAvailability(airport, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (useCustomPayload) {
      // parse JSON and send as payload
      try {
        const parsed = JSON.parse(customPayloadText);
        fetchAvailability(parsed);
      } catch (err) {
        setError("Invalid JSON in custom payload: " + err.message);
      }
    } else {
      // send as query (airport, date)
      fetchAvailability(airport, date);
    }
  };

  const handleRefresh = () => {
    if (!lastRequest) {
      // fallback to current form values
      fetchAvailability(useCustomPayload ? tryParse(customPayloadText) : airport, useCustomPayload ? undefined : date);
      return;
    }
    if (lastRequest.kind === "payload") fetchAvailability(lastRequest.payload);
    else fetchAvailability(lastRequest.airport, lastRequest.date);
  };

  // small helper used only for fallback refresh attempt
  const tryParse = (txt) => {
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Crew availability</h2>
          <p className="text-sm text-gray-500">
            Use the form to send a request payload instead of URL params.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="px-3 py-1 border rounded">Refresh</button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-sm text-gray-600 block">Airport</label>
            <input value={airport} onChange={(e) => setAirport(e.target.value.toUpperCase())} className="border p-2 rounded" />
          </div>

          <div>
            <label className="text-sm text-gray-600 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-2 rounded" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm">
              <input type="checkbox" checked={useCustomPayload} onChange={(e) => setUseCustomPayload(e.target.checked)} />{" "}
              Use custom JSON payload
            </label>
          </div>

          <div>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Fetch</button>
          </div>
        </div>

        {useCustomPayload && (
          <div className="mt-4">
            <label className="text-sm text-gray-600 block mb-1">Custom payload (JSON)</label>
            <textarea
              value={customPayloadText}
              onChange={(e) => setCustomPayloadText(e.target.value)}
              rows={8}
              className="w-full border rounded p-2 font-mono text-xs"
            />
            <div className="text-xs text-gray-500 mt-1">Example payload: {`{ "airport":"BLR", "date":"2025-09-10" }`}</div>
          </div>
        )}
      </form>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        {loading ? (
          <div className="text-indigo-600">Loading availability...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : !payload ? (
          <div className="text-gray-600">No data.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 border rounded">
              <div className="text-sm text-gray-500">Airport</div>
              <div className="font-medium">{payload.airport ?? airport}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-sm text-gray-500">Date</div>
              <div className="font-medium">{payload.date ?? date}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-sm text-gray-500">Counts</div>
              <div className="flex gap-2 items-center">
                <SmallBadge variant="info">Based: {payload.based_crew_count ?? 0}</SmallBadge>
                <SmallBadge variant="muted">Arriving: {payload.arriving_crew_count ?? 0}</SmallBadge>
                <SmallBadge variant="success">Available: {payload.available_crew_count ?? 0}</SmallBadge>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* available list */}
      <div className="bg-white rounded-lg shadow divide-y">
        {loading ? null : available.length === 0 ? (
          <div className="p-6 text-gray-600">No available crew found for selected date.</div>
        ) : (
          available.map((c) => {
            const id = c.crew_id ?? c.crew_code;
            const name = c.full_name ?? "—";
            const subtitle = `${c.role ?? "-"} • ${c.rank ?? "-"}`;
            const base = c.base_airport ?? "-";
            const avail = c.available_at_airport ? "At base" : "Not at base";

            return (
              <div key={id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-700 font-semibold text-lg">
                    {(() => {
                      const parts = (name || "--").split(" ");
                      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                      return (parts[0][0] + parts[1][0]).toUpperCase();
                    })()}
                  </div>

                  <div>
                    <div className="text-lg font-medium">{name}</div>
                    <div className="text-sm text-gray-500">{subtitle} • {base}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {c.availability_details?.standby ? `Standby: ${c.availability_details.standby.standby_type}` : ""}
                      {c.availability_details?.on_leave ? ` ${c.availability_details.on_leave.leave_type}` : ""}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <SmallBadge variant={c.available_at_airport ? "success" : "muted"}>{avail}</SmallBadge>
                  <button onClick={() => alert(`Assign ${name}`)} className="px-3 py-1 rounded bg-indigo-50 text-indigo-700">Assign</button>
                  <button onClick={() => alert(JSON.stringify(c, null, 2))} className="px-3 py-1 border rounded">View</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

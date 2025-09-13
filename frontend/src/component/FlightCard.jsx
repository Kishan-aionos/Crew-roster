// pages/Flights.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { getflightList } from "../api/flightapi"; // returns axios response.data (which is { data: [...] })

export default function Flights() {
  const { airlineId } = useParams(); // optional route param
  const [searchParams, setSearchParams] = useSearchParams();

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [error, setError] = useState(null);

  // read query params with defaults
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const date_from = searchParams.get("date_from") ?? "";
  const date_to = searchParams.get("date_to") ?? "";

  // helper to extract items from your backend shape { data: [...] }
  const extractItems = (apiResult) => {
    // If getflightList returns response.data (the object with { data: [...] }),
    // this will get the array. If it already returned an array, we also handle that.
    if (!apiResult) return [];
    if (Array.isArray(apiResult)) return apiResult;
    if (Array.isArray(apiResult.data)) return apiResult.data;
    return [];
  };

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        ...(date_from ? { date_from } : {}),
        ...(date_to ? { date_to } : {}),
        ...(airlineId ? { airline: airlineId } : {}),
      };

      const res = await getflightList(page, limit, filters);
      // getflightList(...) returns response.data (which is { data: [...] })
      const items = extractItems(res);
      setFlights(items);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? "Failed to fetch flights");
    } finally {
      setLoading(false);
    }
  }, [page, limit, date_from, date_to, airlineId]);

  // fetch all pages and merge into one array
  const fetchAllFlights = useCallback(
    async (filters = {}) => {
      setFetchingAll(true);
      setError(null);
      try {
        let all = [];
        let p = 1;
        const pageLimit = 100; // tune as backend supports
        while (true) {
          const res = await getflightList(p, pageLimit, filters);
          const items = extractItems(res);
          if (!items || items.length === 0) break;
          all = all.concat(items);
          if (items.length < pageLimit) break; // last page
          p += 1;
        }
        setFlights(all);
      } catch (err) {
        console.error(err);
        setError(err?.message ?? "Failed to fetch all flights");
      } finally {
        setFetchingAll(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  // update URL search params but keep others
  function updateParams(updates = {}) {
    const next = new URLSearchParams(searchParams.toString());
    Object.keys(updates).forEach((k) => {
      const val = updates[k];
      if (val === null || val === undefined || val === "") next.delete(k);
      else next.set(k, String(val));
    });
    setSearchParams(next);
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Flights {airlineId ? `for ${airlineId}` : ""}</h1>

        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={date_from}
            onChange={(e) => updateParams({ date_from: e.target.value, page: 1 })}
            className="border px-2 py-1 rounded"
          />
          <input
            type="date"
            value={date_to}
            onChange={(e) => updateParams({ date_to: e.target.value, page: 1 })}
            className="border px-2 py-1 rounded"
          />
          <select
            value={limit}
            onChange={(e) => updateParams({ limit: e.target.value, page: 1 })}
            className="border px-2 py-1 rounded"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <button
            onClick={() => updateParams({ page: page - 1 > 0 ? page - 1 : 1 })}
            disabled={page <= 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          <div className="px-3 py-1 border rounded">Page {page}</div>

          <button onClick={() => updateParams({ page: page + 1 })} className="px-3 py-1 border rounded">
            Next
          </button>

          {/* fetch all button */}
          <button
            onClick={() => {
              const filters = {
                ...(date_from ? { date_from } : {}),
                ...(date_to ? { date_to } : {}),
                ...(airlineId ? { airline: airlineId } : {}),
              };
              fetchAllFlights(filters);
            }}
            className="px-3 py-1 border rounded"
            disabled={fetchingAll}
          >
            {fetchingAll ? "Fetching..." : "Fetch All"}
          </button>
        </div>
      </div>

      <div>
        {(loading || fetchingAll) && <div className="text-sm text-gray-500">Loading...</div>}
        {error && <div className="text-sm text-red-500 mb-3">{error}</div>}

        {!loading && flights.length === 0 && <div className="text-sm text-gray-500">No flights found.</div>}

        <div className="space-y-3 mt-3">
          {flights.map((f) => (
            <div key={f.id} className="p-4 border rounded bg-white">
              <div className="font-semibold">{f.flight_no}</div>
              <div>
                {f.dep_airport || "—"} → {f.arr_airport || "—"}
              </div>
              <div className="text-sm text-gray-500">
                Departure: {f.dep_time ? new Date(f.dep_time).toLocaleString() : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import axios from "axios";

const RostersTable = ({ selectedCrew = null, refreshTrigger = 0, baseAirport = null }) => {
  const [rosters, setRosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchRosters = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `http://127.0.0.1:8000/roster/rosters`;
        const res = await axios.get(url, {
          headers: { "Accept": "application/json" },
          // withCredentials: true, // enable if your API requires cookies/auth
        });

        // expected server shape: { data: [ ... ] } or directly an array
        const payload = res.data?.data ?? res.data ?? [];
        if (!cancelled) setRosters(Array.isArray(payload) ? payload : []);
      } catch (err) {
        console.error("Error fetching rosters:", err);
        if (err.response) {
          setError(`Server responded ${err.response.status}: ${err.response.data?.detail ?? err.response.statusText}`);
        } else if (err.request) {
          setError("No response received from server (network/CORS?).");
        } else {
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRosters();

    return () => { cancelled = true; };
  }, [refreshTrigger]); // refetch when refreshTrigger changes

  // apply optional client-side filters
  let visible = rosters;
  if (baseAirport) {
    visible = visible.filter(r => (r.base_airport || "").toLowerCase() === baseAirport.toLowerCase());
  }
  if (selectedCrew) {
    visible = visible.filter(r => r.crew_id === selectedCrew.id || r.crew_id === Number(selectedCrew.id));
  }

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow h-full">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Crew Rosters</h2>
        <p className="text-center py-8 text-gray-500">Loading roster data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow h-full">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Crew Rosters</h2>
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Crew Rosters</h2>
        <p className="text-sm text-gray-600">
          {selectedCrew ? `Showing assignments for ${selectedCrew.full_name}` : `${visible.length} roster entries`}
        </p>
      </div>

      <div className="overflow-y-auto flex-1">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Flight</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Assigned</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {visible.map((roster) => (
              <tr key={roster.id ?? `${roster.crew_id}-${roster.flight_id}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-medium">{roster.flight_id ?? "-"}</div>
                  <div className="text-xs text-gray-500">{roster.base_airport || "-"}</div>
                </td>
                <td className="px-4 py-3">{roster.role_on_flight ?? roster.role ?? "-"}</td>
                <td className="px-4 py-3">
                  {roster.assigned_at ? new Date(roster.assigned_at).toLocaleString() : "-"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    (roster.status && (String(roster.status).toLowerCase() === 'assigned' || String(roster.status).toLowerCase() === 'active'))
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {roster.status ?? "Unknown"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {selectedCrew ? `${selectedCrew.full_name} has no roster assignments` : "No roster data available"}
          </div>
        )}
      </div>
    </div>
  );
};

export default RostersTable;

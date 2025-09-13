// src/component/AssignModal.jsx
import React, { useEffect, useState } from "react";
import api from "../api";

export default function AssignModal({ crew, onClose }) {
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [roleOnFlight, setRoleOnFlight] = useState("");
  const [saving, setSaving] = useState(false);

  const loadFlights = async () => {
    try {
      const res = await api.listFlights({ page: 1, limit: 200 });
      setFlights(res.data ?? res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFlights();
  // eslint-disable-next-line
  }, []);

  const onAssign = async () => {
    if (!selectedFlight) return alert("Choose a flight");
    setSaving(true);
    try {
      await api.assignRoster({ flight_id: selectedFlight.id ?? selectedFlight, crew_id: crew.id, role_on_flight: roleOnFlight || crew.rank || '' });
      alert("Assigned");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Assign failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: 720 }}>
        <div className="modal-content p-3">
          <div className="modal-header">
            <h5 className="modal-title">Assign {crew.full_name}</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close</button>
          </div>
          <div className="modal-body">
            <div className="mb-2">
              <label>Flight</label>
              <select className="form-select" onChange={e => setSelectedFlight(JSON.parse(e.target.value))}>
                <option value="">-- select flight --</option>
                {flights.map(f => (
                  <option key={f.id} value={JSON.stringify(f)}>
                    {f.flight_no} — {new Date(f.dep_time).toLocaleString()} ({f.dep_airport} → {f.arr_airport})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-2">
              <label>Role on flight</label>
              <input className="form-control" value={roleOnFlight} onChange={e=>setRoleOnFlight(e.target.value)} placeholder="e.g., Captain, First Officer, Senior Attendant" />
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={onAssign} disabled={saving}>
              {saving ? "Assigning..." : "Assign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

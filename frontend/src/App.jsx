import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./component/Sidebar";

import Dashboard from "./pages/Dashboard";
import Flights from "./component/FlightCard";
import Crew from "./component/CrewList";
import Approvals from "./component/ApprovalsTable";
import RosterTable from "./component/RosterTable";
import CrewAvailable from "./component/CrewAvailable";

export default function App() {
  return (
    <Router>
      <div className="flex">
        {/* Sidebar (fixed on left) */}
        <Sidebar />

        {/* Right-side content */}
        <main className="flex-1 p-6 bg-white">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/crew" element={<Crew />} />
          
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/rosters" element={<RosterTable/>}/>
            <Route path="/crew-available" element={<CrewAvailable/>}/>
          </Routes>
        </main>
      </div>
    </Router>
  );
}

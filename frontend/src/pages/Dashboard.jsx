import React, { useEffect, useState } from "react";

// import page-level components
import Header from "../component/Header";
import Sidebar from "../component/Sidebar";
import CrewAvailable from "../component/CrewAvailable";
import ApprovalsTable from "../component/ApprovalsTable";
import About from "../component/About";
import FlightCard from "../component/FlightCard"
export default function Dashboard() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // mock flight data
//     const mockFlights = [
//       {
//         id: 1,
//         flight_no: "AI101",
//         dep_airport: "DEL",
//         arr_airport: "JFK",
//         dep_time: "2025-09-08T08:30:00Z",
//       },
//       {
//         id: 2,
//         flight_no: "BA204",
//         dep_airport: "LHR",
//         arr_airport: "DXB",
//         dep_time: "2025-09-09T12:00:00Z",
//       },
//       {
//         id: 3,
//         flight_no: "SQ321",
//         dep_airport: "SIN",
//         arr_airport: "SYD",
//         dep_time: "2025-09-10T16:45:00Z",
//       },
//     ];
//     setFlights(mockFlights);
//     setLoading(false);
//   }, []);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        <main className="p-4 space-y-6 overflow-y-auto">
          {/* About Section */}
          

          {/* Crew Section */}
          <section>
            <h2 className="text-xl font-bold mb-2">Crew List</h2>
           <CrewAvailable/>
          </section>

          {/* Approvals Section */}
          <section>
            <h2 className="text-xl font-bold mb-2">Approvals</h2>
            <ApprovalsTable />
          </section>

          {/* Flights Section */}
          {/* <section>
            <h2 className="text-xl font-bold mb-2">Flight</h2>
            <FlightCard/>
          </section> */}
          
        </main>
      </div>
    </div>
  );
}

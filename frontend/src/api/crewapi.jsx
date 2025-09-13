// src/api/crewApi.js
import api from "./axiosinstance";

export const getCrewList = async (page = 1, limit = 50) => {
  const res = await api.get("/crew-members/", { params: { page, limit } });
  return res.data; // { data: [...] , meta?: {...} }
};

// src/api/crewApi.js

export const getCrewAvailability = async (airport, date) => {
  if (!airport || !date) throw new Error("airport and date required");

  const path = `/airport/${encodeURIComponent(airport)}/crew/availability/${encodeURIComponent(date)}`;
  // call path-style route directly
  const res = await api.get(path);
  return res.data;
};

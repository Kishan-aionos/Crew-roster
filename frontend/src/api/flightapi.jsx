// api/flightapi.js
import api from "./axiosinstance"; // this is your axios.create({ baseURL: ... })

// Accepts page, limit, and an optional filters object
export const getflightList = async (page = 1, limit = 100, filters = {}) => {
  const params = { page, limit, ...filters };
  const res = await api.get("/flights", { params });
  return res.data; // backend should return { data: [...], meta: {...} }
};

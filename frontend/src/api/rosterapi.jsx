import api from "./axiosinstance"; // this is your axios.create({ baseURL: ... })

// Accepts page, limit, and an optional filters object
export const getrosterList = async (page = 1, limit = 100, search = {}) => {
  const params = { page, limit, ...search };
  const res = await api.get("/rosters", { params });
  return res.data; // backend should return { data: [...], meta: {...} }
};

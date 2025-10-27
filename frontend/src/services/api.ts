import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3000/contract",
  headers: {
    "Content-Type": "application/json",
  },
});

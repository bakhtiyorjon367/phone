import axios from "axios";
import type { Batch, DashboardStats, Phone } from "./types";
export const fetchAllPhones = async () =>
  (await api.get<Phone[]>("/phones/all")).data;

export const fetchAllBatches = async () =>
  (await api.get<Batch[]>("/batches/all")).data;

const api = axios.create({
  baseURL: "/api",
});

export const fetchDashboard = async () =>
  (await api.get<DashboardStats>("/dashboard")).data;
export const fetchKoreaStock = async () =>
  (await api.get<Phone[]>("/phones/in-korea")).data;
export const fetchUnsettledPhones = async () =>
  (await api.get<Phone[]>("/phones/unsettled")).data;

export const buyPhone = async (label: string, purchase_cost: number) => {
  return (await api.post("/phones/buy", { label, purchase_cost })).data;
};

export const createBatch = async (payload: {
  phone_ids: string[];
  total_delivery_fee: number;
  courier_name: string;
  flight_date: string;
  courier_details: string;
}) => {
  return (await api.post("/batches/create", payload)).data;
};

export const settlePhones = async (phone_ids: string[]) => {
  return (await api.post("/phones/settle", { phone_ids })).data;
};

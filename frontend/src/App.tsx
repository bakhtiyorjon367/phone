import React, { useState, useEffect } from "react";
import {
  Wallet,
  Smartphone,
  Truck,
  List,
  PackagePlus,
  Send,
  CheckCircle,
  CheckSquare,
  Square,
  UserRound,
} from "lucide-react";
import {
  fetchDashboard,
  fetchKoreaStock,
  fetchUnsettledPhones,
  fetchAllPhones,
  fetchAllBatches,
  buyPhone,
  createBatch,
  settlePhones,
  fetchMe,
  updateMe,
} from "./api/client";
import type { DashboardStats, Phone, Batch, User } from "./api/types";
import { initTelegramWebApp, watchTelegramSafeArea } from "./telegram";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "cash" | "insert" | "deliver" | "all" | "my"
  >("cash");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isAdmin = currentUser?.role === "admin";

  // Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [koreaStock, setKoreaStock] = useState<Phone[]>([]);
  const [unsettledPhones, setUnsettledPhones] = useState<Phone[]>([]);
  const [allPhones, setAllPhones] = useState<Phone[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // "My" tab form state
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Form States
  const [newPhoneLabel, setNewPhoneLabel] = useState("");
  const [newPhoneCost, setNewPhoneCost] = useState("");
  const [selectedForBatch, setSelectedForBatch] = useState<string[]>([]);
  const [batchFee, setBatchFee] = useState("");
  const [courierName, setCourierName] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [courierDetails, setCourierDetails] = useState("");
  const [selectedForSettle, setSelectedForSettle] = useState<string[]>([]);

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  // Auth bootstrap: verify the Telegram identity opening this Mini App
  // (auto-provisioning the user server-side) before loading anything else.
  useEffect(() => {
    initTelegramWebApp();
    watchTelegramSafeArea();
    fetchMe()
      .then((user) => {
        setCurrentUser(user);
        setProfileName(user.display_name ?? "");
        setProfileBio(user.bio ?? "");
        setActiveTab(user.role === "admin" ? "cash" : "all");
      })
      .catch(() =>
        setAuthError(
          "Couldn't verify your Telegram account. Please open this app from Telegram.",
        ),
      )
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchAllPhones().then(setAllPhones);
    if (currentUser.role === "admin") {
      fetchDashboard().then(setStats);
      fetchKoreaStock().then(setKoreaStock);
      fetchUnsettledPhones().then(setUnsettledPhones);
      fetchAllBatches().then(setBatches);
    }
  }, [refreshTrigger, currentUser]);

  const formatKRW = (num: number) =>
    new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(num);

  // Helper to resolve breakdown values cleanly for each phone
  const getPhoneBreakdown = (p: Phone) => {
    const cost = p.purchase_cost || 0;
    const profit = p.profit ?? 50000; // standard 50,000 KRW profit margin

    // Read the delivery share stored directly on the phone document from the backend
    const delivery = p.delivery_share ?? 0;

    // The true total you need to receive back
    const total = p.target_receivable || cost + profit + delivery;

    return { cost, profit, delivery, total };
  };

  // Calculate totals for currently selected items to settle
  const selectedPhones = unsettledPhones.filter((p) =>
    selectedForSettle.includes(p._id),
  );
  const selectedTotals = selectedPhones.reduce(
    (acc, p) => {
      const { cost, profit, delivery, total } = getPhoneBreakdown(p);
      return {
        cost: acc.cost + cost,
        profit: acc.profit + profit,
        delivery: acc.delivery + delivery,
        total: acc.total + total,
      };
    },
    { cost: 0, profit: 0, delivery: 0, total: 0 },
  );

  // Toggle Select All items
  const toggleSelectAll = () => {
    if (selectedForSettle.length === unsettledPhones.length) {
      setSelectedForSettle([]);
    } else {
      setSelectedForSettle(unsettledPhones.map((p) => p._id));
    }
  };

  // Handlers
  const handleBuyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    await buyPhone(newPhoneLabel, Number(newPhoneCost));
    setNewPhoneLabel("");
    setNewPhoneCost("");
    refreshData();
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedForBatch.length === 0 || selectedForBatch.length > 3)
      return alert("Select 1-3 phones.");
    await createBatch({
      phone_ids: selectedForBatch,
      total_delivery_fee: Number(batchFee),
      courier_name: courierName,
      flight_date: flightDate,
      courier_details: courierDetails,
    });
    setSelectedForBatch([]);
    setBatchFee("");
    setCourierName("");
    setFlightDate("");
    setCourierDetails("");
    setActiveTab("deliver");
    refreshData();
  };

  const handleSettle = async () => {
    if (selectedForSettle.length === 0) return;
    await settlePhones(selectedForSettle);
    setSelectedForSettle([]);
    refreshData();
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const updated = await updateMe({
        display_name: profileName,
        bio: profileBio,
      });
      setCurrentUser(updated);
      setProfileSaved(true);
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading)
    return (
      <div className="flex h-screen items-center justify-center font-bold text-gray-500">
        Loading...
      </div>
    );

  if (authError || !currentUser)
    return (
      <div className="flex h-screen items-center justify-center text-center font-bold text-gray-500 p-6">
        {authError ?? "Sign-in failed."}
      </div>
    );

  if (isAdmin && !stats)
    return (
      <div className="flex h-screen items-center justify-center font-bold text-gray-500">
        Loading...
      </div>
    );

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      {/* SCROLLABLE MAIN CONTENT AREA */}
      <div
        className="flex-1 overflow-y-auto pb-28 px-4 space-y-6"
        style={{ paddingTop: "calc(var(--tg-safe-area-top) + 1rem)" }}
      >
        {/* TAB 1: CASH FLOW (Dashboard & Settlement) - admin only */}
        {activeTab === "cash" && stats && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 text-center">
              Financial Overview
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-600 text-white p-4 rounded-xl shadow">
                <p className="text-blue-100 text-xs font-medium mb-1">
                  Liquid Cash (KRW)
                </p>
                <p className="text-xl font-bold">
                  {formatKRW(stats.liquid_cash_korea)}
                </p>
              </div>
              <div className="bg-amber-500 text-white p-4 rounded-xl shadow">
                <p className="text-amber-100 text-xs font-medium mb-1">
                  Debt Abroad (KRW)
                </p>
                <p className="text-xl font-bold">
                  {formatKRW(stats.friend_owed_debt)}
                </p>
              </div>
              <div className="bg-emerald-500 text-white p-4 rounded-xl shadow col-span-2 flex justify-between items-center">
                <div>
                  <p className="text-emerald-100 text-xs font-medium mb-1">
                    Total Realized Profit
                  </p>
                  <p className="text-2xl font-bold">
                    {formatKRW(stats.total_realized_profit)}
                  </p>
                </div>
                <CheckCircle size={32} className="opacity-50" />
              </div>
            </div>

            {/* SETTLE RETURNED MONEY SECTION */}
            <div className="mt-8 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">
                  Settle Returned Money
                </h3>
                {unsettledPhones.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs font-semibold text-blue-600 flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 active:scale-95 transition"
                  >
                    {selectedForSettle.length === unsettledPhones.length ? (
                      <CheckSquare size={14} />
                    ) : (
                      <Square size={14} />
                    )}
                    {selectedForSettle.length === unsettledPhones.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                )}
              </div>

              {unsettledPhones.length === 0 ? (
                <p className="text-gray-400 text-sm italic py-4 text-center">
                  No pending payments to settle.
                </p>
              ) : null}

              {/* LIST OF UNSETTLED PHONES WITH DETAILED BREAKDOWN */}
              <div className="space-y-3">
                {unsettledPhones.map((p) => {
                  const { cost, profit, delivery, total } =
                    getPhoneBreakdown(p);
                  const isChecked = selectedForSettle.includes(p._id);

                  return (
                    <label
                      key={p._id}
                      className={`flex flex-col p-4 rounded-xl shadow-sm border transition cursor-pointer ${
                        isChecked
                          ? "bg-emerald-50/60 border-emerald-300"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                            checked={isChecked}
                            onChange={(e) =>
                              e.target.checked
                                ? setSelectedForSettle([
                                    ...selectedForSettle,
                                    p._id,
                                  ])
                                : setSelectedForSettle(
                                    selectedForSettle.filter(
                                      (id) => id !== p._id,
                                    ),
                                  )
                            }
                          />
                          <p className="font-bold text-gray-900 text-base">
                            {p.label}
                          </p>
                        </div>
                        <span className="font-black text-emerald-700 text-base">
                          {formatKRW(total)}
                        </span>
                      </div>

                      {/* PRICE + PROFIT + DELIVERY BREAKDOWN ROW */}
                      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                        <div>
                          <span className="block text-gray-400 font-medium">
                            Price
                          </span>
                          <span className="font-bold text-gray-800">
                            {formatKRW(cost)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-emerald-600 font-medium">
                            + Profit
                          </span>
                          <span className="font-bold text-emerald-700">
                            +{formatKRW(profit)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-amber-600 font-medium">
                            + Delivery
                          </span>
                          <span className="font-bold text-amber-700">
                            +{formatKRW(delivery)}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* BOTTOM TOTAL SUMMARY BOX (WHEN ITEMS ARE SELECTED) */}
              {selectedForSettle.length > 0 && (
                <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-xl space-y-3 mt-4 border border-gray-800">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Settlement Summary ({selectedForSettle.length}{" "}
                      {selectedForSettle.length === 1 ? "phone" : "phones"})
                    </span>
                    <button
                      onClick={() => setSelectedForSettle([])}
                      className="text-xs text-gray-400 hover:text-white underline"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-300">
                    <div className="flex justify-between">
                      <span className="text-gray-400">
                        Total Purchase Price:
                      </span>
                      <span className="font-semibold text-white">
                        {formatKRW(selectedTotals.cost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-400">
                        Total Profit Margin:
                      </span>
                      <span className="font-semibold text-emerald-400">
                        +{formatKRW(selectedTotals.profit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400">
                        Total Delivery Reimbursement:
                      </span>
                      <span className="font-semibold text-amber-400">
                        +{formatKRW(selectedTotals.delivery)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                        Total Money to Receive
                      </p>
                      <p className="text-2xl font-black text-emerald-400">
                        {formatKRW(selectedTotals.total)}
                      </p>
                    </div>
                    <button
                      onClick={handleSettle}
                      className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black px-4 py-3 rounded-xl shadow active:scale-95 transition"
                    >
                      Confirm Payment
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PHONE INSERT & BATCHING */}
        {activeTab === "insert" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold flex items-center justify-center mb-4">
                <PackagePlus className="mr-2" /> Buy New Phone
              </h2>
              <form
                onSubmit={handleBuyPhone}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3"
              >
                <input
                  type="text"
                  placeholder="Model & Details (e.g. iPhone 15 Pro)"
                  required
                  value={newPhoneLabel}
                  onChange={(e) => setNewPhoneLabel(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Cost in KRW"
                  required
                  value={newPhoneCost}
                  onChange={(e) => setNewPhoneCost(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg"
                >
                  Buy & Add to Stock
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-xl font-bold flex items-center justify-center mb-4">
                <Send className="mr-2" /> Dispatch Batch
              </h2>
              <form
                onSubmit={handleCreateBatch}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4"
              >
                <div className="space-y-2 border-b pb-4">
                  <p className="text-sm font-bold text-gray-600">
                    1. Select Phones (Max 3)
                  </p>
                  {koreaStock.length === 0 ? (
                    <p className="text-sm text-gray-400">No stock available.</p>
                  ) : null}
                  {koreaStock.map((p) => (
                    <label
                      key={p._id}
                      className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-amber-500 rounded"
                        checked={selectedForBatch.includes(p._id)}
                        onChange={(e) => {
                          if (e.target.checked && selectedForBatch.length < 3)
                            setSelectedForBatch([...selectedForBatch, p._id]);
                          else
                            setSelectedForBatch(
                              selectedForBatch.filter((id) => id !== p._id),
                            );
                        }}
                      />
                      <span className="text-sm font-medium">
                        {p.label} ({formatKRW(p.purchase_cost)})
                      </span>
                    </label>
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-600">
                    2. Courier Details
                  </p>
                  <input
                    type="number"
                    placeholder="Total Delivery Fee (KRW)"
                    required
                    value={batchFee}
                    onChange={(e) => setBatchFee(e.target.value)}
                    className="w-full border p-3 rounded-lg outline-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Courier Name"
                      required
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="border p-3 rounded-lg outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Flight Date"
                      required
                      value={flightDate}
                      onChange={(e) => setFlightDate(e.target.value)}
                      className="border p-3 rounded-lg outline-none"
                    />
                  </div>
                  <textarea
                    placeholder="Bank Info / Address / Notes..."
                    required
                    rows={3}
                    value={courierDetails}
                    onChange={(e) => setCourierDetails(e.target.value)}
                    className="w-full border p-3 rounded-lg outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={selectedForBatch.length === 0}
                  className="w-full bg-amber-500 text-white font-bold p-4 rounded-lg disabled:opacity-50"
                >
                  Send to Courier
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: DELIVERIES (Couriers) */}
        {activeTab === "deliver" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center mb-4">
              <Truck className="mr-2" /> Active Deliveries
            </h2>
            {batches.length === 0 ? (
              <p className="text-gray-500 text-center mt-10">
                No deliveries yet.
              </p>
            ) : null}

            {batches.map((batch) => (
              <div
                key={batch._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {batch.courier_name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Flight: {batch.flight_date}
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded font-bold">
                    Fee: {formatKRW(batch.total_delivery_fee)}
                  </span>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded text-gray-600 whitespace-pre-wrap font-mono text-xs border">
                    {batch.courier_details}
                  </div>
                  <div>
                    <p className="font-bold text-gray-700 mb-1">
                      Phones in this batch:
                    </p>
                    <ul className="list-disc pl-5 text-gray-600 space-y-1">
                      {allPhones
                        .filter((p) => p.batch_id === batch._id)
                        .map((p) => (
                          <li key={p._id}>
                            {p.label}{" "}
                            {p.status === "SETTLED"
                              ? "✅ (Settled)"
                              : "⏳ (Pending)"}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: ALL PHONES DIRECTORY */}
        {activeTab === "all" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center mb-4">
              <List className="mr-2" /> Entire Inventory
            </h2>
            {allPhones.length === 0 ? (
              <p className="text-gray-500 text-center mt-10">
                No phones in inventory.
              </p>
            ) : null}

            <div className="space-y-3">
              {allPhones.map((p) => {
                let badgeClass = "bg-gray-100 text-gray-600";
                if (p.status === "IN_KOREA")
                  badgeClass = "bg-blue-100 text-blue-700";
                if (p.status === "IN_TRANSIT")
                  badgeClass = "bg-amber-100 text-amber-700";
                if (p.status === "SETTLED")
                  badgeClass = "bg-emerald-100 text-emerald-700";

                const { cost, profit, delivery, total } = getPhoneBreakdown(p);

                return (
                  <div
                    key={p._id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {p.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Cost: {formatKRW(cost)} | Profit: {formatKRW(profit)} |
                        Delivery: {formatKRW(delivery)}{" "}
                        <span className="text-gray-400">
                          | Target: {formatKRW(total)}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full ${badgeClass}`}
                    >
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: MY PROFILE */}
        {activeTab === "my" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center mb-4">
              <UserRound className="mr-2" /> My Profile
            </h2>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-medium">
                    Telegram
                  </p>
                  <p className="font-bold text-gray-900">
                    {currentUser.telegram_username
                      ? `@${currentUser.telegram_username}`
                      : "No Telegram username set"}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    isAdmin
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {currentUser.role.toUpperCase()}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">
                  Notes / Bio
                </label>
                <textarea
                  rows={3}
                  placeholder="Anything you'd like to note..."
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg disabled:opacity-50"
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
              {profileSaved && (
                <p className="text-xs text-emerald-600 font-medium text-center">
                  Saved!
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-20 px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab("cash")}
              className={`flex flex-col items-center flex-1 py-2 ${activeTab === "cash" ? "text-blue-600" : "text-gray-400"}`}
            >
              <Wallet size={24} />
              <span className="text-[10px] mt-1 font-medium">Cash Flow</span>
            </button>
            <button
              onClick={() => setActiveTab("insert")}
              className={`flex flex-col items-center flex-1 py-2 ${activeTab === "insert" ? "text-blue-600" : "text-gray-400"}`}
            >
              <Smartphone size={24} />
              <span className="text-[10px] mt-1 font-medium">Add/Ship</span>
            </button>
            <button
              onClick={() => setActiveTab("deliver")}
              className={`flex flex-col items-center flex-1 py-2 ${activeTab === "deliver" ? "text-blue-600" : "text-gray-400"}`}
            >
              <Truck size={24} />
              <span className="text-[10px] mt-1 font-medium">Deliver</span>
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab("all")}
          className={`flex flex-col items-center flex-1 py-2 ${activeTab === "all" ? "text-blue-600" : "text-gray-400"}`}
        >
          <List size={24} />
          <span className="text-[10px] mt-1 font-medium">All Phones</span>
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`flex flex-col items-center flex-1 py-2 ${activeTab === "my" ? "text-blue-600" : "text-gray-400"}`}
        >
          <UserRound size={24} />
          <span className="text-[10px] mt-1 font-medium">My</span>
        </button>
      </div>
    </div>
  );
}

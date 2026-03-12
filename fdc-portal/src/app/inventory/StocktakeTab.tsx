import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { StocktakeSession, StocktakeItem, InventoryItem } from "@/types/inventory";
import { format, parseISO } from "date-fns";
import { Plus, CheckCircle2, ClipboardCheck } from "lucide-react";

const ACCOUNT_LABELS: Record<string, string> = {
  "1521": "Nguyên vật liệu",
  "1522": "Vật tư y tế",
  "1523": "Văn phòng phẩm",
};

interface StocktakeTabProps {
  filteredInventory: InventoryItem[];
}

export default function StocktakeTab({ filteredInventory }: StocktakeTabProps) {
  const [sessions, setSessions] = useState<StocktakeSession[]>([]);
  const [activeSession, setActiveSession] = useState<StocktakeSession | null>(null);
  const [stocktakeItems, setStocktakeItems] = useState<StocktakeItem[]>([]);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionCategory, setNewSessionCategory] = useState("all");

  const fetchSessions = useCallback(async () => {
    const { data } = await supabase
      .from("fdc_stocktake_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSessions(data);
  }, []);

  const fetchStocktakeItems = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from("fdc_stocktake_items")
      .select("*")
      .eq("session_id", sessionId)
      .order("item_name");
    if (data) setStocktakeItems(data);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async () => {
    if (!newSessionTitle.trim()) return;
    const code = `KK-${format(new Date(), "yyyy-MM")}-${String(sessions.length + 1).padStart(3, "0")}`;
    const { data: session, error } = await supabase
      .from("fdc_stocktake_sessions")
      .insert({ session_code: code, title: newSessionTitle, category_filter: newSessionCategory, status: "draft", started_at: new Date().toISOString() })
      .select().single();
    if (error || !session) return;

    const itemsToInsert = filteredInventory
      .filter(item => newSessionCategory === "all" || item.category === ACCOUNT_LABELS[newSessionCategory])
      .map(item => ({
        session_id: session.id, inventory_item_code: item.sku, item_name: item.name,
        category: item.category, unit: item.unit, system_qty: item.currentStock,
        system_value: item.currentStock * (item.unitPrice || 0), actual_qty: null, difference: null,
      }));
    if (itemsToInsert.length > 0) await supabase.from("fdc_stocktake_items").insert(itemsToInsert);

    setShowCreateSession(false);
    setNewSessionTitle("");
    fetchSessions();
    setActiveSession(session);
    fetchStocktakeItems(session.id);
  };

  const updateActualQty = async (itemId: string, qty: number) => {
    const item = stocktakeItems.find(i => i.id === itemId);
    if (!item) return;
    const diff = qty - item.system_qty;
    await supabase.from("fdc_stocktake_items").update({ actual_qty: qty, difference: diff, checked_at: new Date().toISOString() }).eq("id", itemId);
    setStocktakeItems(prev => prev.map(i => i.id === itemId ? { ...i, actual_qty: qty, difference: diff } : i));
  };

  const completeSession = async (sessionId: string) => {
    if (stocktakeItems.some(i => i.actual_qty === null)) return;
    await supabase.from("fdc_stocktake_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", sessionId);
    fetchSessions();
    setActiveSession(null);
  };

  const getSessionStatusBadge = (status: string) => {
    const styles: Record<string, string> = { draft: "bg-gray-100 text-gray-600", in_progress: "bg-blue-100 text-blue-700", completed: "bg-emerald-100 text-emerald-700", approved: "bg-indigo-100 text-indigo-700" };
    const labels: Record<string, string> = { draft: "Nháp", in_progress: "Đang kiểm", completed: "Hoàn thành", approved: "Đã duyệt" };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[status] || ""}`}>{labels[status] || status}</span>;
  };

  if (activeSession) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900">{activeSession.title}</h3>
              {getSessionStatusBadge(activeSession.status)}
            </div>
            <p className="text-sm text-gray-500 mt-1">Mã: {activeSession.session_code} - {stocktakeItems.length} vật tư</p>
          </div>
          <div className="flex gap-2">
            {activeSession.status !== "completed" && (
              <button onClick={() => completeSession(activeSession.id)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                disabled={stocktakeItems.some(i => i.actual_qty === null)}>
                <CheckCircle2 className="w-4 h-4" />Hoàn thành
              </button>
            )}
            <button onClick={() => setActiveSession(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Quay lại</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Đã kiểm", value: stocktakeItems.filter(i => i.actual_qty !== null).length, total: stocktakeItems.length, color: "emerald" },
            { label: "Thừa", value: stocktakeItems.filter(i => (i.difference || 0) > 0).length, color: "blue" },
            { label: "Thiếu", value: stocktakeItems.filter(i => (i.difference || 0) < 0).length, color: "rose" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}{s.total ? `/${s.total}` : ""}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-450px)]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tên vật tư</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Nhóm</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Sổ sách</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Thực tế</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Chênh lệch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stocktakeItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      <div className="text-xs text-gray-500">{item.inventory_item_code} - {item.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{item.category}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">{item.system_qty}</td>
                    <td className="px-4 py-3 text-right">
                      <input type="number" value={item.actual_qty ?? ""} onChange={e => updateActualQty(item.id, Number(e.target.value))}
                        placeholder="Nhập..." className="w-24 text-right text-sm px-2 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                        disabled={activeSession.status === "completed"} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold">
                      {item.difference != null ? (
                        <span className={item.difference > 0 ? "text-blue-600" : item.difference < 0 ? "text-rose-600" : "text-gray-500"}>
                          {item.difference > 0 ? "+" : ""}{item.difference}
                        </span>
                      ) : <span className="text-gray-300">--</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Phiên kiểm kê</h2>
        <button onClick={() => setShowCreateSession(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">
          <Plus className="w-4 h-4" />Tạo phiên mới
        </button>
      </div>
      {showCreateSession && (
        <div className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900">Tạo phiên kiểm kê mới</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tiêu đề</label>
              <input type="text" value={newSessionTitle} onChange={e => setNewSessionTitle(e.target.value)}
                placeholder="VD: Kiểm kê Q1/2026" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nhóm TK</label>
              <select value={newSessionCategory} onChange={e => setNewSessionCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200">
                <option value="all">Tất cả</option>
                <option value="1521">1521 - Nguyên vật liệu</option>
                <option value="1522">1522 - Vật tư y tế</option>
                <option value="1523">1523 - Văn phòng phẩm</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreateSession(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Huỷ</button>
            <button onClick={createSession} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Tạo phiên</button>
          </div>
        </div>
      )}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Chưa có phiên kiểm kê nào. Nhấn "Tạo phiên mới" để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map(s => (
            <div key={s.id} onClick={() => { setActiveSession(s); fetchStocktakeItems(s.id); }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-bold text-gray-900">{s.title}</h4>
                {getSessionStatusBadge(s.status)}
              </div>
              <p className="text-sm text-gray-500">Mã: {s.session_code}</p>
              <p className="text-sm text-gray-500">Nhóm: {s.category_filter === "all" ? "Tất cả" : ACCOUNT_LABELS[s.category_filter] || s.category_filter}</p>
              <p className="text-xs text-gray-400 mt-2">Tạo: {format(parseISO(s.created_at), "dd/MM/yyyy HH:mm")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useInventory } from "@/viewmodels/useInventory";
import { ArrowLeft, DollarSign, Package, X, Calculator, Info } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
};

export default function ValuationPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const moduleType = (searchParams.get("module") as "pharmacy" | "inventory" | "all") || "all";

    const { filteredInventory, filterWarehouse, setFilterWarehouse, uniqueWarehouses } = useInventory(moduleType);

    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [importHistory, setImportHistory] = useState<any[]>([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);

    React.useEffect(() => {
        const fetchHistory = async () => {
            if (!selectedItem?.medicineCode) {
                setImportHistory([]);
                return;
            }
            setIsFetchingHistory(true);
            const { data } = await supabase
                .from('fdc_medicine_imports')
                .select('*')
                .eq('medicine_code', selectedItem.medicineCode)
                .order('import_date', { ascending: false })
                .limit(10);

            setImportHistory(data || []);
            setIsFetchingHistory(false);
        };
        fetchHistory();
    }, [selectedItem]);

    // Re-calculate individual items so we can show them
    const itemsWithValue = useMemo(() => {
        return filteredInventory.map(item => {
            const price = item.unitPrice || 0;
            const totalValue = item.currentStock * price;

            return {
                ...item,
                price,
                totalValue
            };
        }).sort((a, b) => b.totalValue - a.totalValue); // Sort highest value first
    }, [filteredInventory]);

    const totalFilteredValue = useMemo(() => itemsWithValue.reduce((sum, item) => sum + item.totalValue, 0), [itemsWithValue]);

    // Calculate value by warehouse
    const valueByWarehouse = useMemo(() => {
        const breakdown: Record<string, number> = {};
        itemsWithValue.forEach(item => {
            breakdown[item.warehouse] = (breakdown[item.warehouse] || 0) + item.totalValue;
        });
        return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    }, [itemsWithValue]);

    const moduleName = moduleType === 'pharmacy' ? 'Kho thuốc' : moduleType === 'inventory' ? 'Kho vật tư' : 'Tất cả kho';

    return (
        <div className="max-w-7xl mx-auto pb-24 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Chi tiết giá trị tồn kho ({moduleName})</h1>
                        <p className="text-sm text-gray-500 mt-1">Bảng tính ước lượng giá trị của các mặt hàng hiện có trong kho</p>
                    </div>
                </div>

                {/* Warehouse Filter */}
                <select
                    value={filterWarehouse}
                    onChange={(e) => setFilterWarehouse(e.target.value)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                >
                    <option value="all">Tất cả kho</option>
                    {uniqueWarehouses.map(w => (
                        <option key={w} value={w}>{w}</option>
                    ))}
                </select>
            </div>

            <div className={`grid grid-cols-1 ${filterWarehouse === 'all' && valueByWarehouse.length > 0 ? 'lg:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-sm font-medium text-gray-500">
                            Tổng giá trị (hiện tại)
                        </span>
                        <p className="text-3xl font-bold text-emerald-600 mt-1">
                            {formatCurrency(totalFilteredValue)}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-sm font-medium text-gray-500">
                            Số lượng mã hàng
                        </span>
                        <p className="text-3xl font-bold text-indigo-600 mt-1">
                            {itemsWithValue.filter(i => i.currentStock > 0).length} mã
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Package className="w-6 h-6" />
                    </div>
                </div>

                {filterWarehouse === 'all' && valueByWarehouse.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm lg:col-span-1 md:col-span-2">
                        <h3 className="text-sm font-medium text-gray-500 mb-4">Giá trị theo từng kho</h3>
                        <div className="space-y-3 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                            {valueByWarehouse.map(([warehouse, value]) => (
                                <div key={warehouse} className="flex justify-between items-center px-1">
                                    <span className="font-medium text-gray-700 text-sm truncate mr-2" title={warehouse}>{warehouse}</span>
                                    <span className="font-bold text-emerald-600 text-sm shrink-0">{formatCurrency(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex relative">
                <div className={`flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px] transition-all duration-300`}>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Mã hàng</th>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tên hàng</th>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Kho</th>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Tồn kho</th>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Đơn giá ước tính</th>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right font-bold">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {itemsWithValue.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className={`transition-colors cursor-pointer ${selectedItem?.id === item.id ? "bg-indigo-50 border-l-2 border-indigo-500" : "hover:bg-gray-50 border-l-2 border-transparent"}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-600">{item.sku}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">
                                                {item.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <span className="text-sm text-gray-600">
                                                {item.warehouse}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="font-medium text-gray-900">
                                                {item.currentStock} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-gray-600">
                                                {formatCurrency(item.price)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="font-semibold text-emerald-600">
                                                {formatCurrency(item.totalValue)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {itemsWithValue.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-12 text-center text-gray-500"
                                        >
                                            Không có dữ liệu tồn kho.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Panel Overlay for mobile */}
                {selectedItem && (
                    <div
                        className="fixed inset-0 bg-gray-900/50 z-40 sm:hidden"
                        onClick={() => setSelectedItem(null)}
                    />
                )}

                {/* Detail Panel */}
                {selectedItem && (
                    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-2xl border-l border-gray-100 transform transition-transform duration-300 z-50 overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Chi tiết mã hàng</h2>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Headers */}
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{selectedItem.name}</h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-700 font-medium">
                                            {selectedItem.sku}
                                        </span>
                                        <span>•</span>
                                        <span>{selectedItem.warehouse}</span>
                                        <span>•</span>
                                        <span>{selectedItem.category}</span>
                                    </div>
                                </div>

                                {/* Value calculation breakdown */}
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-4">
                                    <h4 className="flex items-center gap-2 font-medium text-gray-900 border-b border-gray-200 pb-2">
                                        <Calculator className="w-4 h-4 text-indigo-500" />
                                        Chi tiết ước tính thành tiền
                                    </h4>

                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Đơn giá tham khảo</span>
                                        <span className="font-semibold text-gray-900">
                                            {formatCurrency(selectedItem.price)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 border-b border-gray-300 border-dashed pb-1">Số lượng tồn kho</span>
                                        <span className="font-semibold text-gray-900 border-b border-gray-300 border-dashed pb-1">
                                            x {selectedItem.currentStock} {selectedItem.unit}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center text-base pt-2">
                                        <span className="font-medium text-gray-900">Thành tiền ước tính</span>
                                        <span className="font-bold text-emerald-600 text-lg">
                                            {formatCurrency(selectedItem.totalValue)}
                                        </span>
                                    </div>
                                </div>

                                {/* Import History Section */}
                                {selectedItem.medicineCode && (
                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <h3 className="font-semibold text-gray-900">Lịch sử nhập kho (Tham khảo)</h3>

                                        {isFetchingHistory ? (
                                            <div className="text-sm text-gray-500 text-center py-4">Đang tải lịch sử...</div>
                                        ) : importHistory.length > 0 ? (
                                            <div className="space-y-3">
                                                {importHistory.map((hist) => (
                                                    <div key={hist.id} className="bg-white border text-sm border-gray-100 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="font-medium text-gray-900">
                                                                {hist.import_date ? format(new Date(hist.import_date), "dd/MM/yyyy HH:mm") : "N/A"}
                                                            </div>
                                                            <div className="font-semibold text-emerald-600">
                                                                {formatCurrency(hist.unit_price)}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                                            <div>
                                                                <span className="block text-gray-400">Số lượng nhập</span>
                                                                <span className="font-medium text-gray-700">{hist.quantity} {selectedItem.unit}</span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-gray-400">Lô / Date</span>
                                                                <span className="font-medium text-gray-700">{hist.batch_number || 'N/A'}</span>
                                                            </div>
                                                            {hist.supplier_name && (
                                                                <div className="col-span-2 mt-1">
                                                                    <span className="block text-gray-400">Nhà cung cấp</span>
                                                                    <span className="font-medium text-gray-700 truncate block" title={hist.supplier_name}>{hist.supplier_name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                                Không có dữ liệu lịch sử nhập lịch sử trong 1 năm qua.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

import React from "react";
import { X } from "lucide-react";

type Cell = string | number | null | undefined;

export interface ChartDetailModalProps {
  title: string;
  dataSource: string;
  columns: string[];
  rows: Cell[][];
  onClose: () => void;
}

export default function ChartDetailModal({
  title,
  dataSource,
  columns,
  rows,
  onClose,
}: ChartDetailModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{title}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-gray-500">Nguồn dữ liệu:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                {dataSource}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-100">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length || 1}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {r.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap"
                      >
                        {cell ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}


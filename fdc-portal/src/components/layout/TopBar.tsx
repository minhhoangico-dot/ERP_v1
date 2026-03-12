import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES } from "@/lib/constants";
import { Bell, RefreshCw, Menu } from "lucide-react";
import { NotificationCenter } from "./NotificationCenter";
import { useNotifications } from "@/viewmodels/useNotifications";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [isStale, setIsStale] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-4 h-14">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="font-semibold text-indigo-900 hidden md:block">
          FDC Portal
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        {isStale && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Đang đồng bộ...</span>
          </div>
        )}

        <button
          onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          )}
        </button>

        <NotificationCenter
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
        />

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900 leading-none">
              {user.name}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              {ROLES[user.role]}
            </span>
          </div>
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-8 h-8 rounded-full border border-gray-200 object-cover"
          />
        </div>
      </div>
    </header>
  );
}

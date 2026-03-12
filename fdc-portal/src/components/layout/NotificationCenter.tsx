import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  Package,
  Clock,
  Settings,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Notification, NotificationType } from "@/types/notification";
import { useNotifications } from "@/viewmodels/useNotifications";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({
  isOpen,
  onClose,
}: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (notification.linkTo) {
      navigate(notification.linkTo);
      onClose();
    }
  };

  const filteredNotifications = notifications.filter(
    (n) => activeTab === "all" || !n.isRead,
  );

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "approval":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "inventory":
        return <Package className="w-5 h-5 text-indigo-500" />;
      case "attendance":
        return <Clock className="w-5 h-5 text-amber-500" />;
      case "system":
        return <Settings className="w-5 h-5 text-gray-500" />;
      case "reminder":
        return <Bell className="w-5 h-5 text-rose-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col md:absolute md:top-14 md:right-4 md:h-[32rem] md:w-96 md:rounded-2xl md:border md:border-gray-100 animate-in slide-in-from-right md:slide-in-from-top-2 duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white md:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Thông báo</h2>
            {unreadCount > 0 && (
              <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} mới
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              title="Đánh dấu tất cả đã đọc"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-2 bg-gray-50/50 border-b border-gray-100">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === "all"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === "unread"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Chưa đọc
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-white md:rounded-b-2xl">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">
                Không có thông báo nào
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Bạn đã xem hết tất cả thông báo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.isRead ? "bg-indigo-50/30" : ""}`}
                >
                  <div className="shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-medium truncate ${!notification.isRead ? "text-gray-900" : "text-gray-700"}`}
                      >
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-indigo-600 rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2 leading-snug">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {notification.createdAt ? formatDistanceToNow(parseISO(notification.createdAt), {
                        addSuffix: true,
                        locale: vi,
                      }) : 'Bừa rồi'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

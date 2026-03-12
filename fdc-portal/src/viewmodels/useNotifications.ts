import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/types/notification';

export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        const { data, error } = await supabase
            .from('fdc_notifications')
            .select('*')
            .eq('recipient_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            const mapped: Notification[] = data.map(n => ({
                id: n.id,
                userId: n.recipient_id,
                type: n.type as any,
                title: n.title,
                body: n.body,
                isRead: n.is_read,
                createdAt: n.created_at,
                linkTo: n.data?.linkTo
            }));
            setNotifications(mapped);
        }

        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        fetchNotifications();

        if (!user) return;

        const channel = supabase
            .channel(`public:fdc_notifications:${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'fdc_notifications',
                filter: `recipient_id=eq.${user.id}`
            }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchNotifications, user]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('fdc_notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;

        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length === 0) return;

        const { error } = await supabase
            .from('fdc_notifications')
            .update({ is_read: true })
            .in('id', unreadIds);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
    };

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications
    };
}

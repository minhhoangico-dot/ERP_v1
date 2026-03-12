import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, Role } from "@/types/user";

export type AdminTab = "users" | "approval" | "misa" | "health" | "audit";

export function useAdmin() {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('fdc_user_mapping').select('*').order('full_name');
    if (data) {
      setUsers(data.map(u => ({
        id: u.id,
        name: u.full_name,
        role: u.role as Role,
        department: u.department_name,
        email: u.email,
        phone: u.phone,
        avatar: u.avatar_url,
        status: u.is_active ? 'active' : 'inactive'
      })));
    }
  }, []);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    await supabase.from('fdc_user_mapping').update({ role: newRole }).eq('id', userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  };

  const handleResetPassword = (userId: string) => {
    alert(`Đã gửi email reset mật khẩu cho user ${userId}`);
  };

  // Approval Config state
  const [approvalConfigs, setApprovalConfigs] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);

  const fetchApprovalConfigs = useCallback(async () => {
    const { data } = await supabase.from('fdc_approval_templates').select('*');
    if (data) {
      const mapped = data.map(c => ({
        id: c.id,
        requestType: c.request_type,
        name: c.name,
        isActive: c.is_active,
        steps: c.steps || []
      }));
      setApprovalConfigs(mapped);
      if (mapped.length > 0 && !selectedConfig) setSelectedConfig(mapped[0]);
    }
  }, [selectedConfig]);

  // MISA Keywords state
  const [misaKeywords, setMisaKeywords] = useState<any[]>([]);

  const fetchMisaKeywords = useCallback(async () => {
    const { data } = await supabase.from('fdc_misa_scan_keywords').select('*');
    if (data) {
      setMisaKeywords(data.map(k => ({
        id: k.id,
        keyword: k.keyword,
        category: k.category,
        alertOnMatch: k.alert_on_match,
        isActive: k.is_active
      })));
    }
  }, []);

  const toggleKeywordActive = async (id: string) => {
    const keyword = misaKeywords.find(k => k.id === id);
    if (!keyword) return;
    await supabase.from('fdc_misa_scan_keywords').update({ is_active: !keyword.isActive }).eq('id', id);
    setMisaKeywords(
      misaKeywords.map((k) =>
        k.id === id ? { ...k, isActive: !k.isActive } : k,
      )
    );
  };

  // System Health state
  const [bridgeHealth, setBridgeHealth] = useState<any>({
    status: 'online', uptime: '99.9%', memoryUsage: '450MB', latency: '40ms'
  });
  const [syncHistory, setSyncHistory] = useState<any[]>([]);

  const fetchSyncData = useCallback(async () => {
    const { data: healthData } = await supabase.from('fdc_sync_health').select('*').limit(1);
    if (healthData && healthData.length > 0) {
      setBridgeHealth({
        status: healthData[0].bridge_status,
        uptime: '99.9%', // mocked
        memoryUsage: '450MB', // mocked
        latency: (healthData[0].queue_depth || 40) + 'ms'
      });
    }

    const { data: logData } = await supabase.from('fdc_sync_logs').select('*').order('started_at', { ascending: false }).limit(20);
    if (logData) {
      setSyncHistory(logData.map(l => ({
        id: l.id,
        type: l.sync_type,
        status: l.status,
        recordsProcessed: l.records_synced,
        startedAt: l.started_at,
        completedAt: l.completed_at
      })));
    }
  }, []);

  const handleManualSync = (type: string) => {
    alert(`Đang đồng bộ ${type}...`);
  };

  // Audit Log state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState("");

  const fetchAuditLogs = useCallback(async () => {
    const { data } = await supabase.from('fdc_audit_log').select(`
      *,
      user:fdc_user_mapping(full_name)
    `).order('created_at', { ascending: false }).limit(100);
    if (data) {
      setAuditLogs(data.map(l => ({
        id: l.id,
        user: l.user?.full_name || 'System',
        action: l.action,
        entity: l.entity_type,
        details: JSON.stringify(l.new_value),
        timestamp: l.created_at,
        ipAccess: l.ip_address || '127.0.0.1'
      })));
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'approval') fetchApprovalConfigs();
    else if (activeTab === 'misa') fetchMisaKeywords();
    else if (activeTab === 'health') fetchSyncData();
    else if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchUsers, fetchApprovalConfigs, fetchMisaKeywords, fetchSyncData, fetchAuditLogs]);

  const filteredAuditLogs = auditLogs.filter(
    (log) =>
      log.details?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.entity?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action?.toLowerCase().includes(auditSearch.toLowerCase()),
  );

  return {
    activeTab,
    setActiveTab,

    // Users
    users,
    isAddUserModalOpen,
    setIsAddUserModalOpen,
    isDelegationModalOpen,
    setIsDelegationModalOpen,
    selectedUser,
    setSelectedUser,
    handleRoleChange,
    handleResetPassword,

    // Approval
    approvalConfigs,
    selectedConfig,
    setSelectedConfig,

    // MISA
    misaKeywords,
    toggleKeywordActive,

    // Health
    bridgeHealth,
    syncHistory,
    handleManualSync,

    // Audit
    auditLogs: filteredAuditLogs,
    auditSearch,
    setAuditSearch,
  };
}

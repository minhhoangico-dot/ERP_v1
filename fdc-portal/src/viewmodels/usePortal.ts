import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRequests } from "@/viewmodels/useRequests";
import { useAttendance } from "@/viewmodels/useAttendance";

export function usePortal() {
  const { user: currentUser } = useAuth();
  const { requests: myRequests, createRequest } = useRequests();
  const {
    currentMonth,
    setCurrentMonth,
    attendanceRecords,
    attendanceSummary
  } = useAttendance();

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // TODO: Fetch real leaveBalance from a database table
  const leaveBalance = {
    used: 2,
    remaining: 10,
    total: 12,
  };

  // Recent requests
  const recentRequests = useMemo(() => {
    if (!currentUser) return [];
    return myRequests
      .filter((r) => r.requesterId === currentUser.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [myRequests, currentUser]);

  // Handle month change
  const handlePrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  // Submit leave request
  const submitLeaveRequest = async (data: {
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    const requiresDirector =
      data.startDate &&
      data.endDate &&
      (new Date(data.endDate).getTime() - new Date(data.startDate).getTime() >
        0 ||
        new Date(data.startDate).getDay() === 1);

    const approvalSteps: any[] = [
      {
        stepOrder: 1,
        approverRole: "dept_head",
        status: "pending",
      },
    ];

    if (requiresDirector) {
      approvalSteps.push({
        stepOrder: 2,
        approverRole: "director",
        status: "pending",
      });
    }

    await createRequest({
      type: "leave",
      title: `Xin ${data.type.toLowerCase()}`,
      description: `Từ ${data.startDate} đến ${data.endDate}. Lý do: ${data.reason}`,
      priority: "normal",
      approvalSteps,
    });

    setIsLeaveModalOpen(false);
  };

  return {
    currentUser,
    currentMonth,
    handlePrevMonth,
    handleNextMonth,
    attendanceRecords,
    attendanceSummary,
    leaveBalance,
    recentRequests,
    isLeaveModalOpen,
    setIsLeaveModalOpen,
    submitLeaveRequest,
  };
}

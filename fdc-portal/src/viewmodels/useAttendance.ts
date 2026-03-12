import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export function useAttendance() {
    const { user: currentUser } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [attendanceSummary, setAttendanceSummary] = useState<any>({
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
    });

    useEffect(() => {
        if (!currentUser) return;
        const fetchAttendance = async () => {
            const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

            const { data } = await supabase
                .from('fdc_emp_attendance')
                .select('*')
                .eq('user_id', currentUser.id)
                .gte('date', startDate)
                .lte('date', endDate);

            if (data) {
                const records = data.map(record => ({
                    id: record.id,
                    date: record.date,
                    checkIn: record.check_in,
                    checkOut: record.check_out,
                    status: record.status || 'present',
                    lateMinutes: record.late_minutes || 0,
                    source: record.source || 'app'
                }));

                setAttendanceRecords(records);

                // Compute summary
                const summary = { present: 0, late: 0, absent: 0, leave: 0 };
                records.forEach(r => {
                    if (r.status === 'present') summary.present++;
                    else if (r.status === 'late') summary.late++;
                    else if (r.status === 'absent') summary.absent++;
                    else if (r.status === 'leave') summary.leave++;
                });
                setAttendanceSummary(summary);
            }
        };
        fetchAttendance();
    }, [currentUser, currentMonth]);

    return {
        currentMonth,
        setCurrentMonth,
        attendanceRecords,
        attendanceSummary
    };
}

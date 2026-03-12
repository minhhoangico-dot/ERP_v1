export type AttendanceStatus = 'on_time' | 'late' | 'absent' | 'leave' | 'weekend' | 'holiday';

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  hoursWorked: number;
  overtime: number;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  leave: number;
}

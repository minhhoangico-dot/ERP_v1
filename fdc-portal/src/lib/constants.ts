export const REQUEST_TYPES = {
  material_release: 'Xuất vật tư',
  purchase: 'Mua sắm',
  payment: 'Chi tiền',
  advance: 'Tạm ứng',
  leave: 'Nghỉ phép',
  other: 'Khác',
} as const;

export const REQUEST_STATUS = {
  draft: 'Nháp',
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  escalated: 'Chuyển cấp',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
} as const;

export const PRIORITY = {
  low: 'Thấp',
  normal: 'Bình thường',
  high: 'Cao',
  urgent: 'Khẩn cấp',
} as const;

export const ROLES = {
  super_admin: 'KTT / Admin',
  director: 'Giám đốc',
  chairman: 'CT HĐQT',
  dept_head: 'Trưởng phòng',
  accountant: 'Kế toán',
  staff: 'Nhân viên',
  doctor: 'Bác sĩ',
} as const;

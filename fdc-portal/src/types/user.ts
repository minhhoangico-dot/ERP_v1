export type Role = 'super_admin' | 'director' | 'chairman' | 'dept_head' | 'accountant' | 'staff' | 'doctor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  avatarUrl?: string;
}

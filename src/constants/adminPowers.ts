// Central definition of every admin power in CIYA.
// 'all' is the superadmin wildcard: it grants every power below.
export interface AdminPower {
  key: string;
  label: string;
  description: string;
}

export const ADMIN_POWERS: AdminPower[] = [
  { key: 'manage_courses', label: 'Courses & Course Builder', description: 'Beginner courses, advanced course builder and course editing' },
  { key: 'manage_students', label: 'Students & Stats', description: 'View and manage student accounts, approvals and stats' },
  { key: 'manage_assignments', label: 'Assignments Inbox', description: 'Review, grade and approve assignment submissions' },
  { key: 'manage_notifications', label: 'Notifications Console', description: 'Create, edit and send notifications and templates' },
  { key: 'manage_leaderboard', label: 'Course Leaderboards', description: 'Configure and reset course leaderboards' },
  { key: 'manage_settings', label: 'Settings & Portal Locks', description: 'Portal locks, cohorts and global settings' },
  { key: 'manage_blog', label: 'CIYA Blog Desk', description: 'Create, edit and publish blog posts' },
  { key: 'manage_buzz', label: 'Student Buzz & Groups', description: 'Create and moderate Buzz groups' },
  { key: 'manage_kycb', label: 'KYCB Questionnaire', description: 'KYCB questionnaire builder and submissions' },
  { key: 'manage_prompts', label: 'Prompts Library', description: 'Manage the admin prompt library' },
  { key: 'manage_admins', label: 'Admin Team', description: 'Invite new admins, grant powers and remove access' },
];

export const SUPERADMIN_WILDCARD = 'all';

export function powerLabel(key: string): string {
  if (key === SUPERADMIN_WILDCARD) return 'All powers (Super Admin)';
  return ADMIN_POWERS.find((p) => p.key === key)?.label || key;
}

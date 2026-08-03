import staticLeaderboardJson from '../data/leaderboard.json';

export interface LeaderboardEntry {
  rank: number;
  fullName: string;
  email: string;
  score: number;
  lessonsCompleted: number;
  quizzesPassed: number;
  cohort: string;
}

// Cohort 1 and Cohort 2 leaderboards are permanently removed/destroyed.
// Only static JSON for Cohort 3 (and future active cohorts) is served.
export const staticCohort3Leaderboard: LeaderboardEntry[] = (staticLeaderboardJson as any[]).map((item, idx) => ({
  rank: item.rank || idx + 1,
  fullName: item.fullName || item.name || 'Student',
  email: item.email || '',
  score: item.score || item.totalScore || 0,
  lessonsCompleted: item.lessonsCompleted || 0,
  quizzesPassed: item.quizzesPassed || 0,
  cohort: item.cohort || 'Cohort 3'
}));

export const staticLeaderboardData: Record<string, LeaderboardEntry[]> = {
  "Cohort 3": staticCohort3Leaderboard
};


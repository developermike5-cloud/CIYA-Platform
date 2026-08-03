export interface LeaderboardEntry {
  rank: number;
  fullName: string;
  email: string;
  score: number;
  lessonsCompleted: number;
  quizzesPassed: number;
  cohort: string;
}

export const staticLeaderboardData: Record<string, LeaderboardEntry[]> = {
  "Cohort 1": [
    { rank: 1, fullName: "Olumide Johnson", email: "olumide.j@gmail.com", score: 1850, lessonsCompleted: 25, quizzesPassed: 12, cohort: "Cohort 1" },
    { rank: 2, fullName: "Chinedu Okafor", email: "chinedu.o@gmail.com", score: 1720, lessonsCompleted: 24, quizzesPassed: 11, cohort: "Cohort 1" },
    { rank: 3, fullName: "Amina Yusuf", email: "amina.y@gmail.com", score: 1680, lessonsCompleted: 23, quizzesPassed: 11, cohort: "Cohort 1" },
    { rank: 4, fullName: "Blessing Effiong", email: "blessing.e@gmail.com", score: 1540, lessonsCompleted: 22, quizzesPassed: 10, cohort: "Cohort 1" },
    { rank: 5, fullName: "Michael Adebayo", email: "michael.a@gmail.com", score: 1480, lessonsCompleted: 21, quizzesPassed: 9, cohort: "Cohort 1" },
    { rank: 6, fullName: "Sarah Connor", email: "sarah.c@gmail.com", score: 1320, lessonsCompleted: 20, quizzesPassed: 8, cohort: "Cohort 1" },
    { rank: 7, fullName: "John Doe", email: "john.doe@gmail.com", score: 1250, lessonsCompleted: 19, quizzesPassed: 8, cohort: "Cohort 1" },
    { rank: 8, fullName: "David King", email: "david.k@gmail.com", score: 1100, lessonsCompleted: 18, quizzesPassed: 7, cohort: "Cohort 1" }
  ],
  "Cohort 2": [
    { rank: 1, fullName: "Tunde Bakare", email: "tunde.b@gmail.com", score: 1910, lessonsCompleted: 25, quizzesPassed: 13, cohort: "Cohort 2" },
    { rank: 2, fullName: "Nkechi Eze", email: "nkechi.e@gmail.com", score: 1780, lessonsCompleted: 24, quizzesPassed: 12, cohort: "Cohort 2" },
    { rank: 3, fullName: "Fatima Umar", email: "fatima.u@gmail.com", score: 1650, lessonsCompleted: 23, quizzesPassed: 10, cohort: "Cohort 2" },
    { rank: 4, fullName: "Emeka Obi", email: "emeka.o@gmail.com", score: 1510, lessonsCompleted: 22, quizzesPassed: 9, cohort: "Cohort 2" },
    { rank: 5, fullName: "Grace Temi", email: "grace.t@gmail.com", score: 1380, lessonsCompleted: 21, quizzesPassed: 8, cohort: "Cohort 2" }
  ]
};

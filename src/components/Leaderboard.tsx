import React, { useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, Search, Award, Sparkles, User, MapPin, CheckCircle2, Crown, Sparkle } from 'lucide-react';

interface UserLeaderboardEntry {
  id: string;
  fullName: string;
  state: string;
  email: string;
  totalScore: number;
  dayScores: { [dayNum: number]: number }; // day Number 1 to 5
  totalQuizzesTaken: number;
  isCurrentUser: boolean;
}

export default function Leaderboard() {
  const [loading, setLoading] = useState(false);
  const [usersData, setUsersData] = useState<UserLeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');

  // Track the logged-in user to highlight their row
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null);
      }
    });
    return () => unsub();
  }, []);

  // Set the top active CIYA scholars static list directly (No database operations)
  useEffect(() => {
    setUsersData([
      {
        id: "mock-student-1",
        fullName: "Chinedu Okechukwu",
        state: "Lagos State",
        email: "chinedu@ciya.com",
        totalScore: 480,
        dayScores: { 1: 95, 2: 95, 3: 100, 4: 90, 5: 100 },
        totalQuizzesTaken: 5,
        isCurrentUser: false
      },
      {
        id: "mock-student-2",
        fullName: "Amina Abubakar",
        state: "Abuja (FCT)",
        email: "amina@ciya.com",
        totalScore: 390,
        dayScores: { 1: 100, 2: 90, 3: 100, 4: 100, 5: 0 },
        totalQuizzesTaken: 4,
        isCurrentUser: false
      },
      {
        id: "mock-student-3",
        fullName: "Oluwaseun Adebayo",
        state: "Oyo State",
        email: "seun@ciya.com",
        totalScore: 380,
        dayScores: { 1: 90, 2: 90, 3: 100, 4: 100, 5: 0 },
        totalQuizzesTaken: 4,
        isCurrentUser: false
      },
      {
        id: "mock-student-4",
        fullName: "Chioma Nnaji",
        state: "Enugu State",
        email: "chioma@ciya.com",
        totalScore: 190,
        dayScores: { 1: 95, 2: 95, 3: 0, 4: 0, 5: 0 },
        totalQuizzesTaken: 2,
        isCurrentUser: false
      },
      {
        id: "mock-student-5",
        fullName: "Tariq Lawson",
        state: "Rivers State",
        email: "tariq@ciya.com",
        totalScore: 180,
        dayScores: { 1: 90, 2: 90, 3: 0, 4: 0, 5: 0 },
        totalQuizzesTaken: 2,
        isCurrentUser: false
      }
    ]);
  }, []);

  // Dynamically recalculate highlighted currents when auth state changes during runtime
  const processedLeaderboard = useMemo(() => {
    return usersData.map(u => ({
      ...u,
      isCurrentUser: u.id === currentUserId
    }));
  }, [usersData, currentUserId]);

  // Rank and filter users based on selected tab and search query
  const rankedUsers = useMemo(() => {
    // 1. Map to score based on selected tab
    const mapped = processedLeaderboard.map((user) => {
      let scoreForRanking = 0;
      if (selectedTab === 'all') {
        scoreForRanking = user.totalScore;
      } else {
        scoreForRanking = user.dayScores[selectedTab] || 0;
      }
      return {
        ...user,
        scoreForRanking
      };
    });

    // 2. Filter out entries with 0 score (or keep them at bottom. Let's filter out non-participating people with 0 so the ranking looks active and robust!)
    let filtered = mapped.filter(u => u.scoreForRanking > 0);

    // 3. Sort by score descending. If tied, sort by total quizzes taken, and then alphabetically by name
    filtered.sort((a, b) => {
      if (b.scoreForRanking !== a.scoreForRanking) {
        return b.scoreForRanking - a.scoreForRanking;
      }
      if (b.totalQuizzesTaken !== a.totalQuizzesTaken) {
        return b.totalQuizzesTaken - a.totalQuizzesTaken; // More quizzes attempted tie-breaker
      }
      return a.fullName.localeCompare(b.fullName);
    });

    // 4. Apply search query filter
    if (searchQuery.trim().length > 0) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.fullName.toLowerCase().includes(lower) || 
        u.state.toLowerCase().includes(lower)
      );
    }

    return filtered;
  }, [processedLeaderboard, selectedTab, searchQuery]);

  // Top 3 Podium spots
  const podiumSpots = useMemo(() => {
    const top3 = rankedUsers.slice(0, 3);
    // Return in order [2nd place, 1st place, 3rd place] for visual balance on the podium
    const result: (typeof rankedUsers[0] | null)[] = [null, null, null];
    if (top3[1]) result[0] = top3[1]; // 2nd
    if (top3[0]) result[1] = top3[0]; // 1st
    if (top3[2]) result[2] = top3[2]; // 3rd
    return { top3, podiumOrder: result };
  }, [rankedUsers]);

  // Remaining list (Ranks 4+)
  const listUsers = useMemo(() => {
    return rankedUsers.slice(3);
  }, [rankedUsers]);

  return (
    <section className="py-24 px-6 md:px-12 lg:px-24 bg-teal-950 relative border-t border-teal-900" id="leaderboard">
      <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-teal-500/5 blur-[120px] -z-10 rounded-full" />
      <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] -z-10 rounded-full" />
      
      <div className="max-w-5xl mx-auto relative z-10 w-full text-center">
        {/* Header Elements */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="space-y-4 mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 animate-bounce" />
            <span>CIYA Honor Roll (Preview)</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-teal-50 tracking-tight drop-shadow-md">
            Academy Quiz Leaderboard
          </h2>
          <p className="text-teal-200 text-sm md:text-base max-w-2xl mx-auto leading-relaxed font-semibold">
            Track student ranking based on their first attempt scorecard cumulative scores. Overcome boundaries, target 80%+ to unlock lectures, and lead the scoreboard!
          </p>
          <div className="inline-block mt-2 px-4 py-2 rounded-xl bg-teal-900/50 border border-teal-800 text-teal-300 text-xs font-medium">
            💡 Live synchronization is temporarily disabled for optimal system hosting performance.
          </div>
        </motion.div>

        {/* Tab Filters and Search Box */}
        <div className="bg-teal-900/40 backdrop-blur-md rounded-3xl p-4 border border-teal-850 shadow-2xl flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-10 text-left">
          {/* Scrollable Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none shrink-0">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border-0 ${
                selectedTab === 'all' 
                  ? 'bg-amber-500 text-teal-950 font-black shadow-lg shadow-amber-500/20 shadow-md' 
                  : 'text-teal-200 hover:bg-teal-800/50 hover:text-white'
              }`}
            >
              🏆 Cumulative
            </button>
            {[1, 2, 3, 4, 5].map((dayNum) => (
              <button
                key={dayNum}
                onClick={() => setSelectedTab(dayNum as any)}
                className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border-0 ${
                  selectedTab === dayNum 
                    ? 'bg-teal-600 text-white font-black shadow-lg shadow-teal-600/20 shadow-md' 
                    : 'text-teal-205 text-teal-300 hover:bg-teal-800/50 hover:text-white'
                }`}
              >
                Day {dayNum} Score
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full lg:max-w-xs shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400" />
            <input
              type="text"
              placeholder="Search classmate or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-teal-950/80 border border-teal-800 rounded-full pl-10 pr-4 py-2.5 text-xs text-teal-50 placeholder-teal-400/60 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-bold"
            />
          </div>
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-xs text-teal-300 font-extrabold uppercase tracking-widest">Collating Scores...</p>
          </div>
        ) : rankedUsers.length === 0 ? (
          <div className="py-20 bg-teal-900/10 border border-dashed border-teal-800/50 rounded-3xl text-center space-y-3">
            <p className="text-sm text-teal-305 font-bold text-teal-300">No student attempts recorded for the selected filter yet.</p>
            <p className="text-xs text-teal-500 font-semibold max-w-md mx-auto leading-relaxed">
              Log in to your Course Viewer dashboard, watch learning clips, and pass first-attempt quizzes to secure your spot here!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Visual Top 3 podium (Only shown when not searching, or if search results include them) */}
            {searchQuery.trim().length === 0 && (
              <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-3xl mx-auto pt-10 pb-6 items-end">
                {podiumSpots.podiumOrder.map((user, index) => {
                  if (!user) return <div key={index} className="invisible" />;
                  
                  // index 0 -> 2nd place, index 1 -> 1st place, index 2 -> 3rd place
                  const place = index === 0 ? 2 : index === 1 ? 1 : 3;
                  const score = selectedTab === 'all' ? user.totalScore : user.dayScores[selectedTab as number] || 0;

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.15 }}
                      className={`flex flex-col items-center relative ${
                        place === 1 ? 'z-20 -translate-y-4' : 'z-10'
                      }`}
                    >
                      {/* Avatar container */}
                      <div className="relative mb-3 flex flex-col items-center">
                        {/* Crown for 1st Place */}
                        {place === 1 && (
                          <motion.div 
                            animate={{ rotate: [0, -5, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                            className="absolute -top-7 text-amber-400 drop-shadow-md"
                          >
                            <Crown className="w-8 h-8 fill-amber-400 text-amber-500" />
                          </motion.div>
                        )}

                        <div className={`w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center font-black text-sm md:text-xl relative ${
                          place === 1 
                            ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-teal-950 border-4 border-amber-400 ring-4 ring-amber-500/20 shadow-xl' 
                            : place === 2
                            ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-teal-950 border-4 border-slate-300 shadow-lg'
                            : 'bg-gradient-to-tr from-amber-700 to-amber-600 text-white border-4 border-amber-700 shadow-md'
                        }`}>
                          {user.fullName.slice(0, 2).toUpperCase()}
                          
                          {/* Rank badge on avatar */}
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center font-black text-[10.5px] border-2 ${
                            place === 1 
                              ? 'bg-yellow-400 border-amber-400 text-teal-950' 
                              : place === 2
                              ? 'bg-slate-300 border-slate-100 text-slate-900'
                              : 'bg-amber-700 border-amber-650 text-white'
                          }`}>
                            {place}
                          </div>
                        </div>
                      </div>

                      {/* Display name */}
                      <div className="text-center w-full px-1 mb-1">
                        <span className={`block truncate font-black text-xs md:text-sm tracking-tight ${
                          user.isCurrentUser ? 'text-amber-400 underline decoration-2' : 'text-teal-50'
                        }`}>
                          {user.fullName}
                        </span>
                        
                        {/* State & Quizzes attempted info */}
                        <div className="flex items-center justify-center gap-1 text-[9px] md:text-[10px] text-teal-300 font-bold uppercase tracking-wider">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate max-w-[70px]">{user.state}</span>
                        </div>
                      </div>

                      {/* Podium Pillar Box */}
                      <div className={`w-full rounded-2xl flex flex-col justify-end p-3 text-center border-t border-teal-700/30 transition-all ${
                        place === 1
                          ? 'bg-amber-500/10 border-amber-500/20 h-28 md:h-36 shadow-lg shadow-amber-500/5'
                          : place === 2
                          ? 'bg-teal-900/35 border-teal-800/40 h-20 md:h-28'
                          : 'bg-teal-900/20 border-teal-850 h-16 md:h-24'
                      }`}>
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-teal-300 font-black uppercase tracking-widest">Score</p>
                          <p className={`font-black tracking-tight text-base md:text-2xl ${
                            place === 1 ? 'text-amber-400' : place === 2 ? 'text-slate-200' : 'text-amber-600'
                          }`}>
                            {score}
                          </p>
                          <p className="text-[9px] text-teal-400 font-semibold">
                            {user.totalQuizzesTaken} Quizzes
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Normal List Table */}
            <div className="bg-teal-900/20 backdrop-blur-md rounded-3xl border border-teal-900 overflow-hidden shadow-xl text-left">
              <div className="px-5 py-4 border-b border-teal-900 bg-teal-900/15 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-300">
                  {searchQuery.trim().length > 0 ? "Search results" : "Ranking Standings"}
                </span>
                <span className="text-[10px] font-black text-teal-400">
                  {rankedUsers.length} Students Active
                </span>
              </div>

              <div className="divide-y divide-teal-900/60 overflow-x-auto max-h-[500px] scrollbar-thin">
                {/* Header keys */}
                <div className="grid grid-cols-12 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950/40 select-none">
                  <div className="col-span-2 md:col-span-1 text-center">Rank</div>
                  <div className="col-span-6 md:col-span-6">Student Name</div>
                  <div className="col-span-2 md:col-span-3 text-center md:text-left">State</div>
                  <div className="col-span-2 md:col-span-2 text-right">Quiz Score</div>
                </div>

                {/* Grid rows */}
                <AnimatePresence mode="popLayout">
                  {rankedUsers.map((user, idx) => {
                    const overallRank = idx + 1;
                    const score = selectedTab === 'all' ? user.totalScore : user.dayScores[selectedTab as number] || 0;

                    return (
                      <motion.div
                        key={user.id}
                        layoutId={`leaderboard-user-${user.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className={`grid grid-cols-12 items-center px-5 py-3.5 text-xs font-bold transition-all relative ${
                          user.isCurrentUser 
                            ? 'bg-amber-500/10 text-white border-y border-amber-500/20 shadow-md shadow-amber-500/5' 
                            : 'text-teal-200 hover:bg-teal-900/30'
                        }`}
                      >
                        {/* Highlight accent for current student */}
                        {user.isCurrentUser && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 rounded-r" />
                        )}

                        {/* Rank */}
                        <div className="col-span-2 md:col-span-1 flex justify-center items-center">
                          {overallRank === 1 ? (
                            <span className="w-5 h-5 rounded-full bg-yellow-400 text-teal-950 flex items-center justify-center font-black text-[10px] shadow-sm shadow-yellow-400/20">1</span>
                          ) : overallRank === 2 ? (
                            <span className="w-5 h-5 rounded-full bg-slate-300 text-teal-950 flex items-center justify-center font-black text-[10px]">2</span>
                          ) : overallRank === 3 ? (
                            <span className="w-5 h-5 rounded-full bg-amber-750 bg-amber-600 text-white flex items-center justify-center font-black text-[10px]">3</span>
                          ) : (
                            <span className="text-teal-400 font-mono font-bold">{overallRank}</span>
                          )}
                        </div>

                        {/* Student Name */}
                        <div className="col-span-6 md:col-span-6 flex items-center gap-2 md:gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] uppercase ${
                            user.isCurrentUser 
                              ? 'bg-amber-500 text-teal-950' 
                              : 'bg-teal-900/70 border border-teal-800 text-teal-300'
                          }`}>
                            {user.fullName.slice(0, 2)}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`truncate font-extrabold text-[12.5px] ${
                                user.isCurrentUser ? 'text-amber-400 font-black' : 'text-teal-100'
                              }`}>
                                {user.fullName}
                              </span>
                              {user.isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[8.5px] font-black uppercase shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-teal-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-teal-400/85" />
                              <span>{user.totalQuizzesTaken} quiz checks solved</span>
                            </div>
                          </div>
                        </div>

                        {/* State */}
                        <div className="col-span-2 md:col-span-3 text-center md:text-left truncate font-bold text-teal-300 text-[11px] md:text-xs">
                          {user.state}
                        </div>

                        {/* Score */}
                        <div className="col-span-2 md:col-span-2 text-right">
                          <span className={`font-mono text-xs md:text-sm tracking-tight font-black ${
                            user.isCurrentUser ? 'text-teal-50 bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/20' : 'text-teal-100'
                          }`}>
                            {score}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Quick tips label */}
            <p className="text-[10.5px] text-teal-400/80 font-bold uppercase tracking-wide text-center">
              💡 Complete curriculum quizzes in course modules. Your first score is recorded to build academy prestige!
            </p>

          </div>
        )}
      </div>
    </section>
  );
}

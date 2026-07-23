import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area, 
  LineChart, 
  Line 
} from 'recharts';
import { 
  Users, 
  Award, 
  BookOpen, 
  Calendar, 
  UserCheck, 
  Compass, 
  MapPin, 
  Activity 
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  gender?: string;
  whatsapp?: string;
  state?: string;
  intent: string;
  experience: string;
  courseType?: string;
  pathwaySelection?: string;
  pathwayReason?: string;
  pathwayExperience?: string;
  recommendedPath: string;
  goal: string;
  availability: string;
  isActivated?: boolean;
  approvalStatus?: string;
  hasYearBadge?: boolean;
  createdAt?: any;
}

interface StudentAnalyticsDashboardProps {
  users: UserProfile[];
  cohortName: string;
}

// Sophisticated color palette (cool neutral/indigo theme)
const COLORS = [
  '#4f46e5', // Indigo 600
  '#06b6d4', // Cyan 500
  '#10b981', // Emerald 500
  '#f59e0b', // Amber 500
  '#ec4899', // Pink 500
  '#8b5cf6', // Violet 500
  '#ef4444', // Red 500
  '#64748b'  // Slate 500
];

export default function StudentAnalyticsDashboard({ users, cohortName }: StudentAnalyticsDashboardProps) {
  
  // 1. Overall Key Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    if (total === 0) {
      return { total: 0, proCount: 0, proPct: 0, activeCount: 0, activePct: 0, approvedCount: 0, approvedPct: 0 };
    }
    const proCount = users.filter(u => u.hasYearBadge).length;
    const activeCount = users.filter(u => u.isActivated).length;
    const approvedCount = users.filter(u => u.approvalStatus === 'Approved').length;

    return {
      total,
      proCount,
      proPct: Math.round((proCount / total) * 100),
      activeCount,
      activePct: Math.round((activeCount / total) * 100),
      approvedCount,
      approvedPct: Math.round((approvedCount / total) * 100)
    };
  }, [users]);

  // 2. Course Distribution Data
  const courseData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const rawCourse = u.courseType || u.pathwaySelection || u.recommendedPath || 'Unspecified';
      let course = rawCourse;
      // Clean course name for visual presentation
      if (course.toLowerCase().includes('frontend') || course.toLowerCase().includes('front-end')) {
        course = 'Frontend Web Development';
      } else if (course.toLowerCase().includes('backend') || course.toLowerCase().includes('back-end')) {
        course = 'Backend Software Engineering';
      } else if (course.toLowerCase().includes('fullstack') || course.toLowerCase().includes('full-stack')) {
        course = 'Fullstack Web Development';
      } else if (course.toLowerCase().includes('ui') || course.toLowerCase().includes('ux') || course.toLowerCase().includes('design')) {
        course = 'UI/UX Product Design';
      } else if (course.toLowerCase().includes('data') || course.toLowerCase().includes('analytics')) {
        course = 'Data Science & Analytics';
      }
      counts[course] = (counts[course] || 0) + 1;
    });

    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
    data.sort((a, b) => b.value - a.value);
    return data;
  }, [users]);

  // Course Insights Paragraph
  const courseInsight = useMemo(() => {
    if (courseData.length === 0) return "No registrations recorded for this cohort.";
    const total = metrics.total;
    const topCourse = courseData[0];
    const topCoursePct = Math.round((topCourse.value / total) * 100);
    const leastCourse = courseData[courseData.length - 1];

    let pText = `Our primary flagship study program is "${topCourse.name}" with ${topCourse.value} student registrations, accounting for ${topCoursePct}% of this cohort. `;
    if (courseData.length > 1) {
      pText += `The course with the smallest registration volume is "${leastCourse.name}" with ${leastCourse.value} student${leastCourse.value > 1 ? 's' : ''}. `;
    }
    pText += "This course distribution indicates strong engagement in technical pathways, allowing our coordinators to allocate learning guides and lab sessions to optimize student progress.";
    return pText;
  }, [courseData, metrics.total]);

  // 3. Date Joined Trend Data
  const joinData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      let dateMills = 0;
      if (u.createdAt) {
        if (typeof u.createdAt.toDate === 'function') {
          dateMills = u.createdAt.toDate().getTime();
        } else if (u.createdAt.seconds !== undefined) {
          dateMills = u.createdAt.seconds * 1000;
        } else {
          dateMills = new Date(u.createdAt).getTime() || 0;
        }
      }
      if (dateMills > 0) {
        const d = new Date(dateMills);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    const sortedKeys = Object.keys(counts).sort();
    let cumulative = 0;
    const data = sortedKeys.map(date => {
      cumulative += counts[date];
      return {
        date,
        daily: counts[date],
        cumulative
      };
    });

    return data;
  }, [users]);

  // Join Trend Insight Paragraph
  const joinInsight = useMemo(() => {
    if (joinData.length === 0) return "No registration date metadata available.";
    
    // Find peak registration day
    let peakDay = joinData[0];
    joinData.forEach(d => {
      if (d.daily > peakDay.daily) {
        peakDay = d;
      }
    });

    const formattedPeakDate = new Date(peakDay.date).toLocaleDateString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });

    return `Enrollment trends show a peak registration day on ${formattedPeakDate} with ${peakDay.daily} new signups. The cohort has maintained a steady registration trajectory, climbing to a cumulative total of ${metrics.total} students. This highlights strong cohort interest during initial onboarding waves.`;
  }, [joinData, metrics.total]);

  // 4. Gender Distribution
  const genderData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const g = u.gender ? u.gender.trim() : 'Not Disclosed';
      let cleanG = 'Not Disclosed';
      if (g.toLowerCase() === 'male' || g.toLowerCase() === 'm') cleanG = 'Male';
      else if (g.toLowerCase() === 'female' || g.toLowerCase() === 'f') cleanG = 'Female';
      else if (g.toLowerCase() === 'other' || g.toLowerCase() === 'prefer not to say') cleanG = 'Other';
      counts[cleanG] = (counts[cleanG] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  // Gender Insight Paragraph
  const genderInsight = useMemo(() => {
    const total = metrics.total;
    if (total === 0) return "";
    const maleCount = genderData.find(g => g.name === 'Male')?.value || 0;
    const femaleCount = genderData.find(g => g.name === 'Female')?.value || 0;
    const malePct = Math.round((maleCount / total) * 100);
    const femalePct = Math.round((femaleCount / total) * 100);

    return `Gender demographics are distributed at ${malePct}% Male and ${femalePct}% Female. Maintaining a balanced and diverse tech-education ecosystem remains central to our mission, supporting equal learning opportunities and inclusive cohort study teams.`;
  }, [genderData, metrics.total]);

  // 5. Geographic Distribution (Top States)
  const stateData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const s = u.state ? u.state.trim() : 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });

    const sorted = Object.entries(counts).map(([name, value]) => ({ name, value }));
    sorted.sort((a, b) => b.value - a.value);

    // Keep top 6 states and aggregate the rest
    if (sorted.length > 6) {
      const top = sorted.slice(0, 5);
      const rest = sorted.slice(5);
      const restSum = rest.reduce((sum, item) => sum + item.value, 0);
      top.push({ name: 'Other States', value: restSum });
      return top;
    }
    return sorted;
  }, [users]);

  // Geographic Insight Paragraph
  const geographicInsight = useMemo(() => {
    if (stateData.length === 0) return "";
    const total = metrics.total;
    const topState = stateData[0];
    const topStatePct = Math.round((topState.value / total) * 100);

    let pText = `Geographically, students are highly concentrated in "${topState.name}", representing ${topStatePct}% of this cohort. `;
    if (stateData.length > 1) {
      pText += `The remaining student body is spread across ${stateData.length - 1} other regions, highlighting a wide geographical footprint. `;
    }
    pText += "This spatial diversity suggests opportunities to organize localized study chapters, physical coding hubs, and regional project hackathons.";
    return pText;
  }, [stateData, metrics.total]);

  // 6. Availability / Commitment Level
  const commitData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const c = u.availability ? u.availability.trim() : 'Not Specified';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [users]);

  // Commitment Insight Paragraph
  const commitmentInsight = useMemo(() => {
    if (commitData.length === 0) return "";
    const topCommit = commitData[0];
    const topCommitPct = Math.round((topCommit.value / metrics.total) * 100);

    return `The majority of students (${topCommitPct}%) committed to the "${topCommit.name}" format. Tailoring curriculum modules, office hours, and tutorial delivery schedules around this commitment peak will ensure maximum engagement and graduation rates.`;
  }, [commitData, metrics.total]);

  // 7. Prior Experience Level
  const expData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const e = u.pathwayExperience || u.experience || 'Beginner';
      counts[e] = (counts[e] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [users]);

  // Experience Insight Paragraph
  const experienceInsight = useMemo(() => {
    if (expData.length === 0) return "";
    const topExp = expData[0];
    const topExpPct = Math.round((topExp.value / metrics.total) * 100);

    return `Around ${topExpPct}% of this cohort identify as "${topExp.name}" in their selected track. This distribution serves as a critical signal to curriculum designers: providing comprehensive base tutorials and hands-on guidance will prevent early drop-off.`;
  }, [expData, metrics.total]);

  // Empty State Guard
  if (users.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-500 max-w-xl mx-auto mt-6">
        <Activity className="w-12 h-12 text-slate-350 mx-auto mb-4 animate-pulse" />
        <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">No Student Analytics Available</h3>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
          There are no students registered under cohort <strong className="text-indigo-600">"{cohortName}"</strong>. Please select another cohort or sync with live database values to populate statistical telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Analytics Sub-Header Banner */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-black text-indigo-950 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <span>📊</span> Cohort Analytics Dashboard
          </h2>
          <p className="text-[11px] text-indigo-700 font-semibold">
            Visualizing statistical insights, course distributions, and demographic trends for <strong className="text-indigo-950 font-black">"{cohortName}"</strong>.
          </p>
        </div>
        <div className="px-3.5 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm">
          Active Filter: {cohortName}
        </div>
      </div>

      {/* Grid of Key Performance Indicators (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Students */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Enrollment</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 leading-none">{metrics.total}</div>
          <p className="text-[9px] text-slate-450 font-semibold mt-1">Registered students in this cohort</p>
        </div>

        {/* Pro Student Badges */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">CIYA Pro Badges</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 leading-none">{metrics.proCount}</div>
          <p className="text-[9px] text-emerald-600 font-semibold mt-1">{metrics.proPct}% premium conversion rate</p>
        </div>

        {/* Account Activation Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Activated Accounts</span>
            <UserCheck className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 leading-none">{metrics.activeCount}</div>
          <p className="text-[9px] text-cyan-600 font-semibold mt-1">{metrics.activePct}% login activation rate</p>
        </div>

        {/* Verified Applications */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Approved Applicants</span>
            <Compass className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 leading-none">{metrics.approvedCount}</div>
          <p className="text-[9px] text-amber-600 font-semibold mt-1">{metrics.approvedPct}% onboarding acceptance rate</p>
        </div>

      </div>

      {/* Row 1: Course Registrations & Joined Dates Trend */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Course Registration Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm xl:col-span-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
              <BookOpen className="w-4 h-4 text-indigo-600" /> Course Enrolment Spread
            </h3>
            <div className="w-full h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {courseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend to handle layout spacing nicely */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-3">
              {courseData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                  <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate max-w-[120px]">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase text-indigo-700 mb-1">Enrolment Dynamic Analysis</h4>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed m-0">
              {courseInsight}
            </p>
          </div>
        </div>

        {/* Date Joined Timeline Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm xl:col-span-7 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
              <Calendar className="w-4 h-4 text-indigo-600" /> Enrollment Velocity & Cumulative Growth
            </h3>
            <div className="w-full h-56 mt-2">
              {joinData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={joinData}>
                    <defs>
                      <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8" 
                      fontSize={9} 
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={9} 
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    />
                    <Legend verticalAlign="top" height={32} iconSize={10} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <Area type="monotone" name="Cumulative Total" dataKey="cumulative" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorCumulative)" />
                    <Bar name="Daily Signups" dataKey="daily" fill="#06b6d4" radius={[2, 2, 0, 0]} barSize={12} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400 font-semibold">
                  No date history records available for this cohort.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase text-indigo-700 mb-1">Growth Curve Insights</h4>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed m-0">
              {joinInsight}
            </p>
          </div>
        </div>

      </div>

      {/* Row 2: Demographic Analytics (Gender & States) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Gender Balance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm xl:col-span-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
              <Users className="w-4 h-4 text-indigo-600" /> Student Demographic Distribution
            </h3>
            <div className="w-full h-52 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : index === 1 ? '#ec4899' : '#06b6d4'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase text-indigo-700 mb-1">Inclusivity Telemetry</h4>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed m-0">
              {genderInsight}
            </p>
          </div>
        </div>

        {/* State of Residence Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm xl:col-span-7 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
              <MapPin className="w-4 h-4 text-indigo-600" /> Geographic Coverage (Top States)
            </h3>
            <div className="w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stateData} layout="vertical">
                  <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#475569" fontSize={9} width={90} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={16}>
                    {stateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase text-indigo-700 mb-1">Geographical Density Insight</h4>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed m-0">
              {geographicInsight}
            </p>
          </div>
        </div>

      </div>

      {/* Row 3: Study Preparedness & Logistical Telemetry */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Commitment Level Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm xl:col-span-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
              <Activity className="w-4 h-4 text-indigo-600" /> Expected Availability & Study Hours
            </h3>
            <div className="w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commitData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase text-indigo-700 mb-1">Commitment Level Analysis</h4>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed m-0">
              {commitmentInsight}
            </p>
          </div>
        </div>

        {/* Prior Coding Experience */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm xl:col-span-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
              <Compass className="w-4 h-4 text-indigo-600" /> Baseline Student Coding Preparedness
            </h3>
            <div className="w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase text-indigo-700 mb-1">Preparedness Insight</h4>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed m-0">
              {experienceInsight}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}

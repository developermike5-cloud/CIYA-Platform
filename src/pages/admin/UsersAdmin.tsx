import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Search, Filter } from 'lucide-react';

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
  referralCode?: string;
  myReferralCode?: string;
  isActivated?: boolean;
  referralsCount?: number;
  createdAt: any;
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filterState, setFilterState] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortDate, setSortDate] = useState('desc');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        setUsers(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const uniqueStates = Array.from(new Set(users.map(u => u.state).filter(Boolean))).sort() as string[];
  const uniqueCourses = Array.from(new Set(users.map(u => u.courseType || u.pathwaySelection).filter(Boolean))).sort() as string[];

  const filteredUsers = useMemo(() => {
    let result = users.filter(u => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        (u.fullName?.toLowerCase() || '').includes(term) ||
        (u.email?.toLowerCase() || '').includes(term) ||
        (u.whatsapp?.toLowerCase() || '').includes(term) ||
        (u.state?.toLowerCase() || '').includes(term) ||
        (u.myReferralCode?.toLowerCase() || '').includes(term) ||
        (u.recommendedPath?.toLowerCase() || '').includes(term) ||
        (u.courseType?.toLowerCase() || '').includes(term)
      );

      const matchesState = filterState ? u.state === filterState : true;
      const matchesCourse = filterCourse ? (u.courseType === filterCourse || u.pathwaySelection === filterCourse) : true;
      const matchesStatus = filterStatus === 'activated' ? u.isActivated : filterStatus === 'pending' ? !u.isActivated : true;

      return matchesSearch && matchesState && matchesCourse && matchesStatus;
    });

    result.sort((a, b) => {
      const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
      const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
      return sortDate === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [users, searchTerm, filterState, filterCourse, filterStatus, sortDate]);

  return (
    <div>
      <div className="flex flex-col mb-6 gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Students & Onboarding Stats</h1>
          
          <div className="relative w-full md:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search students..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 bg-white"
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-slate-500 font-medium mr-2">
            <Filter className="w-4 h-4" /> Filters:
          </div>
          
          <select 
            value={sortDate} 
            onChange={(e) => setSortDate(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="desc" className="text-slate-800">Date Registered (Newest)</option>
            <option value="asc" className="text-slate-800">Date Registered (Oldest)</option>
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="" className="text-slate-800">All Statuses</option>
            <option value="activated" className="text-slate-800">Activated Slots</option>
            <option value="pending" className="text-slate-800">Pending Slots</option>
          </select>

          <select 
            value={filterCourse} 
            onChange={(e) => setFilterCourse(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="" className="text-slate-800">All Courses</option>
            {uniqueCourses.map(c => (
              <option key={c} value={c} className="text-slate-800">{c}</option>
            ))}
          </select>

          <select 
            value={filterState} 
            onChange={(e) => setFilterState(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="" className="text-slate-800">All States</option>
            {uniqueStates.map(s => (
              <option key={s} value={s} className="text-slate-800">{s}</option>
            ))}
          </select>
          
          {(filterState || filterCourse || filterStatus || sortDate !== 'desc') && (
            <button 
              onClick={() => {
                setFilterState('');
                setFilterCourse('');
                setFilterStatus('');
                setSortDate('desc');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium ml-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-indigo-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Students</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{users.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-emerald-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Activated Slots</h3>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            {users.filter(u => u.isActivated).length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-amber-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Beginners</h3>
          <p className="text-3xl font-bold text-amber-600 mt-1">
            {users.filter(u => u.experience && u.experience.toLowerCase().includes('beginner')).length}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-blue-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Committed (5 Days)</h3>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {users.filter(u => u.availability && u.availability.includes('Fully committed')).length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Path Details (Selection / Goal)</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Recommended Path</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Referral & Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{u.fullName || '-'}</div>
                    <div className="text-slate-500 text-xs">{u.gender ? `${u.gender} • ` : ''}{u.email}</div>
                    <div className="text-slate-500 text-xs">{u.state || '-'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-slate-900">{u.whatsapp || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-900 font-medium text-xs mb-1 break-words">{u.intent}</div>
                    <div className="text-slate-600 text-xs mb-1">Level: {u.experience}</div>
                    <div className="text-slate-600 text-xs">Goal: {u.goal}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                      {u.recommendedPath || '-'}
                    </span>
                    <div className="text-slate-500 text-xs mt-1">
                      <span className="font-semibold text-slate-700">{u.courseType || ''}</span>
                      {u.courseType && u.pathwaySelection ? ' - ' : ''}
                      {u.pathwaySelection || ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 mb-1">
                      {u.isActivated ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700">ACTIVATED</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">PENDING</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600">Code: <span className="font-mono bg-slate-100 px-1 rounded">{u.myReferralCode || '-'}</span></div>
                    <div className="text-xs text-slate-600">Invited: {u.referralsCount || 0}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                    {u.createdAt ? ((u.createdAt as any).toDate ? (u.createdAt as any).toDate().toLocaleDateString() : new Date(u.createdAt).toLocaleDateString()) : '-'}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

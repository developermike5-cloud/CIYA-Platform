import { useEffect, useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router';
import { auth, db } from '../../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Menu, X } from 'lucide-react';
import BrandingLogo from '../../components/BrandingLogo';

export default function AdminLayout() {
  const [user, setUser] = useState<any>(() => {
    const cached = localStorage.getItem('ciya_cached_user');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.email === 'developermike5@gmail.com' || parsed.role === 'admin')) {
          return parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(true);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (currentUser.email === 'developermike5@gmail.com') {
          const userData = {
            uid: currentUser.uid,
            email: currentUser.email,
            role: 'super_admin',
            permissions: ['manage_courses', 'manage_students', 'manage_branding'],
            adminRole: 'Super Admin'
          };
          localStorage.setItem('ciya_cached_user', JSON.stringify(userData));
          setUser(userData);
          setLoading(false);
        } else {
          try {
            const adminDocRef = doc(db, 'admins', currentUser.uid);
            const adminDocSnap = await getDoc(adminDocRef);
            if (adminDocSnap.exists()) {
              const data = adminDocSnap.data();
              const userData = {
                uid: currentUser.uid,
                email: currentUser.email,
                role: 'admin',
                permissions: data?.permissions || [],
                adminRole: data?.role || 'CIYA Admin'
              };
              localStorage.setItem('ciya_cached_user', JSON.stringify(userData));
              setUser(userData);
            } else {
              localStorage.removeItem('ciya_cached_user');
              setUser(null);
            }
          } catch (err) {
            console.error("Error verifying admin details from DB:", err);
            localStorage.removeItem('ciya_cached_user');
            setUser(null);
          } finally {
            setLoading(false);
          }
        }
      } else {
        const cached = localStorage.getItem('ciya_cached_user');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && (parsed.email === 'developermike5@gmail.com' || parsed.role === 'admin')) {
              setUser(parsed);
            } else {
              localStorage.removeItem('ciya_cached_user');
              setUser(null);
            }
          } catch (e) {
            localStorage.removeItem('ciya_cached_user');
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('ciya_cached_user');
    await signOut(auth);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  const isSuperAdmin = user?.email === 'developermike5@gmail.com' || user?.role === 'super_admin';
  const userPermissions = user?.permissions || [];
  const activeRole = user?.adminRole || (isSuperAdmin ? 'Super Admin' : 'CIYA Admin');

  const canManageCourses = isSuperAdmin || userPermissions.includes('manage_courses');
  const canManageStudents = isSuperAdmin || userPermissions.includes('manage_students');

  // Secure URL routes
  const path = location.pathname;
  const isAtCourses = path === '/admin' || path.startsWith('/admin/course');
  const isAtStudents = path.startsWith('/admin/users');

  if (isAtCourses && !canManageCourses) {
    if (canManageStudents) {
      return <Navigate to="/admin/users" />;
    } else {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-xl shadow-md max-w-sm">
            <span className="text-3xl">🔒</span>
            <h1 className="text-xl font-bold mt-4 text-slate-800">Access Denied</h1>
            <p className="text-slate-600 mt-2 text-sm font-medium">You do not have permission to manage default courses.</p>
            <Link to="/dashboard" className="mt-6 inline-block w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded text-sm transition-colors">
              Go to Student Portal
            </Link>
          </div>
        </div>
      );
    }
  }

  if (isAtStudents && !canManageStudents) {
    if (canManageCourses) {
      return <Navigate to="/admin" />;
    } else {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-xl shadow-md max-w-sm">
            <span className="text-3xl">🔒</span>
            <h1 className="text-xl font-bold mt-4 text-slate-800">Access Denied</h1>
            <p className="text-slate-600 mt-2 text-sm font-medium">You do not have permission to manage students.</p>
            <Link to="/dashboard" className="mt-6 inline-block w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded text-sm transition-colors">
              Go to Student Portal
            </Link>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-slate-900 text-white flex flex-col fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex flex-col gap-1 relative border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BrandingLogo size="sm" />
          </div>
          <div className="mt-1 pl-3 flex items-center gap-1.5">
            <span className="text-[10px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">{activeRole}</span>
          </div>
          <button 
            className="md:hidden absolute top-6 right-6 text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {canManageCourses && (
            <Link 
              to="/admin" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded-md ${location.pathname === '/admin' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}
            >
              Courses
            </Link>
          )}
          {canManageStudents && (
            <Link 
              to="/admin/users" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded-md ${location.pathname.startsWith('/admin/users') ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}
            >
              Students & Stats
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <p className="text-sm text-slate-400 mb-2 truncate">{user.email}</p>
          <button 
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 hover:bg-slate-800 rounded-md text-sm text-red-400"
          >
            Log out
          </button>
        </div>
      </aside>


      {/* Main Content */}
      <main className="flex-1 flex flex-col items-stretch h-screen overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center px-4 md:px-8 shrink-0 gap-4">
          <button 
            className="md:hidden text-slate-500 hover:text-slate-800"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-semibold text-slate-800">Dashboard</h2>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

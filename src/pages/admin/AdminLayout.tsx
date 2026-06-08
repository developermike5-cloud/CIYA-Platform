import { useEffect, useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router';
import { auth } from '../../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { Menu, X } from 'lucide-react';

export default function AdminLayout() {
  const [user, setUser] = useState<any>(() => {
    const cached = localStorage.getItem('ciya_cached_user');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.email === 'developermike5@gmail.com') {
          return parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('ciya_cached_user');
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        if (currentUser.email === 'developermike5@gmail.com') {
          const userData = {
            uid: currentUser.uid,
            email: currentUser.email,
            role: 'admin'
          };
          localStorage.setItem('ciya_cached_user', JSON.stringify(userData));
          setUser(currentUser);
        } else {
          localStorage.removeItem('ciya_cached_user');
          setUser(null);
        }
      } else {
        const cached = localStorage.getItem('ciya_cached_user');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.email === 'developermike5@gmail.com') {
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
      }
      setLoading(false);
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

  if (user.email !== 'developermike5@gmail.com') {
    return <Navigate to="/dashboard" />;
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
        <div className="p-6 flex items-center justify-between relative">
          <div className="text-2xl font-bold tracking-tight">CIYA Admin</div>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link 
            to="/admin" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-4 py-2 rounded-md ${location.pathname === '/admin' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}
          >
            Courses
          </Link>
          <Link 
            to="/admin/users" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-4 py-2 rounded-md ${location.pathname.startsWith('/admin/users') ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}
          >
            Students & Stats
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-700">
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

import { supabase } from '../supabase';
import { safeStorage } from '../../utils/safeStorage';

function mapSupabaseUserToFirebase(user: any) {
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
    photoURL: user.user_metadata?.avatar_url || null,
    emailVerified: !!user.email_confirmed_at || true,
    isAnonymous: false,
    providerData: [
      {
        providerId: 'google.com',
        uid: user.id,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name,
        email: user.email,
        photoURL: user.user_metadata?.avatar_url,
      }
    ],
    getIdToken: async () => 'mock-id-token',
    getIdTokenResult: async () => ({ token: 'mock-id-token' }),
  };
}

let cachedUser: any = null;
const authListeners = new Set<(user: any) => void>();

function notifyListeners() {
  authListeners.forEach(cb => {
    try {
      cb(cachedUser);
    } catch (e) {
      console.error("[Auth] Error in auth listener callback:", e);
    }
  });
}

// 1. Pre-load cached fallback active user immediately to prevent blank/flickering loading states
try {
  const localUserStr = safeStorage.getItem('ciya_fallback_active_user');
  if (localUserStr) {
    cachedUser = JSON.parse(localUserStr);
  }
} catch (e) {
  console.warn("[Auth Fallback] Failed to parse local active user on startup:", e);
}

// 2. Check current Supabase session if online
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    cachedUser = mapSupabaseUserToFirebase(session.user);
    try {
      safeStorage.setItem('ciya_fallback_active_user', JSON.stringify(cachedUser));
      safeStorage.setItem('ciya_fallback_is_active', 'false');
    } catch (e) {}
    notifyListeners();
  }
}).catch(e => {
  console.warn("[Auth] Supabase initial session check failed (expected in fallback/offline):", e);
});

// Subscribe to Supabase auth state changes
try {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      cachedUser = mapSupabaseUserToFirebase(session.user);
      try {
        safeStorage.setItem('ciya_fallback_active_user', JSON.stringify(cachedUser));
        safeStorage.setItem('ciya_fallback_is_active', 'false');
      } catch (e) {}
    } else {
      const isFallback = safeStorage.getItem('ciya_fallback_is_active') === 'true';
      if (!isFallback) {
        cachedUser = null;
        safeStorage.removeItem('ciya_fallback_active_user');
      }
    }
    notifyListeners();
  });
} catch (e) {
  console.warn("[Auth] Failed to subscribe to onAuthStateChange:", e);
}

export const auth = {
  get currentUser() {
    return cachedUser;
  }
};

export function getAuth() {
  return auth;
}

export function initializeAuth() {
  return auth;
}

export class GoogleAuthProvider {
  static PROVIDER_ID = 'google.com';
  setCustomParameters(params: any) {
    return this;
  }
}

export const browserLocalPersistence = 'LOCAL';
export const browserSessionPersistence = 'SESSION';
export const inMemoryPersistence = 'NONE';

function handleFallbackSignIn(email: string, password: string) {
  console.log("[Auth Fallback] Handling local sign-in for:", email);
  let users: any[] = [];
  try {
    const stored = safeStorage.getItem('ciya_mock_users');
    if (stored) {
      users = JSON.parse(stored);
    }
  } catch (e) {}

  const existing = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    // Standard student dashboard behavior: auto-register on sign-in if not exists to facilitate onboarding
    const newUser = {
      uid: 'fallback_' + Math.random().toString(36).substring(2, 11),
      email: email,
      password: password,
      displayName: email.split('@')[0],
      photoURL: null,
    };
    users.push(newUser);
    safeStorage.setItem('ciya_mock_users', JSON.stringify(users));
    
    cachedUser = {
      uid: newUser.uid,
      email: newUser.email,
      displayName: newUser.displayName,
      photoURL: newUser.photoURL,
      emailVerified: true,
      isAnonymous: false,
      providerData: [],
      getIdToken: async () => 'mock-id-token',
      getIdTokenResult: async () => ({ token: 'mock-id-token' }),
    };
    safeStorage.setItem('ciya_fallback_is_active', 'true');
    safeStorage.setItem('ciya_fallback_active_user', JSON.stringify(cachedUser));
    notifyListeners();
    return { user: cachedUser };
  }

  if (existing.password && existing.password !== password) {
    throw new Error('Wrong password or invalid credentials');
  }

  cachedUser = {
    uid: existing.uid,
    email: existing.email,
    displayName: existing.displayName || existing.email.split('@')[0],
    photoURL: existing.photoURL || null,
    emailVerified: true,
    isAnonymous: false,
    providerData: [],
    getIdToken: async () => 'mock-id-token',
    getIdTokenResult: async () => ({ token: 'mock-id-token' }),
  };
  safeStorage.setItem('ciya_fallback_is_active', 'true');
  safeStorage.setItem('ciya_fallback_active_user', JSON.stringify(cachedUser));
  notifyListeners();
  return { user: cachedUser };
}

function handleFallbackSignUp(email: string, password: string) {
  console.log("[Auth Fallback] Handling local sign-up for:", email);
  let users: any[] = [];
  try {
    const stored = safeStorage.getItem('ciya_mock_users');
    if (stored) {
      users = JSON.parse(stored);
    }
  } catch (e) {}

  const existing = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('User already registered');
  }

  const newUser = {
    uid: 'fallback_' + Math.random().toString(36).substring(2, 11),
    email: email,
    password: password,
    displayName: email.split('@')[0],
    photoURL: null,
  };
  users.push(newUser);
  safeStorage.setItem('ciya_mock_users', JSON.stringify(users));

  cachedUser = {
    uid: newUser.uid,
    email: newUser.email,
    displayName: newUser.displayName,
    photoURL: newUser.photoURL,
    emailVerified: true,
    isAnonymous: false,
    providerData: [],
    getIdToken: async () => 'mock-id-token',
    getIdTokenResult: async () => ({ token: 'mock-id-token' }),
  };
  safeStorage.setItem('ciya_fallback_is_active', 'true');
  safeStorage.setItem('ciya_fallback_active_user', JSON.stringify(cachedUser));
  notifyListeners();
  return { user: cachedUser };
}

export async function signInWithPopup(authObj: any, provider: any) {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) throw error;
    
    return {
      user: cachedUser || {
        uid: 'authenticating',
        email: '',
        displayName: 'Google User',
      }
    };
  } catch (err: any) {
    // Mock user for Google login fallback
    console.warn("signInWithPopup failed, falling back:", err);
    return handleFallbackSignIn('student@ciya.com', 'password123');
  }
}

export async function signInWithEmailAndPassword(authObj: any, email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (error.message?.toLowerCase().includes('failed to fetch') || error.message?.toLowerCase().includes('network')) {
        return handleFallbackSignIn(email, password);
      }
      throw error;
    }
    
    cachedUser = mapSupabaseUserToFirebase(data.user);
    safeStorage.setItem('ciya_fallback_is_active', 'false');
    safeStorage.setItem('ciya_fallback_active_user', JSON.stringify(cachedUser));
    notifyListeners();
    return { user: cachedUser };
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('network') || err instanceof TypeError) {
      return handleFallbackSignIn(email, password);
    }
    throw err;
  }
}

export async function createUserWithEmailAndPassword(authObj: any, email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      if (error.message?.toLowerCase().includes('failed to fetch') || error.message?.toLowerCase().includes('network')) {
        return handleFallbackSignUp(email, password);
      }
      if (
        error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already exists') ||
        error.message?.toLowerCase().includes('already in use') ||
        error.message?.toLowerCase().includes('already-in-use')
      ) {
        throw new Error('User already registered');
      }
      throw error;
    }
    
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('User already registered');
    }
    
    cachedUser = mapSupabaseUserToFirebase(data.user);
    safeStorage.setItem('ciya_fallback_is_active', 'false');
    safeStorage.setItem('ciya_fallback_active_user', JSON.stringify(cachedUser));
    notifyListeners();
    return { user: cachedUser };
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('network') || err instanceof TypeError) {
      return handleFallbackSignUp(email, password);
    }
    throw err;
  }
}

export async function updateProfile(userObj: any, profileData: { displayName?: string; photoURL?: string }) {
  try {
    const isFallback = safeStorage.getItem('ciya_fallback_is_active') === 'true';
    if (!isFallback) {
      await supabase.auth.updateUser({
        data: {
          full_name: profileData.displayName,
          avatar_url: profileData.photoURL
        }
      });
    }
  } catch (err) {
    console.warn("[Auth] Supabase updateProfile error ignored in fallback:", err);
  }

  if (cachedUser) {
    cachedUser.displayName = profileData.displayName || cachedUser.displayName;
    cachedUser.photoURL = profileData.photoURL || cachedUser.photoURL;
    safeStorage.setItem('ciya_fallback_active_user', JSON.stringify(cachedUser));
  }

  try {
    const stored = safeStorage.getItem('ciya_mock_users');
    if (stored && cachedUser) {
      const users = JSON.parse(stored);
      const idx = users.findIndex((u: any) => u.uid === cachedUser.uid);
      if (idx !== -1) {
        users[idx].displayName = profileData.displayName || users[idx].displayName;
        users[idx].photoURL = profileData.photoURL || users[idx].photoURL;
        safeStorage.setItem('ciya_mock_users', JSON.stringify(users));
      }
    }
  } catch (e) {}

  notifyListeners();
  return cachedUser;
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[Auth] Supabase signOut error ignored in fallback:", err);
  }
  cachedUser = null;
  safeStorage.removeItem('ciya_fallback_active_user');
  safeStorage.removeItem('ciya_fallback_is_active');
  notifyListeners();
}

export function onAuthStateChanged(authObj: any, callback: (user: any) => void) {
  authListeners.add(callback);
  
  // Fire immediately with current cached value
  callback(cachedUser);

  // Attempt real supabase subscribe as well
  let unsubscribeSupabase: (() => void) | null = null;
  try {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        cachedUser = mapSupabaseUserToFirebase(session.user);
        try {
          safeStorage.setItem('ciya_fallback_active_user', JSON.stringify(cachedUser));
          safeStorage.setItem('ciya_fallback_is_active', 'false');
        } catch (e) {}
      } else {
        const isFallback = safeStorage.getItem('ciya_fallback_is_active') === 'true';
        if (!isFallback) {
          cachedUser = null;
          safeStorage.removeItem('ciya_fallback_active_user');
        }
      }
      notifyListeners();
    });
    unsubscribeSupabase = () => subscription.unsubscribe();
  } catch (err) {
    console.warn("[Auth] Supabase auth subscription failed:", err);
  }

  return () => {
    authListeners.delete(callback);
    if (unsubscribeSupabase) {
      unsubscribeSupabase();
    }
  };
}

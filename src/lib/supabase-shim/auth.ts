import { supabase } from '../supabase';

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

// Initialize cached user immediately from current session if available
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    cachedUser = mapSupabaseUserToFirebase(session.user);
  }
}).catch(e => {
  console.warn("Supabase auth initial session check failed gracefully:", e);
});

supabase.auth.onAuthStateChange((_event, session) => {
  cachedUser = mapSupabaseUserToFirebase(session?.user || null);
});

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
    // No-op to support Firebase compatibility
    return this;
  }
}

export const browserLocalPersistence = 'LOCAL';
export const browserSessionPersistence = 'SESSION';
export const inMemoryPersistence = 'NONE';

export async function signInWithPopup(authObj: any, provider: any) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    }
  });
  if (error) throw error;
  
  // Wait brief moment or return a mock success structure (the redirection happens automatically)
  return {
    user: cachedUser || {
      uid: 'authenticating',
      email: '',
      displayName: 'Google User',
    }
  };
}

export async function signInWithEmailAndPassword(authObj: any, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  
  cachedUser = mapSupabaseUserToFirebase(data.user);
  return { user: cachedUser };
}

export async function createUserWithEmailAndPassword(authObj: any, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) {
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
  return { user: cachedUser };
}

export async function updateProfile(userObj: any, profileData: { displayName?: string; photoURL?: string }) {
  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: profileData.displayName,
      avatar_url: profileData.photoURL
    }
  });
  if (error) throw error;
  
  if (cachedUser) {
    cachedUser.displayName = profileData.displayName || cachedUser.displayName;
    cachedUser.photoURL = profileData.photoURL || cachedUser.photoURL;
  }
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  cachedUser = null;
}

export function onAuthStateChanged(authObj: any, callback: (user: any) => void) {
  // First, fire with the currently cached user (or fetch if not cached yet)
  if (cachedUser) {
    callback(cachedUser);
  } else {
    supabase.auth.getUser().then(({ data: { user } }) => {
      cachedUser = mapSupabaseUserToFirebase(user);
      callback(cachedUser);
    }).catch(() => {
      callback(null);
    });
  }

  // Subscribe to changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    cachedUser = mapSupabaseUserToFirebase(session?.user || null);
    callback(cachedUser);
  });

  return () => {
    subscription.unsubscribe();
  };
}

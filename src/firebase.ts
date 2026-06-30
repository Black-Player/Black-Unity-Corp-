import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth,
  browserLocalPersistence, 
  browserPopupRedirectResolver, 
  GoogleAuthProvider, 
  signInWithPopup as fbSignInWithPopup, 
  onAuthStateChanged as fbOnAuthStateChanged, 
  User as FirebaseUser,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signOut as fbSignOut
} from 'firebase/auth';
import { initializeFirestore, getFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Log level config for silent firestore
try {
  setLogLevel('silent');
} catch (e) {}

let app: any;
let auth: any;
let db: any;
let isMock = false;

// Safe Initialization
const hasRealConfig = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.apiKey !== "";
isMock = !hasRealConfig;

try {
  if (isMock) {
    throw new Error("No real Firebase configuration found");
  }

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Safe Auth initialization
  try {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch (authErr: any) {
    console.warn("initializeAuth with custom persistence failed, trying standard getAuth:", authErr);
    try {
      auth = getAuth(app);
    } catch (getAuthErr: any) {
      console.error("Critical Auth initialization failed:", getAuthErr);
      throw getAuthErr;
    }
  }

  // Wrap real signOut to clear local storage as well
  if (auth && typeof auth.signOut === 'function') {
    const realSignOut = auth.signOut.bind(auth);
    auth.signOut = async () => {
      localStorage.removeItem('mock_logged_in_user');
      localStorage.removeItem('google_access_token');
      cachedAccessToken = null;
      await realSignOut();
    };
  }
  
  // Safe Firestore initialization
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true
    });
  } catch (dbErr: any) {
    console.warn("initializeFirestore with polling failed, trying standard getFirestore:", dbErr);
    try {
      db = getFirestore(app);
    } catch (getDbErr: any) {
      console.error("Critical Firestore initialization failed:", getDbErr);
      throw getDbErr;
    }
  }

} catch (err) {
  console.warn("Firebase real initialization failed, falling back to mock driver:", err);
  isMock = true;
  app = {};
  db = {};
  auth = {
    signOut: async () => {
      localStorage.removeItem('mock_logged_in_user');
    },
    get currentUser() {
      const saved = localStorage.getItem('mock_logged_in_user');
      return saved ? JSON.parse(saved) : null;
    }
  };
}

export { app, auth, db };

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('google_access_token');

export interface User {
  uid: string;
  email: string | null;
}

// Global hook for Auth state
export const onAuthStateChanged = (authInstance: any, callback: (user: FirebaseUser | null) => void) => {
  if (isMock) {
    const saved = localStorage.getItem('mock_logged_in_user');
    const mockUser = saved ? JSON.parse(saved) : null;
    setTimeout(() => callback(mockUser), 300);
    return () => {};
  }
  return fbOnAuthStateChanged(authInstance, (user) => {
    if (user) {
      localStorage.setItem('mock_logged_in_user', JSON.stringify({ uid: user.uid, email: user.email }));
    } else {
      localStorage.removeItem('mock_logged_in_user');
    }
    callback(user);
  });
};

export const signInWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
  const normEmail = email.toLowerCase().trim();

  if (isMock) {
    const users = JSON.parse(localStorage.getItem('mock_db_users') || '{}');
    if (users[normEmail] && users[normEmail] !== pass) {
      throw new Error('Incorrect password for this mock account.');
    }
    users[normEmail] = pass;
    localStorage.setItem('mock_db_users', JSON.stringify(users));

    const loggedInUser = { uid: 'mock_' + btoa(normEmail).replace(/[^a-zA-Z0-9]/g, ''), email: normEmail };
    localStorage.setItem('mock_logged_in_user', JSON.stringify(loggedInUser));
    return { user: loggedInUser };
  }

  // Real Email/Password Sign In
  const res = await fbSignInWithEmailAndPassword(authInstance, normEmail, pass);
  if (res.user) {
    localStorage.setItem('mock_logged_in_user', JSON.stringify({ uid: res.user.uid, email: res.user.email }));
  }
  return res;
};

export const createUserWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
  const normEmail = email.toLowerCase().trim();

  if (isMock) {
    const users = JSON.parse(localStorage.getItem('mock_db_users') || '{}');
    if (users[normEmail]) {
      throw new Error('Email already exists in local database.');
    }
    users[normEmail] = pass;
    localStorage.setItem('mock_db_users', JSON.stringify(users));

    const loggedInUser = { uid: 'mock_' + btoa(normEmail).replace(/[^a-zA-Z0-9]/g, ''), email: normEmail };
    localStorage.setItem('mock_logged_in_user', JSON.stringify(loggedInUser));
    return { user: loggedInUser };
  }

  // Real Email/Password Sign Up
  const res = await fbCreateUserWithEmailAndPassword(authInstance, normEmail, pass);
  if (res.user) {
    localStorage.setItem('mock_logged_in_user', JSON.stringify({ uid: res.user.uid, email: res.user.email }));
  }
  return res;
};

export const signInWithPopup = async (authInstance: any, provider: any): Promise<any> => {
  if (isMock) {
    const loggedInUser = { uid: 'demo_user_1', email: 'demo@zion.com' };
    localStorage.setItem('mock_logged_in_user', JSON.stringify(loggedInUser));
    return { user: loggedInUser };
  }
  const res = await fbSignInWithPopup(authInstance, provider);
  if (res.user) {
    localStorage.setItem('mock_logged_in_user', JSON.stringify({ uid: res.user.uid, email: res.user.email }));
  }
  return res;
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (isMock) {
    const saved = localStorage.getItem('mock_logged_in_user');
    const mockUser = saved ? JSON.parse(saved) : null;
    setTimeout(() => {
      if (mockUser) {
        if (onAuthSuccess) onAuthSuccess(mockUser, cachedAccessToken || 'mock_token_123');
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    }, 300);
    return () => {};
  }

  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(firebaseUser as any, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthSuccess) onAuthSuccess(firebaseUser as any, 'mock_token_123');
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('google_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const loginWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isMock) {
    return {
      user: { uid: 'demo_user_1', email: 'demo@zion.com' },
      accessToken: 'mock_token_123'
    };
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      localStorage.setItem('google_access_token', credential.accessToken);
    }
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.error('Sign in error:', error);
    // Graceful offline simulation if popup is blocked or internet is down
    if (error.message?.includes('network') || error.code?.includes('offline') || error.code === 'auth/popup-blocked') {
      console.warn("Google authentication failed/blocked, applying adaptive local login bypass");
      const localUser = { uid: 'demo_user_1', email: 'demo@zion.com' };
      return { user: localUser, accessToken: 'mock_token_123' };
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || 'mock_token_123';
};

export const logout = async () => {
  cachedAccessToken = null;
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('mock_logged_in_user');
  if (!isMock) {
    try {
      await fbSignOut(auth);
    } catch (e) {}
  }
};

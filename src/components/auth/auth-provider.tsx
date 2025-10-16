
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged, User, getRedirectResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  isAuthorized: boolean;
  setIsAuthorized: (isAuthorized: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  idToken: null,
  loading: true,
  isAuthorized: false,
  setIsAuthorized: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check for redirect result first (for signInWithRedirect)
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect sign-in successful:', result.user.email);
        }
      } catch (error: any) {
        console.error('Redirect sign-in error:', error);
      }
    };
    
    checkRedirectResult();

    // Then listen for auth state changes
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        try {
          const token = await user.getIdToken(true); // Force refresh
          setIdToken(token);
        } catch (error) {
          console.error("Error getting ID token:", error);
          setIdToken(null);
          setIsAuthorized(false);
        }
      } else {
        setUser(null);
        setIdToken(null);
        setIsAuthorized(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = { user, idToken, loading, isAuthorized, setIsAuthorized };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

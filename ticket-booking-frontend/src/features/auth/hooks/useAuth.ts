import { useState, useEffect } from 'react';
import { AuthenticationDetails, CognitoUser, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { userPool, getCurrentUser, getSession, logout as cognitoLogout } from '../api/cognito';
import apiClient from '@/api/client';

export function useAuth() {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        try {
          const session = await getSession(currentUser);
          if (session.isValid()) {
            setUser(currentUser);
            setIsAuthenticated(true);
            const payload = session.getIdToken().payload;
            const userEmail = payload.email || null;
            setEmail(userEmail);

            const groups = payload['cognito:groups'] || [];
            setIsAdmin(groups.includes('admin'));

            // Sync with backend on reload
            if (userEmail) {
              apiClient.post('/api/auth/sync', { email: userEmail }).catch(e => console.error("Sync error:", e));
            }
          }
        } catch (error) {
          console.error("Session invalid", error);
          cognitoLogout();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = (emailInput: string, passwordInput: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: emailInput,
        Password: passwordInput,
      });

      const cognitoUser = new CognitoUser({
        Username: emailInput,
        Pool: userPool,
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: async (result) => {
          setUser(cognitoUser);
          setIsAuthenticated(true);
          const payload = result.getIdToken().payload;
          const resolvedEmail = payload.email || emailInput;
          setEmail(resolvedEmail);
          
          const groups = payload['cognito:groups'] || [];
          setIsAdmin(groups.includes('admin'));

          // CRITICAL: Sync user with PostgreSQL backend so reserve API works
          try {
            await apiClient.post('/api/auth/sync', { email: resolvedEmail });
          } catch (e) {
            console.error("Failed to sync auth with backend", e);
          }

          resolve();
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  };

  const register = (emailInput: string, passwordInput: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: emailInput })
      ];

      userPool.signUp(emailInput, passwordInput, attributeList, [], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };

  const confirmRegistration = (emailInput: string, code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: emailInput,
        Pool: userPool,
      });

      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  const logout = () => {
    cognitoLogout();
    setUser(null);
    setIsAuthenticated(false);
    setEmail(null);
    setIsAdmin(false);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    email,
    login,
    register,
    confirmRegistration,
    logout
  };
}

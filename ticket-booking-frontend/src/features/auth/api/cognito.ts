import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { env } from '@/shared/config/env';

// Initialize the Cognito User Pool
export const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
});

export const getCurrentUser = (): CognitoUser | null => {
  return userPool.getCurrentUser();
};

export const getSession = async (user: CognitoUser): Promise<any> => {
  return new Promise((resolve, reject) => {
    user.getSession((err: any, session: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(session);
      }
    });
  });
};

export const logout = () => {
  const user = getCurrentUser();
  if (user) {
    user.signOut();
  }
};

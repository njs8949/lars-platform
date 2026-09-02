import React, { useState } from 'react';
import { Login } from './Login';
import { Signup } from './Signup';

interface AuthProps {
  onSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [showLogin, setShowLogin] = useState(true);

  return showLogin ? (
    <Login
      onSuccess={onSuccess}
      onSwitchToSignup={() => setShowLogin(false)}
    />
  ) : (
    <Signup
      onSuccess={onSuccess}
      onSwitchToLogin={() => setShowLogin(true)}
    />
  );
};

export { Login } from './Login';
export { Signup } from './Signup';

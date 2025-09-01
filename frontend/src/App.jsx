import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';

function App() {
  const [page, setPage] = useState('register');
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication
    const token = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');

    if (token && savedUsername) {
      setUsername(savedUsername);
      setPage('chat');
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (username) => {
    setUsername(username);
    setPage('chat');
  };

  const handleLogout = () => {
    localStorage.clear();
    setUsername(null);
    setPage('register');
  };

  const handleRegister = () => {
    setPage('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading ChatApp...</p>
        </div>
      </div>
    );
  }

  if (!username) {
    return page === 'login' ? (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => setPage('register')}
      />
    ) : (
      <Register
        onRegister={handleRegister}
        onSwitchToLogin={() => setPage('login')}
      />
    );
  }

  return <Chat username={username} onLogout={handleLogout} />;
}

export default App;

import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';

function App() {
  const [page, setPage] = useState('register'); // always start at register
  const [username, setUsername] = useState(localStorage.getItem('username'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');

    if (token && savedUsername) {
      setUsername(savedUsername);
      setPage('chat');
    }
  }, []);

  const handleLogin = (username) => {
    setUsername(username);
    setPage('chat');
  };

  const handleLogout = () => {
    localStorage.clear();
    setUsername(null);
    setPage('register'); // go back to register after logout
  };

  if (!username) {
    return page === 'login' ? (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => setPage('register')}
      />
    ) : (
      <Register
        onRegister={() => setPage('login')}
        onSwitchToLogin={() => setPage('login')}
      />
    );
  }

  return <Chat username={username} onLogout={handleLogout} />;
}

export default App;

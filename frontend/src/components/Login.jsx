import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE;

function Login({ onLogin, onSwitchToRegister }) {
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        contact,
        password,
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      localStorage.setItem('contact', contact);
      onLogin(res.data.username);
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert('Login failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-3xl mb-6">Login</h1>
      <input
        className="mb-2 p-2 rounded bg-gray-700 w-64"
        placeholder="Contact Number"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />
      <input
        type="password"
        className="mb-4 p-2 rounded bg-gray-700 w-64"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        className="bg-green-500 px-4 py-2 rounded w-64"
        onClick={handleLogin}
      >
        Login
      </button>
      <p className="mt-4 text-sm">
        Haven’t registered?{' '}
        <span
          className="text-blue-400 underline cursor-pointer"
          onClick={onSwitchToRegister}
        >
          Register
        </span>
      </p>
    </div>
  );
}

export default Login;

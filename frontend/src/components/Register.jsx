import React, { useState } from 'react';
import axios from 'axios';

function Register({ onRegister, onSwitchToLogin }) {
  const [username, setUserName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      await axios.post('http://localhost:5000/auth/register', {
        username,
        contact,
        password,
      });
      alert('Registered successfully! Please login.');
      onRegister(); 
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert('Registration failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-3xl mb-6">Register</h1>
      <input
        className="mb-2 p-2 rounded bg-gray-700 w-100"
        placeholder="Your Name"
        value={username}
        onChange={(e) => setUserName(e.target.value)}
      />
      <input
        className="mb-2 p-2 rounded bg-gray-700 w-100"
        placeholder="Contact Number"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />
      <input
        type="password"
        className="mb-4 p-2 rounded bg-gray-700 w-100"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        className="bg-blue-500 px-4 py-2 rounded w-60"
        onClick={handleRegister}
      >
        Join Chat
      </button>
      <p className="mt-4 text-sm">
        Already registered?{' '}
        <span
          className="text-green-400 underline cursor-pointer"
          onClick={onSwitchToLogin}
        >
          Login
        </span>
      </p>
    </div>
  );
}

export default Register;

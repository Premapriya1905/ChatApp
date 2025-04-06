import io from "socket.io-client";
import React, { useState, useEffect, useRef } from "react";
import { BsFillMicFill, BsFillSendFill } from "react-icons/bs";
import { FaSmile } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import axios from "axios";

const socket = io("http://localhost:5000");

function Chat({ username, onLogout }) {
  const [message, setMessage] = useState("");
  const [groupMessages, setGroupMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState({});
  const [users, setUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const [activeChat, setActiveChat] = useState("group");

  useEffect(() => {
    socket.emit("joinChat", username);

    socket.on("receiveMessage", (msg) => {
      setGroupMessages((prev) => [...prev, msg]);
    });

    socket.on("receivePrivateMessage", (msg) => {
      setPrivateMessages((prev) => ({
        ...prev,
        [msg.sender]: [...(prev[msg.sender] || []), msg],
      }));
    });

    socket.on("chatHistory", (history) => {
      setGroupMessages(history);
    });

    socket.on("userList", (onlineUsers) => {
      setUsers(onlineUsers.filter((u) => u !== username));
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("receivePrivateMessage");
      socket.off("chatHistory");
      socket.off("userList");
    };
  }, [username]);

  useEffect(() => {
    if (activeChat !== "group") {
      fetchPrivateMessages(activeChat);
    }
  }, [activeChat]);

  const fetchPrivateMessages = async (receiver) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/messages/private?user1=${username}&user2=${receiver}`
      );
      setPrivateMessages((prev) => ({
        ...prev,
        [receiver]: res.data,
      }));
    } catch (err) {
      console.error("Failed to fetch private messages:", err);
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    if (activeChat === "group") {
      socket.emit("sendMessage", { username, text: message });
    } else {
      socket.emit("sendPrivateMessage", {
        sender: username,
        receiver: activeChat,
        message,
      });
      setPrivateMessages((prev) => ({
        ...prev,
        [activeChat]: [...(prev[activeChat] || []), { sender: username, message }],
      }));
    }

    setMessage("");
  };

  const handleEmojiClick = (emoji) => {
    setMessage((prev) => prev + emoji.emoji);
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    const chunks = [];
    mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioURL(url);
      socket.emit("sendMessage", { username, audio: url });
    };
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const currentMessages =
    activeChat === "group" ? groupMessages : privateMessages[activeChat] || [];

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-1/4 p-4 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Profile */}
        <div className="mb-6 flex items-center gap-3 p-3 rounded bg-gray-700">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold">
            {username[0].toUpperCase()}
          </div>
          <div>
            <div className="font-semibold">{username}</div>
            <div className="text-sm text-gray-400">Online</div>
          </div>
        </div>

        {/* Group Chat */}
        <div className="mb-4">
          <div className="text-xs uppercase text-gray-400 mb-1">Group Chat</div>
          <div
            className={`p-3 rounded hover:bg-gray-700 cursor-pointer ${
              activeChat === "group" ? "bg-gray-600" : ""
            }`}
            onClick={() => setActiveChat("group")}
          >
            <div className="font-semibold">Curatales</div>
          </div>
        </div>

        {/* Private Chats */}
        <div className="flex-1 overflow-auto">
          <div className="text-xs uppercase text-gray-400 mb-1">Private Chats</div>
          {users.map((user) => (
            <div
              key={user}
              className={`p-3 rounded hover:bg-gray-700 cursor-pointer ${
                activeChat === user ? "bg-gray-600" : ""
              }`}
              onClick={() => setActiveChat(user)}
            >
              {user}
            </div>
          ))}
        </div>

        <button
          className="mt-4 bg-red-500 text-white px-3 py-1 rounded"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>

      {/* Chat Window */}
      <div className="flex flex-col w-3/4 p-4">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-gray-700 pb-2 mb-4">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center font-bold">
            {activeChat === "group" ? "C" : activeChat[0]?.toUpperCase()}
          </div>
          <h1 className="text-xl font-bold">
            {activeChat === "group" ? "Curatales" : activeChat}
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto bg-gray-800 p-4 rounded-lg">
          {currentMessages.map((msg, index) => (
            <div key={index} className="mb-2">
              <strong>{msg.sender || msg.username}:</strong> {msg.message || msg.text}
              {msg.audio && (
                <audio controls className="ml-2">
                  <source src={msg.audio} type="audio/webm" />
                </audio>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="mt-4 flex gap-2 items-center relative">
          <button className="p-2" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            <FaSmile size={24} />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-16 bg-gray-800 rounded p-2 z-10">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
          <input
            type="text"
            className="flex-1 p-2 rounded bg-gray-700 border border-gray-600"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <button className="bg-blue-500 p-3 rounded" onClick={sendMessage}>
            <BsFillSendFill size={20} />
          </button>
          {recording ? (
            <button className="bg-red-500 p-3 rounded" onClick={stopRecording}>
              ⏹
            </button>
          ) : (
            <button className="bg-green-500 p-3 rounded" onClick={startRecording}>
              <BsFillMicFill size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;

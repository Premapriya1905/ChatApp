import io from "socket.io-client";
import React, { useState, useEffect, useRef } from "react";
import { BsFillSendFill } from "react-icons/bs";
import { FaSmile } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import axios from "axios";
import { Pencil, Trash, SendHorizonal, X } from "lucide-react";

const socket = io("https://chatapp-w3k9.onrender.com");

function Chat({ username, onLogout }) {
  const [message, setMessage] = useState("");
  const [groupMessages, setGroupMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState({});
  const [users, setUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingMessage, setEditingMessage] = useState("");
  const [activeChat, setActiveChat] = useState("group");
  const [unreadMessages, setUnreadMessages] = useState({});

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
    
      if (msg.sender !== activeChat) {
        setUnreadMessages((prev) => ({ ...prev, [msg.sender]: true }));
      }
    });

    // Group message updates
  socket.on("groupMessageEdited", (updatedMsg) => {
    setGroupMessages((prev) =>
      prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
    );
  });

  socket.on("groupMessageDeleted", (id) => {
    setGroupMessages((prev) => prev.filter((msg) => msg._id !== id));
  });

  // Private message updates
  socket.on("privateMessageEdited", (updatedMsg) => {
    const { receiver, sender } = updatedMsg;
    const chatPartner = sender === username ? receiver : sender;

    setPrivateMessages((prev) => ({
      ...prev,
      [chatPartner]: prev[chatPartner].map((msg) =>
        msg._id === updatedMsg._id ? updatedMsg : msg
      ),
    }));
  });

  socket.on("privateMessageDeleted", (id) => {
    setPrivateMessages((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[key] = updated[key].filter((msg) => msg._id !== id);
      });
      return updated;
    });
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
        `https://chatapp-w3k9.onrender.com/privateMessages?user1=${username}&user2=${receiver}`
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

    if (editingId) {
      handleUpdateMessage();
      return;
    }

    if (isGroupChat) {
      socket.emit("sendMessage", {
        sender: username,
        text: message,
      });
    } else {
      socket.emit("sendPrivateMessage", {
        sender: username,
        receiver: activeChat,
        message,
      });
    }

    // Optimistic local update
    if (!isGroupChat) {
      setPrivateMessages((prev) => ({
        ...prev,
        [activeChat]: [
          ...(prev[activeChat] || []),
          {
            sender: username,
            receiver: activeChat,
            message,
          },
        ],
      }));
    }

    setMessage("");
  };

  const handleUpdateMessage = async () => {
    try {
      const url =
        activeChat === "group"
          ? `https://chatapp-w3k9.onrender.com/messages/group/${editingId}`
          : `https://chatapp-w3k9.onrender.com/privateMessages/${editingId}`;
      const body =
        activeChat === "group" ? { text: message } : { message };

      const res = await axios.put(url, body);

      if (activeChat === "group") {
        setGroupMessages((prev) =>
          prev.map((msg) => (msg._id === editingId ? res.data : msg))
        );
      } else {
        setPrivateMessages((prev) => ({
          ...prev,
          [activeChat]: prev[activeChat].map((msg) =>
            msg._id === editingId ? res.data : msg
          ),
        }));
      }

      setEditingId(null);
      setMessage("");
    } catch (err) {
      console.error("Edit failed:", err);
    }
  };

  const deleteMessage = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this message?");
    if (!confirmDelete) return;

    const url =
      activeChat === "group"
        ? `https://chatapp-w3k9.onrender.com/messages/group/${id}`
        : `https://chatapp-w3k9.onrender.com/privateMessages/${id}`;

    try {
      await axios.delete(url);
      if (activeChat === "group") {
        setGroupMessages((prev) => prev.filter((msg) => msg._id !== id));
      } else {
        setPrivateMessages((prev) => ({
          ...prev,
          [activeChat]: prev[activeChat].filter((msg) => msg._id !== id),
        }));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleEmojiClick = (emoji) => {
    setMessage((prev) => prev + emoji.emoji);
  };

  const isGroupChat = activeChat === "group";
  const currentMessages = isGroupChat
    ? groupMessages
    : privateMessages[activeChat] || [];

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-1/4 p-4 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="mb-6 flex items-center gap-3 p-3 rounded bg-gray-700">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold">
            {username[0].toUpperCase()}
          </div>
          <div>
            <div className="font-semibold">{username}</div>
            <div className="text-sm text-gray-400">Online</div>
          </div>
        </div>

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

        <div className="flex-1 overflow-auto">
          <div className="text-xs uppercase text-gray-400 mb-1">Private Chats</div>
          {users.map((user) => (
            <div
              key={user}
              className={`p-3 rounded hover:bg-gray-700 cursor-pointer ${
                activeChat === user ? "bg-gray-600" : ""
              }`}
              onClick={() => {
                setActiveChat(user);
                setUnreadMessages((prev) => ({ ...prev, [user]: false }));
              }}
            >
              {user}
              {unreadMessages[user] && (
                <span className="ml-2 text-xs bg-red-500 px-2 py-0.5 rounded-full">
                  New
                </span>
              )}
            </div>
          ))}
        </div>

        <button
          className="mt-4 bg-red-500 text-white px-3 py-1 rounded"
          onClick={() => {
            const confirmLogout = window.confirm("Confirm Logout?");
            if (confirmLogout) onLogout();
          }}
        >
          Logout
        </button>
      </div>

      {/* Chat Window */}
      <div className="flex flex-col w-3/4 p-4">
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
            <div key={msg._id || `${msg.sender}-${index}`} className="mb-2 flex items-start justify-between">
              <div>
                <strong>{msg.sender || msg.username}:</strong>{" "}
                {editingId === msg._id ? (
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="p-1 text-black rounded"
                  />
                ) : (
                  <>
                    {msg.message || msg.text}
                    {msg.isEdited && (
                      <span className="text-xs text-gray-400 ml-2">(edited)</span>
                    )}
                  </>
                )}
              </div>
              {msg.sender === username && (
                <div className="flex gap-2 ml-2">
                  {editingId === msg._id ? (
                    <X
                      size={18}
                      className="cursor-pointer text-red-400"
                      onClick={() => {
                        setEditingId(null);
                        setMessage("");
                      }}
                    />
                  ) : (
                    <Pencil
                      size={18}
                      className="cursor-pointer text-yellow-400"
                      onClick={() => {
                        setEditingId(msg._id);
                        setMessage(msg.message || msg.text);
                      }}
                    />
                  )}
                  <Trash
                    size={18}
                    className="cursor-pointer text-red-400"
                    onClick={() => deleteMessage(msg._id)}
                  />
                </div>
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
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="Type a message..."
          />
          <button className="bg-blue-500 p-3 rounded" onClick={sendMessage}>
            {editingId ? <SendHorizonal /> : <BsFillSendFill size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;

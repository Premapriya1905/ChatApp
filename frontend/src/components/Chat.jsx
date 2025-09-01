import io from "socket.io-client";
import React, { useState, useEffect, useRef } from "react";
import { BsFillSendFill } from "react-icons/bs";
import { FaSmile, FaUsers, FaUser } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import axios from "axios";
import { Pencil, Trash, SendHorizonal, X, LogOut, Search } from "lucide-react";

const API_BASE = 'https://chatapp-w3k9.onrender.com';
const socket = io(API_BASE);

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
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [groupMessages, privateMessages]);

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
      socket.off("groupMessageEdited");
      socket.off("groupMessageDeleted");
      socket.off("privateMessageEdited");
      socket.off("privateMessageDeleted");
    };
  }, [username]);

  useEffect(() => {
    if (activeChat !== "group") {
      fetchPrivateMessages(activeChat);
    }
  }, [activeChat]);

  const fetchPrivateMessages = async (receiver) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/privateMessages?user1=${username}&user2=${receiver}`
      );
      setPrivateMessages((prev) => ({
        ...prev,
        [receiver]: res.data.messages || [],
      }));
    } catch (err) {
      console.error("Failed to fetch private messages:", err);
    } finally {
      setLoading(false);
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
      
      // Optimistic local update for group messages only
      setGroupMessages((prev) => [
        ...prev,
        {
          _id: Date.now().toString(), // temporary ID
          sender: username,
          message: message,
          timestamp: new Date(),
        },
      ]);
    } else {
      socket.emit("sendPrivateMessage", {
        sender: username,
        receiver: activeChat,
        message,
      });
    }

    setMessage("");
  };

  const handleUpdateMessage = async () => {
    try {
      // Check if the message ID is a temporary one (from optimistic updates)
      if (editingId && editingId.toString().length < 20) {
        // This is a temporary ID, remove the optimistic update
        if (activeChat === "group") {
          setGroupMessages((prev) => prev.filter((msg) => msg._id !== editingId));
        }
        setEditingId(null);
        setMessage("");
        return;
      }

      const url =
        activeChat === "group"
          ? `${API_BASE}/messages/group/${editingId}`
          : `${API_BASE}/privateMessages/${editingId}`;
      const body =
        activeChat === "group" ? { text: message } : { message };

      const res = await axios.put(url, body);

      // Emit socket events for real-time updates
      if (activeChat === "group") {
        socket.emit("editGroupMessage", { messageId: editingId, newText: message });
      } else {
        socket.emit("editPrivateMessage", { messageId: editingId, newText: message });
      }

      setEditingId(null);
      setMessage("");
    } catch (err) {
      console.error("Edit failed:", err);
      if (err.response?.status === 400) {
        alert("Invalid message ID. Please try again.");
      } else {
        alert("Failed to edit message. Please try again.");
      }
    }
  };

  const deleteMessage = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this message?");
    if (!confirmDelete) return;

    // Check if the message ID is a temporary one (from optimistic updates)
    if (id && id.toString().length < 20) {
      // This is a temporary ID, just remove it locally
      if (activeChat === "group") {
        setGroupMessages((prev) => prev.filter((msg) => msg._id !== id));
      } else {
        setPrivateMessages((prev) => ({
          ...prev,
          [activeChat]: prev[activeChat].filter((msg) => msg._id !== id),
        }));
      }
      return;
    }

    const url =
      activeChat === "group"
        ? `${API_BASE}/messages/group/${id}`
        : `${API_BASE}/privateMessages/${id}`;

    try {
      await axios.delete(url);
      
      // Emit socket events for real-time updates
      if (activeChat === "group") {
        socket.emit("deleteGroupMessage", id);
      } else {
        socket.emit("deletePrivateMessage", id);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      if (err.response?.status === 400) {
        alert("Invalid message ID. Please try again.");
      } else {
        alert("Failed to delete message. Please try again.");
      }
    }
  };

  const handleEmojiClick = (emoji) => {
    setMessage((prev) => prev + emoji.emoji);
  };

  const isGroupChat = activeChat === "group";
  const currentMessages = isGroupChat
    ? groupMessages
    : privateMessages[activeChat] || [];

  const filteredUsers = users.filter(user => 
    user.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Sidebar */}
      <div className="w-80 bg-white/10 backdrop-blur-lg border-r border-white/20 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-lg">
              {username[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-lg">{username}</div>
              <div className="text-sm text-green-400 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Online
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Group Chat */}
        <div className="p-4 border-b border-white/20">
          <div className="text-xs uppercase text-gray-400 mb-2 flex items-center gap-2">
            <FaUsers size={12} />
            Group Chat
          </div>
          <div
            className={`p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-all ${
              activeChat === "group" ? "bg-blue-500/20 border border-blue-500/50" : ""
            }`}
            onClick={() => setActiveChat("group")}
          >
            <div className="font-semibold flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
                C
              </div>
              Curatales
            </div>
          </div>
        </div>

        {/* Private Chats */}
        <div className="flex-1 overflow-auto p-4">
          <div className="text-xs uppercase text-gray-400 mb-2 flex items-center gap-2">
            <FaUser size={12} />
            Private Chats
          </div>
          {filteredUsers.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">
              {searchQuery ? 'No users found' : 'No users online'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user}
                className={`p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-all mb-2 ${
                  activeChat === user ? "bg-purple-500/20 border border-purple-500/50" : ""
                }`}
                onClick={() => {
                  setActiveChat(user);
                  setUnreadMessages((prev) => ({ ...prev, [user]: false }));
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm font-bold">
                      {user[0].toUpperCase()}
                    </div>
                    <span className="font-medium">{user}</span>
                  </div>
                  {unreadMessages[user] && (
                    <span className="text-xs bg-red-500 px-2 py-1 rounded-full">
                      New
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-white/20">
          <button
            className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            onClick={() => {
              const confirmLogout = window.confirm("Are you sure you want to logout?");
              if (confirmLogout) onLogout();
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex flex-col flex-1">
        {/* Chat Header */}
        <div className="p-4 border-b border-white/20 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center font-bold text-lg">
              {activeChat === "group" ? "C" : activeChat[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {activeChat === "group" ? "Curatales" : activeChat}
              </h1>
              <p className="text-sm text-gray-300">
                {isGroupChat ? "Group Chat" : "Private Chat"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {loading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {currentMessages.length === 0 && !loading && (
            <div className="text-center text-gray-400 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}

          {currentMessages.map((msg, index) => (
            <div key={msg._id || `${msg.sender}-${index}`} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                {(msg.sender || msg.username)?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">
                    {msg.sender || msg.username}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                  {msg.isEdited && (
                    <span className="text-xs text-gray-400">(edited)</span>
                  )}
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  {editingId === msg._id ? (
                    <input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full p-2 text-black rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm">{msg.message || msg.text}</p>
                  )}
                </div>
              </div>
              {(msg.sender === username || msg.username === username) && (
                <div className="flex gap-1">
                  {editingId === msg._id ? (
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setMessage("");
                      }}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(msg._id);
                        setMessage(msg.message || msg.text);
                      }}
                      className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMessage(msg._id)}
                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/20 bg-white/5">
          <div className="flex gap-3 items-end">
            <button 
              className="p-2 text-gray-400 hover:text-white transition-colors"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <FaSmile size={20} />
            </button>
            
            <div className="flex-1 relative">
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 z-10">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
              <input
                type="text"
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`Type a message to ${isGroupChat ? 'the group' : activeChat}...`}
              />
            </div>
            
            <button 
              className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all transform hover:scale-105"
              onClick={sendMessage}
            >
              {editingId ? <SendHorizonal size={20} /> : <BsFillSendFill size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;

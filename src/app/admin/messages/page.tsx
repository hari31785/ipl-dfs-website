'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
  adminNotes: string | null;
  createdAt: string;
  user?: {
    username: string;
    email: string;
  } | null;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [filterStatus]);

  const fetchMessages = async () => {
    try {
      const url = filterStatus 
        ? `/api/messages?status=${filterStatus}`
        : '/api/messages';
      const response = await fetch(url);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMessageStatus = async (messageId: string, status: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        await fetchMessages();
        if (selectedMessage?.id === messageId) {
          setSelectedMessage({ ...selectedMessage, status: status as any });
        }
      }
    } catch (error) {
      console.error('Error updating message:', error);
      alert('Failed to update message status');
    } finally {
      setUpdating(false);
    }
  };

  const saveAdminNotes = async () => {
    if (!selectedMessage) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/messages/${selectedMessage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes })
      });

      if (response.ok) {
        await fetchMessages();
        setSelectedMessage({ ...selectedMessage, adminNotes });
        alert('Notes saved successfully!');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    } finally {
      setUpdating(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchMessages();
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(null);
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const openMessageDetails = (message: Message) => {
    setSelectedMessage(message);
    setAdminNotes(message.adminNotes || '');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REVIEWED': return 'bg-blue-100 text-blue-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: messages.length,
    pending: messages.filter(m => m.status === 'PENDING').length,
    reviewed: messages.filter(m => m.status === 'REVIEWED').length,
    resolved: messages.filter(m => m.status === 'RESOLVED').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/dashboard"
                className="flex items-center gap-2 text-white hover:text-orange-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </Link>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">User Messages</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-900 font-medium">View and manage support messages from users</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFilterStatus('')}
            className="bg-white hover:bg-gray-50 p-4 rounded-lg shadow transition-colors text-left border-2 border-transparent hover:border-gray-200"
          >
            <div className="text-sm text-gray-600">Total Messages</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className="bg-yellow-600 hover:bg-yellow-700 p-4 rounded-lg shadow transition-colors text-left"
          >
            <div className="text-sm text-yellow-100">Pending</div>
            <div className="text-2xl font-bold text-white">{stats.pending}</div>
          </button>
          <button
            onClick={() => setFilterStatus('REVIEWED')}
            className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg shadow transition-colors text-left"
          >
            <div className="text-sm text-blue-100">Reviewed</div>
            <div className="text-2xl font-bold text-white">{stats.reviewed}</div>
          </button>
          <button
            onClick={() => setFilterStatus('RESOLVED')}
            className="bg-green-600 hover:bg-green-700 p-4 rounded-lg shadow transition-colors text-left"
          >
            <div className="text-sm text-green-100">Resolved</div>
            <div className="text-2xl font-bold text-white">{stats.resolved}</div>
          </button>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          >
            <option value="">All Messages</option>
            <option value="PENDING">Pending</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Messages</h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No messages found</div>
              ) : (
                <div className="divide-y">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => openMessageDetails(message)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                        selectedMessage?.id === message.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{message.name}</div>
                          <div className="text-sm text-gray-600">{message.email}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadgeColor(message.status)}`}>
                          {message.status}
                        </span>
                      </div>
                      <div className="font-medium text-gray-800 mb-1">{message.subject}</div>
                      <div className="text-sm text-gray-600 line-clamp-2">{message.message}</div>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(message.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Message Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Message Details</h2>
            </div>
            <div className="p-4">
              {!selectedMessage ? (
                <div className="text-center text-gray-500 py-12">
                  Select a message to view details
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                    <div className="text-gray-900">{selectedMessage.name}</div>
                    <div className="text-sm text-gray-600">{selectedMessage.email}</div>
                    {selectedMessage.user && (
                      <div className="text-sm text-gray-600">Username: {selectedMessage.user.username}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <div className="text-gray-900">{selectedMessage.subject}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <div className="bg-gray-50 p-3 rounded border text-gray-900 whitespace-pre-wrap">
                      {selectedMessage.message}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Received</label>
                    <div className="text-gray-900">
                      {new Date(selectedMessage.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="flex gap-2">
                      {['PENDING', 'REVIEWED', 'RESOLVED'].map((status) => (
                        <button
                          key={status}
                          onClick={() => updateMessageStatus(selectedMessage.id, status)}
                          disabled={updating || selectedMessage.status === status}
                          className={`px-4 py-2 rounded font-semibold transition ${
                            selectedMessage.status === status
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          } disabled:opacity-50`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Notes
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                      placeholder="Add notes about this message..."
                    />
                    <button
                      onClick={saveAdminNotes}
                      disabled={updating}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save Notes
                    </button>
                  </div>

                  <div className="pt-4 border-t">
                    <button
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete Message
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

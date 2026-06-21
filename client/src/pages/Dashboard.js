import React, { useState, useEffect } from 'react';
import { Home, People, AttachMoney, CheckCircle, Pending, Message, Send, Close } from '@mui/icons-material';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI, userAPI, adminAPI } from '../utils/api';
import axios from '../utils/api';
import { io as ioClient } from 'socket.io-client';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const Dashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingMessages, setBookingMessages] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(null);
  const [socket, setSocket] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [messagesRead, setMessagesRead] = useState(() => {
    return localStorage.getItem('messagesRead') === 'true';
  });
  const [lastReadTime, setLastReadTime] = useState(() => {
    return localStorage.getItem('lastReadTime') || new Date().toISOString();
  });
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    monthlyData: []
  });
  const [adminStats, setAdminStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
    totalOwners: 0,
    totalProperties: 0,
    totalBookings: 0,
    activeBookings: 0,
    pendingApprovals: 0,
    growth: {}
  });
  const [recentActivities, setRecentActivities] = useState({
    recentUsers: [],
    recentProperties: [],
    recentBookings: []
  });
  const [ownerPerformance, setOwnerPerformance] = useState([]);
  const [recentUsersPage, setRecentUsersPage] = useState(1);
  const [recentPropertiesPage, setRecentPropertiesPage] = useState(1);
  const [recentBookingsPage, setRecentBookingsPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const BASE_API_URL = process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        fetchAdminData();
      } else {
        fetchBookings();
      }
      fetchMessages();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const SERVER = BASE_API_URL;
    const s = ioClient(SERVER, { transports: ['websocket'] });
    setSocket(s);

    s.on('connect', () => {
      // console.log('Socket connected, joining room user_' + user._id);
      s.emit('user:join', user._id);
    });

    const handleNew = (msg) => {
      // console.log('[CLIENT-RECV]', { messageId: msg?._id, sender: msg?.sender?.name, senderRole: msg?.sender?.role, content: msg?.content?.substring(0, 30), bookingId: msg?.bookingId, recipientId: msg?.recipient?._id });
      if (!msg) return;
      setMessages(prev => {
        const exists = prev.some(m => m._id === msg._id);
        if (exists) return prev;
        return [...prev, msg];
      });

      // If the incoming message is for this user or for a booking they're part of, update unread
      const recipientId = msg?.recipient?._id || msg?.recipient || null;
      const isSenderMe = msg?.sender?._id?.toString() === user._id?.toString();
      const isForMe = !isSenderMe && (recipientId === user._id || recipientId?.toString() === user._id?.toString() || msg?.bookingId);
      if (isForMe && !showChat) {
        setUnreadCount(c => c + 1);
      }
    };

    s.on('message:new', handleNew);

    s.on('messages:read', ({ userId }) => {
      if (userId?.toString() === user._id?.toString()) {
        setUnreadCount(0);
        setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
      }
    });

    s.on('typing', ({ fromUserId, typing }) => {
      if (fromUserId && fromUserId?.toString() !== user._id?.toString()) {
        setOtherUserTyping(typing ? { userId: fromUserId, userName: 'Someone' } : null);
      }
    });

    return () => {
      s.off('message:new', handleNew);
      s.disconnect();
      setSocket(null);
    };
  }, [user]);

  // Auto-refresh bookings every 3 seconds for real-time database sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && user.role !== 'admin') {
        fetchBookings();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get('/api/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newMessages = response.data || [];
      
      const unreadMessages = newMessages.filter(msg =>
        (msg?.sender?._id !== user?._id) &&
        new Date(msg?.createdAt || Date.now()) > new Date(lastReadTime)
      );
      
      // Only update unread count if messages haven't been read yet
      if (!messagesRead) {
        setUnreadCount(unreadMessages.length);
        
        if (unreadMessages.length > 0 && !showChat && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(`${unreadMessages.length} new message(s)`, {
              body: unreadMessages[unreadMessages.length - 1]?.content || 'New message received',
              icon: '/favicon.ico'
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        }
      }
      
      setMessages(newMessages);
      setLastMessageCount(newMessages.length);
      
      // Reset messagesRead if there are new messages after last read time
      if (unreadMessages.length > 0) {
        setMessagesRead(false);
        localStorage.setItem('messagesRead', 'false');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        fetchMessages();
        checkTypingStatus();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [user, showChat]);

  const checkTypingStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/messages/typing-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const typingUsers = response.data.filter(t => t.userId !== user._id && t.typing);
      setOtherUserTyping(typingUsers.length > 0 ? typingUsers[0] : null);
    } catch (error) {
      console.error('Error checking typing status:', error);
    }
  };

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/messages/mark-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendTypingStatus = async (typing) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/messages/typing', {
        typing,
        userId: user._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Also notify via socket for lower latency
      try {
        const lastMsg = messages[messages.length - 1];
        let toUserId = lastMsg?.sender?._id && lastMsg.sender._id !== user._id ? lastMsg.sender._id : lastMsg?.recipient?._id;
        if (socket && toUserId) {
          socket.emit('typing', { toUserId, fromUserId: user._id, typing });
        }
      } catch (e) {
        // ignore socket errors
      }
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }
    
    clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 1000));
  };

  const sendMessage = async (bookingId = null) => {
    if (!newMessage.trim() && !selectedFile) return;
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      if (editingMessage) {
        await axios.put(`/api/messages/${editingMessage}`, {
          content: newMessage
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEditingMessage(null);
      } else {
        if (newMessage.trim()) formData.append('content', newMessage);
        if (replyTo) formData.append('replyTo', replyTo);
        
        // Determine bookingId: explicit param > selectedBooking > inherited from repliedTo message
        let bid = bookingId || selectedBooking;
        if (replyTo && !bid) {
          const repliedMsg = messages.find(m => m._id === replyTo);
          if (repliedMsg?.bookingId) {
            bid = repliedMsg.bookingId;
          }
        }
        
        if (bid) formData.append('bookingId', bid);
        if (selectedFile) formData.append('file', selectedFile);
        
        // console.log('[CLIENT-SEND]', { bookingId: bid, replyTo, selectedBooking, contentLength: newMessage.length, hasFile: !!selectedFile });
        
        await axios.post('/api/messages', formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      setNewMessage('');
      setReplyTo(null);
      setSelectedFile(null);
      setIsTyping(false);
      sendTypingStatus(false);
      
      if (bookingId || selectedBooking) {
        fetchBookingMessages(bookingId || selectedBooking);
      } else {
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const fetchBookingMessages = async (bookingId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get(`/api/messages/booking/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookingMessages(prev => ({ ...prev, [bookingId]: response.data || [] }));
    } catch (error) {
      console.error('Error fetching booking messages:', error);
      setBookingMessages(prev => ({ ...prev, [bookingId]: [] }));
    }
  };

  const fetchAdminData = async () => {
    try {
      const [statsRes, activitiesRes, performanceRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getRecentActivities(),
        adminAPI.getOwnerPerformance()
      ]);
      setAdminStats(statsRes.data);
      setRecentActivities(activitiesRes.data);
      setOwnerPerformance(performanceRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
  };

  const fetchBookings = async () => {
    if (!user) return;
    try {
      const response = user.role === 'owner' 
        ? await bookingAPI.getOwnerBookings()
        : await bookingAPI.getMyBookings();
      
      // Database already contains refund data - no need to merge
      setBookings(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const calculateStats = (bookingsData) => {
    const totalRevenue = bookingsData.reduce(
      (sum, booking) => (booking.status === 'confirmed' ? sum + (booking.paidAmount || 0) : sum), 0
    );
    const monthlyData = getMonthlyData(bookingsData);
    setStats({
      totalBookings: bookingsData.length,
      totalRevenue,
      confirmedBookings: bookingsData.filter(b => b.status === 'confirmed').length,
      pendingBookings: bookingsData.filter(b => b.status === 'pending').length,
      cancelledBookings: bookingsData.filter(b => b.status === 'cancelled').length,
      monthlyData
    });
  };

  const getMonthlyData = (bookingsData) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (bookingsData.length > 0) {
      const monthlyStats = {};
      bookingsData.forEach(booking => {
        const month = new Date(booking.createdAt || Date.now()).getMonth();
        const monthName = months[month];
        monthlyStats[monthName] = (monthlyStats[monthName] || 0) + 1;
      });
      return months.map(month => ({
        month,
        bookings: monthlyStats[month] || 0,
        revenue: (monthlyStats[month] || 0) * 1200 + Math.floor(Math.random() * 500)
      }));
    }
    return months.map(month => ({
      month,
      bookings: Math.floor(Math.random() * 8) + 2,
      revenue: Math.floor(Math.random() * 3000) + 1500
    }));
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await bookingAPI.updateStatus(bookingId, status);
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const initiateRefund = async (bookingId, refundAmount) => {
    const refundDetails = `🏦 REFUND PROCESS\n\n💰 Amount: ₹${refundAmount.toLocaleString()}\n📅 Timeline: 1 business day\n🔄 Method: Bank transfer\n\n⚠️ Ensure you:\n✅ Transfer to user account\n✅ Keep receipt\n✅ Update system after transfer\n\nProceed?`;
    
    if (!window.confirm(refundDetails)) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.put(`/api/bookings/${bookingId}/refund/initiate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        const updatedBooking = response.data;
        
        // Update bookings state
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking._id === bookingId ? updatedBooking : booking
          )
        );
        
        alert(`🎉 Refund Initiated!\n\n💰 Amount: ₹${refundAmount.toLocaleString()}\n📅 Expected: ${new Date(updatedBooking.expectedRefundDate).toLocaleDateString()}\n\n📧 User notified via database\n⏭️ Complete transfer & mark done`);
        
        // Refresh bookings from database
        fetchBookings();
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      if (error.response?.status === 400) {
        alert(`❌ ${error.response.data.message}`);
      } else {
        alert(`❌ Database Error\n\nBackend not ready for refund fields\nPlease:\n• Add refund fields to Booking model\n• Update API routes\n• Restart server`);
      }
    }
  };

  const completeRefund = async (bookingId) => {
    if (!window.confirm('Confirm bank transfer completed?')) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.put(`/api/bookings/${bookingId}/refund/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        const updatedBooking = response.data;
        
        // Update bookings state
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking._id === bookingId ? updatedBooking : booking
          )
        );
        
        alert('✅ Refund completed!\n📧 User notified via database\n💾 All users will see update');
        
        // Refresh bookings from database
        fetchBookings();
      }
    } catch (error) {
      console.error('Error completing refund:', error);
      if (error.response?.status === 400) {
        alert(`❌ ${error.response.data.message}`);
      } else {
        alert('❌ Database Error\n\nBackend not ready\nCheck server & model setup');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500 text-white';
      case 'pending': return 'bg-yellow-400 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      case 'completed': return 'bg-blue-400 text-white';
      default: return 'bg-gray-300 text-gray-700';
    }
  };

  const downloadUserDashboardPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    
    // Header
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MY BOOKING DASHBOARD', pageWidth/2, 18, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth/2, 28, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    
    // User Info
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(15, 50, pageWidth-30, 25, 'S');
    pdf.setFontSize(10);
    pdf.text(`Customer: ${user?.name || 'N/A'}`, 20, 60);
    pdf.text(`Email: ${user?.email || 'N/A'}`, 20, 68);
    pdf.text(`Total Bookings: ${bookings.length}`, pageWidth-80, 60);
    
    let yPos = 85;
    
    // Statistics Section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BOOKING STATISTICS', 20, yPos);
    pdf.line(20, yPos + 2, pageWidth - 20, yPos + 2);
    
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Bookings: ${stats.totalBookings}`, 20, yPos);
    pdf.text(`Confirmed Bookings: ${stats.confirmedBookings}`, 100, yPos);
    yPos += 8;
    pdf.text(`Pending Bookings: ${stats.pendingBookings}`, 20, yPos);
    pdf.text(`Total Spent: Rs. ${bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0).toLocaleString()}`, 100, yPos);
    
    yPos += 20;
    
    // My Bookings
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MY BOOKINGS', 20, yPos);
    pdf.line(20, yPos + 2, pageWidth - 20, yPos + 2);
    
    yPos += 15;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Property', 20, yPos);
    pdf.text('Owner', 70, yPos);
    pdf.text('Dates', 110, yPos);
    pdf.text('Paid', 150, yPos);
    pdf.text('Status', 180, yPos);
    
    yPos += 5;
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    bookings.slice(0, 15).forEach(booking => {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      
      const propertyName = (booking.property?.title || 'N/A').substring(0, 15);
      const ownerName = (booking.owner?.name || 'N/A').substring(0, 12);
      const dates = `${new Date(booking.startDate).toLocaleDateString().substring(0, 8)} - ${new Date(booking.endDate).toLocaleDateString().substring(0, 8)}`;
      const amount = `Rs. ${(booking.paidAmount || 0).toLocaleString()}`;
      const status = booking.status.toUpperCase();
      
      pdf.text(propertyName, 20, yPos);
      pdf.text(ownerName, 70, yPos);
      pdf.text(dates, 110, yPos);
      pdf.text(amount, 150, yPos);
      pdf.text(status, 180, yPos);
      yPos += 8;
    });
    
    if (bookings.length > 15) {
      yPos += 5;
      pdf.setFont('helvetica', 'italic');
      pdf.text(`... and ${bookings.length - 15} more bookings`, 20, yPos);
    }
    
    yPos += 20;
    
    // Footer
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.text('Thank you for using our service!', pageWidth/2, yPos, { align: 'center' });
    yPos += 8;
    pdf.text('For support, contact us at support@realestate.com', pageWidth/2, yPos, { align: 'center' });
    
    pdf.save(`my-bookings-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadOwnerDashboardPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    
    // Header
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OWNER DASHBOARD REPORT', pageWidth/2, 18, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth/2, 28, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    
    // Owner Info
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(15, 50, pageWidth-30, 25, 'S');
    pdf.setFontSize(10);
    pdf.text(`Owner: ${user?.name || 'N/A'}`, 20, 60);
    pdf.text(`Email: ${user?.email || 'N/A'}`, 20, 68);
    pdf.text(`Total Properties: ${bookings.length}`, pageWidth-80, 60);
    
    let yPos = 85;
    
    // Statistics Section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BUSINESS STATISTICS', 20, yPos);
    pdf.line(20, yPos + 2, pageWidth - 20, yPos + 2);
    
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Bookings: ${stats.totalBookings}`, 20, yPos);
    pdf.text(`Confirmed Bookings: ${stats.confirmedBookings}`, 100, yPos);
    yPos += 8;
    pdf.text(`Pending Bookings: ${stats.pendingBookings}`, 20, yPos);
    pdf.text(`Total Revenue: Rs. ${stats.totalRevenue.toLocaleString()}`, 100, yPos);
    
    yPos += 20;
    
    // Bookings Summary
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BOOKINGS SUMMARY', 20, yPos);
    pdf.line(20, yPos + 2, pageWidth - 20, yPos + 2);
    
    yPos += 15;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Property', 20, yPos);
    pdf.text('Tenant', 70, yPos);
    pdf.text('Dates', 110, yPos);
    pdf.text('Amount', 150, yPos);
    pdf.text('Status', 180, yPos);
    
    yPos += 5;
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    bookings.slice(0, 15).forEach(booking => {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      
      const propertyName = (booking.property?.title || 'N/A').substring(0, 15);
      const tenantName = (booking.tenant?.name || 'N/A').substring(0, 12);
      const dates = `${new Date(booking.startDate).toLocaleDateString().substring(0, 8)} - ${new Date(booking.endDate).toLocaleDateString().substring(0, 8)}`;
      const amount = `Rs. ${(booking.paidAmount || 0).toLocaleString()}`;
      const status = booking.status.toUpperCase();
      
      pdf.text(propertyName, 20, yPos);
      pdf.text(tenantName, 70, yPos);
      pdf.text(dates, 110, yPos);
      pdf.text(amount, 150, yPos);
      pdf.text(status, 180, yPos);
      yPos += 8;
    });
    
    if (bookings.length > 15) {
      yPos += 5;
      pdf.setFont('helvetica', 'italic');
      pdf.text(`... and ${bookings.length - 15} more bookings`, 20, yPos);
    }
    
    yPos += 20;
    
    // Footer
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.text('This report contains confidential business information.', pageWidth/2, yPos, { align: 'center' });
    yPos += 8;
    pdf.text('For support, contact us at support@realestate.com', pageWidth/2, yPos, { align: 'center' });
    
    pdf.save(`owner-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadAdminDashboardPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    
    // Header
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ADMIN DASHBOARD REPORT', pageWidth/2, 18, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth/2, 28, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    
    // Admin Info
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(15, 50, pageWidth-30, 25, 'S');
    pdf.setFontSize(10);
    pdf.text(`Admin: ${user?.name || 'N/A'}`, 20, 60);
    pdf.text(`Email: ${user?.email || 'N/A'}`, 20, 68);
    pdf.text(`Report Date: ${new Date().toLocaleDateString()}`, pageWidth-80, 60);
    
    let yPos = 85;
    
    // Platform Statistics
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PLATFORM STATISTICS', 20, yPos);
    pdf.line(20, yPos + 2, pageWidth - 20, yPos + 2);
    
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Revenue: Rs. ${adminStats.totalRevenue?.toLocaleString() || 0}`, 20, yPos);
    pdf.text(`Monthly Revenue: Rs. ${adminStats.monthlyRevenue?.toLocaleString() || 0}`, 100, yPos);
    yPos += 8;
    pdf.text(`Total Users: ${adminStats.totalUsers || 0}`, 20, yPos);
    pdf.text(`Property Owners: ${adminStats.totalOwners || 0}`, 100, yPos);
    yPos += 8;
    pdf.text(`Total Properties: ${adminStats.totalProperties || 0}`, 20, yPos);
    pdf.text(`Active Bookings: ${adminStats.activeBookings || 0}`, 100, yPos);
    
    yPos += 20;
    
    // Top Performing Owners
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOP PERFORMING OWNERS', 20, yPos);
    pdf.line(20, yPos + 2, pageWidth - 20, yPos + 2);
    
    yPos += 15;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Owner Name', 20, yPos);
    pdf.text('Properties', 70, yPos);
    pdf.text('Bookings', 110, yPos);
    pdf.text('Revenue', 150, yPos);
    pdf.text('Status', 180, yPos);
    
    yPos += 5;
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    ownerPerformance.slice(0, 10).forEach(owner => {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      
      const ownerName = (owner.name || 'N/A').substring(0, 15);
      const properties = owner.propertyCount || 0;
      const bookings = owner.totalBookings || 0;
      const revenue = `Rs. ${(owner.totalRevenue || 0).toLocaleString()}`;
      const status = owner.isActive !== false ? 'Active' : 'Inactive';
      
      pdf.text(ownerName, 20, yPos);
      pdf.text(properties.toString(), 70, yPos);
      pdf.text(bookings.toString(), 110, yPos);
      pdf.text(revenue, 150, yPos);
      pdf.text(status, 180, yPos);
      yPos += 8;
    });
    
    yPos += 20;
    
    // Recent Activities Summary
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RECENT PLATFORM ACTIVITY', 20, yPos);
    pdf.line(20, yPos + 2, pageWidth - 20, yPos + 2);
    
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`New Users: ${recentActivities.recentUsers?.length || 0}`, 20, yPos);
    pdf.text(`New Properties: ${recentActivities.recentProperties?.length || 0}`, 100, yPos);
    yPos += 8;
    pdf.text(`Recent Bookings: ${recentActivities.recentBookings?.length || 0}`, 20, yPos);
    
    // Footer
    const footerY = 270;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, footerY, pageWidth - 20, footerY);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.text('Confidential Admin Report - Real Estate Platform', pageWidth/2, footerY + 10, { align: 'center' });
    pdf.text('For internal use only', pageWidth/2, footerY + 20, { align: 'center' });
    
    pdf.save(`admin-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadAdminDashboardExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Platform Stats Sheet
    const statsData = [
      ['Platform Statistics', ''],
      ['Metric', 'Value'],
      ['Total Revenue', `Rs. ${adminStats.totalRevenue?.toLocaleString() || 0}`],
      ['Monthly Revenue', `Rs. ${adminStats.monthlyRevenue?.toLocaleString() || 0}`],
      ['Total Users', adminStats.totalUsers || 0],
      ['Property Owners', adminStats.totalOwners || 0],
      ['Total Properties', adminStats.totalProperties || 0],
      ['Active Bookings', adminStats.activeBookings || 0],
      ['Pending Approvals', adminStats.pendingApprovals || 0],
      [''],
      ['Growth Metrics', ''],
      ['Revenue Growth', `${adminStats.growth?.revenue || 0}%`],
      ['User Growth', `${adminStats.growth?.users || 0}%`],
      ['Property Growth', `${adminStats.growth?.properties || 0}%`],
      ['Booking Growth', `${adminStats.growth?.bookings || 0}%`]
    ];
    const statsWs = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, statsWs, 'Platform Stats');
    
    // Owner Performance Sheet
    const ownerData = [
      ['Top Performing Owners', '', '', '', '', ''],
      ['Owner Name', 'Email', 'Properties', 'Bookings', 'Revenue', 'Status', 'Joined'],
      ...ownerPerformance.map(owner => [
        owner.name || 'N/A',
        owner.email || 'N/A',
        owner.propertyCount || 0,
        owner.totalBookings || 0,
        owner.totalRevenue || 0,
        owner.isActive !== false ? 'Active' : 'Inactive',
        new Date(owner.createdAt).toLocaleDateString()
      ])
    ];
    const ownerWs = XLSX.utils.aoa_to_sheet(ownerData);
    XLSX.utils.book_append_sheet(wb, ownerWs, 'Owner Performance');
    
    // Recent Users Sheet
    const usersData = [
      ['Recent User Registrations', '', ''],
      ['Name', 'Email', 'Role', 'Joined'],
      ...recentActivities.recentUsers?.map(user => [
        user.name || 'N/A',
        user.email || 'N/A',
        user.role || 'user',
        new Date(user.createdAt).toLocaleDateString()
      ]) || []
    ];
    const usersWs = XLSX.utils.aoa_to_sheet(usersData);
    XLSX.utils.book_append_sheet(wb, usersWs, 'Recent Users');
    
    // Recent Properties Sheet
    const propertiesData = [
      ['Recent Property Listings', '', ''],
      ['Property Title', 'Owner', 'Listed Date'],
      ...recentActivities.recentProperties?.map(property => [
        property.title || 'N/A',
        property.owner?.name || 'N/A',
        new Date(property.createdAt).toLocaleDateString()
      ]) || []
    ];
    const propertiesWs = XLSX.utils.aoa_to_sheet(propertiesData);
    XLSX.utils.book_append_sheet(wb, propertiesWs, 'Recent Properties');
    
    // Recent Bookings Sheet
    const bookingsData = [
      ['Recent Bookings', '', '', ''],
      ['Property', 'Tenant', 'Status', 'Date'],
      ...recentActivities.recentBookings?.map(booking => [
        booking.property?.title || 'N/A',
        booking.tenant?.name || 'N/A',
        booking.status || 'pending',
        new Date(booking.createdAt).toLocaleDateString()
      ]) || []
    ];
    const bookingsWs = XLSX.utils.aoa_to_sheet(bookingsData);
    XLSX.utils.book_append_sheet(wb, bookingsWs, 'Recent Bookings');
    
    // Save file
    XLSX.writeFile(wb, `admin-dashboard-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadOwnerDashboardExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Owner Stats
    const statsData = [
      ['Owner Dashboard Report', ''],
      ['Owner', user?.name || 'N/A'],
      ['Email', user?.email || 'N/A'],
      ['Report Date', new Date().toLocaleDateString()],
      [''],
      ['Statistics', 'Value'],
      ['Total Bookings', stats.totalBookings],
      ['Confirmed Bookings', stats.confirmedBookings],
      ['Pending Bookings', stats.pendingBookings],
      ['Total Revenue', `Rs. ${stats.totalRevenue?.toLocaleString() || 0}`]
    ];
    const statsWs = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, statsWs, 'Owner Stats');
    
    // Bookings Details
    const bookingsData = [
      ['Property Bookings', '', '', '', '', ''],
      ['Property', 'Tenant', 'Start Date', 'End Date', 'Amount', 'Status', 'Cancelled Date'],
      ...bookings.map(booking => [
        booking.property?.title || 'N/A',
        booking.tenant?.name || 'N/A',
        new Date(booking.startDate).toLocaleDateString(),
        new Date(booking.endDate).toLocaleDateString(),
        booking.paidAmount || 0,
        booking.status,
        booking.status === 'cancelled' ? new Date(booking.cancelledAt || booking.updatedAt).toLocaleDateString() : 'N/A'
      ])
    ];
    const bookingsWs = XLSX.utils.aoa_to_sheet(bookingsData);
    XLSX.utils.book_append_sheet(wb, bookingsWs, 'Bookings');
    
    XLSX.writeFile(wb, `owner-dashboard-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadUserDashboardExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // User Stats
    const statsData = [
      ['My Bookings Report', ''],
      ['User', user?.name || 'N/A'],
      ['Email', user?.email || 'N/A'],
      ['Report Date', new Date().toLocaleDateString()],
      [''],
      ['Statistics', 'Value'],
      ['Total Bookings', bookings.length],
      ['Confirmed Bookings', bookings.filter(b => b.status === 'confirmed').length],
      ['Total Spent', `Rs. ${bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0).toLocaleString()}`]
    ];
    const statsWs = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, statsWs, 'My Stats');
    
    // My Bookings
    const bookingsData = [
      ['My Bookings', '', '', '', '', ''],
      ['Property', 'Owner', 'Start Date', 'End Date', 'Amount Paid', 'Status', 'Cancelled Date'],
      ...bookings.map(booking => [
        booking.property?.title || 'N/A',
        booking.owner?.name || 'N/A',
        new Date(booking.startDate).toLocaleDateString(),
        new Date(booking.endDate).toLocaleDateString(),
        booking.paidAmount || 0,
        booking.status,
        booking.status === 'cancelled' ? new Date(booking.cancelledAt || booking.updatedAt).toLocaleDateString() : 'N/A'
      ])
    ];
    const bookingsWs = XLSX.utils.aoa_to_sheet(bookingsData);
    XLSX.utils.book_append_sheet(wb, bookingsWs, 'My Bookings');
    
    XLSX.writeFile(wb, `my-bookings-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadPDFReceipt = (booking) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    
    // Header
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('REAL ESTATE BOOKING', pageWidth/2, 18, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text('OFFICIAL RECEIPT', pageWidth/2, 28, { align: 'center' });
    
    // Reset colors
    pdf.setTextColor(0, 0, 0);
    pdf.setFillColor(255, 255, 255);
    
    // Receipt Info Box
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(15, 50, pageWidth-30, 28, 'S');
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Receipt ID: ${booking._id}`, 20, 60);
    pdf.text(`Booking: ${new Date(booking.createdAt).toLocaleDateString()}`, 20, 68);
    pdf.text(`Status: ${booking.status.toUpperCase()}`, 20, 76);
    
    let yPos = 88;
    
    // Property Details Section
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PROPERTY DETAILS', 20, yPos);
    pdf.line(20, yPos + 1, pageWidth - 20, yPos + 1);
    
    yPos += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${booking.property?.title || 'N/A'}`, 20, yPos);
    yPos += 6;
    pdf.text(`Type: ${booking.property?.propertyType || 'N/A'}`, 20, yPos);
    pdf.text(`Rent: Rs. ${booking.property?.price?.toLocaleString() || 'N/A'}/month`, 100, yPos);
    yPos += 6;
    pdf.text(`Location: ${booking.property?.location?.city || 'N/A'}, ${booking.property?.location?.state || 'N/A'}`, 20, yPos);
    yPos += 6;
    pdf.text(`Bedrooms: ${booking.property?.bedrooms || 'N/A'}`, 20, yPos);
    pdf.text(`Bathrooms: ${booking.property?.bathrooms || 'N/A'}`, 70, yPos);
    pdf.text(`Area: ${booking.property?.area || 'N/A'} sq ft`, 120, yPos);
    
    yPos += 12;
    
    // Combined Booking & Owner Details Section
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BOOKING & OWNER DETAILS', 20, yPos);
    pdf.line(20, yPos + 1, pageWidth - 20, yPos + 1);
    
    yPos += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    // Left column - Booking Details
    const leftCol = 20;
    const rightCol = pageWidth / 2 + 10;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('BOOKING INFO:', leftCol, yPos);
    pdf.text('OWNER CONTACT:', rightCol, yPos);
    
    yPos += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Customer: ${user?.role === 'owner' ? booking.tenant?.name || 'N/A' : user?.name || 'N/A'}`, leftCol, yPos);
    pdf.text(`Name: ${user?.role === 'owner' ? user?.name || 'N/A' : booking.owner?.name || 'N/A'}`, rightCol, yPos);
    
    yPos += 6;
    pdf.text(`Phone: ${user?.role === 'owner' ? (booking.tenant?.phone || user?.phone || '+91-9876543210') : (user?.phone || booking.tenant?.phone || '+91-9876543210')}`, leftCol, yPos);
    pdf.text(`Email: ${user?.role === 'owner' ? user?.email || 'N/A' : booking.owner?.email || 'N/A'}`, rightCol, yPos);
    
    yPos += 6;
    pdf.text(`Booked On: ${new Date(booking.createdAt).toLocaleDateString()} ${new Date(booking.createdAt).toLocaleTimeString()}`, leftCol, yPos);
    
    // Add cancellation info if cancelled
    if (booking.status === 'cancelled') {
      yPos += 6;
      pdf.setTextColor(255, 0, 0); // Red color for cancellation
      pdf.text(`Cancelled On: ${new Date(booking.cancelledAt || booking.updatedAt).toLocaleDateString()} ${new Date(booking.cancelledAt || booking.updatedAt).toLocaleTimeString()}`, leftCol, yPos);
      if (booking.cancellationReason) {
        yPos += 6;
        pdf.text(`Reason: ${booking.cancellationReason}`, leftCol, yPos);
      }
      
      // Add refund status if applicable
      if (booking.paidAmount > 0) {
        yPos += 6;
        if (booking.refundStatus === 'completed') {
          pdf.setTextColor(0, 128, 0); // Green for completed refund
          pdf.text(`REFUND COMPLETED: Rs. ${booking.refundAmount?.toLocaleString() || booking.paidAmount?.toLocaleString()}`, leftCol, yPos);
          yPos += 6;
          pdf.text(`Refunded On: ${new Date(booking.refundCompletedAt).toLocaleDateString()}`, leftCol, yPos);
        } else if (booking.refundStatus === 'processing') {
          pdf.setTextColor(255, 165, 0); // Orange for processing
          pdf.text(`REFUND PROCESSING: Rs. ${booking.refundAmount?.toLocaleString() || booking.paidAmount?.toLocaleString()}`, leftCol, yPos);
          yPos += 6;
          pdf.text(`Expected: ${new Date(booking.expectedRefundDate).toLocaleDateString()}`, leftCol, yPos);
        } else {
          pdf.setTextColor(0, 0, 255); // Blue for eligible
          pdf.text(`REFUND ELIGIBLE: Rs. ${booking.paidAmount?.toLocaleString()}`, leftCol, yPos);
        }
      }
      
      pdf.setTextColor(0, 0, 0); // Reset to black
    }
    pdf.text(`Phone: ${user?.role === 'owner' ? (user?.phone || booking.owner?.phone || '+91-9876543210') : (booking.owner?.phone || user?.phone || '+91-9876543210')}`, rightCol, yPos);
    
    // Add refund completion badge if applicable
    if (booking.status === 'cancelled' && booking.refundStatus === 'completed') {
      yPos += 8;
      pdf.setFillColor(0, 128, 0); // Green background
      pdf.rect(leftCol, yPos - 4, 80, 10, 'F');
      pdf.setTextColor(255, 255, 255); // White text
      pdf.setFont('helvetica', 'bold');
      pdf.text('REFUND COMPLETED', leftCol + 2, yPos + 2);
      pdf.setTextColor(0, 0, 0); // Reset to black
      pdf.setFont('helvetica', 'normal');
    }
    
    yPos += 6;
    pdf.text(`Check-in: ${new Date(booking.startDate).toLocaleDateString()}`, leftCol, yPos);
    
    yPos += 6;
    pdf.text(`Check-out: ${new Date(booking.endDate).toLocaleDateString()}`, leftCol, yPos);
    
    yPos += 12;
    
    // Payment Details Section
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT BREAKDOWN', 20, yPos);
    pdf.line(20, yPos + 1, pageWidth - 20, yPos + 1);
    
    yPos += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    const totalAmount = booking.totalAmount || booking.property?.price || 0;
    const paidAmount = booking.paidAmount || 0;
    const monthlyRent = booking.property?.price || 0;
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    const months = Math.max(1, (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()));
    const paymentStatus = booking.paymentStatus === 'paid' ? 'COMPLETE' : 
                         booking.paymentStatus === 'partial' ? 'PARTIAL' : 'PENDING';
    
    // Payment breakdown with months
    pdf.text(`Monthly Rent: Rs. ${monthlyRent.toLocaleString()}`, 20, yPos);
    pdf.text(`Duration: ${months} month${months > 1 ? 's' : ''}`, 100, yPos);
    yPos += 6;
    pdf.text(`Total Amount: Rs. ${totalAmount.toLocaleString()}`, 20, yPos);
    pdf.text(`Paid: Rs. ${paidAmount.toLocaleString()}`, 100, yPos);
    yPos += 6;
    pdf.text(`Status: ${paymentStatus}`, 20, yPos);
    if (booking.paymentId) {
      pdf.text(`Payment ID: ${booking.paymentId.substring(0, 20)}...`, 100, yPos);
    }
    
    // Add refund information in payment section
    if (booking.status === 'cancelled' && booking.paidAmount > 0) {
      yPos += 6;
      if (booking.refundStatus === 'completed') {
        pdf.setTextColor(0, 128, 0);
        pdf.text(`Refund Status: COMPLETED`, 20, yPos);
        pdf.text(`Refunded: Rs. ${booking.refundAmount?.toLocaleString() || booking.paidAmount?.toLocaleString()}`, 100, yPos);
        yPos += 6;
        pdf.text(`Refund Date: ${new Date(booking.refundCompletedAt).toLocaleDateString()}`, 20, yPos);
      } else if (booking.refundStatus === 'processing') {
        pdf.setTextColor(255, 165, 0);
        pdf.text(`Refund Status: PROCESSING`, 20, yPos);
        pdf.text(`Expected: ${new Date(booking.expectedRefundDate).toLocaleDateString()}`, 100, yPos);
      } else {
        pdf.setTextColor(0, 0, 255);
        pdf.text(`Refund Status: ELIGIBLE`, 20, yPos);
        pdf.text(`Amount: Rs. ${booking.paidAmount?.toLocaleString()}`, 100, yPos);
      }
      pdf.setTextColor(0, 0, 0); // Reset to black
    }
    
    // Footer - position at bottom of page
    const footerY = 270; // Fixed position near bottom
    
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, footerY, pageWidth - 20, footerY);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(13);
    pdf.text('Thank you for choosing us for your dream home!', pageWidth/2, footerY + 10, { align: 'center' });
    pdf.text('We hope you have a wonderful stay and create beautiful memories.', pageWidth/2, footerY + 20, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text('For support: support@realestate.com | Phone: +91-9876543210', pageWidth/2, footerY + 30, { align: 'center' });
    
    pdf.save(`booking-receipt-${booking._id.slice(-6)}.pdf`);
  };

  if (!user) return (
    <div className="container mx-auto py-10 text-center">
      <h1 className="text-2xl font-bold">Please login to access dashboard</h1>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{user?.role === 'admin' ? '👑 Admin Dashboard' : user?.role === 'owner' ? '🏠 Owner Dashboard' : '👤 My Dashboard'}</h1>
          <p className="text-gray-600">Welcome back, {user?.name}! Here's your overview.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition duration-200 shadow-lg flex items-center space-x-2" 
            onClick={user?.role === 'admin' ? downloadAdminDashboardPDF : user?.role === 'owner' ? downloadOwnerDashboardPDF : downloadUserDashboardPDF}
          >
            <span>📊</span>
            <span>Download PDF</span>
          </button>
          
          <button 
            className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-teal-700 transition duration-200 shadow-lg flex items-center space-x-2" 
            onClick={user?.role === 'admin' ? downloadAdminDashboardExcel : user?.role === 'owner' ? downloadOwnerDashboardExcel : downloadUserDashboardExcel}
          >
            <span>📈</span>
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {(user?.role === 'admin' ? [
          { 
            label: 'Total Revenue', 
            value: `₹${adminStats.totalRevenue?.toLocaleString() || 0}`, 
            icon: <AttachMoney fontSize="large" />, 
            bg: 'from-green-500 to-emerald-600',
            growth: `+${adminStats.growth?.revenue || 0}%`
          },
          { 
            label: 'Total Users', 
            value: adminStats.totalUsers || 0, 
            icon: <People fontSize="large" />, 
            bg: 'from-blue-500 to-indigo-600',
            growth: `+${adminStats.growth?.users || 0}%`
          },
          { 
            label: 'Total Properties', 
            value: adminStats.totalProperties || 0, 
            icon: <Home fontSize="large" />, 
            bg: 'from-purple-500 to-pink-600',
            growth: `+${adminStats.growth?.properties || 0}%`
          },
          { 
            label: 'Active Bookings', 
            value: adminStats.activeBookings || 0, 
            icon: <CheckCircle fontSize="large" />, 
            bg: 'from-orange-500 to-red-600',
            growth: `+${adminStats.growth?.bookings || 0}%`
          }
        ] : [
          { label: 'Total Bookings', value: stats.totalBookings, icon: <Home fontSize="large" />, bg: 'from-purple-500 to-indigo-600' },
          { label: 'Cancelled', value: stats.cancelledBookings, icon: <Close fontSize="large" />, bg: 'from-red-500 to-pink-400' },
          { label: 'Confirmed', value: stats.confirmedBookings, icon: <CheckCircle fontSize="large" />, bg: 'from-blue-400 to-cyan-400' },
          { label: 'Pending', value: stats.pendingBookings, icon: <Pending fontSize="large" />, bg: 'from-pink-400 to-yellow-300' }
        ]).map((card, i) => (
          <div key={i} className={`bg-gradient-to-br ${card.bg} text-white rounded-xl p-6 flex justify-between items-center transform hover:-translate-y-2 transition duration-200 min-h-[160px]`}>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{card.value}</h2>
              <p className="text-sm md:text-base">{card.label}</p>
              {card.growth && (
                <p className="text-xs opacity-90 mt-1">{card.growth} this month</p>
              )}
            </div>
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-white bg-opacity-20 rounded-full">
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Admin Additional Stats */}
      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-xl p-6 flex justify-between items-center transform hover:-translate-y-2 transition duration-200 min-h-[140px]">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{adminStats.totalOwners || 0}</h2>
              <p className="text-sm md:text-base">Property Owners</p>
            </div>
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-white bg-opacity-20 rounded-full">
              <People fontSize="large" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white rounded-xl p-6 flex justify-between items-center transform hover:-translate-y-2 transition duration-200 min-h-[140px]">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{adminStats.pendingApprovals || 0}</h2>
              <p className="text-sm md:text-base">Pending Approvals</p>
            </div>
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-white bg-opacity-20 rounded-full">
              <Pending fontSize="large" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-teal-500 to-green-600 text-white rounded-xl p-6 flex justify-between items-center transform hover:-translate-y-2 transition duration-200 min-h-[140px]">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">₹{adminStats.monthlyRevenue?.toLocaleString() || 0}</h2>
              <p className="text-sm md:text-base">This Month Revenue</p>
            </div>
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-white bg-opacity-20 rounded-full">
              <AttachMoney fontSize="large" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl p-6 flex justify-between items-center transform hover:-translate-y-2 transition duration-200 min-h-[140px]">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{adminStats.totalBookings || 0}</h2>
              <p className="text-sm md:text-base">Total Bookings</p>
            </div>
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-white bg-opacity-20 rounded-full">
              <Home fontSize="large" />
            </div>
          </div>
        </div>
      )}

      {/* Charts Section - Show for all roles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 min-h-[380px]">
          <h2 className="text-xl md:text-2xl font-bold mb-4">
            {user?.role === 'admin' ? '📊 Platform Revenue Trend' : '📊 Monthly Bookings Trend'}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart 
              data={user?.role === 'admin' ? 
                // Admin sees revenue data
                Array.from({length: 12}, (_, i) => ({
                  month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
                  bookings: Math.floor(Math.random() * 50) + 20,
                  revenue: Math.floor(Math.random() * 100000) + 50000
                })) :
                // Others see booking data
                stats.monthlyData
              } 
              margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Line 
                type="monotone" 
                dataKey={user?.role === 'admin' ? 'revenue' : 'bookings'} 
                stroke="#2563eb" 
                strokeWidth={3} 
                dot={{ r: 6 }} 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 min-h-[380px]">
          <h2 className="text-xl md:text-2xl font-bold mb-4">
            {user?.role === 'admin' ? '📈 Platform Overview' : '📈 Booking Status'}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={user?.role === 'admin' ? [
                  { name: 'Users', value: adminStats.totalUsers || 0, color: '#3b82f6' },
                  { name: 'Owners', value: adminStats.totalOwners || 0, color: '#8b5cf6' },
                  { name: 'Properties', value: adminStats.totalProperties || 0, color: '#10b981' }
                ] : [
                  { name: 'Confirmed', value: stats.confirmedBookings, color: '#10b981' },
                  { name: 'Pending', value: stats.pendingBookings, color: '#f59e0b' },
                  { name: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, color: '#ef4444' }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                dataKey="value"
              >
                {(user?.role === 'admin' ? [
                  { name: 'Users', value: adminStats.totalUsers || 0, color: '#3b82f6' },
                  { name: 'Owners', value: adminStats.totalOwners || 0, color: '#8b5cf6' },
                  { name: 'Properties', value: adminStats.totalProperties || 0, color: '#10b981' }
                ] : [
                  { name: 'Confirmed', value: stats.confirmedBookings, color: '#10b981' },
                  { name: 'Pending', value: stats.pendingBookings, color: '#f59e0b' },
                  { name: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, color: '#ef4444' }
                ]).map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <div className="relative mr-2">
              <Message className="mr-1" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            💬 Messages {user?.role === 'owner' || user?.role === 'user' ? '(Booking-Specific)' : ''}
          </h2>
          <button
            onClick={() => {
              const newShowChat = !showChat;
              setShowChat(newShowChat);
              if (newShowChat) {
                const currentTime = new Date().toISOString();
                setUnreadCount(0);
                setMessagesRead(true);
                setLastReadTime(currentTime);
                localStorage.setItem('messagesRead', 'true');
                localStorage.setItem('lastReadTime', currentTime);
                markAsRead();
              }
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showChat ? 'Hide Chat' : (user?.role === 'owner' || user?.role === 'user' ? 'Select a booking to chat' : 'Show Chat')}
          </button>
        </div>
        {showChat && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Message area - only show if admin OR (owner/tenant with booking selected) */}
            {user?.role === 'admin' || selectedBooking ? (
            <div className="lg:col-span-2">
              <div className="h-64 overflow-y-auto mb-4 border rounded-lg p-4 bg-gray-50 space-y-2" onScroll={() => { 
                const currentTime = new Date().toISOString();
                setUnreadCount(0); 
                setMessagesRead(true); 
                setLastReadTime(currentTime);
                localStorage.setItem('messagesRead', 'true'); 
                localStorage.setItem('lastReadTime', currentTime);
                markAsRead(); 
              }}>
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No messages yet. Start a conversation!</p>
                ) : (
                  messages.map(msg => (
                    <div key={msg?._id || Math.random()} className={`flex ${
                      msg?.sender?._id === user?._id ? 'justify-end' : 'justify-start'
                    }`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${
                        msg?.sender?._id === user?._id 
                          ? 'bg-blue-500 text-white' 
                          : (msg?.sender?._id !== user?._id && !msg?.isRead)
                          ? 'bg-red-50 border-2 border-red-200 shadow-md animate-pulse'
                          : 'bg-white border shadow-sm'
                      }`}>
                        {msg?.sender?._id !== user?._id && !msg?.isRead && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                        )}
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${
                            msg?.sender?._id === user?._id ? 'text-blue-100' : 'text-gray-600'
                          }`}>
                            {msg?.sender?.name || 'Unknown'} {msg?.sender?.role === 'admin' && '👑'}
                          </span>
                          <span className={`text-xs ${
                            msg?.sender?._id === user?._id ? 'text-blue-200' : 'text-gray-400'
                          }`}>
                            {new Date(msg?.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        
                        {msg?.fileUrl ? (
                          <div className="mt-2">
                            {(() => {
                              const resolvedUrl = msg?.fileUrl?.startsWith('http')
                                ? msg.fileUrl
                                : `${BASE_API_URL}${msg?.fileUrl}`;
                              return msg?.fileUrl?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                <img 
                                  src={resolvedUrl} 
                                  alt="Shared image" 
                                  className="max-w-full h-32 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity" 
                                  onClick={() => window.open(resolvedUrl, '_blank')}
                                />
                              ) : (
                                <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline hover:text-blue-400">
                                  📎 {msg?.fileName || 'File'}
                                </a>
                              );
                            })()}
                          </div>
                        ) : null}
                        {msg?.content && <p className="text-sm">{msg?.content}</p>}
                        
                        {msg?.replyTo && (
                          <div className={`mt-2 p-2 rounded text-xs ${
                            msg?.sender?._id === user?._id ? 'bg-blue-400' : 'bg-gray-100'
                          }`}>
                            Reply to previous message
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          {msg?.sender?._id !== user?._id && (
                            <button
                              onClick={() => setReplyTo(msg?._id)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Reply
                            </button>
                          )}
                          
                          {msg?.sender?._id === user?._id && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingMessage(msg?._id);
                                  setNewMessage(msg?.content || '');
                                }}
                                className="text-xs text-yellow-600 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteMessage(msg?._id)}
                                className="text-xs text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {otherUserTyping && (
                  <div className="flex justify-start mb-2">
                    <div className="bg-gray-200 px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-600">{otherUserTyping.userName} is typing</span>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {replyTo && (
                <div className="mb-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-800">💬 Replying to message</span>
                    <button 
                      onClick={() => setReplyTo(null)} 
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
              {selectedFile && (
                <div className="mb-2 p-2 bg-blue-50 rounded flex items-center justify-between">
                  <span className="text-sm">📎 {selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-red-600">✕</button>
                </div>
              )}
              
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                  >
                    😊
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 bg-white border rounded-lg p-2 shadow-lg z-10">
                      <div className="grid grid-cols-6 gap-1">
                        {['😊','😂','❤️','👍','👎','😢','😮','😡','🎉','🔥','💯','👏'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => addEmoji(emoji)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="px-3 py-2 text-gray-600 hover:text-gray-800 cursor-pointer">
                  📁
                </label>
                
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder={editingMessage ? "Edit message..." : "Type your message..."}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                
                {editingMessage && (
                  <button
                    onClick={() => {
                      setEditingMessage(null);
                      setNewMessage('');
                    }}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                )}
                
                <button
                  onClick={() => sendMessage()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            ) : (
              <div className="lg:col-span-2 p-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg text-center">
                <p className="text-yellow-800 font-semibold mb-4">📌 Please select a booking from the list above to start messaging</p>
                <p className="text-yellow-700 text-sm">Click the <strong>💬 Chat</strong> button on any booking to chat with the {user?.role === 'owner' ? 'tenant' : 'owner'}</p>
              </div>
            )}
            {/* Stats sidebar - only for booking-specific chats */}
            {(user?.role === 'admin' || selectedBooking) && (
            <div>
              <h3 className="font-bold mb-3">📊 Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>Total Messages</span>
                  <span className="font-bold">{messages.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span>Unread Messages</span>
                  <span className="font-bold text-red-600">{unreadCount}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>Active Bookings</span>
                  <span className="font-bold">{stats.confirmedBookings}</span>
                </div>
              </div>
            </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Owner Performance Table */}
      {user?.role === 'admin' && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-10">
          <h2 className="text-xl md:text-2xl font-bold mb-4">🏢 Top Performing Owners</h2>
          {ownerPerformance.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-lg font-semibold text-gray-600">No owners found</h3>
              <p className="text-gray-500 mt-2">No property owners have registered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Properties</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ownerPerformance.map((owner, index) => (
                    <tr key={owner._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {owner.name.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{owner.name}</div>
                            <div className="text-sm text-gray-500">{owner.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {owner.propertyCount} properties
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {owner.totalBookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ₹{owner.totalRevenue?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          owner.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {owner.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(owner.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4">
          📋 {user?.role === 'admin' ? 'Recent Platform Activity' : user?.role === 'owner' ? 'Property Bookings' : 'My Bookings'}
        </h2>

        {user?.role === 'admin' ? (
          // Admin Recent Activities
          <div className="space-y-6">
            {/* Recent Users */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">👥 Recent User Registrations</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setRecentUsersPage(prev => Math.max(1, prev - 1))}
                    disabled={recentUsersPage === 1}
                    className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                  >
                    ←
                  </button>
                  <span className="text-xs text-gray-600">
                    {recentUsersPage} / {Math.ceil((recentActivities.recentUsers?.length || 0) / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setRecentUsersPage(prev => prev + 1)}
                    disabled={recentUsersPage >= Math.ceil((recentActivities.recentUsers?.length || 0) / itemsPerPage)}
                    className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentActivities.recentUsers?.slice((recentUsersPage - 1) * itemsPerPage, recentUsersPage * itemsPerPage).map((user) => (
                      <tr key={user._id}>
                        <td className="px-4 py-2 text-sm">{user.name}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'owner' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Properties */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">🏠 Recent Property Listings</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setRecentPropertiesPage(prev => Math.max(1, prev - 1))}
                    disabled={recentPropertiesPage === 1}
                    className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                  >
                    ←
                  </button>
                  <span className="text-xs text-gray-600">
                    {recentPropertiesPage} / {Math.ceil((recentActivities.recentProperties?.length || 0) / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setRecentPropertiesPage(prev => prev + 1)}
                    disabled={recentPropertiesPage >= Math.ceil((recentActivities.recentProperties?.length || 0) / itemsPerPage)}
                    className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Listed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentActivities.recentProperties?.slice((recentPropertiesPage - 1) * itemsPerPage, recentPropertiesPage * itemsPerPage).map((property) => (
                      <tr key={property._id}>
                        <td className="px-4 py-2 text-sm font-medium">{property.title}</td>
                        <td className="px-4 py-2 text-sm">{property.owner?.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {new Date(property.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Bookings */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">📋 Recent Bookings</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setRecentBookingsPage(prev => Math.max(1, prev - 1))}
                    disabled={recentBookingsPage === 1}
                    className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                  >
                    ←
                  </button>
                  <span className="text-xs text-gray-600">
                    {recentBookingsPage} / {Math.ceil((recentActivities.recentBookings?.length || 0) / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setRecentBookingsPage(prev => prev + 1)}
                    disabled={recentBookingsPage >= Math.ceil((recentActivities.recentBookings?.length || 0) / itemsPerPage)}
                    className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentActivities.recentBookings?.slice((recentBookingsPage - 1) * itemsPerPage, recentBookingsPage * itemsPerPage).map((booking) => (
                      <tr key={booking._id}>
                        <td className="px-4 py-2 text-sm">{booking.property?.title}</td>
                        <td className="px-4 py-2 text-sm">{booking.tenant?.name}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-10">
            <h3 className="text-lg font-semibold text-gray-600">No bookings found</h3>
            <p className="text-gray-500 mt-2">{user?.role === 'owner' ? "Your properties haven't been booked yet" : "You haven't made any bookings yet"}</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{user?.role === 'owner' ? 'Tenant' : user?.role === 'admin' ? 'User' : 'Owner'}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage).map(booking => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{booking.property?.title || 'Property'}</div>
                      <div className="text-sm text-gray-500">{booking.property?.location?.city || 'Location'}, {booking.property?.location?.state || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-700 rounded-full mr-3">
                          <People fontSize="small" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {user?.role === 'owner' ? booking.tenant?.name : user?.role === 'admin' ? (booking.tenant?.name || booking.owner?.name) : booking.owner?.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>{new Date(booking.startDate).toLocaleDateString()}</div>
                        <div className="text-gray-500">to {new Date(booking.endDate).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.status === 'cancelled' ? (
                        <div className="text-sm text-gray-500">
                          <div className="font-medium text-red-600">❌ Booking Cancelled</div>
                          <div className="text-xs text-gray-600">
                            📅 Cancelled on: {new Date(booking.cancelledAt || booking.updatedAt || booking.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-600">
                            🕒 Time: {new Date(booking.cancelledAt || booking.updatedAt || booking.createdAt).toLocaleTimeString()}
                          </div>
                          {booking.cancellationReason && (
                            <div className="text-xs text-orange-600">
                              💬 Reason: {booking.cancellationReason}
                            </div>
                          )}
                          {booking.paidAmount > 0 && (
                            <div className={`text-xs ${
                              booking.refundStatus === 'completed' 
                                ? 'text-green-600 line-through decoration-red-500 decoration-2' 
                                : booking.refundStatus === 'processing'
                                ? 'text-orange-600 animate-pulse'
                                : 'text-green-600'
                            }`}>
                              💰 {booking.refundStatus === 'completed' 
                                ? `Refunded: ₹${booking.refundAmount?.toLocaleString() || booking.paidAmount?.toLocaleString()}` 
                                : booking.refundStatus === 'processing'
                                ? `Refund Processing: ₹${booking.refundAmount?.toLocaleString() || booking.paidAmount?.toLocaleString()}`
                                : `Refund Eligible: ₹${booking.paidAmount?.toLocaleString()}`}
                            </div>
                          )}
                          {booking.refundStatus === 'completed' && (
                            <span className="text-xs text-green-700 font-semibold bg-green-100 px-2 py-1 rounded-lg mt-1 inline-block w-fit">
                              ✅ Refund Completed
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm">
                          <div className="font-bold text-blue-600">
                            Total Amount: ₹{booking.totalAmount?.toLocaleString() || booking.property?.price?.toLocaleString() || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-600">
                            Monthly: ₹{booking.property?.price?.toLocaleString() || 'N/A'} × {(() => {
                              const start = new Date(booking.startDate);
                              const end = new Date(booking.endDate);
                              const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
                              return months;
                            })()} month{(() => {
                              const start = new Date(booking.startDate);
                              const end = new Date(booking.endDate);
                              const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
                              return months > 1 ? 's' : '';
                            })()}
                          </div>
                          <div className="text-green-600 text-xs">
                            Paid: ₹{booking.paidAmount?.toLocaleString() || '0'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.status === 'cancelled' ? (
                        <div className="flex flex-col space-y-1">
                          <span className="px-2 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 inline-block w-fit">
                            Cancelled
                          </span>
                          {booking.refundStatus === 'completed' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-lg bg-green-100 text-green-800 inline-block w-fit">
                              ✅ Refunded
                            </span>
                          )}
                          {booking.refundStatus === 'processing' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-lg bg-orange-100 text-orange-800 animate-pulse inline-block w-fit">
                              🔄 Refunding
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          booking.paymentStatus === 'paid' || (booking.paidAmount > 0 && booking.paidAmount >= (booking.totalAmount || booking.property?.price || 0)) ? 'bg-green-100 text-green-800' :
                          booking.paymentStatus === 'partial' || (booking.paidAmount > 0 && booking.paidAmount < (booking.totalAmount || booking.property?.price || 0)) ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {booking.paymentStatus === 'paid' || (booking.paidAmount > 0 && booking.paidAmount >= (booking.totalAmount || booking.property?.price || 0)) ? 'Complete' :
                           booking.paymentStatus === 'partial' || (booking.paidAmount > 0 && booking.paidAmount < (booking.totalAmount || booking.property?.price || 0)) ? 'Partial' :
                           'Pending'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${getStatusColor(booking.status)} inline-block w-fit`}>
                          {booking.status}
                        </span>
                        {booking.status === 'cancelled' && booking.refundStatus === 'completed' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-lg bg-green-100 text-green-800 inline-block w-fit">
                            💰 Refund Done
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {user?.role === 'owner' && booking.status === 'pending' ? (
                        <div className="flex space-x-2">
                          <button 
                            className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition duration-200" 
                            onClick={() => updateBookingStatus(booking._id, 'confirmed')}
                          >
                            Accept
                          </button>
                          <button 
                            className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition duration-200" 
                            onClick={() => updateBookingStatus(booking._id, 'cancelled')}
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col space-y-1">
                          <button 
                            className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition duration-200" 
                            onClick={() => {
                              setSelectedBooking(booking._id);
                              setShowChat(true);
                              setUnreadCount(0);
                              fetchBookingMessages(booking._id);
                            }}
                          >
                            💬 Chat
                          </button>
                          
                          {/* Enhanced Refund Actions for Owner */}
                          {user?.role === 'owner' && booking.status === 'cancelled' && booking.paidAmount > 0 && (
                            <div className="flex flex-col space-y-1">
                              {!booking.refundStatus || booking.refundStatus === 'not_applicable' ? (
                                <button 
                                  className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600 transition duration-200" 
                                  onClick={() => initiateRefund(booking._id, booking.paidAmount)}
                                >
                                  💰 Initiate Refund
                                </button>
                              ) : booking.refundStatus === 'pending' ? (
                                <div className="flex flex-col space-y-1">
                                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs text-center">
                                    ⏳ Refund Pending
                                  </span>
                                  <button 
                                    className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600" 
                                    onClick={() => initiateRefund(booking._id, booking.paidAmount)}
                                  >
                                    🚀 Start Process
                                  </button>
                                </div>
                              ) : booking.refundStatus === 'processing' ? (
                                <div className="flex flex-col space-y-1">
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs text-center">
                                    🔄 Processing
                                  </span>
                                  <div className="text-xs text-gray-600 text-center">
                                    Expected: {booking.expectedRefundDate ? new Date(booking.expectedRefundDate).toLocaleDateString() : '1 day'}
                                  </div>
                                  <button 
                                    className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600" 
                                    onClick={() => completeRefund(booking._id)}
                                  >
                                    ✅ Mark Complete
                                  </button>
                                </div>
                              ) : booking.refundStatus === 'completed' ? (
                                <div className="flex flex-col space-y-1">
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs text-center">
                                    ✅ Refunded
                                  </span>
                                  <div className="text-xs text-gray-600 text-center">
                                    Completed: {booking.refundCompletedAt ? new Date(booking.refundCompletedAt).toLocaleDateString() : 'N/A'}
                                  </div>
                                </div>
                              ) : (
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs text-center">
                                  ❌ Failed
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* User Refund Status Display */}
                          {user?.role === 'user' && booking.status === 'cancelled' && booking.paidAmount > 0 && (
                            <div className="flex flex-col space-y-1">
                              {booking.refundStatus === 'completed' ? (
                                <div className="flex flex-col space-y-1">
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs text-center">
                                    ✅ Refund Completed
                                  </span>
                                  <div className="text-xs text-green-600 text-center">
                                    🎉 ₹{booking.refundAmount?.toLocaleString() || booking.paidAmount?.toLocaleString()} Credited
                                  </div>
                                  <div className="text-xs text-gray-600 text-center">
                                    {booking.refundCompletedAt ? new Date(booking.refundCompletedAt).toLocaleDateString() : 'Recently'}
                                  </div>
                                </div>
                              ) : booking.refundStatus === 'processing' ? (
                                <div className="flex flex-col space-y-1">
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs text-center">
                                    🔄 Refund Processing
                                  </span>
                                  <div className="text-xs text-green-600 text-center">
                                    📅 Expected: {booking.expectedRefundDate ? new Date(booking.expectedRefundDate).toLocaleDateString() : '1 day'}
                                  </div>
                                  <div className="text-xs text-gray-600 text-center">
                                    ₹{booking.refundAmount?.toLocaleString() || booking.paidAmount?.toLocaleString()}
                                  </div>
                                </div>
                              ) : booking.refundStatus === 'failed' ? (
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs text-center">
                                  ❌ Refund Failed
                                </span>
                              ) : (
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs text-center">
                                  🕰️ Refund Pending
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Download Receipt */}
                          <button 
                            className="bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600 transition duration-200" 
                            onClick={() => downloadPDFReceipt(booking)}
                          >
                            📄 Receipt
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="flex justify-between items-center mt-4 px-6 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, bookings.length)} of {bookings.length} bookings
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {Math.ceil(bookings.length / recordsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= Math.ceil(bookings.length / recordsPerPage)}
                  className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
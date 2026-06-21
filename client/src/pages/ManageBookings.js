import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Download, Close } from '@mui/icons-material';
import jsPDF from 'jspdf';

const ManageBookings = () => {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [bookingsPerPage] = useState(5);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/bookings/my-bookings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchBookings();
        alert('Booking cancelled successfully');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking');
    }
  };

  const downloadReceipt = (booking) => {
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
    const locationText = typeof booking.property?.location === 'string' 
      ? booking.property.location 
      : `${booking.property?.location?.city || ''}, ${booking.property?.location?.state || ''}`.replace(/^,\s*|,\s*$/g, '') || 'N/A';
    pdf.text(`Location: ${locationText}`, 20, yPos);
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
    pdf.text(`Customer: ${user?.name || 'N/A'}`, leftCol, yPos);
    pdf.text(`Name: ${booking.owner?.name || 'N/A'}`, rightCol, yPos);
    
    yPos += 6;
    pdf.text(`Phone: ${user?.phone || 'N/A'}`, leftCol, yPos);
    pdf.text(`Email: ${booking.owner?.email || 'N/A'}`, rightCol, yPos);
    
    yPos += 6;
    pdf.text(`Booked On: ${new Date(booking.createdAt).toLocaleDateString()} ${new Date(booking.createdAt).toLocaleTimeString()}`, leftCol, yPos);
    pdf.text(`Phone: ${booking.owner?.phone || 'N/A'}`, rightCol, yPos);
    
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
    
    // Cancellation Notice for cancelled bookings
    if (booking.status === 'cancelled') {
      yPos += 10;
      pdf.setFillColor(255, 240, 240);
      pdf.rect(15, yPos, pageWidth-30, 25, 'F');
      pdf.setDrawColor(220, 53, 69);
      pdf.rect(15, yPos, pageWidth-30, 25, 'S');
      
      yPos += 8;
      pdf.setTextColor(220, 53, 69);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('⚠️ BOOKING CANCELLED', pageWidth/2, yPos, { align: 'center' });
      
      yPos += 6;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Cancelled on: ${new Date(booking.updatedAt || booking.createdAt).toLocaleDateString()}`, pageWidth/2, yPos, { align: 'center' });
      
      yPos += 6;
      if (booking.paidAmount > 0) {
        pdf.setTextColor(34, 197, 94);
        pdf.text(`Refund Amount: Rs. ${booking.paidAmount.toLocaleString()} (Processing within 5-7 business days)`, pageWidth/2, yPos, { align: 'center' });
      }
    }
    
    // Footer - position at bottom of page
    const footerY = 270; // Fixed position near bottom
    
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, footerY, pageWidth - 20, footerY);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(13);
    
    if (booking.status === 'cancelled') {
      pdf.text('We apologize for any inconvenience caused by this cancellation.', pageWidth/2, footerY + 10, { align: 'center' });
      pdf.text('For refund queries or support: support@realestate.com | Phone: +91-9876543210', pageWidth/2, footerY + 20, { align: 'center' });
    } else {
      pdf.text('Thank you for choosing us for your dream home!', pageWidth/2, footerY + 10, { align: 'center' });
      pdf.text('We hope you have a wonderful stay and create beautiful memories.', pageWidth/2, footerY + 20, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text('For support: support@realestate.com | Phone: +91-9263605357', pageWidth/2, footerY + 30, { align: 'center' });
    }
    
    pdf.save(`booking-receipt-${booking._id.slice(-6)}.pdf`);
  };

  // Pagination logic
  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = bookings.slice(indexOfFirstBooking, indexOfLastBooking);
  const totalPages = Math.ceil(bookings.length / bookingsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (authLoading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold">Please login to access your bookings</h1>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">📋 Manage My Bookings</h1>
        <p className="text-gray-600">View and manage all your property bookings</p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h3 className="text-xl font-semibold mb-2">No bookings found</h3>
          <p className="text-gray-600">You haven't made any bookings yet.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Property</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Dates</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Payment</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Receipt</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Cancel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentBookings.map((booking, index) => (
                    <tr key={booking._id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{booking.property?.title}</div>
                          <div className="text-sm text-gray-500">
                            {typeof booking.property?.location === 'string' 
                              ? booking.property.location 
                              : `${booking.property?.location?.city || ''}, ${booking.property?.location?.state || ''}`.replace(/^,\s*|,\s*$/g, '') || 'N/A'
                            }
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div>From: {new Date(booking.startDate).toLocaleDateString()}</div>
                          <div>To: {new Date(booking.endDate).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div className="font-medium">₹{(booking.totalAmount || booking.property?.price || 0).toLocaleString()}</div>
                          <div className="text-gray-500">Paid: ₹{(booking.paidAmount || 0).toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {booking.status === 'cancelled' && booking.refundStatus === 'completed' ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            refunded
                          </span>
                        ) : booking.status === 'cancelled' && booking.refundStatus === 'processing' ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            refunding
                          </span>
                        ) : (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            booking.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {booking.paymentStatus || 'pending'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {booking.status === 'confirmed' ? (
                          <button
                            onClick={() => downloadReceipt(booking)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Download Receipt"
                          >
                            <Download />
                          </button>
                        ) : booking.status === 'cancelled' ? (
                          <span className="text-red-600 text-xs font-medium">
                            Booking Cancelled
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            Not Available
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {booking.status !== 'cancelled' ? (
                          <button 
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition duration-200 shadow-md" 
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this booking?')) {
                                handleCancelBooking(booking._id);
                              }
                            }}
                            title="Cancel Booking"
                          >
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">Cancelled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 space-x-2">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Previous
              </button>
              
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => paginate(index + 1)}
                  className={`px-3 py-2 rounded-lg ${
                    currentPage === index + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg ${
                  currentPage === totalPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Next
              </button>
            </div>
          )}

          <div className="text-center mt-4 text-gray-600">
            Showing {indexOfFirstBooking + 1} to {Math.min(indexOfLastBooking, bookings.length)} of {bookings.length} bookings
          </div>
        </>
      )}
    </div>
  );
};

export default ManageBookings;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI, bookingAPI } from '../utils/api';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingDialog, setBookingDialog] = useState(false);
  const [bookingData, setBookingData] = useState({
    startDate: '',
    endDate: '',
    message: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isAvailable, setIsAvailable] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await propertyAPI.getById(id);
      setProperty(response.data);
    } catch (error) {
      console.error('Error fetching property:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonths = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(1, months); // Minimum 1 month
  };

  const checkAvailability = async () => {
    if (!bookingData.startDate || !bookingData.endDate) {
      alert('Please select both dates');
      return;
    }
    
    const months = calculateMonths(bookingData.startDate, bookingData.endDate);
    const calculatedAmount = property.price * months;
    setTotalAmount(calculatedAmount);
    
    setCheckingAvailability(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const isPropertyAvailable = Math.random() > 0.3;
      setIsAvailable(isPropertyAvailable);
      
      if (isPropertyAvailable) {
        setBookingStep(2);
      }
    } catch (error) {
      alert('Error checking availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Razorpay Payment Integration
  const initializeRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    const res = await initializeRazorpay();
    if (!res) {
      alert('Razorpay SDK failed to load. Please check your connection.');
      return;
    }

    // Create order on backend
    try {
      const bookingAmount = totalAmount; // Total amount based on months
      
      const orderResponse = await fetch('http://localhost:5000/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: bookingAmount,
          currency: 'INR',
          propertyId: id,
          bookingData,
          totalAmount: totalAmount
        })
      });
      
      const order = await orderResponse.json();
      
      const options = {
        key: 'rzp_test_xfdz8hdehyaXJT', // Test key
        amount: order.amount,
        currency: order.currency,
        name: 'Real Estate Booking',
        description: `Payment for ${property.title}`,
        order_id: order.id,
        handler: async function (response) {
          console.log('Payment successful:', response);
          try {
            // For now, just create booking directly (you can add verification later)
            const bookingAmount = totalAmount;
            const remainingAmount = 0;
            
            const bookingPayload = {
              propertyId: id,
              startDate: bookingData.startDate,
              endDate: bookingData.endDate,
              message: bookingData.message,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              totalAmount: totalAmount,
              paidAmount: bookingAmount,
              remainingAmount: 0,
              paymentStatus: 'paid'
            };
            
            console.log('Sending booking payload:', bookingPayload);
            const bookingResponse = await bookingAPI.create(bookingPayload);
            console.log('Booking created successfully:', bookingResponse.data);
            console.log('Payment status in response:', bookingResponse.data.paymentStatus);
            
            setBookingDialog(false);
            resetBooking();
            
            // Redirect to payment success page
            navigate(`/payment-success?amount=${bookingAmount}&property=${encodeURIComponent(property.title)}&paymentId=${response.razorpay_payment_id}`);
          } catch (error) {
            console.error('Booking creation error:', error);
            const bookingAmount = totalAmount;
            // Even if booking creation fails, redirect to success page with error info
            navigate(`/payment-success?amount=${bookingAmount}&property=${encodeURIComponent(property.title)}&paymentId=${response.razorpay_payment_id}&error=booking_failed`);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        notes: {
          property_id: id,
          property_title: property.title,
          booking_dates: `${bookingData.startDate} to ${bookingData.endDate}`
        },
        theme: {
          color: '#2563eb'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal dismissed');
            setBookingStep(2); // Go back to payment selection
          },
          confirm_close: true
        },
        retry: {
          enabled: true,
          max_count: 3
        }
      };
      
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      
    } catch (error) {
      console.error('Payment initialization error:', error);
      alert('Failed to initialize payment. Please try again.');
      setBookingStep(2);
    }
  };

  const handleBooking = async () => {
    if (!paymentMethod) {
      alert('Please select payment method');
      return;
    }
    
    setBookingStep(3);
    
    if (paymentMethod === 'razorpay') {
      await handleRazorpayPayment();
    } else {
      // For other payment methods, you can add different integrations
      alert('This payment method will be available soon. Please use Razorpay for now.');
      setBookingStep(2);
    }
  };

  const resetBooking = () => {
    setBookingStep(1);
    setIsAvailable(null);
    setPaymentMethod('');
    setBookingData({ startDate: '', endDate: '', message: '' });
    setTotalAmount(0);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please login to add a review');
      return;
    }
    
    try {
      await propertyAPI.addReview(id, reviewData);
      setReviewData({ rating: 5, comment: '' });
      setShowReviewForm(false);
      fetchProperty(); // Refresh to show new review
      alert('Review added successfully!');
    } catch (error) {
      alert('Error adding review: ' + (error.response?.data?.message || 'Something went wrong'));
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'} fill-current`}
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-lg text-gray-600">Loading...</div></div>;
  if (!property) return <div className="min-h-screen flex items-center justify-center"><div className="text-lg text-gray-600">Property not found</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Property Image Slider */}
            <div className="mb-6 relative">
              <div className="relative h-96 rounded-lg overflow-hidden shadow-lg">
                <img
                  src={
                    property.images?.[currentImageIndex] 
                      ? (property.images[currentImageIndex].startsWith('http') 
                          ? property.images[currentImageIndex] 
                          : `http://localhost:5000${property.images[currentImageIndex]}`)
                      : 'https://via.placeholder.com/800x400?text=No+Image'
                  }
                  alt={property.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/800x400?text=No+Image';
                  }}
                />
                
                {/* Navigation Arrows */}
                {property.images && property.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? property.images.length - 1 : prev - 1)}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition duration-200"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev === property.images.length - 1 ? 0 : prev + 1)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition duration-200"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Image Counter */}
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {property.images.length}
                    </div>
                  </>
                )}
              </div>
              
              {/* Thumbnail Navigation */}
              {property.images && property.images.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {property.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition duration-200 ${
                        currentImageIndex === index ? 'border-blue-500' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={
                          image.startsWith('http') 
                            ? image 
                            : `http://localhost:5000${image}`
                        }
                        alt={`${property.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/80x64?text=No+Image';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Property Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{property.title}</h1>
            
            {/* Location */}
            <div className="flex items-center text-gray-600 mb-6">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-lg">{property.location.address}, {property.location.city}, {property.location.state}</span>
            </div>

            {/* Property Details */}
            <div className="flex flex-wrap gap-6 mb-6">
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span>{property.bedrooms} Bedrooms</span>
              </div>
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span>{property.bathrooms} Bathrooms</span>
              </div>
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span>{property.area} sq ft</span>
              </div>
            </div>

            {/* Rating */}
            {property.rating && (
              <div className="flex items-center mb-6">
                <div className="flex items-center mr-3">
                  {renderStars(Math.round(property.rating))}
                </div>
                <span className="text-lg font-semibold text-gray-700">
                  {property.rating.toFixed(1)} ({property.reviews?.length || 0} reviews)
                </span>
              </div>
            )}

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed">{property.description}</p>
            </div>

            {/* Amenities */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {property.amenities?.map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sticky top-8">
              <div className="text-3xl font-bold text-blue-600 mb-4">
                ₹{property.price.toLocaleString()}/month
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-2">
                  Property Type: <span className="capitalize font-medium">{property.propertyType}</span>
                </p>
                <div className="flex items-center">
                  <div className="flex mr-2">
                    {renderStars(Math.floor(property.rating || 4.5))}
                  </div>
                  <span className="text-sm text-gray-600">
                    ({property.reviews?.length || 0} reviews)
                  </span>
                </div>
              </div>

              {user ? (
                user._id !== property.owner._id ? (
                  <button
                    onClick={() => setBookingDialog(true)}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 mb-3"
                  >
                    Book Now
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-semibold cursor-not-allowed mb-3"
                  >
                    Your Property
                  </button>
                )
              ) : (
                <button
                  onClick={() => window.location.href = '/login'}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 mb-3"
                >
                  Login to Book
                </button>
              )}

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Owner</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {property.owner.name}</p>
                  <p><span className="font-medium">Email:</span> {property.owner.email}</p>
                  {property.owner.phone && (
                    <p><span className="font-medium">Phone:</span> {property.owner.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
            {user && user._id !== property.owner._id && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                {showReviewForm ? 'Cancel' : 'Add Review'}
              </button>
            )}
          </div>

          {/* Add Review Form */}
          {showReviewForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Your Review</h3>
              <form onSubmit={handleReviewSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewData({...reviewData, rating: star})}
                        className={`w-8 h-8 ${star <= reviewData.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition duration-200`}
                      >
                        <svg className="w-full h-full fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                  <textarea
                    rows={4}
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                    required
                    placeholder="Share your experience with this property..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {property.reviews && property.reviews.length > 0 ? (
              property.reviews.map((review, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mr-4">
                      {review.user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</h4>
                      <div className="flex">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No reviews yet. Be the first to review this property!</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Booking Modal */}
        {bookingDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {bookingStep === 1 && 'Select Dates & Check Availability'}
                  {bookingStep === 2 && 'Choose Payment Method'}
                  {bookingStep === 3 && 'Processing Booking...'}
                </h3>
                <button onClick={() => { setBookingDialog(false); resetBooking(); }} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
              
              {/* Step 1: Date Selection */}
              {bookingStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={bookingData.startDate}
                      onChange={(e) => setBookingData({...bookingData, startDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={bookingData.endDate}
                      onChange={(e) => setBookingData({...bookingData, endDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                    <textarea
                      rows={3}
                      value={bookingData.message}
                      onChange={(e) => setBookingData({...bookingData, message: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any special requirements..."
                    />
                  </div>
                  
                  {/* Availability Status */}
                  {isAvailable !== null && (
                    <div className={`p-4 rounded-lg ${isAvailable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-center">
                        {isAvailable ? (
                          <>
                            <span className="text-green-500 mr-2">✅</span>
                            <span className="text-green-800 font-medium">Property Available!</span>
                          </>
                        ) : (
                          <>
                            <span className="text-red-500 mr-2">❌</span>
                            <span className="text-red-800 font-medium">Not Available</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm mt-1 text-gray-600">
                        {isAvailable 
                          ? 'Booking fee: ₹500 (refundable)' 
                          : 'Try different dates or contact owner'
                        }
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { setBookingDialog(false); resetBooking(); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      onClick={checkAvailability}
                      disabled={checkingAvailability || !bookingData.startDate || !bookingData.endDate}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {checkingAvailability ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Checking...
                        </>
                      ) : (
                        'Check Availability'
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Step 2: Payment Method */}
              {bookingStep === 2 && isAvailable && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-2">
                      <span className="text-green-500 mr-2">✅</span>
                      <span className="font-medium text-green-800">Property Available!</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Dates: {new Date(bookingData.startDate).toLocaleDateString()} - {new Date(bookingData.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-green-700 font-medium mt-1">
                      Total Payment: ₹{totalAmount.toLocaleString()} ({calculateMonths(bookingData.startDate, bookingData.endDate)} month{calculateMonths(bookingData.startDate, bookingData.endDate) > 1 ? 's' : ''})
                    </p>
                    <p className="text-xs text-green-600">Secure payment powered by Razorpay</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Payment Method</label>
                    <div className="space-y-3">
                      {/* Razorpay - Recommended */}
                      <label className="flex items-center p-3 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100">
                        <input type="radio" name="payment" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={(e) => setPaymentMethod(e.target.value)} className="mr-3" />
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">💳</span>
                            <div>
                              <div className="font-medium text-blue-800">Razorpay (Recommended)</div>
                              <div className="text-sm text-blue-600">UPI, Cards, Net Banking, Wallets</div>
                            </div>
                          </div>
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">SECURE</span>
                        </div>
                      </label>
                      
                      {/* Other payment methods - Coming Soon */}
                      <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 opacity-60">
                        <input type="radio" name="payment" value="upi" checked={paymentMethod === 'upi'} onChange={(e) => setPaymentMethod(e.target.value)} className="mr-3" disabled />
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">📱</span>
                            <div>
                              <div className="font-medium">Direct UPI</div>
                              <div className="text-sm text-gray-500">Google Pay, PhonePe, Paytm</div>
                            </div>
                          </div>
                          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">SOON</span>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 opacity-60">
                        <input type="radio" name="payment" value="netbanking" checked={paymentMethod === 'netbanking'} onChange={(e) => setPaymentMethod(e.target.value)} className="mr-3" disabled />
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">🏦</span>
                            <div>
                              <div className="font-medium">Direct Net Banking</div>
                              <div className="text-sm text-gray-500">All major banks</div>
                            </div>
                          </div>
                          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">SOON</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setBookingStep(1)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                      Back
                    </button>
                    <button
                      onClick={handleBooking}
                      disabled={!paymentMethod}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      Pay ₹{totalAmount.toLocaleString()} & Book
                    </button>
                  </div>
                </div>
              )}
              
              {/* Step 3: Processing */}
              {bookingStep === 3 && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Processing Booking...</h4>
                  <p className="text-gray-600">Please wait while we process your payment.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyDetail;
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from '@mui/icons-material';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [showAnimation, setShowAnimation] = useState(false);

  const amount = searchParams.get('amount');
  const propertyName = searchParams.get('property');

  useEffect(() => {
    // Start animation after component mounts
    setTimeout(() => setShowAnimation(true), 100);
  }, []);

  const handleViewBookings = () => {
    navigate('/manage-bookings');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-6 transform transition-all duration-1000 ${
            showAnimation ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
          }`}>
            <CheckCircle 
              className={`text-green-500 transform transition-all duration-1000 delay-300 ${
                showAnimation ? 'scale-100' : 'scale-0'
              }`} 
              style={{ fontSize: '3rem' }}
            />
          </div>
          
          {/* Success Message */}
          <div className={`transform transition-all duration-800 delay-500 ${
            showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Payment Successful! 🎉
            </h1>
            <p className="text-gray-600 mb-6">
              Your booking has been confirmed successfully
            </p>
          </div>
        </div>

        {/* Payment Details Card */}
        <div className={`bg-white rounded-2xl shadow-xl p-6 mb-6 transform transition-all duration-800 delay-700 ${
          showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-xl">💰</span>
              </div>
            </div>
            
            {amount && (
              <div className="mb-4">
                <p className="text-sm text-gray-500">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600">₹{parseInt(amount).toLocaleString()}</p>
              </div>
            )}
            
            {propertyName && (
              <div className="mb-4">
                <p className="text-sm text-gray-500">Property</p>
                <p className="text-lg font-semibold text-gray-800">{decodeURIComponent(propertyName)}</p>
              </div>
            )}
            
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-700">
                <span className="font-semibold">✓ Booking Confirmed</span><br/>
                You will receive a confirmation email shortly
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`space-y-3 transform transition-all duration-800 delay-900 ${
          showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <button
            onClick={handleViewBookings}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            View My Bookings
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
          >
            Back to Home
          </button>
        </div>

        {/* Success Message */}
        <div className={`text-center mt-6 transform transition-all duration-800 delay-1100 ${
          showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3">
            <p className="text-sm text-gray-600">
              🎉 Your booking is confirmed! Choose an option below to continue.
            </p>
          </div>
        </div>

        {/* Floating Particles Animation */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 bg-green-400 rounded-full animate-bounce opacity-60 ${
                showAnimation ? 'animate-pulse' : ''
              }`}
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 40}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${2 + i * 0.3}s`
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
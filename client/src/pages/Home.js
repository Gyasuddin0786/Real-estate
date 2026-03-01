import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyAPI, statsAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [counters, setCounters] = useState({ properties: 0, users: 0, bookings: 0, cities: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const statsRef = useRef(null);
  const navigate = useNavigate();

  const fullText = 'Find Your Perfect Dream Home';

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypewriterText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Counter animation function
  const animateCounter = (target, duration, key) => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCounters(prev => ({ ...prev, [key]: target }));
        clearInterval(timer);
      } else {
        setCounters(prev => ({ ...prev, [key]: Math.floor(start) }));
      }
    }, 16);
  };

  // Intersection Observer for stats animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            fetchStats();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      if (statsRef.current) {
        observer.unobserve(statsRef.current);
      }
    };
  }, [hasAnimated]);

  useEffect(() => {
    fetchFeaturedProperties();
    fetchStats();
  }, []);

  const fetchFeaturedProperties = async () => {
    try {
      const response = await propertyAPI.getFeatured();
      setFeaturedProperties(response.data);
    } catch (error) {
      try {
        const fallbackResponse = await propertyAPI.getAll({ limit: 8 });
        setFeaturedProperties(fallbackResponse.data.properties || []);
      } catch (fallbackError) {
        setFeaturedProperties([]);
      }
    }
  };

  const fetchStats = async () => {
    try {
      const response = await statsAPI.getStats();
      const stats = response.data;
      // Animate with real data
      animateCounter(stats.properties || 250, 2000, 'properties');
      animateCounter(stats.users || 1200, 2500, 'users');
      animateCounter(stats.bookings || 180, 1800, 'bookings');
      animateCounter(stats.cities || 35, 1500, 'cities');
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Use fallback values if API fails
      animateCounter(250, 2000, 'properties');
      animateCounter(1200, 2500, 'users');
      animateCounter(180, 1800, 'bookings');
      animateCounter(35, 1500, 'cities');
    }
  };

  const handleSearch = () => {
    navigate(`/properties?city=${searchQuery}`);
  };

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white py-20 lg:py-32" style={{backgroundImage: 'url(/main.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'overlay'}}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center">
            
            <h1 className="text-3xl lg:text-5xl font-bold leading-tight min-h-[120px] lg:min-h-[160px]">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                {typewriterText}
                <span className="animate-pulse">|</span>
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl mb-12 opacity-90 max-w-3xl mx-auto leading-relaxed">
              Discover premium properties with modern amenities in prime locations. 
              Your perfect home is just a click away! 🏡✨
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="max-w-4xl mx-auto mb-12">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter city, area, or landmark..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-14 pr-4 py-4 text-lg text-gray-700 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    Search Properties
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { label: 'Apartments', icon: '🏢' },
                { label: 'Houses', icon: '🏠' },
                { label: 'Villas', icon: '🏡' },
                { label: 'Studios', icon: '🏬' }
              ].map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate(`/properties?propertyType=${item.label.toLowerCase()}`)}
                  className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-6 py-3 rounded-full transition-all duration-200 hover:scale-105"
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div ref={statsRef} className="bg-gradient-to-r from-stone-900 to-zinc-800 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              🚀 Our Success Story
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Trusted by thousands of property owners and tenants across India
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { key: 'properties', icon: '🏠', title: 'Properties Listed', suffix: '+', color: 'from-blue-500 to-cyan-500' },
              { key: 'users', icon: '👥', title: 'Happy Users', suffix: '+', color: 'from-green-500 to-emerald-500' },
              { key: 'bookings', icon: '📋', title: 'Successful Bookings', suffix: '+', color: 'from-purple-500 to-pink-500' },
              { key: 'cities', icon: '🌆', title: 'Cities Covered', suffix: '+', color: 'from-orange-500 to-red-500' }
            ].map((stat, index) => (
              <div key={index} className="text-center group">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r ${stat.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-3xl">{stat.icon}</span>
                </div>
                <div className="text-4xl lg:text-5xl font-bold text-white mb-2">
                  {counters[stat.key]}{stat.suffix}
                </div>
                <p className="text-gray-300 text-lg">{stat.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gradient-to-b from-stone-50 to-neutral-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              ✨ Why Choose PropertyRent?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience hassle-free property rental with our premium services and cutting-edge technology
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { 
                icon: '🔒', 
                title: 'Verified Properties', 
                desc: 'All properties are thoroughly verified and authenticated by our expert team',
                color: 'from-blue-500 to-cyan-500'
              },
              { 
                icon: '🎧', 
                title: '24/7 Support', 
                desc: 'Round-the-clock customer support to assist you at every step',
                color: 'from-green-500 to-emerald-500'
              },
              { 
                icon: '⭐', 
                title: 'Premium Quality', 
                desc: 'Handpicked premium properties with modern amenities and facilities',
                color: 'from-purple-500 to-pink-500'
              },
              { 
                icon: '📈', 
                title: 'Best Prices', 
                desc: 'Competitive and transparent pricing with no hidden charges',
                color: 'from-orange-500 to-red-500'
              }
            ].map((feature, index) => (
              <div key={index} className="group">
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-2xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Properties */}
      <div className="py-20 bg-stone-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              🏆 Featured Properties
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Handpicked premium properties that offer the perfect blend of comfort, luxury, and convenience
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {featuredProperties.slice(0, 8).map((property) => (
              <div
                key={property._id}
                onClick={() => navigate(`/property/${property._id}`)}
                className="group cursor-pointer"
              >
                <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={
                        property.images?.[0] 
                          ? (property.images[0].startsWith('http') 
                              ? property.images[0] 
                              : `http://localhost:5000${property.images[0]}`)
                          : 'https://via.placeholder.com/400x300?text=No+Image'
                      }
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                      }}
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold uppercase">
                        {property.propertyType}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{property.title}</h3>
                    
                    <div className="flex items-center text-gray-500 mb-4">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span className="truncate">{property.location?.city}, {property.location?.state}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                      <span className="flex items-center">
                        <span className="font-semibold">{property.bedrooms}</span> beds
                      </span>
                      <span className="flex items-center">
                        <span className="font-semibold">{property.bathrooms}</span> baths
                      </span>
                      <span className="flex items-center">
                        <span className="font-semibold">{property.area}</span> sq ft
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        ₹{property.price.toLocaleString()}/mo
                      </div>
                      <div className="flex items-center text-yellow-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="ml-1 text-sm font-semibold">{property.rating || 4.5}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {featuredProperties.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏠</div>
              <h3 className="text-2xl font-bold text-gray-600 mb-2">No properties available yet</h3>
              <p className="text-gray-500 mb-8">Be the first to add a property to our platform!</p>
              <button 
                onClick={() => navigate('/add-property')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold"
              >
                Add Property
              </button>
            </div>
          )}
          
          <div className="text-center mt-12">
            <button 
              onClick={() => navigate('/properties')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-4 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              View All Properties →
            </button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-slate-700 to-stone-800 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Find Your Dream Home? 🎯
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of satisfied customers who found their perfect property through our platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/properties')}
              className="bg-white text-blue-600 px-8 py-4 rounded-full hover:bg-gray-100 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🔍 Browse Properties
            </button>
            <button 
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="bg-yellow-500 text-gray-900 px-8 py-4 rounded-full hover:bg-yellow-400 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {user ? '📊 Go to Dashboard' : '🚀 Get Started Free'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ChatBot.css';

const ChatBotSimple = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState(user?.name || '');
  const [userContext, setUserContext] = useState({ step: user ? 'main' : 'greeting', preferences: {} });
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: user ? 
        `Hi ${user.name}! Welcome back to your Real Estate Dashboard. How can I help you today?` :
        "Hi! I'm your Real Estate Assistant. What's your name?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  // // Website Pages & Features (Based on actual website structure)
  // const websiteFeatures = {
  //   pages: {
  //     home: 'Homepage with featured properties and search',
  //     properties: 'Browse all properties with filters',
  //     propertyDetail: 'Detailed property information and booking',
  //     dashboard: 'User/Owner dashboard with analytics',
  //     profile: 'Manage your profile and preferences',
  //     login: 'User authentication',
  //     register: 'Create new account',
  //     addProperty: 'List new property (Owner only)',
  //     manageProperties: 'Edit/manage listings (Owner only)',
  //     editProperty: 'Update property details (Owner only)'
  //   },
  //   features: {
  //     search: 'Search properties by city, area, type',
  //     filters: 'Filter by price, bedrooms, amenities',
  //     booking: 'Schedule property visits',
  //     messaging: 'Chat with owners/tenants',
  //     analytics: 'Property performance stats',
  //     favorites: 'Save properties to wishlist',
  //     reviews: 'Rate and review properties'
  //   }
  // };

  const [allProperties, setAllProperties] = useState([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);

  // Fetch real properties from database
  const fetchProperties = async () => {
    try {
      setIsLoadingProperties(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/properties`);
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      setAllProperties(data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      // Fallback data if API fails
      setAllProperties([
        { _id: '1', title: 'Luxury Apartment', price: 7500000, location: 'City Center', type: 'apartment', bedrooms: 3, bathrooms: 2, area: 1200, amenities: ['parking', 'gym', 'pool'], available: true },
        { _id: '2', title: 'Modern Flat', price: 4500000, location: 'Suburbs', type: 'apartment', bedrooms: 2, bathrooms: 2, area: 900, amenities: ['parking', 'garden'], available: true },
        { _id: '3', title: 'Premium Villa', price: 12000000, location: 'IT Hub', type: 'house', bedrooms: 4, bathrooms: 3, area: 2000, amenities: ['parking', 'gym', 'pool', 'garden'], available: true },
        { _id: '4', title: '3BHK Villa', price: 15000000, location: 'Waterfront', type: 'house', bedrooms: 3, bathrooms: 2, area: 1800, amenities: ['parking', 'pool', 'garden'], available: false },
        { _id: '5', title: 'Independent House', price: 8500000, location: 'Green Valley', type: 'house', bedrooms: 3, bathrooms: 2, area: 1500, amenities: ['parking', 'garden'], available: true },
        { _id: '6', title: 'Luxury Villa', price: 28000000, location: 'Premium Area', type: 'house', bedrooms: 5, bathrooms: 4, area: 3000, amenities: ['parking', 'gym', 'pool', 'garden', 'security'], available: true },
        { _id: '7', title: 'Office Space', price: 35000000, location: 'Business District', type: 'commercial', area: 5000, amenities: ['parking', 'elevator', 'security'], available: true },
        { _id: '8', title: 'Shop', price: 6500000, location: 'Market Area', type: 'commercial', area: 800, amenities: ['parking'], available: true },
        { _id: '9', title: 'Warehouse', price: 18000000, location: 'Industrial Zone', type: 'commercial', area: 10000, amenities: ['parking', 'security'], available: true }
      ]);
    } finally {
      setIsLoadingProperties(false);
    }
  };

  // Load properties on component mount
  React.useEffect(() => {
    fetchProperties();
  }, []);

  const getUserRole = () => {
    if (!user) return 'guest';
    return user.role === 'owner' ? 'owner' : 'user';
  };

  // Smart AI-like response generation
  const getResponse = (message) => {
    const msg = message.toLowerCase().trim();
    const userRole = getUserRole();
    
    // Name detection for guests only
    if (userContext.step === 'greeting' && !user && !userName) {
      const nameMatch = message.match(/(?:my name is|i am|i'm|call me)\s+([a-zA-Z]+)/i) || 
                       message.match(/^([a-zA-Z]+)$/); // Single word as name
      
      if (nameMatch) {
        const detectedName = nameMatch[1] || nameMatch[0];
        setUserName(detectedName);
        setUserContext({ step: 'main', preferences: {} });
        return `Nice to meet you, ${detectedName}! 😊 I have access to ${allProperties.length} properties in our database. I can help you find the perfect match based on your budget, location, and preferences. What are you looking for?`;
      } else {
        return "Please tell me your name so I can assist you better!";
      }
    }

    // Smart budget detection
    const budgetMatch = msg.match(/(\d+)\s*(lakh|crore|l|cr|k|thousand)/i);
    if (budgetMatch) {
      const amount = parseInt(budgetMatch[1]);
      const unit = budgetMatch[2].toLowerCase();
      let budget = amount;
      
      if (unit.includes('crore') || unit.includes('cr')) {
        budget = amount * 10000000;
      } else if (unit.includes('lakh') || unit.includes('l')) {
        budget = amount * 100000;
      } else if (unit.includes('thousand') || unit.includes('k')) {
        budget = amount * 1000;
      }
      
      return handleBudgetBasedSearch(budget, msg);
    }

    // Location-based search
    const locations = ['city center', 'suburbs', 'it hub', 'waterfront', 'green valley', 'premium area', 'business district', 'market area', 'industrial zone'];
    const mentionedLocation = locations.find(loc => msg.includes(loc));
    if (mentionedLocation) {
      return handleLocationBasedSearch(mentionedLocation);
    }

    // Property type detection
    if (msg.includes('apartment') || msg.includes('flat')) {
      return handlePropertyTypeSearch('apartment');
    }
    if (msg.includes('house') || msg.includes('villa') || msg.includes('bungalow')) {
      return handlePropertyTypeSearch('house');
    }
    if (msg.includes('commercial') || msg.includes('office') || msg.includes('shop') || msg.includes('warehouse')) {
      return handlePropertyTypeSearch('commercial');
    }

    // Price range queries
    if (msg.includes('cheapest') || msg.includes('lowest price') || msg.includes('budget properties')) {
      return handlePriceRangeQuery('lowest');
    }
    if (msg.includes('expensive') || msg.includes('highest price') || msg.includes('luxury') || msg.includes('premium')) {
      return handlePriceRangeQuery('highest');
    }
    if (msg.includes('middle') || msg.includes('mid range') || msg.includes('average price')) {
      return handlePriceRangeQuery('middle');
    }

    // Availability check
    if (msg.includes('available') || msg.includes('ready to move') || msg.includes('immediate')) {
      return handleAvailabilityQuery();
    }

    // Booking process guidance
    if (msg.includes('booking process') || msg.includes('how to book') || msg.includes('booking steps')) {
      return handleBookingRequest(userRole);
    }

    // Amenities search
    const amenities = ['gym', 'pool', 'parking', 'garden', 'security', 'elevator'];
    const mentionedAmenity = amenities.find(amenity => msg.includes(amenity));
    if (mentionedAmenity) {
      return handleAmenitySearch(mentionedAmenity);
    }

    // Area/size based search
    const areaMatch = msg.match(/(\d+)\s*(sqft|sq ft|square feet)/i);
    if (areaMatch) {
      const area = parseInt(areaMatch[1]);
      return handleAreaBasedSearch(area);
    }

    // Website navigation help
    if (msg.includes('how to') || msg.includes('navigate') || msg.includes('website') || msg.includes('features')) {
      return handleWebsiteNavigation(userRole);
    }

    // Page-specific help
    if (msg.includes('dashboard') || msg.includes('my dashboard')) {
      return handleDashboardHelp(userRole);
    }
    
    if (msg.includes('home') || msg.includes('homepage') || msg.includes('main page')) {
      return handleHomePageHelp();
    }

    // Owner-specific features
    if (userRole === 'owner') {
      if (msg.includes('list') || msg.includes('add property') || msg.includes('sell')) {
        return handleOwnerListProperty();
      }
      if (msg.includes('manage') || msg.includes('edit') || msg.includes('update listing')) {
        return handleOwnerManageListings();
      }
      if (msg.includes('inquiries') || msg.includes('leads') || msg.includes('buyers')) {
        return handleOwnerInquiries();
      }
      if (msg.includes('analytics') || msg.includes('performance') || msg.includes('stats')) {
        return handleOwnerAnalytics();
      }
    }

    // User-specific features
    if (userRole === 'user') {
      if (msg.includes('buy') || msg.includes('purchase')) {
        return handleUserBuyProperty();
      }
      if (msg.includes('rent') || msg.includes('rental')) {
        return handleUserRentProperty();
      }
      if (msg.includes('saved') || msg.includes('favorite') || msg.includes('wishlist')) {
        return handleUserSavedProperties();
      }
      if (msg.includes('profile') || msg.includes('account') || msg.includes('settings')) {
        return handleUserProfile();
      }
      if (msg.includes('mortgage') || msg.includes('loan') || msg.includes('emi')) {
        return handleMortgageCalculator();
      }
    }

    // Common features for all
    if (msg.includes('property') || msg.includes('show') || msg.includes('find')) {
      return handlePropertySearch(msg, userRole);
    }
    
    if (msg.includes('price') || msg.includes('cost') || msg.includes('budget')) {
      return handlePriceInquiry(msg, userRole);
    }
    
    if (msg.includes('contact') || msg.includes('agent') || msg.includes('call')) {
      return handleContactRequest(userRole);
    }
    
    if (msg.includes('book') || msg.includes('visit') || msg.includes('appointment')) {
      return handleBookingRequest(userRole);
    }
    
    if (msg.includes('location') || msg.includes('area') || msg.includes('where')) {
      return handleLocationInquiry(userRole);
    }
    
    if (msg.includes('help') || msg.includes('assist')) {
      return handleHelpRequest(userRole);
    }

    if (msg.includes('register') || msg.includes('signup') || msg.includes('create account')) {
      return handleRegistrationHelp();
    }
    
    if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey')) {
      const name = user?.name || userName;
      if (userRole === 'owner') {
        return `Hello ${name}! As a property owner, I can help you manage listings, view inquiries, and track analytics. What do you need?`;
      } else if (userRole === 'user') {
        return `Hello ${name}! I can help you buy/rent properties, manage favorites, and book visits. What are you looking for?`;
      } else {
        return name ? `Hello ${name}! I can help you browse properties and connect with agents. What interests you?` : "Hi there! What's your name?";
      }
    }
    
    if (msg.includes('bye') || msg.includes('thanks') || msg.includes('thank you')) {
      const name = user?.name || userName;
      return name ? 
        `You're welcome ${name}! Feel free to reach out anytime for assistance! 🏠` :
        "Thank you for visiting! Have a great day! 🏠";
    }
    
    // Default response based on role
    const name = user?.name || userName;
    if (userRole === 'owner') {
      return `${name}, I can help you with property listings, managing inquiries, analytics, and lead management. What do you need?`;
    } else if (userRole === 'user') {
      return `${name}, I can help you buy/rent properties, manage favorites, book visits, and calculate mortgages. What interests you?`;
    } else {
      return name ? 
        `${name}, I can help you browse properties, get pricing info, and contact agents. Want to register for more features?` :
        "I can help you with properties, prices, and agent contact. What would you like to know?";
    }
  };

  // Website navigation handlers
  const handleWebsiteNavigation = (role) => {
    const name = user?.name || userName;
    
    if (role === 'owner') {
      return `${name}, here's how to use our platform as a **PROPERTY OWNER**:\n\n🏠 **PROPERTY MANAGEMENT:**\n• Go to Dashboard → Add Property (list new properties)\n• Dashboard → Manage Properties (edit existing listings)\n• View booking requests and inquiries\n• Track property performance analytics\n\n💬 **COMMUNICATION:**\n• Dashboard → Messages (chat with potential tenants)\n• Respond to booking requests\n• Manage property inquiries\n\n📊 **ANALYTICS:**\n• View property views and clicks\n• Track booking conversion rates\n• Monitor revenue and bookings\n\nWhich feature would you like help with?`;
    } else if (role === 'user') {
      return `${name}, here's how to use our platform as a **TENANT/BUYER**:\n\n🔍 **PROPERTY SEARCH:**\n• Homepage → Search by city/area\n• Properties page → Use filters (price, type, amenities)\n• Save favorites for later viewing\n\n📅 **BOOKING & VISITS:**\n• Property Detail page → Book a visit\n• Dashboard → View your bookings\n• Chat with property owners\n\n👤 **ACCOUNT MANAGEMENT:**\n• Dashboard → View booking history\n• Profile → Update personal information\n• Messages → Communicate with owners\n\nWhat would you like to do?`;
    } else {
      return `${name}, here's how to navigate our **REAL ESTATE PLATFORM**:\n\n🏠 **BROWSE PROPERTIES:**\n• Homepage → Use search bar (city, area, landmark)\n• Properties page → Browse all listings\n• Use filters: price, bedrooms, property type\n\n📝 **GET STARTED:**\n• Register → Create account (free)\n• Login → Access saved properties\n• Contact agents for assistance\n\n🎯 **QUICK ACTIONS:**\n• Search: "properties in [city]"\n• Filter: "3BHK under 50 lakh"\n• Contact: "call agent" or "WhatsApp"\n\nReady to find your dream home?`;
    }
  };

  const handleDashboardHelp = (role) => {
    const name = user?.name || userName;
    
    if (role === 'owner') {
      return `${name}, your **OWNER DASHBOARD** includes:\n\n📊 **ANALYTICS SECTION:**\n• Total bookings and revenue\n• Monthly booking trends\n• Property performance charts\n• Booking status distribution\n\n💬 **MESSAGES:**\n• Real-time chat with tenants\n• Booking inquiries and responses\n• File sharing and emoji support\n• Typing indicators\n\n📋 **BOOKING MANAGEMENT:**\n• Accept/decline booking requests\n• View tenant details and duration\n• Track payment status\n• Manage property visits\n\nNeed help with any specific section?`;
    } else {
      return `${name}, your **USER DASHBOARD** includes:\n\n📊 **OVERVIEW:**\n• Your booking history\n• Saved/favorite properties\n• Recent property views\n• Account statistics\n\n💬 **COMMUNICATION:**\n• Chat with property owners\n• Booking confirmations\n• Property inquiry responses\n• Real-time messaging\n\n📅 **BOOKINGS:**\n• View all your bookings\n• Track booking status\n• Schedule property visits\n• Payment history\n\nWhat would you like to check?`;
    }
  };

  const handleHomePageHelp = () => {
    const name = user?.name || userName;
    return `${name}, our **HOMEPAGE** offers:\n\n🔍 **SMART SEARCH:**\n• Search by city, area, or landmark\n• Quick filters: Apartments, Houses, Villas, Studios\n• Advanced search with multiple criteria\n\n🏆 **FEATURED PROPERTIES:**\n• Handpicked premium properties\n• Latest listings with photos\n• Price range and location details\n• Direct booking options\n\n📊 **PLATFORM STATS:**\n• 250+ properties listed\n• 1200+ happy users\n• 180+ successful bookings\n• 35+ cities covered\n\n✨ **KEY FEATURES:**\n• Verified properties\n• 24/7 support\n• Premium quality\n• Best prices\n\nReady to start your property search?`;
  };

  const handleOwnerListProperty = () => {
    const name = user?.name || userName;
    return `${name}, here's how to **LIST A NEW PROPERTY**:\n\n📝 **STEP-BY-STEP PROCESS:**\n\n1️⃣ **Navigate:** Dashboard → Add Property button\n\n2️⃣ **BASIC DETAILS:**\n• Property title and description\n• Property type (apartment/house/commercial)\n• Bedrooms, bathrooms, area (sq ft)\n\n3️⃣ **LOCATION INFO:**\n• Full address with city and state\n• Nearby landmarks\n• Area/locality details\n\n4️⃣ **PRICING:**\n• Monthly rent or sale price\n• Security deposit (if rental)\n• Maintenance charges\n\n5️⃣ **PHOTOS & AMENITIES:**\n• Upload high-quality images\n• Select amenities (gym, pool, parking, etc.)\n• Property features and highlights\n\n6️⃣ **CONTACT & AVAILABILITY:**\n• Your contact information\n• Available from date\n• Preferred tenant type\n\n✅ **TIPS FOR SUCCESS:**\n• Use clear, attractive photos\n• Write detailed descriptions\n• Set competitive pricing\n• Respond quickly to inquiries\n\nReady to list your property?`;
  };

  const handleOwnerManageListings = () => {
    const name = user?.name || userName;
    return `${name}, **MANAGE YOUR PROPERTY LISTINGS**:\n\n🏠 **ACCESS:** Dashboard → Manage Properties\n\n🔧 **AVAILABLE ACTIONS:**\n\n📝 **EDIT PROPERTIES:**\n• Update title, description, price\n• Change photos and amenities\n• Modify location details\n• Update availability status\n\n📊 **TRACK PERFORMANCE:**\n• View property views and clicks\n• Monitor inquiry rates\n• Check booking requests\n• See user engagement\n\n💰 **PRICING MANAGEMENT:**\n• Adjust rent/sale prices\n• Update security deposits\n• Modify maintenance charges\n• Set seasonal pricing\n\n🎯 **LISTING OPTIMIZATION:**\n• Mark as available/unavailable\n• Feature property for better visibility\n• Update property status (sold/rented)\n• Refresh listing dates\n\n📱 **QUICK ACTIONS:**\n• Bulk edit multiple properties\n• Clone similar listings\n• Archive old properties\n• Export property data\n\nWhich property needs attention?`;
  };

  const handleOwnerInquiries = () => {
    const name = user?.name || userName;
    return `${name}, **MANAGE PROPERTY INQUIRIES**:\n\n📬 **ACCESS:** Dashboard → Messages & Bookings\n\n📋 **INQUIRY DETAILS:**\n\n👤 **TENANT INFORMATION:**\n• Full name and contact details\n• Budget range and preferences\n• Move-in date requirements\n• Family size and occupation\n\n🏠 **PROPERTY INTEREST:**\n• Which property they're interested in\n• Specific questions about amenities\n• Requested visit dates/times\n• Special requirements or concerns\n\n💬 **COMMUNICATION TOOLS:**\n• Real-time chat messaging\n• File sharing (documents, photos)\n• Booking request management\n• Automated responses\n\n⚡ **QUICK ACTIONS:**\n• Accept/decline booking requests\n• Schedule property visits\n• Send property details\n• Share additional photos\n\n📊 **INQUIRY ANALYTICS:**\n• Response time tracking\n• Conversion rates\n• Popular property features\n• Peak inquiry times\n\n🎯 **BEST PRACTICES:**\n• Respond within 2 hours\n• Be detailed in responses\n• Share high-quality photos\n• Offer flexible visit times\n\nReady to check your inquiries?`;
  };

  const handleOwnerAnalytics = () => {
    const name = user?.name || userName;
    return `${name}, **COMPREHENSIVE PROPERTY ANALYTICS**:\n\n📊 **DASHBOARD OVERVIEW:**\n\n📈 **PERFORMANCE METRICS:**\n• Total bookings and revenue\n• Monthly booking trends (line chart)\n• Booking status distribution (pie chart)\n• Property view statistics\n\n💰 **REVENUE TRACKING:**\n• Total earnings from confirmed bookings\n• Monthly revenue patterns\n• Average booking value\n• Revenue per property\n\n📅 **BOOKING ANALYTICS:**\n• Confirmed vs pending bookings\n• Seasonal booking trends\n• Average booking duration\n• Cancellation rates\n\n🎯 **PROPERTY PERFORMANCE:**\n• Most viewed properties\n• Highest converting listings\n• Properties with most inquiries\n• Average response times\n\n📱 **USER ENGAGEMENT:**\n• Profile views and clicks\n• Message response rates\n• Booking conversion funnel\n• User retention metrics\n\n🔍 **MARKET INSIGHTS:**\n• Competitive pricing analysis\n• Area-wise demand patterns\n• Popular amenities trends\n• Optimal pricing suggestions\n\n📊 **VISUAL REPORTS:**\n• Interactive charts and graphs\n• Monthly/yearly comparisons\n• Export data functionality\n• Custom date range analysis\n\nWhich metric interests you most?`;
  };

  const handleUserBuyProperty = () => {
    const name = user?.name || userName;
    return `${name}, here's how to **BUY PROPERTIES** on our platform:\n\n🏠 **PROPERTY SEARCH:**\n• Browse → Properties for Sale\n• Use advanced filters (budget, location, type)\n• Check real-time availability status\n• View detailed property information\n\n💰 **BUDGET PLANNING:**\n• Property price + registration (8-10%)\n• Home loan processing (1-2%)\n• Legal verification (₹10,000-₹25,000)\n• Interior/renovation costs\n\n📋 **BUYING PROCESS:**\n\n1️⃣ **Property Selection & Visit**\n• Schedule property visit (₹500 booking)\n• Physical inspection with expert\n• Verify all documents and approvals\n• Negotiate price with owner\n\n2️⃣ **Legal Verification**\n• Title deed verification\n• Encumbrance certificate check\n• Approval certificates validation\n• Legal clearance report\n\n3️⃣ **Loan Arrangement (if needed)**\n• Home loan pre-approval\n• Bank valuation process\n• Loan documentation\n• Disbursement coordination\n\n4️⃣ **Agreement & Registration**\n• Sale agreement drafting\n• Token amount payment (1-10%)\n• Registration at sub-registrar office\n• Final payment and possession\n\n💳 **PAYMENT OPTIONS:**\n• Bank transfer (RTGS/NEFT)\n• Demand draft\n• Cashier's cheque\n• Digital payment (for token amount)\n\nReady to start your property buying journey?`;
  };

  const handleUserRentProperty = () => {
    const name = user?.name || userName;
    return `${name}, here's how to **RENT PROPERTIES** on our platform:\n\n🏠 **RENTAL SEARCH:**\n• Browse → Properties for Rent\n• Filter by monthly budget and location\n• Check immediate availability\n• View virtual tours and photos\n\n💰 **RENTAL BUDGET PLANNING:**\n\n📊 **MONTHLY COSTS:**\n• Rent: ₹10K - ₹1L+ (based on location)\n• Maintenance: ₹1K - ₹5K\n• Utilities: ₹2K - ₹8K (electricity, water, gas)\n• Internet/Cable: ₹1K - ₹2K\n\n💳 **UPFRONT PAYMENTS:**\n• Security Deposit: 1-3 months rent\n• First Month Rent: Advance\n• Brokerage: 0-1 month (if applicable)\n• Agreement: ₹1K - ₹5K\n\n📋 **RENTAL PROCESS:**\n\n1️⃣ **Property Visit & Selection**\n• Book visit slot (₹500 - refundable)\n• Physical property inspection\n• Amenities verification\n• Neighborhood assessment\n\n2️⃣ **Application & Approval**\n• Submit rental application\n• Provide required documents\n• Background verification\n• Owner approval process\n\n3️⃣ **Agreement & Payment**\n• Digital rental agreement\n• Security deposit payment\n• First month rent advance\n• Agreement registration\n\n4️⃣ **Move-in Process**\n• Property handover checklist\n• Utility connections transfer\n• Key collection ceremony\n• Move-in coordination\n\n✅ **AVAILABILITY CHECK:**\n• Real-time availability status\n• Instant booking for ready properties\n• Waitlist for popular properties\n• Alternative suggestions\n\n💳 **PAYMENT METHODS:**\n• UPI (Google Pay, PhonePe, Paytm)\n• Net Banking (all major banks)\n• Debit/Credit Cards\n• Digital Wallets\n\nWhat's your preferred monthly budget range?`;
  };

  const handleUserSavedProperties = () => {
    return `${user.name}, manage your saved properties:\n\n❤️ Dashboard → Saved Properties\n\n📋 You can:\n• View all favorites\n• Compare properties\n• Schedule visits\n• Remove from list\n\nWant to see your saved properties?`;
  };

  const handleUserProfile = () => {
    return `${user.name}, manage your profile:\n\n👤 Dashboard → Profile\n\n✏️ Update:\n• Personal information\n• Contact details\n• Property preferences\n• Budget range\n\nWhat would you like to update?`;
  };

  const handleMortgageCalculator = () => {
    return `${user.name}, calculate your home loan:\n\n🧮 Tools → Mortgage Calculator\n\n📊 Calculate:\n• EMI amount\n• Loan eligibility\n• Interest rates\n• Total payment\n\nWhat's your desired loan amount?`;
  };

  const handleRegistrationHelp = () => {
    return "Create an account to unlock premium features:\n\n🎯 User Benefits:\n• Save favorite properties\n• Book property visits\n• Get personalized recommendations\n• Access mortgage calculator\n\n🏠 Owner Benefits:\n• List unlimited properties\n• Manage inquiries\n• View analytics\n• Lead management\n\nReady to register?";
  };

  // Smart AI-like handlers
  const handleBudgetBasedSearch = (budget, originalMsg) => {
    const name = user?.name || userName;
    const matchingProperties = allProperties.filter(prop => {
      const propPrice = prop.price;
      return propPrice <= budget * 1.1 && propPrice >= budget * 0.8; // 10% tolerance
    }).sort((a, b) => Math.abs(a.price - budget) - Math.abs(b.price - budget));

    if (matchingProperties.length === 0) {
      const closestProperties = allProperties
        .sort((a, b) => Math.abs(a.price - budget) - Math.abs(b.price - budget))
        .slice(0, 3);
      
      return `${name}, I couldn't find exact matches for ₹${formatPrice(budget)}, but here are the closest options:\n\n${formatPropertyList(closestProperties)}\n\nWould you like to adjust your budget or see more options?`;
    }

    return `Perfect ${name}! I found ${matchingProperties.length} properties within your budget of ₹${formatPrice(budget)}:\n\n${formatPropertyList(matchingProperties.slice(0, 3))}\n\nWould you like to see more options or filter by location/type?`;
  };

  const handleLocationBasedSearch = (location) => {
    const name = user?.name || userName;
    const locationProperties = allProperties.filter(prop => 
      prop.location.toLowerCase().includes(location)
    );

    if (locationProperties.length === 0) {
      return `${name}, I don't have properties in ${location} right now. Here are nearby areas with available properties:\n\n${getAvailableLocations()}`;
    }

    const priceRange = {
      min: Math.min(...locationProperties.map(p => p.price)),
      max: Math.max(...locationProperties.map(p => p.price))
    };

    return `Great choice ${name}! ${location.toUpperCase()} has ${locationProperties.length} properties available.\n\n💰 Price Range: ₹${formatPrice(priceRange.min)} - ₹${formatPrice(priceRange.max)}\n\n${formatPropertyList(locationProperties.slice(0, 3))}\n\nWant to filter by budget or property type?`;
  };

  const handlePropertyTypeSearch = (type) => {
    const name = user?.name || userName;
    const typeProperties = allProperties.filter(prop => prop.type === type);
    
    const stats = {
      total: typeProperties.length,
      available: typeProperties.filter(p => p.available).length,
      avgPrice: typeProperties.reduce((sum, p) => sum + p.price, 0) / typeProperties.length
    };

    return `${name}, here's what I found for ${type}s:\n\n📊 **${type.toUpperCase()} STATISTICS:**\n• Total listings: ${stats.total}\n• Available now: ${stats.available}\n• Average price: ₹${formatPrice(stats.avgPrice)}\n\n🏠 **TOP RECOMMENDATIONS:**\n${formatPropertyList(typeProperties.filter(p => p.available).slice(0, 3))}\n\nNeed specific budget or location filtering?`;
  };

  const handlePriceRangeQuery = (range) => {
    const name = user?.name || userName;
    let properties = [];
    let title = '';

    if (range === 'lowest') {
      properties = allProperties.sort((a, b) => a.price - b.price).slice(0, 5);
      title = 'MOST AFFORDABLE PROPERTIES';
    } else if (range === 'highest') {
      properties = allProperties.sort((a, b) => b.price - a.price).slice(0, 5);
      title = 'LUXURY/PREMIUM PROPERTIES';
    } else {
      const sortedProps = allProperties.sort((a, b) => a.price - b.price);
      const midIndex = Math.floor(sortedProps.length / 2);
      properties = sortedProps.slice(midIndex - 2, midIndex + 3);
      title = 'MID-RANGE PROPERTIES';
    }

    return `${name}, here are our **${title}**:\n\n${formatPropertyList(properties)}\n\n💡 **TIP:** These represent the ${range} price segment in our database. Want to see properties in a specific budget range?`;
  };

  const handleAvailabilityQuery = () => {
    const name = user?.name || userName;
    const availableProps = allProperties.filter(p => p.available);
    const unavailableProps = allProperties.filter(p => !p.available);

    return `${name}, here's the current availability status:\n\n✅ **AVAILABLE NOW:** ${availableProps.length} properties\n❌ **SOLD/RENTED:** ${unavailableProps.length} properties\n\n🏠 **READY TO MOVE:**\n${formatPropertyList(availableProps.slice(0, 4))}\n\nWhich one interests you for an immediate visit?`;
  };

  const handleAmenitySearch = (amenity) => {
    const name = user?.name || userName;
    const amenityProps = allProperties.filter(prop => 
      prop.amenities && prop.amenities.includes(amenity)
    );

    return `${name}, I found ${amenityProps.length} properties with ${amenity}:\n\n${formatPropertyList(amenityProps.slice(0, 3))}\n\n🎯 **OTHER AMENITIES AVAILABLE:**\n${getPopularAmenities()}\n\nWant to combine multiple amenities in your search?`;
  };

  const handleAreaBasedSearch = (targetArea) => {
    const name = user?.name || userName;
    const areaProps = allProperties.filter(prop => 
      prop.area && Math.abs(prop.area - targetArea) <= targetArea * 0.2
    );

    return `${name}, properties around ${targetArea} sq ft:\n\n${formatPropertyList(areaProps.slice(0, 3))}\n\n📏 **AREA INSIGHTS:**\n• Average area in database: ${Math.round(allProperties.reduce((sum, p) => sum + (p.area || 0), 0) / allProperties.length)} sq ft\n• Your search: ${targetArea} sq ft (±20%)\n\nNeed specific room configuration?`;
  };

  // Utility functions
  const formatPrice = (price) => {
    if (price >= 10000000) {
      return `${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `${(price / 100000).toFixed(0)} L`;
    } else {
      return `${price.toLocaleString()}`;
    }
  };

  const formatPropertyList = (properties) => {
    return properties.map((prop, index) => {
      const status = prop.available ? '✅ Available' : '❌ Sold';
      const amenitiesStr = prop.amenities ? prop.amenities.slice(0, 3).join(', ') : 'Basic';
      return `${index + 1}. **${prop.title}**\n   💰 ₹${formatPrice(prop.price)} | 📍 ${prop.location}\n   🏠 ${prop.bedrooms || 'N/A'}BHK | 📏 ${prop.area || 'N/A'} sq ft | ${status}\n   🎯 ${amenitiesStr}\n`;
    }).join('\n');
  };

  const getAvailableLocations = () => {
    const locations = [...new Set(allProperties.map(p => p.location))];
    return locations.slice(0, 5).map((loc, i) => `${i + 1}. ${loc}`).join('\n');
  };

  const getPopularAmenities = () => {
    const amenityCount = {};
    allProperties.forEach(prop => {
      if (prop.amenities) {
        prop.amenities.forEach(amenity => {
          amenityCount[amenity] = (amenityCount[amenity] || 0) + 1;
        });
      }
    });
    
    return Object.entries(amenityCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([amenity, count]) => `• ${amenity} (${count} properties)`)
      .join('\n');
  };

  const handlePropertySearch = (msg, role) => {
    const name = user?.name || userName;
    
    if (isLoadingProperties) {
      return `${name}, I'm loading the latest property data... Please wait a moment! 🔄`;
    }

    const totalProps = allProperties.length;
    const availableProps = allProperties.filter(p => p.available).length;
    
    return `${name}, I have access to **${totalProps} properties** in our database (${availableProps} currently available).\n\n🎯 **SEARCH OPTIONS:**\n• Tell me your budget (e.g., "50 lakh budget")\n• Specify location (e.g., "properties in City Center")\n• Property type (apartment/house/commercial)\n• Amenities (gym, pool, parking, etc.)\n\n💡 **QUICK STATS:**\n• Cheapest: ₹${formatPrice(Math.min(...allProperties.map(p => p.price)))}\n• Most expensive: ₹${formatPrice(Math.max(...allProperties.map(p => p.price)))}\n\nWhat are you looking for specifically?`;
  };

  const handlePriceInquiry = (msg, role) => {
    const name = user?.name || userName;
    
    if (allProperties.length === 0) {
      return `${name}, I'm still loading property data. Please try again in a moment!`;
    }

    const prices = allProperties.map(p => p.price).sort((a, b) => a - b);
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Create dynamic price ranges based on actual data
    const budget = prices.filter(p => p <= avgPrice * 0.7);
    const midRange = prices.filter(p => p > avgPrice * 0.7 && p <= avgPrice * 1.3);
    const premium = prices.filter(p => p > avgPrice * 1.3 && p <= avgPrice * 2);
    const luxury = prices.filter(p => p > avgPrice * 2);

    return `${name}, here's our **LIVE PRICING ANALYSIS** from ${allProperties.length} properties:\n\n📊 **PRICE DISTRIBUTION:**\n• 💚 Budget (${budget.length} props): ₹${formatPrice(minPrice)} - ₹${formatPrice(avgPrice * 0.7)}\n• 💙 Mid-range (${midRange.length} props): ₹${formatPrice(avgPrice * 0.7)} - ₹${formatPrice(avgPrice * 1.3)}\n• 💜 Premium (${premium.length} props): ₹${formatPrice(avgPrice * 1.3)} - ₹${formatPrice(avgPrice * 2)}\n• 💎 Luxury (${luxury.length} props): Above ₹${formatPrice(avgPrice * 2)}\n\n📈 **MARKET INSIGHTS:**\n• Average price: ₹${formatPrice(avgPrice)}\n• Most affordable: ₹${formatPrice(minPrice)}\n• Most expensive: ₹${formatPrice(maxPrice)}\n\nWhat's your budget range? I'll find perfect matches!`;
  };

  const handleContactRequest = (role) => {
    return userName ? 
      `Perfect ${userName}! Our expert agents are ready to help you:\n\n📞 Call: +91-9876543210\n📧 Email: info@realestate.com\n💬 WhatsApp: +91-9876543210\n🏢 Office: 123 Property Street, City\n\nHow would you prefer to be contacted?` :
      "I'll connect you with our agents! Call us at +91-9876543210 or email info@realestate.com";
  };

  const handleBookingRequest = (role) => {
    const name = user?.name || userName;
    
    if (role === 'user' || user) {
      return `${name}, here's how to **BOOK PROPERTIES** on our platform:\n\n🏠 **BOOKING PROCESS:**\n\n1️⃣ **Find Property:**\n• Browse properties or use search\n• Click on property for details\n• View photos, amenities, location\n\n2️⃣ **Book Property:**\n• Click "Book Now" button\n• Select your preferred dates\n• Add optional message to owner\n\n3️⃣ **Availability Check:**\n• System checks real-time availability\n• Get instant confirmation\n• See alternative dates if unavailable\n\n4️⃣ **Payment:**\n• Choose payment method (UPI, Cards, Net Banking)\n• Pay ₹500 booking fee (refundable)\n• Get booking confirmation\n\n5️⃣ **Visit & Finalize:**\n• Visit property on scheduled date\n• Complete final payment if satisfied\n• Sign agreement and get keys\n\n💡 **TIPS:**\n• Book early for popular properties\n• Keep documents ready\n• Verify all details during visit\n\nReady to find your perfect property?`;
    } else {
      return `${name}, to book properties:\n\n1️⃣ **Register/Login** first\n2️⃣ **Browse Properties**\n3️⃣ **Click "Book Now"** on any property\n4️⃣ **Follow booking steps**\n\nWould you like to register now?`;
    }
  };



  const handleLocationInquiry = (role) => {
    return userName ? 
      `${userName}, we have properties in prime locations:\n\n🏙️ City Center - Close to offices & malls\n🌳 Suburbs - Peaceful residential area\n🚇 Near Metro - Easy connectivity\n🏢 IT Hub - Tech corridor area\n🌊 Waterfront - Premium lakeside properties\n\nWhich area interests you most?` :
      "We have properties in City Center, Suburbs, Near Metro, IT Hub, and Waterfront areas. Which interests you?";
  };

  const handleHelpRequest = (role) => {
    return userName ? 
      `Hi ${userName}! I can help you with:\n\n🏠 Property Search (apartments, houses, commercial)\n💰 Price Information & Budget Planning\n📍 Location Details & Area Information\n📞 Agent Contact & Expert Consultation\n📅 Property Visit Booking\n📋 Documentation Assistance\n\nWhat would you like to know more about?` :
      "I can help you with property search, pricing, locations, agent contact, and booking visits. What do you need help with?";
  };

  const sendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        text: getResponse(inputValue),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);

    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="bot-avatar">🏠</div>
              <div>
                <h4>Real Estate Assistant</h4>
                <span className="status">Online</span>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="chat-body">
            <div className="message-list">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.sender}`}>
                  <div className="message-content">
                    <p>{message.text}</p>
                    <span className="message-time">
                      {new Date(message.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-input-container">
            <div className="chat-input-form">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="chat-input"
              />
              <button onClick={sendMessage} className="send-btn">➤</button>
            </div>
            
            <div className="quick-actions">
              {!user && !userName ? (
                <button onClick={() => setInputValue('My name is John')} className="quick-action-btn">
                  👤 Tell Name
                </button>
              ) : getUserRole() === 'owner' ? (
                <>
                  <button onClick={() => setInputValue('How to list property')} className="quick-action-btn">
                    📝 Add Property
                  </button>
                  <button onClick={() => setInputValue('Dashboard help')} className="quick-action-btn">
                    📊 Dashboard
                  </button>
                  <button onClick={() => setInputValue('Manage inquiries')} className="quick-action-btn">
                    📬 Messages
                  </button>
                  <button onClick={() => setInputValue('Website navigation')} className="quick-action-btn">
                    🧭 Help
                  </button>
                </>
              ) : getUserRole() === 'user' ? (
                <>
                  <button onClick={() => setInputValue('How to search properties')} className="quick-action-btn">
                    🔍 Search
                  </button>
                  <button onClick={() => setInputValue('How to book visit')} className="quick-action-btn">
                    📅 Book Visit
                  </button>
                  <button onClick={() => setInputValue('Dashboard help')} className="quick-action-btn">
                    📊 Dashboard
                  </button>
                  <button onClick={() => setInputValue('Website features')} className="quick-action-btn">
                    ✨ Features
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setInputValue('How to use website')} className="quick-action-btn">
                    🏠 Get Started
                  </button>
                  <button onClick={() => setInputValue('Search properties')} className="quick-action-btn">
                    🔍 Search
                  </button>
                  <button onClick={() => setInputValue('Register account')} className="quick-action-btn">
                    📝 Register
                  </button>
                  <button onClick={() => setInputValue('Contact support')} className="quick-action-btn">
                    📞 Support
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      <button
        className={`chat-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
};

export default ChatBotSimple;
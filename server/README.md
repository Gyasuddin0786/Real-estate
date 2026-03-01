# Property Rental Full Stack Application

A modern, attractive property rental platform built with React, Express, Node.js, and MongoDB.

## Features

### Frontend (React)
- Modern Material-UI design
- Responsive layout
- Property search and filtering
- User authentication (tenant/owner roles)
- Property listings with detailed views
- Booking system
- Dashboard for managing bookings
- Property management for owners

### Backend (Node.js/Express)
- RESTful API
- JWT authentication
- MongoDB database
- File upload for property images
- Role-based access control
- Booking management system

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Backend Setup

1. Install backend dependencies:
```bash
npm install
```

2. Configure environment variables:
Create a `.env` file in the root directory and update the values:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/property-rental
JWT_SECRET=your_jwt_secret_key_here
```

3. Start MongoDB service on your machine

4. Start the backend server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install frontend dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

### Running the Application

1. Start MongoDB
2. Run backend: `npm run dev` (from root directory)
3. Run frontend: `npm start` (from client directory)
4. Open http://localhost:3000 in your browser

## API Endpoints

### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- GET `/api/auth/me` - Get current user

### Properties
- GET `/api/properties` - Get all properties (with filters)
- GET `/api/properties/featured` - Get featured properties
- GET `/api/properties/:id` - Get single property
- POST `/api/properties` - Create property (owner only)
- PUT `/api/properties/:id` - Update property
- POST `/api/properties/:id/reviews` - Add review

### Bookings
- POST `/api/bookings` - Create booking
- GET `/api/bookings/my-bookings` - Get user bookings
- GET `/api/bookings/owner-bookings` - Get owner bookings
- PUT `/api/bookings/:id/status` - Update booking status

## User Roles

### Tenant
- Browse and search properties
- View property details
- Book properties
- Manage bookings
- Leave reviews

### Property Owner
- Add new properties
- Manage property listings
- Accept/decline booking requests
- View booking analytics

## Technologies Used

### Frontend
- React 18
- Material-UI (MUI)
- React Router
- Axios
- Context API for state management

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- bcryptjs for password hashing

## Project Structure

```
property-rental/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   └── utils/          # Utility functions
├── models/                 # MongoDB models
├── routes/                 # Express routes
├── middleware/             # Custom middleware
├── uploads/                # File uploads directory
└── server.js              # Main server file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
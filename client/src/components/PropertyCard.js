import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Rating
} from '@mui/material';
import { LocationOn, Bed, Bathtub, SquareFoot, Favorite, FavoriteBorder } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const PropertyCard = ({ property }) => {
  const [isFavorite, setIsFavorite] = React.useState(false);

  return (
    <Card 
      sx={{ 
        maxWidth: 345, 
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        '&:hover': { 
          transform: 'translateY(-8px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
        }
      }}
      component={Link}
      to={`/property/${property._id}`}
      style={{ textDecoration: 'none' }}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height="220"
          image={
            property.images?.[0] 
              ? (property.images[0].startsWith('http') 
                  ? property.images[0] 
                  : `http://localhost:5000${property.images[0]}`)
              : 'https://via.placeholder.com/400x300?text=No+Image'
          }
          alt={property.title}
          sx={{
            transition: 'transform 0.3s ease',
            '&:hover': { transform: 'scale(1.05)' }
          }}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
          }}
        />
        <IconButton
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
          sx={{ 
            position: 'absolute', 
            top: 12, 
            right: 12, 
            bgcolor: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(10px)',
            '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
          }}
        >
          {isFavorite ? <Favorite sx={{ color: '#ef4444' }} /> : <FavoriteBorder />}
        </IconButton>
        <Chip
          label={property.propertyType?.toUpperCase() || 'APARTMENT'}
          sx={{ 
            position: 'absolute', 
            top: 12, 
            left: 12,
            bgcolor: '#2563eb',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.75rem'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            height: '60px'
          }}
        />
      </Box>
      
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" component="div" fontWeight="bold" sx={{ mb: 1, minHeight: '48px' }}>
          {property.title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <LocationOn sx={{ fontSize: 18, color: '#666', mr: 0.5 }} />
          <Typography variant="body2" color="text.secondary" noWrap>
            {property.location?.city || 'New York'}, {property.location?.state || 'NY'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Bed sx={{ fontSize: 16, color: '#2563eb' }} />
            <Typography variant="body2" fontWeight="500">{property.bedrooms || 2}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Bathtub sx={{ fontSize: 16, color: '#2563eb' }} />
            <Typography variant="body2" fontWeight="500">{property.bathrooms || 2}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SquareFoot sx={{ fontSize: 16, color: '#2563eb' }} />
            <Typography variant="body2" fontWeight="500">{property.area || 1200} sq ft</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" color="primary" fontWeight="bold">
            ${property.price || 2500}/mo
          </Typography>
          <Rating value={property.rating || 4.5} readOnly size="small" precision={0.5} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default PropertyCard;
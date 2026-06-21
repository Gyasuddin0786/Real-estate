const API_BASE_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
  : 'http://localhost:5000';

export const botApi = {
  // Send message to bot
  sendMessage: async (message, userId = 'guest') => {
    try {
      const response = await fetch(`${API_BASE_URL}/bot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, userId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Bot API error:', error);
      throw error;
    }
  },

  // Get bot status
  getStatus: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bot/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Bot status error:', error);
      throw error;
    }
  },

  // Clear user context
  clearContext: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bot/context/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Clear context error:', error);
      throw error;
    }
  }
};

export default botApi;
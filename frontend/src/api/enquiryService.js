/**
 * Acrovix Enquiry API Client
 * 
 * Connects the React enquiry form to the Spring Boot REST backend:
 * POST /api/enquiries
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');

export const submitEnquiry = async (enquiryData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/enquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enquiryData),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data && data.errors && typeof data.errors === 'object') {
        const errorMessages = Object.values(data.errors).join('. ');
        return {
          success: false,
          message: errorMessages || data.message || 'Validation error occurred.'
        };
      }
      return {
        success: false,
        message: data.message || 'Failed to submit enquiry. Please try again.'
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      message: 'Backend server is currently unreachable. Please verify connection and try again.'
    };
  }
};

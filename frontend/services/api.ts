/**
 * API Integration Services
 * Connects the frontend to the NestJS Backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/**
 * Auth Service
 */
export const authService = {
  sendOtp: async (mobile: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile }),
    });
    if (!res.ok) throw new Error('Failed to send OTP');
    const json = await res.json();
    return json.data || json;
  },

  verifyOtp: async (mobile: string, otp: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp }),
    });
    if (!res.ok) throw new Error('Invalid OTP');
    const json = await res.json();
    return json.data || json;
  }
};

/**
 * User & KYC Service
 */
export const userService = {
  getProfile: async (token: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    const json = await res.json();
    return json.data || json;
  },

  updateProfile: async (token: string, data: { name: string; dob: string }) => {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    const json = await res.json();
    return json.data || json;
  },

  initiateKyc: async (token: string, aadhaar: string) => {
    const res = await fetch(`${API_BASE_URL}/kyc/digilocker/init`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ aadhaar }),
    });
    if (!res.ok) throw new Error('Failed to initiate KYC');
    const json = await res.json();
    return json.data || json;
  }
};

/**
 * Scoring Service
 */
export const scoringService = {
  getScore: async (token: string) => {
    const res = await fetch(`${API_BASE_URL}/scoring`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch score');
    const json = await res.json();
    return json.data || json;
  },

  calculateScore: async (token: string) => {
    const res = await fetch(`${API_BASE_URL}/scoring/calculate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to calculate score');
    const json = await res.json();
    return json.data || json;
  },

  getScoreByBankId: async (bankId: string) => {
    const res = await fetch(`${API_BASE_URL}/users/score/bank/${bankId}`);
    if (!res.ok) throw new Error('Invalid Bank ID');
    const json = await res.json();
    return json.data || json;
  }
};

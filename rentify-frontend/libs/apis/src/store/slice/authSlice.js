// apis/authSlice.ts
import { createSlice } from '@reduxjs/toolkit';


const initialState = {
  role: null,
  profile: null,
  expiresAt: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      return { ...state, ...action.payload };
    },
    clearCredentials: () => initialState,
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
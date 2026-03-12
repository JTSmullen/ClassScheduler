import api from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface LoginResponse {
  token: string;
}

export const login = async (data: LoginRequest) => {
  const resp = await api.post<LoginResponse>('/auth/login', data);
  return resp.data;
};

export const register = async (data: RegisterRequest) => {
  const resp = await api.post('/auth/register', data);
  return resp.data;
};

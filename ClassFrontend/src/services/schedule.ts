import api from './api';
import { Schedule } from '../types';

export interface NewScheduleRequest {
  name: string;
}

export interface LoadScheduleRequest {
  id: number;
}

export const createSchedule = async (data: NewScheduleRequest) => {
  const resp = await api.post<Schedule>('/schedule/create', data);
  return resp.data;
};

export const loadSchedule = async (id: number) => {
  const resp = await api.post<Schedule>('/schedule/load', { id });
  return resp.data;
};

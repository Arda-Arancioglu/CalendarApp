import { api } from './api';
import type { CalendarEvent, CreateEventPayload } from '../types/event';

// Initial demo events for mock testing mode
let mockEventsStore: CalendarEvent[] = [
  {
    id: 1,
    title: 'Sprint Planning & Architecture Sync',
    description: 'Review Q4 frontend deliverables, API contracts, and deployment schedule.',
    startTime: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
    creatorId: 1,
  },
  {
    id: 2,
    title: 'Frontend Code Review',
    description: 'Walkthrough React Context, Axios interceptors, and grid rendering performance.',
    startTime: new Date(new Date(Date.now() + 86400000).setHours(14, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date(Date.now() + 86400000).setHours(15, 0, 0, 0)).toISOString(),
    creatorId: 1,
  },
  {
    id: 3,
    title: 'Design System & UX Workshop',
    description: 'Refine dark mode slate palette, border radius constraints, and typography hierarchy.',
    startTime: new Date(new Date(Date.now() - 86400000 * 2).setHours(16, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date(Date.now() - 86400000 * 2).setHours(17, 30, 0, 0)).toISOString(),
    creatorId: 2,
  },
];

export const eventService = {
  getEvents: async (): Promise<CalendarEvent[]> => {
    try {
      const response = await api.get<CalendarEvent[]>('/events');
      return response.data;
    } catch (err: any) {
      if (import.meta.env.VITE_ENABLE_DEMO_MOCK === 'true') {
        return [...mockEventsStore];
      }
      throw err;
    }
  },

  createEvent: async (payload: CreateEventPayload): Promise<CalendarEvent> => {
    try {
      const response = await api.post<CalendarEvent>('/events', payload);
      return response.data;
    } catch (err: any) {
      if (import.meta.env.VITE_ENABLE_DEMO_MOCK === 'true') {
        const user = JSON.parse(localStorage.getItem('calendar_auth_user') || '{"userId":1}');
        const newEvent: CalendarEvent = {
          id: Date.now(),
          title: payload.title,
          description: payload.description,
          startTime: payload.startTime,
          endTime: payload.endTime,
          creatorId: user.userId || 1,
        };
        mockEventsStore.push(newEvent);
        return newEvent;
      }
      throw err;
    }
  },

  deleteEvent: async (id: number): Promise<void> => {
    try {
      await api.delete(`/events/${id}`);
    } catch (err: any) {
      if (import.meta.env.VITE_ENABLE_DEMO_MOCK === 'true') {
        mockEventsStore = mockEventsStore.filter((event) => event.id !== id);
        return;
      }
      throw err;
    }
  },
};

/**
 * Community-event store — ACT-stage Module 5 (Social Permaculture).
 *
 * Work-days, harvest-shares, meetups, tours. Attendees reference
 * `networkStore.NetworkContact.id` so the same address book powers both
 * the CRM card and the events planner.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CommunityEventType = 'work_day' | 'meetup' | 'harvest_share' | 'tour';

export interface CommunityEvent {
  id: string;
  projectId: string;
  title: string;
  /** ISO date. */
  date: string;
  type: CommunityEventType;
  /** networkStore contact ids. */
  attendees?: string[];
  notes?: string;
}

interface CommunityEventState {
  events: CommunityEvent[];
  addEvent: (e: CommunityEvent) => void;
  updateEvent: (id: string, patch: Partial<CommunityEvent>) => void;
  removeEvent: (id: string) => void;
}

export const useCommunityEventStore = create<CommunityEventState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (e) => set((s) => ({ events: [...s.events, e] })),
      updateEvent: (id, patch) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
    }),
    { name: 'ogden-act-community-events', version: 1 },
  ),
);

useCommunityEventStore.persist.rehydrate();

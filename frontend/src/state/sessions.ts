import { create } from 'zustand';

export type ConnState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'fingerprint_required';
export type Session = { id: string; hostId: string; hostLabel: string; state: ConnState; title: string; createdAt: number; lastActivityAt: number; fingerprint?: { value: string; mismatch?: boolean } };

export const useSessionStore = create<{ sessions: Session[]; activeSessionId?: string; addSession: (s: Session) => void; updateSession: (id: string, patch: Partial<Session>) => void; removeSession: (id: string) => void; setActive: (id: string) => void; }>((set) => ({
  sessions: [],
  addSession: (s) => set((st) => ({ sessions: [...st.sessions, s], activeSessionId: s.id })),
  updateSession: (id, patch) => set((st) => ({ sessions: st.sessions.map((x) => x.id === id ? { ...x, ...patch, lastActivityAt: Date.now() } : x) })),
  removeSession: (id) => set((st) => ({ sessions: st.sessions.filter((s) => s.id !== id), activeSessionId: st.activeSessionId === id ? st.sessions.find((x) => x.id !== id)?.id : st.activeSessionId })),
  setActive: (id) => set({ activeSessionId: id })
}));

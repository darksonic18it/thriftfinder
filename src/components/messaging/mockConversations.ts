import type { Conversation } from './types'

/**
 * PHASE 1 ONLY — placeholder data so the UI can be built and styled.
 * Phase 2 replaces this with a messageService backed by Supabase.
 */
export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    userId: 'mock-user-1',
    fullName: 'Maria Santos',
    username: 'maria.santos',
    avatarUrl: null,
    lastActive: 'Active 3h ago',
  },
  {
    id: 'c2',
    userId: 'mock-user-2',
    fullName: 'Juan Dela Cruz',
    username: 'juandc',
    avatarUrl: null,
    lastActive: 'Active now',
  },
  {
    id: 'c3',
    userId: 'mock-user-3',
    fullName: 'Ana Reyes',
    username: 'ana_thrifts',
    avatarUrl: null,
    lastActive: 'Active 1d ago',
  },
]
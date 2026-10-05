export type ConversationId = string

/** A person you can message. Phase 2 will build this from the `profiles` table. */
export interface Conversation {
  id: ConversationId
  /** profiles.id of the other person (used for "View profile"). */
  userId: string
  fullName: string
  username: string
  /** Resolved, displayable URL. null = show initials. */
  avatarUrl: string | null
  /** Human-readable presence text, e.g. "Active 3h ago". */
  lastActive: string
}

export interface ChatMessage {
  id: string
  from: 'me' | 'them'
  text: string
  sentAt: number
}
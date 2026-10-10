export type ConversationId = string

/** One thread in the inbox: a conversation about one listing with one other person. */
export interface Conversation {
  id: ConversationId
  /** profiles.id of the other person (used for "View profile"). */
  userId: string
  fullName: string
  /** Resolved, displayable URL. null = show initials. */
  avatarUrl: string | null
  listingId: string
  listingTitle: string
  /** Preview of the newest message, or null for an empty thread. */
  lastMessage: string | null
  unreadCount: number
}

export interface ChatMessage {
  id: string
  from: 'me' | 'them'
  text: string
  sentAt: number
}
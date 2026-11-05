export type Role = 'ORGANIZER' | 'PLAYER' | 'VIEWER'
export type RoundState = 'PREPARING' | 'DRAWING' | 'VOTING' | 'FINISHED'
export interface Session {
  id: string
  displayName: string
  token: string
  expiresAt: string
}
export interface Game {
  id: string
  ownerId: string
  title: string
  joinCode: string
  maxPlayers: number
  closed: boolean
  version: number
}
export interface Member {
  id: string
  displayName: string
  role: Role
}
export interface RoundSummary {
  id: string
  number: number
  state: RoundState
}
export interface GameView {
  game: Game
  members: Member[]
  rounds: RoundSummary[]
  myRole: Role
}
export interface Drawing {
  id: string
  authorId: string
  authorName: string
  imageUrl: string
}
export interface RoundView extends RoundSummary {
  gameId: string
  description: string
  referenceImageUrl: string | null
  expectedDrawings: number
  submittedDrawings: number
  drawings: Drawing[]
  myVote: string | null
}
export interface Score {
  drawingId: string
  authorId: string
  authorName: string
  votes: number
  rank: number
}
export interface Results {
  roundId: string
  totalVotes: number
  scores: Score[]
}
export interface GameEvent {
  id: string
  gameId: string
  sequence: number
  type: string
  roundId: string | null
  occurredAt: string
}
export interface Ticket {
  ticket: string
  expiresAt: string
  path: string
}

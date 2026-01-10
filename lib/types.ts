export interface Member {
  _id?: string
  name: string
  createdAt: Date
}

export interface Team {
  _id?: string
  id: string
  name: string
  positions: string[]
}

export interface Schedule {
  _id?: string
  id: string
  teamId: string
  date: string
  assignments: Record<string, string>
}

export type Patch = {
  id: string
  bank: string
  number: number
  /** The FM1 program for a slot in banks A–D. Absent for an added bank, which has no FM1 slot. */
  program?: number
  name: string
  family: string
}

import { fm1EffectParameterMaximums } from '@/lib/fm1-effects'

const operatorParameterMaximums = [
  99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
  3, 3, 7, 3, 7, 99, 1, 31, 99, 14,
] as const

const globalParameterMaximums = [
  99, 99, 99, 99, 99, 99, 99, 99,
  31, 7, 1, 99, 99, 99, 99, 1, 5, 7, 48,
] as const

const editorParameterCount = 179

function randomInteger(maximum: number, random: () => number) {
  return Math.floor(random() * (maximum + 1))
}

/** Randomises every editable sound parameter while preserving the patch name. */
export function randomizeSound(
  parameters: Uint8Array,
  random: () => number = Math.random,
) {
  if (parameters.length !== editorParameterCount) {
    throw new RangeError(`Sound randomisation requires ${editorParameterCount} FM1 editor parameters.`)
  }

  const next = parameters.slice()

  for (let operator = 0; operator < 6; operator += 1) {
    operatorParameterMaximums.forEach((maximum, offset) => {
      next[operator * operatorParameterMaximums.length + offset] = randomInteger(maximum, random)
    })
  }
  globalParameterMaximums.forEach((maximum, offset) => {
    next[126 + offset] = randomInteger(maximum, random)
  })
  fm1EffectParameterMaximums.forEach((maximum, offset) => {
    next[155 + offset] = randomInteger(maximum, random)
  })

  return next
}

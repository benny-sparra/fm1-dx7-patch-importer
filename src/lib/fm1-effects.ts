export const fm1EffectParameterCount = 24

export const fm1EffectParameterMaximums = Uint8Array.from([
  1, 2, 107, 10, 1, 2, 100, 100, 1, 100, 100, 100, 1, 100, 100, 100, 1, 100, 100, 100, 1, 100, 100,
  100,
])

export function makeDefaultFm1Effects() {
  return new Uint8Array(fm1EffectParameterCount)
}

export function normalizeFm1Effects(value: unknown) {
  if (!(value instanceof Uint8Array) || value.length !== fm1EffectParameterCount) {
    return makeDefaultFm1Effects()
  }

  return Uint8Array.from(value, (parameter, index) =>
    Math.min(parameter, fm1EffectParameterMaximums[index]),
  )
}

export function makeFm1EditorParameters(voiceParameters: Uint8Array, effects: Uint8Array) {
  if (voiceParameters.length !== 155) {
    throw new RangeError('FM1 voice editor data must contain 155 parameters.')
  }

  const normalizedEffects = normalizeFm1Effects(effects)
  const parameters = new Uint8Array(155 + fm1EffectParameterCount)
  parameters.set(voiceParameters)
  parameters.set(normalizedEffects, 155)
  return parameters
}

export function getFm1VoiceParameters(editorParameters: Uint8Array) {
  return editorParameters.slice(0, 155)
}

export function getFm1EffectParameters(editorParameters: Uint8Array) {
  return normalizeFm1Effects(editorParameters.slice(155))
}

import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_EFFECT_PARAMETER_COUNT,
  FM1_EFFECT_PARAMETER_START,
  FM1_VOICE_PARAMETER_COUNT,
  fm1EffectParameters,
} from '@/lib/fm1-parameters'

export const fm1EffectParameterCount = FM1_EFFECT_PARAMETER_COUNT

export const fm1EffectParameterMaximums = Uint8Array.from(fm1EffectParameters.map(({ max }) => max))

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
  if (voiceParameters.length !== FM1_VOICE_PARAMETER_COUNT) {
    throw new RangeError(
      `FM1 voice editor data must contain ${FM1_VOICE_PARAMETER_COUNT} parameters.`,
    )
  }

  const normalizedEffects = normalizeFm1Effects(effects)
  const parameters = new Uint8Array(FM1_EDITOR_PARAMETER_COUNT)
  parameters.set(voiceParameters)
  parameters.set(normalizedEffects, FM1_EFFECT_PARAMETER_START)
  return parameters
}

export function getFm1VoiceParameters(editorParameters: Uint8Array) {
  return editorParameters.slice(0, FM1_VOICE_PARAMETER_COUNT)
}

export function getFm1EffectParameters(editorParameters: Uint8Array) {
  return normalizeFm1Effects(editorParameters.slice(FM1_EFFECT_PARAMETER_START))
}

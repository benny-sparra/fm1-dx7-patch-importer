import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_EFFECT_PARAMETER_COUNT,
  FM1_EFFECT_PARAMETER_START,
  FM1_VA_BITCRUSH_DEFAULTS,
  FM1_VA_BITCRUSH_START,
  FM1_VA_DISTORTION_TYPE_INDEX,
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

/**
 * The editor's parameters for a voice and its effects. `distortionType` is the FM-1+VA record's
 * value, kept as read, or 0 for a patch without a record; `bitcrush` is the record's Bitcrush, as
 * `fm1VaRecordBitcrush` reads it, or the defaults without one.
 */
export function makeFm1EditorParameters(
  voiceParameters: Uint8Array,
  effects: Uint8Array,
  distortionType = 0,
  bitcrush: readonly number[] = FM1_VA_BITCRUSH_DEFAULTS,
) {
  if (voiceParameters.length !== FM1_VOICE_PARAMETER_COUNT) {
    throw new RangeError(
      `FM1 voice editor data must contain ${FM1_VOICE_PARAMETER_COUNT} parameters.`,
    )
  }

  const normalizedEffects = normalizeFm1Effects(effects)
  const parameters = new Uint8Array(FM1_EDITOR_PARAMETER_COUNT)
  parameters.set(voiceParameters)
  parameters.set(normalizedEffects, FM1_EFFECT_PARAMETER_START)
  parameters[FM1_VA_DISTORTION_TYPE_INDEX] = distortionType
  parameters.set(bitcrush, FM1_VA_BITCRUSH_START)
  return parameters
}

export function getFm1VoiceParameters(editorParameters: Uint8Array) {
  return editorParameters.slice(0, FM1_VOICE_PARAMETER_COUNT)
}

export function getFm1EffectParameters(editorParameters: Uint8Array) {
  return normalizeFm1Effects(
    editorParameters.slice(
      FM1_EFFECT_PARAMETER_START,
      FM1_EFFECT_PARAMETER_START + FM1_EFFECT_PARAMETER_COUNT,
    ),
  )
}

export const controlHelp = {
  algorithm:
    'Chooses how the six operators are connected. Operators at the bottom are carriers you hear directly; operators above them change the tone of the operators below.',
  feedback:
    'Feeds part of one operator back into itself. Higher values add brighter, rougher harmonics and can become noisy.',
  pitchEnvelope:
    'Changes the pitch over the life of each note. The four rates control how quickly each stage moves; the four levels set the pitch reached at each stage.',
  pitchEnvelopeRate:
    'Controls how quickly the pitch moves to this stage. Higher values make the move faster.',
  pitchEnvelopeLevel:
    'Sets the pitch at this stage. A value around 50 is close to the played note; values above or below bend it up or down.',
  oscillatorSync:
    'Restarts every operator at the same waveform position for each note. On gives a more consistent attack; off can sound more organic.',
  lfoSync:
    'Restarts the LFO for each new note. On makes modulation repeat consistently; off lets every note join the continuously running LFO.',
  lfoWave:
    'Chooses the repeating shape used for vibrato and tremolo. Sine is smooth, square jumps between two values, and sample & hold is random.',
  lfoSpeed: 'Sets how quickly the LFO cycles. Raise it for faster vibrato or tremolo.',
  lfoDelay:
    'Delays the LFO after a note begins, so vibrato or tremolo fades in instead of starting immediately.',
  pitchModDepth:
    'Sets the maximum amount of LFO pitch movement. Pitch Mod Sensitivity on each voice determines how much of it is heard.',
  ampModDepth:
    'Sets the maximum amount of LFO volume movement. Each operator’s Amp Mod Sensitivity determines how much it responds.',
  pitchModSensitivity:
    'Controls how strongly the whole voice responds to LFO pitch modulation. Higher values create wider vibrato.',
  transpose: 'Moves the entire patch up or down in semitones without changing the keys you play.',
  operator:
    'An operator is an oscillator with its own envelope. Carriers produce audible sound; modulators reshape another operator to create harmonics.',
  outputLevel:
    'Sets this operator’s strength. For a carrier it mainly changes volume; for a modulator it changes brightness and harmonic complexity.',
  amplitudeEnvelope:
    'Shapes this operator over time. Drag left/right to change how quickly a stage is reached, and up/down to change its level. For modulators, this shapes brightness rather than volume.',
  oscillatorMode:
    'Ratio tracks the keyboard and is best for pitched harmonics. Fixed uses a constant frequency, useful for metallic, noisy, or percussive sounds.',
  coarse:
    'Sets the main frequency ratio in Ratio mode, or the broad frequency range in Fixed mode. Whole-number ratios usually sound harmonic.',
  fine: 'Fine-tunes the operator frequency between Coarse settings. Small changes can add new harmonics or beating.',
  detune:
    'Offsets this operator slightly from exact tuning. Use small amounts to thicken the sound; larger differences create beating or dissonance.',
  breakpoint:
    'Chooses the keyboard note where left and right level scaling meet. Scaling changes this operator’s level across the keyboard.',
  leftDepth: 'Sets how much this operator’s level changes on notes below the breakpoint.',
  rightDepth: 'Sets how much this operator’s level changes on notes above the breakpoint.',
  curve:
    'Chooses the direction and shape of the level change away from the breakpoint. Linear changes steadily; exponential changes more strongly near one end.',
  rateScaling:
    'Makes this operator’s envelope run faster on higher notes, similar to the shorter decay of many acoustic instruments.',
  velocity:
    'Sets how strongly key velocity changes this operator’s level. On carriers it affects loudness; on modulators it affects brightness.',
  ampModSensitivity:
    'Sets how strongly this operator responds to LFO amplitude modulation. On a carrier this creates tremolo; on a modulator it animates the tone.',
} as const

export const effectHelp = {
  Filter:
    'Removes parts of the frequency spectrum. Use it to darken, thin, or reshape the finished FM sound.',
  Reverb: 'Adds simulated room reflections, giving the sound a sense of space and distance.',
  Delay:
    'Repeats the sound after a short time. Feedback-like decay controls how long the echoes continue.',
  Distortion:
    'Adds saturation and extra harmonics. It can make quiet sounds denser or aggressive sounds more intense.',
  Chorus: 'Adds slightly shifted copies of the sound for width and movement.',
  Phaser: 'Sweeps a series of notches through the sound, creating a hollow, moving character.',
} as const

export const effectParameterHelp: Record<string, string> = {
  'Filter Type':
    'Chooses what the filter keeps: low pass keeps lows, high pass keeps highs, and band pass keeps a middle band.',
  'Filter Cutoff':
    'Sets the frequency where filtering begins. Its audible direction depends on the selected filter type.',
  'Filter Resonance':
    'Emphasizes frequencies around the cutoff. Higher values sound sharper and more pronounced.',
  'Reverb Space': 'Chooses the character of the simulated space: room, hall, or bright plate.',
  'Reverb Decay': 'Sets how long the reverb tail lasts.',
  'Reverb Mix': 'Balances dry sound with reverb. At 0% you hear only the original sound.',
  'Delay Decay': 'Sets how long the echo repeats continue before fading away.',
  'Delay Rate': 'Sets the time between echoes. Higher values change the repeat spacing.',
  'Delay Mix': 'Balances dry sound with echoes. At 0% you hear only the original sound.',
  'Distortion Gain':
    'Controls how hard the signal drives the distortion. Higher values add more saturation and harmonics.',
  'Distortion Tone': 'Adjusts the brightness of the distorted sound.',
  'Distortion Level':
    'Sets the output volume after distortion, useful for matching the bypassed loudness.',
  'Chorus Frequency': 'Sets how quickly the chorus movement cycles.',
  'Chorus Depth':
    'Sets how far the chorus pitch movement travels. Higher values sound wider and more obvious.',
  'Chorus Mix': 'Balances dry sound with the chorused signal.',
  'Phaser Frequency': 'Sets how quickly the phaser sweep cycles.',
  'Phaser Depth': 'Sets the range and intensity of the phaser sweep.',
  'Phaser Mix': 'Balances dry sound with the phased signal.',
}

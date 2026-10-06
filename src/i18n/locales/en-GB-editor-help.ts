/**
 * British English help for the patch editor's controls and effects. Only the editor shows it, so it
 * loads with the editor's chunk rather than with the page: `@/i18n/editor-help` adds it to `en-GB`.
 * Every other locale keeps these sections in its own file.
 */
export default {
  controlHelp: {
    algorithm:
      'Chooses how the six operators are connected. Operators at the bottom are carriers you hear directly; operators above them change the tone of the operators below.',
    feedback:
      'Feeds part of one operator back into itself. Higher values add brighter, rougher harmonics and can become noisy.',
    pitchEnvelope:
      'Changes the pitch over the life of each note. The four rates control how quickly each stage moves; the four levels set the pitch reached at each stage.',
    pitchEnvelopePresets:
      'Replaces all eight rates and levels with a starting shape. Flat removes any pitch movement; the others add a quick blip, a falling attack, a rising scoop or a droop on release. Undo restores the previous envelope.',
    effectPresets:
      'Sets this effect’s controls to a starting point. Switch the effect on to choose one. Other effects are left as they are, and Undo restores the previous settings.',
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
    ratioEntry:
      'Type the ratio you want, such as 3.5. Coarse and Fine move to the nearest ratio the FM1 can play, which the field then shows.',
    fixedFrequencyEntry:
      'Type the frequency you want in hertz, such as 440 or 1.2k. Coarse and Fine move to the nearest frequency the FM1 can play, which the field then shows.',
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
  },
  effectHelp: {
    Filter:
      'Removes parts of the frequency spectrum. Use it to darken, thin, or reshape the finished FM sound.',
    Reverb: 'Adds simulated room reflections, giving the sound a sense of space and distance.',
    Delay:
      'Repeats the sound after a short time. Feedback-like decay controls how long the echoes continue.',
    Distortion:
      'Adds saturation and extra harmonics. It can make quiet sounds denser or aggressive sounds more intense.',
    Chorus: 'Adds slightly shifted copies of the sound for width and movement.',
    Phaser: 'Sweeps a series of notches through the sound, creating a hollow, moving character.',
    Bitcrush:
      'Rounds the sound to fewer levels and samples it less often, for a gritty, lo-fi edge. Only Baud Girl’s firmware from FM-1_096 plays it. No MIDI message sets it, so you hear it once the patch is written to the FM1 with Send to FM1 or Write patches to the FM1.',
  },
  effectParameterHelp: {
    'Filter Type':
      'Chooses what the filter keeps: low pass keeps lows, high pass keeps highs, and band pass keeps a middle band.',
    'Filter Cutoff':
      'Sets the frequency where filtering begins, from about 100 Hz at 0 to 20 kHz at 107. Its audible direction depends on the selected filter type.',
    'Filter Resonance':
      'Emphasizes frequencies around the cutoff. Higher values sound sharper and more pronounced.',
    'Reverb Space': 'Chooses the character of the simulated space: room, hall, or bright plate.',
    'Reverb Decay': 'Sets how long the reverb tail lasts.',
    'Reverb Mix': 'Balances dry sound with reverb. At 0% you hear only the original sound.',
    'Delay Decay':
      'Sets how much of each echo is fed back into the delay. Higher values give more repeats before they fade away.',
    'Delay Rate':
      'Sets the time between echoes. Higher values bring them closer together, from about 0.8 seconds at 0 to 0.1 seconds at 100.',
    'Delay Mix': 'Balances dry sound with echoes. At 0% you hear only the original sound.',
    'Distortion Gain':
      'Controls how hard the signal drives the distortion. Higher values add more saturation and harmonics.',
    'Distortion Tone': 'Adjusts the brightness of the distorted sound.',
    'Distortion Level':
      'Sets the output volume after distortion, useful for matching the bypassed loudness.',
    'Distortion Type':
      'Chooses how Distortion shapes the sound on Baud Girl’s firmware. Soft Clip, M-VAVE’s original, rounds the peaks off; Hard Clip cuts them flat for a harsher edge; Foldback folds them back for a brighter, metallic tone. No MIDI message sets it, so you hear it once the patch is written to the FM1 with Send to FM1 or Write patches to the FM1.',
    'Chorus Frequency': 'Sets how quickly the chorus movement cycles, from about 0.1 to 1 Hz.',
    'Chorus Depth':
      'Sets how far the chorus pitch movement travels. Higher values sound wider and more obvious.',
    'Chorus Mix': 'Balances dry sound with the chorused signal.',
    'Phaser Frequency': 'Sets how quickly the phaser sweep cycles, from about 0.5 to 6 Hz.',
    'Phaser Depth': 'Sets the range and intensity of the phaser sweep.',
    'Phaser Mix': 'Balances dry sound with the phased signal.',
    'Bitcrush Bits':
      'Sets how many levels the wave is rounded to, from 16, which is clean, down to 1. A quiet patch can drop out at the lowest settings.',
    'Bitcrush Sample Rate':
      'Sets how often the sound is sampled, from 300 Hz up to 44.1 kHz. Lower rates add harsh, metallic overtones.',
    'Bitcrush Mix':
      'Balances the clean sound with the crushed one. At 0% you hear only the original sound.',
  },
  distortionType: {
    softClip: 'Soft Clip',
    hardClip: 'Hard Clip',
    foldback: 'Foldback',
    unknown: 'Unknown ({{value, number}})',
    noRecord:
      'This patch didn’t come from the FM1, so it takes the type of the preset it’s written over.',
    otherFirmware:
      'Kept for Baud Girl’s firmware: {{type}}. This FM1 plays its own distortion instead.',
  },
  bitcrush: {
    hertz: '{{value}}Hz',
    kilohertz: '{{value}}k',
    noRecord:
      'This patch didn’t come from the FM1, so it takes the Bitcrush of the preset it’s written over.',
    otherFirmware:
      'Kept for Baud Girl’s firmware from FM-1_096: Bitcrush is on. This FM1 doesn’t play it.',
  },
  effectOrder: {
    title: 'Effect order',
    list: 'Effects, first to last',
    moveEarlier: 'Move {{effect}} earlier',
    moveLater: 'Move {{effect}} later',
    noRecord:
      'This patch didn’t come from the FM1, so it takes the order of the preset it’s written over.',
    otherFirmware:
      'Kept for Baud Girl’s firmware: a changed effect order. This FM1 plays the effects in its own order.',
    help: 'The order the sound passes through the effects on Baud Girl’s firmware, first at the left. Distortion before or after reverb, for example, sounds quite different. No MIDI message sets it, so you hear it once the patch is written to the FM1 with Send to FM1 or Write patches to the FM1.',
  },
  virtualAnalog: {
    oscillator: 'Oscillator',
    waveform: 'Waveform',
    waveforms: {
      sine: 'Sine',
      saw: 'Saw',
      triangle: 'Triangle',
      square: 'Square',
    },
    super: 'Super',
    detune: 'Detune',
    drift: 'Drift',
    sub: 'Sub',
    noise: 'Noise',
    pwm: 'PWM',
    filter: 'Filter',
    filterType: 'Filter type',
    filterTypes: {
      lowPass12: 'Low pass 12 dB',
      lowPass24: 'Low pass 24 dB',
      bandPass: 'Band pass',
      highPass: 'High pass',
    },
    cutoff: 'Cutoff',
    resonance: 'Resonance',
    filterEnvelope: 'Envelope amount',
    filterDecay: 'Envelope decay',
    filterShape: 'Envelope shape',
    filterVelocity: 'Velocity',
    keyTracking: 'Key tracking',
    lfoToCutoff: 'LFO to cutoff',
    output: 'Output',
    level: 'Level',
    velocityToLevel: 'Velocity to level',
    mono: 'Mono',
    lfo: 'LFO',
    envelope: 'Envelope',
    attack: 'Attack',
    decay: 'Decay',
    sustain: 'Sustain',
    release: 'Release',
    envelopeOff: 'Switch the envelope on to set it.',
    checking: 'Checking the FM1’s preset {{preset}}…',
    live: 'Your changes play on the FM1’s preset {{preset}} as you make them. Level, velocity to level, Mono, the LFO’s waveform, amp mod depth, pitch mod sensitivity and sync, switching the envelope off, and Distortion type, Bitcrush, and the effect order are heard once the patch is written to the FM1.',
    noProgram:
      'This patch isn’t in banks A–D, so the FM1 has no preset playing it. Your changes are heard once the patch is written to the FM1.',
    noFirmware:
      'With Baud Girl’s firmware FM-1_086 or later and MIDI on, your changes play on the FM1 as you make them. Until then, they’re heard once the patch is written to the FM1.',
    otherEngine:
      'The FM1’s preset {{preset}} plays another engine, so your changes aren’t sent to it. They’re heard once the patch is written to the FM1.',
    readFailed:
      'The FM1 didn’t answer when asked for its preset {{preset}}, so your changes aren’t sent to it. They’re heard once the patch is written to the FM1.',
  },
}

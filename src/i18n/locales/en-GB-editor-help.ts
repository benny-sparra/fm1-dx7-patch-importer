/**
 * British English help for the patch editor's controls and effects, and the editor's own labels.
 * Only the editor shows them, so they load with the editor's chunk rather than with the page:
 * `@/i18n/editor-help` adds them to `en-GB`, beside the few `editor` strings the page reads. Every
 * other locale keeps these sections in its own file.
 */
export default {
  editor: {
    selectedVoiceNotice:
      'On V16 this goes to the FM1’s selected Voice. Edits play live only on channel 1 or All; to hear it, select the Voice on channel {{channel}}.',
    editName: 'Edit patch name',
    patchName: 'Patch name',
    unsaved: 'Unsaved changes',
    presets: 'Voice presets',
    presetsShort: 'Presets',
    presetOptions: {
      'soft-pad': {
        name: 'Soft pad',
        description: 'Slow envelopes, chorus, and hall reverb.',
      },
      'bright-pluck': {
        name: 'Bright pluck',
        description: 'Crisp decay, small room, and light echo.',
      },
      'steady-organ': {
        name: 'Steady organ',
        description: 'Even sustain with chorus and phaser.',
      },
      'gentle-motion': {
        name: 'Gentle motion',
        description: 'Delayed LFO, chorus, and soft hall.',
      },
      'warm-filter': {
        name: 'Warm filter',
        description: 'Low-pass filter and a small room.',
      },
      'wide-space': {
        name: 'Wide space',
        description: 'Broad chorus and hall reverb.',
      },
    },
    moreSave: 'More save options',
    resend: 'Resend to FM1',
    resendHelp: 'Send the current editor settings again.',
    revert: 'Revert to saved',
    revertHelp: 'Discard edits and restore the saved patch.',
    compare: 'Compare with saved',
    showNotice: 'Show FM1 note',
    compareShort: 'Compare',
    comparingTitle: 'Playing the saved sound',
    comparingBody: 'Editing is paused. Press Esc or Compare to return to your edits.',
    configuration: 'Patch configuration',
    global: 'Global',
    effects: 'Effects',
    pitchEnvelope: 'Pitch envelope',
    pitchEnvelopePresets: 'Presets',
    pitchEnvelopePresetPlaceholder: 'Choose…',
    pitchEnvelopePresetOptions: {
      flat: 'Flat',
      blipUp: 'Attack blip up',
      attackDrop: 'Attack drop',
      scoop: 'Scoop',
      releaseFall: 'Release fall',
    },
    effectPreset: 'Preset',
    effectPresetPlaceholder: 'Choose…',
    effectPresetOptions: {
      warm: 'Warm',
      muffled: 'Muffled',
      telephone: 'Telephone',
      thin: 'Thin',
      resonant: 'Resonant',
      lightDrive: 'Light drive',
      warmDrive: 'Warm drive',
      crunch: 'Crunch',
      fuzz: 'Fuzz',
      smallRoom: 'Small room',
      largeRoom: 'Large room',
      smallHall: 'Small hall',
      largeHall: 'Large hall',
      plate: 'Plate',
      slapback: 'Slapback',
      quickDelay: 'Quick delay',
      quickRepeats: 'Quick repeats',
      echo: 'Echo',
      subtleChorus: 'Subtle chorus',
      ensemble: 'Ensemble',
      chorusWash: 'Chorus wash',
      shimmer: 'Shimmer',
      gentlePhase: 'Gentle phase',
      slowSweep: 'Slow sweep',
      deepPhase: 'Deep phase',
      fastSwirl: 'Fast swirl',
      sampler: 'Sampler',
      lofi: 'Lo-fi',
      eightBit: '8-bit',
      crushed: 'Crushed',
    },
    lfoGlobal: 'LFO & global',
    oscillatorSync: 'Oscillator sync',
    lfoSync: 'LFO sync',
    lfoWave: 'LFO waveform',
    lfoSpeed: 'LFO speed',
    lfoDelay: 'LFO delay',
    pitchModDepth: 'Pitch mod depth',
    ampModDepth: 'Amp mod depth',
    pitchModSensitivity: 'Pitch mod sens.',
    transpose: 'Transpose',
    operator: 'Operator {{number}}',
    operators: 'Operators',
    fmOperators: 'FM operators',
    outputLevel: 'Output level',
    amplitudeEnvelope: 'Amplitude envelope',
    algorithm: 'Algorithm',
    feedback: 'Feedback',
    carrier: 'Carrier',
    carrierShort: 'Car',
    modulator: 'Modulator',
    modulatorShort: 'Mod',
    output: 'Out',
    rate: 'Rate {{number}}',
    level: 'Level {{number}}',
    unsavedTitle: 'Unsaved patch changes',
    keepEditing: 'Keep editing',
    discard: 'Discard changes',
    saveAndReturn: 'Save and return',
    initVoice: 'Init voice',
    initVoiceHelp: 'A plain sine wave. Effects switch off.',
    randomise: 'Randomise',
    randomiseHelp: 'A new voice. Keeps the name and effects.',
  },
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
    menu: 'Actions for {{effect}}',
    dragTitle:
      'Drag to change where this effect sits in the order the sound passes through, first at the top left. With the keyboard, press Space, then the arrow keys. You hear the new order once the patch is written to the FM1.',
    noRecord:
      'This patch didn’t come from the FM1, so it takes the order of the preset it’s written over.',
    otherFirmware:
      'Kept for Baud Girl’s firmware: a changed effect order. This FM1 plays the effects in its own order.',
  },
  knobChoices: {
    title: 'Real-time control knobs',
    knob: 'Knob {{number}}',
    assign: 'Assign {{parameter}} to a knob',
    assignHeading: 'Assign {{parameter}} to',
    assigned: 'Already assigned',
    replaces: 'Replaces {{choice}}',
    help: 'Chooses what each of the FM1’s four knobs controls while this patch plays, from the eight settings its engine offers. The choices are saved with the patch and reach the FM1 when you write it with Send to FM1 or Write patches to the FM1.',
    noRecord:
      'This patch didn’t come from the FM1, so it takes the knobs of the preset it’s written over.',
    fm: {
      brightness: 'Brightness',
      feedback: 'Feedback',
      attack: 'Attack',
      decay: 'Decay',
      release: 'Release',
      vibrato: 'Vibrato',
      lfoSpeed: 'LFO speed',
      cutoff: 'Cutoff',
    },
    virtualAnalog: {
      cutoff: 'Cutoff',
      resonance: 'Resonance',
      filterEnvelope: 'Filter envelope',
      filterDecay: 'Filter decay',
      shape: 'Shape',
      super: 'Super',
      detune: 'Detune',
      lfoToCutoff: 'LFO to cutoff',
    },
    eightBit: {
      drumDecay: 'Drum decay',
      bassArpeggio: 'Bass arpeggio',
      leadArpeggio: 'Lead arpeggio',
      leadDecay: 'Lead decay',
      leadArpSpeed: 'Lead arp speed',
      leadVibrato: 'Lead vibrato',
      leadRelease: 'Lead release',
      bassDecay: 'Bass decay',
    },
  },
  eightBit: {
    help: {
      drumPreset:
        'A drum from the FM1’s own kit, as a starting point for this one. Its Level stays as it is.',
      partPreset:
        'A sound to start this part from: its wave, duty sequence, and note shape. Its Arpeggio, Octave, Level, and Mono stay as they are.',
      key: 'Puts both parts in a key, so each key you press plays the chord that belongs on it in the scale. At Off, each part plays its Arpeggio instead. A patch’s first Key sets each part’s Chord and Pattern from its Arpeggio, as the FM1 does.',
      accidentals:
        'What the five keys outside the scale play. Borrowed makes each the root of a chord from outside the scale; Leading makes it the third of a major chord that leads up to the key above.',
      voicing:
        'From Key starts each chord on the key you press. Close keeps every chord’s notes within an octave above the tonic, so fewer notes move between chords.',
      leadFollows:
        'At Bass, the lead takes its chord from the last bass key you played, so one hand plays the progression under the other.',
      arpSync:
        'Key starts each arpeggio as its key goes down. Beat puts every arpeggio step on one grid at the tempo, or on the steps of a playing pattern.',
      tone: 'Raw is the plain emulated wave. Smooth softens each edge and passes the sound through the console’s own output filters.',
      tuning:
        'Exact plays every note in tune. Chip uses only the pitches the console could make, which drifts at the top of the keyboard.',
      drums: 'Twelve drums on the keys F0 to E1. Choose one to edit it.',
      drumDecay:
        'Makes every drum ring longer or shorter at once, keeping their differences. At 50 each rings for its own Decay.',
      choke:
        'A drum in group A, B, or C stops any other drum of its group that is still ringing, as a closed hi-hat stops an open one.',
      snap: 'A burst of noise under the tone, which makes a hit sound like a snare.',
      sweep: 'How far the pitch falls or rises while the note sounds. 0 holds it still.',
      dutySequence:
        'Changes a pulse wave’s width while the note sounds, for movement on one channel. It changes only the four Pulse waves.',
      arpeggio:
        'The chord one key plays, a note at a time, while the patch has no Key. User plays the steps you set under User arpeggio.',
      chord:
        'Which notes of the scale each key plays. Not played while Pattern is User, whose steps choose the notes.',
      pattern:
        'The order the chord’s notes play in, counted up from its lowest note. Off plays the key alone.',
      noteEngine:
        'Auto-Arp plays the part’s chord a note at a time. Auto-Chord plays its notes together, up to four.',
      userArpeggio:
        'Eight steps in semitones from the key you press, −12 to +18. A step turned past +18 reads End and loops back to the first step.',
      glide: 'How long the pitch takes to slide to the next note. Glide needs Mono on.',
    },
    drumPresets: {
      kick: 'Kick',
      snare: 'Snare',
      noiseSnare: 'Noise snare',
      rim: 'Rim',
      closedHat: 'Closed hat',
      openHat: 'Open hat',
      metalHat: 'Metal hat',
      crash: 'Crash',
      lowTom: 'Low tom',
      midTom: 'Mid tom',
      highTom: 'High tom',
      blip: 'Blip',
    },
    partPresets: {
      triangle: 'Triangle bass',
      pulse: 'Pulse lead',
      square: 'Square',
      pluck: 'Pluck',
      wobble: 'Wobble',
      sweep: 'Sweep',
      gbBass: 'GB bass',
      organ: 'Organ',
      bell: 'Bell',
      pad: 'Soft pad',
    },
    starters: {
      console: {
        name: 'Console',
        description:
          'The FM1’s own kit, a triangle bass, and a pulse lead, through the console’s filters.',
      },
      rawChip: {
        name: 'Raw chip',
        description:
          'The kit with a square bass and a sweeping lead, raw and tuned as the chip was.',
      },
      gameBoy: {
        name: 'Game Boy',
        description: 'The kit with the Game Boy’s bass and bell waves.',
      },
      arpLead: {
        name: 'Arpeggio lead',
        description:
          'A plucked bass under a square lead that plays a fast major arpeggio while the patch has no Key.',
      },
    },
    key: 'Key',
    partSetting: '{{part}} {{setting}}',
    keySettings: 'Settings that follow the Key',
    scale: 'Scale',
    accidentals: 'Accidentals',
    voicing: 'Voicing',
    leadFollows: 'Lead follows',
    arpSync: 'Arp sync',
    tone: 'Tone',
    tuning: 'Tuning',
    drums: 'Drums',
    drumsLevel: 'Drums level',
    drumDecay: 'Drum decay',
    drum: 'Drum',
    drumHeading: 'Drum {{drum}}',
    wave: 'Wave',
    choke: 'Choke',
    pitch: 'Pitch',
    sweep: 'Sweep',
    decay: 'Decay',
    level: 'Level',
    snap: 'Snap',
    bass: 'Bass',
    lead: 'Lead',
    dutySequence: 'Duty sequence',
    dutySequenceUnheard:
      'A duty sequence changes only the four Pulse waves, so this part’s isn’t heard.',
    arpeggio: 'Arpeggio',
    chord: 'Chord',
    pattern: 'Pattern',
    arpSpeed: 'Arp speed',
    noteEngine: 'Note engine',
    userArpeggio: 'User arpeggio',
    step: 'Step {{step}}',
    vibrato: 'Vibrato',
    glide: 'Glide',
    octave: 'Octave',
    mono: 'Mono',
    initPatch: 'Init patch',
    initPatchHelp: 'The FM1’s own blank 8-Bit preset. Effects switch off.',
    live: 'The Envelope, LFO, and effects play live. Everything else is heard once the patch is written to the FM1.',
    noFirmware:
      'Live playback needs Baud Girl’s FM-1_096 or later and MIDI on. Until then, changes are heard once the patch is written to the FM1.',
  },
  virtualAnalog: {
    help: {
      waveform:
        'The oscillator’s basic wave. Sine is soft, saw is bright and buzzy, triangle sits between them, and square is hollow but harder than sine.',
      super:
        'Adds six more copies of the wave around the one you chose. Turn Detune up too to spread them into a thick, supersaw-like sound.',
      detune:
        'How far apart in pitch the copies Super adds are. It does nothing while Super is at 0.',
      drift:
        'Puts each note slightly out of tune, as vintage oscillators do. Through the upper half it becomes deliberately unsteady.',
      sub: 'Adds a square wave an octave below each note, for weight.',
      noise: 'Mixes hiss in with the wave.',
      pwm: 'Sweeps the width of the square wave so the tone moves by itself. It works only with the square waveform.',
      filterType:
        'Which part of the sound the filter removes. Low pass takes off the top, gently at 12 dB or steeply at 24 dB; band pass keeps a band around the cutoff; high pass takes off the bottom.',
      cutoff: 'The frequency the filter works from. Lower it to make the sound darker.',
      resonance: 'Boosts the sound right at the cutoff, until the filter whistles.',
      filterEnvelope: 'How far the filter’s own envelope moves the cutoff on each note.',
      filterDecay:
        'How long the filter envelope’s move takes. Short, with the envelope amount well up, makes a pluck.',
      filterShape: 'What the filter envelope’s move looks like, from its rise to its fall.',
      filterVelocity: 'How far playing harder raises the cutoff. It leaves the loudness alone.',
      keyTracking:
        'How far the cutoff follows the notes you play up the keyboard. While it is on, the graph sketches the filter for the three lit keys, the outer two as matching dashed curves.',
      lfoToCutoff: 'How far the LFO moves the cutoff.',
      level: 'How loud this patch is beside the others, about 0.74 dB a step.',
      velocityToLevel:
        'How much louder a note gets when you play harder. At 0 every note is equally loud.',
      mono: 'Plays one note at a time. A new key takes over from the held one without a fresh attack.',
      envelope:
        'One attack, decay, sustain, and release for the whole patch while it is switched on. Drag its points or move its faders. Release fades a note over 0.1 seconds at 0 to 2 seconds at 100. Raise Sustain when you switch it on, since at 0 a held note is short.',
    },
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
    keyTrackingNote: 'C{{octave}}',
    lfoToCutoff: 'LFO to cutoff',
    level: 'Level',
    velocityToLevel: 'Velocity to level',
    mono: 'Monophonic',
    lfo: 'LFO',
    envelope: 'Envelope',
    attack: 'Attack',
    decay: 'Decay',
    sustain: 'Sustain',
    release: 'Release',
    noProgram: 'This patch isn’t in banks A–D, so changes are heard once it’s written to the FM1.',
    noFirmware:
      'Live playback needs Baud Girl’s FM-1_086 or later and MIDI on. Until then, changes are heard once the patch is written to the FM1.',
    otherEngine:
      'The FM1’s preset {{preset}} plays another engine, so changes aren’t sent. They’re heard once the patch is written to the FM1.',
    readFailed:
      'The FM1 didn’t answer for its preset {{preset}}, so changes aren’t sent. They’re heard once the patch is written to the FM1.',
    presets: 'Sound presets',
    initPatch: 'Init patch',
    initPatchHelp: 'A plain saw wave, filter open. Effects switch off.',
    randomiseHelp: 'A new sound. Keeps the name, level, and effects.',
    presetOptions: {
      'super-saw': {
        name: 'Super saw',
        description: 'Detuned saws, chorus, and hall reverb.',
      },
      'mono-bass': {
        name: 'Mono bass',
        description: 'Square and sub, one note at a time.',
      },
      'filter-pluck': {
        name: 'Filter pluck',
        description: 'Short filter sweep, echo, and a small room.',
      },
      'warm-pad': {
        name: 'Warm pad',
        description: 'Slow attack, gentle drift, and hall reverb.',
      },
      'pulse-strings': {
        name: 'Pulse strings',
        description: 'Moving square wave, chorus, and hall reverb.',
      },
      'vibrato-lead': {
        name: 'Vibrato lead',
        description: 'One note at a time, delayed vibrato, and echo.',
      },
    },
  },
  ui: {
    auditionGroup: 'Operator {{number}} audition',
    mute: 'Mute',
    unmute: 'Unmute',
    solo: 'Solo',
    unsolo: 'Unsolo',
    auditionAction: '{{action}} operator {{number}} for audition',
    auditionTemporary: '{{action}} operator {{number}} temporarily',
    auditionConnect: '{{action}} operator {{number}}; connect MIDI to hear audition changes',
    operatorOutput: 'Operator {{number}} output level',
    oscillator: 'Oscillator',
    mode: 'Mode',
    coarse: 'Coarse',
    fine: 'Fine',
    detune: 'Detune',
    ratioEntry: 'Ratio',
    fixedFrequencyEntry: 'Frequency (Hz)',
    ratioEntryInvalid: 'Type the ratio as a number, such as 3.5.',
    fixedFrequencyEntryInvalid: 'Type the frequency in hertz, such as 440.',
    keyboardScaling: 'Scaling',
    breakpoint: 'Breakpoint',
    leftDepth: 'Left depth',
    rightDepth: 'Right depth',
    rateScaling: 'Rate scaling',
    leftCurve: 'Left curve',
    rightCurve: 'Right curve',
    velocity: 'Velocity',
    ampModSensitivity: 'Amp mod sens.',
    lfoWave: 'LFO wave',
    dx7Algorithm: 'DX7 algorithm',
    unsavedBody:
      'Save this working copy to your library, or discard it and restore the saved patch on the FM1.',
    revertTitle: 'Discard every edit since the last library save and restore that patch on the FM1',
    rotaryTitle: '{{label}}: {{value}}. Drag up or down to adjust.',
    envelopePoint: '{{title}} point {{point}}',
    envelopePointValue: 'Rate {{rate}}, level {{level}}',
    envelopeRate: '{{title}} rate {{point}}',
    envelopeLevel: '{{title}} level {{point}}',
    chooseAlgorithm: 'Algorithm {{number}}. Choose algorithm',
    algorithmNumber: 'Algorithm {{number}}',
    operatorSummary: 'Operator {{number}}, {{role}}',
    operatorSummaryWithAudition: 'Operator {{number}}, {{role}}, {{audition}}',
    operatorMuted: 'muted',
    operatorSoloed: 'soloed',
    operatorMenu: 'Operator {{number}} actions',
    copyOperatorAction: 'Copy operator {{number}}',
    pasteOperatorAction: 'Paste operator {{source}}',
    pasteOperatorFromPatchAction: 'Paste operator {{source}} from “{{patch}}”',
    pasteOperatorEmpty: 'Paste (copy an operator or its envelope first)',
    copyEnvelopeAction: 'Copy operator {{number}} envelope',
    pasteEnvelopeAction: 'Paste operator {{source}} envelope',
    pasteEnvelopeFromPatchAction: 'Paste operator {{source}} envelope from “{{patch}}”',
    lfoWaves: {
      triangle: 'Triangle',
      sawDown: 'Saw down',
      sawUp: 'Saw up',
      square: 'Square',
      sine: 'Sine',
      sampleAndHold: 'Sample & hold',
    },
    oscillatorModes: {
      ratio: 'Ratio',
      fixed: 'Fixed',
    },
    curves: {
      negativeLinear: '− Linear',
      negativeExponential: '− Exponential',
      positiveExponential: '+ Exponential',
      positiveLinear: '+ Linear',
    },
    effects: {
      filter: 'Filter',
      reverb: 'Reverb',
      delay: 'Delay',
      distortion: 'Distortion',
      chorus: 'Chorus',
      phaser: 'Phaser',
      bitcrush: 'Bitcrush',
    },
    parameters: {
      depth: 'Depth',
      type: 'Type',
      cutoff: 'Cutoff',
      resonance: 'Resonance',
      space: 'Space',
      decay: 'Decay',
      mix: 'Mix',
      rate: 'Rate',
      gain: 'Gain',
      tone: 'Tone',
      level: 'Level',
      frequency: 'Frequency',
      bits: 'Bits',
      sampleRate: 'Sample rate',
    },
    options: {
      lowPass: 'Low pass',
      bandPass: 'Band pass',
      highPass: 'High pass',
      room: 'Room',
      hall: 'Hall',
      plate: 'Plate',
    },
  },
  banks: {
    reorder: 'Reorder {{name}}',
  },
}

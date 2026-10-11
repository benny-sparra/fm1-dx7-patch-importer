export default {
  dialogs: {
    bankTitle: 'Оберіть банк призначення на FM1',
    bankIntro: 'Коли FM1 буде готовий, надішліть SysEx і завершіть імпорт на самому пристрої.',
    bankClose: 'Закрити інструкції з вибору банку',
    bankStep1: 'Дочекайтеся, поки на дисплеї FM1 з’явиться екран вибору банку.',
    bankStep2: 'Поверніть ручку 1, 2, 3 або 4, щоб обрати банк A, B, C або D.',
    bankStep3: 'Після короткої паузи FM1 сам збереже 32 патчі.',
    bankFm1VaStep1:
      'FM1 запитає «Replace Bank A?» і почне з банку A, хоч би який банк ви надсилали.',
    bankFm1VaStep2:
      'Повертайте ALGORITHM, доки на дисплеї не з’явиться потрібний банк: A, B, C чи D.',
    bankFm1VaStep3:
      'Поверніть SELECT на Replace і натисніть SEL, щоб зберегти 32 патчі, або натисніть HOME, щоб скасувати. При цьому заводські пресети цього банку буде замінено назавжди.',
    bankFm1VaNote:
      'На прошивці Baud Girl FM1 натомість запитає «Replace Bank A?» і почне з банку A. Поверніть ALGORITHM до потрібного банку, а SELECT — на Replace, і натисніть SEL.',
    bankFeluccaNote: 'Felucca ігнорує банки DX7, тож надсилання цього банку не змінить її пресети.',
    bankFeluccaOrSloopNote:
      'Felucca і SLOOP ігнорують банки DX7, тож надсилання цього банку не змінить пресети FM1.',
    bankFm1VaImage:
      'Дисплей FM1 із прошивкою Baud Girl питає «Replace Bank A?» з варіантами Cancel і Replace',
    bankImage:
      'Дисплей FM1 із прошивкою M-VAVE показує «32 Voice Save To …» над банками A, B, C і D',
    dontShow: 'Більше не показувати в цьому сеансі',
    midiTitle: 'Підключіть MIDI, щоб надіслати цей банк',
    midiIntro: 'Щоб надіслати банк, FM1 має бути підключений як MIDI-вихід.',
    midiClose: 'Закрити повідомлення про підключення MIDI',
    midiSteps:
      'Увімкніть «MIDI онлайн» угорі сторінки, надайте доступ до MIDI, а потім оберіть MIDI-вихід FM1 у налаштуваннях.',
    restoreTitle: 'Скинути до заводських патчів?',
    restoreIntro: 'Це замінить усі чотири банки. Одразу після скидання його можна скасувати.',
    restoreClose: 'Закрити скидання до заводських патчів',
    restoreDetails:
      'Банки A, B, C і D буде скинуто до банків FM-1 1, 2, 3 і 4, тобто до патчів, з якими FM1 постачається.',
    restoreAction: 'Скинути чотири банки',
    sourcesTitle: 'Знайти банки DX7',
    sourcesIntro:
      'Завантажте банк SysEx для DX7 на 32 voice (.syx), потім поверніться сюди й оберіть «Імпортувати банк DX7…».',
    sourceDescriptions: {
      yamahaBlackBoxes: 'Заводські картриджі й банки SysEx для DX7.',
      bobbyBlues: 'Давня колекція патчів і банків DX7.',
      soundarchive: 'Добірка банків SysEx для DX7, TX816 і TX802.',
      fm1FactoryPresets:
        'Заводські пресети FM-1, видобуті з утиліти відновлення M-VAVE. Також є в каталозі банків.',
    },
    sourcesClose: 'Закрити джерела банків',
    sourcesSubmit: 'Створили власний банк DX7?',
    sourcesSubmitLink: 'Поділіться ним у каталозі банків',
  },
  ui: {
    auditionGroup: 'Прослуховування оператора {{number}}',
    mute: 'Mute',
    unmute: 'Unmute',
    solo: 'Solo',
    unsolo: 'Unsolo',
    auditionAction: '{{action}}: оператор {{number}} на час прослуховування',
    auditionTemporary: '{{action}}: оператор {{number}}, тимчасово',
    auditionConnect: '{{action}}: оператор {{number}}; підключіть MIDI, щоб чути зміни',
    operatorOutput: 'Вихідний рівень оператора {{number}}',
    oscillator: 'Oscillator',
    mode: 'Mode',
    coarse: 'Coarse',
    fine: 'Fine',
    detune: 'Detune',
    ratioEntry: 'Ratio',
    fixedFrequencyEntry: 'Frequency (Hz)',
    ratioEntryInvalid: 'Введіть Ratio числом, наприклад 3.5.',
    fixedFrequencyEntryInvalid: 'Введіть частоту в герцах, наприклад 440.',
    keyboardScaling: 'Scaling',
    breakpoint: 'Breakpoint',
    left: 'Left',
    right: 'Right',
    leftDepth: 'Left depth',
    rightDepth: 'Right depth',
    rateScaling: 'Rate scaling',
    leftCurve: 'Left curve',
    rightCurve: 'Right curve',
    velocity: 'Velocity',
    ampModSensitivity: 'Amp mod sens.',
    lfoWave: 'LFO wave',
    dx7Algorithm: 'DX7 algorithm',
    unsavedBody: 'Якщо не зберегти зміни до бібліотеки, на FM1 повернеться збережений патч.',
    revertTitle:
      'Скинути всі зміни після останнього збереження в бібліотеці й надіслати збережений патч на FM1',
    keyboard: 'Клавіатура',
    pianoKeyboard: 'Фортепіанна клавіатура',
    dragKeyboard: 'Перетягнути клавіатуру',
    closeKeyboard: 'Закрити клавіатуру',
    keyLevel: 'Level',
    phrase: 'Фраза',
    play: 'Грати',
    stop: 'Стоп',
    playPhrase: 'Грати фразу',
    stopPhrase: 'Зупинити фразу',
    tempo: 'Темп',
    tempoValue: '{{tempo}} BPM',
    phrases: {
      pad: 'Pad',
      electricPiano: 'Electric piano',
      bass: 'Bass',
      lead: 'Lead',
      arpeggio: 'Arpeggio',
      velocityRamp: 'Velocity ramp',
    },
    helpOpenFailed: 'Не вдалося відкрити посібник. Перезавантажте сторінку й спробуйте ще раз.',
    keyboardOpenFailed:
      'Не вдалося відкрити клавіатуру. Перезавантажте сторінку й спробуйте ще раз.',
    shiftOctave: 'Зсунути октаву {{direction}}',
    playNote: 'Зіграти {{note}}',
    helpFor: 'Довідка: {{label}}',
    rotaryTitle: '{{label}}: {{value}}. Перетягніть угору чи вниз, щоб змінити.',
    envelopePoint: '{{title}}: точка {{point}}',
    envelopePointValue: 'Rate {{rate}}, Level {{level}}',
    envelopeRate: '{{title}}: Rate {{point}}',
    envelopeLevel: '{{title}}: Level {{point}}',
    chooseAlgorithm: 'Алгоритм {{number}}. Оберіть алгоритм',
    algorithmNumber: 'Algorithm {{number}}',
    operatorSummary: 'Operator {{number}}, {{role}}',
    operatorSummaryWithAudition: 'Operator {{number}}, {{role}}, {{audition}}',
    operatorMuted: 'заглушено',
    operatorSoloed: 'соло',
    operatorMenu: 'Дії з оператором {{number}}',
    copyOperatorAction: 'Копіювати оператор {{number}}',
    pasteOperatorAction: 'Вставити оператор {{source}}',
    pasteOperatorFromPatchAction: 'Вставити оператор {{source}} з «{{patch}}»',
    pasteOperatorEmpty: 'Вставити (спершу скопіюйте оператор або його обвідну)',
    copyEnvelopeAction: 'Копіювати обвідну оператора {{number}}',
    pasteEnvelopeAction: 'Вставити обвідну оператора {{source}}',
    pasteEnvelopeFromPatchAction: 'Вставити обвідну оператора {{source}} з «{{patch}}»',
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
    directionDown: 'вниз',
    directionUp: 'вгору',
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
  controlHelp: {
    algorithm:
      'Визначає, як з’єднано шість операторів. Оператори в нижньому ряду — несучі (Carrier), саме їх ви чуєте. Ті, що вище, — модулятори (Modulator): вони змінюють тембр операторів під собою.',
    feedback:
      'Подає частину сигналу оператора назад на його вхід. Що вище значення, то яскравіші й грубші гармоніки, аж до шуму.',
    pitchEnvelope:
      'Змінює висоту тону впродовж кожної ноти. Чотири Rate задають швидкість кожного етапу, а чотири Level — висоту, якої він досягає.',
    pitchEnvelopePresets:
      'Замінює всі вісім Rate і Level готовою формою. Flat прибирає будь-яку зміну висоти, а решта додають короткий сплеск на початку (Attack blip up), спад висоти на атаці (Attack drop), підтяг знизу (Scoop) або просідання висоти наприкінці ноти (Release fall). «Скасувати» повертає попередню обвідну.',
    effectPresets:
      'Задає регуляторам цього ефекту готові початкові значення. Пресет можна обрати, коли ефект увімкнено. Інші ефекти не змінюються, а «Скасувати» повертає попередні налаштування.',
    oscillatorSync:
      'Запускає хвилі всіх операторів щоразу з того самого місця, тож кожна нота починається однаково. Коли Oscillator sync вимкнено, атака щоразу трохи інша й звучить живіше.',
    lfoSync:
      'Перезапускає LFO з кожною новою нотою, тож модуляція щоразу звучить однаково. Коли LFO sync вимкнено, LFO працює безперервно, і кожна нота потрапляє на іншу його фазу.',
    lfoWave:
      'Визначає форму хвилі LFO для вібрато й тремоло. Sine змінюється плавно, Square перемикається між двома значеннями, а Sample & hold стрибає випадково.',
    lfoSpeed: 'Задає швидкість циклів LFO. Що вище значення, то швидше вібрато чи тремоло.',
    lfoDelay:
      'Затримує LFO після початку ноти, тож вібрато чи тремоло наростає поступово, а не з’являється одразу.',
    pitchModDepth:
      'Задає найбільшу глибину вібрато від LFO. Наскільки сильно його чути, залежить від Pitch mod sens.',
    ampModDepth:
      'Задає найбільшу глибину тремоло від LFO. Наскільки сильно на нього реагує кожен оператор, залежить від його Amp mod sens.',
    pitchModSensitivity:
      'Визначає, наскільки сильно LFO змінює висоту тону всього патча. Що вище значення, то ширше вібрато.',
    transpose:
      'Зсуває весь патч на півтони вгору чи вниз, а клавіші, на яких ви граєте, лишаються тими самими.',
    operator:
      'Оператор — це осцилятор із власною обвідною. Несучі оператори (Carrier) дають чутний звук, а модулятори (Modulator) змінюють інший оператор і створюють гармоніки.',
    outputLevel:
      'Задає рівень цього оператора. У несучого (Carrier) він впливає переважно на гучність, у модулятора (Modulator) — на яскравість і кількість гармонік.',
    amplitudeEnvelope:
      'Задає, як змінюється рівень цього оператора впродовж ноти. Зсув точки вліво чи вправо змінює швидкість етапу, а вгору чи вниз — його Level. У модулятора (Modulator) обвідна керує яскравістю, а не гучністю.',
    oscillatorMode:
      'У режимі Ratio частота залежить від зіграної ноти, і це найкраще для тональних гармонік. Fixed тримає сталу частоту, що добре підходить для металевих, шумових чи ударних звуків.',
    coarse:
      'Грубо задає частоту оператора: у режимі Ratio — співвідношення до зіграної ноти, у режимі Fixed — діапазон частот. Цілі співвідношення зазвичай звучать гармонійно.',
    fine: 'Точно підлаштовує частоту оператора між кроками Coarse. Навіть невеликі зміни можуть додати нових гармонік або пульсації.',
    ratioEntry:
      'Задає співвідношення числом, наприклад 3.5. Поле показує найближче значення, яке може відтворити FM1, а Coarse і Fine переходять на нього.',
    fixedFrequencyEntry:
      'Задає частоту в герцах, наприклад 440 або 1.2k. Поле показує найближчу частоту, яку може відтворити FM1, а Coarse і Fine переходять на неї.',
    detune:
      'Трохи зсуває стрій цього оператора. Невеликий Detune ущільнює звук, а більший дає помітну пульсацію чи дисонанс.',
    breakpoint:
      'Визначає ноту, яка ділить клавіатуру надвоє: нижче неї рівень цього оператора змінюють Left depth і Left curve, вище — Right depth і Right curve.',
    leftDepth:
      'Задає, наскільки змінюється рівень цього оператора на нотах нижче Breakpoint: що далі від неї, то більша зміна.',
    rightDepth:
      'Задає, наскільки змінюється рівень цього оператора на нотах вище Breakpoint: що далі від неї, то більша зміна.',
    curve:
      'Визначає, як змінюється рівень у міру віддалення від Breakpoint: «−» знижує його, «+» підвищує. Linear змінює рівень рівномірно, Exponential — що далі, то різкіше.',
    rateScaling:
      'Пришвидшує обвідну цього оператора на вищих нотах, як у багатьох акустичних інструментів, де високі ноти згасають швидше.',
    velocity:
      'Задає, наскільки сила удару по клавіші змінює рівень цього оператора. У несучого (Carrier) це гучність, у модулятора (Modulator) — яскравість.',
    ampModSensitivity:
      'Задає, наскільки цей оператор реагує на амплітудну модуляцію від LFO. У несучого (Carrier) виходить тремоло, а в модулятора (Modulator) тембр ритмічно змінюється.',
  },
  effectHelp: {
    Filter:
      'Вирізає частину частотного спектра. Готовий FM-звук стає темнішим, тоншим або набуває іншого характеру.',
    Reverb: 'Імітує акустику приміщення. Звук стає просторішим і глибшим.',
    Delay:
      'Повторює звук із короткою затримкою. Decay діє як зворотний зв’язок і визначає, як довго звучать повтори.',
    Distortion:
      'Додає сатурацію й нові гармоніки. Тихий звук стає щільнішим, а агресивний — ще жорсткішим.',
    Chorus: 'Додає до звуку кілька копій із ледь відмінною висотою. Звук стає ширшим і живішим.',
    Phaser: 'Плавно зсуває вирізані частоти вздовж спектра. Звук стає порожнистим і мінливим.',
    Bitcrush:
      'Зменшує розрядність і частоту дискретизації. Звук стає шорстким, у дусі lo-fi. Працює лише на прошивці Baud Girl від FM-1_096. MIDI ним не керує, тож ви почуєте його, щойно патч буде записано на FM1 командою «Надіслати на FM1» або «Записати патчі на FM1».',
  },
  effectParameterHelp: {
    'Filter Type':
      'Визначає, що Filter пропускає: Low pass — низи, High pass — верхи, Band pass — середню смугу.',
    'Filter Cutoff':
      'Задає частоту, від якої діє Filter: приблизно від 100 Гц при 0 до 20 кГц при 107. Які частоти він прибирає, вищі чи нижчі, залежить від Type.',
    'Filter Resonance':
      'Підсилює частоти навколо Cutoff. Що вище значення, то різкіший і виразніший звук.',
    'Reverb Space': 'Визначає характер простору: Room, Hall або яскравий Plate.',
    'Reverb Decay': 'Задає, як довго звучить хвіст Reverb.',
    'Reverb Mix': 'Задає баланс сухого сигналу й Reverb. При 0% чути лише оригінальний звук.',
    'Delay Decay':
      'Задає, скільки звуку кожного повтору знову подається в Delay. Що вище значення, то більше повторів, перш ніж вони стихнуть.',
    'Delay Rate':
      'Задає час між повторами. Що вище значення, то частіші повтори: приблизно від 0,8 секунди при 0 до 0,1 секунди при 100.',
    'Delay Mix': 'Задає баланс сухого сигналу й повторів. При 0% чути лише оригінальний звук.',
    'Distortion Gain':
      'Задає, наскільки сильно Distortion перевантажує сигнал. Що вище значення, то більше сатурації й гармонік.',
    'Distortion Tone': 'Регулює яскравість звуку після Distortion.',
    'Distortion Level': 'Задає гучність після Distortion, щоб вирівняти її з гучністю без ефекту.',
    'Distortion Type':
      'Визначає, як Distortion формує звук на прошивці Baud Girl. Soft Clip, оригінальний від M-VAVE, згладжує піки; Hard Clip рівно їх зрізає, і звук стає жорсткішим; Foldback відбиває їх назад, і звук стає яскравішим, металевим. MIDI ним не керує, тож ви почуєте його, щойно патч буде записано на FM1 командою «Надіслати на FM1» або «Записати патчі на FM1».',
    'Chorus Frequency': 'Задає швидкість руху Chorus: приблизно від 0,1 до 1 Гц.',
    'Chorus Depth':
      'Задає, наскільки сильно Chorus змінює висоту тону. Що вище значення, то ширший і помітніший ефект.',
    'Chorus Mix': 'Задає баланс сухого сигналу й Chorus.',
    'Phaser Frequency': 'Задає швидкість руху Phaser: приблизно від 0,5 до 6 Гц.',
    'Phaser Depth': 'Задає діапазон і силу ефекту Phaser.',
    'Phaser Mix': 'Задає баланс сухого сигналу й Phaser.',
    'Bitcrush Bits':
      'Задає розрядність: від 16, що звучить чисто, до 1. На найнижчих значеннях тихий патч може зникати.',
    'Bitcrush Sample Rate':
      'Задає частоту дискретизації: від 300 Гц до 44,1 кГц. Що нижча частота, то більше різких металевих обертонів.',
    'Bitcrush Mix': 'Задає баланс чистого й обробленого звуку. При 0% чути лише оригінальний звук.',
  },
  distortionType: {
    softClip: 'Soft Clip',
    hardClip: 'Hard Clip',
    foldback: 'Foldback',
    unknown: 'Невідомий ({{value, number}})',
    noRecord: 'Цей патч не з FM1, тож тип Distortion успадкується від пресету, який він замінить.',
    otherFirmware:
      'Збережено для прошивки Baud Girl: {{type}}. Цей FM1 використовує власний Distortion.',
  },
  bitcrush: {
    hertz: '{{value}}Hz',
    kilohertz: '{{value}}k',
    noRecord: 'Цей патч не з FM1, тож Bitcrush успадкується від пресету, який він замінить.',
    otherFirmware:
      'Збережено для прошивки Baud Girl від FM-1_096: Bitcrush увімкнено. Цей FM1 його не підтримує.',
  },
  knobChoices: {
    title: 'Real-time control knobs',
    knob: 'Knob {{number}}',
    assign: 'Призначити {{parameter}} на ручку',
    assignHeading: 'Призначити {{parameter}} на',
    assigned: 'Уже призначено',
    replaces: 'Замість {{choice}}',
    help: 'Задає, чим керує кожна з чотирьох ручок FM1 у цьому патчі. На вибір — вісім параметрів, які залежать від рушія патча: FM, Virtual Analog чи 8-Bit. Призначення зберігаються в патчі й потраплять на FM1, коли ви запишете його командою «Надіслати на FM1» або «Записати патчі на FM1».',
    noRecord:
      'Цей патч не з FM1, тож призначення ручок успадкується від пресету, який він замінить.',
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
  effectOrder: {
    dragTitle:
      'Перетягніть, щоб змінити місце ефекту в ланцюжку обробки; перший — угорі ліворуч. З клавіатури натисніть пробіл, а потім стрілки. Новий порядок буде чути, щойно патч буде записано на FM1.',
    noRecord: 'Цей патч не з FM1, тож порядок ефектів успадкується від пресету, який він замінить.',
    otherFirmware:
      'Збережено для прошивки Baud Girl: змінений порядок ефектів. Цей FM1 обробляє ефекти у власному порядку.',
  },
  virtualAnalog: {
    help: {
      waveform:
        'Базова хвиля осцилятора. Sine м’який, Saw яскравий і різкий, Triangle — щось між ними, а Square порожнистий, але жорсткіший за Sine.',
      super:
        'Додає ще шість копій хвилі довкола обраної. Якщо підняти й Detune, копії розходяться за висотою, і виходить щільний звук на кшталт supersaw.',
      detune:
        'Наскільки різняться за висотою копії, які додає Super. Поки Super на 0, Detune ні на що не впливає.',
      drift:
        'Трохи розлаштовує кожну ноту, як вінтажні осцилятори. У верхній половині діапазону звук стає навмисно нестабільним.',
      sub: 'Додає Square на октаву нижче кожної ноти, щоб звук був щільнішим.',
      noise: 'Підмішує до хвилі шипіння.',
      pwm: 'Безперервно змінює ширину імпульсу Square, тож тембр не стоїть на місці. Працює лише тоді, коли Waveform — Square.',
      filterType:
        'Яку частину звуку прибирає Filter. Low pass зрізає верхи — м’яко на 12 дБ або різко на 24 дБ; Band pass залишає смугу навколо Cutoff; High pass зрізає низи.',
      cutoff: 'Частота, від якої діє Filter. Що нижче Cutoff, то темніший звук.',
      resonance: 'Підсилює звук саме на частоті Cutoff, аж до свисту фільтра.',
      filterEnvelope: 'Наскільки власна обвідна фільтра зсуває Cutoff на кожній ноті.',
      filterDecay:
        'Як довго триває рух обвідної фільтра. Короткий Decay із великим Envelope amount дає щипковий звук.',
      filterShape: 'Задає форму руху обвідної фільтра: як Cutoff піднімається й опускається.',
      filterVelocity:
        'Наскільки сильніший удар по клавіші піднімає Cutoff. Гучність від цього не змінюється.',
      keyTracking:
        'Наскільки Cutoff підвищується з висотою зіграної ноти. Коли Key tracking увімкнено, графік показує криву Filter для кожної з трьох підсвічених клавіш; для двох крайніх це однакові пунктирні лінії.',
      lfoToCutoff: 'Наскільки LFO зсуває Cutoff.',
      level: 'Наскільки гучний цей патч порівняно з іншими, приблизно 0,74 дБ на крок.',
      velocityToLevel:
        'Наскільки гучнішає нота, коли ви граєте сильніше. При 0 усі ноти однаково гучні.',
      mono: 'Звучить лише одна нота водночас. Нова клавіша перехоплює утримувану без нової атаки.',
      envelope:
        'Один набір Attack, Decay, Sustain і Release для всього патча, коли Envelope увімкнено. Його точки можна перетягувати, а фейдери — рухати. З Release нота згасає від 0,1 секунди при 0 до 2 секунд при 100. При Sustain на 0 утримувана нота звучить коротко, тож після ввімкнення Envelope його варто підняти.',
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
    checking: 'Перевірка пресету {{preset}} на FM1…',
    noProgram:
      'Цього патча немає в банках A–D, тож на FM1 він ще не записаний. Ваші зміни буде чути, щойно патч буде записано на FM1.',
    noFirmware:
      'З прошивкою Baud Girl FM-1_086 або новішою та ввімкненим MIDI зміни звучать на FM1 одразу. Інакше їх буде чути, щойно патч буде записано на FM1.',
    otherEngine:
      'Пресет {{preset}} на FM1 використовує інший рушій, тож зміни туди не надсилаються. Їх буде чути, щойно патч буде записано на FM1.',
    readFailed:
      'FM1 не відповів на запит пресету {{preset}}, тож зміни туди не надсилаються. Їх буде чути, щойно патч буде записано на FM1.',
    presets: 'Звукові пресети',
    initPatch: 'Init patch',
    initPatchHelp: 'Простий Saw, Filter відкритий. Ефекти вимикаються.',
    randomiseHelp: 'Новий звук. Назва, рівень та ефекти ті самі.',
    presetOptions: {
      'super-saw': {
        name: 'Super saw',
        description: 'Кілька Saw із Detune, Chorus і Reverb (Hall).',
      },
      'mono-bass': {
        name: 'Mono bass',
        description: 'Square і Sub, по одній ноті.',
      },
      'filter-pluck': {
        name: 'Filter pluck',
        description: 'Короткий прохід фільтра, Delay і невеликий Reverb (Room).',
      },
      'warm-pad': {
        name: 'Warm pad',
        description: 'Повільний Attack, легкий Drift і Reverb (Hall).',
      },
      'pulse-strings': {
        name: 'Pulse strings',
        description: 'Мінливий Square, Chorus і Reverb (Hall).',
      },
      'vibrato-lead': {
        name: 'Vibrato lead',
        description: 'По одній ноті, вібрато із затримкою й Delay.',
      },
    },
  },
  replacePatch: {
    replacing: 'Заміна…',
    action: 'Замінити патч',
    title: 'Замінити {{slot}} «{{patch}}»?',
    warning:
      'Патч у цьому слоті буде замінено патчем із файлу, а його ефекти FM1 скинуто до типових.',
  },
  bankFile: {
    legend: 'Банки в цьому файлі',
    help: 'У цьому файлі {{count, number}} банк DX7. Оберіть, який імпортувати.',
    help_few: 'У цьому файлі {{count, number}} банки DX7. Оберіть, який імпортувати.',
    help_many: 'У цьому файлі {{count, number}} банків DX7. Оберіть, який імпортувати.',
    help_other: 'У цьому файлі {{count, number}} банків DX7. Оберіть, який імпортувати.',
    damagedBanks: 'Пошкоджено {{count, number}} банк, його не можна імпортувати.',
    damagedBanks_few: 'Пошкоджено {{count, number}} банки, їх не можна імпортувати.',
    damagedBanks_many: 'Пошкоджено {{count, number}} банків, їх не можна імпортувати.',
    damagedBanks_other: 'Пошкоджено {{count, number}} банків, їх не можна імпортувати.',
    bank: 'Банк {{number}}',
    option: '{{bank}}: {{contents}}',
    damaged: 'Пошкоджений',
  },
  overwriteImport: {
    titleEmpty: 'Імпорт у «{{bank}}»',
    actionEmpty: 'Імпортувати банк',
    action: 'Замінити вміст банку',
    help: 'Оберіть стандартний файл банку DX7 SysEx на 32 voice.',
    play: 'Зіграти {{name}}, патч {{number}}',
    previewHelp:
      'Натисніть на патч, щоб почути його на FM1. Ваш банк лишиться без змін, доки ви його не заміните.',
    previewTitle: 'Патчі в цьому файлі',
    title: 'Імпортувати поверх «{{bank}}»?',
    warning: 'Поточний вміст банку буде стерто й замінено імпортованими патчами.',
  },
  fm1VaImport: {
    menuItem: 'Імпортувати файл пресетів Baud Girl…',
    menuRead: 'Прочитати пресети з FM1…',
    menuHeading: 'Baud Girl (FM-1+VA)',
    title: 'Імпортувати файл пресетів Baud Girl',
    titleRead: 'Прочитати пресети з FM1',
    help: 'Оберіть файл пресетів із Device Manager від Baud Girl: резервну копію з «Back up everything» або пресет, збережений командою «Save as a file».',
    warning:
      'Кожен імпортований банк замінює обраний для нього банк або додається як новий. Цю дію можна скасувати.',
    partialFile:
      'Файл містить {{count, number}} пресет. Змінюється лише його слот; решта слотів зберігають свої патчі.',
    partialFile_few:
      'Файл містить {{count, number}} пресети. Змінюються лише їхні слоти; решта слотів зберігають свої патчі.',
    partialFile_many:
      'Файл містить {{count, number}} пресетів. Змінюються лише їхні слоти; решта слотів зберігають свої патчі.',
    partialFile_other:
      'Файл містить {{count, number}} пресетів. Змінюються лише їхні слоти; решта слотів зберігають свої патчі.',
    file: 'Файл пресетів Baud Girl',
    read: 'Прочитати з FM1',
    readUnavailable:
      'Щоб прочитати пресети з FM1, оберіть його як MIDI-вихід і MIDI-вхід та надайте доступ до SysEx. Для читання потрібна прошивка Baud Girl FM-1_079 або новіша.',
    reading: 'Читання пресету {{number, number}} з {{total, number}}…',
    stopReading: 'Зупинити читання',
    chooseFile: 'Оберіть файл пресетів Baud Girl',
    previewTitle: 'Банки в цьому файлі',
    previewHelp: 'Відкрийте банк, щоб почути його патчі на FM1.',
    previewTitleFm1: 'Банки на FM1',
    allMatch: 'Усі патчі тут збігаються з вашою бібліотекою.',
    differs: 'Крапкою позначено {{count, number}} патч, що відрізняється від вашої бібліотеки.',
    differs_few:
      'Крапкою позначено {{count, number}} патчі, що відрізняються від вашої бібліотеки.',
    differs_many:
      'Крапкою позначено {{count, number}} патчів, що відрізняються від вашої бібліотеки.',
    differs_other:
      'Крапкою позначено {{count, number}} патчів, що відрізняються від вашої бібліотеки.',
    differingPatch: 'Відрізняється від вашої бібліотеки',
    bankHeading: 'Банк FM1 {{bank}}',
    newBank: 'Новий банк',
    destination: 'Імпортувати в',
    bankSwitch: 'Імпортувати банк FM1 {{bank}}',
    damagedPreset: 'Пошкоджений',
    damagedPresets: 'Пошкоджено {{count, number}} пресет. Його слот зберігає свій патч.',
    damagedPresets_few: 'Пошкоджено {{count, number}} пресети. Їхні слоти зберігають свої патчі.',
    damagedPresets_many: 'Пошкоджено {{count, number}} пресетів. Їхні слоти зберігають свої патчі.',
    damagedPresets_other:
      'Пошкоджено {{count, number}} пресетів. Їхні слоти зберігають свої патчі.',
    absentPreset: 'Немає у файлі',
    action: 'Імпортувати {{count, number}} банк',
    action_few: 'Імпортувати {{count, number}} банки',
    action_many: 'Імпортувати банки',
    action_other: 'Імпортувати банки',
    imported: 'Імпортовано банк {{banks}} з FM1.',
    imported_few: 'Імпортовано банки {{banks}} з FM1.',
    imported_many: 'Імпортовано банки {{banks}} з FM1.',
    imported_other: 'Імпортовано банки {{banks}} з FM1.',
    openFailed:
      'Не вдалося відкрити імпорт пресетів Baud Girl. Перезавантажте сторінку й спробуйте ще раз.',
    errors: {
      size: 'Розмір цього файлу — {{bytes, number}} Б. Файл пресетів Baud Girl містить від 1 до 128 пресетів по {{size, number}} Б кожен.',
      format: 'Це не файл пресетів Baud Girl.',
      damaged:
        'Жоден пресет у цьому файлі не вдалося прочитати. Збережіть файл ще раз у Device Manager від Baud Girl і спробуйте знову.',
      unreadable: 'Не вдалося прочитати файл.',
      readBusy:
        'FM1 не може надсилати пресети, поки працює його секвенсор. Зупиніть його й прочитайте ще раз.',
      readNoReply: 'FM1 перестав відповідати. Перевірте його MIDI-з’єднання й прочитайте ще раз.',
      readStopped: 'Читання зупинено, бо змінилися MIDI-порти. Прочитайте ще раз.',
      readFailed:
        'FM1 не зміг надіслати пресети. Прочитайте ще раз або оберіть файл пресетів Baud Girl.',
    },
  },
  fm1VaWrite: {
    menuItem: 'Записати патчі на FM1…',
    title: 'Записати патчі на FM1',
    help: 'Записує патчі з вашої бібліотеки поверх пресетів FM1. Записуються лише ті, що відрізняються.',
    source: 'Записати з',
    bankSwitch: 'Записати в банк FM1 {{bank}}',
    differs: 'Відрізняється {{count, number}} патч.',
    differs_few: 'Відрізняються {{count, number}} патчі.',
    differs_many: 'Відрізняється {{count, number}} патчів.',
    differs_other: 'Відрізняється {{count, number}} патчів.',
    same: 'Усі патчі збігаються.',
    nothing: 'Нічого записувати.',
    virtualAnalogKept:
      'Лишається {{count, number}} пресет Virtual Analog: його може замінити лише патч Virtual Analog.',
    virtualAnalogKept_few:
      'Лишаються {{count, number}} пресети Virtual Analog: їх можуть замінити лише патчі Virtual Analog.',
    virtualAnalogKept_many:
      'Лишається {{count, number}} пресетів Virtual Analog: їх можуть замінити лише патчі Virtual Analog.',
    virtualAnalogKept_other:
      'Лишається {{count, number}} пресетів Virtual Analog: їх можуть замінити лише патчі Virtual Analog.',
    eightBitKept: 'Лишається {{count, number}} пресет 8-Bit: його може замінити лише патч 8-Bit.',
    eightBitKept_few:
      'Лишаються {{count, number}} пресети 8-Bit: їх можуть замінити лише патчі 8-Bit.',
    eightBitKept_many:
      'Лишається {{count, number}} пресетів 8-Bit: їх можуть замінити лише патчі 8-Bit.',
    eightBitKept_other:
      'Лишається {{count, number}} пресетів 8-Bit: їх можуть замінити лише патчі 8-Bit.',
    inexact:
      '{{count, number}} патч Virtual Analog або 8-Bit не вдасться записати без змін, тож його пресет лишається.',
    inexact_few:
      '{{count, number}} патчі Virtual Analog або 8-Bit не вдасться записати без змін, тож їхні пресети лишаються.',
    inexact_many:
      '{{count, number}} патчів Virtual Analog або 8-Bit не вдасться записати без змін, тож їхні пресети лишаються.',
    inexact_other:
      '{{count, number}} патчів Virtual Analog або 8-Bit не вдасться записати без змін, тож їхні пресети лишаються.',
    eightBitPatch:
      '{{count, number}} патч прочитано з пресету 8-Bit, і його не можна записати, тож пресет лишається.',
    eightBitPatch_few:
      '{{count, number}} патчі прочитано з пресетів 8-Bit, і їх не можна записати, тож пресети лишаються.',
    eightBitPatch_many:
      '{{count, number}} патчів прочитано з пресетів 8-Bit, і їх не можна записати, тож пресети лишаються.',
    eightBitPatch_other:
      '{{count, number}} патчів прочитано з пресетів 8-Bit, і їх не можна записати, тож пресети лишаються.',
    replaces: '{{number}} {{replaces}} → {{name}}',
    action: 'Записати {{count, number}} патч…',
    action_few: 'Записати {{count, number}} патчі…',
    action_many: 'Записати {{count, number}} патчів…',
    action_other: 'Записати {{count, number}} патчів…',
    confirmTitle: 'Замінити ці пресети на FM1?',
    confirmWarning:
      'Кожен пресет замінюється одразу, і FM1 не може цього скасувати. Спершу збережіть резервну копію командою «Back up everything» у Device Manager від Baud Girl.',
    confirm: 'Записати {{count, number}} патч',
    confirm_few: 'Записати {{count, number}} патчі',
    confirm_many: 'Записати {{count, number}} патчів',
    confirm_other: 'Записати {{count, number}} патчів',
    writing: 'Запис патча {{number, number}} з {{total, number}}…',
    stop: 'Зупинити після цього патча',
    written: 'Записано {{count, number}} патч на FM1.',
    written_few: 'Записано {{count, number}} патчі на FM1.',
    written_many: 'Записано {{count, number}} патчів на FM1.',
    written_other: 'Записано {{count, number}} патчів на FM1.',
    stopped: 'Зупинено після {{count, number}} з {{total, number}} патчів. Решта без змін.',
    openFailed: 'Не вдалося відкрити запис на FM1. Перезавантажте сторінку й спробуйте ще раз.',
    errors: {
      mismatch:
        'Пресет {{number}} після запису прочитався інакше, тож запис зупинено після {{count, number}} з {{total, number}} патчів.',
      failed:
        'Запис зупинено після {{count, number}} з {{total, number}} патчів. Перевірте MIDI-з’єднання FM1.',
    },
  },
  changeToFm: {
    menuItem: 'Змінити на FM…',
    title: 'Змінити {{slot}} «{{patch}}» на FM?',
    warning:
      'Пресет Virtual Analog у цьому слоті буде замінено на INIT VOICE — патч FM, який можна редагувати. Від його звуку лишаться тільки ефекти FM1. «Скасувати» поверне його.',
    name: 'Назва',
    fm1Note:
      'Якщо цей пресет Virtual Analog є на FM1, запис на FM1 його там і залишить. Щоб змінити рушій і на FM1, зітріть пресет на самому пристрої.',
    action: 'Змінити на FM',
    changed: '{{slot}} змінено на FM як «{{patch}}».',
    openFailed:
      'Не вдалося відкрити вікно «Змінити на FM». Перезавантажте сторінку й спробуйте ще раз.',
  },
  fm1VaSend: {
    title: 'Надіслати {{bank}} на FM1',
    help: 'Записує {{bank}} поверх одного з банків пресетів FM1. Записуються лише патчі, що відрізняються.',
    destination: 'Записати поверх',
    favouritesShort:
      'В Обраному {{count, number}} патч, тож інші пресети банку FM1 лишаються без змін.',
    favouritesShort_few:
      'В Обраному {{count, number}} патчі, тож інші пресети банку FM1 лишаються без змін.',
    favouritesShort_many:
      'В Обраному {{count, number}} патчів, тож інші пресети банку FM1 лишаються без змін.',
    favouritesShort_other:
      'В Обраному {{count, number}} патчів, тож інші пресети банку FM1 лишаються без змін.',
    bankTooltip:
      'Оберіть банк FM1, поверх якого записати ці патчі; записуються лише ті, що відрізняються',
    favouritesTooltip:
      'Оберіть банк FM1, поверх якого записати перші 32 обрані патчі; записуються лише ті, що відрізняються',
  },
  duplicates: {
    menuItem: 'Знайти дублікати патчів…',
    title: 'Дублікати патчів',
    help: 'Тут зібрано патчі з однаковими налаштуваннями звуку, навіть якщо назви різні. Ефекти FM1 не порівнюються. Оберіть патч, щоб перейти до нього й зіграти його.',
    group: '{{name}} і {{count, number}} копія',
    group_few: '{{name}} і {{count, number}} копії',
    group_many: '{{name}} і {{count, number}} копій',
    group_other: '{{name}} і {{count, number}} копій',
    effectsDiffer: 'Їхні ефекти FM1 відрізняються.',
    settingsDiffer: 'Їхні налаштування пресетів Baud Girl відрізняються.',
    goTo: 'Перейти до патча {{number}} «{{name}}» у банку {{bank}}',
    none: 'Дублікатів немає: кожен патч у ваших банках має власні налаштування звуку.',
    openFailed: 'Не вдалося показати дублікати патчів. Перезавантажте сторінку й спробуйте ще раз.',
  },
  persistence: {
    retryLoading: 'Повторити',
    continueSessionOnly: 'Продовжити без збереження',
    retrySaving: 'Повторити збереження',
    technicalDetails: 'Технічні подробиці',
    sessionOnlyTitle: 'Бібліотека лише на цей сеанс',
    sessionOnlyBody:
      'Дані в браузері не змінено. Усе, що ви зміните в цьому сеансі, зникне, щойно ви закриєте сторінку.',
    saveErrorTitle: 'Не вдалося надійно зберегти зміни бібліотеки',
    saveErrorBody:
      'Ваші останні зміни досі тут, але браузер не зміг їх зберегти. Спробуйте ще раз, коли сховище браузера стане доступним.',
    loadErrors: {
      unavailable: {
        title: 'Сховище браузера недоступне',
        body: 'Не вдалося відкрити збережену бібліотеку. Її дані в браузері не змінено.',
      },
      'read-failed': {
        title: 'Не вдалося прочитати збережену бібліотеку',
        body: 'Можливо, це тимчасова проблема сховища браузера. Нову бібліотеку замість неї не створено й не збережено.',
      },
      incompatible: {
        title: 'Збережена бібліотека несумісна або пошкоджена',
        body: 'Запис у браузері лишився без змін, але ця версія не може безпечно його відкрити.',
      },
      'write-failed': {
        title: 'Не вдалося прочитати збережену бібліотеку',
        body: 'Нову бібліотеку замість неї не створено й не збережено.',
      },
    },
  },
  favourites: {
    title: 'Обране',
    tabTitle: 'Показати ваші обрані патчі',
    toggle: 'Обране: {{name}}',
    addTitle: 'Додати до Обраного',
    removeTitle: 'Прибрати з Обраного',
    added: '«{{patch}}» додано до Обраного.',
    removed: '«{{patch}}» прибрано з Обраного.',
    alreadyAdded: '«{{patch}}» уже є в Обраному.',
    addFailed: 'Не вдалося додати патч до Обраного.',
    empty: 'Обраних патчів ще немає',
    emptyHelp:
      'Щоб додати сюди патч, натисніть на його сердечко або перетягніть патч на Обране. Обране можна надіслати на FM1 як банк.',
    sendTitle: 'Надіслати перші 32 обрані патчі як банк; банк призначення оберіть на FM1',
    addFirst: 'Щоб надіслати Обране, спершу додайте до нього патч',
    initNote:
      'Банк вміщує 32 патчі, тож під час надсилання Обраного {{count, number}} останній слот заповнюється INIT VOICE.',
    initNote_few:
      'Банк вміщує 32 патчі, тож під час надсилання Обраного {{count, number}} останні слоти заповнюються INIT VOICE.',
    initNote_many:
      'Банк вміщує 32 патчі, тож під час надсилання Обраного {{count, number}} останніх слотів заповнюються INIT VOICE.',
    initNote_other:
      'Банк вміщує 32 патчі, тож під час надсилання Обраного {{count, number}} останніх слотів заповнюються INIT VOICE.',
    leftOutNote:
      'Банк вміщує 32 патчі, тож надсилаються лише перші 32 обрані патчі. Ще {{count, number}} патч лишається тут.',
    leftOutNote_few:
      'Банк вміщує 32 патчі, тож надсилаються лише перші 32 обрані патчі. Ще {{count, number}} патчі лишаються тут.',
    leftOutNote_many:
      'Банк вміщує 32 патчі, тож надсилаються лише перші 32 обрані патчі. Ще {{count, number}} патчів лишаються тут.',
    leftOutNote_other:
      'Банк вміщує 32 патчі, тож надсилаються лише перші 32 обрані патчі. Ще {{count, number}} патчів лишаються тут.',
    sent: 'Обране надіслано. Оберіть банк призначення на FM1.',
    sentWithInit:
      'Обране надіслано; INIT VOICE займає {{count, number}} останній слот. Оберіть банк призначення на FM1.',
    sentWithInit_few:
      'Обране надіслано; INIT VOICE займає {{count, number}} останні слоти. Оберіть банк призначення на FM1.',
    sentWithInit_many:
      'Обране надіслано; INIT VOICE займає {{count, number}} останніх слотів. Оберіть банк призначення на FM1.',
    sentWithInit_other:
      'Обране надіслано; INIT VOICE займає {{count, number}} останніх слотів. Оберіть банк призначення на FM1.',
    sentLeftOut:
      'Надіслано перші 32 обрані патчі; ще {{count, number}} патч не ввійшов. Оберіть банк призначення на FM1.',
    sentLeftOut_few:
      'Надіслано перші 32 обрані патчі; ще {{count, number}} патчі не ввійшли. Оберіть банк призначення на FM1.',
    sentLeftOut_many:
      'Надіслано перші 32 обрані патчі; ще {{count, number}} патчів не ввійшли. Оберіть банк призначення на FM1.',
    sentLeftOut_other:
      'Надіслано перші 32 обрані патчі; ще {{count, number}} патчів не ввійшли. Оберіть банк призначення на FM1.',
    sendUnavailable:
      'Не вдалося підготувати Обране до надсилання. Перезавантажте сторінку й спробуйте ще раз.',
    savedWithFavourites: '«{{patch}}» збережено в бібліотеці та в його копії в Обраному.',
    savedWithBanks: '«{{patch}}» збережено в Обраному та в слотах банків, де він був.',
  },
  toasts: {
    midiPanicSent: 'MIDI-паніку надіслано. Усі ноти на каналі нот відпущено.',
    notifications: 'Виконані дії',
    dismiss: 'Закрити сповіщення',
    undo: 'Скасувати',
    undone: 'Останню зміну скасовано.',
    redone: 'Зміну повторено.',
    bankImported: 'Патчі імпортовано в «{{bank}}».',
    bankCreated: 'Створено «{{bank}}».',
    bankDeleted: 'Видалено «{{bank}}».',
    banksRestored: 'Чотири банки скинуто до заводських патчів.',
    bankDownloadStarted: 'Завантаження «{{bank}}».',
    banksDownloadStarted: 'Завантаження всіх банків.',
    bankUpdated: 'Оновлено «{{bank}}».',
    demoLoaded: 'Демопатчі відкрито в «{{bank}}».',
    patchSaved: '«{{patch}}» збережено в бібліотеці.',
    patchCopied: '«{{patch}}» скопійовано до {{slot}} у «{{bank}}».',
    patchReplaced: '{{slot}} замінено на «{{patch}}».',
    operatorCopied: 'Оператор {{number}} скопійовано.',
    presetFileDownloadStarted: 'Завантаження «{{name}}» як файлу пресетів Baud Girl.',
    patchesSwapped: '«{{patch}}» і «{{target}}» поміняно місцями.',
    bankDownloadStartedWithInit:
      'Завантаження «{{bank}}» з INIT VOICE замість {{count, number}} пресету Virtual Analog або 8-Bit.',
    bankDownloadStartedWithInit_few:
      'Завантаження «{{bank}}» з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit.',
    bankDownloadStartedWithInit_many:
      'Завантаження «{{bank}}» з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit.',
    bankDownloadStartedWithInit_other:
      'Завантаження «{{bank}}» з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit.',
    banksDownloadStartedWithInit:
      'Завантаження всіх банків з INIT VOICE замість {{count, number}} пресету Virtual Analog або 8-Bit.',
    banksDownloadStartedWithInit_few:
      'Завантаження всіх банків з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit.',
    banksDownloadStartedWithInit_many:
      'Завантаження всіх банків з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit.',
    banksDownloadStartedWithInit_other:
      'Завантаження всіх банків з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit.',
  },
  meta: {
    title: 'Редактор і менеджер M-VAVE FM1',
    description:
      'Редагуйте й упорядковуйте патчі, надсилайте їх на синтезатор M-VAVE FM1, а також імпортуйте банки DX7 SysEx.',
  },
  language: 'Мова',
  common: {
    close: 'Закрити',
    cancel: 'Скасувати',
    settings: 'Налаштування',
    channel: 'Канал {{number}}',
    loading: 'Завантаження редактора…',
    loadingLibrary: 'Завантаження бібліотеки',
    editorLoadErrorTitle: 'Не вдалося завантажити редактор.',
    editorLoadErrorBody:
      'Можливо, застосунок оновився або з’єднання перервалося. Перезавантажте сторінку, щоб отримати останню версію, або поверніться до бібліотеки.',
    reloadApp: 'Перезавантажити',
    backToLibrary: 'До бібліотеки',
  },
  root: {
    subtitle: 'редактор і менеджер',
    intro:
      'Редагуйте й упорядковуйте патчі, надсилайте їх на FM1 або <link>імпортуйте готові банки DX7 SysEx</link>.',
    synthAlt: 'Передня панель синтезатора M-VAVE FM1',
    unsupportedTitle: 'Браузер не підтримується.',
    unsupportedBody:
      'Цьому застосунку потрібен браузер із підтримкою Web MIDI і SysEx, як-от Chrome, Edge, Firefox чи Opera. Chrome на Android теж підходить.',
    localOnly: 'Ваші патчі лишаються у цьому браузері',
    projectLinks: 'Посилання проєкту',
    firmwareLink: 'Прошивки FM1',
    reportIssue: 'Повідомити про проблему',
    version: 'Версія {{version}}',
    disclaimer:
      'Незалежний проєкт із відкритим кодом. Не пов’язаний із M-VAVE чи Yamaha і не схвалений ними.',
  },
  settings: {
    description: 'Оберіть мову інтерфейсу, MIDI-порти та канали.',
    output: 'Вихід',
    inputMonitor: 'Вхід',
    firmware: 'Прошивка FM1',
    firmwareChecking: 'Перевірка…',
    firmwareUnidentified: 'Не ідентифікована',
    firmwareMvave: 'M-VAVE {{identity}}',
    firmwareFm1Va: 'Baud Girl {{identity}}',
    firmwareFelucca: 'Felucca {{identity}}',
    firmwareFeluccaOrSloop: 'Felucca або SLOOP {{identity}}',
    firmwareEditBuffer: 'Коли ви граєте патч, він потрапляє в буфер редагування FM1.',
    firmwareParameterChanges:
      'Коли ви граєте патч, він надходить як зміна параметрів, тож FM1 не записує його поверх обраного пресету.',
    firmwareIgnoresPatches:
      'Felucca відтворює ваші ноти, але ігнорує патчі й банки DX7 та керування ефектами.',
    firmwareFeluccaOrSloopIgnoresPatches:
      'Felucca і SLOOP повідомляють однакову назву. Обидві відтворюють ваші ноти, але ігнорують патчі й банки DX7 та керування ефектами.',
    firmwareNeedsInput: 'Оберіть FM1 як вхід, щоб редактор зміг визначити його прошивку.',
    noteChannel: 'Канал нот',
    fxChannel: 'Канал ефектів',
    defaultChannel: 'Типово для FM1: канал 2',
    noDevice: 'Пристрій не знайдено',
    noDeviceSelected: 'Пристрій не обрано',
  },
  help: {
    open: 'Як користуватися редактором і менеджером FM1',
    title: 'Ласкаво просимо до редактора і менеджера FM1',
    intro:
      'Керуйте бібліотекою, налаштовуйте патчі в редакторі й надсилайте їх на M-VAVE FM1 прямо в браузері.',
    close: 'Закрити довідку',
    truthTitle: 'Банки в цьому браузері — головне джерело даних',
    truthBody:
      'FM1 приймає патчі та банки, але не може надсилати власні банки назад. Імпортуйте чи відновлюйте патчі тут, змінюйте їх, а потім надсилайте на FM1.',
    firmwareTitle: 'Baud Girl (FM-1+VA) підтримується',
    firmwareBody: 'Застосунок працює з обома прошивками: M-VAVE і Baud Girl.',
    start: 'Почати редагування',
    stepsTitle: 'Початок роботи',
    sections: 'Розділи довідки',
    shortcutsTitle: 'Клавіатурні скорочення',
    browsers: {
      title: 'Браузерна сумісність',
      works: 'Працює',
      unsupported: 'Не працює',
      yours: 'Ваш браузер',
      desktop: 'PC',
      desktopAndAndroid: 'PC та Android',
    },
    shortcuts: {
      banks: 'Банки',
      editor: 'Редактор',
      search: 'Пошук',
      clearSearch: 'Очистити пошук',
      openSlot: 'Відкрити слот',
    },
    steps: {
      libraryTitle: 'Створіть бібліотеку',
      libraryBody: 'Почніть із заводських банків FM1 або імпортуйте власні.',
      editTitle: 'Відредагуйте й упорядкуйте',
      editBody: 'Відкрийте патч, змініть його й збережіть до бібліотеки.',
      connectTitle: 'Підключіть FM1',
      connectBody: 'Під’єднайте FM1 і ввімкніть перемикач «MIDI онлайн».',
      transferTitle: 'Надішліть патчі',
      transferBody: 'Натисніть на патч, щоб почути його, або надішліть на FM1 цілий банк.',
    },
  },
  colorway: {
    legend: 'Колір корпусу FM1',
    option: 'Корпус FM1: {{colour}}',
    black: 'Чорний',
    purple: 'Фіолетовий',
    orange: 'Помаранчевий',
    blackGreen: 'Чорно-зелений',
    coolGray: 'Холодний сірий',
    whiteBlue: 'Біло-блакитний',
  },
  editor: {
    back: 'До банків',
    editName: 'Змінити назву патча',
    patchName: 'Назва патча',
    unsaved: 'Незбережені зміни',
    presets: 'Пресети патча',
    presetsShort: 'Пресети',
    presetOptions: {
      'soft-pad': {
        name: 'Soft pad',
        description: 'Повільні обвідні, Chorus і Reverb (Hall).',
      },
      'bright-pluck': {
        name: 'Bright pluck',
        description: 'Чіткий Decay, невеликий Reverb (Room) і легкий Delay.',
      },
      'steady-organ': {
        name: 'Steady organ',
        description: 'Рівний Sustain з Chorus і Phaser.',
      },
      'gentle-motion': {
        name: 'Gentle motion',
        description: 'LFO із затримкою, Chorus і м’який Reverb (Hall).',
      },
      'warm-filter': {
        name: 'Warm filter',
        description: 'Filter (Low pass) і невеликий Reverb (Room).',
      },
      'wide-space': {
        name: 'Wide space',
        description: 'Широкий Chorus і Reverb (Hall).',
      },
    },
    undo: 'Скасувати',
    redo: 'Повторити',
    save: 'Зберегти до бібліотеки',
    moreSave: 'Інші варіанти збереження',
    resend: 'Повторно надіслати на FM1',
    resendHelp: 'Надсилає на FM1 поточний патч.',
    revert: 'Повернутися до збереженого',
    revertHelp: 'Скидає всі зміни після останнього збереження.',
    compare: 'Порівняти зі збереженим',
    compareShort: 'Порівняти',
    stopComparing: 'Вийти з порівняння',
    comparingTitle: 'Порівняння: збережена версія',
    comparingBody:
      'Редагування призупинено. Натисніть Esc або «Порівняти», щоб повернутися до змін.',
    configuration: 'Конфігурація патча',
    global: 'Global',
    effects: 'Effects',
    pitchEnvelope: 'Pitch envelope',
    pitchEnvelopePresets: 'Пресети',
    pitchEnvelopePresetPlaceholder: 'Оберіть…',
    pitchEnvelopePresetOptions: {
      flat: 'Flat',
      blipUp: 'Attack blip up',
      attackDrop: 'Attack drop',
      scoop: 'Scoop',
      releaseFall: 'Release fall',
    },
    effectPreset: 'Пресет',
    effectPresetPlaceholder: 'Оберіть…',
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
    minimisePanel: 'Згорнути: {{panel}}',
    expandPanel: 'Розгорнути: {{panel}}',
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
    unsavedTitle: 'Зміни в патчі не збережено',
    keepEditing: 'Редагувати далі',
    discard: 'Не зберігати',
    saveAndReturn: 'Зберегти й вийти',
    initVoice: 'Init voice',
    initVoiceHelp: 'Простий Sine. Ефекти вимикаються.',
    randomise: 'Randomise',
    randomiseHelp: 'Новий звук. Назва й ефекти ті самі.',
  },
  midi: {
    activityTitle:
      'Активність MIDI: IN світиться, коли надходить повідомлення з MIDI-входу, OUT — коли редактор надсилає повідомлення.',
    feluccaBadgeLabel: 'Прошивка Felucca від Hügelton Instruments, {{release}}',
    feluccaBadgeTitle:
      'На FM1 працює прошивка Felucca від Hügelton Instruments, {{release}}. Вона відтворює ваші ноти, але ігнорує патчі й банки DX7 та керування ефектами.',
    feluccaOrSloopBadgeLabel: 'Прошивка Felucca або SLOOP, {{release}}',
    feluccaOrSloopBadgeTitle:
      'На FM1 працює Felucca від Hügelton Instruments або створена на її основі SLOOP; обидві повідомляють {{release}}. Обидві відтворюють ваші ноти, але ігнорують патчі й банки DX7 та керування ефектами.',
    fm1VaBadgeLabel: 'Прошивка Baud Girl, {{release}}',
    fm1VaBadgeTitle:
      'На FM1 працює прошивка Baud Girl (FM-1+VA), {{release}}. Коли ви граєте патч, він надходить як незбережена зміна й не перезаписує пресет.',
    mvaveBadgeLabel: 'Прошивка M-VAVE, {{release}}',
    mvaveBadgeTitle:
      'На FM1 працює власна прошивка M-VAVE, {{release}}. Коли ви граєте патч, він потрапляє в буфер редагування FM1.',
    panic: 'MIDI-паніка',
    panicHelp:
      'MIDI-паніка: надіслати Note Off для кожної ноти на каналі нот, щоб зупинити завислі ноти',
    panicUnavailable: 'MIDI-паніка: {{reason}}',
    online: 'MIDI онлайн',
    offline: 'MIDI офлайн',
    connectFirst: 'Спершу підключіть MIDI-вихід',
    chooseOutput: 'Оберіть MIDI-вихід',
    switchOnFirst: 'Спершу ввімкніть MIDI',
    closeSysexWarning: 'Закрити попередження про SysEx',
    connecting: 'Підключення…',
    errors: {
      insecureContext:
        'Web MIDI потребує захищеного з’єднання. Відкрийте редактор за адресою https:// або на localhost.',
      unsupportedBrowser:
        'Цей браузер не підтримує Web MIDI. Відкрийте застосунок у Chrome, Edge чи Firefox.',
      permissionDenied:
        'Доступ до MIDI заблоковано. Надайте сайту доступ до MIDI і SysEx та підключіться знову. У Firefox погодьтеся встановити додаток-дозвіл, коли браузер його запропонує.',
      enableFailed: 'Не вдалося запустити MIDI. Перевірте підключення пристрою й спробуйте ще раз.',
      disconnectFailed: 'Не вдалося відключити MIDI. Спробуйте ще раз.',
    },
    reconnectForSysex: 'Перепідключити MIDI із SysEx',
    sysexRecovery:
      'Дані банку не надіслано. Перепідключіть MIDI, надайте доступ до SysEx і спробуйте ще раз.',
    sysexWarningTitle: 'Немає доступу до SysEx.',
    sysexWarningBody:
      'Без нього не вдасться надіслати банки й патчі. Відключіть MIDI, підключіть знову й надайте доступ до SysEx, коли браузер запитає.',
    log: 'Журнал MIDI',
    closeLog: 'Закрити журнал MIDI',
    entries: 'Останні записи журналу MIDI',
    hideData: 'Сховати дані',
    viewData: 'Показати дані',
    bytes: 'Байтів: {{count, number}}',
    completeSysex: 'Повне повідомлення SysEx',
    copied: 'Скопійовано',
    copyHex: 'Копіювати hex',
    copyUnavailable: 'Копіювання недоступне',
    downloadLog: 'Завантажити журнал',
  },
  banks: {
    empty: 'Порожньо',
    importing: 'Імпорт…',
    restoring: 'Скидання…',
    catalogFactory: 'Заводські',
    catalogFm1Factory: 'Заводські пресети FM-1',
    import: 'Імпортувати банк DX7…',
    moreActions: 'Дії з бібліотекою',
    bankMenu: 'Дії з банком {{bank}}',
    bankInformation: 'Відомості про банк',
    bankInformationMenu: 'Відомості про банк…',
    bankInformationHelp: 'Змініть назву та опис цього банку (за бажанням)',
    download: 'Завантажити цей банк',
    downloadAll: 'Завантажити банки SysEx (.zip)',
    restoreAll: 'Скинути до заводських патчів…',
    sending: 'Надсилання…',
    send: 'Надіслати на FM1',
    bank: 'Банк {{bank}}',
    addBank: 'Додати банк…',
    addBankTitle: 'Додати банк {{bank}}',
    addBankHelp: 'Назвіть банк і оберіть дані патчів, якими його заповнити.',
    bankName: 'Назва банку',
    bankNameRequired: 'Введіть назву нового банку.',
    soundData: 'Дані патчів',
    soundSource: 'Оберіть джерело патчів',
    soundSourceRequired: 'Оберіть банк із каталогу або власний файл SysEx DX7.',
    catalogSource: 'Готові банки DX7',
    catalogBank: 'Банк DX7 з каталогу',
    chooseCatalogBank: 'Оберіть банк…',
    uploadSource: 'Власний файл банку',
    chooseSysexFile: 'Оберіть файл SysEx DX7',
    soundDataHelp: 'Кожен новий банк заповнюється цілим банком DX7 на 32 voice.',
    createBank: 'Створити банк',
    creatingBank: 'Створення…',
    addBankFailed: 'Не вдалося створити банк.',
    destination: 'Банк призначення',
    importFile: 'Імпортувати файл банку DX7',
    downloadTitle: 'Завантажити «{{bank}}» як SysEx',
    importFirst: 'Спершу імпортуйте банк {{bank}}',
    deleteBank: 'Видалити банк',
    deleteBankMenu: 'Видалити банк…',
    deleteBankConfirm: 'Видалити «{{name}}» разом з усіма патчами? Цю дію можна скасувати.',
    sendTitle: 'Надіслати всі 32 патчі; банк призначення оберіть на FM1',
    sentStatus: 'Банк «{{bank}}» надіслано. Оберіть банк призначення на FM1.',
    notSent: 'Банк не надіслано. Перегляньте подробиці в журналі MIDI і спробуйте ще раз.',
    importFailed: 'Не вдалося імпортувати.',
    restoreFailed: 'Не вдалося скинути банки до заводських патчів. Спробуйте ще раз.',
    bankUnavailable: 'Цей банк більше недоступний. Закрийте це вікно й спробуйте ще раз.',
    catalogUnavailable: 'Не вдалося завантажити цей банк. Перевірте з’єднання і спробуйте ще раз.',
    fileErrors: {
      size: 'Розмір цього файлу — {{bytes, number}} Б, і в ньому немає повного банку DX7. Файл банку має розмір {{expected, number}} Б або кратний йому, якщо в ньому кілька банків.',
      tooLarge:
        'Цей файл завеликий. Банків DX7 в одному файлі може бути не більше {{count, number}}.',
      format: 'Цей файл не є банком Yamaha DX7 на 32 voice.',
      damaged: 'Схоже, цей файл пошкоджено. Спробуйте завантажити його ще раз.',
      voiceFormat: 'Цей файл не є патчем DX7. Оберіть файл .syx з одним патчем.',
      voiceGotBank:
        'Цей файл — банк DX7 на 32 voice. Щоб відкрити його, оберіть «Імпортувати банк DX7…» в меню банку.',
    },
    exportFailed: 'Не вдалося експортувати.',
    bulkExportFailed: 'Не вдалося експортувати всі банки.',
    gridTitle: 'Банки',
    gridDescription:
      'Імпортуйте, редагуйте та упорядковуйте кожен банк, перш ніж надсилати його на FM1.',
    search: 'Пошук',
    noMatches: 'Жоден патч не відповідає пошуку',
    searchResults: 'Результати пошуку: «{{search}}»',
    sendFromSearch: 'Оберіть банк, щоб надіслати його на FM1',
    bankEmpty: 'Цей банк порожній',
    emptyHelp:
      'Відкрийте демобанк, щоб ознайомитися з редактором, або імпортуйте власний стандартний банк SysEx DX7 на 32 voice.',
    loadDemo: 'Відкрити демобанк',
    editSelected: 'Редагувати',
    slotTitle: 'Натисніть, щоб зіграти {{name}} на FM1; двічі — щоб редагувати',
    slotEditBufferTitle:
      'Натисніть, щоб зіграти {{name}} на FM1, не перезаписуючи пресет; двічі — щоб редагувати',
    slotEditTitle: 'Натисніть двічі або Enter, щоб редагувати {{name}}',
    sendPatch: 'Надіслати {{name}} на FM1',
    auditioning: 'Прослуховування',
    reorder: 'Перемістити {{name}}',
    reorderTitle:
      'Перетягніть, щоб змінити порядок, або на інший банк, щоб скопіювати туди патч; з клавіатури порядок змінюють стрілки',
    copySelected: 'Копіювати до…',
    copyDialogTitle: 'Копіювати {{name}}',
    copyTargetBank: 'Банк',
    copyTargetSlot: 'Слот',
    copyReplaces: 'Це замінить «{{name}}» у слоті {{slot}}. Цю дію можна скасувати.',
    copyAction: 'Замінити {{slot}}',
    copyAndEditAction: 'Замінити {{slot}} і редагувати',
    copyToEditHint: 'Щоб редагувати цей патч, скопіюйте його до одного з ваших банків.',
    copyFailed: 'Не вдалося скопіювати патч.',
    addBankOpenFailed:
      'Не вдалося відкрити параметри нового банку. Перезавантажте сторінку й спробуйте ще раз.',
    copyOpenFailed:
      'Не вдалося відкрити параметри копіювання. Перезавантажте сторінку й спробуйте ще раз.',
    importPatchFile: 'Імпортувати патч…',
    downloadPatchFile: 'Завантажити патч',
    bankFileUnavailable:
      'Не вдалося прочитати файли банків. Перезавантажте сторінку й спробуйте ще раз.',
    patchFileUnavailable:
      'Не вдалося відкрити файли патчів. Перезавантажте сторінку й спробуйте ще раз.',
    everywhere: {
      workspace: 'Ваші банки',
      savedBanks: 'Збережені банки',
      catalog: 'Інші банки DX7',
      play: 'Зіграти {{name}} ({{origin}})',
      playTitle:
        'Натисніть, щоб зіграти {{name}} на FM1, не перезаписуючи пресет; двічі — щоб скопіювати й редагувати',
      copy: 'Копіювати {{name}} до банку',
      truncated:
        'Збігів: {{total}}, показано перші {{shown}}. Введіть більше символів, щоб звузити пошук.',
      loading: 'Пошук в інших банках DX7…',
      loadFailed:
        'Не вдалося виконати пошук у збережених банках та інших банках DX7. Перезавантажте сторінку й спробуйте ще раз.',
      playFailed: 'Не вдалося зіграти патч.',
      copiesHidden: 'Дублікати патчів не показано.',
    },
    slotVirtualAnalogTitle:
      'Натисніть, щоб обрати {{name}} на FM1: звучатиме пресет Virtual Analog, збережений на самому FM1',
    slotVirtualAnalogAddedTitle:
      '{{name}} — пресет Virtual Analog: FM1 відтворює такі пресети лише з власних банків A–D',
    virtualAnalogPatch: 'Пресет Virtual Analog',
    slotEightBitTitle:
      'Натисніть, щоб обрати {{name}} на FM1: звучатиме пресет 8-Bit, збережений на самому FM1',
    slotEightBitAddedTitle:
      '{{name}} — пресет 8-Bit: FM1 відтворює такі пресети лише з власних банків A–D',
    eightBitPatch: 'Пресет 8-Bit',
    eightBitTag: '8B',
    presetFileInexact:
      '«{{name}}» не вдасться зберегти як файл пресетів Baud Girl без змін, тож його не завантажено.',
    swapAction: 'Поміняти місцями з {{slot}}',
    swapHint:
      'Щоб не втратити «{{name}}», поміняйте патчі місцями: його буде переміщено в {{slot}}.',
    swapFailed: 'Не вдалося поміняти патчі місцями.',
    sentStatusWithInit:
      'Банк «{{bank}}» надіслано з INIT VOICE замість {{count, number}} пресету Virtual Analog або 8-Bit. Оберіть банк призначення на FM1.',
    sentStatusWithInit_few:
      'Банк «{{bank}}» надіслано з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit. Оберіть банк призначення на FM1.',
    sentStatusWithInit_many:
      'Банк «{{bank}}» надіслано з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit. Оберіть банк призначення на FM1.',
    sentStatusWithInit_other:
      'Банк «{{bank}}» надіслано з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit. Оберіть банк призначення на FM1.',
    virtualAnalogInitNote:
      'У банку DX7 немає місця для пресету Virtual Analog або 8-Bit, тож {{count, number}} такий пресет цього банку буде надіслано як INIT VOICE.',
    virtualAnalogInitNote_few:
      'У банку DX7 немає місця для пресету Virtual Analog або 8-Bit, тож {{count, number}} такі пресети цього банку буде надіслано як INIT VOICE.',
    virtualAnalogInitNote_many:
      'У банку DX7 немає місця для пресету Virtual Analog або 8-Bit, тож {{count, number}} таких пресетів цього банку буде надіслано як INIT VOICE.',
    virtualAnalogInitNote_other:
      'У банку DX7 немає місця для пресету Virtual Analog або 8-Bit, тож {{count, number}} таких пресетів цього банку буде надіслано як INIT VOICE.',
    fmPatch: 'Патч FM',
    fmTag: 'FM',
    virtualAnalogTag: 'VA',
    engineTitle: '{{engine}}\n{{action}}',
  },
  namedBanks: {
    saving: 'Збереження…',
    title: 'Мої збережені банки',
    intro: 'Оберіть збережений банк, щоб відкрити його в «{{bank}}».',
    saveCurrent: 'Зберегти «{{bank}}»',
    snapshotHelp: 'Буде збережено окрему копію всіх 32 патчів разом з ефектами FM1.',
    name: 'Назва банку',
    namePlaceholder: 'напр. Live Set',
    description: 'Опис (необов’язково)',
    descriptionPlaceholder: 'Нотатки про цей банк',
    save: 'Зберегти банк',
    saveMenu: 'Зберегти банк…',
    loadBank: 'Відкрити банк…',
    editDetails: 'Змінити відомості про банк',
    update: 'Оновити відомості',
    savedBanks: 'Збережені банки',
    count: '{{count, number}} збережений банк',
    count_few: '{{count, number}} збережені банки',
    count_many: '{{count, number}} збережених банків',
    count_other: '{{count, number}} збережених банків',
    search: 'Пошук',
    loading: 'Завантаження збережених банків…',
    empty: 'Збережених банків ще немає. Спершу збережіть обраний банк.',
    noMatches: 'Жоден збережений банк не відповідає пошуку.',
    load: 'Відкрити',
    updatedAt: 'Оновлено {{date}}',
    rename: 'Змінити {{name}}',
    download: 'Завантажити {{name}} як SysEx',
    downloadAction: 'Завантажити файл SysEx',
    duplicate: 'Дублювати {{name}}',
    duplicateAction: 'Дублювати банк',
    delete: 'Видалити {{name}}',
    deleteAction: 'Видалити банк',
    deleteConfirm: 'Остаточно видалити «{{name}}» з цього браузера?',
    loadConfirm: 'Замінити 32 патчі в «{{bank}}» на «{{name}}»?',
    replaceAction: 'Замінити патчі',
    operationFailed: 'Не вдалося виконати дію зі збереженим банком.',
    openFailed: 'Не вдалося відкрити збережені банки. Перезавантажте сторінку й спробуйте ще раз.',
    loadFailed: 'Не вдалося прочитати збережені банки зі сховища браузера.',
    damagedBanks:
      'Деякі збережені банки не вдалося прочитати, тому їх приховано. У сховищі браузера вони залишаються без змін.',
    saved: 'Збережено «{{name}}».',
    updated: 'Оновлено «{{name}}».',
    downloaded: 'Завантажено «{{name}}».',
    copied: 'Створено «{{name}}».',
    deleted: 'Видалено «{{name}}».',
    loaded: 'Банк «{{name}}» відкрито в «{{bank}}».',
    downloadedWithInit:
      'Завантажено «{{name}}» з INIT VOICE замість {{count, number}} пресету Virtual Analog або 8-Bit.',
    downloadedWithInit_few:
      'Завантажено «{{name}}» з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit.',
    downloadedWithInit_many:
      'Завантажено «{{name}}» з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit.',
    downloadedWithInit_other:
      'Завантажено «{{name}}» з INIT VOICE замість {{count, number}} пресетів Virtual Analog або 8-Bit.',
  },
  backup: {
    menuOtherFiles: 'Інші файли',
    sysexContents: 'Лише дані DX7, без ефектів FM1',
    menuHeading: 'Резервна копія',
    download: 'Завантажити резервну копію',
    restore: 'Відновити з резервної копії…',
    lastBackup: 'Остання резервна копія: {{date}}',
    downloaded: 'Завантажується резервна копія ваших банків і збережених банків.',
    downloadedWithoutSavedBanks:
      'Завантажується резервна копія ваших банків. Збережені банки не вдалося прочитати, тому їх у ній немає.',
    downloadedWithoutDamaged:
      'Завантажується резервна копія. Деякі збережені банки не вдалося прочитати, тому їх у ній немає.',
    unavailable: 'Не вдалося відкрити резервні копії. Перезавантажте сторінку й спробуйте ще раз.',
    unavailableUnsaved:
      'Не вдалося підготувати резервну копію. Останні зміни ще не збережено, тож не закривайте вкладку й спробуйте ще раз.',
    restoreTitle: 'Відновлення з резервної копії',
    restoreIntro:
      'Оберіть файл, створений командою «Завантажити резервну копію». Нічого не зміниться без підтвердження.',
    chooseFile: 'Оберіть файл резервної копії',
    reading: 'Читання резервної копії…',
    backedUpAt: 'Створено',
    workspaceBanks: 'Банки',
    patches: 'Патчі',
    savedBanks: 'Збережені банки',
    toAdd: 'Буде додано',
    alreadyHere: 'Уже є, лишаються без змін',
    unreadable: 'Не вдалося прочитати',
    workspaceEffect:
      'Ваші банки й усі їхні патчі буде замінено тими, що в резервній копії. Кнопка «Скасувати» в сповіщенні після цього поверне їх.',
    savedBanksEffect:
      'Збережені банки тільки додаються: банк, який уже є в цьому браузері, не змінюється, а «Скасувати» доданих не прибирає.',
    restoreAction: 'Відновити резервну копію',
    restoring: 'Відновлення…',
    restored: 'Відновлено резервну копію від {{date}}.',
    errors: {
      format:
        'Цей файл не є резервною копією з цього застосунку. Оберіть файл .json, створений командою «Завантажити резервну копію».',
      newer:
        'Цю резервну копію створено новішою версією застосунку. Перезавантажте сторінку, щоб оновити його, і спробуйте ще раз.',
      damaged:
        'Ця резервна копія пошкоджена, і її не можна відновити. Спробуйте інший файл резервної копії.',
      size: 'Цей файл завеликий для резервної копії з цього застосунку.',
      read: 'Не вдалося прочитати файл. Оберіть його ще раз.',
      savedBanksFailed:
        'Сховище браузера не змогло записати збережені банки з цієї резервної копії, тому вашу бібліотеку не змінено. Спробуйте ще раз.',
    },
  },
}

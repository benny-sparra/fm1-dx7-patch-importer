import fxPresets from './es-fx-presets'

export default {
  ...fxPresets,
  dialogs: {
    bankTitle: 'Elige el banco de destino en tu FM1',
    bankIntro:
      'Cuando el FM1 esté listo, inicia la transferencia SysEx y completa la importación en la unidad.',
    bankClose: 'Cerrar las instrucciones de selección',
    bankStep1: 'Espera a que aparezca la pantalla de selección de banco en el FM1.',
    bankStep2:
      'Gira el mando 1, 2, 3 o 4 para elegir el banco A, B, C o D, o gira SELECT a la izquierda para cancelar.',
    bankStep3: 'El FM1 guarda los 32 sonidos en cuanto eliges un banco.',
    bankFm1VaStep1:
      'El FM1 pregunta «Replace Bank A?» y empieza en el banco A, sea cual sea el banco que envíes.',
    bankFm1VaStep2:
      'Gira ALGORITHM hasta que la pregunta indique el banco de destino: A, B, C o D.',
    bankFm1VaStep3:
      'Gira SELECT hasta Replace y pulsa SEL para guardar los 32 sonidos, o pulsa HOME para cancelar. También sustituyen para siempre los presets de fábrica de ese banco.',
    bankFm1VaNote:
      'Si tu FM1 usa el firmware de Baud Girl, pregunta en su lugar «Replace Bank A?» y empieza en el banco A. Gira ALGORITHM hasta el banco de destino, luego SELECT hasta Replace, y pulsa SEL.',
    bankOfficialOpenNote:
      'El firmware Open de M-VAVE ignora los bancos DX7, así que enviar este banco no cambia sus proyectos.',
    bankFeluccaNote:
      'Felucca ignora los bancos DX7, así que enviar este banco no cambia sus presets.',
    bankFeluccaOrSloopNote:
      'Felucca y SLOOP ignoran los bancos DX7, así que enviar este banco no cambia los presets del FM1.',
    bankFm1VaImage:
      'Pantalla del FM1 con el firmware de Baud Girl que pregunta «Replace Bank A?», con Cancel y Replace',
    bankImage:
      'Pantalla del FM1 con el firmware de M-VAVE que muestra «32 Voice Save To …» sobre los bancos A, B, C y D',
    midiTitle: 'Conecta MIDI para enviar este banco',
    midiIntro: 'El FM1 debe estar conectado como salida MIDI antes de enviar un banco.',
    midiClose: 'Cerrar el mensaje de conexión MIDI',
    midiSteps: 'Activa MIDI en línea aquí y permite el acceso MIDI si el navegador lo pide.',
    midiChooseOutput: 'MIDI está en línea. Elige el FM1 como salida.',
    midiReady: 'MIDI está en línea. Comprueba que la salida sea el FM1 y envía.',
    midiConnect: 'Activar MIDI en línea',
    midiIdentifying: 'Esperando a que el FM1 indique qué firmware usa',
    restoreTitle: '¿Restablecer los sonidos de fábrica?',
    restoreIntro:
      'Esto sustituye los cuatro bancos. Puedes deshacer el restablecimiento inmediatamente.',
    restoreClose: 'Cerrar el restablecimiento',
    restoreDetails:
      'Los bancos A, B, C y D se restablecerán respectivamente con los bancos 1, 2, 3 y 4 del FM-1, los sonidos que trae el FM1 de fábrica.',
    restoreAction: 'Restablecer cuatro bancos',
    sourcesTitle: 'Buscar bancos DX7',
    sourcesIntro:
      'Descarga un banco SysEx DX7 de 32 voces (.syx), vuelve aquí y elige «Importar banco DX7…».',
    sourceDescriptions: {
      yamahaBlackBoxes: 'Cartuchos DX7 de fábrica y bancos SysEx.',
      bobbyBlues: 'Colección veterana de sonidos y bancos DX7.',
      soundarchive: 'Selección de bancos SysEx de DX7, TX816 y TX802.',
      fm1FactoryPresets:
        'Los preajustes originales del FM-1, recuperados de la herramienta de restauración de M-VAVE. También en el catálogo de bancos.',
    },
    sourcesClose: 'Cerrar fuentes de bancos',
    sourcesSubmit: '¿Has programado tu propio banco DX7?',
    sourcesSubmitLink: 'Ofrécelo para el catálogo de bancos',
  },
  controlHelp: {
    algorithm:
      'Elige cómo se conectan los seis operadores. Los operadores de abajo son portadores que oyes directamente; los de arriba cambian el timbre de los operadores que tienen debajo.',
    feedback:
      'Devuelve parte de un operador a sí mismo. Los valores altos añaden armónicos más brillantes y ásperos, y pueden volverse ruidosos.',
    pitchEnvelope:
      'Cambia el tono a lo largo de cada nota. Las cuatro velocidades controlan lo rápido que avanza cada etapa; los cuatro niveles fijan el tono alcanzado en cada etapa.',
    pitchEnvelopePresets:
      'Sustituye las ocho velocidades y niveles por una forma inicial. Plana elimina cualquier movimiento de tono; las demás añaden un pico breve, un ataque que cae, una subida o una caída al soltar. Deshacer recupera la envolvente anterior.',
    effectPresets:
      'Ajusta los controles de este efecto a un punto de inicio. Activa el efecto para elegir uno. Los demás efectos no cambian, y Deshacer recupera los ajustes anteriores.',
    oscillatorSync:
      'Reinicia cada operador en la misma posición de la forma de onda con cada nota. Activado da un ataque más uniforme; desactivado puede sonar más orgánico.',
    lfoSync:
      'Reinicia el LFO con cada nota nueva. Activado, la modulación se repite siempre igual; desactivado, cada nota se une al LFO que funciona sin parar.',
    lfoWave:
      'Elige la forma repetida que se usa para el vibrato y el trémolo. La senoidal es suave, la cuadrada salta entre dos valores y el muestreo y retención es aleatorio.',
    lfoSpeed: 'Ajusta la velocidad de ciclo del LFO. Súbela para un vibrato o trémolo más rápido.',
    lfoDelay:
      'Retrasa el LFO tras el inicio de una nota, para que el vibrato o el trémolo entre de forma gradual en lugar de empezar de inmediato.',
    pitchModDepth:
      'Fija la cantidad máxima de movimiento de tono del LFO. La sensibilidad de modulación de tono de cada sonido determina cuánto se oye.',
    ampModDepth:
      'Fija la cantidad máxima de movimiento de volumen del LFO. La sensibilidad de modulación de amplitud de cada operador determina cuánto responde.',
    pitchModSensitivity:
      'Controla con qué intensidad responde todo el sonido a la modulación de tono del LFO. Los valores altos crean un vibrato más amplio.',
    transpose: 'Sube o baja todo el sonido en semitonos sin cambiar las teclas que tocas.',
    operator:
      'Un operador es un oscilador con su propia envolvente. Los portadores producen sonido audible; los moduladores transforman otro operador para crear armónicos.',
    outputLevel:
      'Ajusta la intensidad de este operador. En un portador cambia sobre todo el volumen; en un modulador cambia el brillo y la complejidad armónica.',
    amplitudeEnvelope:
      'Da forma a este operador en el tiempo. Arrastra a izquierda y derecha para cambiar lo rápido que se alcanza una etapa, y arriba y abajo para cambiar su nivel. En los moduladores, da forma al brillo en lugar del volumen.',
    oscillatorMode:
      'Ratio sigue el teclado y es ideal para armónicos afinados. Fija usa una frecuencia constante, útil para sonidos metálicos, ruidosos o percusivos.',
    coarse:
      'Ajusta la relación de frecuencia principal en modo Ratio, o el rango de frecuencia general en modo Fija. Las relaciones enteras suelen sonar armónicas.',
    fine: 'Afina la frecuencia del operador entre los ajustes gruesos. Los cambios pequeños pueden añadir armónicos nuevos o batidos.',
    ratioEntry:
      'Escribe la relación que quieras, por ejemplo 3,5. Grueso y Fino pasan a la relación más cercana que puede tocar el FM1, y el campo la muestra.',
    fixedFrequencyEntry:
      'Escribe la frecuencia que quieras en hercios, por ejemplo 440 o 1,2k. Grueso y Fino pasan a la frecuencia más cercana que puede tocar el FM1, y el campo la muestra.',
    detune:
      'Separa ligeramente este operador de la afinación exacta. Con poca cantidad engorda el sonido; con diferencias mayores crea batidos o disonancia.',
    breakpoint:
      'Elige la nota del teclado donde se encuentran el escalado de nivel izquierdo y el derecho. El escalado cambia el nivel de este operador a lo largo del teclado.',
    leftDepth:
      'Ajusta cuánto cambia el nivel de este operador en las notas por debajo del punto de división.',
    rightDepth:
      'Ajusta cuánto cambia el nivel de este operador en las notas por encima del punto de división.',
    curve:
      'Elige la dirección y la forma del cambio de nivel al alejarse del punto de división. Lineal cambia de forma constante; exponencial cambia con más fuerza cerca de un extremo.',
    rateScaling:
      'Hace que la envolvente de este operador avance más rápido en las notas agudas, como la caída más corta de muchos instrumentos acústicos.',
    velocity:
      'Ajusta cuánto cambia la velocidad de pulsación el nivel de este operador. En los portadores afecta al volumen; en los moduladores, al brillo.',
    ampModSensitivity:
      'Ajusta cuánto responde este operador a la modulación de amplitud del LFO. En un portador crea trémolo; en un modulador anima el timbre.',
  },
  effectHelp: {
    Filter:
      'Elimina partes del espectro de frecuencias. Úsalo para oscurecer, adelgazar o remodelar el sonido FM final.',
    Reverb:
      'Añade reflexiones de sala simuladas, que dan al sonido sensación de espacio y distancia.',
    Delay:
      'Repite el sonido tras un breve tiempo. La caída, parecida a una realimentación, controla cuánto duran los ecos.',
    Distortion:
      'Añade saturación y armónicos adicionales. Puede hacer más densos los sonidos suaves o más intensos los agresivos.',
    Chorus: 'Añade copias ligeramente desplazadas del sonido para dar amplitud y movimiento.',
    Phaser: 'Barre una serie de muescas por el sonido y crea un carácter hueco y en movimiento.',
    Bitcrush:
      'Redondea el sonido a menos niveles y lo muestrea con menos frecuencia, para un carácter granuloso y lo-fi. Solo el firmware de Baud Girl desde FM-1_096 lo reproduce. Ningún mensaje MIDI lo ajusta, así que se oye cuando el sonido se escribe en el FM1 con Enviar al FM1 o Escribir sonidos en el FM1.',
  },
  effectParameterHelp: {
    'Filter Type':
      'Elige qué conserva el filtro: el paso bajo conserva los graves, el paso alto los agudos y el paso banda una banda media.',
    'Filter Cutoff':
      'Fija la frecuencia a partir de la que actúa el filtro, desde unos 100 Hz en 0 hasta 20 kHz en 107. Su efecto audible depende del tipo de filtro elegido.',
    'Filter Resonance':
      'Realza las frecuencias cercanas al corte. Los valores altos suenan más agudos y marcados.',
    'Reverb Space': 'Elige el carácter del espacio simulado: sala pequeña, sala o placa brillante.',
    'Reverb Decay': 'Ajusta cuánto dura la cola de la reverberación.',
    'Reverb Mix':
      'Equilibra el sonido seco y la reverberación. Al 0 % solo oyes el sonido original.',
    'Delay Decay':
      'Ajusta cuánto de cada eco se realimenta en el retardo. Los valores más altos dan más repeticiones antes de desvanecerse.',
    'Delay Rate':
      'Ajusta el tiempo entre ecos. Los valores más altos los acercan, desde unos 0,8 segundos en 0 hasta 0,1 segundos en 100.',
    'Delay Mix': 'Equilibra el sonido seco y los ecos. Al 0 % solo oyes el sonido original.',
    'Distortion Gain':
      'Controla con qué fuerza la señal excita la distorsión. Los valores altos añaden más saturación y armónicos.',
    'Distortion Tone': 'Ajusta el brillo del sonido distorsionado.',
    'Distortion Level':
      'Ajusta el volumen de salida tras la distorsión, útil para igualar el volumen sin el efecto.',
    'Distortion Type':
      'Elige cómo da forma la distorsión al sonido en el firmware de Baud Girl. Recorte suave, el original de M-VAVE, redondea los picos; recorte duro los corta en plano para un borde más áspero; Foldback los pliega hacia atrás para un tono más brillante y metálico. Ningún mensaje MIDI lo ajusta, así que se oye cuando el sonido se escribe en el FM1 con Enviar al FM1 o Escribir sonidos en el FM1.',
    'Chorus Frequency': 'Ajusta la velocidad de ciclo del movimiento del coro, de unos 0,1 a 1 Hz.',
    'Chorus Depth':
      'Ajusta cuánto recorre el movimiento de tono del coro. Los valores altos suenan más amplios y evidentes.',
    'Chorus Mix': 'Equilibra el sonido seco y la señal con coro.',
    'Phaser Frequency': 'Ajusta la velocidad de ciclo del barrido del fáser, de unos 0,5 a 6 Hz.',
    'Phaser Depth': 'Ajusta el rango y la intensidad del barrido del fáser.',
    'Phaser Mix': 'Equilibra el sonido seco y la señal con fáser.',
    'Bitcrush Bits':
      'Ajusta a cuántos niveles se redondea la onda, de 16, que suena limpio, hasta 1. Un sonido suave puede desaparecer con los valores más bajos.',
    'Bitcrush Sample Rate':
      'Ajusta con qué frecuencia se muestrea el sonido, de 300 Hz a 44,1 kHz. Las frecuencias bajas añaden armónicos ásperos y metálicos.',
    'Bitcrush Mix':
      'Equilibra el sonido limpio con el triturado. Al 0 % solo se oye el sonido original.',
  },
  distortionType: {
    softClip: 'Recorte suave',
    hardClip: 'Recorte duro',
    foldback: 'Foldback',
    unknown: 'Desconocido ({{value, number}})',
    noRecord:
      'Este sonido no viene del FM1, así que toma el tipo del preset sobre el que se escribe.',
    otherFirmware:
      'Guardado para el firmware de Baud Girl: {{type}}. Este FM1 usa su propia distorsión en su lugar.',
  },
  bitcrush: {
    hertz: '{{value}}Hz',
    kilohertz: '{{value}}k',
    noRecord:
      'Este sonido no viene del FM1, así que toma el Bitcrush del preset sobre el que se escribe.',
    otherFirmware:
      'Guardado para el firmware de Baud Girl desde FM-1_096: Bitcrush está activado. Este FM1 no lo reproduce.',
  },
  effectOrder: {
    menu: 'Acciones para {{effect}}',
    dragTitle:
      'Arrastra para cambiar en qué lugar del recorrido del sonido está este efecto, el primero arriba a la izquierda. Con el teclado, pulsa Espacio y luego las flechas. El nuevo orden se oye cuando el sonido se escribe en el FM1.',
    noRecord:
      'Este sonido no viene del FM1, así que toma el orden del preset sobre el que se escribe.',
    otherFirmware:
      'Guardado para el firmware de Baud Girl: un orden de efectos cambiado. Este FM1 usa su propio orden.',
  },
  knobChoices: {
    title: 'Mandos de control en tiempo real',
    knob: 'Mando {{number}}',
    assign: 'Asignar {{parameter}} a un mando',
    assignHeading: 'Asignar {{parameter}} a',
    assigned: 'Ya asignado',
    replaces: 'Sustituye a {{choice}}',
    help: 'Elige qué controla cada uno de los cuatro mandos del FM1 con este sonido, entre los ocho ajustes de su motor. La elección se guarda con el sonido y llega al FM1 cuando lo escribes con Enviar al FM1 o Escribir sonidos en el FM1.',
    noRecord:
      'Este sonido no viene del FM1, así que toma los mandos del preset sobre el que se escribe.',
    fm: {
      brightness: 'Brillo',
      feedback: 'Realimentación',
      attack: 'Ataque',
      decay: 'Caída',
      release: 'Liberación',
      vibrato: 'Vibrato',
      lfoSpeed: 'Velocidad LFO',
      cutoff: 'Corte',
    },
    virtualAnalog: {
      cutoff: 'Corte',
      resonance: 'Resonancia',
      filterEnvelope: 'Envolvente del filtro',
      filterDecay: 'Caída del filtro',
      shape: 'Forma',
      super: 'Super',
      detune: 'Desafinación',
      lfoToCutoff: 'LFO al corte',
    },
    eightBit: {
      drumDecay: 'Caída de batería',
      bassArpeggio: 'Arpegio del bajo',
      leadArpeggio: 'Arpegio de la melodía',
      leadDecay: 'Caída de la melodía',
      leadArpSpeed: 'Velocidad del arpegio de la melodía',
      leadVibrato: 'Vibrato de la melodía',
      leadRelease: 'Liberación de la melodía',
      bassDecay: 'Caída del bajo',
    },
  },
  eightBit: {
    help: {
      drumPreset:
        'Un tambor del kit propio del FM1 como punto de partida para este. Su nivel no cambia.',
      partPreset:
        'Un timbre de partida para esta parte: su onda, su secuencia de ciclo y la forma de cada nota. Su arpegio, octava, nivel y modo monofónico no cambian.',
      key: 'Pone ambas partes en una tonalidad, así que cada tecla toca el acorde que le corresponde en la escala. En Off, cada parte toca su arpegio. La primera tonalidad de un sonido deriva el acorde y el patrón de cada parte de su arpegio, como hace el FM1.',
      accidentals:
        'Lo que tocan las cinco teclas fuera de la escala. Borrowed hace de cada una la fundamental de un acorde ajeno a la escala; Leading, la tercera de un acorde mayor que lleva a la tecla de arriba.',
      voicing:
        'From Key empieza cada acorde en la tecla que pulsas. Close mantiene las notas de cada acorde dentro de una octava sobre la tónica, así que se mueven menos notas entre acordes.',
      leadFollows:
        'En Bass, el lead toma su acorde de la última tecla de bajo que tocaste, así que una mano toca la progresión bajo la otra.',
      arpSync:
        'Key empieza cada arpegio al bajar su tecla. Beat pone todos los pasos de arpegio en una misma rejilla al tempo, o en los pasos de un patrón que suena.',
      tone: 'Raw es la onda emulada sin más. Smooth suaviza cada flanco y pasa el sonido por los filtros de salida de la consola.',
      tuning:
        'Exact toca cada nota afinada. Chip usa solo las alturas que la consola podía producir, y se desafina en la parte alta del teclado.',
      drums: 'Doce tambores en las teclas F0 a E1. Elige uno para editarlo.',
      drumDecay:
        'Alarga o acorta todos los tambores a la vez y conserva sus diferencias. En 50 cada uno suena lo que marca su propia caída.',
      choke:
        'Un tambor del grupo A, B o C corta cualquier otro de su grupo que siga sonando, como un charles cerrado corta uno abierto.',
      snap: 'Una ráfaga de ruido bajo el tono, que hace que un golpe suene a caja.',
      sweep: 'Cuánto baja o sube la altura mientras suena la nota. En 0 se mantiene.',
      dutySequence:
        'Cambia el ancho de una onda de pulso mientras suena la nota, para dar movimiento a un canal. Solo actúa sobre las cuatro ondas Pulse.',
      arpeggio:
        'El acorde que una tecla toca nota a nota mientras el sonido no tiene tonalidad. User toca los pasos de Arpegio propio.',
      chord:
        'Qué notas de la escala toca cada tecla. No se toca con el patrón User, cuyos pasos eligen las notas.',
      pattern:
        'El orden en que suenan las notas del acorde, contadas desde la más grave. Off toca solo la tecla.',
      noteEngine:
        'Auto-Arp toca el acorde de la parte nota a nota. Auto-Chord toca sus notas juntas, hasta cuatro.',
      userArpeggio:
        'Ocho pasos en semitonos desde la tecla que pulsas, de −12 a +18. Un paso pasado de +18 marca End y vuelve al primer paso.',
      glide:
        'Cuánto tarda la altura en deslizarse a la siguiente nota. Necesita Monofónico activado.',
    },
    drumPresets: {
      kick: 'Bombo',
      snare: 'Caja',
      noiseSnare: 'Caja de ruido',
      rim: 'Aro',
      closedHat: 'Charles cerrado',
      openHat: 'Charles abierto',
      metalHat: 'Charles metálico',
      crash: 'Crash',
      lowTom: 'Tom grave',
      midTom: 'Tom medio',
      highTom: 'Tom agudo',
      blip: 'Blip',
    },
    partPresets: {
      triangle: 'Bajo triangular',
      pulse: 'Lead de pulso',
      square: 'Cuadrada',
      pluck: 'Punteado',
      wobble: 'Wobble',
      sweep: 'Barrido',
      gbBass: 'Bajo GB',
      organ: 'Órgano',
      bell: 'Campana',
      pad: 'Pad suave',
    },
    starters: {
      console: {
        name: 'Consola',
        description:
          'El kit propio del FM1, un bajo triangular y un lead de pulso, por los filtros de la consola.',
      },
      rawChip: {
        name: 'Chip crudo',
        description:
          'El kit con un bajo de onda cuadrada y un lead con barrido, crudo y afinado como el chip.',
      },
      gameBoy: {
        name: 'Game Boy',
        description: 'El kit con las ondas de bajo y de campana de la Game Boy.',
      },
      arpLead: {
        name: 'Lead arpegiado',
        description:
          'Un bajo punteado bajo un lead cuadrado que toca un arpegio mayor rápido mientras el sonido no tiene tonalidad.',
      },
    },
    key: 'Tonalidad',
    partSetting: '{{setting}} de {{part}}',
    keySettings: 'Ajustes que siguen la tonalidad',
    scale: 'Escala',
    accidentals: 'Alteraciones',
    voicing: 'Disposición',
    leadFollows: 'El lead sigue',
    arpSync: 'Sincronía del arpegio',
    tone: 'Timbre',
    tuning: 'Afinación',
    drums: 'Batería',
    drumsLevel: 'Nivel de batería',
    drumDecay: 'Caída de batería',
    drum: 'Tambor',
    drumHeading: 'Tambor {{drum}}',
    wave: 'Onda',
    choke: 'Corte',
    pitch: 'Altura',
    sweep: 'Barrido',
    decay: 'Caída',
    level: 'Nivel',
    snap: 'Chasquido',
    bass: 'Bajo',
    lead: 'Lead',
    dutySequence: 'Secuencia de ciclo',
    dutySequenceUnheard:
      'Una secuencia de ciclo solo cambia las cuatro ondas Pulse, así que en esta parte no se oye.',
    arpeggio: 'Arpegio',
    chord: 'Acorde',
    pattern: 'Patrón',
    arpSpeed: 'Velocidad del arpegio',
    noteEngine: 'Motor de notas',
    userArpeggio: 'Arpegio propio',
    step: 'Paso {{step}}',
    vibrato: 'Vibrato',
    glide: 'Portamento',
    octave: 'Octava',
    mono: 'Monofónico',
    initPatch: 'Inicializar',
    initPatchHelp: 'El preset 8-Bit vacío del propio FM1. Efectos apagados.',
    live: 'La envolvente, el LFO y los efectos suenan en directo. Lo demás se oye cuando el sonido se escribe en el FM1.',
    noFirmware:
      'El directo requiere el firmware de Baud Girl FM-1_096 o posterior y MIDI activado. Hasta entonces, los cambios se oyen cuando el sonido se escribe en el FM1.',
  },
  virtualAnalog: {
    help: {
      waveform:
        'La onda básica del oscilador. La senoidal es suave, la de sierra brillante y zumbona, la triangular queda entre ambas, y la cuadrada es hueca pero más dura que la senoidal.',
      super:
        'Añade seis copias más de la onda alrededor de la elegida. Sube también la desafinación para abrirlas en un sonido denso, como un supersaw.',
      detune:
        'Cuánto se separan en tono las copias que añade Super. No hace nada mientras Super esté en 0.',
      drift:
        'Desafina un poco cada nota, como hacen los osciladores antiguos. En la mitad superior se vuelve inestable a propósito.',
      sub: 'Añade una onda cuadrada una octava por debajo de cada nota, para dar peso.',
      noise: 'Mezcla ruido con la onda.',
      pwm: 'Mueve el ancho de la onda cuadrada para que el tono cambie solo. Solo funciona con la forma de onda cuadrada.',
      filterType:
        'Qué parte del sonido quita el filtro. El paso bajo quita los agudos, suave a 12 dB o abrupto a 24 dB; el paso banda conserva una banda alrededor del corte; el paso alto quita los graves.',
      cutoff: 'La frecuencia desde la que trabaja el filtro. Bájala para oscurecer el sonido.',
      resonance: 'Realza el sonido justo en el corte, hasta que el filtro silba.',
      filterEnvelope: 'Cuánto mueve el corte la envolvente propia del filtro en cada nota.',
      filterDecay:
        'Cuánto dura el movimiento de la envolvente del filtro. Corta y con mucha cantidad de envolvente da un sonido punteado.',
      filterShape:
        'Cómo es el movimiento de la envolvente del filtro, desde la subida hasta la caída.',
      filterVelocity: 'Cuánto sube el corte al tocar más fuerte. No cambia el volumen.',
      keyTracking:
        'Cuánto sigue el corte a las notas que tocas más arriba en el teclado. Mientras está activo, el gráfico esboza el filtro para las tres teclas iluminadas, las dos exteriores como curvas discontinuas de su color.',
      lfoToCutoff: 'Cuánto mueve el LFO el corte.',
      level: 'Lo fuerte que suena este sonido junto a los demás, unos 0,74 dB por paso.',
      velocityToLevel:
        'Cuánto más fuerte suena una nota al tocar con más fuerza. En 0 todas las notas suenan igual.',
      mono: 'Toca una nota cada vez. Una tecla nueva sustituye a la que mantienes sin un nuevo ataque.',
      envelope:
        'Un ataque, una caída, un sostenido y una liberación para todo el sonido mientras está activada. Arrastra sus puntos o sus faders. La liberación apaga una nota en 0,1 segundos en 0 y en 2 segundos en 100. Sube el sostenido al activarla, porque en 0 una nota mantenida es corta.',
    },
    oscillator: 'Oscilador',
    waveform: 'Forma de onda',
    waveforms: {
      sine: 'Senoidal',
      saw: 'Sierra',
      triangle: 'Triangular',
      square: 'Cuadrada',
    },
    super: 'Super',
    detune: 'Desafinación',
    drift: 'Deriva',
    sub: 'Sub',
    noise: 'Ruido',
    pwm: 'PWM',
    filter: 'Filtro',
    filterType: 'Tipo de filtro',
    filterTypes: {
      lowPass12: 'Paso bajo 12 dB',
      lowPass24: 'Paso bajo 24 dB',
      bandPass: 'Paso banda',
      highPass: 'Paso alto',
    },
    cutoff: 'Corte',
    resonance: 'Resonancia',
    filterEnvelope: 'Cantidad de envolvente',
    filterDecay: 'Caída de envolvente',
    filterShape: 'Forma de envolvente',
    filterVelocity: 'Velocidad',
    keyTracking: 'Seguimiento de teclado',
    keyTrackingNote: 'Do{{octave}}',
    lfoToCutoff: 'LFO al corte',
    level: 'Nivel',
    velocityToLevel: 'Velocidad al nivel',
    mono: 'Monofónico',
    lfo: 'LFO',
    envelope: 'Envolvente',
    attack: 'Ataque',
    decay: 'Caída',
    sustain: 'Sostenido',
    release: 'Liberación',
    noProgram:
      'Este sonido no está en los bancos A–D. Los cambios se oyen cuando se escribe en el FM1.',
    noFirmware:
      'El directo requiere el firmware de Baud Girl FM-1_086 o posterior y MIDI activado. Hasta entonces, los cambios se oyen cuando el sonido se escribe en el FM1.',
    otherEngine:
      'El preset {{preset}} del FM1 no es Virtual Analog, así que no se le envían los cambios. Se oyen cuando el sonido se escribe en el FM1.',
    readFailed:
      'El FM1 no respondió por su preset {{preset}}, así que no se le envían los cambios. Se oyen cuando el sonido se escribe en el FM1.',
    presets: 'Preajustes de sonido',
    initPatch: 'Inicializar',
    initPatchHelp: 'Onda de sierra simple, filtro abierto. Efectos apagados.',
    randomiseHelp: 'Sonido nuevo. Conserva nombre, nivel y efectos.',
    presetOptions: {
      'super-saw': {
        name: 'Supersierra',
        description: 'Sierras desafinadas, chorus y reverb de sala.',
      },
      'mono-bass': {
        name: 'Bajo mono',
        description: 'Cuadrada y sub, una nota cada vez.',
      },
      'filter-pluck': {
        name: 'Pulsación filtrada',
        description: 'Barrido corto de filtro, eco y sala pequeña.',
      },
      'warm-pad': {
        name: 'Pad cálido',
        description: 'Ataque lento, deriva suave y reverb de sala.',
      },
      'pulse-strings': {
        name: 'Cuerdas de pulso',
        description: 'Onda cuadrada en movimiento, chorus y reverb.',
      },
      'vibrato-lead': {
        name: 'Solista con vibrato',
        description: 'Una nota cada vez, vibrato retardado y eco.',
      },
    },
  },
  ui: {
    drag: {
      cancelled: 'Se canceló el movimiento de {{name}}.',
      dropped: '{{name}} se soltó sobre {{target}}.',
      droppedInPlace: '{{name}} se soltó en su sitio.',
      instructions:
        'Para mover un elemento, enfoca su asa y pulsa Espacio o Intro. Usa las flechas para moverlo, y pulsa Espacio o Intro para soltarlo, o Escape para cancelar.',
      over: '{{name}} está sobre {{target}}.',
      pickedUp: 'Se recogió {{name}}.',
      roleDescription: 'elemento ordenable',
      slotInstructions:
        'Para mover un sonido, enfoca su asa y pulsa Espacio o Intro. Usa las flechas para moverlo, y pulsa Espacio o Intro para soltarlo, o Escape para cancelar. Si lo arrastras a la pestaña de un banco, el sonido se copia en ese banco; «Copiar a…» en su menú hace lo mismo desde el teclado.',
    },
    auditionGroup: 'Prueba del operador {{number}}',
    mute: 'Silenciar',
    unmute: 'Activar sonido',
    solo: 'Solo',
    unsolo: 'Quitar solo',
    auditionAction: '{{action}} el operador {{number}} para probarlo',
    auditionTemporary: '{{action}} temporalmente el operador {{number}}',
    auditionConnect: '{{action}} el operador {{number}}; conecta MIDI para oír los cambios',
    operatorOutput: 'Nivel de salida del operador {{number}}',
    oscillator: 'Oscilador',
    mode: 'Mode',
    coarse: 'Grueso',
    fine: 'Fino',
    detune: 'Desafinación',
    ratioEntry: 'Ratio',
    fixedFrequencyEntry: 'Frecuencia (Hz)',
    ratioEntryInvalid: 'Escribe la relación como un número, por ejemplo 3,5.',
    fixedFrequencyEntryInvalid: 'Escribe la frecuencia en hercios, por ejemplo 440.',
    keyboardScaling: 'Escalado de teclado',
    breakpoint: 'Punto de división',
    left: 'Izquierda',
    right: 'Derecha',
    leftDepth: 'Profundidad izquierda',
    rightDepth: 'Profundidad derecha',
    rateScaling: 'Escalado de velocidad',
    leftCurve: 'Curva izquierda',
    rightCurve: 'Curva derecha',
    velocity: 'Velocidad',
    ampModSensitivity: 'Sens. mod. amplitud',
    lfoWave: 'Forma de onda LFO',
    dx7Algorithm: 'Algoritmo DX7',
    unsavedBody:
      'Guarda esta copia en tu biblioteca o descártala y restaura el sonido guardado en el FM1.',
    revertTitle:
      'Descartar todos los cambios desde el último guardado y restaurar ese sonido en el FM1',
    keyboard: 'Teclado',
    pianoKeyboard: 'Teclado de piano',
    dragKeyboard: 'Mover el teclado',
    closeKeyboard: 'Cerrar el teclado',
    keyLevel: 'Nivel',
    phrase: 'Frase',
    play: 'Tocar',
    stop: 'Parar',
    playPhrase: 'Tocar la frase',
    stopPhrase: 'Parar la frase',
    tempo: 'Tempo',
    tempoValue: '{{tempo}} BPM',
    phrases: {
      pad: 'Colchón',
      electricPiano: 'Piano eléctrico',
      bass: 'Bajo',
      lead: 'Melodía',
      arpeggio: 'Arpegio',
      velocityRamp: 'Rampa de velocidad',
    },
    helpOpenFailed: 'No se pudo abrir la guía. Recarga la página e inténtalo de nuevo.',
    keyboardOpenFailed: 'No se pudo abrir el teclado. Recarga la página e inténtalo de nuevo.',
    shiftOctave: 'Desplazar octava hacia {{direction}}',
    playNote: 'Tocar {{note}}',
    helpFor: 'Ayuda: {{label}}',
    rotaryTitle: '{{label}}: {{value}}. Arrastra hacia arriba o abajo para ajustar.',
    envelopePoint: '{{title}}, punto {{point}}',
    envelopePointValue: 'Velocidad {{rate}}, nivel {{level}}',
    envelopeRate: '{{title}}, velocidad {{point}}',
    envelopeLevel: '{{title}}, nivel {{point}}',
    chooseAlgorithm: 'Algoritmo {{number}}. Elegir algoritmo',
    algorithmNumber: 'Algoritmo {{number}}',
    operatorSummary: 'Operador {{number}}, {{role}}',
    operatorSummaryWithAudition: 'Operador {{number}}, {{role}}, {{audition}}',
    operatorMuted: 'silenciado',
    operatorSoloed: 'en solo',
    operatorMenu: 'Acciones del operador {{number}}',
    copyOperatorAction: 'Copiar el operador {{number}}',
    pasteOperatorAction: 'Pegar el operador {{source}}',
    pasteOperatorFromPatchAction: 'Pegar el operador {{source}} de «{{patch}}»',
    pasteOperatorEmpty: 'Pegar (primero copia un operador o su envolvente)',
    copyEnvelopeAction: 'Copiar la envolvente del operador {{number}}',
    pasteEnvelopeAction: 'Pegar la envolvente del operador {{source}}',
    pasteEnvelopeFromPatchAction: 'Pegar la envolvente del operador {{source}} de «{{patch}}»',
    lfoWaves: {
      triangle: 'Triángulo',
      sawDown: 'Diente de sierra descendente',
      sawUp: 'Diente de sierra ascendente',
      square: 'Cuadrada',
      sine: 'Senoidal',
      sampleAndHold: 'Muestreo y retención',
    },
    oscillatorModes: {
      ratio: 'Ratio',
      fixed: 'Fija',
    },
    curves: {
      negativeLinear: '− Lineal',
      negativeExponential: '− Exponencial',
      positiveExponential: '+ Exponencial',
      positiveLinear: '+ Lineal',
    },
    directionDown: 'abajo',
    directionUp: 'arriba',
    effects: {
      filter: 'Filtro',
      reverb: 'Reverberación',
      delay: 'Retardo',
      distortion: 'Distorsión',
      chorus: 'Coro',
      phaser: 'Fáser',
      bitcrush: 'Bitcrush',
    },
    parameters: {
      depth: 'Profundidad',
      type: 'Tipo',
      cutoff: 'Corte',
      resonance: 'Resonancia',
      space: 'Espacio',
      decay: 'Caída',
      mix: 'Mezcla',
      rate: 'Velocidad',
      gain: 'Ganancia',
      tone: 'Tono',
      level: 'Nivel',
      frequency: 'Frecuencia',
      bits: 'Bits',
      sampleRate: 'Muestreo',
    },
    options: {
      lowPass: 'Paso bajo',
      bandPass: 'Paso banda',
      highPass: 'Paso alto',
      room: 'Sala pequeña',
      hall: 'Sala',
      plate: 'Placa',
    },
  },
  replacePatch: {
    replacing: 'Reemplazando…',
    receive: 'Recibir por MIDI…',
    action: 'Reemplazar sonido',
    title: '¿Reemplazar {{slot}} «{{patch}}»?',
    warning:
      'El sonido de esta ranura se sustituirá por el del archivo y sus efectos FM1 volverán a los valores predeterminados.',
  },
  receiveWizard: {
    title: 'Recibir sonidos',
    help: {
      source:
        'Elige qué está enviando. El editor solo escucha: no envía nada para iniciar una transferencia.',
      listen: 'Mantén este paso abierto hasta que lleguen los sonidos.',
      review:
        'Haz clic en un sonido para escucharlo en el FM1. Tu biblioteca no cambia hasta que reemplaces algo.',
      destination: 'Elige adónde van los sonidos.',
    },
    sourceLegend: 'Qué está enviando',
    sources: {
      fm1: 'Un FM1 con la V16 de M-VAVE',
      fm1Hint: 'Un banco de 32 sonidos, enviado con GLOBE → Export.',
      patch: 'Un sonido de otro dispositivo',
      patchHint: 'Desde Dexed, un DX7 u otro editor.',
    },
    stepsHeading: 'Pasos',
    steps: {
      fm1Connect: 'Conecta el FM1 a este ordenador por USB. Export solo envía por USB.',
      next: 'Pulsa Siguiente para que el editor escuche antes de que se envíe nada.',
      fm1Export: 'En el FM1, abre GLOBE, elige Export y luego un banco.',
      patchConnect:
        'Conecta el dispositivo, o abre Dexed o el otro editor, con su salida MIDI llegando a este ordenador.',
      patchSend: 'Envía desde él un sonido como volcado DX7 de una sola voz.',
    },
    startFm1: 'Ahora abre GLOBE en el FM1, elige Export y luego un banco.',
    startPatch: 'Ahora envía el sonido como volcado DX7 de una sola voz.',
    listening: 'Escuchando «{{input}}». El editor no envía nada.',
    noMidi: 'MIDI está sin conexión. Actívalo en línea para escuchar.',
    noInput: 'Elige como entrada de monitorización el dispositivo que envía los sonidos.',
    noSysex:
      'Para recibir sonidos se necesita SysEx. Reconecta MIDI y permite el acceso SysEx cuando el navegador lo pida.',
    received: 'Se recibió «{{patch}}». Pulsa Siguiente o envía otro para recibirlo en su lugar.',
    receivedBank:
      'Se recibió un banco de 32 sonidos que empieza por «{{patch}}». Pulsa Siguiente para escucharlos o envía otro para recibirlo en su lugar.',
    timeout: 'Si el FM1 muestra Receive Timeout, vuelve a iniciar Export con este paso abierto.',
    errors: {
      bankDamaged: 'Ese banco llegó dañado. Envíalo de nuevo.',
      bankDamagedFm1: 'Ese banco llegó dañado. Vuelve a iniciar Export en el FM1.',
      damaged: 'Ese sonido llegó dañado. Envíalo de nuevo.',
      format:
        'Eso no era un sonido ni un banco DX7. Envía un volcado de una sola voz o un banco de 32 voces.',
    },
    receivedTitle: 'Sonidos recibidos',
    receivedPatchTitle: 'Sonido recibido',
    play: 'Escuchar {{name}}',
    bankLegend: 'Banco que reemplazar',
    emptyBank: 'Vacío',
    bankWarning:
      'Todos los sonidos de «{{bank}}» se sustituirán por los 32 recibidos y sus efectos FM1 volverán a los valores predeterminados.',
    patchBankLegend: 'Banco',
    slotLabel: 'Ranura que reemplazar',
    slotOption: '{{slot}} {{patch}}',
    patchWarning:
      '{{slot}} «{{patch}}» se sustituirá por «{{received}}» y sus efectos FM1 volverán a los valores predeterminados.',
    noBanks:
      'Un sonido solo puede reemplazar a otro que ya esté en un banco. Añade primero un banco con sonidos.',
    replace: 'Reemplazar',
  },
  bankFile: {
    legend: 'Bancos de este archivo',
    help: 'Este archivo contiene un banco DX7.',
    help_other: 'Este archivo reúne {{count, number}} bancos DX7. Elige el que quieres importar.',
    damagedBanks: 'Uno de ellos está dañado y no se puede importar.',
    damagedBanks_other: '{{count, number}} de ellos están dañados y no se pueden importar.',
    bank: 'Banco {{number}}',
    option: '{{bank}}: {{contents}}',
    damaged: 'Dañado',
  },
  overwriteImport: {
    titleEmpty: 'Importar en «{{bank}}»',
    actionEmpty: 'Importar banco',
    action: 'Reemplazar contenido',
    play: 'Escuchar {{name}}, sonido {{number}}',
    previewHelp:
      'Haz clic en un sonido para escucharlo en el FM1. Tu banco no cambia hasta que lo reemplaces.',
    previewTitle: 'Sonidos de este archivo',
    title: '¿Importar sobre «{{bank}}»?',
    warning: 'El contenido actual del banco se borrará y se sustituirá por los sonidos importados.',
  },
  fm1VaImport: {
    menuItem: 'Importar archivo de presets de Baud Girl…',
    menuRead: 'Leer presets del FM1…',
    menuHeading: 'Baud Girl (FM-1+VA)',
    title: 'Importar archivo de presets de Baud Girl',
    titleRead: 'Leer presets del FM1',
    help: 'Elige un archivo de presets del Device Manager de Baud Girl: una copia de «Back up everything» o un preset guardado con «Save as a file».',
    warning:
      'Cada banco que importes reemplaza el banco que elijas para él, o se añade como banco nuevo. Puedes deshacerlo.',
    partialFile:
      'Este archivo contiene un preset. Solo cambia su posición; las demás posiciones conservan su sonido.',
    partialFile_other:
      'Este archivo contiene {{count, number}} presets. Solo cambian sus posiciones; las demás posiciones conservan su sonido.',
    file: 'Archivo de presets de Baud Girl',
    read: 'Leer del FM1',
    readUnavailable:
      'Para leer los presets del FM1, elígelo como salida y entrada MIDI, con SysEx permitido. La lectura necesita el firmware de Baud Girl FM-1_079 o posterior.',
    reading: 'Leyendo el preset {{number, number}} de {{total, number}}…',
    stopReading: 'Dejar de leer',
    chooseFile: 'Elige un archivo de presets de Baud Girl',
    previewTitle: 'Bancos de este archivo',
    previewHelp: 'Abre un banco para escuchar sus sonidos en el FM1.',
    previewTitleFm1: 'Bancos en el FM1',
    allMatch: 'Todos los sonidos de aquí coinciden con tu biblioteca.',
    differs: 'Un punto marca el único sonido que difiere de tu biblioteca.',
    differs_other:
      'Un punto marca cada uno de los {{count, number}} sonidos que difieren de tu biblioteca.',
    differingPatch: 'Difiere de tu biblioteca',
    bankHeading: 'Banco {{bank}} del FM1',
    newBank: 'Un banco nuevo',
    destination: 'Importar en',
    bankSwitch: 'Importar el banco {{bank}} del FM1',
    damagedPreset: 'Dañado',
    damagedPresets: 'Un preset está dañado. Su posición conserva su sonido.',
    damagedPresets_other:
      '{{count, number}} presets están dañados. Sus posiciones conservan sus sonidos.',
    absentPreset: 'No está en el archivo',
    action: 'Importar un banco',
    action_other: 'Importar {{count, number}} bancos',
    imported: 'Banco {{banks}} importado del FM1.',
    imported_other: 'Bancos {{banks}} importados del FM1.',
    openFailed:
      'No se pudo abrir la importación de presets de Baud Girl. Recarga la página e inténtalo de nuevo.',
    errors: {
      size: 'Este archivo tiene {{bytes, number}} bytes. Un archivo de presets de Baud Girl contiene de 1 a 128 presets de {{size, number}} bytes cada uno.',
      format: 'Este archivo no es un archivo de presets de Baud Girl.',
      damaged:
        'No se pudo leer ningún preset de este archivo. Vuelve a guardar el archivo en el Device Manager de Baud Girl e inténtalo de nuevo.',
      unreadable: 'No se pudo leer el archivo.',
      readBusy:
        'El FM1 no puede enviar sus presets mientras su Sequencer está sonando. Detenlo y vuelve a leer.',
      readNoReply: 'El FM1 dejó de responder. Comprueba su conexión MIDI y vuelve a leer.',
      readStopped: 'La lectura se detuvo porque cambiaron los puertos MIDI. Vuelve a leer.',
      readFailed:
        'El FM1 no pudo enviar sus presets. Vuelve a leer o elige un archivo de presets de Baud Girl.',
    },
  },
  fm1VaWrite: {
    menuItem: 'Escribir sonidos en el FM1…',
    title: 'Escribir sonidos en el FM1',
    help: 'Escribe los sonidos de tu biblioteca sobre los presets del FM1. Solo se escriben los sonidos que difieren.',
    source: 'Escribir desde',
    bankSwitch: 'Escribir en el banco {{bank}} del FM1',
    differs: 'Un sonido es distinto.',
    differs_other: '{{count, number}} sonidos son distintos.',
    same: 'Todos los sonidos coinciden.',
    nothing: 'No hay nada que escribir.',
    virtualAnalogKept:
      'Un preset Virtual Analog se conserva: solo un sonido Virtual Analog puede reemplazarlo.',
    virtualAnalogKept_other:
      '{{count, number}} presets Virtual Analog se conservan: solo sonidos Virtual Analog pueden reemplazarlos.',
    eightBitKept: 'Un preset 8-Bit se conserva: solo un sonido 8-Bit puede reemplazarlo.',
    eightBitKept_other:
      '{{count, number}} presets 8-Bit se conservan: solo sonidos 8-Bit pueden reemplazarlos.',
    inexact:
      'Un sonido Virtual Analog u 8-Bit no se puede guardar exactamente, así que su preset se conserva.',
    inexact_other:
      '{{count, number}} sonidos Virtual Analog u 8-Bit no se pueden guardar exactamente, así que sus presets se conservan.',
    eightBitPatch:
      'Un sonido se leyó de un preset 8-Bit y no se puede escribir, así que su preset se conserva.',
    eightBitPatch_other:
      '{{count, number}} sonidos se leyeron de presets 8-Bit y no se pueden escribir, así que sus presets se conservan.',
    replaces: '{{number}} {{replaces}} → {{name}}',
    action: 'Escribir un sonido…',
    action_other: 'Escribir {{count, number}} sonidos…',
    confirmTitle: '¿Reemplazar estos presets en el FM1?',
    confirmWarning:
      'Cada preset se reemplaza al instante, y el FM1 no puede deshacerlo. Guarda antes una copia con «Back up everything» en el Device Manager de Baud Girl.',
    confirm: 'Escribir un sonido',
    confirm_other: 'Escribir {{count, number}} sonidos',
    writing: 'Escribiendo el sonido {{number, number}} de {{total, number}}…',
    stop: 'Parar después de este sonido',
    written: 'Se escribió un sonido en el FM1.',
    written_other: 'Se escribieron {{count, number}} sonidos en el FM1.',
    stopped:
      'Se paró tras {{count, number}} de {{total, number}} sonidos. El resto no ha cambiado.',
    openFailed: 'No se pudo abrir la escritura en el FM1. Recarga la página e inténtalo de nuevo.',
    errors: {
      mismatch:
        'El preset {{number}} no se leyó tal como se escribió, así que se paró tras {{count, number}} de {{total, number}} sonidos.',
      failed:
        'La escritura se paró tras {{count, number}} de {{total, number}} sonidos. Comprueba la conexión MIDI del FM1.',
    },
  },
  shareLink: {
    loadFailed:
      'No se pudieron abrir los enlaces para compartir. Recarga la página e inténtalo de nuevo.',
    menuItem: 'Copiar enlace para compartir',
    copied: 'Se copió el enlace para compartir «{{patch}}».',
    copyFailed:
      'No se pudo copiar el enlace para compartir: el navegador no permitió usar el portapapeles.',
    title: 'Sonido compartido',
    intro:
      'Alguien compartió este sonido con un enlace. No entra en tu biblioteca hasta que lo añadas a una ranura.',
    play: 'Tocar en el FM1',
    playHelp: 'Tocar lo envía al búfer de edición del FM1, sin cambiar los presets que guarda.',
    connectToPlay: 'Conecta el FM1 para tocarlo.',
    presetPlaysOnFm1:
      'Este preset solo suena con el firmware de Baud Girl: añádelo a los bancos A–D y luego escríbelo en el FM1 para oírlo.',
    add: 'Añadir a la biblioteca…',
    origin: 'Enlace compartido',
    damaged:
      'Este enlace para compartir está dañado o incompleto. Pídelo de nuevo y cópialo entero.',
    newerVersion:
      'Este enlace para compartir viene de una versión más reciente del editor. Recarga la página para abrirlo.',
  },
  changeToFm: {
    menuItem: 'Cambiar a FM…',
    title: '¿Cambiar {{slot}} «{{patch}}» a FM?',
    warning:
      'Esto reemplaza el preset Virtual Analog de esta posición por INIT VOICE, un sonido FM que puedes editar. De su sonido solo se conservan los efectos del FM1. Deshacer lo recupera.',
    name: 'Nombre',
    fm1Note:
      'Si el FM1 guarda este preset Virtual Analog, escribir en el FM1 lo deja ahí: bórralo en el FM1 para cambiar también allí su motor.',
    action: 'Cambiar a FM',
    changed: '{{slot}} se cambió a FM como «{{patch}}».',
    openFailed: 'No se pudo abrir el cambio a FM. Recarga la página e inténtalo de nuevo.',
  },
  fm1VaSend: {
    title: 'Enviar {{bank}} al FM1',
    help: 'Escribe {{bank}} sobre uno de los bancos de presets del FM1. Solo se escriben los sonidos que difieren.',
    destination: 'Escribir sobre',
    favouritesShort:
      'Favoritos tiene un sonido, así que los demás presets del banco del FM1 se quedan como están.',
    favouritesShort_other:
      'Favoritos tiene {{count, number}} sonidos, así que los demás presets del banco del FM1 se quedan como están.',
    bankTooltip:
      'Elegir un banco del FM1 sobre el que escribir estos sonidos; solo se escriben los que difieren',
    favouritesTooltip:
      'Elegir un banco del FM1 sobre el que escribir los primeros 32 favoritos; solo se escriben los que difieren',
  },
  duplicates: {
    menuItem: 'Buscar sonidos duplicados…',
    title: 'Sonidos duplicados',
    help: 'Sonidos cuyos ajustes de voz coinciden, aunque tengan otro nombre. Los efectos del FM1 no se comparan. Elige un sonido para ir a él y reproducirlo.',
    group: '{{name}} y una copia',
    group_other: '{{name}} y {{count, number}} copias',
    effectsDiffer: 'Sus efectos del FM1 son distintos.',
    settingsDiffer: 'Sus ajustes de preset de Baud Girl son distintos.',
    goTo: 'Ir a {{name}}, sonido {{number}} de {{bank}}',
    none: 'No hay duplicados: cada sonido de tus bancos tiene sus propios ajustes de voz.',
    openFailed:
      'No se pudieron mostrar los sonidos duplicados. Vuelve a cargar la página e inténtalo de nuevo.',
  },
  persistence: {
    retryLoading: 'Reintentar',
    continueSessionOnly: 'Continuar sin guardar',
    retrySaving: 'Reintentar guardado',
    technicalDetails: 'Detalles técnicos',
    sessionOnlyTitle: 'Biblioteca solo para esta sesión',
    sessionOnlyBody:
      'Los datos existentes del navegador no se han modificado. Los cambios de esta sesión se perderán al cerrar la página.',
    saveErrorTitle: 'Los cambios no están guardados de forma segura',
    saveErrorBody:
      'Tus últimos cambios siguen disponibles aquí, pero el navegador no pudo guardarlos. Reinténtalo cuando el almacenamiento esté disponible.',
    loadErrors: {
      unavailable: {
        title: 'El almacenamiento del navegador no está disponible',
        body: 'No se pudo abrir la biblioteca guardada. Sus datos no se han modificado.',
      },
      'read-failed': {
        title: 'No se pudo leer la biblioteca guardada',
        body: 'Puede ser un problema temporal del almacenamiento. No se creó ni guardó ninguna biblioteca de sustitución.',
      },
      incompatible: {
        title: 'La biblioteca guardada es incompatible o está dañada',
        body: 'El registro existente se dejó intacto. Esta versión no puede abrirlo de forma segura.',
      },
      'write-failed': {
        title: 'No se pudo leer la biblioteca guardada',
        body: 'No se creó ni guardó ninguna biblioteca de sustitución.',
      },
    },
  },
  favourites: {
    title: 'Favoritos',
    tabTitle: 'Mostrar tus sonidos favoritos',
    toggle: 'Favorito: {{name}}',
    toggleSlot: 'Favorito: {{slot}} {{name}}',
    addTitle: 'Añadir a Favoritos',
    removeTitle: 'Quitar de Favoritos',
    added: 'Se añadió «{{patch}}» a Favoritos.',
    removed: 'Se quitó «{{patch}}» de Favoritos.',
    alreadyAdded: '«{{patch}}» ya está en Favoritos.',
    addFailed: 'No se pudo añadir el sonido a Favoritos.',
    empty: 'Aún no hay favoritos',
    emptyHelp:
      'Selecciona el corazón de un sonido, o arrastra un sonido a Favoritos, para guardarlo aquí. Puedes enviar Favoritos al FM1 como un banco.',
    sendTitle: 'Enviar los primeros 32 favoritos como banco y elegir el banco de destino en el FM1',
    addFirst: 'Añade un favorito antes de enviar Favoritos',
    initNote:
      'Un banco contiene 32 sonidos, así que al enviar Favoritos la última posición se llena con INIT VOICE.',
    initNote_other:
      'Un banco contiene 32 sonidos, así que al enviar Favoritos las últimas {{count, number}} posiciones se llenan con INIT VOICE.',
    leftOutNote:
      'Un banco contiene 32 sonidos, así que solo se envían los primeros 32 favoritos. El último se queda aquí.',
    leftOutNote_other:
      'Un banco contiene 32 sonidos, así que solo se envían los primeros 32 favoritos. Los últimos {{count, number}} se quedan aquí.',
    sent: 'Se envió Favoritos. Elige su destino en el FM1.',
    sentWithInit:
      'Se envió Favoritos, con INIT VOICE en la última posición. Elige su destino en el FM1.',
    sentWithInit_other:
      'Se envió Favoritos, con INIT VOICE en las últimas {{count, number}} posiciones. Elige su destino en el FM1.',
    sentLeftOut:
      'Se enviaron los primeros 32 favoritos; el último quedó fuera. Elige su destino en el FM1.',
    sentLeftOut_other:
      'Se enviaron los primeros 32 favoritos; los últimos {{count, number}} quedaron fuera. Elige su destino en el FM1.',
    sendUnavailable:
      'No se pudo preparar el envío de Favoritos. Recarga la página e inténtalo de nuevo.',
    savedWithFavourites: 'Se guardó «{{patch}}» en la biblioteca y en su copia de Favoritos.',
    savedWithBanks:
      'Se guardó «{{patch}}» en Favoritos y en las posiciones de banco que lo contenían.',
  },
  toasts: {
    midiPanicSent: 'Pánico MIDI enviado. Se liberaron todas las notas del canal de notas.',
    notifications: 'Acciones completadas',
    dismiss: 'Cerrar notificación',
    undo: 'Deshacer',
    undone: 'Se deshizo el último cambio.',
    redone: 'Se rehízo el cambio.',
    bankImported: 'Sonidos importados en «{{bank}}».',
    bankCreatedFromCatalog: 'Se creó «{{bank}}» a partir de «{{source}}» de {{collection}}.',
    bankCreatedFromFile: 'Se creó «{{bank}}» a partir del archivo «{{file}}».',
    bankCreatedFromFileBank:
      'Se creó «{{bank}}» a partir del banco {{number}} del archivo «{{file}}».',
    bankDeleted: 'Se eliminó «{{bank}}».',
    banksRestored: 'Se restablecieron los cuatro bancos con los sonidos de fábrica.',
    bankDownloadStarted: 'Descargando «{{bank}}».',
    presetFileDownloadStarted: 'Descargando «{{name}}» como archivo de presets de Baud Girl.',
    banksDownloadStarted: 'Descargando todos los bancos.',
    bankUpdated: 'Se actualizó «{{bank}}».',
    demoLoaded: 'Sonidos de demostración cargados en «{{bank}}».',
    patchSaved: 'Se guardó «{{patch}}» en la biblioteca.',
    patchCopied: 'Se copió «{{patch}}» a {{slot}} en «{{bank}}».',
    patchesSwapped: 'Se intercambiaron «{{patch}}» y «{{target}}».',
    patchReplaced: 'Se reemplazó {{slot}} por «{{patch}}».',
    operatorCopied: 'Se copió el operador {{number}}.',
    bankDownloadStartedWithInit:
      'Descargando «{{bank}}», con INIT VOICE en lugar de su preset Virtual Analog u 8-Bit.',
    bankDownloadStartedWithInit_other:
      'Descargando «{{bank}}», con INIT VOICE en lugar de sus {{count, number}} presets Virtual Analog u 8-Bit.',
    banksDownloadStartedWithInit:
      'Descargando todos los bancos, con INIT VOICE en lugar de un preset Virtual Analog u 8-Bit.',
    banksDownloadStartedWithInit_other:
      'Descargando todos los bancos, con INIT VOICE en lugar de {{count, number}} presets Virtual Analog u 8-Bit.',
  },
  meta: {
    title: 'Editor y bibliotecario M-VAVE FM1',
    description:
      'Edita, organiza y transfiere sonidos para el sintetizador M-VAVE FM1, con importación de bancos SysEx DX7.',
  },
  language: 'Idioma',
  common: {
    close: 'Cerrar',
    cancel: 'Cancelar',
    settings: 'Ajustes',
    channel: 'Canal {{number}}',
    loading: 'Cargando el editor…',
    loadingLibrary: 'Cargando la biblioteca',
    editorLoadErrorTitle: 'No se pudo cargar el editor.',
    editorLoadErrorBody:
      'Es posible que la aplicación se haya actualizado o que se haya interrumpido la conexión. Recarga para usar la última versión o vuelve a la biblioteca.',
    reloadApp: 'Recargar la aplicación',
    backToLibrary: 'Volver a la biblioteca',
  },
  libraryViews: {
    label: 'Vista de la biblioteca',
    sounds: 'Sonidos',
    effects: 'Efectos',
    effectsLoadFailed: 'No se pudieron abrir los efectos. Recarga la página e inténtalo de nuevo.',
  },
  root: {
    skipToContent: 'Saltar al contenido principal',
    channelShort: 'Can. {{number}}',
    subtitle: 'editor y bibliotecario',
    intro: 'Edita, organiza y transfiere sonidos del FM1, o <link>importa bancos SysEx DX7</link>.',
    synthAlt: 'Panel frontal del sintetizador M-VAVE FM1',
    unsupportedTitle: 'Navegador no compatible.',
    unsupportedBody:
      'Este bibliotecario necesita un navegador compatible con Web MIDI y SysEx, como Chrome, Edge, Firefox u Opera. Chrome en Android también funciona.',
    localOnly: 'Tus sonidos permanecen en este navegador',
    projectLinks: 'Enlaces del proyecto',
    firmwareLink: 'Firmware del FM1',
    reportIssue: 'Informar de un problema',
    version: 'Versión {{version}}',
    disclaimer:
      'Proyecto independiente de código abierto. No está afiliado ni respaldado por M-VAVE o Yamaha.',
  },
  settings: {
    description: 'Elige el idioma de la interfaz, los puertos MIDI y los canales.',
    output: 'Salida',
    inputMonitor: 'Entrada de monitorización',
    firmware: 'Firmware del FM1',
    firmwareChecking: 'Comprobando…',
    firmwareUnidentified: 'Sin identificar',
    firmwareMvave: 'M-VAVE {{identity}}',
    firmwareFm1Va: 'Baud Girl {{identity}}',
    firmwareOfficialOpen: 'M-VAVE Open {{identity}}',
    firmwareFelucca: 'Felucca {{identity}}',
    firmwareFeluccaOrSloop: 'Felucca o SLOOP {{identity}}',
    firmwareNeedsInput:
      'Elige el FM1 como entrada de monitorización para que el editor pueda preguntarle qué firmware usa.',
    noteChannel: 'Canal de notas',
    fxChannel: 'Canal de efectos',
    defaultChannel: 'Valor predeterminado del FM1: canal 2',
    noDevice: 'No se encontró ningún dispositivo',
    noDeviceSelected: 'Ningún dispositivo seleccionado',
  },
  help: {
    open: 'Ayuda: cómo usar el editor y bibliotecario FM1',
    title: 'Te damos la bienvenida al editor y bibliotecario FM1',
    guideTitle: 'Guía',
    close: 'Cerrar la ayuda',
    lead: 'Edita y organiza sonidos para tu M-VAVE FM1, desde el navegador.',
    quickSteps: {
      connect: 'Conecta el FM1 y activa MIDI en línea.',
      play: 'Haz clic en un sonido para escucharlo y doble clic para editarlo.',
      send: '«Enviar al FM1» pasa un banco completo al sintetizador.',
    },
    savedInBrowser:
      'Tus bancos se guardan en este navegador. Haz copias de seguridad desde Acciones de la biblioteca.',
    unsupportedTitle: 'Este navegador no puede conectarse al FM1.',
    unsupportedBody:
      'Abre esta página en Chrome, Edge o Firefox en un ordenador, o en Chrome en Android.',
    stillWorks: 'Aun así, puedes explorar y editar sonidos aquí.',
    fullGuide: 'Guía completa',
    start: 'Empezar a editar',
    done: 'Cerrar',
    stepsTitle: 'Primeros pasos',
    sections: 'Secciones de la guía',
    shortcutsTitle: 'Atajos de teclado',
    shortcuts: {
      banks: 'Bancos de sonidos',
      editor: 'Editor de voces',
      search: 'Ir a la búsqueda',
      clearSearch: 'Borrar la búsqueda',
      openSlot: 'Abrir la ranura encendida',
    },
    steps: {
      connectTitle: 'Conecta tu FM1',
      connectBody:
        'Conecta el FM1 y activa MIDI en línea. La primera vez, el navegador pide permiso para usar MIDI.',
      playTitle: 'Escucha y edita',
      playBody:
        'Haz clic en un sonido para escucharlo en el FM1. Haz doble clic para abrir el editor de voces y guarda para conservar los cambios.',
      sendTitle: 'Enviar al FM1',
      sendBody: 'Envía un banco completo desde su cabecera y elige dónde se guarda en el FM1.',
      backupTitle: 'Guarda una copia de seguridad',
      backupBody:
        'El FM1 no puede devolver sus bancos, así que los de aquí son la única copia. Descarga una copia de seguridad desde Acciones de la biblioteca.',
    },
    firmwareTitle: 'Baud Girl (FM-1+VA)',
    firmwareBody:
      'Lee presets del FM1 y vuelve a escribir sonidos desde Acciones de la biblioteca. Los sonidos Virtual Analog se abren en su propio editor.',
  },

  colorway: {
    legend: 'Acabado de color del FM1',
    option: 'Acabado {{colour}} del FM1',
    black: 'Negro',
    purple: 'Morado',
    orange: 'Naranja',
    blackGreen: 'Negro-verde',
    coolGray: 'Gris frío',
    whiteBlue: 'Blanco-azul',
  },
  editor: {
    selectedVoiceNotice:
      'En la V16, este sonido va a la Voice seleccionada en la pantalla del FM1. Los cambios solo suenan en directo en el canal 1 o All; para oírlo, selecciona la Voice del canal {{channel}}.',
    effectsSharedNotice:
      'En V16 las ocho Voices comparten los efectos del FM1; no pertenecen a este patch. Vuelve a la biblioteca y abre Efectos para cambiarlos o recuperarlos. Pulsa SAVE y elige Globe en el FM1 para conservarlos.',
    back: 'Volver a los bancos',
    editName: 'Editar nombre del sonido',
    patchName: 'Nombre del sonido',
    unsaved: 'Cambios sin guardar',
    presets: 'Preajustes de voz',
    presetsShort: 'Preajustes',
    presetOptions: {
      'soft-pad': {
        name: 'Pad suave',
        description: 'Envolventes lentas, chorus y sala.',
      },
      'bright-pluck': {
        name: 'Punteo brillante',
        description: 'Decaimiento nítido, sala corta y eco.',
      },
      'steady-organ': {
        name: 'Órgano estable',
        description: 'Sustain uniforme con chorus y phaser.',
      },
      'gentle-motion': {
        name: 'Movimiento suave',
        description: 'LFO retardado, chorus y sala suave.',
      },
      'warm-filter': {
        name: 'Filtro cálido',
        description: 'Filtro paso bajo y sala pequeña.',
      },
      'wide-space': {
        name: 'Espacio amplio',
        description: 'Chorus amplio y reverberación de sala.',
      },
    },
    undo: 'Deshacer',
    redo: 'Rehacer',
    save: 'Guardar en la biblioteca',
    moreSave: 'Más opciones de guardado',
    resend: 'Reenviar al FM1',
    resendHelp: 'Volver a enviar los ajustes actuales del editor.',
    revert: 'Restaurar lo guardado',
    revertHelp: 'Descartar los cambios y restaurar el sonido guardado.',
    compare: 'Comparar con lo guardado',
    showNotice: 'Mostrar nota sobre el FM1',
    compareShort: 'Comparar',
    stopComparing: 'Dejar de comparar y volver a tus cambios',
    comparingTitle: 'Sonando el sonido guardado',
    comparingBody: 'La edición está en pausa. Pulsa Esc o Comparar para volver a tus cambios.',
    configuration: 'Configuración del sonido',
    global: 'Global',
    effects: 'Efectos',
    pitchEnvelope: 'Envolvente de tono',
    pitchEnvelopePresets: 'Presets',
    pitchEnvelopePresetPlaceholder: 'Elegir…',
    pitchEnvelopePresetOptions: {
      flat: 'Plana',
      blipUp: 'Pico de ataque',
      attackDrop: 'Caída de ataque',
      scoop: 'Subida',
      releaseFall: 'Caída al soltar',
    },
    effectPreset: 'Preset',
    effectPresetPlaceholder: 'Elegir…',
    effectPresetOptions: {
      warm: 'Cálido',
      muffled: 'Apagado',
      telephone: 'Teléfono',
      thin: 'Fino',
      resonant: 'Resonante',
      lightDrive: 'Saturación ligera',
      warmDrive: 'Saturación cálida',
      crunch: 'Crujiente',
      fuzz: 'Fuzz',
      smallRoom: 'Sala pequeña',
      largeRoom: 'Sala grande',
      smallHall: 'Salón pequeño',
      largeHall: 'Gran salón',
      plate: 'Placa',
      slapback: 'Slapback',
      quickDelay: 'Retardo corto',
      quickRepeats: 'Repeticiones rápidas',
      echo: 'Eco',
      subtleChorus: 'Coro sutil',
      ensemble: 'Conjunto',
      chorusWash: 'Coro envolvente',
      shimmer: 'Brillo',
      gentlePhase: 'Fáser suave',
      slowSweep: 'Barrido lento',
      deepPhase: 'Fáser profundo',
      fastSwirl: 'Remolino rápido',
      sampler: 'Sampler',
      lofi: 'Lo-fi',
      eightBit: '8 bits',
      crushed: 'Triturado',
    },
    lfoGlobal: 'LFO y global',
    oscillatorSync: 'Sincronización del oscilador',
    lfoSync: 'Sincronización LFO',
    lfoWave: 'Forma de onda LFO',
    lfoSpeed: 'Velocidad LFO',
    lfoDelay: 'Retardo LFO',
    pitchModDepth: 'Prof. modulación de tono',
    ampModDepth: 'Prof. modulación de amplitud',
    pitchModSensitivity: 'Sens. modulación de tono',
    transpose: 'Transposición',
    operator: 'Operador {{number}}',
    operators: 'Operadores',
    fmOperators: 'Operadores FM',
    minimisePanel: 'Minimizar {{panel}}',
    expandPanel: 'Expandir {{panel}}',
    outputLevel: 'Nivel de salida',
    amplitudeEnvelope: 'Envolvente de amplitud',
    algorithm: 'Algoritmo',
    feedback: 'Realimentación',
    carrier: 'Portador',
    carrierShort: 'Por',
    modulator: 'Modulador',
    modulatorShort: 'Mod',
    output: 'Salida',
    rate: 'Velocidad {{number}}',
    level: 'Nivel {{number}}',
    unsavedTitle: 'Cambios sin guardar',
    keepEditing: 'Seguir editando',
    discard: 'Descartar cambios',
    saveAndReturn: 'Guardar y volver',
    initVoice: 'Inicializar',
    initVoiceHelp: 'Onda senoidal simple. Efectos apagados.',
    randomise: 'Aleatorizar',
    randomiseHelp: 'Voz nueva. Conserva nombre y efectos.',
  },
  midi: {
    activityTitle:
      'Actividad MIDI: IN se enciende cuando llega un mensaje de la entrada MIDI y OUT cuando el editor envía uno.',
    feluccaBadgeLabel: 'Firmware Felucca de Hügelton Instruments, {{release}}',
    feluccaBadgeTitle:
      'El FM1 usa el firmware Felucca de Hügelton Instruments, {{release}}. Toca tus notas, pero ignora los sonidos DX7, los bancos y los controles de efectos.',
    feluccaOrSloopBadgeLabel: 'Firmware Felucca o SLOOP, {{release}}',
    feluccaOrSloopBadgeTitle:
      'El FM1 usa Felucca de Hügelton Instruments, o SLOOP, basado en él. Ambos informan {{release}}, tocan tus notas, pero ignoran los sonidos DX7, los bancos y los controles de efectos.',
    fm1VaBadgeLabel: 'Firmware de Baud Girl, {{release}}',
    fm1VaBadgeTitle:
      'El FM1 usa el firmware de Baud Girl (FM-1+VA), {{release}}. Los sonidos que tocas le llegan como cambios sin guardar, así que nunca sobrescriben un preset.',
    mvaveBadgeLabel: 'Firmware de M-VAVE, {{release}}',
    mvaveBadgeTitle:
      'El FM1 usa el firmware original de M-VAVE, {{release}}. Los sonidos que tocas van a su búfer de edición.',
    mvaveV16BadgeTitle:
      'El FM1 usa el firmware original de M-VAVE, {{release}}: ocho Voices, cada una en su propio canal, con un único grupo de FX compartido. Los sonidos que tocas van a su búfer de edición.',
    officialOpenBadgeLabel: 'Firmware Open de M-VAVE, {{release}}',
    officialOpenBadgeTitle:
      'El FM1 usa el firmware Open de M-VAVE, {{release}}, una groovebox de ocho pistas. Un sonido en el que haces clic o que editas va a la pista del canal de notas cuando esa pista usa DX7. Ignora los bancos DX7, y los controles de efectos no envían nada, porque los tomaría como cambios en sus pistas.',
    panic: 'Pánico MIDI',
    panicHelp:
      'Pánico MIDI: envía un note-off para cada nota del canal de notas y detiene las notas colgadas',
    panicUnavailable: 'Pánico MIDI: {{reason}}',
    online: 'MIDI en línea',
    offline: 'MIDI sin conexión',
    offlineHint: 'Actívalo para llegar al FM1',
    chooseOutput: 'Elige una salida MIDI',
    switchOnFirst: 'Activa primero el MIDI',
    closeSysexWarning: 'Cerrar advertencia de SysEx',
    connecting: 'Conectando…',
    errors: {
      insecureContext:
        'Web MIDI necesita una conexión segura. Abre el editor mediante HTTPS o localhost.',
      unsupportedBrowser:
        'Este navegador no es compatible con Web MIDI. Usa un navegador como Chrome, Edge o Firefox.',
      permissionDenied:
        'Se bloqueó el acceso MIDI. Permite el acceso MIDI y SysEx para este sitio y vuelve a conectar. En Firefox, acepta el complemento de permisos del sitio cuando se ofrezca.',
      enableFailed:
        'No se pudo iniciar MIDI. Comprueba la conexión del dispositivo y vuelve a intentarlo.',
      disconnectFailed: 'No se pudo desconectar MIDI. Vuelve a intentarlo.',
    },
    reconnectForSysex: 'Reconectar MIDI con SysEx',
    sysexRecovery:
      'No se ha enviado ningún dato del banco. Vuelve a conectar MIDI y permite el acceso SysEx antes de intentarlo de nuevo.',
    sysexWarningTitle: 'El acceso SysEx no está disponible.',
    sysexWarningBody:
      'No se pueden enviar bancos ni patches. Desconecta MIDI, vuelve a conectarlo y permite el acceso SysEx cuando se solicite.',
    log: 'Registro MIDI',
    closeLog: 'Cerrar el registro MIDI',
    logOpenFailed: 'No se pudo abrir el registro MIDI. Recarga la página e inténtalo de nuevo.',
    entries: 'Entradas recientes del registro MIDI',
    hideData: 'Ocultar datos',
    viewData: 'Ver datos',
    bytes: '{{count, number}} bytes',
    completeSysex: 'Mensaje SysEx completo',
    copied: 'Copiado',
    copyHex: 'Copiar hexadecimal',
    copyUnavailable: 'Copia no disponible',
    downloadLog: 'Descargar registro',
  },
  banks: {
    addBankHelp: 'Asigna un nombre al banco y, si quieres, una descripción.',
    addBankSourceHelp: '¿De dónde deben salir los sonidos del banco nuevo?',
    addBankNamedTitle: 'Añadir banco: «{{name}}»',
    addBankCatalogHelp: 'Elige una colección y después el banco con el que empezar.',
    addBankFileHelp: 'Elige un archivo SysEx de banco DX7 estándar de 32 voces.',
    addBankFileNoteFormat: 'Un banco DX7 estándar de 32 voces en un archivo .syx',
    addBankFileNoteSeveral: 'Si el archivo reúne varios bancos, elegirás a continuación cuál usar',
    addBankFileNotePrivacy: 'El archivo se lee en tu navegador y no va a ningún otro sitio',
    addBankFileBankHelp: 'Elige cuál de los bancos del archivo usar.',
    catalogSourceHint:
      'Bancos de fábrica de Yamaha, los preajustes propios del FM1 y colecciones de otros autores.',
    uploadSourceHint: 'Un banco SysEx DX7 estándar de 32 voces desde tu ordenador.',
    collections: 'Colecciones',
    banksInCollection: 'Bancos de {{collection}}',
    collectionBanks: '{{count, number}} banco',
    collectionBanks_other: '{{count, number}} bancos',
    wizardBack: 'Atrás',
    wizardNext: 'Siguiente',
    catalogSource: 'Elegir del catálogo de bancos DX7',
    creatingBank: 'Creando…',
    soundSource: 'Elige una fuente de sonido',
    uploadSource: 'Subir tu propio banco',
    empty: 'Vacío',
    importing: 'Importando…',
    restoring: 'Restableciendo…',
    catalogFactory: 'Sonidos de fábrica',
    catalogFm1Factory: 'Preajustes de fábrica del FM-1',
    import: 'Importar banco DX7…',
    moreActions: 'Acciones de la biblioteca',
    bankMenu: 'Acciones para {{bank}}',
    patchMenu: 'Acciones para {{slot}} {{name}}',
    bankInformation: 'Información del banco',
    bankInformationMenu: 'Información del banco…',
    bankInformationHelp: 'Edita el título y la descripción opcional de este banco.',
    download: 'Descargar este banco',
    downloadAll: 'Descargar bancos SysEx (.zip)',
    restoreAll: 'Restablecer sonidos de fábrica…',
    sending: 'Enviando…',
    send: 'Enviar al FM1',
    bank: 'Banco {{bank}}',
    addBank: 'Añadir banco…',
    addBankTitle: 'Añadir banco',
    bankName: 'Nombre del banco',
    bankNameRequired: 'Introduce un nombre para el banco nuevo.',
    chooseSysexFile: 'Elegir un archivo SysEx DX7',
    createBank: 'Crear banco',
    addBankFailed: 'No se pudo crear el banco.',
    destination: 'Banco de destino',
    importFile: 'Importar archivo de banco DX7',
    downloadTitle: 'Descargar «{{bank}}» como SysEx',
    importFirst: 'Importa primero el banco {{bank}}',
    deleteBank: 'Eliminar banco',
    deleteBankMenu: 'Eliminar banco…',
    deleteBankConfirm: '¿Eliminar «{{name}}» y todos sus sonidos? Puedes deshacer esta acción.',
    sendTitle: 'Enviar las 32 voces y elegir el banco de destino en el FM1',
    sentStatus: 'Se envió «{{bank}}». Elige su destino en el FM1.',
    notSent: 'No se envió el banco. Abre el registro MIDI y vuelve a intentarlo.',
    importFailed: 'Error de importación.',
    restoreFailed:
      'No se pudieron restablecer los bancos con los sonidos de fábrica. Vuelve a intentarlo.',
    bankUnavailable: 'Ese banco ya no está disponible. Cierra este diálogo y vuelve a intentarlo.',
    catalogUnavailable:
      'No se pudo descargar ese banco de sonidos. Comprueba tu conexión y vuelve a intentarlo.',
    fileErrors: {
      size: 'Este archivo tiene {{bytes, number}} bytes y no contiene ningún banco DX7 completo. Un archivo de banco tiene {{expected, number}} bytes, o un múltiplo de eso si reúne varios bancos.',
      tooLarge:
        'Este archivo es demasiado grande. Un archivo de bancos puede reunir hasta {{count, number}} bancos DX7.',
      format: 'Este archivo no es un banco Yamaha DX7 de 32 voces.',
      damaged: 'Este archivo parece dañado. Intenta descargarlo de nuevo.',
      voiceFormat:
        'Este archivo no es un sonido DX7. Elige un archivo .syx que contenga un solo sonido.',
      voiceGotBank:
        'Este archivo es un banco DX7 de 32 voces. Para cargarlo, elige «Importar banco DX7…» en el menú del banco.',
    },
    exportFailed: 'Error de exportación.',
    bulkExportFailed: 'Error de exportación masiva.',
    gridTitle: 'Bancos de sonidos',
    gridDescription: 'Importa, edita y organiza cada banco antes de transferirlo al FM1.',
    search: 'Buscar',
    noMatches: 'Ningún sonido coincide con la búsqueda',
    searchResults: 'Resultados de búsqueda: «{{search}}»',
    sendFromSearch: 'Elige un banco para enviarlo al FM1',
    bankEmpty: 'Este banco está vacío',
    emptyHelp:
      'Carga el banco de demostración o importa tu propio banco SysEx DX7 estándar de 32 voces.',
    loadDemo: 'Cargar banco de demostración',
    editSelected: 'Editar',
    slotTitle: 'Haz clic para tocar {{name}} en el FM1; doble clic para editarlo',
    sendOffline:
      'MIDI está sin conexión, así que «Enviar al FM1» ofrece primero ponerlo en línea. Mientras tanto, un clic en un sonido solo lo selecciona.',
    sendNoOutput:
      'No hay ninguna salida MIDI elegida, así que «Enviar al FM1» pide una primero. Mientras tanto, un clic en un sonido solo lo selecciona.',
    sendUnidentified:
      'Firmware sin identificar: el FM1 recibe un banco DX7 sencillo, y los sonidos como cambios sin guardar.',
    slotOfflineTitle:
      'MIDI está sin conexión, así que un clic solo selecciona {{name}}; doble clic para editarlo',
    slotEditBufferTitle:
      'Haz clic para escuchar {{name}} a través del búfer de edición del FM1; doble clic para editar',
    slotEditTitle: 'Haz doble clic o pulsa Intro para editar {{name}}',
    sendPatch: 'Enviar {{slot}} {{name}} al FM1',
    auditioning: 'Probando',
    reorder: 'Reordenar {{name}}',
    reorderPatch: 'Reordenar {{slot}} {{name}}',
    moveEarlier: 'Mover antes',
    menuOrder: 'Orden',
    menuTransfer: 'Transferir',
    moveLater: 'Mover después',
    reorderTitle:
      'Arrastra para reordenar, o sobre un banco para copiar el sonido allí; usa las flechas para reordenar con el control enfocado',
    copySelected: 'Copiar a…',
    copyDialogTitle: 'Copiar {{name}}',
    copyTargetBank: 'Banco',
    copyTargetSlot: 'Ranura',
    copyReplaces: 'Esto reemplaza «{{name}}» en {{slot}}. Puedes deshacer esta acción.',
    copyAction: 'Reemplazar {{slot}}',
    copyAndEditAction: 'Reemplazar {{slot}} y editar',
    copyToEditHint: 'Para editar este sonido, cópialo en uno de tus bancos.',
    copyFailed: 'No se pudo copiar el sonido.',
    swapAction: 'Intercambiar con {{slot}}',
    swapHint: 'Para conservar «{{name}}», intercámbialos: pasará a {{slot}}.',
    swapFailed: 'No se pudieron intercambiar los sonidos.',
    addBankOpenFailed:
      'No se pudieron abrir las opciones del nuevo banco. Recarga la página e inténtalo de nuevo.',
    copyOpenFailed:
      'No se pudieron abrir las opciones de copia. Recarga la página e inténtalo de nuevo.',
    importPatchFile: 'Importar sonido…',
    receiveFromFm1: 'Recibir del FM1…',
    downloadPatchFile: 'Descargar sonido',
    bankFileUnavailable:
      'No se pudieron leer los archivos de banco. Recarga la página e inténtalo de nuevo.',
    patchFileUnavailable:
      'No se pudieron abrir los archivos de sonido. Recarga la página e inténtalo de nuevo.',
    receivePatchUnavailable:
      'No se pudieron recibir sonidos. Recarga la página e inténtalo de nuevo.',
    presetFileInexact:
      '«{{name}}» no se puede guardar exactamente como archivo de presets de Baud Girl, así que no se ha descargado.',
    everywhere: {
      workspace: 'Tus bancos de sonidos',
      savedBanks: 'Bancos guardados',
      catalog: 'Otros bancos de sonidos DX7',
      play: 'Escuchar {{name}} de {{origin}}',
      playTitle:
        'Haz clic para escuchar {{name}} a través del búfer de edición del FM1; doble clic para copiarlo y editarlo',
      copy: 'Copiar {{name}} a un banco',
      truncated:
        'Se muestran los primeros {{shown}} de {{total}} resultados. Escribe más para acotar la búsqueda.',
      loading: 'Buscando en otros bancos de sonidos DX7…',
      loadFailed:
        'No se pudo buscar en los bancos guardados ni en otros bancos de sonidos DX7. Recarga la página e inténtalo de nuevo.',
      playFailed: 'No se pudo reproducir el sonido.',
      copiesHidden: 'No se muestran los sonidos duplicados.',
    },
    slotVirtualAnalogTitle:
      'Haz clic para seleccionar {{name}} en el FM1, que toca el preset Virtual Analog guardado ahí',
    slotVirtualAnalogAddedTitle:
      '{{name}} es un preset Virtual Analog, que solo suena desde los bancos A a D del FM1',
    slotEightBitTitle:
      'Haz clic para seleccionar {{name}} en el FM1, que toca el preset 8-Bit guardado ahí',
    slotEightBitAddedTitle:
      '{{name}} es un preset 8-Bit, que solo suena desde los bancos A a D del FM1',
    virtualAnalogPatch: 'Preset Virtual Analog',
    eightBitPatch: 'Preset 8-Bit',
    sentStatusWithInit:
      'Se envió el banco {{bank}}, con INIT VOICE en lugar de su preset Virtual Analog u 8-Bit. Elige su destino en el FM1.',
    sentStatusWithInit_other:
      'Se envió el banco {{bank}}, con INIT VOICE en lugar de sus {{count, number}} presets Virtual Analog u 8-Bit. Elige su destino en el FM1.',
    virtualAnalogInitNote:
      'Un banco DX7 no tiene sitio para un preset Virtual Analog u 8-Bit, así que el de este banco se envía como INIT VOICE.',
    virtualAnalogInitNote_other:
      'Un banco DX7 no tiene sitio para presets Virtual Analog u 8-Bit, así que los {{count, number}} de este banco se envían como INIT VOICE.',
    fmPatch: 'Sonido FM',
    fmTag: 'FM',
    virtualAnalogTag: 'VA',
    eightBitTag: '8B',
    engineTitle: '{{engine}}\n{{action}}',
  },
  namedBanks: {
    saving: 'Guardando…',
    title: 'Mis bancos guardados',
    intro: 'Elige un banco guardado para cargarlo en «{{bank}}».',
    saveCurrent: 'Guardar «{{bank}}»',
    snapshotHelp: 'Crea una copia independiente de los 32 sonidos y sus efectos FM1.',
    name: 'Nombre del banco',
    namePlaceholder: 'p. ej., Concierto – sábado',
    description: 'Descripción (opcional)',
    descriptionPlaceholder: 'Notas sobre este banco',
    save: 'Guardar banco',
    saveMenu: 'Guardar banco…',
    loadBank: 'Cargar banco…',
    editDetails: 'Editar detalles',
    update: 'Actualizar detalles',
    savedBanks: 'Bancos guardados',
    count: '{{count, number}} banco guardado',
    count_other: '{{count, number}} bancos guardados',
    search: 'Buscar bancos guardados',
    loading: 'Cargando bancos guardados…',
    empty: 'Aún no hay bancos guardados. Guarda el banco seleccionado para crear uno.',
    noMatches: 'Ningún banco guardado coincide con la búsqueda.',
    load: 'Cargar',
    updatedAt: 'Actualizado el {{date}}',
    rename: 'Editar {{name}}',
    download: 'Descargar {{name}} como SysEx',
    downloadAction: 'Descargar archivo SysEx',
    duplicate: 'Duplicar {{name}}',
    duplicateAction: 'Duplicar banco',
    delete: 'Eliminar {{name}}',
    deleteAction: 'Eliminar banco',
    deleteConfirm: '¿Eliminar permanentemente “{{name}}” de este navegador?',
    loadConfirm: '¿Sustituir los 32 sonidos de “{{bank}}” por “{{name}}”?',
    replaceAction: 'Sustituir sonidos',
    operationFailed: 'La operación del banco guardado ha fallado.',
    openFailed:
      'No se pudieron abrir los bancos guardados. Recarga la página e inténtalo de nuevo.',
    loadFailed: 'No se pudieron cargar los bancos guardados del almacenamiento del navegador.',
    damagedBanks:
      'Algunos bancos guardados no se pudieron leer y se han ocultado. Siguen intactos en el almacenamiento del navegador.',
    saved: '“{{name}}” guardado.',
    updated: '“{{name}}” actualizado.',
    downloaded: '“{{name}}” descargado.',
    copied: '“{{name}}” creado.',
    deleted: '“{{name}}” eliminado.',
    loaded: '“{{name}}” cargado en “{{bank}}”.',
    downloadedWithInit:
      'Se descargó «{{name}}», con INIT VOICE en lugar de su preset Virtual Analog u 8-Bit.',
    downloadedWithInit_other:
      'Se descargó «{{name}}», con INIT VOICE en lugar de sus {{count, number}} presets Virtual Analog u 8-Bit.',
  },
  backup: {
    fxPresets: 'Presets de FX',
    notInOlderBackup: 'No incluido (copia anterior)',
    menuOtherFiles: 'Otros archivos',
    menuHeading: 'Copia de seguridad',
    download: 'Descargar copia de seguridad',
    restore: 'Restaurar desde una copia…',
    lastBackup: 'Última copia: {{date}}',
    downloaded: 'Descargando una copia de seguridad de tus bancos y bancos guardados.',
    downloadedWithoutSavedBanks:
      'Descargando una copia de tus bancos. No se pudieron leer los bancos guardados, así que no están incluidos.',
    downloadedWithoutDamaged:
      'Descargando una copia de seguridad. Algunos bancos guardados no se pudieron leer, así que no están incluidos.',
    downloadedWithoutDamagedFx:
      'Descargando una copia. Algunos presets de FX no se pudieron leer y no se incluyen.',
    unavailable:
      'No se pudieron abrir las copias de seguridad. Recarga la página y vuelve a intentarlo.',
    unavailableUnsaved:
      'No se pudo preparar la copia. Mantén esta pestaña abierta, porque tus últimos cambios no están guardados, y vuelve a intentarlo.',
    restoreTitle: 'Restaurar desde una copia de seguridad',
    restoreIntro:
      'Elige un archivo creado con Descargar copia de seguridad. No cambia nada hasta que lo confirmes.',
    chooseFile: 'Elegir un archivo de copia',
    reading: 'Leyendo la copia…',
    backedUpAt: 'Fecha de la copia',
    workspaceBanks: 'Bancos',
    patches: 'Sonidos',
    savedBanks: 'Bancos guardados',
    toAdd: 'Se añadirán',
    alreadyHere: 'Ya están, se conservan',
    unreadable: 'No se pudieron leer',
    workspaceEffect:
      'Tus bancos y todos sus sonidos se sustituyen por los de la copia. Deshacer en la notificación posterior los recupera.',
    savedBanksEffect:
      'Los bancos guardados solo se añaden. Uno que ya esté en este navegador se conserva tal cual, y Deshacer no quita los añadidos.',
    fxPresetsEffect:
      'Los presets de FX se combinan. Los registros iguales se conservan, los conflictos de ID crean copias nuevas y nunca se sobrescriben los presets locales.',
    restoreAction: 'Restaurar copia',
    restoring: 'Restaurando…',
    restored: 'Se restauró la copia de seguridad del {{date}}.',
    errors: {
      format:
        'Este archivo no es una copia de seguridad de esta aplicación. Elige un archivo .json creado con Descargar copia de seguridad.',
      newer:
        'Esta copia se creó con una versión más reciente de la aplicación. Recarga la página para actualizarla y vuelve a intentarlo.',
      damaged: 'Esta copia está dañada y no se puede restaurar. Prueba con otro archivo de copia.',
      size: 'Este archivo es demasiado grande para ser una copia de esta aplicación.',
      read: 'No se pudo leer el archivo. Vuelve a elegirlo.',
      savedBanksFailed:
        'El almacenamiento del navegador no pudo guardar los bancos de esta copia, así que tu biblioteca no cambió. Vuelve a intentarlo.',
      restoreFailed:
        'El almacenamiento del navegador no pudo terminar la restauración. El espacio de trabajo no se sustituyó; se conservaron los bancos o presets de FX ya añadidos. Vuelve a intentarlo.',
    },
  },
  officialOpenTracks: {
    sent: 'Se envió “{{name}}” a la pista {{track}}. Guarda el proyecto en el FM1 para conservarlo.',
    noTrack:
      'El canal de notas {{channel}} no llega a ninguna pista, así que el sonido no se envió. Open toca las pistas 1 a 7 en los canales 1 a 7 y la pista 8 en el canal 10: elige uno de ellos como canal de notas en los ajustes MIDI.',
    notDx7:
      'La pista {{track}} usa {{engine}}, que no admite un sonido, así que no se envió nada. Pon la pista {{track}} en DX7 en el FM1, o elige el canal de notas de una pista que use DX7.',
    unread:
      'El FM1 no indicó qué motor usa la pista {{track}}, así que el sonido no se envió. Comprueba que el FM1 esté conectado y vuelve a intentarlo.',
  },
} as const

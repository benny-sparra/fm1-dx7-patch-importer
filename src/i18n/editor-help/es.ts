export default {
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
  },
  effectParameterHelp: {
    'Filter Type':
      'Elige qué conserva el filtro: el paso bajo conserva los graves, el paso alto los agudos y el paso banda una banda media.',
    'Filter Cutoff':
      'Fija la frecuencia a partir de la que actúa el filtro. Su efecto audible depende del tipo de filtro elegido.',
    'Filter Resonance':
      'Realza las frecuencias cercanas al corte. Los valores altos suenan más agudos y marcados.',
    'Reverb Space': 'Elige el carácter del espacio simulado: sala pequeña, sala o placa brillante.',
    'Reverb Decay': 'Ajusta cuánto dura la cola de la reverberación.',
    'Reverb Mix':
      'Equilibra el sonido seco y la reverberación. Al 0 % solo oyes el sonido original.',
    'Delay Decay': 'Ajusta cuánto tiempo continúan las repeticiones del eco antes de desvanecerse.',
    'Delay Rate':
      'Ajusta el tiempo entre ecos. Los valores más altos cambian la separación de las repeticiones.',
    'Delay Mix': 'Equilibra el sonido seco y los ecos. Al 0 % solo oyes el sonido original.',
    'Distortion Gain':
      'Controla con qué fuerza la señal excita la distorsión. Los valores altos añaden más saturación y armónicos.',
    'Distortion Tone': 'Ajusta el brillo del sonido distorsionado.',
    'Distortion Level':
      'Ajusta el volumen de salida tras la distorsión, útil para igualar el volumen sin el efecto.',
    'Chorus Frequency': 'Ajusta la velocidad de ciclo del movimiento del coro.',
    'Chorus Depth':
      'Ajusta cuánto recorre el movimiento de tono del coro. Los valores altos suenan más amplios y evidentes.',
    'Chorus Mix': 'Equilibra el sonido seco y la señal con coro.',
    'Phaser Frequency': 'Ajusta la velocidad de ciclo del barrido del fáser.',
    'Phaser Depth': 'Ajusta el rango y la intensidad del barrido del fáser.',
    'Phaser Mix': 'Equilibra el sonido seco y la señal con fáser.',
  },
} as const

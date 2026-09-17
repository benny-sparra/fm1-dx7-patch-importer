export default {
  title: 'Secuenciador',
  back: 'Volver a la biblioteca',
  intro:
    'Crea aquí un patrón y tócalo en el FM1 mientras el aparato graba. El FM1 no ofrece ninguna orden para su secuenciador, así que preparar la grabación, elegir el patrón y guardarlo se hacen en el aparato.',
  pattern: {
    heading: 'Patrón',
    stepLength: 'Número de pasos',
    stepLengthHint: 'Ajusta este valor al Step que muestra la página del secuenciador del FM1.',
    step: 'Paso {{number}}',
    rest: 'Silencio',
    note: 'Nota',
    pitch: 'Altura',
    velocity: 'Velocidad',
    makeRest: 'Convertir el paso {{number}} en silencio',
    makeNote: 'Convertir el paso {{number}} en nota',
    clear: 'Vaciar el patrón',
    cleared: 'Se ha vaciado el patrón.',
  },
  listen: {
    heading: 'Escuchar el FM1',
    start: 'Escuchar el FM1',
    stop: 'Dejar de escuchar',
    hint: 'Inicia la reproducción en el FM1. El patrón aparece cuando dos vueltas completas coinciden.',
    waiting: 'Escuchando. Todavía no se ha oído nada.',
    heard: 'Se ha oído un bucle de {{count}} pasos a lo largo de {{passes}} vueltas.',
    use: 'Pasar lo escuchado al editor',
    used: 'El patrón escuchado ya está en el editor.',
    rotation:
      'La reproducción no revela cuál es el paso 1 para el FM1, así que lo escuchado puede empezar en un paso distinto al del patrón de arriba.',
    match: 'Lo que reproduce el FM1 coincide con el patrón enviado.',
    mismatch:
      'Lo que reproduce el FM1 no es el patrón enviado. Revisa el patrón en el aparato y vuelve a enviarlo.',
    problem: {
      tooFewNotes: 'Todavía no se ha oído nada. Inicia la reproducción en el FM1.',
      noRepeat:
        'Todavía no se ha oído ninguna repetición. Deja que el patrón dé al menos dos vueltas.',
      inconsistentPasses:
        'Las vueltas no coinciden. No toques las teclas del FM1 mientras se lee el patrón.',
      loopLengthUnresolved:
        'Varios números de pasos encajan con lo escuchado. Ajusta el número de pasos al valor del FM1.',
      offGrid:
        'Las notas no encajan en ese número de pasos. Comprueba el valor Step que muestra el FM1.',
    },
  },
  send: {
    button: 'Enviar al FM1',
    heading: 'Enviar este patrón al FM1',
    arm: 'Haz esto primero en el FM1, porque el editor no puede:',
    armPattern: 'Elige el patrón que quieres reemplazar.',
    armStepLength: 'Ajusta Step a {{steps}}.',
    armTranspose: 'Ajusta Transpose a 0.',
    armRecord: 'Pulsa REC. La luz del primer paso parpadea.',
    replaces:
      'El envío reemplaza todo el contenido de ese patrón, desde el paso 1 hasta el final del bucle. No se puede deshacer desde aquí.',
    keys: 'No toques las teclas del FM1 hasta que se haya enviado el patrón.',
    confirm: 'El FM1 está grabando; enviar',
    cancel: 'Cancelar',
    sending: 'Enviando el paso {{step}} de {{steps}}.',
    stop: 'Detener el envío',
    sent: 'Se han enviado {{steps}} de {{total}} pasos. El FM1 no confirma nada, así que escúchalo para comprobar el resultado.',
    unsaved: 'El patrón solo está en la memoria del aparato. Usa SAVE en el FM1 para conservarlo.',
    cancelled:
      'Se ha detenido tras {{steps}} de {{total}} pasos. El patrón del FM1 es en parte nuevo y en parte antiguo.',
    interrupted:
      'La conexión MIDI ha fallado tras {{steps}} de {{total}} pasos. El patrón del FM1 es en parte nuevo y en parte antiguo.',
    noOutput: 'Elige una salida MIDI antes de enviar un patrón.',
    invalid:
      'Este patrón no se puede enviar. Revisa las alturas, las velocidades y el número de pasos.',
  },
} as const

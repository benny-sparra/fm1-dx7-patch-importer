export default {
  title: 'Sequencer',
  back: 'Zurück zur Bibliothek',
  intro:
    'Erstelle hier ein Pattern und spiele es in den FM1 ein, während das Gerät aufnimmt. Der FM1 kennt keinen Befehl für seinen Sequencer, deshalb bleiben Aufnahmebereitschaft, Pattern-Wahl und Speichern am Gerät.',
  pattern: {
    heading: 'Pattern',
    stepLength: 'Schrittzahl',
    stepLengthHint: 'Stelle hier den Wert Step ein, den die Sequencer-Seite des FM1 anzeigt.',
    step: 'Schritt {{number}}',
    rest: 'Pause',
    note: 'Note',
    pitch: 'Tonhöhe',
    velocity: 'Anschlag',
    makeRest: 'Schritt {{number}} zur Pause machen',
    makeNote: 'Schritt {{number}} zur Note machen',
    clear: 'Pattern leeren',
    cleared: 'Das Pattern wurde geleert.',
  },
  listen: {
    heading: 'FM1 abhören',
    start: 'FM1 abhören',
    stop: 'Abhören beenden',
    hint: 'Starte die Wiedergabe am FM1. Ein Pattern erscheint, sobald zwei vollständige Durchläufe übereinstimmen.',
    waiting: 'Es wird abgehört. Bisher ist nichts zu hören.',
    heard: 'Eine Schleife mit {{count}} Schritten über {{passes}} Durchläufe gehört.',
    use: 'Gehörtes in den Editor übernehmen',
    used: 'Das gehörte Pattern steht jetzt im Editor.',
    rotation:
      'Aus der Wiedergabe geht nicht hervor, welchen Schritt der FM1 als Schritt 1 zählt. Das Gehörte kann deshalb an einer anderen Stelle beginnen als das Pattern oben.',
    match: 'Die Wiedergabe des FM1 stimmt mit dem gesendeten Pattern überein.',
    mismatch:
      'Die Wiedergabe des FM1 ist nicht das gesendete Pattern. Prüfe das Pattern am Gerät und sende es erneut.',
    problem: {
      tooFewNotes: 'Bisher ist nichts zu hören. Starte die Wiedergabe am FM1.',
      noRepeat:
        'Bisher ist keine Wiederholung zu hören. Lass das Pattern mindestens zweimal durchlaufen.',
      inconsistentPasses:
        'Die Durchläufe stimmen nicht überein. Spiele nicht auf den Tasten des FM1, während er gelesen wird.',
      loopLengthUnresolved:
        'Zum Gehörten passen mehrere Schrittzahlen. Stelle die Schrittzahl auf den Wert am FM1 ein.',
      offGrid:
        'Die Noten passen nicht zu dieser Schrittzahl. Prüfe den Wert Step, den der FM1 anzeigt.',
    },
  },
  send: {
    button: 'An den FM1 senden',
    heading: 'Dieses Pattern an den FM1 senden',
    arm: 'Mache das zuerst am FM1, denn der Editor kann es nicht:',
    armPattern: 'Wähle das Pattern, das ersetzt werden soll.',
    armStepLength: 'Stelle Step auf {{steps}}.',
    armTranspose: 'Stelle Transpose auf 0.',
    armRecord: 'Drücke REC. Das Licht des ersten Schritts blinkt.',
    replaces:
      'Das Senden ersetzt alles in diesem Pattern, von Schritt 1 bis zum Ende der Schleife. Von hier aus lässt sich das nicht rückgängig machen.',
    keys: 'Spiele nicht auf den Tasten des FM1, bis das Pattern gesendet wurde.',
    confirm: 'Der FM1 nimmt auf; jetzt senden',
    cancel: 'Abbrechen',
    sending: 'Schritt {{step}} von {{steps}} wird gesendet.',
    stop: 'Senden abbrechen',
    sent: '{{steps}} von {{total}} Schritten gesendet. Der FM1 bestätigt nichts, höre ihn zur Kontrolle ab.',
    unsaved:
      'Das Pattern liegt nur im Speicher des Geräts. Sichere es mit SAVE am FM1, damit es erhalten bleibt.',
    cancelled:
      'Nach {{steps}} von {{total}} Schritten gestoppt. Das Pattern im FM1 ist teils neu, teils alt.',
    interrupted:
      'Die MIDI-Verbindung ist nach {{steps}} von {{total}} Schritten ausgefallen. Das Pattern im FM1 ist teils neu, teils alt.',
    noOutput: 'Wähle einen MIDI-Ausgang, bevor du ein Pattern sendest.',
    invalid:
      'Dieses Pattern lässt sich nicht senden. Prüfe Tonhöhen, Anschlagwerte und die Schrittzahl.',
  },
} as const

export default {
  dialogs: {
    bankTitle: 'Zielbank am FM1 auswählen',
    bankIntro:
      'Wenn der FM1 bereit ist, starte die SysEx-Übertragung und schließe den Import am Gerät ab.',
    bankClose: 'Anweisungen zur Bankauswahl schließen',
    bankStep1: 'Warte, bis die Bankauswahl im Display des FM1 erscheint.',
    bankStep2: 'Wähle mit Regler 1, 2, 3 oder 4 die Zielbank A, B, C oder D.',
    bankStep3: 'Der FM1 speichert die 32 Sounds nach kurzer Wartezeit automatisch.',
    bankFm1VaStep1:
      'Der FM1 fragt „Replace Bank A?“ und beginnt bei Bank A, egal welche Bank du sendest.',
    bankFm1VaStep2: 'Drehe ALGORITHM, bis die Frage die Zielbank nennt: A, B, C oder D.',
    bankFm1VaStep3:
      'Drehe SELECT auf Replace und drücke SEL, um die 32 Sounds zu speichern, oder brich mit HOME ab. Sie ersetzen auch die Werkspresets dieser Bank dauerhaft.',
    bankFm1VaNote:
      'Läuft auf deinem FM1 die Firmware von Baud Girl, fragt er stattdessen „Replace Bank A?“ und beginnt bei Bank A. Drehe ALGORITHM auf die Zielbank, dann SELECT auf Replace, und drücke SEL.',
    bankFeluccaNote:
      'Felucca ignoriert DX7-Bänke, das Senden dieser Bank ändert ihre Presets also nicht.',
    bankFm1VaImage:
      'FM1-Display mit der Firmware von Baud Girl, das „Replace Bank A?“ fragt, mit Cancel und Replace',
    bankImage:
      'FM1-Display mit der M-VAVE-Firmware, das „32 Voice Save To …“ über den Bänken A, B, C und D zeigt',
    dontShow: 'In dieser Sitzung nicht erneut anzeigen',
    midiTitle: 'MIDI verbinden, um diese Bank zu senden',
    midiIntro:
      'Der FM1 muss als MIDI-Ausgang verbunden sein, bevor eine Bank gesendet werden kann.',
    midiClose: 'MIDI-Verbindungshinweis schließen',
    midiSteps:
      'Aktiviere MIDI online, erlaube den MIDI-Zugriff und wähle den FM1-MIDI-Ausgang in den Einstellungen.',
    restoreTitle: 'Auf die Werks-Sounds zurücksetzen?',
    restoreIntro:
      'Dadurch werden alle vier Bänke ersetzt. Das Zurücksetzen kann sofort rückgängig gemacht werden.',
    restoreClose: 'Zurücksetzen schließen',
    restoreDetails:
      'Bank A, B, C und D werden auf die FM-1-Bänke 1, 2, 3 bzw. 4 zurückgesetzt, die Sounds, mit denen der FM1 ausgeliefert wird.',
    restoreAction: 'Vier Bänke zurücksetzen',
    sourcesTitle: 'DX7-Sound-Bänke finden',
    sourcesIntro:
      'Lade eine DX7-SysEx-Bank mit 32 Voices (.syx) herunter, kehre zurück und wähle „DX7-Bank importieren…“.',
    sourceDescriptions: {
      yamahaBlackBoxes: 'DX7-Werkscartridges und SysEx-Bänke.',
      bobbyBlues: 'Langjährige Sammlung von DX7-Sounds und -Bänken.',
      soundarchive: 'Kuratierte SysEx-Bänke für DX7, TX816 und TX802.',
      fm1FactoryPresets:
        'Die ursprünglichen Vorlagen des FM-1, aus dem Wiederherstellungstool von M-VAVE gewonnen. Auch im Bankkatalog.',
    },
    sourcesClose: 'Bankquellen schließen',
    sourcesSubmit: 'Du hast selbst eine DX7-Bank programmiert?',
    sourcesSubmitLink: 'Biete sie für den Bankkatalog an',
  },
  controlHelp: {
    algorithm:
      'Legt fest, wie die sechs Operatoren verbunden sind. Die unteren Operatoren sind Carrier, die du direkt hörst; die darüber verändern den Klang der Operatoren darunter.',
    feedback:
      'Führt einen Teil eines Operators in sich selbst zurück. Hohe Werte fügen hellere, rauere Obertöne hinzu und können rauschen.',
    pitchEnvelope:
      'Verändert die Tonhöhe über die Dauer jeder Note. Die vier Raten bestimmen, wie schnell jede Stufe erreicht wird; die vier Pegel legen die Tonhöhe jeder Stufe fest.',
    pitchEnvelopePresets:
      'Ersetzt alle acht Raten und Pegel durch eine Ausgangsform. „Flach“ entfernt jede Tonhöhenbewegung; die anderen fügen einen kurzen Blip, einen fallenden Anschlag, ein ansteigendes Anschleifen oder ein Absinken beim Loslassen hinzu. Rückgängig stellt die vorherige Hüllkurve wieder her.',
    effectPresets:
      'Stellt die Regler dieses Effekts auf einen Ausgangspunkt ein. Schalte den Effekt ein, um eines auszuwählen. Andere Effekte bleiben unverändert, und Rückgängig stellt die vorherigen Einstellungen wieder her.',
    oscillatorSync:
      'Startet jeden Operator bei jeder Note an derselben Stelle der Wellenform neu. Ein sorgt für einen gleichmäßigeren Anschlag; Aus kann organischer klingen.',
    lfoSync:
      'Startet den LFO bei jeder neuen Note neu. Ein wiederholt die Modulation gleichmäßig; bei Aus steigt jede Note in den durchlaufenden LFO ein.',
    lfoWave:
      'Wählt die wiederholte Form für Vibrato und Tremolo. Sinus ist weich, Rechteck springt zwischen zwei Werten, und Sample & Hold ist zufällig.',
    lfoSpeed:
      'Legt fest, wie schnell der LFO schwingt. Erhöhe den Wert für schnelleres Vibrato oder Tremolo.',
    lfoDelay:
      'Verzögert den LFO nach dem Notenbeginn, sodass Vibrato oder Tremolo einblendet, statt sofort einzusetzen.',
    pitchModDepth:
      'Legt die maximale Tonhöhenbewegung des LFO fest. Die Tonhöhenmod.-Empfindlichkeit jedes Sounds bestimmt, wie viel davon zu hören ist.',
    ampModDepth:
      'Legt die maximale Lautstärkebewegung des LFO fest. Die Amplitudenmod.-Empfindlichkeit jedes Operators bestimmt, wie stark er reagiert.',
    pitchModSensitivity:
      'Bestimmt, wie stark der ganze Sound auf die Tonhöhenmodulation des LFO reagiert. Höhere Werte ergeben breiteres Vibrato.',
    transpose:
      'Verschiebt den ganzen Sound in Halbtönen nach oben oder unten, ohne die gespielten Tasten zu ändern.',
    operator:
      'Ein Operator ist ein Oszillator mit eigener Hüllkurve. Carrier erzeugen den hörbaren Klang; Modulatoren formen einen anderen Operator um und erzeugen so Obertöne.',
    outputLevel:
      'Legt die Stärke dieses Operators fest. Bei einem Carrier ändert er vor allem die Lautstärke, bei einem Modulator Helligkeit und Obertonreichtum.',
    amplitudeEnvelope:
      'Formt diesen Operator über die Zeit. Ziehe nach links oder rechts, um zu ändern, wie schnell eine Stufe erreicht wird, und nach oben oder unten für ihren Pegel. Bei Modulatoren formt sie die Helligkeit statt der Lautstärke.',
    oscillatorMode:
      'Ratio folgt der Tastatur und eignet sich für gestimmte Obertöne. Fest nutzt eine konstante Frequenz, nützlich für metallische, rauschige oder perkussive Klänge.',
    coarse:
      'Legt im Ratio-Modus das Hauptfrequenzverhältnis fest, im Fest-Modus den groben Frequenzbereich. Ganzzahlige Verhältnisse klingen meist harmonisch.',
    fine: 'Stimmt die Operatorfrequenz zwischen den Grob-Stufen fein. Kleine Änderungen können neue Obertöne oder Schwebungen erzeugen.',
    ratioEntry:
      'Gib das gewünschte Verhältnis ein, etwa 3,5. Grob und Fein springen auf das nächste Verhältnis, das der FM1 spielen kann, und das Feld zeigt es an.',
    fixedFrequencyEntry:
      'Gib die gewünschte Frequenz in Hertz ein, etwa 440 oder 1,2k. Grob und Fein springen auf die nächste Frequenz, die der FM1 spielen kann, und das Feld zeigt sie an.',
    detune:
      'Verstimmt diesen Operator leicht gegenüber der exakten Stimmung. Wenig davon macht den Klang dicker; größere Abweichungen erzeugen Schwebungen oder Dissonanz.',
    breakpoint:
      'Wählt die Taste, an der sich linke und rechte Pegelskalierung treffen. Die Skalierung ändert den Pegel dieses Operators über die Tastatur.',
    leftDepth:
      'Legt fest, wie stark sich der Pegel dieses Operators bei Noten unterhalb des Trennpunkts ändert.',
    rightDepth:
      'Legt fest, wie stark sich der Pegel dieses Operators bei Noten oberhalb des Trennpunkts ändert.',
    curve:
      'Wählt Richtung und Form der Pegeländerung vom Trennpunkt weg. Linear ändert gleichmäßig; exponentiell ändert zu einem Ende hin stärker.',
    rateScaling:
      'Lässt die Hüllkurve dieses Operators bei höheren Noten schneller ablaufen, ähnlich dem kürzeren Abklingen vieler akustischer Instrumente.',
    velocity:
      'Legt fest, wie stark die Anschlagstärke den Pegel dieses Operators ändert. Bei Carriern wirkt sie auf die Lautstärke, bei Modulatoren auf die Helligkeit.',
    ampModSensitivity:
      'Legt fest, wie stark dieser Operator auf die Amplitudenmodulation des LFO reagiert. Bei einem Carrier entsteht Tremolo, bei einem Modulator wird der Klang belebt.',
  },
  effectHelp: {
    Filter:
      'Entfernt Teile des Frequenzspektrums. Damit machst du den fertigen FM-Klang dunkler, dünner oder formst ihn um.',
    Reverb: 'Fügt simulierte Raumreflexionen hinzu und gibt dem Klang Räumlichkeit und Tiefe.',
    Delay:
      'Wiederholt den Klang nach kurzer Zeit. Die feedbackähnliche Abklingzeit bestimmt, wie lange die Echos anhalten.',
    Distortion:
      'Fügt Sättigung und zusätzliche Obertöne hinzu. Leise Klänge werden dichter, aggressive noch intensiver.',
    Chorus: 'Fügt leicht verschobene Kopien des Klangs hinzu, für Breite und Bewegung.',
    Phaser:
      'Lässt eine Reihe von Kerben durch den Klang wandern und erzeugt einen hohlen, bewegten Charakter.',
  },
  effectParameterHelp: {
    'Filter Type':
      'Wählt, was das Filter durchlässt: Tiefpass behält die Tiefen, Hochpass die Höhen und Bandpass einen mittleren Bereich.',
    'Filter Cutoff':
      'Legt die Frequenz fest, ab der das Filter wirkt, von etwa 100 Hz bei 0 bis 20 kHz bei 107. Die hörbare Richtung hängt vom gewählten Filtertyp ab.',
    'Filter Resonance':
      'Betont Frequenzen um die Grenzfrequenz. Höhere Werte klingen schärfer und ausgeprägter.',
    'Reverb Space': 'Wählt den Charakter des simulierten Raums: Raum, Halle oder helle Platte.',
    'Reverb Decay': 'Legt fest, wie lange die Hallfahne anhält.',
    'Reverb Mix': 'Mischt trockenes Signal und Hall. Bei 0 % hörst du nur den Originalklang.',
    'Delay Decay':
      'Legt fest, wie viel von jedem Echo in das Delay zurückgeführt wird. Höhere Werte ergeben mehr Wiederholungen, bevor sie ausklingen.',
    'Delay Rate':
      'Legt die Zeit zwischen den Echos fest. Höhere Werte rücken sie näher zusammen, von etwa 0,8 Sekunden bei 0 bis 0,1 Sekunden bei 100.',
    'Delay Mix': 'Mischt trockenes Signal und Echos. Bei 0 % hörst du nur den Originalklang.',
    'Distortion Gain':
      'Bestimmt, wie stark das Signal die Verzerrung antreibt. Höhere Werte fügen mehr Sättigung und Obertöne hinzu.',
    'Distortion Tone': 'Passt die Helligkeit des verzerrten Klangs an.',
    'Distortion Level':
      'Legt die Ausgangslautstärke nach der Verzerrung fest, nützlich zum Angleichen an die Lautstärke ohne Effekt.',
    'Distortion Type':
      'Legt fest, wie die Verzerrung auf der Firmware von Baud Girl klingt. Weiches Clipping, das Original von M-VAVE, rundet die Spitzen ab; hartes Clipping schneidet sie flach ab und klingt rauer; Foldback faltet sie zurück und klingt heller und metallischer. Keine MIDI-Nachricht stellt sie ein, daher hörst du sie erst, wenn der Sound mit „An FM1 senden“ oder „Sounds auf den FM1 schreiben“ auf den FM1 geschrieben ist.',
    'Chorus Frequency':
      'Legt fest, wie schnell die Chorus-Bewegung schwingt, von etwa 0,1 bis 1 Hz.',
    'Chorus Depth':
      'Legt fest, wie weit die Tonhöhenbewegung des Chorus reicht. Höhere Werte klingen breiter und deutlicher.',
    'Chorus Mix': 'Mischt trockenes Signal und Chorus-Signal.',
    'Phaser Frequency': 'Legt fest, wie schnell der Phaser-Sweep schwingt, von etwa 0,5 bis 6 Hz.',
    'Phaser Depth': 'Legt Umfang und Intensität des Phaser-Sweeps fest.',
    'Phaser Mix': 'Mischt trockenes Signal und Phaser-Signal.',
  },
  distortionType: {
    softClip: 'Weiches Clipping',
    hardClip: 'Hartes Clipping',
    foldback: 'Foldback',
    unknown: 'Unbekannt ({{value, number}})',
    noRecord:
      'Dieser Sound stammt nicht vom FM1 und übernimmt daher den Typ des Presets, über das er geschrieben wird.',
    otherFirmware:
      'Für die Firmware von Baud Girl gespeichert: {{type}}. Dieser FM1 spielt stattdessen seine eigene Verzerrung.',
  },
  ui: {
    auditionGroup: 'Operator {{number}} vorhören',
    mute: 'Stumm',
    unmute: 'Ton an',
    solo: 'Solo',
    unsolo: 'Solo aus',
    auditionAction: 'Operator {{number}} zum Vorhören {{action}}',
    auditionTemporary: 'Operator {{number}} vorübergehend {{action}}',
    auditionConnect: 'Operator {{number}} {{action}}; MIDI verbinden, um Änderungen zu hören',
    operatorOutput: 'Ausgangspegel von Operator {{number}}',
    oscillator: 'Oszillator',
    mode: 'Mode',
    coarse: 'Grob',
    fine: 'Fein',
    detune: 'Verstimmung',
    ratioEntry: 'Ratio',
    fixedFrequencyEntry: 'Frequenz (Hz)',
    ratioEntryInvalid: 'Gib das Verhältnis als Zahl ein, etwa 3,5.',
    fixedFrequencyEntryInvalid: 'Gib die Frequenz in Hertz ein, etwa 440.',
    keyboardScaling: 'Tastaturskalierung',
    breakpoint: 'Trennpunkt',
    left: 'Links',
    right: 'Rechts',
    leftDepth: 'Linke Tiefe',
    rightDepth: 'Rechte Tiefe',
    rateScaling: 'Ratenskalierung',
    leftCurve: 'Linke Kurve',
    rightCurve: 'Rechte Kurve',
    velocity: 'Anschlagstärke',
    ampModSensitivity: 'Empf. Amplitudenmod.',
    lfoWave: 'LFO-Wellenform',
    dx7Algorithm: 'DX7-Algorithmus',
    unsavedBody:
      'Diese Arbeitskopie in deiner Bibliothek speichern oder verwerfen und den gespeicherten Sound auf dem FM1 wiederherstellen.',
    revertTitle:
      'Alle Änderungen seit dem letzten Speichern verwerfen und den Sound auf dem FM1 wiederherstellen',
    keyboard: 'Tastatur',
    pianoKeyboard: 'Klaviatur',
    dragKeyboard: 'Klaviatur verschieben',
    closeKeyboard: 'Klaviatur schließen',
    keyLevel: 'Stärke',
    phrase: 'Phrase',
    play: 'Start',
    stop: 'Stopp',
    playPhrase: 'Phrase abspielen',
    stopPhrase: 'Phrase anhalten',
    tempo: 'Tempo',
    tempoValue: '{{tempo}} BPM',
    phrases: {
      pad: 'Fläche',
      electricPiano: 'E-Piano',
      bass: 'Bass',
      lead: 'Melodie',
      arpeggio: 'Arpeggio',
      velocityRamp: 'Anschlagsrampe',
    },
    helpOpenFailed:
      'Die Anleitung konnte nicht geöffnet werden. Lade die Seite neu und versuche es erneut.',
    keyboardOpenFailed:
      'Die Tastatur konnte nicht geöffnet werden. Lade die Seite neu und versuche es erneut.',
    shiftOctave: 'Oktave nach {{direction}} verschieben',
    playNote: '{{note}} spielen',
    helpFor: 'Hilfe: {{label}}',
    rotaryTitle: '{{label}}: {{value}}. Zum Einstellen nach oben oder unten ziehen.',
    envelopePoint: '{{title}}, Punkt {{point}}',
    envelopePointValue: 'Rate {{rate}}, Level {{level}}',
    envelopeRate: '{{title}}, Rate {{point}}',
    envelopeLevel: '{{title}}, Level {{point}}',
    chooseAlgorithm: 'Algorithmus {{number}}. Algorithmus wählen',
    algorithmNumber: 'Algorithmus {{number}}',
    operatorSummary: 'Operator {{number}}, {{role}}',
    operatorSummaryWithAudition: 'Operator {{number}}, {{role}}, {{audition}}',
    operatorMuted: 'stummgeschaltet',
    operatorSoloed: 'solo',
    operatorMenu: 'Aktionen für Operator {{number}}',
    copyOperatorAction: 'Operator {{number}} kopieren',
    pasteOperatorAction: 'Operator {{source}} einfügen',
    pasteOperatorFromPatchAction: 'Operator {{source}} aus „{{patch}}“ einfügen',
    pasteOperatorEmpty: 'Einfügen (zuerst einen Operator oder seine Hüllkurve kopieren)',
    copyEnvelopeAction: 'Hüllkurve von Operator {{number}} kopieren',
    pasteEnvelopeAction: 'Hüllkurve von Operator {{source}} einfügen',
    pasteEnvelopeFromPatchAction: 'Hüllkurve von Operator {{source}} aus „{{patch}}“ einfügen',
    lfoWaves: {
      triangle: 'Dreieck',
      sawDown: 'Sägezahn fallend',
      sawUp: 'Sägezahn steigend',
      square: 'Rechteck',
      sine: 'Sinus',
      sampleAndHold: 'Sample & Hold',
    },
    oscillatorModes: {
      ratio: 'Ratio',
      fixed: 'Fest',
    },
    curves: {
      negativeLinear: '− Linear',
      negativeExponential: '− Exponentiell',
      positiveExponential: '+ Exponentiell',
      positiveLinear: '+ Linear',
    },
    directionDown: 'unten',
    directionUp: 'oben',
    effects: {
      filter: 'Filter',
      reverb: 'Hall',
      delay: 'Delay',
      distortion: 'Verzerrung',
      chorus: 'Chorus',
      phaser: 'Phaser',
    },
    parameters: {
      depth: 'Tiefe',
      type: 'Typ',
      cutoff: 'Grenzfrequenz',
      resonance: 'Resonanz',
      space: 'Raum',
      decay: 'Abklingzeit',
      mix: 'Mix',
      rate: 'Rate',
      gain: 'Verstärkung',
      tone: 'Klang',
      level: 'Pegel',
      frequency: 'Frequenz',
    },
    options: {
      lowPass: 'Tiefpass',
      bandPass: 'Bandpass',
      highPass: 'Hochpass',
      room: 'Raum',
      hall: 'Halle',
      plate: 'Platte',
    },
  },
  replacePatch: {
    replacing: 'Wird ersetzt…',
    action: 'Sound ersetzen',
    title: '{{slot}} „{{patch}}“ ersetzen?',
    warning:
      'Der Sound in diesem Slot wird durch den Sound aus der Datei ersetzt, und seine FM1-Effekte werden auf die Standardwerte zurückgesetzt.',
  },
  bankFile: {
    legend: 'Bänke in dieser Datei',
    help: 'Diese Datei enthält eine DX7-Bank.',
    help_other:
      'Diese Datei enthält {{count, number}} DX7-Bänke. Wähle die Bank, die du importieren möchtest.',
    damagedBanks: 'Eine davon ist beschädigt und kann nicht importiert werden.',
    damagedBanks_other:
      '{{count, number}} davon sind beschädigt und können nicht importiert werden.',
    bank: 'Bank {{number}}',
    option: '{{bank}}: {{contents}}',
    damaged: 'Beschädigt',
  },
  overwriteImport: {
    titleEmpty: 'In „{{bank}}“ importieren',
    actionEmpty: 'Bank importieren',
    action: 'Bankinhalt ersetzen',
    help: 'Wähle eine Standard-DX7-SysEx-Bankdatei mit 32 Voices.',
    play: '{{name}} spielen, Sound {{number}}',
    previewHelp:
      'Klicke auf einen Sound, um ihn am FM1 zu hören. Deine Bank bleibt unverändert, bis du sie ersetzt.',
    previewTitle: 'Sounds in dieser Datei',
    title: '„{{bank}}“ überschreiben?',
    warning:
      'Der aktuelle Inhalt der Bank wird gelöscht und durch die importierten Sounds ersetzt.',
  },
  fm1VaImport: {
    menuItem: 'Baud-Girl-Presetdatei importieren…',
    menuRead: 'Presets vom FM1 lesen…',
    menuHeading: 'Baud Girl (FM-1+VA)',
    title: 'Baud-Girl-Presetdatei importieren',
    titleRead: 'Presets vom FM1 lesen',
    help: 'Wähle die Datei aus „Save a backup“ auf der Presets-Seite von Baud Girl.',
    warning:
      'Jede importierte Bank ersetzt die Bank, die du für sie wählst, oder kommt als neue Bank hinzu. Du kannst das rückgängig machen.',
    file: 'Baud-Girl-Presetdatei',
    read: 'Vom FM1 lesen',
    readUnavailable:
      'Um die Presets vom FM1 zu lesen, wähle ihn als MIDI-Ausgang und -Eingang und erlaube SysEx. Zum Lesen braucht er die Firmware von Baud Girl, FM-1_079 oder neuer.',
    reading: 'Lese Preset {{number, number}} von {{total, number}}…',
    stopReading: 'Lesen abbrechen',
    chooseFile: 'Datei aus „Save a backup“ wählen',
    previewTitle: 'Bänke in dieser Datei',
    previewHelp: 'Öffne eine Bank, um ihre Sounds am FM1 zu hören.',
    previewTitleFm1: 'Bänke auf dem FM1',
    allMatch: 'Jeder Sound hier stimmt mit deiner Bibliothek überein.',
    differs: 'Ein Punkt markiert den einen Sound, der von deiner Bibliothek abweicht.',
    differs_other:
      'Ein Punkt markiert jeden der {{count, number}} Sounds, die von deiner Bibliothek abweichen.',
    differingPatch: 'Weicht von deiner Bibliothek ab',
    bankHeading: 'FM1-Bank {{bank}}',
    newBank: 'Eine neue Bank',
    destination: 'Importieren nach',
    bankSwitch: 'FM1-Bank {{bank}} importieren',
    damagedPreset: 'Beschädigt',
    damagedPresets: 'Ein Preset ist beschädigt. Sein Platz behält seinen Sound.',
    damagedPresets_other:
      '{{count, number}} Presets sind beschädigt. Ihre Plätze behalten ihre Sounds.',
    action: 'Eine Bank importieren',
    action_other: '{{count, number}} Bänke importieren',
    imported: 'Bank {{banks}} vom FM1 importiert.',
    imported_other: 'Bänke {{banks}} vom FM1 importiert.',
    openFailed:
      'Der Import der Baud-Girl-Presets konnte nicht geöffnet werden. Lade die Seite neu und versuche es erneut.',
    virtualAnalogTag: 'VA',
    errors: {
      size: 'Diese Datei ist {{bytes, number}} Bytes groß. Eine Datei aus „Save a backup“ von Baud Girl ist genau {{expected, number}} Bytes groß.',
      format: 'Diese Datei wurde nicht mit „Save a backup“ von Baud Girl gespeichert.',
      damaged:
        'Kein Preset in dieser Datei ist lesbar. Speichere auf der Presets-Seite von Baud Girl eine neue Sicherung und versuche es erneut.',
      unreadable: 'Die Datei konnte nicht gelesen werden.',
      readBusy:
        'Der FM1 kann seine Presets nicht senden, während sein Sequencer läuft. Halte ihn an und lies erneut.',
      readNoReply: 'Der FM1 antwortet nicht mehr. Prüfe seine MIDI-Verbindung und lies erneut.',
      readStopped: 'Das Lesen wurde beendet, weil sich die MIDI-Ports geändert haben. Lies erneut.',
      readFailed:
        'Der FM1 konnte seine Presets nicht senden. Lies erneut oder wähle eine Datei aus „Save a backup“.',
    },
  },
  fm1VaWrite: {
    menuItem: 'Sounds auf den FM1 schreiben…',
    title: 'Sounds auf den FM1 schreiben',
    help: 'Schreibt die Sounds deiner Bibliothek über die Presets des FM1. Nur Sounds, die sich unterscheiden, werden geschrieben.',
    source: 'Schreiben aus',
    bankSwitch: 'In FM1-Bank {{bank}} schreiben',
    differs: 'Ein Sound unterscheidet sich.',
    differs_other: '{{count, number}} Sounds unterscheiden sich.',
    same: 'Alle Sounds stimmen überein.',
    virtualAnalogKept: 'Virtual-Analog-Presets bleiben erhalten.',
    inexact:
      'Ein Virtual-Analog-Sound lässt sich nicht exakt speichern, darum bleibt sein Preset erhalten.',
    inexact_other:
      '{{count, number}} Virtual-Analog-Sounds lassen sich nicht exakt speichern, darum bleiben ihre Presets erhalten.',
    replaces: '{{number}} {{replaces}} → {{name}}',
    action: 'Einen Sound schreiben…',
    action_other: '{{count, number}} Sounds schreiben…',
    confirmTitle: 'Diese Presets auf dem FM1 ersetzen?',
    confirmWarning:
      'Jedes Preset wird sofort ersetzt, und der FM1 kann das nicht rückgängig machen. Speichere vorher auf der Presets-Seite von Baud Girl eine Sicherung.',
    confirm: 'Einen Sound schreiben',
    confirm_other: '{{count, number}} Sounds schreiben',
    writing: 'Schreibe Sound {{number, number}} von {{total, number}}…',
    stop: 'Nach diesem Sound anhalten',
    written: 'Ein Sound auf den FM1 geschrieben.',
    written_other: '{{count, number}} Sounds auf den FM1 geschrieben.',
    stopped:
      'Nach {{count, number}} von {{total, number}} Sounds angehalten. Die übrigen sind unverändert.',
    openFailed:
      'Das Schreiben auf den FM1 konnte nicht geöffnet werden. Lade die Seite neu und versuche es erneut.',
    errors: {
      mismatch:
        'Preset {{number}} ließ sich nicht wie geschrieben zurücklesen, daher wurde nach {{count, number}} von {{total, number}} Sounds angehalten.',
      failed:
        'Das Schreiben wurde nach {{count, number}} von {{total, number}} Sounds angehalten. Prüfe die MIDI-Verbindung des FM1.',
    },
  },
  fm1VaSend: {
    title: '{{bank}} an den FM1 senden',
    help: 'Schreibt {{bank}} über eine der Presetbänke des FM1. Nur Sounds, die sich unterscheiden, werden geschrieben.',
    destination: 'Schreiben über',
    favouritesShort:
      'Favoriten enthält einen Sound, daher bleiben die übrigen Presets der FM1-Bank erhalten.',
    favouritesShort_other:
      'Favoriten enthält {{count, number}} Sounds, daher bleiben die übrigen Presets der FM1-Bank erhalten.',
    bankTooltip:
      'FM1-Bank wählen, über die diese Sounds geschrieben werden; nur abweichende werden geschrieben',
    favouritesTooltip:
      'FM1-Bank wählen, über die die ersten 32 Favoriten geschrieben werden; nur abweichende werden geschrieben',
  },
  duplicates: {
    menuItem: 'Doppelte Sounds finden…',
    title: 'Doppelte Sounds',
    help: 'Sounds mit denselben Stimmeneinstellungen, auch unter anderem Namen. FM1-Effekte werden nicht verglichen. Wähle einen Sound, um zu ihm zu springen und ihn zu spielen.',
    group: '{{name}} und eine Kopie',
    group_other: '{{name}} und {{count, number}} Kopien',
    effectsDiffer: 'Ihre FM1-Effekte unterscheiden sich.',
    settingsDiffer: 'Ihre Baud-Girl-Preset-Einstellungen unterscheiden sich.',
    goTo: 'Zu {{name}} springen, Sound {{number}} in {{bank}}',
    none: 'Keine Doppelten: Jeder Sound in deinen Bänken hat eigene Stimmeneinstellungen.',
    openFailed:
      'Doppelte Sounds konnten nicht angezeigt werden. Lade die Seite neu und versuche es noch einmal.',
  },
  persistence: {
    retryLoading: 'Erneut versuchen',
    continueSessionOnly: 'Ohne Speichern fortfahren',
    retrySaving: 'Speichern erneut versuchen',
    technicalDetails: 'Technische Details',
    sessionOnlyTitle: 'Nur temporäre Bibliothek',
    sessionOnlyBody:
      'Vorhandene Browserdaten wurden nicht verändert. Änderungen dieser Sitzung gehen beim Schließen der Seite verloren.',
    saveErrorTitle: 'Änderungen sind nicht sicher gespeichert',
    saveErrorBody:
      'Die neuesten Änderungen sind hier noch verfügbar, konnten aber nicht gespeichert werden. Versuchen Sie es erneut, sobald der Browserspeicher verfügbar ist.',
    loadErrors: {
      unavailable: {
        title: 'Browserspeicher ist nicht verfügbar',
        body: 'Die gespeicherte Bibliothek konnte nicht geöffnet werden. Ihre Daten wurden nicht verändert.',
      },
      'read-failed': {
        title: 'Die gespeicherte Bibliothek konnte nicht gelesen werden',
        body: 'Möglicherweise liegt ein vorübergehendes Speicherproblem vor. Es wurde kein Ersatz erstellt oder gespeichert.',
      },
      incompatible: {
        title: 'Die gespeicherte Bibliothek ist inkompatibel oder beschädigt',
        body: 'Der vorhandene Datensatz blieb unverändert. Diese Version kann ihn nicht sicher öffnen.',
      },
      'write-failed': {
        title: 'Die gespeicherte Bibliothek konnte nicht gelesen werden',
        body: 'Es wurde kein Ersatz erstellt oder gespeichert.',
      },
    },
  },
  favourites: {
    title: 'Favoriten',
    tabTitle: 'Deine Lieblingssounds anzeigen',
    toggle: 'Favorit: {{name}}',
    addTitle: 'Zu Favoriten hinzufügen',
    removeTitle: 'Aus Favoriten entfernen',
    added: '„{{patch}}“ wurde zu den Favoriten hinzugefügt.',
    removed: '„{{patch}}“ wurde aus den Favoriten entfernt.',
    alreadyAdded: '„{{patch}}“ ist schon in den Favoriten.',
    addFailed: 'Der Sound konnte nicht zu den Favoriten hinzugefügt werden.',
    empty: 'Noch keine Favoriten',
    emptyHelp:
      'Wähle das Herz an einem Sound oder ziehe einen Sound auf Favoriten, um ihn hier zu behalten. Favoriten lassen sich als Bank an den FM1 senden.',
    sendTitle: 'Die ersten 32 Favoriten als Bank senden und Zielbank am FM1 wählen',
    addFirst: 'Füge einen Favoriten hinzu, bevor du Favoriten sendest',
    initNote:
      'Eine Bank fasst 32 Sounds, darum füllt das Senden der Favoriten den letzten Platz mit INIT VOICE.',
    initNote_other:
      'Eine Bank fasst 32 Sounds, darum füllt das Senden der Favoriten die letzten {{count, number}} Plätze mit INIT VOICE.',
    leftOutNote:
      'Eine Bank fasst 32 Sounds, darum werden nur die ersten 32 Favoriten gesendet. Der letzte bleibt hier.',
    leftOutNote_other:
      'Eine Bank fasst 32 Sounds, darum werden nur die ersten 32 Favoriten gesendet. Die letzten {{count, number}} bleiben hier.',
    sent: 'Die Favoriten wurden gesendet. Wähle ihr Ziel am FM1.',
    sentWithInit:
      'Die Favoriten wurden gesendet, mit INIT VOICE auf dem letzten Platz. Wähle ihr Ziel am FM1.',
    sentWithInit_other:
      'Die Favoriten wurden gesendet, mit INIT VOICE auf den letzten {{count, number}} Plätzen. Wähle ihr Ziel am FM1.',
    sentLeftOut:
      'Die ersten 32 Favoriten wurden gesendet, der letzte nicht. Wähle ihr Ziel am FM1.',
    sentLeftOut_other:
      'Die ersten 32 Favoriten wurden gesendet, die letzten {{count, number}} nicht. Wähle ihr Ziel am FM1.',
    sendUnavailable:
      'Die Favoriten konnten nicht zum Senden vorbereitet werden. Lade die Seite neu und versuche es erneut.',
    savedWithFavourites:
      '„{{patch}}“ wurde in der Bibliothek und in seiner Kopie in den Favoriten gespeichert.',
    savedWithBanks:
      '„{{patch}}“ wurde in den Favoriten und auf den Bankplätzen gespeichert, die ihn enthielten.',
  },
  toasts: {
    midiPanicSent: 'MIDI-Panik gesendet. Alle Noten auf dem Notenkanal wurden beendet.',
    notifications: 'Abgeschlossene Aktionen',
    dismiss: 'Benachrichtigung schließen',
    undo: 'Rückgängig',
    undone: 'Letzte Änderung rückgängig gemacht.',
    redone: 'Änderung wiederhergestellt.',
    bankImported: 'Sounds in „{{bank}}“ importiert.',
    bankCreated: '„{{bank}}“ wurde erstellt.',
    bankDeleted: '„{{bank}}“ wurde gelöscht.',
    banksRestored: 'Die vier Bänke wurden auf die Werks-Sounds zurückgesetzt.',
    bankDownloadStarted: '„{{bank}}“ wird heruntergeladen.',
    banksDownloadStarted: 'Alle Bänke werden heruntergeladen.',
    bankUpdated: '„{{bank}}“ wurde aktualisiert.',
    demoLoaded: 'Demo-Sounds in „{{bank}}“ geladen.',
    patchSaved: '„{{patch}}“ wurde in der Bibliothek gespeichert.',
    patchCopied: '„{{patch}}“ wurde nach {{slot}} in „{{bank}}“ kopiert.',
    patchReplaced: '{{slot}} wurde durch „{{patch}}“ ersetzt.',
    operatorCopied: 'Operator {{number}} wurde kopiert.',
    bankDownloadStartedWithInit:
      '„{{bank}}“ wird heruntergeladen, mit INIT VOICE anstelle seines Virtual-Analog-Presets.',
    bankDownloadStartedWithInit_other:
      '„{{bank}}“ wird heruntergeladen, mit INIT VOICE anstelle seiner {{count, number}} Virtual-Analog-Presets.',
    banksDownloadStartedWithInit:
      'Alle Bänke werden heruntergeladen, mit INIT VOICE anstelle eines Virtual-Analog-Presets.',
    banksDownloadStartedWithInit_other:
      'Alle Bänke werden heruntergeladen, mit INIT VOICE anstelle von {{count, number}} Virtual-Analog-Presets.',
  },
  meta: {
    title: 'M-VAVE FM1 Editor und Librarian',
    description:
      'Sounds für den M-VAVE FM1 Synthesizer bearbeiten, organisieren und übertragen – einschließlich DX7-SysEx-Bankimport.',
  },
  language: 'Sprache',
  common: {
    close: 'Schließen',
    cancel: 'Abbrechen',
    settings: 'Einstellungen',
    channel: 'Kanal {{number}}',
    loading: 'Editor wird geladen…',
    loadingLibrary: 'Bibliothek wird geladen',
    editorLoadErrorTitle: 'Der Editor konnte nicht geladen werden.',
    editorLoadErrorBody:
      'Die App wurde möglicherweise aktualisiert oder die Verbindung wurde unterbrochen. Lade die App neu, um die neueste Version zu verwenden, oder kehre zur Bibliothek zurück.',
    reloadApp: 'App neu laden',
    backToLibrary: 'Zurück zur Bibliothek',
  },
  root: {
    subtitle: 'Editor und Librarian',
    intro:
      'FM1-Sounds bearbeiten, organisieren und übertragen oder <link>DX7-SysEx-Bänke importieren</link>.',
    synthAlt: 'Vorderseite des M-VAVE FM1 Synthesizers',
    unsupportedTitle: 'Nicht unterstützter Browser.',
    unsupportedBody:
      'Dieser Librarian benötigt einen Browser mit Web-MIDI- und SysEx-Unterstützung, etwa Chrome, Edge, Firefox oder Opera. Chrome unter Android funktioniert ebenfalls.',
    localOnly: 'Deine Sounds bleiben in diesem Browser',
    projectLinks: 'Projektlinks',
    reportIssue: 'Problem melden',
    version: 'Version {{version}}',
    disclaimer:
      'Unabhängiges Open-Source-Projekt. Nicht mit M-VAVE oder Yamaha verbunden oder von ihnen unterstützt.',
  },
  settings: {
    description: 'Wähle Oberflächensprache, MIDI-Ports und Kanäle.',
    output: 'Ausgang',
    inputMonitor: 'Monitoring-Eingang',
    firmware: 'FM1-Firmware',
    firmwareChecking: 'Wird geprüft…',
    firmwareUnidentified: 'Nicht erkannt',
    firmwareMvave: 'M-VAVE {{identity}}',
    firmwareFm1Va: 'Baud Girl {{identity}}',
    firmwareFelucca: 'Felucca {{identity}}',
    firmwareEditBuffer: 'Sounds, die du anspielst, gehen in den Bearbeitungspuffer des FM1.',
    firmwareParameterChanges:
      'Sounds, die du anspielst, werden als Parameteränderungen gesendet, damit der FM1 sie nie über das gewählte Preset speichert.',
    firmwareIgnoresPatches:
      'Felucca spielt deine Noten, ignoriert aber DX7-Sounds, DX7-Bänke und die Effektregler.',
    firmwareNeedsInput:
      'Wähle den FM1 als Monitoring-Eingang, damit der Editor fragen kann, welche Firmware er verwendet.',
    noteChannel: 'Notenkanal',
    fxChannel: 'Effektkanal',
    defaultChannel: 'FM1-Standard: Kanal 2',
    noDevice: 'Kein Gerät gefunden',
    noDeviceSelected: 'Kein Gerät ausgewählt',
  },
  help: {
    open: 'FM1 Editor und Librarian verwenden',
    title: 'Willkommen beim FM1 Editor und Librarian',
    intro:
      'Verwalte deine Sound-Bibliothek, forme Sounds im Voice-Editor und übertrage sie auf deinen M-VAVE FM1 – direkt im Browser.',
    close: 'Hilfe schließen',
    truthTitle: 'Die Bänke in diesem Browser sind die maßgebliche Quelle.',
    truthBody:
      'Der FM1 kann Sounds und Bänke empfangen, seine gespeicherten Bänke aber nicht zurücksenden. Importiere oder stelle Sounds hier wieder her, bearbeite sie und übertrage sie dann zum FM1.',
    firmwareTitle: 'Baud Girl (FM-1+VA) unterstützt',
    firmwareBody: 'Funktioniert mit der Firmware von M-VAVE und von Baud Girl.',
    start: 'Bearbeitung starten',
    stepsTitle: 'Erste Schritte',
    sections: 'Abschnitte der Anleitung',
    shortcutsTitle: 'Tastaturkürzel',
    browsers: {
      title: 'Browserunterstützung',
      works: 'Funktioniert',
      unsupported: 'Nicht unterstützt',
      yours: 'Dein Browser',
      desktop: 'Desktop',
      desktopAndAndroid: 'Desktop und Android',
    },
    shortcuts: {
      banks: 'Sound-Bänke',
      editor: 'Voice-Editor',
      search: 'Zur Suche springen',
      clearSearch: 'Suche löschen',
      openSlot: 'Leuchtenden Slot öffnen',
    },
    steps: {
      libraryTitle: 'Bibliothek aufbauen',
      libraryBody: 'Starte mit den Werksbänken des FM1 oder importiere eigene.',
      editTitle: 'Bearbeiten und organisieren',
      editBody: 'Öffne einen Sound zum Bearbeiten und speichere ihn in deiner Bibliothek.',
      connectTitle: 'FM1 verbinden',
      connectBody: 'Schließe den FM1 an und aktiviere MIDI online.',
      transferTitle: 'Sounds übertragen',
      transferBody:
        'Klicke auf einen Sound, um ihn zu hören, oder sende eine ganze Bank an den FM1.',
    },
  },
  colorway: {
    legend: 'FM1-Farbausführung',
    option: 'FM1-Finish {{colour}}',
    black: 'Schwarz',
    purple: 'Violett',
    orange: 'Orange',
    blackGreen: 'Schwarz-Grün',
    coolGray: 'Kühlgrau',
    whiteBlue: 'Weiß-Blau',
  },
  editor: {
    back: 'Zurück zu den Bänken',
    editName: 'Soundnamen bearbeiten',
    patchName: 'Soundname',
    unsaved: 'Ungespeicherte Änderungen',
    presets: 'Stimmen-Vorlagen',
    presetsShort: 'Vorlagen',
    presetOptions: {
      'soft-pad': {
        name: 'Sanftes Pad',
        description: 'Langsame Hüllkurven, Chorus und Hall.',
      },
      'bright-pluck': {
        name: 'Heller Pluck',
        description: 'Klarer Ausklang, kleiner Raum, Echo.',
      },
      'steady-organ': {
        name: 'Stabile Orgel',
        description: 'Gleichmäßiges Sustain, Chorus, Phaser.',
      },
      'gentle-motion': {
        name: 'Sanfte Bewegung',
        description: 'Verzögerter LFO, Chorus, weicher Hall.',
      },
      'warm-filter': {
        name: 'Warmer Filter',
        description: 'Tiefpassfilter und kleiner Raum.',
      },
      'wide-space': {
        name: 'Weiter Raum',
        description: 'Breiter Chorus und Hall.',
      },
    },
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    save: 'In Bibliothek speichern',
    moreSave: 'Weitere Speicheroptionen',
    resend: 'Erneut an FM1 senden',
    resendHelp: 'Aktuelle Editor-Einstellungen erneut senden.',
    revert: 'Gespeicherten Stand laden',
    revertHelp: 'Änderungen verwerfen und den gespeicherten Sound wiederherstellen.',
    compare: 'Mit gespeichertem Stand vergleichen',
    compareShort: 'Vergleichen',
    stopComparing: 'Vergleich beenden und zu deinen Änderungen zurückkehren',
    comparingTitle: 'Gespeicherter Klang läuft',
    comparingBody:
      'Die Bearbeitung ist pausiert. Drücke Esc oder „Vergleichen“, um zu deinen Änderungen zurückzukehren.',
    configuration: 'Sound-Konfiguration',
    global: 'Global',
    effects: 'Effekte',
    pitchEnvelope: 'Tonhöhen-Hüllkurve',
    pitchEnvelopePresets: 'Presets',
    pitchEnvelopePresetPlaceholder: 'Auswählen…',
    pitchEnvelopePresetOptions: {
      flat: 'Flach',
      blipUp: 'Anschlag-Blip nach oben',
      attackDrop: 'Anschlag-Abfall',
      scoop: 'Anschleifen',
      releaseFall: 'Abfall beim Loslassen',
    },
    effectPreset: 'Preset',
    effectPresetPlaceholder: 'Auswählen…',
    effectPresetOptions: {
      warm: 'Warm',
      muffled: 'Gedämpft',
      telephone: 'Telefon',
      thin: 'Dünn',
      resonant: 'Resonant',
      lightDrive: 'Leichter Drive',
      warmDrive: 'Warmer Drive',
      crunch: 'Crunch',
      fuzz: 'Fuzz',
      smallRoom: 'Kleiner Raum',
      largeRoom: 'Großer Raum',
      smallHall: 'Kleine Halle',
      largeHall: 'Große Halle',
      plate: 'Plattenhall',
      slapback: 'Slapback-Echo',
      quickDelay: 'Kurzes Delay',
      quickRepeats: 'Schnelle Wiederholungen',
      echo: 'Echo',
      subtleChorus: 'Dezenter Chorus',
      ensemble: 'Ensemble',
      chorusWash: 'Chorus-Fläche',
      shimmer: 'Schimmer',
      gentlePhase: 'Sanfter Phaser',
      slowSweep: 'Langsamer Sweep',
      deepPhase: 'Tiefer Phaser',
      fastSwirl: 'Schneller Wirbel',
    },
    lfoGlobal: 'LFO und Global',
    oscillatorSync: 'Oszillator-Sync',
    lfoSync: 'LFO-Sync',
    lfoWave: 'LFO-Wellenform',
    lfoSpeed: 'LFO-Geschwindigkeit',
    lfoDelay: 'LFO-Verzögerung',
    pitchModDepth: 'Tonhöhenmodulationstiefe',
    ampModDepth: 'Amplitudenmodulationstiefe',
    pitchModSensitivity: 'Tonhöhenmod.-Empfindlichkeit',
    transpose: 'Transponierung',
    operator: 'Operator {{number}}',
    operators: 'Operatoren',
    fmOperators: 'FM-Operatoren',
    minimisePanel: '{{panel}} minimieren',
    expandPanel: '{{panel}} ausklappen',
    outputLevel: 'Ausgangspegel',
    amplitudeEnvelope: 'Amplituden-Hüllkurve',
    algorithm: 'Algorithmus',
    feedback: 'Feedback',
    carrier: 'Carrier',
    carrierShort: 'Car',
    modulator: 'Modulator',
    modulatorShort: 'Mod',
    output: 'Ausgang',
    rate: 'Rate {{number}}',
    level: 'Pegel {{number}}',
    unsavedTitle: 'Ungespeicherte Sound-Änderungen',
    keepEditing: 'Weiter bearbeiten',
    discard: 'Änderungen verwerfen',
    saveAndReturn: 'Speichern und zurück',
    initVoice: 'Initialisieren',
    initVoiceHelp: 'Einfache Sinuswelle. Effekte aus.',
    randomise: 'Zufällig',
    randomiseHelp: 'Neue Stimme. Name und Effekte bleiben.',
  },
  midi: {
    activityTitle:
      'MIDI-Aktivität: IN leuchtet, wenn eine Nachricht vom MIDI-Eingang ankommt, OUT, wenn der Editor eine sendet.',
    feluccaBadgeLabel: 'Firmware Felucca von Hügelton Instruments, {{release}}',
    feluccaBadgeTitle:
      'Auf dem FM1 läuft die Firmware Felucca von Hügelton Instruments, {{release}}. Sie spielt deine Noten, ignoriert aber DX7-Sounds, DX7-Bänke und die Effektregler.',
    fm1VaBadgeLabel: 'Firmware von Baud Girl, {{release}}',
    fm1VaBadgeTitle:
      'Auf dem FM1 läuft die Firmware von Baud Girl (FM-1+VA), {{release}}. Sounds, die du anspielst, kommen als ungespeicherte Änderungen an und überschreiben nie ein Preset.',
    mvaveBadgeLabel: 'Firmware von M-VAVE, {{release}}',
    mvaveBadgeTitle:
      'Auf dem FM1 läuft die eigene Firmware von M-VAVE, {{release}}. Sounds, die du anspielst, gehen in seinen Bearbeitungspuffer.',
    panic: 'MIDI-Panik',
    panicHelp:
      'MIDI-Panik: sendet für jede Note auf dem Notenkanal ein Note-Off, um hängende Noten zu beenden',
    panicUnavailable: 'MIDI-Panik: {{reason}}',
    online: 'MIDI online',
    offline: 'MIDI offline',
    connectFirst: 'Zuerst einen MIDI-Ausgang verbinden',
    chooseOutput: 'MIDI-Ausgang auswählen',
    switchOnFirst: 'Zuerst MIDI einschalten',
    closeSysexWarning: 'SysEx-Warnung schließen',
    connecting: 'Verbindung wird hergestellt…',
    errors: {
      insecureContext:
        'Web MIDI benötigt eine sichere Verbindung. Öffne den Editor über HTTPS oder localhost.',
      unsupportedBrowser:
        'Dieser Browser unterstützt Web MIDI nicht. Verwende einen Browser wie Chrome, Edge oder Firefox.',
      permissionDenied:
        'Der MIDI-Zugriff wurde blockiert. Erlaube MIDI- und SysEx-Zugriff für diese Website und verbinde dich erneut. Akzeptiere in Firefox das angebotene Website-Berechtigungs-Add-on.',
      enableFailed:
        'MIDI konnte nicht gestartet werden. Prüfe die Geräteverbindung und versuche es erneut.',
      disconnectFailed: 'MIDI konnte nicht getrennt werden. Versuche es erneut.',
    },
    reconnectForSysex: 'MIDI mit SysEx neu verbinden',
    sysexRecovery:
      'Es wurden keine Bankdaten gesendet. Verbinde MIDI erneut und erlaube den SysEx-Zugriff, bevor du es noch einmal versuchst.',
    sysexWarningTitle: 'SysEx-Zugriff nicht verfügbar.',
    sysexWarningBody:
      'Bänke und Sounds können nicht übertragen werden. Trenne MIDI, stelle die Verbindung erneut her und erlaube bei der Abfrage den SysEx-Zugriff.',
    log: 'MIDI-Protokoll',
    closeLog: 'MIDI-Protokoll schließen',
    entries: 'Letzte MIDI-Protokolleinträge',
    hideData: 'Daten ausblenden',
    viewData: 'Daten anzeigen',
    bytes: '{{count, number}} Bytes',
    completeSysex: 'Vollständige SysEx-Nachricht',
    copied: 'Kopiert',
    copyHex: 'Hex-Daten kopieren',
    copyUnavailable: 'Kopieren nicht verfügbar',
    downloadLog: 'Protokoll herunterladen',
  },
  banks: {
    addBankHelp: 'Gib der Bank einen Namen und importiere optional ihre Sounddaten.',
    catalogBank: 'DX7-Katalogbank',
    catalogSource: 'Aus dem DX7-Bankkatalog wählen',
    chooseCatalogBank: 'Soundbank auswählen…',
    creatingBank: 'Wird erstellt…',
    soundData: 'Sounddaten (optional)',
    soundDataHelp:
      'Jede neue Bank beginnt mit einer vollständigen Standard-DX7-Bank mit 32 Voices.',
    soundSource: 'Soundquelle wählen',
    soundSourceRequired: 'Wähle eine Katalogbank oder lade deine eigene DX7-SysEx-Datei hoch.',
    uploadSource: 'Eigene Bank hochladen',
    empty: 'Leer',
    importing: 'Importieren…',
    restoring: 'Wird zurückgesetzt…',
    catalogFactory: 'Werkssounds',
    catalogFm1Factory: 'FM-1-Werksvorlagen',
    import: 'DX7-Bank importieren…',
    moreActions: 'Bibliotheksaktionen',
    bankMenu: 'Aktionen für {{bank}}',
    bankInformation: 'Bankinformationen',
    bankInformationMenu: 'Bankinformationen…',
    bankInformationHelp: 'Bearbeite den Titel und die optionale Beschreibung dieser Bank.',
    download: 'Diese Bank herunterladen',
    downloadAll: 'SysEx-Bänke herunterladen (.zip)',
    restoreAll: 'Auf Werks-Sounds zurücksetzen…',
    sending: 'Senden…',
    send: 'An FM1 senden',
    bank: 'Bank {{bank}}',
    addBank: 'Neue Bank hinzufügen…',
    addBankTitle: 'Bank {{bank}} hinzufügen',
    bankName: 'Bankname',
    bankNameRequired: 'Gib einen Namen für die neue Bank ein.',
    chooseSysexFile: 'DX7-SysEx-Datei auswählen',
    createBank: 'Bank erstellen',
    addBankFailed: 'Die Bank konnte nicht erstellt werden.',
    destination: 'Zielbank',
    importFile: 'DX7-Bankdatei importieren',
    downloadTitle: '„{{bank}}“ als SysEx herunterladen',
    importFirst: 'Zuerst Bank {{bank}} importieren',
    deleteBank: 'Bank löschen',
    deleteBankMenu: 'Bank löschen…',
    deleteBankConfirm:
      '„{{name}}“ und alle enthaltenen Sounds löschen? Diese Aktion kann rückgängig gemacht werden.',
    sendTitle: 'Alle 32 Sounds senden und Zielbank am FM1 wählen',
    sentStatus: '„{{bank}}“ wurde gesendet. Wähle ihr Ziel am FM1.',
    notSent: 'Die Bank wurde nicht gesendet. Öffne das MIDI-Protokoll und versuche es erneut.',
    importFailed: 'Import fehlgeschlagen.',
    restoreFailed:
      'Die Bänke konnten nicht auf die Werks-Sounds zurückgesetzt werden. Versuche es erneut.',
    bankUnavailable:
      'Diese Bank ist nicht mehr verfügbar. Schließe diesen Dialog und versuche es erneut.',
    catalogUnavailable:
      'Diese Soundbank konnte nicht heruntergeladen werden. Prüfe deine Verbindung und versuche es erneut.',
    fileErrors: {
      size: 'Diese Datei ist {{bytes, number}} Bytes groß und enthält keine vollständige DX7-Bank. Eine Bankdatei ist {{expected, number}} Bytes groß oder ein Vielfaches davon, wenn sie mehrere Bänke enthält.',
      tooLarge:
        'Diese Datei ist zu groß. Eine Bankdatei kann bis zu {{count, number}} DX7-Bänke enthalten.',
      format: 'Diese Datei ist keine Yamaha-DX7-Bank mit 32 Stimmen.',
      damaged: 'Diese Datei scheint beschädigt zu sein. Lade sie erneut herunter.',
      voiceFormat:
        'Diese Datei ist kein DX7-Sound. Wähle eine .syx-Datei, die genau einen Sound enthält.',
      voiceGotBank:
        'Diese Datei ist eine DX7-Bank mit 32 Voices. Um sie zu laden, wähle „DX7-Bank importieren…“ im Menü der Bank.',
    },
    exportFailed: 'Export fehlgeschlagen.',
    bulkExportFailed: 'Sammel-Export fehlgeschlagen.',
    gridTitle: 'Sound-Bänke',
    gridDescription: 'Importiere, bearbeite und sortiere jede Bank vor der Übertragung zum FM1.',
    search: 'Suchen',
    noMatches: 'Keine Sounds entsprechen der Suche',
    searchResults: 'Suchergebnisse: „{{search}}“',
    sendFromSearch: 'Wählen Sie eine Bank, um sie an den FM1 zu senden',
    bankEmpty: 'Diese Bank ist leer',
    emptyHelp:
      'Lade die Demo-Bank oder importiere eine eigene Standard-DX7-SysEx-Bank mit 32 Voices.',
    loadDemo: 'Demo-Bank laden',
    editSelected: 'Bearbeiten',
    slotTitle: 'Klicken, um {{name}} auf dem FM1 zu spielen; Doppelklick zum Bearbeiten',
    slotEditBufferTitle:
      'Klicken, um {{name}} über den Bearbeitungspuffer des FM1 zu spielen; Doppelklick zum Bearbeiten',
    slotEditTitle: 'Doppelklicken oder Eingabetaste drücken, um {{name}} zu bearbeiten',
    sendPatch: '{{name}} an FM1 senden',
    auditioning: 'Vorhören',
    reorder: '{{name}} verschieben',
    reorderTitle:
      'Zum Sortieren ziehen, oder auf eine Bank, um den Sound dorthin zu kopieren; bei Fokus mit Pfeiltasten sortieren',
    copySelected: 'Kopieren nach…',
    copyDialogTitle: '{{name}} kopieren',
    copyTargetBank: 'Bank',
    copyTargetSlot: 'Slot',
    copyReplaces:
      'Dadurch wird „{{name}}“ in {{slot}} ersetzt. Du kannst diese Aktion rückgängig machen.',
    copyAction: '{{slot}} ersetzen',
    copyAndEditAction: '{{slot}} ersetzen und bearbeiten',
    copyToEditHint: 'Um diesen Sound zu bearbeiten, kopiere ihn in eine deiner Bänke.',
    copyFailed: 'Der Sound konnte nicht kopiert werden.',
    addBankOpenFailed:
      'Die Optionen für eine neue Bank konnten nicht geöffnet werden. Lade die Seite neu und versuche es erneut.',
    copyOpenFailed:
      'Die Kopieroptionen konnten nicht geöffnet werden. Lade die Seite neu und versuche es erneut.',
    importPatchFile: 'Sound importieren…',
    downloadPatchFile: 'Sound herunterladen',
    bankFileUnavailable:
      'Bankdateien konnten nicht gelesen werden. Lade die Seite neu und versuche es erneut.',
    patchFileUnavailable:
      'Sounddateien konnten nicht geöffnet werden. Lade die Seite neu und versuche es erneut.',
    everywhere: {
      workspace: 'Deine Sound-Bänke',
      savedBanks: 'Gespeicherte Bänke',
      catalog: 'Weitere DX7-Sound-Bänke',
      play: '{{name}} aus {{origin}} spielen',
      playTitle:
        'Klicken, um {{name}} über den Bearbeitungspuffer des FM1 zu spielen; Doppelklick zum Kopieren und Bearbeiten',
      copy: '{{name}} in eine Bank kopieren',
      truncated:
        'Die ersten {{shown}} von {{total}} Treffern werden angezeigt. Gib mehr ein, um die Suche einzugrenzen.',
      loading: 'Weitere DX7-Sound-Bänke werden durchsucht…',
      loadFailed:
        'Gespeicherte Bänke und weitere DX7-Sound-Bänke konnten nicht durchsucht werden. Lade die Seite neu und versuche es erneut.',
      playFailed: 'Der Sound konnte nicht gespielt werden.',
      copiesHidden: 'Doppelte Sounds werden nicht angezeigt.',
    },
    slotVirtualAnalogTitle:
      'Klicken, um {{name}} auf dem FM1 auszuwählen; er spielt das dort gespeicherte Virtual-Analog-Preset',
    slotVirtualAnalogAddedTitle:
      '{{name}} ist ein Virtual-Analog-Preset und spielt nur aus den Bänken A bis D des FM1',
    virtualAnalogPatch: 'Virtual-Analog-Preset',
    sentStatusWithInit:
      'Browser-Bank {{bank}} wurde gesendet, mit INIT VOICE anstelle ihres Virtual-Analog-Presets. Wähle ihr Ziel am FM1.',
    sentStatusWithInit_other:
      'Browser-Bank {{bank}} wurde gesendet, mit INIT VOICE anstelle ihrer {{count, number}} Virtual-Analog-Presets. Wähle ihr Ziel am FM1.',
    virtualAnalogInitNote:
      'Eine DX7-Bank hat keinen Platz für ein Virtual-Analog-Preset, darum wird das dieser Bank als INIT VOICE gesendet.',
    virtualAnalogInitNote_other:
      'Eine DX7-Bank hat keinen Platz für Virtual-Analog-Presets, darum werden die {{count, number}} dieser Bank als INIT VOICE gesendet.',
  },
  namedBanks: {
    saving: 'Wird gespeichert…',
    title: 'Meine gespeicherten Bänke',
    intro: 'Wähle eine gespeicherte Bank, die in „{{bank}}“ geladen wird.',
    saveCurrent: '„{{bank}}“ speichern',
    snapshotHelp: 'Erstellt eine unabhängige Kopie aller 32 Sounds und ihrer FM1-Effekte.',
    name: 'Bankname',
    namePlaceholder: 'z. B. Auftritt – Samstag',
    description: 'Beschreibung (optional)',
    descriptionPlaceholder: 'Notizen zu dieser Bank',
    save: 'Bank speichern',
    saveMenu: 'Bank speichern…',
    loadBank: 'Bank laden…',
    editDetails: 'Bankdetails bearbeiten',
    update: 'Details aktualisieren',
    savedBanks: 'Gespeicherte Bänke',
    count: '{{count, number}} gespeicherte Bank',
    count_other: '{{count, number}} gespeicherte Bänke',
    search: 'Gespeicherte Bänke durchsuchen',
    loading: 'Gespeicherte Bänke werden geladen…',
    empty: 'Noch keine gespeicherten Bänke. Speichere die ausgewählte Bank, um eine anzulegen.',
    noMatches: 'Keine gespeicherte Bank entspricht der Suche.',
    load: 'Laden',
    updatedAt: 'Aktualisiert am {{date}}',
    rename: '{{name}} bearbeiten',
    download: '{{name}} als SysEx herunterladen',
    downloadAction: 'SysEx-Datei herunterladen',
    duplicate: '{{name}} duplizieren',
    duplicateAction: 'Bank duplizieren',
    delete: '{{name}} löschen',
    deleteAction: 'Bank löschen',
    deleteConfirm: '„{{name}}“ dauerhaft aus diesem Browser löschen?',
    loadConfirm: 'Die 32 Sounds in „{{bank}}“ durch „{{name}}“ ersetzen?',
    replaceAction: 'Sounds ersetzen',
    operationFailed: 'Der Vorgang für die gespeicherte Bank ist fehlgeschlagen.',
    openFailed:
      'Die gespeicherten Bänke konnten nicht geöffnet werden. Lade die Seite neu und versuche es erneut.',
    loadFailed: 'Gespeicherte Bänke konnten nicht aus dem Browserspeicher geladen werden.',
    damagedBanks:
      'Einige gespeicherte Bänke konnten nicht gelesen werden und sind ausgeblendet. Sie bleiben unverändert im Browserspeicher.',
    saved: '„{{name}}“ gespeichert.',
    updated: '„{{name}}“ aktualisiert.',
    downloaded: '„{{name}}“ heruntergeladen.',
    copied: '„{{name}}“ erstellt.',
    deleted: '„{{name}}“ gelöscht.',
    loaded: '„{{name}}“ in „{{bank}}“ geladen.',
    downloadedWithInit:
      '„{{name}}“ wurde heruntergeladen, mit INIT VOICE anstelle seines Virtual-Analog-Presets.',
    downloadedWithInit_other:
      '„{{name}}“ wurde heruntergeladen, mit INIT VOICE anstelle seiner {{count, number}} Virtual-Analog-Presets.',
  },
  backup: {
    menuOtherFiles: 'Weitere Dateien',
    sysexContents: 'Nur DX7-Daten, keine FM1-Effekte',
    menuHeading: 'Sicherung',
    download: 'Sicherung herunterladen',
    restore: 'Aus Sicherung wiederherstellen…',
    lastBackup: 'Zuletzt gesichert: {{date}}',
    downloaded: 'Eine Sicherung deiner Bänke und gespeicherten Bänke wird heruntergeladen.',
    downloadedWithoutSavedBanks:
      'Eine Sicherung deiner Bänke wird heruntergeladen. Die gespeicherten Bänke konnten nicht gelesen werden und fehlen darin.',
    downloadedWithoutDamaged:
      'Eine Sicherung wird heruntergeladen. Einige gespeicherte Bänke konnten nicht gelesen werden und fehlen darin.',
    unavailable:
      'Sicherungen konnten nicht geöffnet werden. Lade die Seite neu und versuche es erneut.',
    unavailableUnsaved:
      'Die Sicherung konnte nicht erstellt werden. Lass diesen Tab geöffnet, denn deine letzten Änderungen sind nicht gespeichert, und versuche es erneut.',
    restoreTitle: 'Aus Sicherung wiederherstellen',
    restoreIntro:
      'Wähle eine Datei, die mit „Sicherung herunterladen“ erstellt wurde. Nichts ändert sich, bevor du bestätigst.',
    chooseFile: 'Sicherungsdatei auswählen',
    reading: 'Sicherung wird gelesen…',
    backedUpAt: 'Gesichert',
    workspaceBanks: 'Bänke',
    patches: 'Sounds',
    savedBanks: 'Gespeicherte Bänke',
    toAdd: 'Werden hinzugefügt',
    alreadyHere: 'Schon vorhanden, bleiben',
    unreadable: 'Nicht lesbar',
    workspaceEffect:
      'Deine Bänke und alle ihre Sounds werden durch die aus der Sicherung ersetzt. Mit „Rückgängig“ in der Benachrichtigung danach holst du sie zurück.',
    savedBanksEffect:
      'Gespeicherte Bänke werden nur hinzugefügt. Eine Bank, die schon in diesem Browser liegt, bleibt unverändert, und „Rückgängig“ entfernt die hinzugefügten nicht.',
    restoreAction: 'Sicherung wiederherstellen',
    restoring: 'Wird wiederhergestellt…',
    restored: 'Die Sicherung vom {{date}} wurde wiederhergestellt.',
    errors: {
      format:
        'Diese Datei ist keine Sicherung aus dieser App. Wähle eine .json-Datei, die mit „Sicherung herunterladen“ erstellt wurde.',
      newer:
        'Diese Sicherung stammt aus einer neueren Version der App. Lade die Seite neu, um sie zu aktualisieren, und versuche es erneut.',
      damaged:
        'Diese Sicherung ist beschädigt und kann nicht wiederhergestellt werden. Versuche eine andere Sicherungsdatei.',
      size: 'Diese Datei ist zu groß für eine Sicherung aus dieser App.',
      read: 'Die Datei konnte nicht gelesen werden. Wähle sie erneut aus.',
      savedBanksFailed:
        'Der Browserspeicher konnte die gespeicherten Bänke aus dieser Sicherung nicht aufnehmen, deshalb wurde deine Bibliothek nicht geändert. Versuche es erneut.',
    },
  },
} as const

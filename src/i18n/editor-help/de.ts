export default {
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
      'Legt die Frequenz fest, ab der das Filter wirkt. Die hörbare Richtung hängt vom gewählten Filtertyp ab.',
    'Filter Resonance':
      'Betont Frequenzen um die Grenzfrequenz. Höhere Werte klingen schärfer und ausgeprägter.',
    'Reverb Space': 'Wählt den Charakter des simulierten Raums: Raum, Halle oder helle Platte.',
    'Reverb Decay': 'Legt fest, wie lange die Hallfahne anhält.',
    'Reverb Mix': 'Mischt trockenes Signal und Hall. Bei 0 % hörst du nur den Originalklang.',
    'Delay Decay': 'Legt fest, wie lange die Echowiederholungen anhalten, bevor sie ausklingen.',
    'Delay Rate':
      'Legt die Zeit zwischen den Echos fest. Höhere Werte ändern den Abstand der Wiederholungen.',
    'Delay Mix': 'Mischt trockenes Signal und Echos. Bei 0 % hörst du nur den Originalklang.',
    'Distortion Gain':
      'Bestimmt, wie stark das Signal die Verzerrung antreibt. Höhere Werte fügen mehr Sättigung und Obertöne hinzu.',
    'Distortion Tone': 'Passt die Helligkeit des verzerrten Klangs an.',
    'Distortion Level':
      'Legt die Ausgangslautstärke nach der Verzerrung fest, nützlich zum Angleichen an die Lautstärke ohne Effekt.',
    'Chorus Frequency': 'Legt fest, wie schnell die Chorus-Bewegung schwingt.',
    'Chorus Depth':
      'Legt fest, wie weit die Tonhöhenbewegung des Chorus reicht. Höhere Werte klingen breiter und deutlicher.',
    'Chorus Mix': 'Mischt trockenes Signal und Chorus-Signal.',
    'Phaser Frequency': 'Legt fest, wie schnell der Phaser-Sweep schwingt.',
    'Phaser Depth': 'Legt Umfang und Intensität des Phaser-Sweeps fest.',
    'Phaser Mix': 'Mischt trockenes Signal und Phaser-Signal.',
  },
} as const

export default {
  dialogs: {
    bankTitle: 'Choisissez la banque de destination sur votre FM1',
    bankIntro:
      'Lorsque le FM1 est prêt, lancez le transfert SysEx et terminez l’importation sur l’appareil.',
    bankClose: 'Fermer les instructions de sélection',
    bankStep1: 'Attendez que l’écran de sélection de banque apparaisse sur le FM1.',
    bankStep2: 'Tournez le bouton 1, 2, 3 ou 4 pour choisir la banque A, B, C ou D.',
    bankStep3: 'Le FM1 enregistre automatiquement les 32 sons après un court délai.',
    bankFm1VaStep1:
      'Le FM1 demande « Replace Bank A? » et commence sur la banque A, quelle que soit la banque envoyée.',
    bankFm1VaStep2:
      'Tournez ALGORITHM jusqu’à ce que la question indique la banque de destination : A, B, C ou D.',
    bankFm1VaStep3:
      'Tournez SELECT jusqu’à Replace et appuyez sur SEL pour enregistrer les 32 sons, ou appuyez sur HOME pour annuler. Ils remplacent aussi définitivement les presets d’usine de cette banque.',
    bankFm1VaNote:
      'Si votre FM1 utilise le firmware de Baud Girl, il demande plutôt « Replace Bank A? » et commence sur la banque A. Tournez ALGORITHM jusqu’à la banque de destination, puis SELECT jusqu’à Replace, et appuyez sur SEL.',
    bankFeluccaNote:
      'Felucca ignore les banques DX7, donc envoyer cette banque ne modifie pas ses presets.',
    bankFeluccaOrSloopNote:
      'Felucca et SLOOP ignorent les banques DX7, donc envoyer cette banque ne modifie pas les presets du FM1.',
    bankFm1VaImage:
      'Écran du FM1 sous le firmware de Baud Girl demandant « Replace Bank A? », avec Cancel et Replace',
    bankImage:
      'Écran du FM1 sous le firmware de M-VAVE affichant « 32 Voice Save To … » au-dessus des banques A, B, C et D',
    dontShow: 'Ne plus afficher pendant cette session',
    midiTitle: 'Connectez le MIDI pour envoyer cette banque',
    midiIntro: 'Le FM1 doit être connecté comme sortie MIDI avant l’envoi d’une banque.',
    midiClose: 'Fermer le message de connexion MIDI',
    midiSteps:
      'Activez MIDI en ligne en haut de la page, autorisez l’accès MIDI, puis sélectionnez la sortie MIDI du FM1 dans les réglages.',
    restoreTitle: 'Rétablir les sons d’usine ?',
    restoreIntro:
      'Cette opération remplace les quatre banques. Vous pourrez annuler le rétablissement immédiatement.',
    restoreClose: 'Fermer le rétablissement',
    restoreDetails:
      'Les banques A, B, C et D seront respectivement rétablies avec les banques 1, 2, 3 et 4 du FM-1, les sons livrés avec le FM1.',
    restoreAction: 'Rétablir quatre banques',
    sourcesTitle: 'Trouver des banques DX7',
    sourcesIntro:
      'Téléchargez une banque SysEx DX7 de 32 voix (.syx), puis revenez ici et choisissez « Importer une banque DX7… ».',
    sourceDescriptions: {
      yamahaBlackBoxes: 'Cartouches DX7 d’usine et banques SysEx.',
      bobbyBlues: 'Collection de longue date de sons et de banques DX7.',
      soundarchive: 'Sélection de banques SysEx DX7, TX816 et TX802.',
      fm1FactoryPresets:
        'Les préréglages d’origine du FM-1, récupérés depuis l’outil de restauration M-VAVE. Aussi dans le catalogue de banques.',
    },
    sourcesClose: 'Fermer les sources de banques',
    sourcesSubmit: 'Vous avez programmé votre propre banque DX7 ?',
    sourcesSubmitLink: 'Proposez-la pour le catalogue de banques',
  },
  controlHelp: {
    algorithm:
      'Choisit comment les six opérateurs sont reliés. Les opérateurs du bas sont des porteuses que vous entendez directement ; ceux du dessus modifient le timbre des opérateurs situés en dessous.',
    feedback:
      'Réinjecte une partie d’un opérateur dans lui-même. Des valeurs élevées ajoutent des harmoniques plus brillantes et plus rugueuses, jusqu’à devenir bruitées.',
    pitchEnvelope:
      'Fait évoluer la hauteur pendant toute la durée de chaque note. Les quatre vitesses règlent la rapidité de chaque étape ; les quatre niveaux fixent la hauteur atteinte à chaque étape.',
    pitchEnvelopePresets:
      'Remplace les huit vitesses et niveaux par une forme de départ. Plate supprime tout mouvement de hauteur ; les autres ajoutent une brève pointe, une attaque qui chute, un glissé montant ou une chute au relâchement. Annuler rétablit l’enveloppe précédente.',
    effectPresets:
      'Règle les commandes de cet effet sur un point de départ. Activez l’effet pour en choisir un. Les autres effets ne changent pas, et Annuler rétablit les réglages précédents.',
    oscillatorSync:
      'Redémarre chaque opérateur à la même position de forme d’onde à chaque note. Activé, l’attaque est plus régulière ; désactivé, le son peut paraître plus organique.',
    lfoSync:
      'Redémarre le LFO à chaque nouvelle note. Activé, la modulation se répète à l’identique ; désactivé, chaque note rejoint le LFO qui tourne en continu.',
    lfoWave:
      'Choisit la forme répétée utilisée pour le vibrato et le trémolo. La sinusoïde est douce, le carré alterne entre deux valeurs et l’échantillonneur-bloqueur est aléatoire.',
    lfoSpeed:
      'Règle la vitesse de cycle du LFO. Augmentez-la pour un vibrato ou un trémolo plus rapide.',
    lfoDelay:
      'Retarde le LFO après le début d’une note, pour que le vibrato ou le trémolo arrive progressivement au lieu de démarrer aussitôt.',
    pitchModDepth:
      'Fixe l’amplitude maximale du mouvement de hauteur du LFO. La sensibilité de modulation de hauteur de chaque son détermine la part réellement entendue.',
    ampModDepth:
      'Fixe l’amplitude maximale du mouvement de volume du LFO. La sensibilité de modulation d’amplitude de chaque opérateur détermine sa réaction.',
    pitchModSensitivity:
      'Règle la force avec laquelle tout le son réagit à la modulation de hauteur du LFO. Des valeurs élevées donnent un vibrato plus large.',
    transpose:
      'Décale tout le son vers le haut ou le bas par demi-tons, sans changer les touches que vous jouez.',
    operator:
      'Un opérateur est un oscillateur doté de sa propre enveloppe. Les porteuses produisent le son audible ; les modulateurs transforment un autre opérateur pour créer des harmoniques.',
    outputLevel:
      'Règle la force de cet opérateur. Pour une porteuse, il agit surtout sur le volume ; pour un modulateur, sur la brillance et la richesse harmonique.',
    amplitudeEnvelope:
      'Façonne cet opérateur dans le temps. Faites glisser horizontalement pour changer la rapidité d’une étape, et verticalement pour changer son niveau. Pour un modulateur, elle façonne la brillance plutôt que le volume.',
    oscillatorMode:
      'Ratio suit le clavier et convient aux harmoniques accordées. Fixe utilise une fréquence constante, utile pour des sons métalliques, bruités ou percussifs.',
    coarse:
      'Règle le rapport de fréquence principal en mode Ratio, ou la plage de fréquence générale en mode Fixe. Les rapports entiers sonnent généralement harmoniques.',
    fine: 'Affine la fréquence de l’opérateur entre deux réglages grossiers. De petits changements peuvent ajouter de nouvelles harmoniques ou des battements.',
    ratioEntry:
      'Saisissez le rapport souhaité, par exemple 3,5. Grossier et Fin passent au rapport le plus proche que le FM1 peut jouer, et le champ l’affiche.',
    fixedFrequencyEntry:
      'Saisissez la fréquence souhaitée en hertz, par exemple 440 ou 1,2k. Grossier et Fin passent à la fréquence la plus proche que le FM1 peut jouer, et le champ l’affiche.',
    detune:
      'Décale légèrement cet opérateur de l’accord exact. De faibles valeurs épaississent le son ; des écarts plus grands créent des battements ou de la dissonance.',
    breakpoint:
      'Choisit la note du clavier où se rejoignent les échelles de niveau gauche et droite. L’échelle modifie le niveau de cet opérateur selon la zone du clavier.',
    leftDepth:
      'Règle l’ampleur du changement de niveau de cet opérateur sur les notes situées sous le point de coupure.',
    rightDepth:
      'Règle l’ampleur du changement de niveau de cet opérateur sur les notes situées au-dessus du point de coupure.',
    curve:
      'Choisit le sens et la forme du changement de niveau en s’éloignant du point de coupure. Linéaire change régulièrement ; exponentielle change plus fortement vers une extrémité.',
    rateScaling:
      'Fait avancer l’enveloppe de cet opérateur plus vite sur les notes aiguës, comme la décroissance plus courte de nombreux instruments acoustiques.',
    velocity:
      'Règle l’influence de la vélocité sur le niveau de cet opérateur. Sur une porteuse, elle agit sur le volume ; sur un modulateur, sur la brillance.',
    ampModSensitivity:
      'Règle la réaction de cet opérateur à la modulation d’amplitude du LFO. Sur une porteuse, cela crée un trémolo ; sur un modulateur, cela anime le timbre.',
  },
  effectHelp: {
    Filter:
      'Retire une partie du spectre de fréquences. Utilisez-le pour assombrir, amincir ou remodeler le son FM final.',
    Reverb:
      'Ajoute des réflexions de pièce simulées, pour donner au son une sensation d’espace et de distance.',
    Delay:
      'Répète le son après un court instant. Le déclin, proche d’un retour de signal, règle la durée des échos.',
    Distortion:
      'Ajoute de la saturation et des harmoniques supplémentaires. Elle peut rendre les sons doux plus denses ou les sons agressifs plus intenses.',
    Chorus: 'Ajoute des copies légèrement décalées du son pour plus de largeur et de mouvement.',
    Phaser: 'Fait balayer une série d’encoches dans le son, pour un caractère creux et mouvant.',
    Bitcrush:
      'Arrondit le son à moins de niveaux et l’échantillonne moins souvent, pour un grain lo-fi. Seul le firmware de Baud Girl à partir de FM-1_096 le joue. Aucun message MIDI ne le règle : on l’entend une fois le son écrit sur le FM1 avec Envoyer au FM1 ou Écrire des sons sur le FM1.',
  },
  effectParameterHelp: {
    'Filter Type':
      'Choisit ce que le filtre conserve : le passe-bas garde les graves, le passe-haut les aigus et le passe-bande une bande médiane.',
    'Filter Cutoff':
      'Fixe la fréquence à partir de laquelle le filtre agit, d’environ 100 Hz à 0 jusqu’à 20 kHz à 107. Son effet audible dépend du type de filtre choisi.',
    'Filter Resonance':
      'Accentue les fréquences autour de la coupure. Des valeurs élevées donnent un son plus pointu et plus marqué.',
    'Reverb Space': 'Choisit le caractère de l’espace simulé : pièce, salle ou plaque brillante.',
    'Reverb Decay': 'Règle la durée de la queue de réverbération.',
    'Reverb Mix':
      'Équilibre le son sec et la réverbération. À 0 %, vous n’entendez que le son d’origine.',
    'Delay Decay':
      'Règle la part de chaque écho réinjectée dans le délai. Des valeurs plus élevées donnent plus de répétitions avant qu’elles ne s’éteignent.',
    'Delay Rate':
      'Règle le temps entre les échos. Des valeurs plus élevées les rapprochent, d’environ 0,8 seconde à 0 jusqu’à 0,1 seconde à 100.',
    'Delay Mix': 'Équilibre le son sec et les échos. À 0 %, vous n’entendez que le son d’origine.',
    'Distortion Gain':
      'Règle la force avec laquelle le signal attaque la distorsion. Des valeurs élevées ajoutent plus de saturation et d’harmoniques.',
    'Distortion Tone': 'Ajuste la brillance du son distordu.',
    'Distortion Level':
      'Règle le volume de sortie après la distorsion, utile pour retrouver le niveau sans effet.',
    'Distortion Type':
      'Choisit comment la distorsion façonne le son sur le firmware de Baud Girl. L’écrêtage doux, l’original de M-VAVE, arrondit les crêtes ; l’écrêtage dur les coupe net pour un grain plus rude ; Foldback les replie pour un timbre plus brillant et métallique. Aucun message MIDI ne le règle : on l’entend une fois le son écrit sur le FM1 avec Envoyer au FM1 ou Écrire des sons sur le FM1.',
    'Chorus Frequency': 'Règle la vitesse de cycle du mouvement du chorus, d’environ 0,1 à 1 Hz.',
    'Chorus Depth':
      'Règle l’amplitude du mouvement de hauteur du chorus. Des valeurs élevées sonnent plus larges et plus marquées.',
    'Chorus Mix': 'Équilibre le son sec et le signal traité par le chorus.',
    'Phaser Frequency': 'Règle la vitesse de cycle du balayage du phaser, d’environ 0,5 à 6 Hz.',
    'Phaser Depth': 'Règle l’étendue et l’intensité du balayage du phaser.',
    'Phaser Mix': 'Équilibre le son sec et le signal traité par le phaser.',
    'Bitcrush Bits':
      'Règle le nombre de niveaux auxquels l’onde est arrondie, de 16, qui sonne net, jusqu’à 1. Un son discret peut disparaître aux réglages les plus bas.',
    'Bitcrush Sample Rate':
      'Règle la fréquence d’échantillonnage du son, de 300 Hz à 44,1 kHz. Les fréquences basses ajoutent des harmoniques rudes et métalliques.',
    'Bitcrush Mix': 'Dose le son net et le son broyé. À 0 %, on n’entend que le son d’origine.',
  },
  distortionType: {
    softClip: 'Écrêtage doux',
    hardClip: 'Écrêtage dur',
    foldback: 'Foldback',
    unknown: 'Inconnu ({{value, number}})',
    noRecord: 'Ce son ne vient pas du FM1 : il prend le type du preset sur lequel il est écrit.',
    otherFirmware:
      'Conservé pour le firmware de Baud Girl : {{type}}. Ce FM1 joue sa propre distorsion à la place.',
  },
  bitcrush: {
    hertz: '{{value}}Hz',
    kilohertz: '{{value}}k',
    noRecord:
      'Ce son ne vient pas du FM1 : il prend le Bitcrush du preset sur lequel il est écrit.',
    otherFirmware:
      'Conservé pour le firmware de Baud Girl à partir de FM-1_096 : Bitcrush est activé. Ce FM1 ne le joue pas.',
  },
  effectOrder: {
    dragTitle:
      'Faites glisser pour changer la place de cet effet dans le trajet du son, le premier en haut à gauche. Au clavier, appuyez sur Espace, puis sur les flèches. Le nouvel ordre s’entend une fois le son écrit sur le FM1.',
    noRecord: 'Ce son ne vient pas du FM1 : il prend l’ordre du preset sur lequel il est écrit.',
    otherFirmware:
      'Conservé pour le firmware de Baud Girl : un ordre des effets modifié. Ce FM1 joue les effets dans son propre ordre.',
  },
  virtualAnalog: {
    help: {
      waveform:
        'L’onde de base de l’oscillateur. Le sinus est doux, la dent de scie brillante et bourdonnante, le triangle entre les deux, et le carré creux mais plus dur que le sinus.',
      super:
        'Ajoute six copies de l’onde autour de celle choisie. Montez aussi le désaccord pour les écarter en un son épais, façon supersaw.',
      detune:
        'L’écart de hauteur entre les copies ajoutées par Super. Sans effet tant que Super est à 0.',
      drift:
        'Désaccorde légèrement chaque note, comme le font les oscillateurs anciens. Dans la moitié haute, cela devient instable à dessein.',
      sub: 'Ajoute une onde carrée une octave sous chaque note, pour du poids.',
      noise: 'Mêle du souffle à l’onde.',
      pwm: 'Fait varier la largeur de l’onde carrée pour que le timbre bouge tout seul. Ne fonctionne qu’avec la forme d’onde carrée.',
      filterType:
        'La partie du son que le filtre retire. Le passe-bas retire les aigus, en douceur à 12 dB ou nettement à 24 dB ; le passe-bande garde une bande autour de la coupure ; le passe-haut retire les graves.',
      cutoff: 'La fréquence à partir de laquelle le filtre agit. Baissez-la pour assombrir le son.',
      resonance: 'Accentue le son juste à la coupure, jusqu’à faire siffler le filtre.',
      filterEnvelope: 'De combien l’enveloppe propre du filtre déplace la coupure à chaque note.',
      filterDecay:
        'La durée du mouvement de l’enveloppe du filtre. Courte, avec beaucoup d’enveloppe, elle donne un son pincé.',
      filterShape: 'L’allure du mouvement de l’enveloppe du filtre, de la montée à la descente.',
      filterVelocity: 'De combien jouer plus fort ouvre la coupure. Le volume ne change pas.',
      keyTracking: 'À quel point la coupure suit les notes jouées plus haut sur le clavier.',
      lfoToCutoff: 'De combien le LFO déplace la coupure.',
      level: 'Le volume de ce son par rapport aux autres, environ 0,74 dB par pas.',
      velocityToLevel:
        'De combien une note devient plus forte quand vous jouez plus fort. À 0, toutes les notes ont le même volume.',
      mono: 'Joue une note à la fois. Une nouvelle touche prend le relais de celle tenue sans nouvelle attaque.',
      envelope:
        'Une attaque, un déclin, un maintien et un relâchement pour tout le son quand elle est activée. Faites glisser ses points ou tapez les valeurs. Le relâchement éteint une note en 0,1 seconde à 0 et en 2 secondes à 100. Montez le maintien en l’activant, car à 0 une note tenue est courte.',
    },
    oscillator: 'Oscillateur',
    waveform: 'Forme d’onde',
    waveforms: {
      sine: 'Sinus',
      saw: 'Dent de scie',
      triangle: 'Triangle',
      square: 'Carré',
    },
    super: 'Super',
    detune: 'Désaccord',
    drift: 'Dérive',
    sub: 'Sub',
    noise: 'Bruit',
    pwm: 'PWM',
    filter: 'Filtre',
    filterType: 'Type de filtre',
    filterTypes: {
      lowPass12: 'Passe-bas 12 dB',
      lowPass24: 'Passe-bas 24 dB',
      bandPass: 'Passe-bande',
      highPass: 'Passe-haut',
    },
    cutoff: 'Coupure',
    resonance: 'Résonance',
    filterEnvelope: 'Quantité d’enveloppe',
    filterDecay: 'Déclin d’enveloppe',
    filterShape: 'Forme d’enveloppe',
    filterVelocity: 'Vélocité',
    keyTracking: 'Suivi de clavier',
    lfoToCutoff: 'LFO vers la coupure',
    level: 'Niveau',
    velocityToLevel: 'Vélocité vers le niveau',
    mono: 'Monophonique',
    lfo: 'LFO',
    envelope: 'Enveloppe',
    attack: 'Attaque',
    decay: 'Déclin',
    sustain: 'Maintien',
    release: 'Relâchement',
    checking: 'Vérification du preset {{preset}} du FM1…',
    noProgram:
      'Ce son n’est pas dans les banques A–D : aucun preset du FM1 ne le joue. Vos modifications s’entendent une fois le son écrit sur le FM1.',
    noFirmware:
      'Avec le firmware de Baud Girl FM-1_086 ou plus récent et le MIDI activé, vos modifications jouent sur le FM1 dès que vous les faites. D’ici là, elles s’entendent une fois le son écrit sur le FM1.',
    otherEngine:
      'Le preset {{preset}} du FM1 n’est pas un preset Virtual Analog : vos modifications ne lui sont pas envoyées. Elles s’entendent une fois le son écrit sur le FM1.',
    readFailed:
      'Le FM1 n’a pas répondu quand on lui a demandé son preset {{preset}} : vos modifications ne lui sont pas envoyées. Elles s’entendent une fois le son écrit sur le FM1.',
    presets: 'Préréglages de son',
    initPatch: 'Initialiser',
    initPatchHelp: 'Simple onde en dents de scie, filtre ouvert. Effets coupés.',
    randomiseHelp: 'Nouveau son. Nom, niveau et effets gardés.',
    presetOptions: {
      'super-saw': {
        name: 'Super dents de scie',
        description: 'Dents de scie désaccordées, chorus et grande salle.',
      },
      'mono-bass': {
        name: 'Basse mono',
        description: 'Carré et sub, une note à la fois.',
      },
      'filter-pluck': {
        name: 'Pincement filtré',
        description: 'Balayage de filtre court, écho et petite pièce.',
      },
      'warm-pad': {
        name: 'Nappe chaude',
        description: 'Attaque lente, légère dérive et grande salle.',
      },
      'pulse-strings': {
        name: 'Cordes à impulsion',
        description: 'Onde carrée mouvante, chorus et grande salle.',
      },
      'vibrato-lead': {
        name: 'Lead vibrato',
        description: 'Une note à la fois, vibrato retardé et écho.',
      },
    },
  },
  ui: {
    auditionGroup: 'Écoute de l’opérateur {{number}}',
    mute: 'Couper',
    unmute: 'Rétablir',
    solo: 'Solo',
    unsolo: 'Désactiver solo',
    auditionAction: '{{action}} l’opérateur {{number}} pour l’écoute',
    auditionTemporary: '{{action}} temporairement l’opérateur {{number}}',
    auditionConnect:
      '{{action}} l’opérateur {{number}} ; connectez le MIDI pour entendre les changements',
    operatorOutput: 'Niveau de sortie de l’opérateur {{number}}',
    oscillator: 'Oscillateur',
    mode: 'Mode',
    coarse: 'Grossier',
    fine: 'Fin',
    detune: 'Désaccord',
    ratioEntry: 'Ratio',
    fixedFrequencyEntry: 'Fréquence (Hz)',
    ratioEntryInvalid: 'Saisissez le rapport sous forme de nombre, par exemple 3,5.',
    fixedFrequencyEntryInvalid: 'Saisissez la fréquence en hertz, par exemple 440.',
    keyboardScaling: 'Suivi du clavier',
    breakpoint: 'Point de coupure',
    left: 'Gauche',
    right: 'Droite',
    leftDepth: 'Profondeur gauche',
    rightDepth: 'Profondeur droite',
    rateScaling: 'Suivi de vitesse',
    leftCurve: 'Courbe gauche',
    rightCurve: 'Courbe droite',
    velocity: 'Vélocité',
    ampModSensitivity: 'Sens. mod. amplitude',
    lfoWave: 'Forme d’onde LFO',
    dx7Algorithm: 'Algorithme DX7',
    unsavedBody:
      'Enregistrez cette copie dans votre bibliothèque, ou abandonnez-la et restaurez le son enregistré sur le FM1.',
    revertTitle:
      'Abandonner toutes les modifications depuis le dernier enregistrement et restaurer ce son sur le FM1',
    keyboard: 'Clavier',
    pianoKeyboard: 'Clavier piano',
    dragKeyboard: 'Déplacer le clavier',
    closeKeyboard: 'Fermer le clavier',
    keyLevel: 'Niveau',
    phrase: 'Phrase',
    play: 'Lecture',
    stop: 'Arrêt',
    playPhrase: 'Lire la phrase',
    stopPhrase: 'Arrêter la phrase',
    tempo: 'Tempo',
    tempoValue: '{{tempo}} BPM',
    phrases: {
      pad: 'Nappe',
      electricPiano: 'Piano électrique',
      bass: 'Basse',
      lead: 'Mélodie',
      arpeggio: 'Arpège',
      velocityRamp: 'Rampe de vélocité',
    },
    helpOpenFailed: 'Impossible d’ouvrir le guide. Rechargez la page et réessayez.',
    keyboardOpenFailed: 'Impossible d’ouvrir le clavier. Rechargez la page et réessayez.',
    shiftOctave: 'Décaler l’octave vers le {{direction}}',
    playNote: 'Jouer {{note}}',
    helpFor: 'Aide : {{label}}',
    rotaryTitle: '{{label}} : {{value}}. Faites glisser vers le haut ou le bas pour régler.',
    envelopePoint: '{{title}}, point {{point}}',
    envelopePointValue: 'Vitesse {{rate}}, niveau {{level}}',
    envelopeRate: '{{title}}, vitesse {{point}}',
    envelopeLevel: '{{title}}, niveau {{point}}',
    chooseAlgorithm: 'Algorithme {{number}}. Choisir l’algorithme',
    algorithmNumber: 'Algorithme {{number}}',
    operatorSummary: 'Opérateur {{number}}, {{role}}',
    operatorSummaryWithAudition: 'Opérateur {{number}}, {{role}}, {{audition}}',
    operatorMuted: 'coupé',
    operatorSoloed: 'en solo',
    operatorMenu: 'Actions de l’opérateur {{number}}',
    copyOperatorAction: 'Copier l’opérateur {{number}}',
    pasteOperatorAction: 'Coller l’opérateur {{source}}',
    pasteOperatorFromPatchAction: 'Coller l’opérateur {{source}} de « {{patch}} »',
    pasteOperatorEmpty: 'Coller (copiez d’abord un opérateur ou son enveloppe)',
    copyEnvelopeAction: 'Copier l’enveloppe de l’opérateur {{number}}',
    pasteEnvelopeAction: 'Coller l’enveloppe de l’opérateur {{source}}',
    pasteEnvelopeFromPatchAction: 'Coller l’enveloppe de l’opérateur {{source}} de « {{patch}} »',
    lfoWaves: {
      triangle: 'Triangle',
      sawDown: 'Dent de scie descendante',
      sawUp: 'Dent de scie montante',
      square: 'Carré',
      sine: 'Sinus',
      sampleAndHold: 'Échantillonneur-bloqueur',
    },
    oscillatorModes: {
      ratio: 'Ratio',
      fixed: 'Fixe',
    },
    curves: {
      negativeLinear: '− Linéaire',
      negativeExponential: '− Exponentielle',
      positiveExponential: '+ Exponentielle',
      positiveLinear: '+ Linéaire',
    },
    directionDown: 'bas',
    directionUp: 'haut',
    effects: {
      filter: 'Filtre',
      reverb: 'Réverbération',
      delay: 'Délai',
      distortion: 'Distorsion',
      chorus: 'Chorus',
      phaser: 'Phaser',
      bitcrush: 'Bitcrush',
    },
    parameters: {
      depth: 'Profondeur',
      type: 'Type',
      cutoff: 'Coupure',
      resonance: 'Résonance',
      space: 'Espace',
      decay: 'Déclin',
      mix: 'Mixage',
      rate: 'Vitesse',
      gain: 'Gain',
      tone: 'Tonalité',
      level: 'Niveau',
      frequency: 'Fréquence',
      bits: 'Bits',
      sampleRate: 'Échantillonnage',
    },
    options: {
      lowPass: 'Passe-bas',
      bandPass: 'Passe-bande',
      highPass: 'Passe-haut',
      room: 'Pièce',
      hall: 'Salle',
      plate: 'Plaque',
    },
  },
  replacePatch: {
    replacing: 'Remplacement…',
    action: 'Remplacer le son',
    title: 'Remplacer {{slot}} « {{patch}} » ?',
    warning:
      'Le son de cet emplacement sera remplacé par celui du fichier, et ses effets FM1 reviendront à leurs valeurs par défaut.',
  },
  bankFile: {
    legend: 'Banques de ce fichier',
    help: 'Ce fichier contient une banque DX7.',
    help_other: 'Ce fichier réunit {{count, number}} banques DX7. Choisissez celle à importer.',
    damagedBanks: 'L’une d’elles est endommagée et ne peut pas être importée.',
    damagedBanks_other:
      '{{count, number}} d’entre elles sont endommagées et ne peuvent pas être importées.',
    bank: 'Banque {{number}}',
    option: '{{bank}} : {{contents}}',
    damaged: 'Endommagée',
  },
  overwriteImport: {
    titleEmpty: 'Importer dans « {{bank}} »',
    actionEmpty: 'Importer la banque',
    action: 'Remplacer le contenu',
    help: 'Choisissez un fichier de banque SysEx DX7 standard de 32 voix.',
    play: 'Écouter {{name}}, son {{number}}',
    previewHelp:
      'Cliquez sur un son pour l’écouter sur le FM1. Votre banque reste inchangée tant que vous ne la remplacez pas.',
    previewTitle: 'Sons de ce fichier',
    title: 'Importer par-dessus « {{bank}} » ?',
    warning: 'Le contenu actuel de la banque sera effacé et remplacé par les sons importés.',
  },
  fm1VaImport: {
    menuItem: 'Importer un fichier de presets Baud Girl…',
    menuRead: 'Lire les presets du FM1…',
    menuHeading: 'Baud Girl (FM-1+VA)',
    title: 'Importer un fichier de presets Baud Girl',
    titleRead: 'Lire les presets du FM1',
    help: 'Choisissez un fichier de presets du Device Manager de Baud Girl : une sauvegarde de « Back up everything » ou un preset enregistré avec « Save as a file ».',
    warning:
      'Chaque banque importée remplace la banque que vous choisissez pour elle, ou s’ajoute comme nouvelle banque. Vous pourrez l’annuler.',
    partialFile:
      'Ce fichier contient un preset. Seul son emplacement change ; les autres emplacements gardent leur son.',
    partialFile_other:
      'Ce fichier contient {{count, number}} presets. Seuls leurs emplacements changent ; les autres emplacements gardent leur son.',
    file: 'Fichier de presets Baud Girl',
    read: 'Lire depuis le FM1',
    readUnavailable:
      'Pour lire les presets du FM1, choisissez-le comme sortie et entrée MIDI, avec SysEx autorisé. La lecture nécessite le firmware de Baud Girl FM-1_079 ou plus récent.',
    reading: 'Lecture du preset {{number, number}} sur {{total, number}}…',
    stopReading: 'Arrêter la lecture',
    chooseFile: 'Choisir un fichier de presets de Baud Girl',
    previewTitle: 'Banques de ce fichier',
    previewHelp: 'Ouvrez une banque pour écouter ses sons sur le FM1.',
    previewTitleFm1: 'Banques sur le FM1',
    allMatch: 'Chaque son ici correspond à votre bibliothèque.',
    differs: 'Un point marque le seul son qui diffère de votre bibliothèque.',
    differs_other:
      'Un point marque chacun des {{count, number}} sons qui diffèrent de votre bibliothèque.',
    differingPatch: 'Diffère de votre bibliothèque',
    bankHeading: 'Banque {{bank}} du FM1',
    newBank: 'Une nouvelle banque',
    destination: 'Importer dans',
    bankSwitch: 'Importer la banque {{bank}} du FM1',
    damagedPreset: 'Endommagé',
    damagedPresets: 'Un preset est endommagé. Son emplacement garde son son.',
    damagedPresets_other:
      '{{count, number}} presets sont endommagés. Leurs emplacements gardent leurs sons.',
    eightBitPreset: '8-Bit',
    eightBitPresets:
      'Un preset est en 8-Bit, que la bibliothèque ne peut pas encore contenir. Son emplacement garde son son.',
    eightBitPresets_other:
      '{{count, number}} presets sont en 8-Bit, que la bibliothèque ne peut pas encore contenir. Leurs emplacements gardent leurs sons.',
    absentPreset: 'Absent du fichier',
    action: 'Importer une banque',
    action_other: 'Importer {{count, number}} banques',
    imported: 'Banque {{banks}} importée depuis le FM1.',
    imported_other: 'Banques {{banks}} importées depuis le FM1.',
    openFailed:
      'Impossible d’ouvrir l’importation des presets Baud Girl. Rechargez la page et réessayez.',
    errors: {
      size: 'Ce fichier fait {{bytes, number}} octets. Un fichier de presets de Baud Girl contient de 1 à 128 presets de {{size, number}} octets chacun.',
      format: 'Ce fichier n’est pas un fichier de presets de Baud Girl.',
      damaged:
        'Aucun preset de ce fichier n’a pu être lu. Enregistrez de nouveau le fichier dans le Device Manager de Baud Girl et réessayez.',
      unreadable: 'Le fichier n’a pas pu être lu.',
      readBusy:
        'Le FM1 ne peut pas envoyer ses presets pendant que son Sequencer joue. Arrêtez-le et relancez la lecture.',
      readNoReply: 'Le FM1 ne répond plus. Vérifiez sa connexion MIDI et relancez la lecture.',
      readStopped: 'La lecture s’est arrêtée car les ports MIDI ont changé. Relancez la lecture.',
      readFailed:
        'Le FM1 n’a pas pu envoyer ses presets. Relancez la lecture ou choisissez un fichier de presets de Baud Girl.',
    },
  },
  fm1VaWrite: {
    menuItem: 'Écrire des sons sur le FM1…',
    title: 'Écrire des sons sur le FM1',
    help: 'Écrit les sons de votre bibliothèque sur les presets du FM1. Seuls les sons qui diffèrent sont écrits.',
    source: 'Écrire depuis',
    bankSwitch: 'Écrire dans la banque {{bank}} du FM1',
    differs: 'Un son diffère.',
    differs_other: '{{count, number}} sons diffèrent.',
    same: 'Tous les sons correspondent.',
    nothing: 'Rien à écrire.',
    virtualAnalogKept:
      'Un preset Virtual Analog est conservé : seul un son Virtual Analog peut le remplacer.',
    virtualAnalogKept_other:
      '{{count, number}} presets Virtual Analog sont conservés : seuls des sons Virtual Analog peuvent les remplacer.',
    eightBitKept:
      'Un preset 8-Bit est conservé, car la bibliothèque ne peut pas encore contenir de sons 8-Bit.',
    eightBitKept_other:
      '{{count, number}} presets 8-Bit sont conservés, car la bibliothèque ne peut pas encore contenir de sons 8-Bit.',
    inexact:
      'Un son Virtual Analog ne peut pas être enregistré à l’identique : son preset est conservé.',
    inexact_other:
      '{{count, number}} sons Virtual Analog ne peuvent pas être enregistrés à l’identique : leurs presets sont conservés.',
    eightBitPatch:
      'Un son a été lu depuis un preset 8-Bit et ne peut pas être écrit : son preset est conservé.',
    eightBitPatch_other:
      '{{count, number}} sons ont été lus depuis des presets 8-Bit et ne peuvent pas être écrits : leurs presets sont conservés.',
    replaces: '{{number}} {{replaces}} → {{name}}',
    action: 'Écrire un son…',
    action_other: 'Écrire {{count, number}} sons…',
    confirmTitle: 'Remplacer ces presets sur le FM1 ?',
    confirmWarning:
      'Chaque preset est remplacé aussitôt, et le FM1 ne peut pas l’annuler. Enregistrez d’abord une sauvegarde avec « Back up everything » dans le Device Manager de Baud Girl.',
    confirm: 'Écrire un son',
    confirm_other: 'Écrire {{count, number}} sons',
    writing: 'Écriture du son {{number, number}} sur {{total, number}}…',
    stop: 'Arrêter après ce son',
    written: 'Un son a été écrit sur le FM1.',
    written_other: '{{count, number}} sons ont été écrits sur le FM1.',
    stopped:
      'Arrêté après {{count, number}} sons sur {{total, number}}. Les autres sont inchangés.',
    openFailed: 'Impossible d’ouvrir l’écriture sur le FM1. Rechargez la page et réessayez.',
    errors: {
      mismatch:
        'Le preset {{number}} ne s’est pas relu tel qu’écrit, l’écriture s’est donc arrêtée après {{count, number}} sons sur {{total, number}}.',
      failed:
        'L’écriture s’est arrêtée après {{count, number}} sons sur {{total, number}}. Vérifiez la connexion MIDI du FM1.',
    },
  },
  changeToFm: {
    menuItem: 'Passer en FM…',
    title: 'Passer {{slot}} « {{patch}} » en FM ?',
    warning:
      'Cela remplace le preset Virtual Analog de cet emplacement par INIT VOICE, un son FM que vous pouvez modifier. De son son, seuls les effets du FM1 sont conservés. Annuler le rétablit.',
    name: 'Nom',
    fm1Note:
      'Si le FM1 contient ce preset Virtual Analog, l’écriture sur le FM1 le laisse en place : effacez-le sur le FM1 pour y changer aussi de moteur.',
    action: 'Passer en FM',
    changed: '{{slot}} est passé en FM sous le nom « {{patch}} ».',
    openFailed: 'Le passage en FM n’a pas pu s’ouvrir. Rechargez la page et réessayez.',
  },
  fm1VaSend: {
    title: 'Envoyer {{bank}} au FM1',
    help: 'Écrit {{bank}} sur l’une des banques de presets du FM1. Seuls les sons qui diffèrent sont écrits.',
    destination: 'Écrire sur',
    favouritesShort:
      'Favoris contient un son, donc les autres presets de la banque du FM1 restent tels quels.',
    favouritesShort_other:
      'Favoris contient {{count, number}} sons, donc les autres presets de la banque du FM1 restent tels quels.',
    bankTooltip:
      'Choisir une banque du FM1 sur laquelle écrire ces sons ; seuls ceux qui diffèrent sont écrits',
    favouritesTooltip:
      'Choisir une banque du FM1 sur laquelle écrire les 32 premiers favoris ; seuls ceux qui diffèrent sont écrits',
  },
  duplicates: {
    menuItem: 'Trouver les sons en double…',
    title: 'Sons en double',
    help: 'Sons dont les réglages de voix sont identiques, même sous un autre nom. Les effets FM1 ne sont pas comparés. Choisissez un son pour y aller et le jouer.',
    group: '{{name}} et une copie',
    group_other: '{{name}} et {{count, number}} copies',
    effectsDiffer: 'Leurs effets FM1 diffèrent.',
    settingsDiffer: 'Leurs réglages de preset Baud Girl diffèrent.',
    goTo: 'Aller à {{name}}, son {{number}} de {{bank}}',
    none: 'Aucun doublon : chaque son de vos banques a ses propres réglages de voix.',
    openFailed: 'Impossible d’afficher les sons en double. Rechargez la page et réessayez.',
  },
  persistence: {
    retryLoading: 'Réessayer',
    continueSessionOnly: 'Continuer sans enregistrer',
    retrySaving: 'Réessayer l’enregistrement',
    technicalDetails: 'Détails techniques',
    sessionOnlyTitle: 'Bibliothèque temporaire',
    sessionOnlyBody:
      'Les données existantes du navigateur n’ont pas été modifiées. Les changements de cette session seront perdus à la fermeture de cette page.',
    saveErrorTitle: 'Les changements ne sont pas enregistrés en sécurité',
    saveErrorBody:
      'Vos derniers changements restent disponibles ici, mais le navigateur n’a pas pu les enregistrer. Réessayez lorsque le stockage est disponible.',
    loadErrors: {
      unavailable: {
        title: 'Le stockage du navigateur est indisponible',
        body: 'La bibliothèque enregistrée n’a pas pu être ouverte. Ses données n’ont pas été modifiées.',
      },
      'read-failed': {
        title: 'Impossible de lire la bibliothèque enregistrée',
        body: 'Il peut s’agir d’un problème temporaire de stockage. Aucune bibliothèque de remplacement n’a été créée ni enregistrée.',
      },
      incompatible: {
        title: 'La bibliothèque enregistrée est incompatible ou endommagée',
        body: 'L’enregistrement existant a été laissé intact. Cette version ne peut pas l’ouvrir en sécurité.',
      },
      'write-failed': {
        title: 'Impossible de lire la bibliothèque enregistrée',
        body: 'Aucune bibliothèque de remplacement n’a été créée ni enregistrée.',
      },
    },
  },
  favourites: {
    title: 'Favoris',
    tabTitle: 'Afficher vos sons favoris',
    toggle: 'Favori : {{name}}',
    addTitle: 'Ajouter aux favoris',
    removeTitle: 'Retirer des favoris',
    added: '« {{patch}} » a été ajouté aux favoris.',
    removed: '« {{patch}} » a été retiré des favoris.',
    alreadyAdded: '« {{patch}} » est déjà dans les favoris.',
    addFailed: 'Le son n’a pas pu être ajouté aux favoris.',
    empty: 'Aucun favori pour l’instant',
    emptyHelp:
      'Sélectionnez le cœur d’un son, ou faites glisser un son sur Favoris, pour le garder ici. Les favoris peuvent être envoyés au FM1 comme une banque.',
    sendTitle:
      'Envoyer les 32 premiers favoris comme banque et choisir la banque de destination sur le FM1',
    addFirst: 'Ajoutez un favori avant d’envoyer les favoris',
    initNote:
      'Une banque contient 32 sons : l’envoi des favoris remplit donc le dernier emplacement avec INIT VOICE.',
    initNote_other:
      'Une banque contient 32 sons : l’envoi des favoris remplit donc les {{count, number}} derniers emplacements avec INIT VOICE.',
    leftOutNote:
      'Une banque contient 32 sons : seuls les 32 premiers favoris sont envoyés. Le dernier reste ici.',
    leftOutNote_other:
      'Une banque contient 32 sons : seuls les 32 premiers favoris sont envoyés. Les {{count, number}} derniers restent ici.',
    sent: 'Les favoris ont été envoyés. Choisissez leur destination sur le FM1.',
    sentWithInit:
      'Les favoris ont été envoyés, avec INIT VOICE dans le dernier emplacement. Choisissez leur destination sur le FM1.',
    sentWithInit_other:
      'Les favoris ont été envoyés, avec INIT VOICE dans les {{count, number}} derniers emplacements. Choisissez leur destination sur le FM1.',
    sentLeftOut:
      'Les 32 premiers favoris ont été envoyés ; le dernier a été laissé de côté. Choisissez leur destination sur le FM1.',
    sentLeftOut_other:
      'Les 32 premiers favoris ont été envoyés ; les {{count, number}} derniers ont été laissés de côté. Choisissez leur destination sur le FM1.',
    sendUnavailable: 'Impossible de préparer l’envoi des favoris. Rechargez la page et réessayez.',
    savedWithFavourites:
      '« {{patch}} » a été enregistré dans la bibliothèque et dans sa copie des favoris.',
    savedWithBanks:
      '« {{patch}} » a été enregistré dans les favoris et dans les emplacements de banque qui le contenaient.',
  },
  toasts: {
    midiPanicSent: 'Panique MIDI envoyée. Toutes les notes du canal des notes ont été relâchées.',
    notifications: 'Actions terminées',
    dismiss: 'Fermer la notification',
    undo: 'Annuler',
    undone: 'Dernière modification annulée.',
    redone: 'Modification rétablie.',
    bankImported: 'Sons importés dans « {{bank}} ».',
    bankCreated: '« {{bank}} » a été créée.',
    bankDeleted: '« {{bank}} » a été supprimée.',
    banksRestored: 'Les quatre banques ont été rétablies avec les sons d’usine.',
    bankDownloadStarted: 'Téléchargement de « {{bank}} ».',
    banksDownloadStarted: 'Téléchargement de toutes les banques.',
    bankUpdated: '« {{bank}} » a été mise à jour.',
    demoLoaded: 'Sons de démonstration chargés dans « {{bank}} ».',
    patchSaved: '« {{patch}} » a été enregistré dans la bibliothèque.',
    patchCopied: '« {{patch}} » a été copié en {{slot}} dans « {{bank}} ».',
    patchReplaced: '{{slot}} a été remplacé par « {{patch}} ».',
    operatorCopied: 'L’opérateur {{number}} a été copié.',
    bankDownloadStartedWithInit:
      'Téléchargement de « {{bank}} », avec INIT VOICE à la place de son preset Virtual Analog.',
    bankDownloadStartedWithInit_other:
      'Téléchargement de « {{bank}} », avec INIT VOICE à la place de ses {{count, number}} presets Virtual Analog.',
    banksDownloadStartedWithInit:
      'Téléchargement de toutes les banques, avec INIT VOICE à la place d’un preset Virtual Analog.',
    banksDownloadStartedWithInit_other:
      'Téléchargement de toutes les banques, avec INIT VOICE à la place de {{count, number}} presets Virtual Analog.',
  },
  meta: {
    title: 'Éditeur et bibliothécaire M-VAVE FM1',
    description:
      'Modifiez, organisez et transférez des sons pour le synthétiseur M-VAVE FM1, avec importation de banques SysEx DX7.',
  },
  language: 'Langue',
  common: {
    close: 'Fermer',
    cancel: 'Annuler',
    settings: 'Réglages',
    channel: 'Canal {{number}}',
    loading: 'Chargement de l’éditeur…',
    loadingLibrary: 'Chargement de la bibliothèque',
    editorLoadErrorTitle: 'Impossible de charger l’éditeur.',
    editorLoadErrorBody:
      'L’application a peut-être été mise à jour ou la connexion a été interrompue. Rechargez pour utiliser la dernière version, ou revenez à la bibliothèque.',
    reloadApp: 'Recharger l’application',
    backToLibrary: 'Retour à la bibliothèque',
  },
  root: {
    subtitle: 'éditeur et bibliothécaire',
    intro:
      'Modifiez, organisez et transférez les sons du FM1, ou <link>importez des banques SysEx DX7</link>.',
    synthAlt: 'Panneau avant du synthétiseur M-VAVE FM1',
    unsupportedTitle: 'Navigateur non pris en charge.',
    unsupportedBody:
      'Ce bibliothécaire nécessite un navigateur compatible avec Web MIDI et SysEx, comme Chrome, Edge, Firefox ou Opera. Chrome sur Android fonctionne aussi.',
    localOnly: 'Vos sons restent dans ce navigateur',
    projectLinks: 'Liens du projet',
    firmwareLink: 'Firmwares du FM1',
    reportIssue: 'Signaler un problème',
    version: 'Version {{version}}',
    disclaimer:
      'Projet open source indépendant, non affilié à M-VAVE ou Yamaha et non approuvé par ces sociétés.',
  },
  settings: {
    description: 'Choisissez la langue de l’interface, les ports MIDI et les canaux.',
    output: 'Sortie',
    inputMonitor: 'Entrée de contrôle',
    firmware: 'Firmware du FM1',
    firmwareChecking: 'Vérification…',
    firmwareUnidentified: 'Non identifié',
    firmwareMvave: 'M-VAVE {{identity}}',
    firmwareFm1Va: 'Baud Girl {{identity}}',
    firmwareFelucca: 'Felucca {{identity}}',
    firmwareFeluccaOrSloop: 'Felucca ou SLOOP {{identity}}',
    firmwareEditBuffer: 'Les sons que vous jouez vont dans le tampon d’édition du FM1.',
    firmwareParameterChanges:
      'Les sons que vous jouez sont envoyés sous forme de changements de paramètres, pour que le FM1 ne les enregistre jamais sur le preset sélectionné.',
    firmwareIgnoresPatches:
      'Felucca joue vos notes mais ignore les sons DX7, les banques et les commandes d’effets.',
    firmwareFeluccaOrSloopIgnoresPatches:
      'Felucca et SLOOP annoncent tous deux ce nom. L’un comme l’autre joue vos notes mais ignore les sons DX7, les banques et les commandes d’effets.',
    firmwareNeedsInput:
      'Choisissez le FM1 comme entrée de contrôle pour que l’éditeur puisse lui demander quel firmware il utilise.',
    noteChannel: 'Canal des notes',
    fxChannel: 'Canal des effets',
    defaultChannel: 'Valeur FM1 par défaut : canal 2',
    noDevice: 'Aucun périphérique détecté',
    noDeviceSelected: 'Aucun périphérique sélectionné',
  },
  help: {
    open: 'Comment utiliser l’éditeur et le bibliothécaire FM1',
    title: 'Bienvenue dans l’éditeur et le bibliothécaire FM1',
    intro:
      'Gérez votre bibliothèque, façonnez les voix dans l’éditeur, puis transférez-les sur votre M-VAVE FM1, directement depuis le navigateur.',
    close: 'Fermer l’aide',
    truthTitle: 'Les banques de ce navigateur constituent la référence.',
    truthBody:
      'Le FM1 accepte les voix et les banques, mais ne peut pas renvoyer ses banques mémorisées. Importez ou restaurez les sons ici, modifiez-les, puis transférez-les vers le FM1.',
    firmwareTitle: 'Compatible Baud Girl (FM-1+VA)',
    firmwareBody: 'Fonctionne avec le firmware de M-VAVE comme avec celui de Baud Girl.',
    start: 'Commencer',
    stepsTitle: 'Premiers pas',
    sections: 'Sections du guide',
    shortcutsTitle: 'Raccourcis clavier',
    browsers: {
      title: 'Navigateurs compatibles',
      works: 'Fonctionne',
      unsupported: 'Non pris en charge',
      yours: 'Votre navigateur',
      desktop: 'Ordinateur',
      desktopAndAndroid: 'Ordinateur et Android',
    },
    shortcuts: {
      banks: 'Banques de sons',
      editor: 'Éditeur de voix',
      search: 'Aller à la recherche',
      clearSearch: 'Effacer la recherche',
      openSlot: 'Ouvrir l’emplacement allumé',
    },
    steps: {
      libraryTitle: 'Créez votre bibliothèque',
      libraryBody: 'Partez des banques d’usine du FM1 ou importez les vôtres.',
      editTitle: 'Modifiez et organisez',
      editBody: 'Ouvrez un son pour le modifier, puis enregistrez-le dans votre bibliothèque.',
      connectTitle: 'Connectez votre FM1',
      connectBody: 'Branchez le FM1 et activez MIDI en ligne.',
      transferTitle: 'Transférez les sons',
      transferBody: 'Cliquez sur un son pour l’écouter, ou envoyez une banque complète au FM1.',
    },
  },
  colorway: {
    legend: 'Couleur du FM1',
    option: 'Finition FM1 {{colour}}',
    black: 'Noir',
    purple: 'Violet',
    orange: 'Orange',
    blackGreen: 'Noir-vert',
    coolGray: 'Gris froid',
    whiteBlue: 'Blanc-bleu',
  },
  editor: {
    back: 'Retour aux banques',
    editName: 'Modifier le nom du son',
    patchName: 'Nom du son',
    unsaved: 'Modifications non enregistrées',
    presets: 'Préréglages de voix',
    presetsShort: 'Préréglages',
    presetOptions: {
      'soft-pad': {
        name: 'Nappe douce',
        description: 'Enveloppes lentes, chorus et hall.',
      },
      'bright-pluck': {
        name: 'Son pincé brillant',
        description: 'Décroissance nette, pièce et écho.',
      },
      'steady-organ': {
        name: 'Orgue stable',
        description: 'Sustain uniforme, chorus et phaser.',
      },
      'gentle-motion': {
        name: 'Mouvement doux',
        description: 'LFO retardé, chorus et hall doux.',
      },
      'warm-filter': {
        name: 'Filtre chaleureux',
        description: 'Filtre passe-bas et petite pièce.',
      },
      'wide-space': {
        name: 'Vaste espace',
        description: 'Chorus ample et réverbe de hall.',
      },
    },
    undo: 'Annuler',
    redo: 'Rétablir',
    save: 'Enregistrer dans la bibliothèque',
    moreSave: 'Autres options d’enregistrement',
    resend: 'Renvoyer au FM1',
    resendHelp: 'Renvoyer les réglages actuels de l’éditeur.',
    revert: 'Rétablir la version enregistrée',
    revertHelp: 'Abandonner les modifications et restaurer le son enregistré.',
    compare: 'Comparer avec la version enregistrée',
    compareShort: 'Comparer',
    stopComparing: 'Arrêter la comparaison et revenir à vos modifications',
    comparingTitle: 'Lecture du son enregistré',
    comparingBody:
      'L’édition est en pause. Appuyez sur Esc ou sur Comparer pour revenir à vos modifications.',
    configuration: 'Configuration du son',
    global: 'Global',
    effects: 'Effets',
    pitchEnvelope: 'Enveloppe de hauteur',
    pitchEnvelopePresets: 'Préréglages',
    pitchEnvelopePresetPlaceholder: 'Choisir…',
    pitchEnvelopePresetOptions: {
      flat: 'Plate',
      blipUp: 'Pointe d’attaque',
      attackDrop: 'Chute d’attaque',
      scoop: 'Glissé montant',
      releaseFall: 'Chute au relâchement',
    },
    effectPreset: 'Préréglage',
    effectPresetPlaceholder: 'Choisir…',
    effectPresetOptions: {
      warm: 'Chaud',
      muffled: 'Étouffé',
      telephone: 'Téléphone',
      thin: 'Fin',
      resonant: 'Résonant',
      lightDrive: 'Saturation légère',
      warmDrive: 'Saturation chaude',
      crunch: 'Craquant',
      fuzz: 'Fuzz',
      smallRoom: 'Petite pièce',
      largeRoom: 'Grande pièce',
      smallHall: 'Petite salle',
      largeHall: 'Grande salle',
      plate: 'Plaque',
      slapback: 'Slapback',
      quickDelay: 'Délai court',
      quickRepeats: 'Répétitions rapides',
      echo: 'Écho',
      subtleChorus: 'Chorus subtil',
      ensemble: 'Ensemble',
      chorusWash: 'Nappe de chorus',
      shimmer: 'Scintillement',
      gentlePhase: 'Phaser doux',
      slowSweep: 'Balayage lent',
      deepPhase: 'Phaser profond',
      fastSwirl: 'Tourbillon rapide',
      sampler: 'Échantillonneur',
      lofi: 'Lo-fi',
      eightBit: '8 bits',
      crushed: 'Écrasé',
    },
    lfoGlobal: 'LFO et paramètres globaux',
    oscillatorSync: 'Synchro oscillateur',
    lfoSync: 'Synchro LFO',
    lfoWave: 'Forme d’onde LFO',
    lfoSpeed: 'Vitesse LFO',
    lfoDelay: 'Retard LFO',
    pitchModDepth: 'Prof. modulation hauteur',
    ampModDepth: 'Prof. modulation amplitude',
    pitchModSensitivity: 'Sens. modulation hauteur',
    transpose: 'Transposition',
    operator: 'Opérateur {{number}}',
    operators: 'Opérateurs',
    fmOperators: 'Opérateurs FM',
    minimisePanel: 'Réduire {{panel}}',
    expandPanel: 'Développer {{panel}}',
    outputLevel: 'Niveau de sortie',
    amplitudeEnvelope: 'Enveloppe d’amplitude',
    algorithm: 'Algorithme',
    feedback: 'Retour de signal',
    carrier: 'Porteuse',
    carrierShort: 'Por',
    modulator: 'Modulateur',
    modulatorShort: 'Mod',
    output: 'Sortie',
    rate: 'Vitesse {{number}}',
    level: 'Niveau {{number}}',
    unsavedTitle: 'Modifications non enregistrées',
    keepEditing: 'Continuer la modification',
    discard: 'Abandonner',
    saveAndReturn: 'Enregistrer et revenir',
    initVoice: 'Initialiser',
    initVoiceHelp: 'Simple onde sinusoïdale. Effets coupés.',
    randomise: 'Aléatoriser',
    randomiseHelp: 'Nouvelle voix. Nom et effets gardés.',
  },
  midi: {
    activityTitle:
      'Activité MIDI : IN s’allume quand un message arrive de l’entrée MIDI, OUT quand l’éditeur en envoie un.',
    feluccaBadgeLabel: 'Firmware Felucca de Hügelton Instruments, {{release}}',
    feluccaBadgeTitle:
      'Le FM1 utilise le firmware Felucca de Hügelton Instruments, {{release}}. Il joue vos notes mais ignore les sons DX7, les banques et les commandes d’effets.',
    feluccaOrSloopBadgeLabel: 'Firmware Felucca ou SLOOP, {{release}}',
    feluccaOrSloopBadgeTitle:
      'Le FM1 utilise Felucca de Hügelton Instruments, ou SLOOP qui en est dérivé. Tous deux annoncent {{release}}, jouent vos notes mais ignorent les sons DX7, les banques et les commandes d’effets.',
    fm1VaBadgeLabel: 'Firmware de Baud Girl, {{release}}',
    fm1VaBadgeTitle:
      'Le FM1 utilise le firmware de Baud Girl (FM-1+VA), {{release}}. Les sons que vous jouez lui parviennent comme des modifications non enregistrées et n’écrasent jamais un preset.',
    mvaveBadgeLabel: 'Firmware de M-VAVE, {{release}}',
    mvaveBadgeTitle:
      'Le FM1 utilise le firmware d’origine de M-VAVE, {{release}}. Les sons que vous jouez vont dans son tampon d’édition.',
    panic: 'Panique MIDI',
    panicHelp:
      'Panique MIDI : envoie un note-off pour chaque note du canal des notes afin d’arrêter les notes bloquées',
    panicUnavailable: 'Panique MIDI : {{reason}}',
    online: 'MIDI en ligne',
    offline: 'MIDI hors ligne',
    connectFirst: 'Connectez d’abord une sortie MIDI',
    chooseOutput: 'Choisissez une sortie MIDI',
    switchOnFirst: 'Activez d’abord le MIDI',
    closeSysexWarning: 'Fermer l’avertissement SysEx',
    connecting: 'Connexion…',
    errors: {
      insecureContext:
        'Web MIDI nécessite une connexion sécurisée. Ouvrez l’éditeur en HTTPS ou sur localhost.',
      unsupportedBrowser:
        'Ce navigateur ne prend pas en charge Web MIDI. Utilisez un navigateur comme Chrome, Edge ou Firefox.',
      permissionDenied:
        'L’accès MIDI a été bloqué. Autorisez l’accès MIDI et SysEx pour ce site, puis reconnectez-vous. Dans Firefox, acceptez le module complémentaire d’autorisation du site lorsqu’il est proposé.',
      enableFailed:
        'Impossible de démarrer le MIDI. Vérifiez la connexion de l’appareil, puis réessayez.',
      disconnectFailed: 'Impossible de déconnecter le MIDI. Réessayez.',
    },
    reconnectForSysex: 'Reconnecter le MIDI avec SysEx',
    sysexRecovery:
      'Aucune donnée de banque n’a été envoyée. Reconnectez le MIDI et autorisez l’accès SysEx avant de réessayer.',
    sysexWarningTitle: 'L’accès SysEx n’est pas disponible.',
    sysexWarningBody:
      'Les banques et les sons ne peuvent pas être envoyés. Déconnectez le MIDI, reconnectez-le et autorisez l’accès SysEx lorsque vous y êtes invité.',
    log: 'Journal MIDI',
    closeLog: 'Fermer le journal MIDI',
    entries: 'Entrées récentes du journal MIDI',
    hideData: 'Masquer les données',
    viewData: 'Voir les données',
    bytes: '{{count, number}} octets',
    completeSysex: 'Message SysEx complet',
    copied: 'Copié',
    copyHex: 'Copier en hexadécimal',
    copyUnavailable: 'Copie indisponible',
    downloadLog: 'Télécharger le journal',
  },
  banks: {
    empty: 'Vide',
    importing: 'Importation…',
    restoring: 'Rétablissement…',
    catalogFactory: 'Sons d’usine',
    catalogFm1Factory: 'Préréglages d’usine FM-1',
    import: 'Importer une banque DX7…',
    moreActions: 'Actions de la bibliothèque',
    bankMenu: 'Actions pour {{bank}}',
    bankInformation: 'Informations sur la banque',
    bankInformationMenu: 'Informations sur la banque…',
    bankInformationHelp: 'Modifiez le titre et la description facultative de cette banque.',
    download: 'Télécharger cette banque',
    downloadAll: 'Télécharger les banques SysEx (.zip)',
    restoreAll: 'Rétablir les sons d’usine…',
    sending: 'Envoi…',
    send: 'Envoyer au FM1',
    bank: 'Banque {{bank}}',
    addBank: 'Ajouter une banque…',
    addBankTitle: 'Ajouter la banque {{bank}}',
    addBankHelp: 'Nommez la banque et choisissez les données sonores qui la rempliront.',
    bankName: 'Nom de la banque',
    bankNameRequired: 'Saisissez un nom pour la nouvelle banque.',
    soundData: 'Données sonores',
    soundSource: 'Choisissez une source sonore',
    soundSourceRequired:
      'Choisissez une banque du catalogue ou importez votre propre fichier SysEx DX7.',
    catalogSource: 'Choisir dans le catalogue DX7',
    catalogBank: 'Banque du catalogue DX7',
    chooseCatalogBank: 'Sélectionnez une banque sonore…',
    uploadSource: 'Importer votre propre banque',
    chooseSysexFile: 'Choisir un fichier SysEx DX7',
    soundDataHelp: 'Chaque nouvelle banque contient une banque DX7 standard complète de 32 voix.',
    createBank: 'Créer la banque',
    creatingBank: 'Création…',
    addBankFailed: 'La banque n’a pas pu être créée.',
    destination: 'Banque de destination',
    importFile: 'Importer un fichier de banque DX7',
    downloadTitle: 'Télécharger « {{bank}} » au format SysEx',
    importFirst: 'Importez d’abord la banque {{bank}}',
    deleteBank: 'Supprimer la banque',
    deleteBankMenu: 'Supprimer la banque…',
    deleteBankConfirm:
      'Supprimer « {{name}} » et tous ses sons ? Vous pourrez annuler cette action.',
    sendTitle: 'Envoyer les 32 voix et choisir la banque de destination sur le FM1',
    sentStatus: '« {{bank}} » a été envoyée. Choisissez sa destination sur le FM1.',
    notSent: 'La banque n’a pas été envoyée. Consultez le journal MIDI, puis réessayez.',
    importFailed: 'Échec de l’importation.',
    restoreFailed: 'Impossible de rétablir les sons d’usine dans les banques. Réessayez.',
    bankUnavailable: 'Cette banque n’est plus disponible. Fermez cette fenêtre et réessayez.',
    catalogUnavailable:
      'Impossible de télécharger cette banque de sons. Vérifiez votre connexion, puis réessayez.',
    fileErrors: {
      size: 'Ce fichier fait {{bytes, number}} octets et ne contient aucune banque DX7 complète. Un fichier de banque fait {{expected, number}} octets, ou un multiple de cette taille s’il réunit plusieurs banques.',
      tooLarge:
        'Ce fichier est trop volumineux. Un fichier de banques peut réunir jusqu’à {{count, number}} banques DX7.',
      format: 'Ce fichier n’est pas une banque Yamaha DX7 de 32 voix.',
      damaged: 'Ce fichier semble endommagé. Essayez de le télécharger à nouveau.',
      voiceFormat:
        'Ce fichier n’est pas un son DX7. Choisissez un fichier .syx qui contient un seul son.',
      voiceGotBank:
        'Ce fichier est une banque DX7 de 32 voix. Pour la charger, choisissez « Importer une banque DX7… » dans le menu de la banque.',
    },
    exportFailed: 'Échec de l’exportation.',
    bulkExportFailed: 'Échec de l’exportation groupée.',
    gridTitle: 'Banques de sons',
    gridDescription:
      'Importez, modifiez et organisez chaque banque avant de la transférer vers le FM1.',
    search: 'Rechercher',
    noMatches: 'Aucun son ne correspond à cette recherche',
    searchResults: 'Résultats de recherche : « {{search}} »',
    sendFromSearch: 'Choisissez une banque pour l’envoyer au FM1',
    bankEmpty: 'Cette banque est vide',
    emptyHelp:
      'Chargez la banque de démonstration ou importez votre propre banque SysEx DX7 standard de 32 voix.',
    loadDemo: 'Charger la banque démo',
    editSelected: 'Modifier',
    slotTitle: 'Cliquer pour jouer {{name}} sur le FM1 ; double-cliquer pour le modifier',
    slotEditBufferTitle:
      'Cliquez pour écouter {{name}} via le tampon d’édition du FM1 ; double-cliquez pour le modifier',
    slotEditTitle: 'Double-cliquer ou appuyer sur Entrée pour modifier {{name}}',
    sendPatch: 'Envoyer {{name}} au FM1',
    auditioning: 'Écoute',
    reorder: 'Réorganiser {{name}}',
    reorderTitle:
      'Faites glisser pour réorganiser, ou sur une banque pour y copier le son ; utilisez les flèches au clavier pour réorganiser',
    copySelected: 'Copier vers…',
    copyDialogTitle: 'Copier {{name}}',
    copyTargetBank: 'Banque',
    copyTargetSlot: 'Emplacement',
    copyReplaces: 'Cela remplace « {{name}} » en {{slot}}. Tu peux annuler cette action.',
    copyAction: 'Remplacer {{slot}}',
    copyAndEditAction: 'Remplacer {{slot}} et modifier',
    copyToEditHint: 'Pour modifier ce son, copiez-le dans l’une de vos banques.',
    copyFailed: 'Le son n’a pas pu être copié.',
    addBankOpenFailed:
      'Impossible d’ouvrir les options de nouvelle banque. Rechargez la page et réessayez.',
    copyOpenFailed: 'Impossible d’ouvrir les options de copie. Rechargez la page et réessayez.',
    importPatchFile: 'Importer un son…',
    downloadPatchFile: 'Télécharger le son',
    bankFileUnavailable:
      'Impossible de lire les fichiers de banque. Rechargez la page et réessayez.',
    patchFileUnavailable:
      'Impossible d’ouvrir les fichiers de son. Rechargez la page et réessayez.',
    everywhere: {
      workspace: 'Vos banques de sons',
      savedBanks: 'Banques enregistrées',
      catalog: 'Autres banques de sons DX7',
      play: 'Écouter {{name}} de {{origin}}',
      playTitle:
        'Cliquez pour écouter {{name}} via le tampon d’édition du FM1 ; double-cliquez pour le copier et le modifier',
      copy: 'Copier {{name}} dans une banque',
      truncated:
        'Affichage des {{shown}} premiers résultats sur {{total}}. Précisez la recherche pour en réduire le nombre.',
      loading: 'Recherche dans les autres banques de sons DX7…',
      loadFailed:
        'Impossible de rechercher dans les banques enregistrées et les autres banques de sons DX7. Rechargez la page et réessayez.',
      playFailed: 'Le son n’a pas pu être joué.',
      copiesHidden: 'Les sons en double ne sont pas affichés.',
    },
    slotVirtualAnalogTitle:
      'Cliquer pour sélectionner {{name}} sur le FM1, qui joue le preset Virtual Analog enregistré à cet emplacement',
    slotVirtualAnalogAddedTitle:
      '{{name}} est un preset Virtual Analog, qui ne se joue que depuis les banques A à D du FM1',
    virtualAnalogPatch: 'Preset Virtual Analog',
    sentStatusWithInit:
      'La banque {{bank}} a été envoyée, avec INIT VOICE à la place de son preset Virtual Analog. Choisissez sa destination sur le FM1.',
    sentStatusWithInit_other:
      'La banque {{bank}} a été envoyée, avec INIT VOICE à la place de ses {{count, number}} presets Virtual Analog. Choisissez sa destination sur le FM1.',
    virtualAnalogInitNote:
      'Une banque DX7 n’a pas de place pour un preset Virtual Analog : celui de cette banque est donc envoyé comme INIT VOICE.',
    virtualAnalogInitNote_other:
      'Une banque DX7 n’a pas de place pour les presets Virtual Analog : les {{count, number}} de cette banque sont donc envoyés comme INIT VOICE.',
    fmPatch: 'Son FM',
    fmTag: 'FM',
    virtualAnalogTag: 'VA',
    engineTitle: '{{engine}}\n{{action}}',
  },
  namedBanks: {
    saving: 'Enregistrement…',
    title: 'Mes banques enregistrées',
    intro: 'Choisissez une banque enregistrée à charger dans « {{bank}} ».',
    saveCurrent: 'Enregistrer « {{bank}} »',
    snapshotHelp: 'Crée une copie indépendante des 32 sons et de leurs effets FM1.',
    name: 'Nom de la banque',
    namePlaceholder: 'ex. Concert – samedi',
    description: 'Description (facultative)',
    descriptionPlaceholder: 'Notes sur cette banque',
    save: 'Enregistrer la banque',
    saveMenu: 'Enregistrer la banque…',
    loadBank: 'Charger une banque…',
    editDetails: 'Modifier les détails',
    update: 'Mettre à jour',
    savedBanks: 'Banques enregistrées',
    count: '{{count, number}} banque enregistrée',
    count_other: '{{count, number}} banques enregistrées',
    search: 'Rechercher des banques',
    loading: 'Chargement des banques…',
    empty: 'Aucune banque enregistrée. Enregistrez la banque sélectionnée pour en créer une.',
    noMatches: 'Aucune banque enregistrée ne correspond à cette recherche.',
    load: 'Charger',
    updatedAt: 'Modifiée le {{date}}',
    rename: 'Modifier {{name}}',
    download: 'Télécharger {{name}} au format SysEx',
    downloadAction: 'Télécharger le fichier SysEx',
    duplicate: 'Dupliquer {{name}}',
    duplicateAction: 'Dupliquer la banque',
    delete: 'Supprimer {{name}}',
    deleteAction: 'Supprimer la banque',
    deleteConfirm: 'Supprimer définitivement « {{name}} » de ce navigateur ?',
    loadConfirm: 'Remplacer les 32 sons de « {{bank}} » par « {{name}} » ?',
    replaceAction: 'Remplacer les sons',
    operationFailed: 'L’opération sur la banque enregistrée a échoué.',
    openFailed: 'Impossible d’ouvrir les banques enregistrées. Rechargez la page et réessayez.',
    loadFailed: 'Impossible de charger les banques enregistrées depuis le stockage du navigateur.',
    damagedBanks:
      'Certaines banques enregistrées sont illisibles et ont été masquées. Elles restent intactes dans le stockage du navigateur.',
    saved: '« {{name}} » enregistrée.',
    updated: '« {{name}} » mise à jour.',
    downloaded: '« {{name}} » téléchargée.',
    copied: '« {{name}} » créée.',
    deleted: '« {{name}} » supprimée.',
    loaded: '« {{name}} » chargée dans « {{bank}} ».',
    downloadedWithInit:
      '« {{name}} » a été téléchargée, avec INIT VOICE à la place de son preset Virtual Analog.',
    downloadedWithInit_other:
      '« {{name}} » a été téléchargée, avec INIT VOICE à la place de ses {{count, number}} presets Virtual Analog.',
  },
  backup: {
    menuOtherFiles: 'Autres fichiers',
    sysexContents: 'Données DX7 seules, sans effets FM1',
    menuHeading: 'Sauvegarde',
    download: 'Télécharger une sauvegarde',
    restore: 'Restaurer une sauvegarde…',
    lastBackup: 'Dernière sauvegarde : {{date}}',
    downloaded: 'Téléchargement d’une sauvegarde de vos banques et banques enregistrées.',
    downloadedWithoutSavedBanks:
      'Téléchargement d’une sauvegarde de vos banques. Les banques enregistrées sont illisibles et n’y figurent pas.',
    downloadedWithoutDamaged:
      'Téléchargement d’une sauvegarde. Certaines banques enregistrées sont illisibles et n’y figurent pas.',
    unavailable: 'Les sauvegardes n’ont pas pu s’ouvrir. Rechargez la page et réessayez.',
    unavailableUnsaved:
      'La sauvegarde n’a pas pu être préparée. Gardez cet onglet ouvert, car vos dernières modifications ne sont pas enregistrées, puis réessayez.',
    restoreTitle: 'Restaurer une sauvegarde',
    restoreIntro:
      'Choisissez un fichier créé avec Télécharger une sauvegarde. Rien ne change avant votre confirmation.',
    chooseFile: 'Choisir un fichier de sauvegarde',
    reading: 'Lecture de la sauvegarde…',
    backedUpAt: 'Sauvegardé le',
    workspaceBanks: 'Banques',
    patches: 'Sons',
    savedBanks: 'Banques enregistrées',
    toAdd: 'À ajouter',
    alreadyHere: 'Déjà présentes, conservées',
    unreadable: 'Illisibles',
    workspaceEffect:
      'Vos banques et tous leurs sons sont remplacés par ceux de la sauvegarde. Annuler dans la notification qui suit les rétablit.',
    savedBanksEffect:
      'Les banques enregistrées sont seulement ajoutées. Une banque déjà présente dans ce navigateur reste telle quelle, et Annuler ne retire pas celles ajoutées.',
    restoreAction: 'Restaurer la sauvegarde',
    restoring: 'Restauration…',
    restored: 'Sauvegarde du {{date}} restaurée.',
    errors: {
      format:
        'Ce fichier n’est pas une sauvegarde de cette application. Choisissez un fichier .json créé avec Télécharger une sauvegarde.',
      newer:
        'Cette sauvegarde provient d’une version plus récente de l’application. Rechargez la page pour la mettre à jour, puis réessayez.',
      damaged:
        'Cette sauvegarde est endommagée et ne peut pas être restaurée. Essayez un autre fichier de sauvegarde.',
      size: 'Ce fichier est trop volumineux pour être une sauvegarde de cette application.',
      read: 'Impossible de lire le fichier. Choisissez-le de nouveau.',
      savedBanksFailed:
        'Le stockage du navigateur n’a pas pu conserver les banques enregistrées de cette sauvegarde, votre bibliothèque n’a donc pas changé. Réessayez.',
    },
  },
} as const

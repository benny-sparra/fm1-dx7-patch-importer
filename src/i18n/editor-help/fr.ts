export default {
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
  },
  effectParameterHelp: {
    'Filter Type':
      'Choisit ce que le filtre conserve : le passe-bas garde les graves, le passe-haut les aigus et le passe-bande une bande médiane.',
    'Filter Cutoff':
      'Fixe la fréquence à partir de laquelle le filtre agit. Son effet audible dépend du type de filtre choisi.',
    'Filter Resonance':
      'Accentue les fréquences autour de la coupure. Des valeurs élevées donnent un son plus pointu et plus marqué.',
    'Reverb Space': 'Choisit le caractère de l’espace simulé : pièce, salle ou plaque brillante.',
    'Reverb Decay': 'Règle la durée de la queue de réverbération.',
    'Reverb Mix':
      'Équilibre le son sec et la réverbération. À 0 %, vous n’entendez que le son d’origine.',
    'Delay Decay':
      'Règle combien de temps les répétitions de l’écho continuent avant de s’éteindre.',
    'Delay Rate':
      'Règle le temps entre les échos. Des valeurs plus élevées modifient l’espacement des répétitions.',
    'Delay Mix': 'Équilibre le son sec et les échos. À 0 %, vous n’entendez que le son d’origine.',
    'Distortion Gain':
      'Règle la force avec laquelle le signal attaque la distorsion. Des valeurs élevées ajoutent plus de saturation et d’harmoniques.',
    'Distortion Tone': 'Ajuste la brillance du son distordu.',
    'Distortion Level':
      'Règle le volume de sortie après la distorsion, utile pour retrouver le niveau sans effet.',
    'Chorus Frequency': 'Règle la vitesse de cycle du mouvement du chorus.',
    'Chorus Depth':
      'Règle l’amplitude du mouvement de hauteur du chorus. Des valeurs élevées sonnent plus larges et plus marquées.',
    'Chorus Mix': 'Équilibre le son sec et le signal traité par le chorus.',
    'Phaser Frequency': 'Règle la vitesse de cycle du balayage du phaser.',
    'Phaser Depth': 'Règle l’étendue et l’intensité du balayage du phaser.',
    'Phaser Mix': 'Équilibre le son sec et le signal traité par le phaser.',
  },
} as const

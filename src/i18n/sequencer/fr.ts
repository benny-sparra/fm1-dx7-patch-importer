export default {
  title: 'Séquenceur',
  back: 'Retour à la bibliothèque',
  intro:
    'Composez un motif ici, puis jouez-le dans le FM1 pendant que l’appareil enregistre. Le FM1 n’expose aucune commande pour son séquenceur : l’armement, le choix du motif et la sauvegarde restent sur l’appareil.',
  pattern: {
    heading: 'Motif',
    stepLength: 'Nombre de pas',
    stepLengthHint: 'Réglez cette valeur sur le Step affiché sur la page séquenceur du FM1.',
    step: 'Pas {{number}}',
    rest: 'Silence',
    note: 'Note',
    pitch: 'Hauteur',
    velocity: 'Vélocité',
    makeRest: 'Transformer le pas {{number}} en silence',
    makeNote: 'Transformer le pas {{number}} en note',
    clear: 'Vider le motif',
    cleared: 'Le motif a été vidé.',
  },
  listen: {
    heading: 'Écouter le FM1',
    start: 'Écouter le FM1',
    stop: 'Arrêter l’écoute',
    hint: 'Lancez la lecture sur le FM1. Un motif apparaît dès que deux passages complets concordent.',
    waiting: 'À l’écoute. Rien n’a encore été entendu.',
    heard: 'Boucle de {{count}} pas entendue sur {{passes}} passages.',
    use: 'Placer ce qui a été entendu dans l’éditeur',
    used: 'Le motif entendu se trouve maintenant dans l’éditeur.',
    rotation:
      'La lecture ne révèle pas quel pas le FM1 considère comme le premier. Ce qui a été entendu peut donc commencer à un autre pas que le motif ci-dessus.',
    match: 'La lecture du FM1 correspond au motif envoyé.',
    mismatch:
      'La lecture du FM1 ne correspond pas au motif envoyé. Vérifiez le motif sur l’appareil et renvoyez-le.',
    problem: {
      tooFewNotes: 'Rien n’a encore été entendu. Lancez la lecture sur le FM1.',
      noRepeat:
        'Aucune répétition n’a encore été entendue. Laissez le motif tourner au moins deux fois.',
      inconsistentPasses:
        'Les passages ne concordent pas. Ne jouez pas sur les touches du FM1 pendant la lecture.',
      loopLengthUnresolved:
        'Plusieurs nombres de pas correspondent à ce qui a été entendu. Réglez le nombre de pas sur la valeur du FM1.',
      offGrid:
        'Les notes ne tiennent pas dans ce nombre de pas. Vérifiez la valeur Step affichée sur le FM1.',
    },
  },
  send: {
    button: 'Envoyer au FM1',
    heading: 'Envoyer ce motif au FM1',
    arm: 'Faites d’abord ceci sur le FM1, car l’éditeur en est incapable :',
    armPattern: 'Choisissez le motif à remplacer.',
    armStepLength: 'Réglez Step sur {{steps}}.',
    armTranspose: 'Réglez Transpose sur 0.',
    armRecord: 'Appuyez sur REC. Le témoin du premier pas clignote.',
    replaces:
      'L’envoi remplace tout le contenu de ce motif, du pas 1 jusqu’à la fin de la boucle. Rien ne peut l’annuler depuis ici.',
    keys: 'Ne jouez pas sur les touches du FM1 tant que le motif n’est pas envoyé.',
    confirm: 'Le FM1 enregistre ; envoyer',
    cancel: 'Annuler',
    sending: 'Envoi du pas {{step}} sur {{steps}}.',
    stop: 'Interrompre l’envoi',
    sent: '{{steps}} pas sur {{total}} envoyés. Le FM1 ne confirme rien : écoutez-le pour vérifier le résultat.',
    unsaved:
      'Le motif n’existe que dans la mémoire de l’appareil. Utilisez SAVE sur le FM1 pour le conserver.',
    cancelled:
      'Arrêté après {{steps}} pas sur {{total}}. Le motif du FM1 est en partie neuf, en partie ancien.',
    interrupted:
      'La connexion MIDI a échoué après {{steps}} pas sur {{total}}. Le motif du FM1 est en partie neuf, en partie ancien.',
    noOutput: 'Choisissez une sortie MIDI avant d’envoyer un motif.',
    invalid:
      'Ce motif ne peut pas être envoyé. Vérifiez les hauteurs, les vélocités et le nombre de pas.',
  },
} as const

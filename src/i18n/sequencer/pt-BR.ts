export default {
  title: 'Sequenciador',
  back: 'Voltar para a biblioteca',
  intro:
    'Monte um padrão aqui e toque-o no FM1 enquanto o aparelho grava. O FM1 não oferece nenhum comando para o sequenciador, então preparar a gravação, escolher o padrão e salvar continuam sendo feitos no aparelho.',
  pattern: {
    heading: 'Padrão',
    stepLength: 'Número de passos',
    stepLengthHint: 'Ajuste este valor ao Step mostrado na página do sequenciador do FM1.',
    step: 'Passo {{number}}',
    rest: 'Pausa',
    note: 'Nota',
    pitch: 'Altura',
    velocity: 'Velocidade',
    makeRest: 'Tornar o passo {{number}} uma pausa',
    makeNote: 'Tornar o passo {{number}} uma nota',
    clear: 'Esvaziar o padrão',
    cleared: 'O padrão foi esvaziado.',
  },
  listen: {
    heading: 'Ouvir o FM1',
    start: 'Ouvir o FM1',
    stop: 'Parar de ouvir',
    hint: 'Inicie a reprodução no FM1. Um padrão aparece assim que duas voltas completas coincidirem.',
    waiting: 'Ouvindo. Nada foi ouvido ainda.',
    heard: 'Foi ouvido um laço de {{count}} passos ao longo de {{passes}} voltas.',
    use: 'Levar o que foi ouvido para o editor',
    used: 'O padrão ouvido está agora no editor.',
    rotation:
      'A reprodução não revela qual passo o FM1 considera o primeiro, então o que foi ouvido pode começar em um passo diferente do padrão acima.',
    match: 'O que o FM1 reproduz corresponde ao padrão enviado.',
    mismatch:
      'O que o FM1 reproduz não é o padrão enviado. Confira o padrão no aparelho e envie de novo.',
    problem: {
      tooFewNotes: 'Nada foi ouvido ainda. Inicie a reprodução no FM1.',
      noRepeat: 'Nenhuma repetição foi ouvida ainda. Deixe o padrão dar pelo menos duas voltas.',
      inconsistentPasses:
        'As voltas não coincidem. Não toque as teclas do FM1 enquanto ele está sendo lido.',
      loopLengthUnresolved:
        'Vários números de passos servem para o que foi ouvido. Ajuste o número de passos ao valor do FM1.',
      offGrid: 'As notas não cabem nesse número de passos. Confira o valor Step mostrado no FM1.',
    },
  },
  send: {
    button: 'Enviar para o FM1',
    heading: 'Enviar este padrão para o FM1',
    arm: 'Faça isto primeiro no FM1, porque o editor não consegue:',
    armPattern: 'Escolha o padrão que será substituído.',
    armStepLength: 'Ajuste Step para {{steps}}.',
    armTranspose: 'Ajuste Transpose para 0.',
    armRecord: 'Pressione REC. A luz do primeiro passo pisca.',
    replaces:
      'O envio substitui tudo o que há nesse padrão, do passo 1 até o fim do laço. Não dá para desfazer daqui.',
    keys: 'Não toque as teclas do FM1 até o padrão ter sido enviado.',
    confirm: 'O FM1 está gravando; enviar',
    cancel: 'Cancelar',
    sending: 'Enviando o passo {{step}} de {{steps}}.',
    stop: 'Interromper o envio',
    sent: '{{steps}} de {{total}} passos enviados. O FM1 não confirma nada, então ouça-o para conferir o resultado.',
    unsaved: 'O padrão está apenas na memória do aparelho. Use SAVE no FM1 para guardá-lo.',
    cancelled:
      'Parou depois de {{steps}} de {{total}} passos. O padrão do FM1 está em parte novo e em parte antigo.',
    interrupted:
      'A conexão MIDI falhou depois de {{steps}} de {{total}} passos. O padrão do FM1 está em parte novo e em parte antigo.',
    noOutput: 'Escolha uma saída MIDI antes de enviar um padrão.',
    invalid:
      'Este padrão não pode ser enviado. Confira as alturas, as velocidades e o número de passos.',
  },
} as const

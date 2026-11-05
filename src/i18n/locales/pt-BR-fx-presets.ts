export default {
  fxPresets: {
    unsavedEffects: 'Efeitos não salvos',
    saveButton: 'Salvar',
    newPreset: 'Novo preset de FX…',
    revert: 'Reverter',
    reverted: '“{{name}}” restaurado.',
    loaded: '“{{name}}” carregado.',
    edited: 'editado',
    empty: 'Ainda não há presets de FX.',
    actions: 'Ações dos presets de FX',
    presetActions: 'Ações de {{name}}',
    restored: '“{{name}}” restaurado.',

    effectsTitle: 'Efeitos',
    dialogTitle: 'Presets de FX',
    search: 'Pesquisar presets de FX',
    loading: 'Carregando presets de FX…',
    retry: 'Tentar novamente',
    reload: 'Recarregar lista',
    noMatches: 'Nenhum preset de FX corresponde a esta pesquisa.',
    unreadable:
      '{{count, number}} preset de FX armazenado não pôde ser lido e foi mantido intacto.',
    unreadable_other:
      '{{count, number}} presets de FX armazenados não puderam ser lidos e foram mantidos intactos.',
    saveTitle: 'Salvar efeitos atuais',
    name: 'Nome do preset',
    save: 'Salvar preset',
    rename: 'Renomear…',
    renameTitle: 'Renomear “{{name}}”',
    renameAction: 'Renomear preset',
    duplicate: 'Duplicar',
    delete: 'Excluir…',
    deleteConfirm: 'Excluir “{{name}}” deste navegador?',
    deleteAction: 'Excluir preset',
    downloadPreset: 'Baixar preset',
    downloadAll: 'Baixar todos',
    import: 'Importar…',
    imported: '{{count, number}} preset de FX importado. Os presets existentes foram mantidos.',
    imported_other:
      '{{count, number}} presets de FX importados. Os presets existentes foram mantidos.',
    importEmpty: 'O arquivo não contém presets de FX; nada foi importado.',
    sending: 'Enviando…',
    offline: 'Nenhuma saída MIDI está selecionada. O carregamento altera somente este navegador.',
    ineligible:
      'Este firmware não tem o grupo de FX compartilhado da V16. O carregamento altera somente este navegador.',
    help: 'Edite efeitos e salve presets. No V16, todas as Vozes compartilham os efeitos.',
    orderHelp: 'Os presets contêm os controles de efeitos exibidos aqui, não a ordem dos efeitos.',
    readback: '“Ler do FM1” traz para cá os efeitos atuais do FM1 e sua ordem.',
    readFromFm1: 'Ler do FM1',
    readDone: 'Efeitos lidos do FM1.',
    reading: 'Lendo os efeitos do FM1…',
    readingButton: 'Lendo…',
    readUnavailable: 'Ative o MIDI e escolha a entrada e a saída do FM1 para ler os efeitos dele.',
    effectOrderReading: 'Lendo a ordem dos efeitos do FM1…',
    effectOrderFailed:
      'O FM1 não informou a ordem dos efeitos, então ela não pode ser alterada aqui.',
    effectOrderWriteFailed: 'O FM1 não aceitou a nova ordem. Tente novamente.',
    effectOrderDragTitle:
      'Arraste para mudar o lugar deste efeito na ordem por que o som passa, o primeiro no alto à esquerda. Pelo teclado, pressione Espaço e depois as setas. O FM1 toca a nova ordem na hora.',
    sessionOnly:
      'O armazenamento do navegador não consegue manter estes efeitos, então eles duram só enquanto esta aba ficar aberta.',
    partial: 'Nem todos os efeitos foram enviados. O FM1 pode ter sido alterado parcialmente.',
    saved: '“{{name}}” salvo.',
    renamed: 'Preset renomeado para “{{name}}”.',
    duplicated: '“{{name}}” criado.',
    updated: '“{{name}}” atualizado com os efeitos atuais.',
    deleted: '“{{name}}” excluído.',
    working: 'Salvando…',
    errors: {
      load: 'Não foi possível ler os presets de FX. Tente novamente sem fechar esta aba.',
      write:
        'O armazenamento do navegador não conseguiu salvar a alteração. Nenhum dado existente foi substituído.',
      conflict:
        'Este preset mudou em outra aba. Recarregue a lista ou salve os efeitos atuais como um novo preset.',
      fileFormat:
        'Este arquivo não é uma biblioteca de presets de FX exportada por este aplicativo.',
      fileNewer:
        'Este arquivo de presets de FX foi criado por uma versão mais recente. Recarregue o aplicativo e tente novamente.',
      fileDamaged: 'Este arquivo de presets de FX está danificado. Corrija-o ou escolha outro.',
      fileSize: 'Este arquivo é grande demais para ser uma biblioteca de presets de FX.',
      fileRead: 'Não foi possível ler o arquivo. Escolha-o novamente.',
      name: 'Digite um nome com 1 a {{max}} caracteres.',
      readNoReply:
        'O FM1 não respondeu. Verifique se a entrada MIDI dele está selecionada e tente de novo.',
      read: 'Não foi possível ler os efeitos do FM1, então nada mudou aqui. Tente de novo.',
    },
  },
} as const

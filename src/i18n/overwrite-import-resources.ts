export const overwriteImportResources = {
  en: {
    overwriteImport: {
      action: 'Replace bank contents',
      help: 'Choose a standard 32-voice DX7 SysEx bank file.',
      title: 'Import over “{{bank}}”?',
      warning: 'The bank’s current contents will be wiped and replaced by the imported sounds.',
    },
  },
  fr: {
    overwriteImport: {
      action: 'Remplacer le contenu',
      help: 'Choisissez un fichier de banque SysEx DX7 standard de 32 voix.',
      title: 'Importer par-dessus « {{bank}} » ?',
      warning: 'Le contenu actuel de la banque sera effacé et remplacé par les sons importés.',
    },
  },
  es: {
    overwriteImport: {
      action: 'Reemplazar contenido',
      help: 'Elige un archivo de banco SysEx DX7 estándar de 32 voces.',
      title: '¿Importar sobre «{{bank}}»?',
      warning:
        'El contenido actual del banco se borrará y se sustituirá por los sonidos importados.',
    },
  },
  de: {
    overwriteImport: {
      action: 'Bankinhalt ersetzen',
      help: 'Wähle eine Standard-DX7-SysEx-Bankdatei mit 32 Voices.',
      title: '„{{bank}}“ überschreiben?',
      warning:
        'Der aktuelle Inhalt der Bank wird gelöscht und durch die importierten Sounds ersetzt.',
    },
  },
  ptBR: {
    overwriteImport: {
      action: 'Substituir conteúdo',
      help: 'Escolha um arquivo de banco SysEx DX7 padrão com 32 vozes.',
      title: 'Importar sobre “{{bank}}”?',
      warning: 'O conteúdo atual do banco será apagado e substituído pelos sons importados.',
    },
  },
  zhHans: {
    overwriteImport: {
      action: '替换音色库内容',
      help: '请选择标准的 32 音色 DX7 SysEx 音色库文件。',
      title: '覆盖“{{bank}}”吗？',
      warning: '此音色库的现有内容将被清除，并替换为导入的声音。',
    },
  },
} as const

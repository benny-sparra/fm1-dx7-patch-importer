const en = {
  saved: 'Workspace saved',
  saving: 'Saving workspace…',
  retryLoading: 'Retry',
  continueSessionOnly: 'Continue without saving',
  retrySaving: 'Retry saving',
  technicalDetails: 'Technical details',
  sessionOnlyTitle: 'Session-only workspace',
  sessionOnlyBody: 'Existing browser data has not been changed. Changes made in this session will be lost when this page closes.',
  saveErrorTitle: 'Workspace changes are not safely stored',
  saveErrorBody: 'Your latest changes are still available here, but the browser could not save them. Retry when browser storage is available.',
  loadErrors: {
    unavailable: {
      title: 'Browser storage is unavailable',
      body: 'The saved workspace could not be opened. Its browser data has not been changed.',
    },
    'read-failed': {
      title: 'The saved workspace could not be read',
      body: 'This may be a temporary browser storage problem. No replacement workspace has been created or saved.',
    },
    incompatible: {
      title: 'The saved workspace is incompatible or damaged',
      body: 'The existing browser record has been left untouched. This version cannot safely open it.',
    },
    'write-failed': {
      title: 'The saved workspace could not be read',
      body: 'No replacement workspace has been created or saved.',
    },
  },
}

export const persistenceResources = {
  en: { persistence: en },
  fr: { persistence: { ...en,
    saved: 'Espace de travail enregistré', saving: 'Enregistrement de l’espace de travail…', retryLoading: 'Réessayer', continueSessionOnly: 'Continuer sans enregistrer', retrySaving: 'Réessayer l’enregistrement', technicalDetails: 'Détails techniques', sessionOnlyTitle: 'Espace de travail temporaire', sessionOnlyBody: 'Les données existantes du navigateur n’ont pas été modifiées. Les changements de cette session seront perdus à la fermeture de cette page.', saveErrorTitle: 'Les changements ne sont pas enregistrés en sécurité', saveErrorBody: 'Vos derniers changements restent disponibles ici, mais le navigateur n’a pas pu les enregistrer. Réessayez lorsque le stockage est disponible.',
    loadErrors: {
      unavailable: { title: 'Le stockage du navigateur est indisponible', body: 'L’espace de travail enregistré n’a pas pu être ouvert. Ses données n’ont pas été modifiées.' },
      'read-failed': { title: 'Impossible de lire l’espace de travail enregistré', body: 'Il peut s’agir d’un problème temporaire de stockage. Aucun espace de remplacement n’a été créé ni enregistré.' },
      incompatible: { title: 'L’espace enregistré est incompatible ou endommagé', body: 'L’enregistrement existant a été laissé intact. Cette version ne peut pas l’ouvrir en sécurité.' },
      'write-failed': { title: 'Impossible de lire l’espace de travail enregistré', body: 'Aucun espace de remplacement n’a été créé ni enregistré.' },
    },
  } },
  es: { persistence: { ...en,
    saved: 'Espacio de trabajo guardado', saving: 'Guardando el espacio de trabajo…', retryLoading: 'Reintentar', continueSessionOnly: 'Continuar sin guardar', retrySaving: 'Reintentar guardado', technicalDetails: 'Detalles técnicos', sessionOnlyTitle: 'Espacio de trabajo solo para esta sesión', sessionOnlyBody: 'Los datos existentes del navegador no se han modificado. Los cambios de esta sesión se perderán al cerrar la página.', saveErrorTitle: 'Los cambios no están guardados de forma segura', saveErrorBody: 'Tus últimos cambios siguen disponibles aquí, pero el navegador no pudo guardarlos. Reinténtalo cuando el almacenamiento esté disponible.',
    loadErrors: {
      unavailable: { title: 'El almacenamiento del navegador no está disponible', body: 'No se pudo abrir el espacio guardado. Sus datos no se han modificado.' },
      'read-failed': { title: 'No se pudo leer el espacio de trabajo guardado', body: 'Puede ser un problema temporal del almacenamiento. No se creó ni guardó ningún espacio de sustitución.' },
      incompatible: { title: 'El espacio guardado es incompatible o está dañado', body: 'El registro existente se dejó intacto. Esta versión no puede abrirlo de forma segura.' },
      'write-failed': { title: 'No se pudo leer el espacio de trabajo guardado', body: 'No se creó ni guardó ningún espacio de sustitución.' },
    },
  } },
  de: { persistence: { ...en,
    saved: 'Arbeitsbereich gespeichert', saving: 'Arbeitsbereich wird gespeichert…', retryLoading: 'Erneut versuchen', continueSessionOnly: 'Ohne Speichern fortfahren', retrySaving: 'Speichern erneut versuchen', technicalDetails: 'Technische Details', sessionOnlyTitle: 'Nur temporärer Arbeitsbereich', sessionOnlyBody: 'Vorhandene Browserdaten wurden nicht verändert. Änderungen dieser Sitzung gehen beim Schließen der Seite verloren.', saveErrorTitle: 'Änderungen sind nicht sicher gespeichert', saveErrorBody: 'Die neuesten Änderungen sind hier noch verfügbar, konnten aber nicht gespeichert werden. Versuchen Sie es erneut, sobald der Browserspeicher verfügbar ist.',
    loadErrors: {
      unavailable: { title: 'Browserspeicher ist nicht verfügbar', body: 'Der gespeicherte Arbeitsbereich konnte nicht geöffnet werden. Seine Daten wurden nicht verändert.' },
      'read-failed': { title: 'Der gespeicherte Arbeitsbereich konnte nicht gelesen werden', body: 'Möglicherweise liegt ein vorübergehendes Speicherproblem vor. Es wurde kein Ersatz erstellt oder gespeichert.' },
      incompatible: { title: 'Der gespeicherte Arbeitsbereich ist inkompatibel oder beschädigt', body: 'Der vorhandene Datensatz blieb unverändert. Diese Version kann ihn nicht sicher öffnen.' },
      'write-failed': { title: 'Der gespeicherte Arbeitsbereich konnte nicht gelesen werden', body: 'Es wurde kein Ersatz erstellt oder gespeichert.' },
    },
  } },
  ptBR: { persistence: { ...en,
    saved: 'Espaço de trabalho salvo', saving: 'Salvando o espaço de trabalho…', retryLoading: 'Tentar novamente', continueSessionOnly: 'Continuar sem salvar', retrySaving: 'Tentar salvar novamente', technicalDetails: 'Detalhes técnicos', sessionOnlyTitle: 'Espaço de trabalho somente para esta sessão', sessionOnlyBody: 'Os dados existentes do navegador não foram alterados. As mudanças desta sessão serão perdidas quando a página for fechada.', saveErrorTitle: 'As mudanças não estão salvas com segurança', saveErrorBody: 'As mudanças mais recentes continuam disponíveis aqui, mas o navegador não conseguiu salvá-las. Tente novamente quando o armazenamento estiver disponível.',
    loadErrors: {
      unavailable: { title: 'O armazenamento do navegador está indisponível', body: 'Não foi possível abrir o espaço salvo. Seus dados não foram alterados.' },
      'read-failed': { title: 'Não foi possível ler o espaço de trabalho salvo', body: 'Pode ser um problema temporário de armazenamento. Nenhum espaço substituto foi criado ou salvo.' },
      incompatible: { title: 'O espaço salvo é incompatível ou está danificado', body: 'O registro existente foi mantido intacto. Esta versão não pode abri-lo com segurança.' },
      'write-failed': { title: 'Não foi possível ler o espaço de trabalho salvo', body: 'Nenhum espaço substituto foi criado ou salvo.' },
    },
  } },
  zhHans: { persistence: { ...en,
    saved: '工作区已保存', saving: '正在保存工作区…', retryLoading: '重试', continueSessionOnly: '继续但不保存', retrySaving: '重试保存', technicalDetails: '技术详情', sessionOnlyTitle: '仅限本次会话的工作区', sessionOnlyBody: '浏览器中现有的数据没有被更改。本次会话的更改将在页面关闭时丢失。', saveErrorTitle: '工作区更改尚未安全保存', saveErrorBody: '最新更改仍保留在此页面中，但浏览器无法保存。请在浏览器存储可用后重试。',
    loadErrors: {
      unavailable: { title: '浏览器存储不可用', body: '无法打开已保存的工作区。浏览器中的数据没有被更改。' },
      'read-failed': { title: '无法读取已保存的工作区', body: '这可能是暂时的浏览器存储问题。尚未创建或保存替代工作区。' },
      incompatible: { title: '已保存的工作区不兼容或已损坏', body: '现有浏览器记录保持不变。此版本无法安全打开它。' },
      'write-failed': { title: '无法读取已保存的工作区', body: '尚未创建或保存替代工作区。' },
    },
  } },
} as const

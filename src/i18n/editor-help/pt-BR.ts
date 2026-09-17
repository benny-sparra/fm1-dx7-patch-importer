export default {
  controlHelp: {
    algorithm:
      'Escolhe como os seis operadores são conectados. Os operadores de baixo são portadoras que você ouve diretamente; os de cima mudam o timbre dos operadores abaixo deles.',
    feedback:
      'Realimenta parte de um operador nele mesmo. Valores altos adicionam harmônicos mais brilhantes e ásperos e podem ficar ruidosos.',
    pitchEnvelope:
      'Muda a afinação ao longo de cada nota. As quatro taxas controlam a rapidez de cada etapa; os quatro níveis definem a afinação alcançada em cada etapa.',
    pitchEnvelopePresets:
      'Substitui as oito taxas e níveis por uma forma inicial. Plana remove qualquer movimento de afinação; as outras adicionam um pico rápido, um ataque que cai, uma subida ou uma queda ao soltar. Desfazer restaura o envelope anterior.',
    effectPresets:
      'Ajusta os controles deste efeito a um ponto de partida. Ligue o efeito para escolher um. Os outros efeitos não mudam, e Desfazer restaura as configurações anteriores.',
    oscillatorSync:
      'Reinicia todos os operadores na mesma posição da forma de onda a cada nota. Ligado, o ataque fica mais consistente; desligado, o som pode ficar mais orgânico.',
    lfoSync:
      'Reinicia o LFO a cada nova nota. Ligado, a modulação se repete de forma consistente; desligado, cada nota entra no LFO que roda sem parar.',
    lfoWave:
      'Escolhe a forma repetida usada no vibrato e no tremolo. A senoidal é suave, a quadrada alterna entre dois valores e o sample & hold é aleatório.',
    lfoSpeed:
      'Define a velocidade de ciclo do LFO. Aumente para um vibrato ou tremolo mais rápido.',
    lfoDelay:
      'Atrasa o LFO depois que a nota começa, para que o vibrato ou tremolo entre aos poucos em vez de começar na hora.',
    pitchModDepth:
      'Define a quantidade máxima de movimento de afinação do LFO. A sensibilidade de modulação de afinação de cada som determina quanto disso é ouvido.',
    ampModDepth:
      'Define a quantidade máxima de movimento de volume do LFO. A sensibilidade de modulação de amplitude de cada operador determina quanto ele responde.',
    pitchModSensitivity:
      'Controla a intensidade com que o som inteiro responde à modulação de afinação do LFO. Valores mais altos criam um vibrato mais amplo.',
    transpose:
      'Move o som inteiro para cima ou para baixo em semitons, sem mudar as teclas que você toca.',
    operator:
      'Um operador é um oscilador com seu próprio envelope. As portadoras produzem o som audível; os moduladores transformam outro operador para criar harmônicos.',
    outputLevel:
      'Define a intensidade deste operador. Numa portadora, muda principalmente o volume; num modulador, muda o brilho e a complexidade harmônica.',
    amplitudeEnvelope:
      'Molda este operador ao longo do tempo. Arraste para a esquerda ou direita para mudar a rapidez com que uma etapa é alcançada, e para cima ou para baixo para mudar seu nível. Nos moduladores, molda o brilho em vez do volume.',
    oscillatorMode:
      'Ratio acompanha o teclado e é ideal para harmônicos afinados. Fixa usa uma frequência constante, útil para sons metálicos, ruidosos ou percussivos.',
    coarse:
      'Define a relação de frequência principal no modo Ratio, ou a faixa de frequência geral no modo Fixa. Relações inteiras costumam soar harmônicas.',
    fine: 'Ajusta com precisão a frequência do operador entre os valores de ajuste grosso. Pequenas mudanças podem adicionar novos harmônicos ou batimentos.',
    detune:
      'Desloca levemente este operador da afinação exata. Pouco deixa o som mais encorpado; diferenças maiores criam batimentos ou dissonância.',
    breakpoint:
      'Escolhe a nota do teclado onde o escalonamento de nível esquerdo e o direito se encontram. O escalonamento muda o nível deste operador ao longo do teclado.',
    leftDepth: 'Define quanto o nível deste operador muda nas notas abaixo do ponto de divisão.',
    rightDepth: 'Define quanto o nível deste operador muda nas notas acima do ponto de divisão.',
    curve:
      'Escolhe a direção e a forma da mudança de nível a partir do ponto de divisão. Linear muda de forma constante; exponencial muda com mais força perto de uma das pontas.',
    rateScaling:
      'Faz o envelope deste operador correr mais rápido nas notas agudas, como o decaimento mais curto de muitos instrumentos acústicos.',
    velocity:
      'Define o quanto a velocidade da tecla muda o nível deste operador. Nas portadoras afeta o volume; nos moduladores, o brilho.',
    ampModSensitivity:
      'Define o quanto este operador responde à modulação de amplitude do LFO. Numa portadora cria tremolo; num modulador dá movimento ao timbre.',
  },
  effectHelp: {
    Filter:
      'Remove partes do espectro de frequências. Use para escurecer, deixar mais fino ou remodelar o som FM final.',
    Reverb: 'Adiciona reflexões de sala simuladas, dando ao som sensação de espaço e distância.',
    Delay:
      'Repete o som depois de um curto intervalo. O decaimento, parecido com realimentação, controla quanto tempo os ecos continuam.',
    Distortion:
      'Adiciona saturação e harmônicos extras. Pode deixar sons suaves mais densos ou sons agressivos mais intensos.',
    Chorus: 'Adiciona cópias levemente deslocadas do som para dar amplitude e movimento.',
    Phaser: 'Varre uma série de entalhes pelo som, criando um caráter oco e em movimento.',
  },
  effectParameterHelp: {
    'Filter Type':
      'Escolhe o que o filtro mantém: o passa-baixas mantém os graves, o passa-altas os agudos e o passa-faixa uma faixa intermediária.',
    'Filter Cutoff':
      'Define a frequência a partir da qual o filtro atua. O efeito audível depende do tipo de filtro escolhido.',
    'Filter Resonance':
      'Realça as frequências ao redor do corte. Valores mais altos soam mais agudos e marcados.',
    'Reverb Space': 'Escolhe o caráter do espaço simulado: sala, salão ou placa brilhante.',
    'Reverb Decay': 'Define quanto tempo dura a cauda da reverberação.',
    'Reverb Mix': 'Equilibra o som seco e a reverberação. Em 0% você ouve apenas o som original.',
    'Delay Decay': 'Define quanto tempo as repetições do eco continuam antes de sumir.',
    'Delay Rate':
      'Define o tempo entre os ecos. Valores mais altos mudam o espaçamento das repetições.',
    'Delay Mix': 'Equilibra o som seco e os ecos. Em 0% você ouve apenas o som original.',
    'Distortion Gain':
      'Controla a força com que o sinal alimenta a distorção. Valores mais altos adicionam mais saturação e harmônicos.',
    'Distortion Tone': 'Ajusta o brilho do som distorcido.',
    'Distortion Level':
      'Define o volume de saída depois da distorção, útil para igualar o volume sem o efeito.',
    'Chorus Frequency': 'Define a velocidade de ciclo do movimento do chorus.',
    'Chorus Depth':
      'Define até onde vai o movimento de afinação do chorus. Valores mais altos soam mais amplos e evidentes.',
    'Chorus Mix': 'Equilibra o som seco e o sinal com chorus.',
    'Phaser Frequency': 'Define a velocidade de ciclo da varredura do phaser.',
    'Phaser Depth': 'Define a amplitude e a intensidade da varredura do phaser.',
    'Phaser Mix': 'Equilibra o som seco e o sinal com phaser.',
  },
} as const

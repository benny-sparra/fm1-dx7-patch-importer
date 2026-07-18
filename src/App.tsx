import { MotionConfig } from 'motion/react'

import { useMidi } from '@/hooks/use-midi'
import { usePatchLibrary } from '@/hooks/use-patch-library'
import { LibrarianPage } from '@/routes/librarian-page'
import { RootLayout } from '@/routes/root-layout'
import { useTheme } from '@/hooks/use-theme'

function App() {
  const midi = useMidi()
  const library = usePatchLibrary()
  const theme = useTheme()

  return (
    <MotionConfig reducedMotion="user">
      <RootLayout midi={midi} theme={theme}>
        <LibrarianPage library={library} midi={midi} />
      </RootLayout>
    </MotionConfig>
  )
}

export default App

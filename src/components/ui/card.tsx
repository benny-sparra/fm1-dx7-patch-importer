import * as React from 'react'

import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-card text-card-foreground',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />
}

function CardTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-base leading-none font-semibold', className)} {...props}>
      {children}
    </h2>
  )
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export { Card, CardContent, CardHeader, CardTitle }

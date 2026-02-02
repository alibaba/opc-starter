/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // 主要按钮 - 深森林绿
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        // 危险按钮
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        // 边框按钮
        outline:
          'border border-input bg-background hover:bg-secondary hover:text-secondary-foreground',
        // 次要按钮
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        // 幽灵按钮
        ghost: 'hover:bg-secondary hover:text-secondary-foreground',
        // 链接样式
        link: 'text-primary underline-offset-4 hover:underline',
        // 强调按钮 - 琥珀橙
        accent: 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm',
        // 成功按钮 - 用于确认操作
        success:
          'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 shadow-sm',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

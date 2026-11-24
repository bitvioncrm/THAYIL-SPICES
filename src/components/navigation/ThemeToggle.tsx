import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/theme'
import { BRAND_IMAGE } from '@/components/brand/BrandMark'
import { cn } from '@/lib/utils'

export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className={cn(
        'group relative inline-flex items-center overflow-hidden rounded-full border transition-all duration-500',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-forest dark:focus-visible:ring-offset-[#0B1611]',
        compact ? 'h-9 w-[4.35rem] p-0.5' : 'h-10 w-[4.85rem] p-1',
        isDark
          ? 'border-gold/40 shadow-[inset_0_1px_0_rgba(198,164,92,0.25),0_0_0_1px_rgba(198,164,92,0.12),0_10px_28px_rgba(0,0,0,0.45)]'
          : 'border-[#9BB86A]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_6px_18px_rgba(18,59,42,0.12)] hover:shadow-[0_8px_22px_rgba(18,59,42,0.16)]',
        className,
      )}
    >
      {/* Cardamom texture track — small, soft, premium */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(105deg, rgba(18,59,42,0.92) 0%, rgba(18,59,42,0.55) 42%, rgba(34,72,48,0.35) 100%), url(${BRAND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: isDark ? 0.95 : 0.88,
          filter: isDark ? 'saturate(0.85) brightness(0.55)' : 'saturate(1.05) brightness(0.92)',
        }}
      />
      <span
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-500',
          isDark ? 'opacity-100' : 'opacity-90',
        )}
        style={{
          background: isDark
            ? 'radial-gradient(circle at 78% 50%, rgba(198,164,92,0.38), transparent 52%), linear-gradient(90deg, rgba(11,22,17,0.55), transparent 55%)'
            : 'radial-gradient(circle at 22% 50%, rgba(155,184,106,0.35), transparent 55%), linear-gradient(90deg, rgba(248,250,248,0.35), transparent 60%)',
        }}
      />

      <span
        className={cn(
          'relative z-10 flex flex-1 items-center justify-center transition-all duration-500',
          isDark ? 'text-white/30' : 'text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]',
        )}
      >
        <Sun
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-500',
            !isDark && 'scale-110 drop-shadow-[0_0_8px_rgba(255,236,170,0.65)]',
          )}
        />
      </span>
      <span
        className={cn(
          'relative z-10 flex flex-1 items-center justify-center transition-all duration-500',
          isDark ? 'text-gold drop-shadow-[0_0_8px_rgba(198,164,92,0.55)]' : 'text-white/35',
        )}
      >
        <Moon
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-500',
            isDark && 'scale-110',
          )}
        />
      </span>

      {/* Sliding jewel thumb with cardamom rim */}
      <span
        className={cn(
          'absolute top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          compact ? 'h-7 w-7' : 'h-8 w-8',
          isDark
            ? 'left-[calc(100%-0.25rem)] -translate-x-full bg-gradient-to-br from-[#F0DFA8] via-gold to-[#8F7340] text-forest shadow-[0_0_0_2px_rgba(198,164,92,0.35),0_6px_16px_rgba(198,164,92,0.45),inset_0_1px_0_rgba(255,255,255,0.55)]'
            : 'left-1 translate-x-0 bg-gradient-to-br from-[#E8F2D8] via-[#C5D98A] to-[#6F8F3E] text-forest shadow-[0_0_0_2px_rgba(255,255,255,0.35),0_6px_16px_rgba(111,143,62,0.4),inset_0_1px_0_rgba(255,255,255,0.65)]',
        )}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-[#3F5A1F]" />
        )}
      </span>
    </button>
  )
}

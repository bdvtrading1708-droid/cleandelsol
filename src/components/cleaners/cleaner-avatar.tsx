'use client'

interface CleanerAvatarProps {
  src?: string | null
  name: string
  size?: number
  className?: string
}

export function CleanerAvatar({ src, name, size = 44, className = '' }: CleanerAvatarProps) {
  const initial = (name || '?')[0].toUpperCase()

  if (src) {
    return (
      <div
        className={`rounded-full overflow-hidden shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: 'var(--hero-bg)',
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  )
}

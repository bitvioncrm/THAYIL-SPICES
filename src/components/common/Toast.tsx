/** Lightweight inline notice helper used across forms via local state banners. */
export function InlineNotice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'success'
  children: React.ReactNode
}) {
  const styles =
    tone === 'error'
      ? 'bg-red-50 text-red-700'
      : tone === 'success'
        ? 'bg-light-green text-forest'
        : 'bg-muted text-ink'
  return <div className={`rounded-lg px-3 py-2 text-sm ${styles}`}>{children}</div>
}

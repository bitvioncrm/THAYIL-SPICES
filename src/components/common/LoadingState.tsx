export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-light-green border-t-emerald" />
      <p className="text-sm text-soft">{label}</p>
    </div>
  )
}

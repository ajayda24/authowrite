/** Distraction-free pages (editor, reader) render without the site header. */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

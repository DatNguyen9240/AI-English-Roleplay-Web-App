import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
  isSessionActive?: boolean;
}

/**
 * Full-screen page layout wrapper shared by the auth and dashboard views.
 * Keeps the background gradient definition in one place.
 */
export function PageShell({ children, isSessionActive }: PageShellProps): React.ReactElement {
  return (
    <div className={`dark min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-0 ${
      isSessionActive ? 'h-[100dvh] overflow-hidden' : 'overflow-x-hidden'
    }`}>
      {children}
    </div>
  );
}

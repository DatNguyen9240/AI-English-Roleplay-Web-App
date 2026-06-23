import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
}

/**
 * Full-screen page layout wrapper shared by the auth and dashboard views.
 * Keeps the background gradient definition in one place.
 */
export function PageShell({ children }: PageShellProps): React.ReactElement {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-0 sm:p-6 overflow-x-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
      {children}
    </div>
  );
}

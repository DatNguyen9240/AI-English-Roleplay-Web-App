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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
      {children}
    </div>
  );
}

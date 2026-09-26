import React from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { BottomNav } from '../common/BottomNav';
import { CallModal } from '../chat/CallModal';
import { MarkerDetailDialog } from '../map/MarkerDetailDialog';

export const MobileShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedUser, setSelectedUser, isNavHidden } = useApp();
  const pathname = usePathname();

  // Chat room is fullscreen (bottom nav hidden), like the original design
  const isChatDetailFullscreen = /^\/chat\/[^/]+/.test(pathname);
  // isNavHidden is only driven by the immersive moments feed — scope it there
  // so a stale value never hides the nav on other routes.
  const isImmersiveMoments = isNavHidden && pathname.startsWith('/moments');
  const hideBottomNav = isChatDetailFullscreen || isImmersiveMoments;

  return (
    <div className="h-[100dvh] w-full bg-slate-100 flex justify-center overflow-hidden">
      {/* Active Call Overlay */}
      <CallModal />

      {/* Mobile-first Web Application Viewport */}
      <div className="w-full max-w-md h-full flex flex-col bg-white sm:shadow-xl sm:border-x sm:border-slate-200 overflow-hidden relative">
        {/* Main Content View (routed page) */}
        <main className="flex-1 w-full overflow-hidden relative bg-white flex flex-col">
          {children}
        </main>

        {/* Bottom Persistent Navigation Bar - hidden in fullscreen or when immersive/hidden */}
        {!hideBottomNav && <BottomNav />}

        {/* Global User Profile Modal */}
        {selectedUser && (
          <MarkerDetailDialog
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </div>
    </div>
  );
};

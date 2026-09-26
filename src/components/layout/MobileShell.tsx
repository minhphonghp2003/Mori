import React from 'react';
import { useApp } from '../../context/AppContext';
import { BottomNav } from '../common/BottomNav';
import { ToastContainer } from '../common/Toast';
import { CallModal } from '../chat/CallModal';
import { HomeView } from '../home/HomeView';
import { MomentsView } from '../moments/MomentsView';
import { LocationView } from '../map/LocationView';
import { ChatListView } from '../chat/ChatListView';
import { SettingsView } from '../settings/SettingsView';
import { MarkerDetailDialog } from '../map/MarkerDetailDialog';

export const MobileShell: React.FC = () => {
  const { activeTab, selectedUser, setSelectedUser, activeConversationId, isNavHidden } = useApp();

  const isChatDetailFullscreen = activeTab === 'chat' && !!activeConversationId;
  const hideBottomNav = isChatDetailFullscreen || isNavHidden;

  return (
    <div className="h-[100dvh] w-full bg-slate-100 flex justify-center overflow-hidden">
      {/* Toast notifications container */}
      <ToastContainer />

      {/* Active Call Overlay */}
      <CallModal />

      {/* Mobile-first Web Application Viewport */}
      <div className="w-full max-w-md h-full flex flex-col bg-white sm:shadow-xl sm:border-x sm:border-slate-200 overflow-hidden relative">
        {/* Main Content View (Switch based on active bottom tab) */}
        <main className="flex-1 w-full overflow-hidden relative bg-white flex flex-col">
          {activeTab === 'home' && <HomeView />}
          {activeTab === 'moments' && <MomentsView />}
          {activeTab === 'map' && <LocationView />}
          {activeTab === 'chat' && <ChatListView />}
          {activeTab === 'setting' && <SettingsView />}
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

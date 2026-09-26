import React, { useEffect, useState } from 'react';
import { Moment } from '../../types';
import { MomentReelCard } from './MomentReelCard';

interface MomentViewerModalProps {
  moment: Moment;
  onClose: () => void;
}

export const MomentViewerModal: React.FC<MomentViewerModalProps> = ({ moment, onClose }) => {
  const [isImmersive, setIsImmersive] = useState(false);

  // Lock body scroll or handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-in fade-in duration-200">
      <div className="relative w-full h-full max-w-md mx-auto bg-black overflow-hidden shadow-2xl flex flex-col">
        <MomentReelCard 
          moment={moment} 
          onClose={onClose} 
          autoPlayVideo={true}
          isImmersive={isImmersive}
          onToggleImmersive={() => setIsImmersive(!isImmersive)}
        />
      </div>
    </div>
  );
};

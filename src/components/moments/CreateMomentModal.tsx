import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VisibilityTier } from '../../types';
import { VISIBILITY_OPTIONS } from '@/constants/visibility';
import { 
  X, 
  MapPin, 
  Eye, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Upload, 
  Users, 
  RotateCcw, 
  SwitchCamera, 
  Check, 
  Zap,
  ZapOff,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Loader2
} from 'lucide-react';

interface CreateMomentModalProps {
  onClose: () => void;
}

export const CreateMomentModal: React.FC<CreateMomentModalProps> = ({ onClose }) => {
  const { addMoment, currentUser, friends, showToast } = useApp();

  // Mode: 'capture' (live camera view) or 'edit' (preview, caption & publish)
  const [step, setStep] = useState<'capture' | 'edit'>('capture');
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Captured / Selected Media
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>('');
  const [selectedVideoPoster, setSelectedVideoPoster] = useState<string>('');

  // Immersive Mode in Editor (Tap media to hide all overlays and view pristine fullscreen image/video)
  const [isImmersive, setIsImmersive] = useState(false);

  // Video Controller State for Editor
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const editVideoRef = useRef<HTMLVideoElement | null>(null);

  // Post Metadata
  const [caption, setCaption] = useState('');
  const [includeLocation, setIncludeLocation] = useState(true);
  const [allowDirectMessage, setAllowDirectMessage] = useState(true);
  const [visibility, setVisibility] = useState<VisibilityTier>(currentUser.visibility || 1);

  // Friends Whitelist / Exclude Map
  const applicableFriends = useMemo(() => {
    if (visibility === 0) return []; // Chỉ mình tôi
    if (visibility === 2) {
      return friends.filter(f => f.relationship?.type === 'best_friend');
    }
    if (visibility === 3) {
      return friends.filter(f => f.relationship?.type === 'lover');
    }
    return friends;
  }, [friends, visibility]);

  const [allowedFriendsMap, setAllowedFriendsMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    friends.forEach(f => {
      map[f.id] = true;
    });
    return map;
  });

  const toggleFriendAllowed = (friendId: string) => {
    setAllowedFriendsMap(prev => ({
      ...prev,
      [friendId]: prev[friendId] === undefined ? false : !prev[friendId]
    }));
  };

  const handleSelectAllFriends = (allow: boolean) => {
    const updated: Record<string, boolean> = { ...allowedFriendsMap };
    applicableFriends.forEach(f => {
      updated[f.id] = allow;
    });
    setAllowedFriendsMap(updated);
  };

  // Refs
  const videoStreamRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);

  // Start Live Camera stream when in 'capture' step
  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      if (step !== 'capture') return;
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: captureMode === 'video'
        });

        if (active && videoStreamRef.current) {
          mediaStreamRef.current = stream;
          videoStreamRef.current.srcObject = stream;
          videoStreamRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('Camera stream could not be started or permission denied:', err);
      }
    };

    startCamera();

    return () => {
      active = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [step, facingMode, captureMode]);

  // Flip Camera Front/Back
  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Handle Photo Snap from Live Video Stream
  const handleSnapPhoto = () => {
    if (videoStreamRef.current && videoStreamRef.current.videoWidth > 0) {
      const video = videoStreamRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setSelectedImages([dataUrl]);
        setPreviewImageIndex(0);
        setMediaType('image');
        setIsImmersive(false);
        setStep('edit');
        showToast('Đã chụp ảnh thành công!', 'success');
        return;
      }
    }

    // Fallback if camera stream is inactive
    const fallbackImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
    setSelectedImages([fallbackImage]);
    setPreviewImageIndex(0);
    setMediaType('image');
    setIsImmersive(false);
    setStep('edit');
    showToast('Đã chụp ảnh khoảnh khắc', 'success');
  };

  // Video Recording Handlers
  const handleStartRecording = () => {
    if (!mediaStreamRef.current) {
      showToast('Bắt đầu quay video ngắn...', 'info');
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 15) {
            handleStopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
      return;
    }

    try {
      recordedChunksRef.current = [];
      const options = { mimeType: 'video/webm;codecs=vp9' };
      const recorder = new MediaRecorder(mediaStreamRef.current, MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(blob);
        setSelectedVideoUrl(videoUrl);
        setSelectedVideoPoster('');
        setMediaType('video');
        setIsImmersive(false);
        setStep('edit');
        showToast('Đã quay xong video ngắn!', 'success');
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 15) {
            handleStopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Error starting MediaRecorder:', err);
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Fallback demo video
      setSelectedVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4');
      setSelectedVideoPoster('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80');
      setMediaType('video');
      setIsImmersive(false);
      setStep('edit');
    }
  };

  // Handle Gallery Selection (Single or Multi-image / Video)
  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Video File
    if (files[0].type.startsWith('video/')) {
      const url = URL.createObjectURL(files[0]);
      setSelectedVideoUrl(url);
      setSelectedVideoPoster('');
      setMediaType('video');
      setIsImmersive(false);
      setStep('edit');
      showToast('Đã chọn video từ thư viện', 'success');
      e.target.value = '';
      return;
    }

    // Multiple Images
    const newImages: string[] = [];
    const readCount = files.length;
    let loaded = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
        }
        loaded++;
        if (loaded === readCount) {
          // Append to existing picks (capped at 10) — "Thêm ảnh" must not
          // wipe what was already selected.
          setSelectedImages((prev) => [...prev, ...newImages].slice(0, 10));
          setPreviewImageIndex(0);
          setMediaType('image');
          setIsImmersive(false);
          setStep('edit');
          showToast(`Đã thêm ${newImages.length} ảnh`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Delete single photo in multi-image set
  const handleRemoveImage = (indexToRemove: number) => {
    if (selectedImages.length <= 1) {
      setStep('capture');
      setSelectedImages([]);
      return;
    }
    const filtered = selectedImages.filter((_, idx) => idx !== indexToRemove);
    setSelectedImages(filtered);
    if (previewImageIndex >= filtered.length) {
      setPreviewImageIndex(filtered.length - 1);
    }
  };

  // Swipe gesture handling for multi-images in Editor
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartXRef.current = e.touches[0].clientX;
    swipeStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartXRef.current === null || swipeStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - swipeStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - swipeStartYRef.current;

    // Check if horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40 && mediaType === 'image' && selectedImages.length > 1) {
      if (deltaX < 0 && previewImageIndex < selectedImages.length - 1) {
        setPreviewImageIndex(prev => prev + 1);
      } else if (deltaX > 0 && previewImageIndex > 0) {
        setPreviewImageIndex(prev => prev - 1);
      }
    }

    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
  };

  // Video controller handlers
  const handleTogglePlayVideo = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!editVideoRef.current) return;
    if (editVideoRef.current.paused) {
      editVideoRef.current.play();
      setIsVideoPlaying(true);
    } else {
      editVideoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const handleToggleMuteVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editVideoRef.current) return;
    const nextMuted = !isVideoMuted;
    editVideoRef.current.muted = nextMuted;
    setIsVideoMuted(nextMuted);
  };

  const handleVideoSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newTime = Number(e.target.value);
    if (editVideoRef.current) {
      editVideoRef.current.currentTime = newTime;
      setVideoCurrentTime(newTime);
    }
  };

  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Publish Moment
  const [isPublishing, setIsPublishing] = useState(false);

  const sourceToBlob = async (src: string): Promise<Blob> => {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error('bad status');
      return await res.blob();
    } catch {
      throw new Error('Không thể xử lý media đã chọn. Vui lòng chụp lại hoặc chọn ảnh/video từ thiết bị.');
    }
  };

  const extFromType = (type: string, fallback: string): string => {
    const seg = type.split('/')[1]?.split(';')[0];
    if (!seg) return fallback;
    return seg === 'jpeg' ? 'jpg' : seg;
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublishing) return;
    setIsPublishing(true);
    try {
      const excludedUserIds = applicableFriends
        .filter((f) => allowedFriendsMap[f.id] === false)
        .map((f) => f.id);

      if (mediaType === 'video') {
        const blob = await sourceToBlob(selectedVideoUrl);
        const file = new File([blob], `moment.${extFromType(blob.type, 'mp4')}`, {
          type: blob.type || 'video/mp4',
        });
        await addMoment({
          caption: caption.trim() || 'Khoảnh khắc video mới',
          video: file,
          includeLocation,
          visibility,
          excludedUserIds,
          allowComment: allowDirectMessage,
        });
      } else {
        const blobs = await Promise.all(selectedImages.map((src) => sourceToBlob(src)));
        const images = blobs.map(
          (b, i) =>
            new File([b], `moment_${i + 1}.${extFromType(b.type, 'jpg')}`, {
              type: b.type || 'image/jpeg',
            }),
        );
        await addMoment({
          caption: caption.trim() || 'Khoảnh khắc mới',
          images,
          includeLocation,
          visibility,
          excludedUserIds,
          allowComment: allowDirectMessage,
        });
      }
      onClose();
    } catch {
      // Toasts are already shown by sourceToBlob / addMoment; keep the
      // editor open so the user can retry without re-capturing.
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-in fade-in duration-200">
      <div className="relative w-full h-full max-w-md mx-auto bg-slate-950 flex flex-col overflow-hidden select-none">
        {/* Hidden File Picker for Gallery Selection (Single or Multi-media) */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleGalleryFileChange}
        />

        {/* ========================================================================= */}
        {/* STEP 1: LIVE CAMERA VIEWFINDER (DEFAULT UPON OPENING)                     */}
        {/* ========================================================================= */}
        {step === 'capture' && (
          <div className="relative w-full h-full flex flex-col justify-between bg-black text-white">
            {/* Live Camera Viewport */}
            <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-slate-900">
              <video
                ref={videoStreamRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Top and Bottom Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
            </div>

            {/* Top Camera Controls Bar */}
            <div className="relative z-20 px-4 pt-4 flex items-center justify-between">
              {/* Close Modal Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all cursor-pointer shadow-lg"
                title="Đóng"
              >
                <X className="w-5 h-5 stroke-white" />
              </button>

              {/* Recording Time Indicator */}
              {isRecording && (
                <div className="flex items-center gap-2 px-3 py-1 bg-rose-600/90 backdrop-blur-md rounded-full text-white text-xs font-bold animate-pulse shadow-md">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
                </div>
              )}

              {/* Flash & Flip Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFlashOn(!isFlashOn)}
                  className={`w-10 h-10 rounded-full backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer ${
                    isFlashOn ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30' : 'bg-black/40 text-white hover:bg-black/60'
                  }`}
                  title="Đèn flash"
                >
                  {isFlashOn ? <Zap className="w-5 h-5 fill-slate-950" /> : <ZapOff className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all cursor-pointer shadow-lg"
                  title="Đổi camera trước / sau"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bottom Camera Action Area */}
            <div className="relative z-20 pb-8 pt-4 px-6 flex flex-col items-center gap-5 bg-gradient-to-t from-black via-black/70 to-transparent">
              {/* Photo vs Video Mode Switcher */}
              <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setCaptureMode('photo')}
                  className={`transition-all cursor-pointer ${
                    captureMode === 'photo' 
                      ? 'text-white border-b-2 border-white pb-1 scale-105' 
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Ảnh
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureMode('video')}
                  className={`transition-all cursor-pointer ${
                    captureMode === 'video' 
                      ? 'text-white border-b-2 border-white pb-1 scale-105' 
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Video
                </button>
              </div>

              {/* Shutter Row: Clean Gallery Icon on Left, Center Shutter Trigger Button */}
              <div className="w-full flex items-center justify-between px-2">
                {/* 1 Gallery Selection Icon Button (No AI presets) */}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 flex flex-col items-center justify-center text-white transition-all cursor-pointer active:scale-90 shadow-md group"
                  title="Chọn ảnh hoặc video từ Thư viện"
                >
                  <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  <span className="text-[9px] font-bold text-white/80">Thư viện</span>
                </button>

                {/* Big Center Shutter Trigger Button */}
                {captureMode === 'photo' ? (
                  <button
                    type="button"
                    onClick={handleSnapPhoto}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 transition-transform active:scale-90 cursor-pointer shadow-2xl"
                    title="Chụp ảnh"
                  >
                    <div className="w-full h-full rounded-full bg-white hover:bg-slate-100 transition-colors shadow-inner" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 transition-transform active:scale-90 cursor-pointer shadow-2xl ${
                      isRecording ? 'border-rose-500' : 'border-white'
                    }`}
                    title={isRecording ? 'Dừng quay' : 'Bắt đầu quay'}
                  >
                    <div className={`transition-all duration-200 ${
                      isRecording 
                        ? 'w-7 h-7 rounded-lg bg-rose-600' 
                        : 'w-full h-full rounded-full bg-rose-500 hover:bg-rose-600'
                    }`} />
                  </button>
                )}

                {/* Right Placeholder to maintain perfect center alignment */}
                <div className="w-12 h-12 opacity-0 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: STORY EDITOR, FULLSCREEN MEDIA PREVIEW & PUBLISH SCREEN           */}
        {/* ========================================================================= */}
        {step === 'edit' && (
          <div 
            className="relative w-full h-full flex flex-col justify-between bg-black text-white"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Fullscreen Media Preview Background (Tap to toggle immersive mode) */}
            <div 
              className="absolute inset-0 z-0 flex items-center justify-center bg-black overflow-hidden cursor-pointer"
              onClick={() => setIsImmersive(prev => !prev)}
            >
              {mediaType === 'image' ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    key={previewImageIndex}
                    src={selectedImages[previewImageIndex]}
                    alt="Captured preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover animate-in fade-in duration-200"
                  />

                  {/* Top multi-image dots indicator */}
                  {selectedImages.length > 1 && !isImmersive && (
                    <div className="absolute top-16 inset-x-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                      {selectedImages.map((_, idx) => (
                        <span
                          key={idx}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            idx === previewImageIndex ? 'w-6 bg-white shadow-sm' : 'w-1.5 bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={editVideoRef}
                    src={selectedVideoUrl}
                    poster={selectedVideoPoster}
                    autoPlay
                    loop
                    playsInline
                    muted={isVideoMuted}
                    onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                    className="w-full h-full object-cover"
                  />

              
                </div>
              )}

              {/* Gradient Overlays (Hidden in Immersive mode) */}
              <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none transition-opacity duration-300 ${
                isImmersive ? 'opacity-0' : 'opacity-100'
              }`} />
              <div className={`absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none transition-opacity duration-300 ${
                isImmersive ? 'opacity-0' : 'opacity-100'
              }`} />
            </div>

            {/* Immersive Mode Hint Button (Floating button when UI is hidden) */}
            {isImmersive && (
              <button
                type="button"
                onClick={() => setIsImmersive(false)}
                className="absolute top-4 right-4 z-40 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-lg animate-in fade-in duration-200 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Hiện chi tiết</span>
              </button>
            )}

            {/* Fullscreen Video Controller overlay in Immersive Mode */}
            {isImmersive && mediaType === 'video' && (
              <div 
                className="absolute inset-x-0 bottom-0 z-40 px-4 pb-4 pt-8 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-auto flex flex-col gap-1.5 animate-in fade-in duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTogglePlayVideo}
                    className="text-white hover:text-emerald-400 active:scale-90 transition-all cursor-pointer p-1"
                    title={isVideoPlaying ? 'Dừng video' : 'Phát tiếp'}
                  >
                    {isVideoPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>

                  <span className="text-[11px] font-mono text-white/90 shrink-0 font-medium select-none">
                    {formatVideoTime(videoCurrentTime)}
                  </span>

                  <input
                    type="range"
                    min={0}
                    max={videoDuration || 15}
                    step={0.1}
                    value={videoCurrentTime}
                    onChange={handleVideoSeek}
                    className="flex-1 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:h-2 transition-all"
                  />

                  <span className="text-[11px] font-mono text-white/60 shrink-0 font-medium select-none">
                    {formatVideoTime(videoDuration)}
                  </span>

                  <button
                    type="button"
                    onClick={handleToggleMuteVideo}
                    className="text-white hover:text-emerald-400 active:scale-90 transition-all cursor-pointer p-1"
                    title={isVideoMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
                  >
                    {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Top Edit Bar: Retake & Add Photo Tools (Hidden in Immersive mode) */}
            <div className={`relative z-20 px-4 pt-4 flex items-center justify-between transition-all duration-300 ${
              isImmersive ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
            }`}>
              {/* Retake Button */}
              <button
                type="button"
                onClick={() => setStep('capture')}
                className="px-3.5 py-1.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 flex items-center gap-1.5 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Chụp lại</span>
              </button>

              {/* Add more photos or delete current photo in multi-image set */}
              {mediaType === 'image' && (
                <div className="flex items-center gap-2">
                  {selectedImages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(previewImageIndex);
                      }}
                      className="p-2 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-md"
                      title="Xóa ảnh này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      galleryInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25 flex items-center gap-1 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-md"
                    title="Thêm ảnh khác"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Thêm ảnh ({selectedImages.length})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Form Sheet & Video Controller (Hidden in Immersive mode) */}
            <div className={`relative z-20 px-4 pb-6 space-y-3 transition-all duration-300 ${
              isImmersive ? 'opacity-0 translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0'
            }`}>
              {/* VIDEO CONTROLLER COMPONENT (When editing a video moment) */}
           

              {/* Caption Input Form Sheet */}
              <form onSubmit={handlePublish} className="space-y-3" onClick={(e) => e.stopPropagation()}>
                {/* Caption Input */}
                <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 shadow-xl">
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={2000}
                    placeholder="Thêm chú thích cho khoảnh khắc này..."
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
                  />
                </div>

                {/* Location & Direct Message switch rows */}
                <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl divide-y divide-white/10 overflow-hidden">
                  {/* Location row */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeLocation}
                    onClick={() => setIncludeLocation(!includeLocation)}
                    className="w-full flex items-center gap-3 p-3 text-left cursor-pointer active:bg-white/5 transition-colors"
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      includeLocation ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40' : 'bg-white/10 text-white/40'
                    }`}>
                      <MapPin className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-xs font-bold truncate ${
                        includeLocation ? 'text-white' : 'text-white/50'
                      }`}>
                        Đính kèm vị trí
                      </span>
                      <span className="block text-[11px] text-white/50 truncate">
                        {includeLocation
                          ? (currentUser.location.address || 'Vị trí hiện tại của bạn')
                          : 'Mọi người sẽ không thấy vị trí'}
                      </span>
                    </span>
                    <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      includeLocation ? 'bg-emerald-500' : 'bg-white/20'
                    }`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        includeLocation ? 'left-[22px]' : 'left-0.5'
                      }`} />
                    </span>
                  </button>

                  {/* Direct Message row */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowDirectMessage}
                    onClick={() => setAllowDirectMessage(!allowDirectMessage)}
                    className="w-full flex items-center gap-3 p-3 text-left cursor-pointer active:bg-white/5 transition-colors"
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      allowDirectMessage ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40' : 'bg-white/10 text-white/40'
                    }`}>
                      <MessageSquare className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-xs font-bold truncate ${
                        allowDirectMessage ? 'text-white' : 'text-white/50'
                      }`}>
                        Cho phép nhắn tin
                      </span>
                      <span className="block text-[11px] text-white/50 truncate">
                        {allowDirectMessage
                          ? 'Bạn bè có thể nhắn tin từ khoảnh khắc này'
                          : 'Tắt trò chuyện từ khoảnh khắc'}
                      </span>
                    </span>
                    <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      allowDirectMessage ? 'bg-emerald-500' : 'bg-white/20'
                    }`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        allowDirectMessage ? 'left-[22px]' : 'left-0.5'
                      }`} />
                    </span>
                  </button>
                </div>

                {/* Visibility Selector & Horizontal Friends Allowance Badges */}
                <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Quyền xem:</span>
                    </div>

                    <Select
                      value={String(visibility)}
                      onValueChange={(value) => setVisibility(Number(value) as VisibilityTier)}
                    >
                      <SelectTrigger className="h-auto w-auto gap-1.5 border-white/20 bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white shadow-none focus:ring-emerald-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900 text-white">
                        {VISIBILITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Horizontal Compact Friend Allowance Badges */}
                  {applicableFriends.length > 0 && visibility !== 0 && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-white/60 font-medium">
                          Cho phép ({applicableFriends.filter(f => allowedFriendsMap[f.id] !== false).length}/{applicableFriends.length})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectAllFriends(true)}
                            className="text-[10px] text-emerald-400 font-bold hover:underline cursor-pointer"
                          >
                            Bật tất cả
                          </button>
                          <span className="text-white/30">·</span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllFriends(false)}
                            className="text-[10px] text-white/40 font-medium hover:underline cursor-pointer"
                          >
                            Tắt tất cả
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
                        {applicableFriends.map((f) => {
                          const isAllowed = allowedFriendsMap[f.id] !== false;
                          const lastName = f.name.trim().split(' ').pop() || f.name;

                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => toggleFriendAllowed(f.id)}
                              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group focus:outline-none transition-all active:scale-95"
                              title={`${f.name}: ${isAllowed ? 'Được phép xem' : 'Bị ẩn'}`}
                            >
                              <div className="relative">
                                <Avatar
                                  src={f.avatar}
                                  name={f.name}
                                  className={`w-11 h-11 rounded-full object-cover transition-all duration-200 ${
                                    isAllowed
                                      ? 'border-2 border-emerald-500 shadow-md shadow-emerald-500/20'
                                      : 'border-2 border-white/30 opacity-30 grayscale'
                                  }`}
                                />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-black shadow-xs ${
                                  isAllowed ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                                }`}>
                                  {isAllowed ? (
                                    <Check className="w-2.5 h-2.5" aria-hidden="true" />
                                  ) : (
                                    <X className="w-2.5 h-2.5" aria-hidden="true" />
                                  )}
                                </span>
                              </div>

                              <span className={`text-[10px] font-medium tracking-tight transition-colors text-center max-w-[50px] truncate ${
                                isAllowed ? 'text-white' : 'text-white/40 line-through'
                              }`}>
                                {lastName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Publish Action Button */}
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang đăng lên...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng khoảnh khắc ngay</span>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

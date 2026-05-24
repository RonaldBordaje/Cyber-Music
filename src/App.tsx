/**
 * Cyber Music – Main Application Component
 * 
 * Production-ready offline music player web application with:
 * - IndexedDB persistence (survives refresh)
 * - Media Session API (browser media controls)
 * - Service Worker registration for offline-first
 * - Responsive web layout with sidebar
 * - Keyboard shortcuts
 * - Cinematic intro screen
 * 
 * Deployment: Vercel / Netlify / any static hosting
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  type TrackMeta,
  type TrackRecord,
  loadAllTracks,
  saveTrack,
  removeTrack,
  clearAllTracks,
  updateTrackOrders,
  saveSetting,
  loadSetting,
  generateId,
  parseFilename,
  arrayBufferToBlobUrl,
  fileToArrayBuffer,
  getAudioDuration,
} from './db';
import IntroScreen from './components/IntroScreen';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import ConfirmModal from './components/ConfirmModal';
import Toast, { type ToastMessage } from './components/Toast';

type RepeatMode = 'off' | 'all' | 'one';

export default function App() {
  // ============== STATE ==============
  const [tracks, setTracks] = useState<TrackMeta[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ============== REFS ==============
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

  // Current track helper
  const currentTrack = tracks.find((t) => t.id === currentTrackId) || null;

  // ============== TOAST HELPER ==============
  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = generateId();
    setToasts((prev) => [...prev.slice(-4), { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ============== INTRO COMPLETE ==============
  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
  }, []);

  // ============== AUDIO ENGINE ==============
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('durationchange', () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    });

    audio.addEventListener('loadedmetadata', () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    });

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, []);

  // ============== LOAD FROM INDEXEDDB ==============
  useEffect(() => {
    (async () => {
      try {
        const records = await loadAllTracks();
        const metas: TrackMeta[] = [];

        for (const record of records) {
          try {
            const blobUrl = arrayBufferToBlobUrl(record.arrayBuffer, record.mimeType);
            blobUrlsRef.current.set(record.id, blobUrl);
            metas.push({
              id: record.id,
              title: record.title,
              artist: record.artist,
              duration: record.duration,
              mimeType: record.mimeType,
              order: record.order,
              fileName: record.fileName,
              blobUrl,
            });
          } catch {
            console.warn('Failed to restore track:', record.title);
          }
        }

        setTracks(metas);

        const savedTrackId = await loadSetting('currentTrackId') as string | null;
        const savedVolume = await loadSetting('volume') as number | null;
        const savedShuffle = await loadSetting('shuffle') as boolean | null;
        const savedRepeat = await loadSetting('repeat') as RepeatMode | null;

        if (savedVolume !== null) setVolume(savedVolume);
        if (savedShuffle !== null) setShuffleOn(savedShuffle);
        if (savedRepeat) setRepeatMode(savedRepeat);
        if (savedTrackId && metas.find((t) => t.id === savedTrackId)) {
          setCurrentTrackId(savedTrackId);
        }
      } catch (err) {
        console.error('Failed to load from IndexedDB:', err);
        showToast('Failed to load library', 'error');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [showToast]);

  // ============== PLAY TRACK ==============
  const playTrack = useCallback(
    (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;

      const audio = audioRef.current;
      if (!audio) return;

      const blobUrl = blobUrlsRef.current.get(trackId);
      if (!blobUrl) {
        showToast(`Cannot play "${track.title}" – data missing`, 'error');
        return;
      }

      audio.src = blobUrl;
      audio.volume = volume;
      audio.play().then(() => {
        setIsPlaying(true);
        setCurrentTrackId(trackId);
        saveSetting('currentTrackId', trackId).catch(() => {});
        updateMediaSession(track);
      }).catch((err) => {
        console.error('Play error:', err);
        showToast(`Failed to play "${track.title}"`, 'error');
        handleNext(trackId);
      });

      setCurrentTrackId(trackId);
    },
    [tracks, volume, showToast]
  );

  // ============== PLAY / PAUSE ==============
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrackId) {
      if (tracks.length > 0) {
        playTrack(tracks[0].id);
      }
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (!audio.src) {
        const blobUrl = blobUrlsRef.current.get(currentTrackId);
        if (blobUrl) audio.src = blobUrl;
      }
      audio.volume = volume;
      audio.play().then(() => {
        setIsPlaying(true);
        if (currentTrack) updateMediaSession(currentTrack);
      }).catch((err) => {
        console.error('Resume error:', err);
        showToast('Failed to resume playback', 'error');
      });
    }
  }, [currentTrackId, isPlaying, tracks, volume, playTrack, currentTrack, showToast]);

  // ============== NEXT / PREV ==============
  const handleNext = useCallback(
    (fromId?: string) => {
      if (tracks.length === 0) return;
      const id = fromId || currentTrackId;
      const currentIdx = tracks.findIndex((t) => t.id === id);

      if (shuffleOn) {
        let nextIdx = Math.floor(Math.random() * tracks.length);
        if (tracks.length > 1) {
          while (nextIdx === currentIdx) {
            nextIdx = Math.floor(Math.random() * tracks.length);
          }
        }
        playTrack(tracks[nextIdx].id);
        return;
      }

      let nextIdx = currentIdx + 1;
      if (nextIdx >= tracks.length) {
        if (repeatMode === 'all') {
          nextIdx = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
      playTrack(tracks[nextIdx].id);
    },
    [tracks, currentTrackId, shuffleOn, repeatMode, playTrack]
  );

  const handlePrev = useCallback(() => {
    if (tracks.length === 0) return;
    const audio = audioRef.current;
    
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const currentIdx = tracks.findIndex((t) => t.id === currentTrackId);
    let prevIdx = currentIdx - 1;
    if (prevIdx < 0) {
      prevIdx = repeatMode === 'all' ? tracks.length - 1 : 0;
    }
    playTrack(tracks[prevIdx].id);
  }, [tracks, currentTrackId, repeatMode, playTrack]);

  // ============== AUDIO EVENTS ==============
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        handleNext();
      }
    };

    const handleError = () => {
      if (currentTrack) {
        showToast(`Error playing "${currentTrack.title}" – skipping`, 'error');
      }
      handleNext();
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [repeatMode, handleNext, currentTrack, showToast]);

  // ============== VOLUME SYNC ==============
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => { saveSetting('volume', volume).catch(() => {}); }, [volume]);
  useEffect(() => { saveSetting('shuffle', shuffleOn).catch(() => {}); }, [shuffleOn]);
  useEffect(() => { saveSetting('repeat', repeatMode).catch(() => {}); }, [repeatMode]);

  // ============== SEEK ==============
  const handleSeek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio && isFinite(time)) {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
      setCurrentTime(audio.currentTime);
    }
  }, []);

  // ============== MEDIA SESSION ==============
  const updateMediaSession = useCallback((track: TrackMeta) => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: 'Cyber Music',
    });

    navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
    navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
    navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) handleSeek(details.seekTime);
    });
  }, [togglePlayPause, handlePrev, handleNext, handleSeek]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  useEffect(() => {
    if ('mediaSession' in navigator && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: Math.min(currentTime, duration),
        });
      } catch { /* ignore */ }
    }
  }, [currentTime, duration]);

  // ============== FILE UPLOAD ==============
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newTracks: TrackMeta[] = [];
      let addedCount = 0;
      let errorCount = 0;
      const startOrder = tracks.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.toLowerCase();
        if (!file.type.startsWith('audio/') && 
            !ext.endsWith('.mp3') && !ext.endsWith('.m4a') && 
            !ext.endsWith('.ogg') && !ext.endsWith('.wav') && !ext.endsWith('.flac')) {
          errorCount++;
          continue;
        }

        try {
          const arrayBuffer = await fileToArrayBuffer(file);
          const mimeType = file.type || 'audio/mpeg';

          let dur = 0;
          try {
            dur = await getAudioDuration(arrayBuffer, mimeType);
          } catch { /* duration unknown */ }

          const { title, artist } = parseFilename(file.name);
          const id = generateId();

          const record: TrackRecord = {
            id, title, artist, duration: dur, mimeType, arrayBuffer,
            order: startOrder + i, fileName: file.name,
          };

          await saveTrack(record);

          const blobUrl = arrayBufferToBlobUrl(arrayBuffer, mimeType);
          blobUrlsRef.current.set(id, blobUrl);

          newTracks.push({
            id, title, artist, duration: dur, mimeType,
            order: startOrder + i, fileName: file.name, blobUrl,
          });
          addedCount++;
        } catch (err) {
          console.error('Failed to process file:', file.name, err);
          errorCount++;
        }
      }

      if (newTracks.length > 0) {
        setTracks((prev) => [...prev, ...newTracks]);
      }

      if (addedCount > 0) showToast(`Added ${addedCount} track${addedCount > 1 ? 's' : ''}`, 'success');
      if (errorCount > 0) showToast(`${errorCount} file${errorCount > 1 ? 's' : ''} failed`, 'error');
    },
    [tracks.length, showToast]
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ============== TRACK MANAGEMENT ==============
  const handleTrackSelect = useCallback(
    (id: string) => {
      playTrack(id);
      setSidebarOpen(false); // Close sidebar on mobile after selection
    },
    [playTrack]
  );

  const handleRemoveTrack = useCallback(
    async (id: string) => {
      const blobUrl = blobUrlsRef.current.get(id);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrlsRef.current.delete(id);
      }

      if (currentTrackId === id) {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        }
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        const currentIdx = tracks.findIndex((t) => t.id === id);
        const remaining = tracks.filter((t) => t.id !== id);
        if (remaining.length > 0) {
          setCurrentTrackId(remaining[Math.min(currentIdx, remaining.length - 1)].id);
        } else {
          setCurrentTrackId(null);
        }
      }

      try { await removeTrack(id); } catch { /* ignore */ }

      setTracks((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        updateTrackOrders(updated.map((t, i) => ({ id: t.id, order: i }))).catch(() => {});
        return updated.map((t, i) => ({ ...t, order: i }));
      });

      showToast('Track removed', 'info');
    },
    [currentTrackId, tracks, showToast]
  );

  const handleClearAll = useCallback(async () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current.clear();

    try { await clearAllTracks(); } catch { /* ignore */ }

    setTracks([]);
    setCurrentTrackId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setShowClearModal(false);
    showToast('Library cleared', 'info');
  }, [showToast]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setTracks((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      updateTrackOrders(updated.map((t, i) => ({ id: t.id, order: i }))).catch(() => {});
      return updated.map((t, i) => ({ ...t, order: i }));
    });
  }, []);

  // ============== SHUFFLE / REPEAT ==============
  const toggleShuffle = useCallback(() => {
    setShuffleOn((prev) => {
      showToast(!prev ? 'Shuffle ON' : 'Shuffle OFF', 'info');
      return !prev;
    });
  }, [showToast]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const next = modes[(modes.indexOf(prev) + 1) % modes.length];
      showToast({ off: 'Repeat OFF', all: 'Repeat ALL', one: 'Repeat ONE' }[next], 'info');
      return next;
    });
  }, [showToast]);

  // ============== KEYBOARD SHORTCUTS ==============
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((v) => Math.min(1, v + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((v) => Math.max(0, v - 0.05));
          break;
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [togglePlayPause, handleNext, handlePrev]);

  // ============== SERVICE WORKER ==============
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.warn('SW registration failed:', err));
    }
  }, []);

  // ============== RENDER ==============

  if (showIntro) {
    return <IntroScreen onComplete={handleIntroComplete} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-bg">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 disc-spin"
            style={{
              background: 'radial-gradient(circle, var(--red) 0%, #8b0000 60%, #0a0a0a 100%)',
              boxShadow: '0 0 30px var(--red-glow)',
            }}
          />
          <p className="text-text-dim text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
            LOADING...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          handleFileSelect(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Header */}
      <Header
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          tracks={tracks}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onTrackSelect={handleTrackSelect}
          onRemoveTrack={handleRemoveTrack}
          onReorder={handleReorder}
          onAddFiles={triggerFileInput}
          onClearAll={() => setShowClearModal(true)}
        />

        {/* Player */}
        <Player
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          shuffleOn={shuffleOn}
          repeatMode={repeatMode}
          onPlayPause={togglePlayPause}
          onNext={() => handleNext()}
          onPrev={handlePrev}
          onSeek={handleSeek}
          onVolumeChange={setVolume}
          onShuffleToggle={toggleShuffle}
          onRepeatToggle={toggleRepeat}
        />
      </div>

      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Clear All Modal */}
      {showClearModal && (
        <ConfirmModal
          title="Clear Library"
          message={`Remove all ${tracks.length} tracks? This cannot be undone.`}
          confirmText="Clear All"
          cancelText="Cancel"
          onConfirm={handleClearAll}
          onCancel={() => setShowClearModal(false)}
        />
      )}
    </div>
  );
}

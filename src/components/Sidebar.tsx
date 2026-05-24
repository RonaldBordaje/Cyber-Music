/**
 * Sidebar – Library panel with track list, search, and controls
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { type TrackMeta } from '../db';
import { formatTime } from '../utils/format';
import Equaliser from './Equaliser';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: TrackMeta[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onTrackSelect: (id: string) => void;
  onRemoveTrack: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddFiles: () => void;
  onClearAll: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  tracks,
  currentTrackId,
  isPlaying,
  onTrackSelect,
  onRemoveTrack,
  onReorder,
  onAddFiles,
  onClearAll,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom' | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Touch drag state
  const touchDragRef = useRef<{
    active: boolean;
    startIndex: number;
    currentIndex: number;
    startY: number;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    itemHeight: number;
  }>({
    active: false,
    startIndex: -1,
    currentIndex: -1,
    startY: 0,
    longPressTimer: null,
    itemHeight: 64,
  });

  // Filter tracks
  const filteredTracks = searchQuery.trim()
    ? tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tracks;

  const isSearching = searchQuery.trim().length > 0;

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (isSearching) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDragIndex(index);
  }, [isSearching]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOverIndex(index);
    setDragOverPosition(e.clientY < midY ? 'top' : 'bottom');
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
    setDragOverPosition(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(fromIndex) && fromIndex !== toIndex) {
      const adjustedTo = dragOverPosition === 'bottom' ? toIndex + 1 : toIndex;
      const finalTo = fromIndex < adjustedTo ? adjustedTo - 1 : adjustedTo;
      if (finalTo !== fromIndex) {
        onReorder(fromIndex, finalTo);
      }
    }
    setDragIndex(null);
    setDragOverIndex(null);
    setDragOverPosition(null);
  }, [onReorder, dragOverPosition]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
    setDragOverPosition(null);
  }, []);

  // Touch drag
  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    if (isSearching) return;
    const touch = e.touches[0];
    const ref = touchDragRef.current;
    
    ref.longPressTimer = setTimeout(() => {
      ref.active = true;
      ref.startIndex = index;
      ref.currentIndex = index;
      ref.startY = touch.clientY;
      
      const items = listRef.current?.querySelectorAll('[data-track-item]');
      if (items && items[index]) {
        ref.itemHeight = (items[index] as HTMLElement).getBoundingClientRect().height;
      }

      if (navigator.vibrate) navigator.vibrate(30);
      setDragIndex(index);
    }, 300);
  }, [isSearching]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const ref = touchDragRef.current;
    
    if (!ref.active) {
      if (ref.longPressTimer) {
        const touch = e.touches[0];
        const dy = Math.abs(touch.clientY - ref.startY);
        if (dy > 10) {
          clearTimeout(ref.longPressTimer);
          ref.longPressTimer = null;
        }
      }
      return;
    }

    e.preventDefault();
    const touch = e.touches[0];
    const dy = touch.clientY - ref.startY;
    const indexDelta = Math.round(dy / ref.itemHeight);
    const newIndex = Math.max(0, Math.min(tracks.length - 1, ref.startIndex + indexDelta));
    
    if (newIndex !== ref.currentIndex) {
      ref.currentIndex = newIndex;
      setDragOverIndex(newIndex);
      setDragOverPosition(newIndex > ref.startIndex ? 'bottom' : 'top');
      if (navigator.vibrate) navigator.vibrate(10);
    }
  }, [tracks.length]);

  const handleTouchEnd = useCallback(() => {
    const ref = touchDragRef.current;
    
    if (ref.longPressTimer) {
      clearTimeout(ref.longPressTimer);
      ref.longPressTimer = null;
    }

    if (ref.active) {
      const from = ref.startIndex;
      const to = ref.currentIndex;
      if (from !== to && from >= 0 && to >= 0) {
        onReorder(from, to);
      }
      ref.active = false;
      ref.startIndex = -1;
      ref.currentIndex = -1;
    }

    setDragIndex(null);
    setDragOverIndex(null);
    setDragOverPosition(null);
  }, [onReorder]);

  useEffect(() => {
    return () => {
      const ref = touchDragRef.current;
      if (ref.longPressTimer) clearTimeout(ref.longPressTimer);
    };
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed md:relative top-16 md:top-0 left-0 h-[calc(100%-4rem)] md:h-full
          w-80 md:w-80 lg:w-96 bg-surface border-r border-border
          flex flex-col z-50 transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-sm font-bold tracking-widest text-text-dim uppercase"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Library
            </h2>
            <div className="flex items-center gap-1">
              {tracks.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="btn-icon text-text-dim hover:text-red-accent"
                  title="Clear all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
              <button
                onClick={onAddFiles}
                className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface2 text-text-primary
                border border-border text-sm placeholder-text-dim outline-none
                focus:border-red-accent/50 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-primary"
              >
                ✕
              </button>
            )}
          </div>

          {/* Track count */}
          <p className="text-xs text-text-dim mt-2">
            {filteredTracks.length} {filteredTracks.length === 1 ? 'track' : 'tracks'}
            {isSearching && ` found`}
          </p>
        </div>

        {/* Track list */}
        <div ref={listRef} className="flex-1 overflow-y-auto scroll-smooth p-2">
          {filteredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-dim py-16 px-4">
              {tracks.length === 0 ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-surface2 flex items-center justify-center mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium">No tracks yet</p>
                  <p className="text-xs mt-1 opacity-60 text-center">
                    Click the Add button to upload MP3 files
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm">No matches found</p>
                  <p className="text-xs mt-1 opacity-60">Try a different search term</p>
                </>
              )}
            </div>
          ) : (
            filteredTracks.map((track) => {
              const realIndex = tracks.findIndex((t) => t.id === track.id);
              const isCurrent = track.id === currentTrackId;
              const isDragging = dragIndex === realIndex;
              const isDragOver = dragOverIndex === realIndex;

              return (
                <div
                  key={track.id}
                  data-track-item
                  draggable={!isSearching}
                  onDragStart={(e) => handleDragStart(e, realIndex)}
                  onDragOver={(e) => handleDragOver(e, realIndex)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, realIndex)}
                  onDragEnd={handleDragEnd}
                  className={`
                    track-row flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 cursor-pointer
                    ${isCurrent ? 'active' : ''}
                    ${isDragging ? 'dragging' : ''}
                    ${isDragOver && dragOverPosition === 'top' ? 'drag-over-top' : ''}
                    ${isDragOver && dragOverPosition === 'bottom' ? 'drag-over-bottom' : ''}
                  `}
                  onClick={() => onTrackSelect(track.id)}
                >
                  {/* Drag handle */}
                  {!isSearching && (
                    <div
                      className="drag-handle text-text-dim/40 hover:text-text-dim select-none"
                      onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, realIndex); }}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="2" />
                        <circle cx="15" cy="6" r="2" />
                        <circle cx="9" cy="12" r="2" />
                        <circle cx="15" cy="12" r="2" />
                        <circle cx="9" cy="18" r="2" />
                        <circle cx="15" cy="18" r="2" />
                      </svg>
                    </div>
                  )}

                  {/* Track number or equaliser */}
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    {isCurrent && isPlaying ? (
                      <Equaliser playing={isPlaying} />
                    ) : (
                      <span className="text-xs text-text-dim">
                        {String(realIndex + 1).padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrent ? 'text-red-accent' : 'text-text-primary'}`}>
                      {track.title}
                    </p>
                    <p className="text-xs text-text-dim truncate mt-0.5">
                      {track.artist}
                    </p>
                  </div>

                  {/* Duration */}
                  <span className="text-xs text-text-dim tabular-nums">
                    {formatTime(track.duration)}
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveTrack(track.id); }}
                    className="btn-icon w-8 h-8 text-text-dim/40 hover:text-red-accent opacity-0 group-hover:opacity-100 hover:opacity-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}

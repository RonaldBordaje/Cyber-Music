/**
 * Player – Main player area with disc visualization, controls, and track info
 */
import { type TrackMeta } from '../db';
import { formatTime } from '../utils/format';

interface PlayerProps {
  currentTrack: TrackMeta | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffleOn: boolean;
  repeatMode: 'off' | 'all' | 'one';
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onShuffleToggle: () => void;
  onRepeatToggle: () => void;
}

export default function Player({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  shuffleOn,
  repeatMode,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onShuffleToggle,
  onRepeatToggle,
}: PlayerProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek((parseFloat(e.target.value) / 100) * duration);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value) / 100);
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 lg:p-12 overflow-auto relative">
      {/* Background grid pattern */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
        
        {/* Now Playing label */}
        <p
          className="text-xs tracking-[0.4em] uppercase text-text-dim mb-6"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {currentTrack ? 'NOW PLAYING' : 'SELECT A TRACK'}
        </p>

        {/* Disc visualization */}
        <div className="relative flex items-center justify-center mb-8">
          {/* Wave ripples */}
          <div className={`disc-wave-ring ring-1 ${!isPlaying ? 'paused' : ''}`} />
          <div className={`disc-wave-ring ring-2 ${!isPlaying ? 'paused' : ''}`} />
          <div className={`disc-wave-ring ring-3 ${!isPlaying ? 'paused' : ''}`} />

          {/* Outer glow */}
          <div
            className={`absolute rounded-full border-2 border-red-accent ${isPlaying ? 'glow-ring' : 'glow-ring paused'}`}
            style={{ inset: '-12px' }}
          />

          {/* Main disc */}
          <div
            className={`
              w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72
              rounded-full relative overflow-hidden border-4 border-white/5
              ${isPlaying ? 'disc-spin disc-surface-active' : 'disc-spin paused disc-surface-active paused'}
            `}
            style={{
              background: currentTrack
                ? 'radial-gradient(circle at 30% 30%, #333 0%, #111 50%, #0a0a0a 100%)'
                : 'radial-gradient(circle at 30% 30%, #1a1a1a 0%, #0d0d0d 100%)',
            }}
          >
            {/* Grooves */}
            {[3, 6, 9, 12, 15, 18, 21].map((inset) => (
              <div
                key={inset}
                className="absolute rounded-full border border-white/[0.04]"
                style={{ inset: `${inset * 4}px` }}
              />
            ))}

            {/* Shimmer */}
            {isPlaying && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0deg, rgba(232,0,13,0.1) 30deg, transparent 60deg)',
                }}
              />
            )}

            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center"
                style={{
                  background: isPlaying
                    ? 'radial-gradient(circle, var(--red) 0%, #8b0000 100%)'
                    : 'radial-gradient(circle, #8b0000 0%, #3d0000 100%)',
                  boxShadow: isPlaying ? '0 0 30px var(--red-glow)' : '0 0 15px rgba(139,0,0,0.3)',
                }}
              >
                <span className="text-white text-2xl" style={{ filter: isPlaying ? 'brightness(1.2)' : 'brightness(0.7)' }}>
                  ♪
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Equaliser bars (desktop) */}
        {isPlaying && (
          <div className="hidden md:flex items-end justify-center gap-1 h-12 mb-4">
            {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((_, i) => (
              <div
                key={i}
                className="eq-large-bar w-2 bg-red-accent rounded-full"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        )}

        {/* Track info */}
        <div className="text-center mb-6 w-full px-4">
          <h2
            className="text-xl md:text-2xl lg:text-3xl font-bold text-text-primary truncate"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {currentTrack?.title || 'No Track Selected'}
          </h2>
          <p className="text-sm md:text-base text-text-dim truncate mt-1">
            {currentTrack?.artist || 'Upload MP3 files to get started'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md px-4 mb-6">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeekChange}
            className="w-full h-2 cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--red) ${progress}%, var(--surface3) ${progress}%)`,
              borderRadius: '4px',
            }}
            aria-label="Seek"
          />
          <div className="flex justify-between text-xs text-text-dim mt-2">
            <span className="tabular-nums">{formatTime(currentTime)}</span>
            <span className="tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-center gap-3 md:gap-6 mb-8">
          {/* Shuffle */}
          <button
            onClick={onShuffleToggle}
            className={`btn-icon ${shuffleOn ? 'active' : ''}`}
            title="Shuffle"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>

          {/* Prev */}
          <button onClick={onPrev} className="btn-icon" title="Previous">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={onPlayPause}
            className="btn-primary w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button onClick={onNext} className="btn-icon" title="Next">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z" />
            </svg>
          </button>

          {/* Repeat */}
          <button
            onClick={onRepeatToggle}
            className={`btn-icon relative ${repeatMode !== 'off' ? 'active' : ''}`}
            title={`Repeat: ${repeatMode}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            {repeatMode === 'one' && (
              <span className="absolute text-[9px] font-bold text-red-accent">1</span>
            )}
          </button>
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-3 w-full max-w-xs px-4">
          <button
            onClick={() => onVolumeChange(volume > 0 ? 0 : 0.7)}
            className="btn-icon w-10 h-10"
            title={volume > 0 ? 'Mute' : 'Unmute'}
          >
            {volume === 0 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : volume < 0.5 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={handleVolumeChange}
            className="flex-1 h-2"
            style={{
              background: `linear-gradient(to right, var(--red) ${volume * 100}%, var(--surface3) ${volume * 100}%)`,
            }}
            aria-label="Volume"
          />
          <span className="text-xs text-text-dim w-10 text-right tabular-nums">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-4 text-[10px] text-text-dim/50">
        <span>Space: Play/Pause</span>
        <span>←→: Prev/Next</span>
        <span>↑↓: Volume</span>
      </div>
    </main>
  );
}

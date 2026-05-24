/**
 * Equaliser animation bars – shown next to the currently playing track
 */
export default function Equaliser({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-5 w-5 min-w-5">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="eq-bar w-[3px] rounded-sm"
          style={{
            backgroundColor: 'var(--red)',
            animationPlayState: playing ? 'running' : 'paused',
          }}
        />
      ))}
    </div>
  );
}

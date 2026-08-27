import { useEffect, useRef, useState } from "react";

export function VoiceWaveform({ file }: { file: File }) {
  const [url, setUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    // Draw a synthetic waveform (deterministic from file size) for preview.
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const { width, height } = c;
    ctx.clearRect(0, 0, width, height);
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, "#2563EB");
    grad.addColorStop(0.5, "#0EA5E9");
    grad.addColorStop(1, "#14B8A6");
    ctx.fillStyle = grad;
    const bars = 80;
    const seed = file.size;
    for (let i = 0; i < bars; i++) {
      const h = Math.abs(Math.sin(i * 0.6 + seed * 0.0001)) * (height * 0.8) + 6;
      const x = (i / bars) * width;
      ctx.fillRect(x, (height - h) / 2, width / bars - 2, h);
    }
  }, [file]);

  return (
    <div>
      <canvas ref={canvasRef} width={600} height={120} className="w-full rounded-lg bg-background" />
      {url && <audio controls src={url} className="mt-3 w-full" />}
    </div>
  );
}

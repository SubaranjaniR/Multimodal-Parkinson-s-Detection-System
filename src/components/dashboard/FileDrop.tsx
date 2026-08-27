import { useCallback, useState } from "react";
import { UploadCloud, X } from "lucide-react";

export function FileDrop({ accept, label, file, onFile, preview }: {
  accept: string;
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
  preview?: (f: File) => React.ReactNode;
}) {
  const [drag, setDrag] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); 
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`relative block cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all
          ${drag ? "border-primary bg-primary/5" : "border-border bg-card/50 hover:bg-card"}`}
      >
        <input 
          type="file" 
          accept={accept} 
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)} 
        />
        <UploadCloud className="mx-auto h-10 w-10 text-primary" />
        <div className="mt-3 font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground mt-1">Drag & drop or click to upload · {accept}</div>
      </label>
      {file && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-medium">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFile(null);
              }} 
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {preview && <div className="mt-4">{preview(file)}</div>}
        </div>
      )}
    </div>
  );
}

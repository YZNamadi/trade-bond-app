import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Upload, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { store } from "@/lib/mock-store";

export const Route = createFileRoute("/seller/orders/$id/proof")({
  component: UploadProof,
});

function UploadProof() {
  const { id } = Route.useParams();
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofs, setProofs] = useState<Array<{ id: string; createdAt: number; note: string | null; url: string; originalFileName: string }>>([]);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    try {
      return URL.createObjectURL(file);
    } catch {
      return null;
    }
  }, [file]);

  useEffect(() => {
    let alive = true;
    store.listDeliveryProofs(id)
      .then((p: any) => { if (alive) setProofs(p); })
      .catch(() => null);
    return () => {
      alive = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [id, previewUrl]);

  const submit = async () => {
    if (!file) return toast.error("Choose an image");
    setUploading(true);
    try {
      await store.uploadDeliveryProof(id, file, note);
      toast.success("Proof uploaded");
      setNote("");
      setFile(null);
      const next = await store.listDeliveryProofs(id);
      setProofs(next as any);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-dvh px-5 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-12">
      <header className="flex items-center gap-3">
        <Link to="/seller/orders/$id" params={{ id }} className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Order</div>
          <div className="text-xl font-bold">Delivery proof</div>
        </div>
      </header>

      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Provide verifiable proof</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Upload a delivery receipt or shipment document tied to this transaction.
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload</h2>
        <div className="rounded-3xl border border-border bg-card p-5">
          <label className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background font-semibold tap-scale">
            <Upload className="h-4 w-4" /> Choose file
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              accept="image/*"
            />
          </label>
          {file?.name && <div className="mt-2 text-xs text-muted-foreground">Selected: {file.name}</div>}
          {previewUrl && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
              <img src={previewUrl} alt="Selected proof preview" className="w-full object-cover" />
            </div>
          )}

          <div className="mt-4">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note (optional)</div>
            <div className="rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Courier name, tracking updates, delivery attempt…"
                className="w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={uploading}
            className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)] disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Submit proof"}
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Uploaded proofs</h2>
        {proofs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No proof uploaded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {proofs.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-3xl border border-border bg-card">
                <img src={p.url} alt="Delivery proof" className="w-full object-cover" />
                <div className="p-4">
                  <div className="text-sm font-semibold">{p.originalFileName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</div>
                  {p.note ? <div className="mt-2 text-sm text-muted-foreground">{p.note}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

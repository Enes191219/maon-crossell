import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowRight, Edit2, Link2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface PairingFormData {
  sourceProductId: string;
  targetProductId: string;
  priority: number;
  discountPercent: string;
  bundleTitle: string;
  isActive: boolean;
}

const defaultForm: PairingFormData = {
  sourceProductId: "",
  targetProductId: "",
  priority: 0,
  discountPercent: "",
  bundleTitle: "",
  isActive: true,
};

export default function Pairings() {
  const utils = trpc.useUtils();
  const { data: pairings, isLoading } = trpc.pairings.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();

  const createPairing = trpc.pairings.create.useMutation({
    onSuccess: () => { utils.pairings.list.invalidate(); toast.success("Kombinasyon oluşturuldu"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updatePairing = trpc.pairings.update.useMutation({
    onSuccess: () => { utils.pairings.list.invalidate(); toast.success("Kombinasyon güncellendi"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deletePairing = trpc.pairings.delete.useMutation({
    onSuccess: () => { utils.pairings.list.invalidate(); toast.success("Kombinasyon silindi"); },
    onError: (e) => toast.error(e.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PairingFormData>(defaultForm);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(pairing: NonNullable<typeof pairings>[0]) {
    setEditingId(pairing.id);
    setForm({
      sourceProductId: String(pairing.sourceProductId),
      targetProductId: String(pairing.targetProductId),
      priority: pairing.priority,
      discountPercent: pairing.discountPercent ? String(pairing.discountPercent) : "",
      bundleTitle: pairing.bundleTitle ?? "",
      isActive: pairing.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.sourceProductId || !form.targetProductId) {
      toast.error("Kaynak ve hedef ürün seçilmelidir");
      return;
    }
    if (form.sourceProductId === form.targetProductId) {
      toast.error("Kaynak ve hedef ürün aynı olamaz");
      return;
    }
    const data = {
      sourceProductId: parseInt(form.sourceProductId),
      targetProductId: parseInt(form.targetProductId),
      priority: form.priority,
      discountPercent: form.discountPercent ? parseInt(form.discountPercent) : undefined,
      bundleTitle: form.bundleTitle || undefined,
      isActive: form.isActive,
    };
    if (editingId) {
      updatePairing.mutate({ id: editingId, ...data });
    } else {
      createPairing.mutate(data);
    }
  }

  const isPending = createPairing.isPending || updatePairing.isPending;

  return (
    <AppLayout title="Manuel Kombinasyonlar" subtitle="Özel ürün eşleştirmeleri ve bundle teklifleri">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link2 className="w-4 h-4" />
            <span>{pairings?.length ?? 0} kombinasyon tanımlandı</span>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-2" disabled={!products?.length}>
            <Plus className="w-4 h-4" />
            Yeni Kombinasyon
          </Button>
        </div>

        {!products?.length && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400">
            Kombinasyon oluşturmak için önce Ayarlar sayfasından Shopify ürünlerinizi senkronize edin.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !pairings?.length ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Link2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Henüz kombinasyon yok</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Manuel kombinasyonlar oluşturarak belirli ürünleri birlikte önerin.
            </p>
            <Button onClick={openCreate} size="sm" className="gap-2" disabled={!products?.length}>
              <Plus className="w-4 h-4" />
              İlk Kombinasyonu Oluştur
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {pairings.map((pairing) => (
              <div key={pairing.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Source product */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {pairing.sourceProduct?.imageUrl && (
                        <img
                          src={pairing.sourceProduct.imageUrl}
                          alt={pairing.sourceProduct.title}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {pairing.sourceProduct?.title ?? `Ürün #${pairing.sourceProductId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ₺{parseFloat(pairing.sourceProduct?.priceMin ?? "0").toLocaleString("tr-TR")}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      <ArrowRight className="w-4 h-4 text-primary" />
                      {pairing.discountPercent && (
                        <Badge variant="default" className="text-xs">%{pairing.discountPercent} İndirim</Badge>
                      )}
                    </div>

                    {/* Target product */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {pairing.targetProduct?.imageUrl && (
                        <img
                          src={pairing.targetProduct.imageUrl}
                          alt={pairing.targetProduct.title}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {pairing.targetProduct?.title ?? `Ürün #${pairing.targetProductId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ₺{parseFloat(pairing.targetProduct?.priceMin ?? "0").toLocaleString("tr-TR")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={pairing.isActive ? "default" : "secondary"} className="text-xs">
                      {pairing.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                    <Switch
                      checked={pairing.isActive}
                      onCheckedChange={(checked) => updatePairing.mutate({ id: pairing.id, isActive: checked })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(pairing)} className="h-8 w-8">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePairing.mutate({ id: pairing.id })}
                      className="h-8 w-8 hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {pairing.bundleTitle && (
                  <p className="text-xs text-muted-foreground mt-2 pl-0">Bundle: {pairing.bundleTitle}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Kombinasyonu Düzenle" : "Yeni Kombinasyon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kaynak Ürün (Müşterinin Baktığı) *</Label>
              <Select value={form.sourceProductId} onValueChange={(v) => setForm((f) => ({ ...f, sourceProductId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Ürün seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Hedef Ürün (Önerilecek) *</Label>
              <Select value={form.targetProductId} onValueChange={(v) => setForm((f) => ({ ...f, targetProductId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Ürün seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {products?.filter((p) => String(p.id) !== form.sourceProductId).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>İndirim (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="10"
                  value={form.discountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Öncelik</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Bundle Başlığı</Label>
              <Input
                placeholder="Örn: Cüzdan + Kemer Seti"
                value={form.bundleTitle}
                onChange={(e) => setForm((f) => ({ ...f, bundleTitle: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Kaydediliyor..." : editingId ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

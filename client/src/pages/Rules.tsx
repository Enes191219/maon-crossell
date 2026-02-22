import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit2, GitMerge, Plus, Tag, Trash2, DollarSign, List, Sparkles } from "lucide-react";
import { useState } from "react";

const RULE_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  category: { label: "Kategori", icon: Tag, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  tag: { label: "Etiket", icon: Tag, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  price_range: { label: "Fiyat Aralığı", icon: DollarSign, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  manual: { label: "Manuel", icon: List, color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  llm: { label: "AI", icon: Sparkles, color: "text-primary bg-primary/10 border-primary/20" },
};

const POSITION_LABELS: Record<string, string> = {
  product_page: "Ürün Sayfası",
  cart: "Sepet",
  both: "Her İkisi",
};

const CATEGORY_OPTIONS = ["Cüzdan", "Çanta", "Apple Koleksiyonu", "Kartlık", "Aksesuar"];
const TAG_OPTIONS = ["Minimal", "Telefon Bölmeli", "Klasik", "El çantası", "Elkit", "Hakiki Deri"];

interface RuleFormData {
  name: string;
  description: string;
  ruleType: "category" | "tag" | "price_range" | "manual" | "llm";
  isActive: boolean;
  priority: number;
  categoryValue: string;
  tagValue: string;
  priceRangePercent: number;
  maxProducts: number;
  displayTitle: string;
  displayPosition: "product_page" | "cart" | "both";
}

const defaultForm: RuleFormData = {
  name: "",
  description: "",
  ruleType: "category",
  isActive: true,
  priority: 0,
  categoryValue: "",
  tagValue: "",
  priceRangePercent: 30,
  maxProducts: 4,
  displayTitle: "Bunları Da Beğenebilirsiniz",
  displayPosition: "both",
};

export default function Rules() {
  const utils = trpc.useUtils();
  const { data: rules, isLoading } = trpc.rules.list.useQuery();
  const createRule = trpc.rules.create.useMutation({
    onSuccess: () => { utils.rules.list.invalidate(); toast.success("Kural oluşturuldu"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateRule = trpc.rules.update.useMutation({
    onSuccess: () => { utils.rules.list.invalidate(); toast.success("Kural güncellendi"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteRule = trpc.rules.delete.useMutation({
    onSuccess: () => { utils.rules.list.invalidate(); toast.success("Kural silindi"); },
    onError: (e) => toast.error(e.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RuleFormData>(defaultForm);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(rule: NonNullable<typeof rules>[0]) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      description: rule.description ?? "",
      ruleType: rule.ruleType,
      isActive: rule.isActive,
      priority: rule.priority,
      categoryValue: rule.categoryValue ?? "",
      tagValue: rule.tagValue ?? "",
      priceRangePercent: rule.priceRangePercent ?? 30,
      maxProducts: rule.maxProducts,
      displayTitle: rule.displayTitle ?? "Bunları Da Beğenebilirsiniz",
      displayPosition: rule.displayPosition,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error("Kural adı gereklidir"); return; }
    if (editingId) {
      updateRule.mutate({ id: editingId, ...form, description: form.description || undefined, categoryValue: form.categoryValue || undefined, tagValue: form.tagValue || undefined });
    } else {
      createRule.mutate({ ...form, description: form.description || undefined, categoryValue: form.categoryValue || undefined, tagValue: form.tagValue || undefined });
    }
  }

  const isPending = createRule.isPending || updateRule.isPending;

  return (
    <AppLayout title="Crosssell Kuralları" subtitle="Otomatik crosssell önerilerini yönetin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitMerge className="w-4 h-4" />
            <span>{rules?.length ?? 0} kural tanımlandı</span>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Yeni Kural
          </Button>
        </div>

        {/* Rules list */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !rules?.length ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <GitMerge className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Henüz kural yok</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crosssell kuralları oluşturarak müşterilerinize otomatik ürün önerileri sunun.
            </p>
            <Button onClick={openCreate} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              İlk Kuralı Oluştur
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => {
              const typeInfo = RULE_TYPE_LABELS[rule.ruleType];
              const TypeIcon = typeInfo?.icon ?? GitMerge;
              return (
                <div
                  key={rule.id}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${typeInfo?.color}`}>
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{rule.name}</h3>
                          <Badge variant={rule.isActive ? "default" : "secondary"} className="text-xs">
                            {rule.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                          <Badge variant="outline" className={`text-xs border ${typeInfo?.color}`}>
                            {typeInfo?.label}
                          </Badge>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Konum: {POSITION_LABELS[rule.displayPosition]}</span>
                          <span>Max: {rule.maxProducts} ürün</span>
                          <span>Öncelik: {rule.priority}</span>
                          {rule.categoryValue && <span>Kategori: {rule.categoryValue}</span>}
                          {rule.tagValue && <span>Etiket: {rule.tagValue}</span>}
                          {rule.priceRangePercent && <span>Fiyat Aralığı: ±%{rule.priceRangePercent}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) =>
                          updateRule.mutate({ id: rule.id, isActive: checked })
                        }
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(rule)} className="h-8 w-8">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRule.mutate({ id: rule.id })}
                        className="h-8 w-8 hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Kuralı Düzenle" : "Yeni Kural Oluştur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Kural Adı *</Label>
                <Input
                  placeholder="Örn: Cüzdan Kategorisi Crosssell"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Açıklama</Label>
                <Textarea
                  placeholder="Kural hakkında kısa açıklama..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kural Türü</Label>
                <Select value={form.ruleType} onValueChange={(v) => setForm((f) => ({ ...f, ruleType: v as RuleFormData["ruleType"] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Kategori Bazlı</SelectItem>
                    <SelectItem value="tag">Etiket Bazlı</SelectItem>
                    <SelectItem value="price_range">Fiyat Aralığı</SelectItem>
                    <SelectItem value="manual">Manuel</SelectItem>
                    <SelectItem value="llm">AI (LLM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Gösterim Konumu</Label>
                <Select value={form.displayPosition} onValueChange={(v) => setForm((f) => ({ ...f, displayPosition: v as RuleFormData["displayPosition"] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product_page">Ürün Sayfası</SelectItem>
                    <SelectItem value="cart">Sepet</SelectItem>
                    <SelectItem value="both">Her İkisi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.ruleType === "category" && (
                <div className="col-span-2 space-y-1.5">
                  <Label>Kategori</Label>
                  <Select value={form.categoryValue} onValueChange={(v) => setForm((f) => ({ ...f, categoryValue: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.ruleType === "tag" && (
                <div className="col-span-2 space-y-1.5">
                  <Label>Etiket</Label>
                  <Select value={form.tagValue} onValueChange={(v) => setForm((f) => ({ ...f, tagValue: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Etiket seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TAG_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.ruleType === "price_range" && (
                <div className="col-span-2 space-y-1.5">
                  <Label>Fiyat Aralığı (%)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={100}
                    value={form.priceRangePercent}
                    onChange={(e) => setForm((f) => ({ ...f, priceRangePercent: parseInt(e.target.value) || 30 }))}
                    placeholder="30"
                  />
                  <p className="text-xs text-muted-foreground">Kaynak ürün fiyatının ±%{form.priceRangePercent} aralığındaki ürünler önerilir</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Maks. Ürün Sayısı</Label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={form.maxProducts}
                  onChange={(e) => setForm((f) => ({ ...f, maxProducts: parseInt(e.target.value) || 4 }))}
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
              <div className="col-span-2 space-y-1.5">
                <Label>Widget Başlığı</Label>
                <Input
                  value={form.displayTitle}
                  onChange={(e) => setForm((f) => ({ ...f, displayTitle: e.target.value }))}
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <Label>Kural Aktif</Label>
              </div>
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

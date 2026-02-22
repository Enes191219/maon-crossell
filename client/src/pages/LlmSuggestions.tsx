import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Bot, Check, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useState } from "react";

export default function LlmSuggestions() {
  const utils = trpc.useUtils();
  const { data: suggestions, isLoading } = trpc.llm.getSuggestions.useQuery({ approvedOnly: false });
  const { data: products } = trpc.products.list.useQuery();

  const generate = trpc.llm.generateSuggestions.useMutation({
    onSuccess: (r) => {
      utils.llm.getSuggestions.invalidate();
      toast.success(r.message);
    },
    onError: (e) => toast.error(e.message),
  });
  const approve = trpc.llm.approve.useMutation({
    onSuccess: () => { utils.llm.getSuggestions.invalidate(); toast.success("Öneri onaylandı"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSuggestion = trpc.llm.delete.useMutation({
    onSuccess: () => { utils.llm.getSuggestions.invalidate(); toast.success("Öneri silindi"); },
    onError: (e) => toast.error(e.message),
  });

  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const pending = suggestions?.filter((s) => !s.isApproved) ?? [];
  const approved = suggestions?.filter((s) => s.isApproved) ?? [];

  return (
    <AppLayout title="AI Öneriler" subtitle="LLM destekli akıllı crosssell önerileri">
      <div className="space-y-6">
        {/* Generate section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">AI ile Crosssell Önerisi Oluştur</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Yapay zeka, ürün özelliklerini, kategorilerini ve etiketlerini analiz ederek en uygun crosssell kombinasyonlarını önerir.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Tüm ürünler için oluştur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm ürünler (ilk 5)</SelectItem>
                    {products?.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() =>
                    generate.mutate({
                      productId: selectedProductId && selectedProductId !== "all" ? parseInt(selectedProductId) : undefined,
                    })
                  }
                  disabled={generate.isPending || !products?.length}
                  className="gap-2"
                >
                  <Wand2 className={`w-4 h-4 ${generate.isPending ? "animate-spin" : ""}`} />
                  {generate.isPending ? "Oluşturuluyor..." : "Öneri Oluştur"}
                </Button>
              </div>
              {!products?.length && (
                <p className="text-xs text-amber-400 mt-2">
                  Öneri oluşturmak için önce Shopify ürünlerinizi senkronize edin.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pending suggestions */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Onay Bekleyen Öneriler</h3>
                  <Badge variant="default" className="text-xs">{pending.length}</Badge>
                </div>
                <div className="space-y-3">
                  {pending.map((s) => (
                    <div key={s.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {s.sourceProduct?.imageUrl && (
                              <img src={s.sourceProduct.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {s.sourceProduct?.title ?? `Ürün #${s.sourceProductId}`}
                              </p>
                              <p className="text-xs text-muted-foreground">Kaynak</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <ArrowRight className="w-4 h-4 text-primary" />
                            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                              %{(parseFloat(s.confidence ?? "0") * 100).toFixed(0)} güven
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {s.targetProduct?.imageUrl && (
                              <img src={s.targetProduct.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {s.targetProduct?.title ?? `Ürün #${s.targetProductId}`}
                              </p>
                              <p className="text-xs text-muted-foreground">Hedef</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => approve.mutate({ id: s.id })}
                            disabled={approve.isPending}
                            className="gap-1.5 h-8"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Onayla
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSuggestion.mutate({ id: s.id })}
                            className="h-8 w-8 hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      {s.reasoning && (
                        <p className="text-xs text-muted-foreground mt-2 pl-0 italic">"{s.reasoning}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approved.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-foreground">Onaylanmış Öneriler</h3>
                  <Badge variant="secondary" className="text-xs">{approved.length}</Badge>
                </div>
                <div className="space-y-3">
                  {approved.map((s) => (
                    <div key={s.id} className="bg-card border border-emerald-500/20 rounded-xl p-4 opacity-80">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {s.sourceProduct?.imageUrl && (
                              <img src={s.sourceProduct.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <p className="text-sm text-foreground truncate">{s.sourceProduct?.title ?? `#${s.sourceProductId}`}</p>
                          </div>
                          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {s.targetProduct?.imageUrl && (
                              <img src={s.targetProduct.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <p className="text-sm text-foreground truncate">{s.targetProduct?.title ?? `#${s.targetProductId}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Onaylı</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSuggestion.mutate({ id: s.id })}
                            className="h-7 w-7 hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!pending.length && !approved.length && (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Henüz AI önerisi yok</h3>
                <p className="text-sm text-muted-foreground">
                  Yukarıdaki "Öneri Oluştur" butonuna tıklayarak AI destekli crosssell önerileri alın.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

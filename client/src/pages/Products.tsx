import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package, RefreshCw, Search, Tag } from "lucide-react";
import { useState } from "react";

export default function Products() {
  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.products.list.useQuery({ activeOnly: false });
  const syncProducts = trpc.shopify.syncProducts.useMutation({
    onSuccess: (result) => {
      utils.products.list.invalidate();
      if (result.errors.length > 0) {
        toast.error(`${result.synced} ürün senkronize edildi, ${result.errors.length} hata oluştu`);
      } else {
        toast.success(`${result.synced} ürün başarıyla senkronize edildi`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const [search, setSearch] = useState("");
  const filtered = products?.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.productType ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.collections ?? []).some((c) => c.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppLayout title="Ürünler" subtitle="Shopify mağazanızdaki senkronize ürünler">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ürün ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            onClick={() => syncProducts.mutate()}
            disabled={syncProducts.isPending}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncProducts.isPending ? "animate-spin" : ""}`} />
            {syncProducts.isPending ? "Senkronize ediliyor..." : "Senkronize Et"}
          </Button>
          <div className="text-sm text-muted-foreground">
            {products?.length ?? 0} ürün
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !filtered?.length ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">
              {products?.length ? "Ürün bulunamadı" : "Henüz ürün yok"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {products?.length
                ? "Arama kriterlerinizi değiştirin"
                : "Shopify mağazanızı bağlayın ve ürünleri senkronize edin"}
            </p>
            {!products?.length && (
              <Button onClick={() => syncProducts.mutate()} disabled={syncProducts.isPending} size="sm" className="gap-2">
                <RefreshCw className={`w-4 h-4 ${syncProducts.isPending ? "animate-spin" : ""}`} />
                Ürünleri Senkronize Et
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-all group"
              >
                <div className="aspect-square bg-secondary relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.imageAlt ?? product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground/20" />
                    </div>
                  )}
                  {!product.isActive && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Badge variant="secondary">Pasif</Badge>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-foreground text-sm leading-tight mb-1 line-clamp-2">{product.title}</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-primary font-semibold text-sm">
                      ₺{parseFloat(product.priceMin ?? "0").toLocaleString("tr-TR")}
                    </span>
                    {product.compareAtPriceMin && parseFloat(product.compareAtPriceMin) > parseFloat(product.priceMin ?? "0") && (
                      <span className="text-muted-foreground text-xs line-through">
                        ₺{parseFloat(product.compareAtPriceMin).toLocaleString("tr-TR")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(product.collections ?? []).slice(0, 2).map((c) => (
                      <Badge key={c} variant="outline" className="text-xs px-1.5 py-0">{c}</Badge>
                    ))}
                    {(product.tags ?? []).slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">
                        <Tag className="w-2.5 h-2.5 mr-0.5" />
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

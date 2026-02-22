import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, ShoppingCart, Star } from "lucide-react";
import { useState } from "react";

function CrosssellWidget({
  title,
  products,
  accentColor,
  position,
}: {
  title: string;
  products: Array<{ id: number; title: string; priceMin: string | null; imageUrl: string | null; collections: string[] | null }>;
  accentColor: string;
  position: "product_page" | "cart";
}) {
  if (!products.length) return null;

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ borderColor: `${accentColor}30`, background: "oklch(0.16 0.010 45)" }}
    >
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4" style={{ color: accentColor }} />
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      <div className={`grid gap-3 ${position === "cart" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        {products.slice(0, position === "cart" ? 2 : 4).map((product) => (
          <div
            key={product.id}
            className="group cursor-pointer rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-all"
          >
            <div className="aspect-square bg-secondary relative overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                  <ShoppingCart className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-foreground leading-tight line-clamp-2 mb-1">{product.title}</p>
              <p className="text-xs font-bold" style={{ color: accentColor }}>
                ₺{parseFloat(product.priceMin ?? "0").toLocaleString("tr-TR")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WidgetPreview() {
  const { data: products } = trpc.products.list.useQuery();
  const { data: widgetSettings } = trpc.widget.getSettings.useQuery();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [previewPosition, setPreviewPosition] = useState<"product_page" | "cart">("product_page");

  const widgetTitle = widgetSettings?.["widget_title"] ?? "Bunları Da Beğenebilirsiniz";
  const accentColor = widgetSettings?.["widget_accent_color"] ?? "#C9A84C";

  const selectedProduct = products?.find((p) => String(p.id) === selectedProductId);
  const recommendedProducts = products
    ?.filter((p) => String(p.id) !== selectedProductId)
    .slice(0, 4) ?? [];

  return (
    <AppLayout title="Widget Önizleme" subtitle="Müşterilerinizin göreceği crosssell widget'ını önizleyin">
      <div className="space-y-6">
        {/* Controls */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Önizleme Ayarları</h3>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Kaynak Ürün</label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="w-64">
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
              <label className="text-xs text-muted-foreground">Konum</label>
              <div className="flex gap-2">
                <Button
                  variant={previewPosition === "product_page" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewPosition("product_page")}
                >
                  Ürün Sayfası
                </Button>
                <Button
                  variant={previewPosition === "cart" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewPosition("cart")}
                >
                  Sepet
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Eye className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">
              {previewPosition === "product_page" ? "Ürün Sayfası Önizlemesi" : "Sepet Önizlemesi"}
            </h3>
            <Badge variant="outline" className="text-xs">Önizleme</Badge>
          </div>

          {previewPosition === "product_page" ? (
            /* Product page mockup */
            <div className="max-w-2xl mx-auto space-y-6">
              {selectedProduct ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="aspect-square rounded-xl overflow-hidden bg-secondary">
                    {selectedProduct.imageUrl ? (
                      <img src={selectedProduct.imageUrl} alt={selectedProduct.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                        <ShoppingCart className="w-16 h-16" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Badge variant="outline" className="text-xs mb-2">
                        {(selectedProduct.collections ?? [])[0] ?? "Ürün"}
                      </Badge>
                      <h2 className="text-lg font-bold text-foreground">{selectedProduct.title}</h2>
                      <p className="text-2xl font-bold text-primary mt-2">
                        ₺{parseFloat(selectedProduct.priceMin ?? "0").toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <div className="h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-sm font-medium">
                      Sepete Ekle
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Önizleme için yukarıdan bir ürün seçin
                </div>
              )}

              {/* Widget */}
              {recommendedProducts.length > 0 && (
                <CrosssellWidget
                  title={widgetTitle}
                  products={recommendedProducts}
                  accentColor={accentColor}
                  position="product_page"
                />
              )}
            </div>
          ) : (
            /* Cart mockup */
            <div className="max-w-sm mx-auto space-y-4">
              <div className="border border-border rounded-xl p-4">
                <h3 className="font-semibold text-foreground mb-3">Sepetiniz</h3>
                {selectedProduct ? (
                  <div className="flex items-center gap-3">
                    {selectedProduct.imageUrl && (
                      <img src={selectedProduct.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{selectedProduct.title}</p>
                      <p className="text-sm text-primary font-semibold">
                        ₺{parseFloat(selectedProduct.priceMin ?? "0").toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">×1</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sepet boş</p>
                )}
              </div>

              {/* Cart widget */}
              {recommendedProducts.length > 0 && (
                <CrosssellWidget
                  title={widgetTitle}
                  products={recommendedProducts}
                  accentColor={accentColor}
                  position="cart"
                />
              )}

              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Toplam</span>
                  <span className="font-semibold text-foreground">
                    ₺{parseFloat(selectedProduct?.priceMin ?? "0").toLocaleString("tr-TR")}
                  </span>
                </div>
                <div className="h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-sm font-medium">
                  Ödemeye Geç
                </div>
              </div>
            </div>
          )}
        </div>

        {!products?.length && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400">
            Widget önizlemesi için Ayarlar sayfasından Shopify ürünlerinizi senkronize edin.
          </div>
        )}
      </div>
    </AppLayout>
  );
}

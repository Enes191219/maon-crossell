import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Code, Copy, ExternalLink, RefreshCw, Settings as SettingsIcon, ShoppingBag, XCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: config } = trpc.shopify.getConfig.useQuery();
  const { data: widgetSettings } = trpc.widget.getSettings.useQuery();

  const saveConfig = trpc.shopify.saveConfig.useMutation({
    onSuccess: () => { utils.shopify.getConfig.invalidate(); toast.success("Shopify yapılandırması kaydedildi"); },
    onError: (e) => toast.error(e.message),
  });
  const verifyConnection = trpc.shopify.verifyConnection.useMutation({
    onSuccess: (r) => {
      if (r.success) toast.success(`Bağlantı başarılı! Mağaza: ${r.shopName}`);
      else toast.error(`Bağlantı hatası: ${r.error}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const syncProducts = trpc.shopify.syncProducts.useMutation({
    onSuccess: (r) => {
      utils.products.list.invalidate();
      toast.success(`${r.synced} ürün senkronize edildi`);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateWidgetSettings = trpc.widget.updateSettings.useMutation({
    onSuccess: () => { utils.widget.getSettings.invalidate(); toast.success("Widget ayarları kaydedildi"); },
    onError: (e) => toast.error(e.message),
  });

  const [storeDomain, setStoreDomain] = useState("");
  const [storefrontToken, setStorefrontToken] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [widgetTitle, setWidgetTitle] = useState("Bunları Da Beğenebilirsiniz");
  const [accentColor, setAccentColor] = useState("#C9A84C");
  const [maxProducts, setMaxProducts] = useState("4");

  useEffect(() => {
    if (config) {
      setStoreDomain(config.storeDomain ?? "");
    }
  }, [config]);

  useEffect(() => {
    if (widgetSettings) {
      setWidgetTitle(widgetSettings["widget_title"] ?? "Bunları Da Beğenebilirsiniz");
      setAccentColor(widgetSettings["widget_accent_color"] ?? "#C9A84C");
      setMaxProducts(widgetSettings["widget_max_products"] ?? "4");
    }
  }, [widgetSettings]);

  const appUrl = window.location.origin;
  const embedScript = `<!-- Maon Crosssell Widget -->
<script>
  window.MaonCrosssell = {
    apiUrl: '${appUrl}',
    position: 'product_page' // veya 'cart'
  };
</script>
<script src="${appUrl}/widget.js" defer></script>`;

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Panoya kopyalandı");
  }

  return (
    <AppLayout title="Ayarlar" subtitle="Shopify bağlantısı ve widget yapılandırması">
      <div className="space-y-6 max-w-2xl">
        {/* Shopify Connection */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Shopify Bağlantısı</h3>
              <p className="text-xs text-muted-foreground">Mağaza bilgilerinizi girin</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Mağaza Domain *</Label>
              <Input
                placeholder="maon.co veya maon.myshopify.com"
                value={storeDomain}
                onChange={(e) => setStoreDomain(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Storefront API Access Token *</Label>
              <Input
                type="password"
                placeholder={config?.storefrontAccessToken ? "Mevcut token: " + config.storefrontAccessToken : "shpat_..."}
                value={storefrontToken}
                onChange={(e) => setStorefrontToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Shopify Admin → Apps → Develop apps → Storefront API integration
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Admin API Access Token (Opsiyonel)</Label>
              <Input
                type="password"
                placeholder={config?.adminAccessToken ? "Mevcut token: " + config.adminAccessToken : "shpat_..."}
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Webhook Secret (Opsiyonel)</Label>
              <Input
                type="password"
                placeholder="Webhook doğrulama için gizli anahtar"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={() =>
                  saveConfig.mutate({
                    storeDomain,
                    storefrontAccessToken: storefrontToken || undefined,
                    adminAccessToken: adminToken || undefined,
                    webhookSecret: webhookSecret || undefined,
                  })
                }
                disabled={saveConfig.isPending || !storeDomain}
              >
                {saveConfig.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  verifyConnection.mutate({
                    storeDomain,
                    storefrontAccessToken: storefrontToken || (config?.storefrontAccessToken ?? ""),
                  })
                }
                disabled={verifyConnection.isPending || !storeDomain}
                className="gap-2"
              >
                {verifyConnection.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : verifyConnection.data?.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : verifyConnection.data ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : null}
                Bağlantıyı Test Et
              </Button>
              <Button
                variant="outline"
                onClick={() => syncProducts.mutate()}
                disabled={syncProducts.isPending}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncProducts.isPending ? "animate-spin" : ""}`} />
                Ürünleri Senkronize Et
              </Button>
            </div>
          </div>
        </div>

        {/* Widget Settings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Widget Ayarları</h3>
              <p className="text-xs text-muted-foreground">Crosssell widget görünümünü özelleştirin</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Widget Başlığı</Label>
              <Input
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="Bunları Da Beğenebilirsiniz"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Vurgu Rengi</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Maks. Ürün Sayısı</Label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={maxProducts}
                  onChange={(e) => setMaxProducts(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={() =>
                updateWidgetSettings.mutate({
                  widget_title: widgetTitle,
                  widget_accent_color: accentColor,
                  widget_max_products: maxProducts,
                })
              }
              disabled={updateWidgetSettings.isPending}
            >
              {updateWidgetSettings.isPending ? "Kaydediliyor..." : "Widget Ayarlarını Kaydet"}
            </Button>
          </div>
        </div>

        {/* Embed Code */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Code className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Shopify Tema Entegrasyonu</h3>
              <p className="text-xs text-muted-foreground">Bu kodu Shopify temanıza ekleyin</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-secondary rounded-lg p-4 relative">
              <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap font-mono">
                {embedScript}
              </pre>
              <button
                onClick={() => copyToClipboard(embedScript)}
                className="absolute top-3 right-3 p-1.5 rounded-md bg-background/50 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-400 space-y-2">
              <p className="font-medium">Kurulum Adımları:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Shopify Admin → Online Store → Themes → Edit code</li>
                <li>theme.liquid dosyasını açın</li>
                <li>Yukarıdaki kodu &lt;/body&gt; etiketinden önce yapıştırın</li>
                <li>Ürün sayfası için: product.liquid dosyasına widget placeholder ekleyin</li>
                <li>Sepet için: cart.liquid dosyasına widget placeholder ekleyin</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => copyToClipboard(embedScript)}>
                <Copy className="w-4 h-4" />
                Kodu Kopyala
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <a href="/widget-preview" target="_blank">
                  <ExternalLink className="w-4 h-4" />
                  Widget Önizleme
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

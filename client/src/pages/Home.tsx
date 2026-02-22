import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowRight, BarChart3, Bot, GitMerge, Link2, Package, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Maon Crosssell</span>
          </div>
          <a
            href={getLoginUrl()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Giriş Yap
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
          <Zap className="w-3.5 h-3.5" />
          Shopify Crosssell Yönetim Platformu
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight">
          Maon Mağazanız İçin
          <br />
          <span className="text-primary">Akıllı Crosssell</span> Sistemi
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Kategori, etiket, fiyat ve AI destekli crosssell kurallarıyla müşterilerinize doğru ürünleri doğru anda önerin. Satışlarınızı artırın.
        </p>
        <a
          href={getLoginUrl()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity text-base"
        >
          Panele Giriş Yap
          <ArrowRight className="w-5 h-5" />
        </a>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: GitMerge,
              title: "Çoklu Kural Motoru",
              desc: "Kategori, etiket, fiyat aralığı ve manuel kurallarla esnek crosssell stratejileri oluşturun.",
            },
            {
              icon: Bot,
              title: "AI Destekli Öneriler",
              desc: "LLM ile ürün özelliklerini analiz ederek otomatik crosssell kombinasyonları keşfedin.",
            },
            {
              icon: Link2,
              title: "Manuel Kombinasyonlar",
              desc: "Özel ürün eşleştirmeleri ve bundle teklifleri oluşturun, indirim oranları belirleyin.",
            },
            {
              icon: Package,
              title: "Shopify Entegrasyonu",
              desc: "Storefront API ile ürünlerinizi otomatik senkronize edin, webhook ile güncel kalın.",
            },
            {
              icon: Sparkles,
              title: "Widget Sistemi",
              desc: "Ürün sayfası ve sepet için ayrı widget'larla müşterilerinize kesintisiz öneri sunun.",
            },
            {
              icon: BarChart3,
              title: "Detaylı Analitik",
              desc: "Gösterim, tıklama, dönüşüm ve gelir metriklerini gerçek zamanlı takip edin.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <feature.icon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight,
  BarChart3,
  GitMerge,
  Link2,
  MousePointerClick,
  Package,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  color?: "primary" | "green" | "blue" | "purple";
}) {
  const colorMap = {
    primary: "text-primary bg-primary/10 border-primary/20",
    green: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            <ArrowUpRight className={`w-3 h-3 ${trend < 0 ? "rotate-180" : ""}`} />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery({ days: 30 });
  const { data: dailyData, isLoading: dailyLoading } = trpc.analytics.daily.useQuery({ days: 14 });
  const { data: rules } = trpc.rules.list.useQuery();
  const { data: pairings } = trpc.pairings.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();

  const activeRules = rules?.filter((r) => r.isActive).length ?? 0;
  const totalRules = rules?.length ?? 0;
  const totalPairings = pairings?.length ?? 0;
  const totalProducts = products?.length ?? 0;

  const chartData = dailyData?.map((d) => ({
    date: new Date(d.date).toLocaleDateString("tr-TR", { month: "short", day: "numeric" }),
    Gösterim: d.impressions,
    Tıklama: d.clicks,
    Satın_Alma: d.purchases,
  })) ?? [];

  return (
    <AppLayout title="Dashboard" subtitle="Crosssell performansınıza genel bakış">
      <div className="space-y-6">
        {/* Welcome banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 rounded-xl p-6">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-primary text-sm font-medium">Maon Crosssell</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">Hoş Geldiniz!</h2>
            <p className="text-muted-foreground text-sm max-w-lg">
              Shopify mağazanız için crosssell kurallarını yönetin, ürün kombinasyonları oluşturun ve satışlarınızı artırın.
            </p>
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
            <ShoppingCart className="w-24 h-24 text-primary" />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Gösterim (30 gün)"
            value={summaryLoading ? "..." : (summary?.impressions ?? 0).toLocaleString("tr-TR")}
            icon={BarChart3}
            color="blue"
          />
          <StatCard
            title="Tıklama (30 gün)"
            value={summaryLoading ? "..." : (summary?.clicks ?? 0).toLocaleString("tr-TR")}
            subtitle={summary ? `CTR: %${summary.ctr.toFixed(1)}` : undefined}
            icon={MousePointerClick}
            color="primary"
          />
          <StatCard
            title="Satın Alma (30 gün)"
            value={summaryLoading ? "..." : (summary?.purchases ?? 0).toLocaleString("tr-TR")}
            subtitle={summary ? `Dönüşüm: %${summary.conversionRate.toFixed(1)}` : undefined}
            icon={ShoppingCart}
            color="green"
          />
          <StatCard
            title="Crosssell Geliri"
            value={summaryLoading ? "..." : `₺${(summary?.revenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 0 })}`}
            icon={TrendingUp}
            color="purple"
          />
        </div>

        {/* Chart + Quick stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-foreground">Performans Grafiği</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Son 14 günlük crosssell aktivitesi</p>
              </div>
              <Link href="/analytics" className="text-xs text-primary hover:underline flex items-center gap-1">
                Tümünü Gör <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {dailyLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Henüz veri yok</p>
                <p className="text-xs mt-1">Widget'ı mağazanıza ekledikten sonra veriler burada görünecek</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.10 200)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.65 0.10 200)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.12 65)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.72 0.12 65)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.010 45)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "oklch(0.60 0.015 65)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "oklch(0.60 0.015 65)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.16 0.010 45)",
                      border: "1px solid oklch(0.25 0.010 45)",
                      borderRadius: "8px",
                      color: "oklch(0.93 0.015 65)",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="Gösterim" stroke="oklch(0.65 0.10 200)" fill="url(#colorImpressions)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Tıklama" stroke="oklch(0.72 0.12 65)" fill="url(#colorClicks)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick stats */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Hızlı Bakış</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GitMerge className="w-4 h-4" />
                    <span>Aktif Kurallar</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {activeRules}/{totalRules}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link2 className="w-4 h-4" />
                    <span>Manuel Kombinasyon</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{totalPairings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="w-4 h-4" />
                    <span>Senkronize Ürün</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{totalProducts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Öneriler</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">Aktif</span>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Hızlı İşlemler</h3>
              <div className="space-y-2">
                <Link
                  href="/rules"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary hover:bg-accent text-sm text-foreground transition-colors"
                >
                  <GitMerge className="w-4 h-4 text-primary" />
                  Yeni Kural Ekle
                </Link>
                <Link
                  href="/pairings"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary hover:bg-accent text-sm text-foreground transition-colors"
                >
                  <Link2 className="w-4 h-4 text-primary" />
                  Kombinasyon Oluştur
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary hover:bg-accent text-sm text-foreground transition-colors"
                >
                  <Package className="w-4 h-4 text-primary" />
                  Ürünleri Senkronize Et
                </Link>
                <Link
                  href="/llm"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary hover:bg-accent text-sm text-foreground transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Öneri Oluştur
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

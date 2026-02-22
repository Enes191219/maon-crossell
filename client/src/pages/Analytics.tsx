import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { BarChart3, MousePointerClick, ShoppingCart, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const CHART_COLORS = [
  "oklch(0.72 0.12 65)",
  "oklch(0.65 0.10 200)",
  "oklch(0.60 0.12 150)",
  "oklch(0.68 0.14 30)",
  "oklch(0.62 0.10 280)",
];

const tooltipStyle = {
  background: "oklch(0.16 0.010 45)",
  border: "1px solid oklch(0.25 0.010 45)",
  borderRadius: "8px",
  color: "oklch(0.93 0.015 65)",
  fontSize: "12px",
};

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery({ days });
  const { data: dailyData, isLoading: dailyLoading } = trpc.analytics.daily.useQuery({ days });
  const { data: topProducts } = trpc.analytics.topProducts.useQuery({ limit: 5 });
  const { data: products } = trpc.products.list.useQuery();

  const chartData = dailyData?.map((d) => ({
    date: new Date(d.date).toLocaleDateString("tr-TR", { month: "short", day: "numeric" }),
    Gösterim: d.impressions,
    Tıklama: d.clicks,
    "Satın Alma": d.purchases,
    Gelir: d.revenue,
  })) ?? [];

  const funnelData = summary
    ? [
        { name: "Gösterim", value: summary.impressions, fill: "oklch(0.65 0.10 200)" },
        { name: "Tıklama", value: summary.clicks, fill: "oklch(0.72 0.12 65)" },
        { name: "Sepete Ekle", value: summary.addToCarts, fill: "oklch(0.60 0.12 150)" },
        { name: "Satın Alma", value: summary.purchases, fill: "oklch(0.68 0.14 30)" },
      ]
    : [];

  const topProductsWithNames = topProducts?.map((tp) => {
    const product = products?.find((p) => p.shopifyId === tp.shopifyId);
    return { name: product?.title ?? tp.shopifyId, revenue: tp.revenue };
  }) ?? [];

  return (
    <AppLayout title="Analitik" subtitle="Crosssell performans metrikleri ve raporlar">
      <div className="space-y-6">
        {/* Period selector */}
        <div className="flex items-center gap-2">
          {[7, 14, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d} Gün
            </Button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Toplam Gösterim", value: summary?.impressions ?? 0, icon: BarChart3, format: "number" },
            { label: "Tıklama Oranı (CTR)", value: summary?.ctr ?? 0, icon: MousePointerClick, format: "percent" },
            { label: "Dönüşüm Oranı", value: summary?.conversionRate ?? 0, icon: ShoppingCart, format: "percent" },
            { label: "Toplam Gelir", value: summary?.revenue ?? 0, icon: TrendingUp, format: "currency" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <stat.icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {summaryLoading
                  ? "..."
                  : stat.format === "currency"
                  ? `₺${stat.value.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}`
                  : stat.format === "percent"
                  ? `%${stat.value.toFixed(1)}`
                  : stat.value.toLocaleString("tr-TR")}
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily trend */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-1">Günlük Trend</h3>
            <p className="text-xs text-muted-foreground mb-4">Son {days} günlük aktivite</p>
            {dailyLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Henüz veri yok
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.10 200)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.65 0.10 200)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.12 65)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.72 0.12 65)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.010 45)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.60 0.015 65)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.015 65)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area type="monotone" dataKey="Gösterim" stroke="oklch(0.65 0.10 200)" fill="url(#g1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Tıklama" stroke="oklch(0.72 0.12 65)" fill="url(#g2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Funnel */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-1">Dönüşüm Hunisi</h3>
            <p className="text-xs text-muted-foreground mb-4">Gösterimden satışa yolculuk</p>
            {summaryLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : funnelData.every((d) => d.value === 0) ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Henüz veri yok
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.010 45)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.60 0.015 65)" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "oklch(0.60 0.015 65)" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue chart + Top products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily revenue */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-1">Günlük Gelir</h3>
            <p className="text-xs text-muted-foreground mb-4">Crosssell kaynaklı gelir (₺)</p>
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Henüz veri yok
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.010 45)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.60 0.015 65)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.015 65)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₺${v.toFixed(0)}`, "Gelir"]} />
                  <Bar dataKey="Gelir" fill="oklch(0.72 0.12 65)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top products */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-1">En Çok Gelir Getiren Ürünler</h3>
            <p className="text-xs text-muted-foreground mb-4">Crosssell ile satılan top 5 ürün</p>
            {topProductsWithNames.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Henüz veri yok
              </div>
            ) : (
              <div className="space-y-3">
                {topProductsWithNames.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{item.name}</p>
                      <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(item.revenue / (topProductsWithNames[0]?.revenue ?? 1)) * 100}%`,
                            background: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground flex-shrink-0">
                      ₺{item.revenue.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

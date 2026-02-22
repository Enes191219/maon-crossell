import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  getAllProducts,
  getAllRules,
  getAllPairings,
  getAllWidgetSettings,
  getAnalyticsSummary,
  getCrosssellRecommendations,
  getDailyAnalytics,
  getLlmSuggestions,
  getPairingsForProduct,
  getProductByShopifyId,
  getProductById,
  getRuleById,
  getShopifyConfig,
  getTopPerformingProducts,
  getWidgetSetting,
  recordEvent,
  saveLlmSuggestions,
  setWidgetSetting,
  upsertShopifyConfig,
  createRule,
  updateRule,
  deleteRule,
  createPairing,
  updatePairing,
  deletePairing,
  approveLlmSuggestion,
  deleteLlmSuggestion,
} from "./db";
import { fetchAndSyncProducts, verifyShopifyConnection } from "./shopify";

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Bu işlem için yönetici yetkisi gereklidir." });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Shopify Config ───────────────────────────────────────────────────────
  shopify: router({
    getConfig: adminProcedure.query(async () => {
      const config = await getShopifyConfig();
      if (!config) return null;
      return {
        ...config,
        storefrontAccessToken: config.storefrontAccessToken ? "***" + config.storefrontAccessToken.slice(-4) : null,
        adminAccessToken: config.adminAccessToken ? "***" + config.adminAccessToken.slice(-4) : null,
      };
    }),

    saveConfig: adminProcedure
      .input(
        z.object({
          storeDomain: z.string().min(1),
          storefrontAccessToken: z.string().optional(),
          adminAccessToken: z.string().optional(),
          webhookSecret: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return upsertShopifyConfig(input);
      }),

    verifyConnection: adminProcedure
      .input(z.object({ storeDomain: z.string(), storefrontAccessToken: z.string() }))
      .mutation(async ({ input }) => {
        return verifyShopifyConnection(input.storeDomain, input.storefrontAccessToken);
      }),

    syncProducts: adminProcedure.mutation(async () => {
      return fetchAndSyncProducts();
    }),
  }),

  // ─── Products ─────────────────────────────────────────────────────────────
  products: router({
    list: adminProcedure
      .input(z.object({ activeOnly: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return getAllProducts(input?.activeOnly ?? true);
      }),

    getByShopifyId: publicProcedure
      .input(z.object({ shopifyId: z.string() }))
      .query(async ({ input }) => {
        return getProductByShopifyId(input.shopifyId);
      }),
  }),

  // ─── Crosssell Rules ──────────────────────────────────────────────────────
  rules: router({
    list: adminProcedure
      .input(z.object({ activeOnly: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return getAllRules(input?.activeOnly ?? false);
      }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getRuleById(input.id);
      }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          ruleType: z.enum(["category", "tag", "price_range", "manual", "llm"]),
          isActive: z.boolean().default(true),
          priority: z.number().default(0),
          categoryValue: z.string().optional(),
          tagValue: z.string().optional(),
          priceRangePercent: z.number().optional(),
          maxProducts: z.number().default(4),
          displayTitle: z.string().optional(),
          displayPosition: z.enum(["product_page", "cart", "both"]).default("both"),
        })
      )
      .mutation(async ({ input }) => {
        await createRule({
          name: input.name,
          description: input.description ?? null,
          ruleType: input.ruleType,
          isActive: input.isActive,
          priority: input.priority,
          categoryValue: input.categoryValue ?? null,
          tagValue: input.tagValue ?? null,
          priceRangePercent: input.priceRangePercent ?? null,
          maxProducts: input.maxProducts,
          displayTitle: input.displayTitle ?? "Bunları Da Beğenebilirsiniz",
          displayPosition: input.displayPosition,
        });
        return { success: true };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
          priority: z.number().optional(),
          categoryValue: z.string().optional(),
          tagValue: z.string().optional(),
          priceRangePercent: z.number().optional(),
          maxProducts: z.number().optional(),
          displayTitle: z.string().optional(),
          displayPosition: z.enum(["product_page", "cart", "both"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateRule(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteRule(input.id);
        return { success: true };
      }),
  }),

  // ─── Manual Pairings ──────────────────────────────────────────────────────
  pairings: router({
    list: adminProcedure.query(async () => {
      const pairings = await getAllPairings();
      // Enrich with product data
      const enriched = await Promise.all(
        pairings.map(async (p) => {
          const source = await getProductById(p.sourceProductId);
          const target = await getProductById(p.targetProductId);
          return { ...p, sourceProduct: source, targetProduct: target };
        })
      );
      return enriched;
    }),

    create: adminProcedure
      .input(
        z.object({
          sourceProductId: z.number(),
          targetProductId: z.number(),
          priority: z.number().default(0),
          discountPercent: z.number().optional(),
          bundleTitle: z.string().optional(),
          isActive: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        await createPairing({
          sourceProductId: input.sourceProductId,
          targetProductId: input.targetProductId,
          priority: input.priority,
          discountPercent: input.discountPercent ?? null,
          bundleTitle: input.bundleTitle ?? null,
          isActive: input.isActive,
        });
        return { success: true };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          priority: z.number().optional(),
          discountPercent: z.number().optional(),
          bundleTitle: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updatePairing(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePairing(input.id);
        return { success: true };
      }),
  }),

  // ─── LLM Suggestions ─────────────────────────────────────────────────────
  llm: router({
    getSuggestions: adminProcedure
      .input(z.object({ approvedOnly: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        const suggestions = await getLlmSuggestions(input?.approvedOnly ?? false);
        const enriched = await Promise.all(
          suggestions.map(async (s) => {
            const source = await getProductById(s.sourceProductId);
            const target = await getProductById(s.targetProductId);
            return { ...s, sourceProduct: source, targetProduct: target };
          })
        );
        return enriched;
      }),

    generateSuggestions: adminProcedure
      .input(z.object({ productId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const products = await getAllProducts(true);
        if (products.length < 2) {
          return { generated: 0, message: "Öneri oluşturmak için en az 2 ürün gereklidir." };
        }

        const targetProducts = input.productId
          ? products.filter((p) => p.id === input.productId)
          : products.slice(0, 5); // Limit to 5 products at a time

        const allSuggestions: Array<{ sourceProductId: number; targetProductId: number; confidence: string; reasoning: string }> = [];

        for (const sourceProduct of targetProducts) {
          const otherProducts = products.filter((p) => p.id !== sourceProduct.id);
          const productList = otherProducts
            .slice(0, 20)
            .map((p) => `ID:${p.id} | ${p.title} | Fiyat:${p.priceMin}TL | Kategori:${(p.collections ?? []).join(",")} | Etiketler:${(p.tags ?? []).join(",")}`)
            .join("\n");

          try {
            const response = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `Sen bir e-ticaret crosssell uzmanısın. Maon deri aksesuar mağazası için ürün önerileri oluşturuyorsun. 
                  Müşteri bir ürün satın alırken hangi diğer ürünleri de satın almak isteyebileceğini analiz et.
                  Yanıtını JSON formatında ver.`,
                },
                {
                  role: "user",
                  content: `Kaynak ürün: ${sourceProduct.title} (Fiyat: ${sourceProduct.priceMin}TL, Kategori: ${(sourceProduct.collections ?? []).join(",")}, Etiketler: ${(sourceProduct.tags ?? []).join(",")})
                  
                  Diğer ürünler:
                  ${productList}
                  
                  Bu ürünü satın alan müşteriye en uygun 3 crosssell ürünü öner. Her öneri için güven skoru (0-1) ve kısa gerekçe ver.`,
                },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "crosssell_suggestions",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      suggestions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            productId: { type: "integer" },
                            confidence: { type: "number" },
                            reasoning: { type: "string" },
                          },
                          required: ["productId", "confidence", "reasoning"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["suggestions"],
                    additionalProperties: false,
                  },
                },
              },
            });

            const rawContent = response.choices[0]?.message?.content;
            const content = typeof rawContent === 'string' ? rawContent : null;
            if (content) {
              const parsed = JSON.parse(content) as { suggestions: Array<{ productId: number; confidence: number; reasoning: string }> };
              for (const s of parsed.suggestions) {
                const targetProduct = products.find((p) => p.id === s.productId);
                if (targetProduct) {
                  allSuggestions.push({
                    sourceProductId: sourceProduct.id,
                    targetProductId: targetProduct.id,
                    confidence: s.confidence.toFixed(4),
                    reasoning: s.reasoning,
                  });
                }
              }
            }
          } catch (err) {
            console.error("LLM suggestion error:", err);
          }
        }

        if (allSuggestions.length > 0) {
          await saveLlmSuggestions(allSuggestions);
        }

        return { generated: allSuggestions.length, message: `${allSuggestions.length} öneri oluşturuldu.` };
      }),

    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await approveLlmSuggestion(input.id);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLlmSuggestion(input.id);
        return { success: true };
      }),
  }),

  // ─── Widget API (public) ──────────────────────────────────────────────────
  widget: router({
    getRecommendations: publicProcedure
      .input(
        z.object({
          shopifyProductId: z.string(),
          position: z.enum(["product_page", "cart"]),
          limit: z.number().min(1).max(8).default(4),
        })
      )
      .query(async ({ input }) => {
        const products = await getCrosssellRecommendations(
          input.shopifyProductId,
          input.position,
          input.limit
        );
        const settings = await getAllWidgetSettings();
        return {
          products,
          settings: {
            title: settings["widget_title"] ?? "Bunları Da Beğenebilirsiniz",
            accentColor: settings["widget_accent_color"] ?? "#8B6914",
            maxProducts: parseInt(settings["widget_max_products"] ?? "4"),
          },
        };
      }),

    trackEvent: publicProcedure
      .input(
        z.object({
          eventType: z.enum(["impression", "click", "add_to_cart", "purchase"]),
          sourceProductId: z.string().optional(),
          targetProductId: z.string().optional(),
          ruleId: z.number().optional(),
          ruleType: z.string().optional(),
          sessionId: z.string().optional(),
          revenue: z.string().optional(),
          pageType: z.enum(["product_page", "cart"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        await recordEvent({
          eventType: input.eventType,
          sourceProductId: input.sourceProductId ?? null,
          targetProductId: input.targetProductId ?? null,
          ruleId: input.ruleId ?? null,
          ruleType: input.ruleType ?? null,
          sessionId: input.sessionId ?? null,
          revenue: input.revenue ?? null,
          currency: "TRY",
          pageType: input.pageType ?? null,
          metadata: null,
        });
        return { success: true };
      }),

    getSettings: publicProcedure.query(async () => {
      return getAllWidgetSettings();
    }),

    updateSettings: adminProcedure
      .input(
        z.object({
          widget_title: z.string().optional(),
          widget_accent_color: z.string().optional(),
          widget_max_products: z.string().optional(),
          widget_show_price: z.string().optional(),
          widget_show_discount: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined) {
            await setWidgetSetting(key, value);
          }
        }
        return { success: true };
      }),
  }),

  // ─── Analytics ────────────────────────────────────────────────────────────
  analytics: router({
    summary: adminProcedure
      .input(z.object({ days: z.number().default(30) }).optional())
      .query(async ({ input }) => {
        return getAnalyticsSummary(input?.days ?? 30);
      }),

    daily: adminProcedure
      .input(z.object({ days: z.number().default(30) }).optional())
      .query(async ({ input }) => {
        return getDailyAnalytics(input?.days ?? 30);
      }),

    topProducts: adminProcedure
      .input(z.object({ limit: z.number().default(10) }).optional())
      .query(async ({ input }) => {
        return getTopPerformingProducts(input?.limit ?? 10);
      }),
  }),
});

export type AppRouter = typeof appRouter;

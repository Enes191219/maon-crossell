import type { Request, Response } from "express";
import crypto from "crypto";
import { getShopifyConfig, upsertShopifyProduct } from "./db";

interface ShopifyProductWebhook {
  id: number;
  handle: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  status: string;
  variants: Array<{ price: string; compare_at_price: string | null }>;
  images: Array<{ src: string; alt: string | null }>;
  collections?: Array<{ title: string; handle: string }>;
}

function verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const digest = hmac.digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function handleShopifyWebhook(req: Request, res: Response): Promise<void> {
  const topic = req.headers["x-shopify-topic"] as string;
  const shopDomain = req.headers["x-shopify-shop-domain"] as string;
  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;

  // Verify signature if webhook secret is configured
  const config = await getShopifyConfig();
  if (config?.webhookSecret && hmacHeader) {
    const rawBody = req.body as Buffer;
    const isValid = verifyWebhookSignature(rawBody, hmacHeader, config.webhookSecret);
    if (!isValid) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }
  }

  let payload: ShopifyProductWebhook;
  try {
    const bodyStr = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
    payload = JSON.parse(bodyStr);
  } catch {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  console.log(`[Webhook] Received: ${topic} from ${shopDomain}`);

  try {
    switch (topic) {
      case "products/create":
      case "products/update": {
        const minPrice = payload.variants?.reduce(
          (min, v) => (parseFloat(v.price) < min ? parseFloat(v.price) : min),
          Infinity
        );
        const maxPrice = payload.variants?.reduce(
          (max, v) => (parseFloat(v.price) > max ? parseFloat(v.price) : max),
          0
        );
        const compareAtPrice = payload.variants?.find((v) => v.compare_at_price)?.compare_at_price;

        await upsertShopifyProduct({
          shopifyId: String(payload.id),
          handle: payload.handle,
          title: payload.title,
          description: payload.body_html?.replace(/<[^>]+>/g, "").trim() || null,
          vendor: payload.vendor || null,
          productType: payload.product_type || null,
          tags: payload.tags ? payload.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          collections: [],
          priceMin: isFinite(minPrice) ? String(minPrice) : "0",
          priceMax: String(maxPrice),
          compareAtPriceMin: compareAtPrice || null,
          imageUrl: payload.images?.[0]?.src || null,
          imageAlt: payload.images?.[0]?.alt || null,
          productUrl: config?.storeDomain
            ? `https://${config.storeDomain.replace(/^https?:\/\//, "")}/products/${payload.handle}`
            : null,
          isActive: payload.status === "active",
          metaData: null,
        });
        console.log(`[Webhook] Product upserted: ${payload.handle}`);
        break;
      }

      case "products/delete": {
        // Mark as inactive rather than deleting
        await upsertShopifyProduct({
          shopifyId: String(payload.id),
          handle: payload.handle || "",
          title: payload.title || "",
          description: null,
          vendor: null,
          productType: null,
          tags: [],
          collections: [],
          priceMin: "0",
          priceMax: "0",
          compareAtPriceMin: null,
          imageUrl: null,
          imageAlt: null,
          productUrl: null,
          isActive: false,
          metaData: null,
        });
        console.log(`[Webhook] Product deactivated: ${payload.id}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled topic: ${topic}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Webhook] Processing error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

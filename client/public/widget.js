/**
 * Maon Crosssell Widget v1.0
 * Shopify mağazanıza crosssell önerileri ekler
 * 
 * Kullanım:
 * <script>
 *   window.MaonCrosssell = { apiUrl: 'https://your-app-url.com', position: 'product_page' };
 * </script>
 * <script src="https://your-app-url.com/widget.js" defer></script>
 */
(function () {
  'use strict';

  const config = window.MaonCrosssell || {};
  const API_URL = config.apiUrl || window.location.origin;
  const SESSION_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);

  // Styles
  const STYLES = `
    .maon-crosssell-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 24px 0;
      padding: 20px;
      border: 1px solid rgba(201, 168, 76, 0.2);
      border-radius: 12px;
      background: rgba(0,0,0,0.02);
    }
    .maon-crosssell-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin: 0 0 16px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .maon-crosssell-title::before {
      content: '★';
      color: var(--maon-accent, #C9A84C);
    }
    .maon-crosssell-grid {
      display: grid;
      gap: 12px;
    }
    .maon-crosssell-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
    .maon-crosssell-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
    .maon-crosssell-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
    @media (max-width: 640px) {
      .maon-crosssell-grid.cols-3,
      .maon-crosssell-grid.cols-4 { grid-template-columns: repeat(2, 1fr); }
    }
    .maon-crosssell-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      color: inherit;
      display: block;
    }
    .maon-crosssell-item:hover {
      border-color: var(--maon-accent, #C9A84C);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(201, 168, 76, 0.15);
    }
    .maon-crosssell-img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      display: block;
      background: #f3f4f6;
    }
    .maon-crosssell-info {
      padding: 8px;
    }
    .maon-crosssell-name {
      font-size: 12px;
      font-weight: 500;
      color: #111;
      margin: 0 0 4px 0;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .maon-crosssell-price {
      font-size: 13px;
      font-weight: 700;
      color: var(--maon-accent, #C9A84C);
      margin: 0;
    }
    .maon-crosssell-badge {
      font-size: 10px;
      background: var(--maon-accent, #C9A84C);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 4px;
    }
  `;

  function injectStyles() {
    if (document.getElementById('maon-crosssell-styles')) return;
    const style = document.createElement('style');
    style.id = 'maon-crosssell-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function formatPrice(amount) {
    return '₺' + parseFloat(amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0 });
  }

  async function fetchRecommendations(shopifyProductId, position, limit) {
    try {
      const params = new URLSearchParams({
        input: JSON.stringify({ shopifyProductId, position, limit: limit || 4 })
      });
      const res = await fetch(`${API_URL}/api/trpc/widget.getRecommendations?${params}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.result?.data?.json || null;
    } catch (e) {
      console.warn('[Maon Crosssell] Öneriler alınamadı:', e);
      return null;
    }
  }

  async function trackEvent(eventType, sourceProductId, targetProductId, ruleType, pageType) {
    try {
      await fetch(`${API_URL}/api/trpc/widget.trackEvent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "0": {
            json: {
              eventType,
              sourceProductId: sourceProductId || undefined,
              targetProductId: targetProductId || undefined,
              ruleType: ruleType || undefined,
              sessionId: SESSION_ID,
              pageType: pageType || undefined,
            }
          }
        })
      });
    } catch (e) {
      // Silent fail for tracking
    }
  }

  function createWidget(data, position, sourceProductId) {
    if (!data || !data.products || !data.products.length) return null;

    const { products, settings } = data;
    const accentColor = settings.accentColor || '#C9A84C';
    const title = settings.title || 'Bunları Da Beğenebilirsiniz';
    const maxProducts = Math.min(settings.maxProducts || 4, products.length);
    const cols = position === 'cart' ? Math.min(2, maxProducts) : Math.min(4, maxProducts);

    const widget = document.createElement('div');
    widget.className = 'maon-crosssell-widget';
    widget.style.setProperty('--maon-accent', accentColor);

    const titleEl = document.createElement('h3');
    titleEl.className = 'maon-crosssell-title';
    titleEl.textContent = title;
    widget.appendChild(titleEl);

    const grid = document.createElement('div');
    grid.className = `maon-crosssell-grid cols-${cols}`;

    products.slice(0, maxProducts).forEach((product) => {
      const item = document.createElement('a');
      item.className = 'maon-crosssell-item';
      item.href = product.productUrl || `https://maon.co/products/${product.handle}`;

      const img = document.createElement('img');
      img.className = 'maon-crosssell-img';
      img.src = product.imageUrl || '';
      img.alt = product.imageAlt || product.title;
      img.loading = 'lazy';
      item.appendChild(img);

      const info = document.createElement('div');
      info.className = 'maon-crosssell-info';

      const name = document.createElement('p');
      name.className = 'maon-crosssell-name';
      name.textContent = product.title;
      info.appendChild(name);

      const price = document.createElement('p');
      price.className = 'maon-crosssell-price';
      price.textContent = formatPrice(product.priceMin);
      info.appendChild(price);

      item.appendChild(info);

      // Track click
      item.addEventListener('click', () => {
        trackEvent('click', sourceProductId, product.shopifyId, product.ruleType, position);
      });

      grid.appendChild(item);
    });

    widget.appendChild(grid);

    // Track impression
    trackEvent('impression', sourceProductId, null, null, position);

    return widget;
  }

  async function initProductPage() {
    // Get product ID from Shopify's global variable
    const productId = window.ShopifyAnalytics?.meta?.product?.id
      || document.querySelector('[data-product-id]')?.getAttribute('data-product-id')
      || document.querySelector('form[action*="/cart/add"] input[name="id"]')?.value;

    if (!productId) return;

    const placeholder = document.querySelector('[data-maon-crosssell="product_page"]')
      || document.querySelector('.maon-crosssell-placeholder[data-position="product_page"]');

    if (!placeholder) {
      // Auto-inject after product form
      const productForm = document.querySelector('form[action*="/cart/add"]')
        || document.querySelector('.product-form')
        || document.querySelector('[data-product-form]');
      if (!productForm) return;

      const data = await fetchRecommendations(String(productId), 'product_page', 4);
      if (!data) return;

      const widget = createWidget(data, 'product_page', String(productId));
      if (widget) {
        productForm.parentNode.insertBefore(widget, productForm.nextSibling);
      }
    } else {
      const data = await fetchRecommendations(String(productId), 'product_page', 4);
      if (!data) return;
      const widget = createWidget(data, 'product_page', String(productId));
      if (widget) placeholder.appendChild(widget);
    }
  }

  async function initCartPage() {
    const placeholder = document.querySelector('[data-maon-crosssell="cart"]')
      || document.querySelector('.maon-crosssell-placeholder[data-position="cart"]');

    // Get first cart item product ID
    const cartItems = window.Shopify?.checkout?.line_items
      || document.querySelectorAll('[data-product-id]');

    const productId = cartItems?.[0]?.product_id
      || (cartItems?.length > 0 ? cartItems[0].getAttribute('data-product-id') : null);

    if (!productId) return;

    const data = await fetchRecommendations(String(productId), 'cart', 2);
    if (!data) return;

    const widget = createWidget(data, 'cart', String(productId));
    if (!widget) return;

    if (placeholder) {
      placeholder.appendChild(widget);
    } else {
      const cartForm = document.querySelector('form[action="/cart"]')
        || document.querySelector('.cart-form')
        || document.querySelector('[data-cart-form]');
      if (cartForm) {
        cartForm.parentNode.insertBefore(widget, cartForm);
      }
    }
  }

  function init() {
    injectStyles();

    const position = config.position || 'both';
    const path = window.location.pathname;

    if ((position === 'product_page' || position === 'both') && path.includes('/products/')) {
      initProductPage();
    }

    if ((position === 'cart' || position === 'both') && (path === '/cart' || path.includes('/cart'))) {
      initCartPage();
    }

    // Also handle AJAX cart drawer
    if (position === 'cart' || position === 'both') {
      document.addEventListener('cart:updated', initCartPage);
      document.addEventListener('drawer:open', function(e) {
        if (e.detail?.drawer === 'cart' || e.detail?.id === 'cart-drawer') {
          setTimeout(initCartPage, 300);
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

# Grocery Store API Discovery

## JioMart

**Base URL**: `https://www.jiomart.com`

| API | Method | Purpose |
|-----|--------|---------|
| `/ext/vertex/application/api/v1.0/products?q={query}&page_size=N&page_id=*` | GET | Product search |
| `/api/service/application/logistics/v1.0/pincode/{pincode}` | GET | Pincode validation & delivery check |
| `/api/service/application/cart/v1.0/basic` | GET | Cart data |

**Headers required** for the products API:
- `x-location-detail`: `{"pincode":"734011","country":"INDIA","country_iso_code":"IN"}`
- `accept`: `application/json`
- `user-agent`: Standard browser UA

**Response shape** (products API):
```json
{
  "items": [
    {
      "type": "product",
      "name": "Fortune Chakki Fresh Atta 5 kg",
      "slug": "fortune-chakki-fresh-atta-5-kg-...",
      "brand": { "name": "fortune" },
      "price": {
        "effective": { "min": 225, "max": 225 },
        "marked": { "min": 270, "max": 270 }
      },
      "medias": [{ "url": "https://cdn1.jiomartjcp.com/..." }],
      "sizes": ["5 KG"],
      "variants": [ ... ]
    }
  ],
  "page": { "item_total": 62, "has_next": true },
  "filters": [ ... ],
  "sort_on": [ ... ]
}
```

**Notes**:
- Based on Fynd (FP) headless commerce platform
- Pincode 734011 (Siliguri) was auto-detected from the browser session
- No authentication required for basic search, but `x-location-detail` header is needed
- SPA-based; the API is used by the React frontend directly

---

## Vishal Mega Mart

**Base URL**: `https://www.vishalmegamart.com`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/en-in/search?q={query}` | GET | Product search (HTML) |
| `/on/demandware.store/Sites-vishalmegamart-Site/en_IN/Wishlist-AddProduct` | POST | Add to wishlist |

**Platform**: Salesforce Commerce Cloud (Demandware)

**Response**: Server-rendered HTML with product data in structured DOM:
- Product cards with class patterns like `[class*="product"]`
- Price displayed as `₹ X.XX`
- Unit/weight shown as text (e.g., "30 g", "228 g", "1 Kg")
- Images via CDN: `https://www.vishalmegamart.com/dw/image/v2/...`

**Scraping approach**: Cheerio (HTML parser) - no JavaScript execution needed

---

## Spencer's (Jiffy by Spencers)

**Base URL**: `https://www.spencers.in`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/search?q={query}` | GET | Product search |
| `/` | GET | Homepage (location dialog) |

**Notes**:
- Shows a location dialog on first load requesting pincode
- May require cookie/session handling for location persistence
- SPA-based site; product data may be loaded via API or embedded in HTML
- The `?pincode=` query parameter can be passed directly

---

## Flipkart

**Base URL**: `https://www.flipkart.com`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/search?q={query}` | GET | Product search (HTML + SSR data) |
| `/flipkart-minutes-store?marketplace=HYPERLOCAL` | GET | Hyperlocal/minutes store |

**Platform**: Custom SPA (React-based)

**Notes**:
- Strong anti-scraping measures (CAPTCHA, rate limiting, bot detection)
- Product data embedded in page HTML via SSR or JSON-LD
- Class names are minified/obfuscated (e.g., `_4rR01T`, `_30jeq3`)
- May require additional headers/cookies for reliable access
- The minutes/hyperlocal store page redirects to a preview page

---

## Our Application API

### Search Endpoint

```
GET /api/search?q=bread&pincode=734011&sort=unit_price_asc
```

**Parameters**:
| Param | Default | Description |
|-------|---------|-------------|
| `q` | (required) | Search query |
| `pincode` | `734011` | Delivery pincode |
| `sort` | `price_asc` | Sort order: `price_asc`, `price_desc`, `unit_price_asc`, `unit_price_desc`, `store_count_desc` |

**Response**:
```json
{
  "query": "bread",
  "pincode": "734011",
  "matched": [
    {
      "matchKey": "bread brown",
      "displayName": "Britannia Brown Bread 400 g",
      "brand": "britannia",
      "minPrice": 35,
      "maxPrice": 45,
      "minPricePerUnit": 0.0875,
      "variants": [
        { "name": "...", "price": 35, "store": "jiomart", ... },
        { "name": "...", "price": 45, "store": "vishalmegamart", ... }
      ]
    }
  ],
  "totalProducts": 42,
  "stores": [
    { "id": "jiomart", "name": "JioMart", "status": "ok" },
    { "id": "flipkart", "name": "Flipkart", "status": "error", "error": "..." },
    { "id": "spencers", "name": "Spencer's", "status": "ok" },
    { "id": "vishalmegamart", "name": "Vishal Mega Mart", "status": "ok" }
  ]
}
```

# Google AdSense/DoubleClick-Style Advertising System

## Overview

The MapAble platform now includes a comprehensive advertising system modeled on Google AdSense/AdMob/DoubleClick, featuring:

- **Dual-sided marketplace**: Publishers earn revenue, advertisers pay for placements
- **Real-time ad serving**: Fast ad selection and auction system (<100ms)
- **Revenue sharing**: Configurable split (default 70% publisher, 30% platform)
- **Advanced targeting**: Contextual, geographic, device, and audience targeting
- **Multiple ad formats**: Sponsored markers, banners, popups, search results
- **Comprehensive analytics**: Performance reporting for publishers and advertisers
- **Payment automation**: Automatic publisher payouts and advertiser billing

## Architecture

### Database Models

**Publisher** (`prisma/schema.prisma`)
- Publisher accounts with revenue sharing
- Ad unit management
- Payment tracking

**Advertiser** (`prisma/schema.prisma`)
- Advertiser accounts with credit limits
- Campaign management
- Billing tracking

**AdUnit** (`prisma/schema.prisma`)
- Ad placement slots
- Performance metrics
- Revenue tracking

**AdRequest** (`prisma/schema.prisma`)
- Ad request records
- Auction results
- Performance tracking

**AdCampaign** (`prisma/schema.prisma`)
- Campaign management with DoubleClick-style features
- Bidding strategies (CPC, CPM, CPA)
- Advanced targeting options

**Advertisement** (`prisma/schema.prisma`)
- Individual ad creatives
- Targeting rules
- Budget limits

**Business** (`prisma/schema.prisma`)
- Business listings
- Commerce features
- NDIS provider support

## Services

### Ad Server (`lib/services/advertising/ad-server.ts`)
- Real-time ad selection
- Auction system (first-price/second-price)
- Quality score calculation
- Frequency capping
- Ad serving and tracking

### Targeting Service (`lib/services/advertising/targeting-service.ts`)
- Geographic targeting
- Category targeting
- Keyword/contextual targeting
- Device targeting
- Day parting (time-based)

### Auction Service (`lib/services/advertising/auction-service.ts`)
- First-price and second-price auctions
- Effective bid calculation (bid × quality score)
- Reserve price enforcement

### Revenue Calculator (`lib/services/advertising/revenue-calculator.ts`)
- Publisher earnings calculation
- Advertiser spend tracking
- Revenue share distribution
- Payment threshold checking

### Analytics Service (`lib/services/advertising/analytics-service.ts`)
- Publisher performance metrics
- Advertiser campaign analytics
- Time series data
- Category performance

### Payment Service (`lib/services/advertising/payment-service.ts`)
- Publisher payout processing
- Advertiser payment processing
- Payment history
- Scheduled payouts

## API Endpoints

### Ad Serving
- `POST /api/ads/serve` - Real-time ad request
- `GET /api/ads/track/impression?requestId=...` - Track impression (1x1 pixel)
- `GET /api/ads/track/click?requestId=...` - Track click and redirect

### Publisher APIs
- `POST /api/publishers` - Create publisher account
- `GET /api/publishers` - Get publisher account
- `POST /api/publishers/ad-units` - Create ad unit
- `GET /api/publishers/ad-units` - List ad units
- `GET /api/publishers/earnings` - Get earnings summary
- `GET /api/publishers/analytics` - Get performance analytics
- `POST /api/publishers/payout` - Request payout
- `GET /api/publishers/payout` - Get payment history

### Advertiser APIs
- `POST /api/advertisers` - Create advertiser account
- `GET /api/advertisers` - Get advertiser account
- `POST /api/advertisers/campaigns` - Create campaign
- `GET /api/advertisers/campaigns` - List campaigns
- `GET /api/advertisers/performance` - Get performance metrics
- `GET /api/advertisers/analytics` - Get analytics
- `POST /api/advertisers/payment` - Add funds
- `GET /api/advertisers/payment` - Get payment history

## Map Integration

### MapWithAds Component (`components/map/MapWithAds.tsx`)
- Displays sponsored markers on map
- Banner ads (top/bottom)
- Popup/interstitial ads
- Real-time ad fetching
- Impression/click tracking

### Ad Components
- `SponsoredMarker.tsx` - Business markers with "Sponsored" badge
- `BannerAd.tsx` - Banner ad component
- `PopupAd.tsx` - Interstitial popup
- `SearchAd.tsx` - Sponsored search result

## Configuration

### Environment Variables

```env
# Revenue Sharing
AD_REVENUE_SHARE_PUBLISHER=0.70
AD_REVENUE_SHARE_PLATFORM=0.30

# Payment Settings
AD_MINIMUM_PAYOUT=100
AD_PAYMENT_FREQUENCY=monthly

# Auction Settings
AD_AUCTION_TYPE=first_price
AD_MIN_BID=0.01
AD_RESERVE_PRICE=0.01

# Quality Score Weights
AD_QUALITY_CTR_WEIGHT=0.4
AD_QUALITY_RELEVANCE_WEIGHT=0.4
AD_QUALITY_LANDING_WEIGHT=0.2

# Frequency Capping
AD_FREQUENCY_CAPPING=true
AD_FREQUENCY_CAP=10

# Default Ad Unit
NEXT_PUBLIC_DEFAULT_AD_UNIT_ID=map_accessibility
```

## Usage Examples

### Publisher Setup

1. Create publisher account:
```typescript
POST /api/publishers
{
  "paymentMethod": "bank",
  "paymentDetails": { ... }
}
```

2. Create ad unit:
```typescript
POST /api/publishers/ad-units
{
  "name": "Accessibility Map Banner",
  "format": "BANNER",
  "size": "728x90",
  "location": { "position": "top" }
}
```

3. Embed ad unit in map:
```tsx
<MapWithAds
  adUnitId="ad_unit_code_here"
  showAdvertisements={true}
/>
```

### Advertiser Setup

1. Create advertiser account:
```typescript
POST /api/advertisers
{
  "businessId": "business_id",
  "creditLimit": 1000
}
```

2. Add funds:
```typescript
POST /api/advertisers/payment
{
  "advertiserId": "advertiser_id",
  "amount": 500,
  "paymentMethod": "credit_card"
}
```

3. Create campaign:
```typescript
POST /api/advertisers/campaigns
{
  "name": "NDIS Provider Campaign",
  "advertiserId": "advertiser_id",
  "biddingStrategy": "CPC",
  "maxBid": 0.50,
  "totalBudget": 1000,
  "startDate": "2024-01-01",
  "targetCategories": ["NDIS_PROVIDER"],
  "geoTargeting": {
    "points": [{
      "lat": -33.8688,
      "lng": 151.2093,
      "radius": 5000
    }]
  }
}
```

4. Create advertisement:
```typescript
POST /api/commerce/advertisements
{
  "businessId": "business_id",
  "campaignId": "campaign_id",
  "type": "SPONSORED_MARKER",
  "title": "Accessible NDIS Provider",
  "description": "Fully accessible services",
  "imageUrl": "https://...",
  "linkUrl": "https://...",
  "callToAction": "Learn More"
}
```

## Revenue Model

- **Platform Commission**: 30% (default)
- **Publisher Share**: 70% (default)
- **Advertiser Pricing**: CPC (cost per click) or CPM (cost per 1000 impressions)
- **Minimum Payout**: $100 AUD (configurable)
- **Payment Frequency**: Monthly (configurable)

## Features

1. **Real-time Ad Serving**: <100ms response time
2. **Auction System**: First-price or second-price auctions
3. **Quality Scoring**: CTR, relevance, and landing page quality
4. **Frequency Capping**: Prevent ad fatigue
5. **Contextual Targeting**: Match ads to map context
6. **Geographic Targeting**: Location-based ad delivery
7. **Device Targeting**: Mobile, desktop, tablet
8. **Day Parting**: Schedule ads by time of day
9. **Performance Analytics**: Comprehensive reporting
10. **Payment Automation**: Automatic payouts

## Next Steps

1. Run Prisma migration:
```bash
pnpm prisma migrate dev --name add_advertising_system
pnpm prisma generate
```

2. Set up environment variables (see Configuration section)

3. Create default publisher account for MapAble platform

4. Test ad serving with sample campaigns

5. Integrate payment processing (Stripe, PayPal, etc.)

6. Set up scheduled jobs for:
   - Publisher payout processing
   - Campaign budget monitoring
   - Performance reporting

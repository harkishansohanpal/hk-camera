# HK Camera — Go-to-Market & Lead Generation Strategy

## Table of Contents
1. [Product Positioning](#1-product-positioning)
2. [ICP Definition & Segmentation](#2-icp-definition--segmentation)
3. [Core Narrative & Messaging](#3-core-narrative--messaging)
4. [Phase 1 — Launch (Weeks 1–4)](#4-phase-1--launch-weeks-1-4)
5. [Phase 2 — Growth (Months 2–3)](#5-phase-2--growth-months-2-3)
6. [Phase 3 — Scale (Months 4–6)](#6-phase-3--scale-months-4-6)
7. [Channel Playbooks](#7-channel-playbooks)
8. [Content Engine](#8-content-engine)
9. [Conversion Funnel](#9-conversion-funnel)
10. [Metrics & OKRs](#10-metrics--okrs)
11. [Budget Allocation](#11-budget-allocation)
12. [Tools Stack](#12-tools-stack)

---

## 1. Product Positioning

### One-Liner
> Open-source remote camera monitoring. WebRTC streaming, ML detection, cloud recording — for a fraction of the cost of Ring or commercial NVRs.

### Positioning Matrix

| Competitor | Monthly Cost | ML Detection | Self-Host Option | Open Source |
|---|---|---|---|---|
| **Ring** | $10–20/mo | No (pixel-diff only) | No | No |
| **SimpliSafe** | $25–30/mo | No | No | No |
| **Unifi Protect** | $0 (hardware $500+) | Yes (gated) | Partial | No |
| **Frigate** | $0 (self-host) | Yes (Google Coral) | Yes | Yes |
| **HK Camera** | **$3–5/mo** | **Yes (YOLO11m)** | **Yes** | **Yes (core)** |

### Core Differentiators
1. **Cost** — Auto-stop on idle (Fly.io) + R2 zero egress = ~$3–5/mo all-in
2. **ML on backend** — YOLO11m (51.5 mAP) runs server-side, no Coral/TPU hardware needed
3. **No vendor lock-in** — Standard RTSP/WebRTC, works with any camera
4. **Multi-viewer** — Multiple people can watch simultaneously
5. **Two-way audio** — Built-in, no extra hardware

---

## 2. ICP Definition & Segmentation

### Segment A — B2B Commercial (High Intent, Higher LTV)

| Role | Pain Point | Annual Value |
|---|---|---|
| **Property Manager** (100+ units) | Paying $200–500/mo for ADT/commercial monitoring for parking lots, laundries, common areas | $2,400–6,000 saved |
| **Construction Site Supervisor** | Need temporary monitoring for 6–18 month builds. Traditional installs are expensive and permanent | $1,200–3,000 saved per project |
| **Warehouse / Logistics Manager** | Multiple cameras, needs intelligent alerts (theft detection), not just recording | $600–2,400 saved |
| **Small Business Owner** (retail, cafe, auto shop) | Wants affordable security without long-term contracts | $300–1,200 saved |
| **Coworking Space Operator** | Shared spaces with 2–4 cameras, needs multi-user access | $400–1,000 saved |

### Segment B — B2C Consumer (Higher Volume, Lower Intent)

| Persona | Pain Point | Monthly Fee Tolerance |
|---|---|---|
| **DIY Homelabber** | Self-hosted enthusiast. Currently runs Frigate/Blue Iris on a server. Wants simpler cloud option | $0–3/mo |
| **Remote Property Owner** (cabin, RV, vacation home, rental property) | Needs to check in remotely. Ring requires wifi + subscription per property | $3–5/mo |
| **Pet / Nanny Cam User** | Wants to check in on pets or kids. Doesn't want Chinese cloud services | $2–5/mo |
| **Privacy-Conscious Homeowner** | Doesn't trust Ring/Google with their footage. Wants encryption + optional self-host | $3–5/mo |
| **RV / Boat Owner** | Needs battery-friendly camera monitoring when parked/moored | $3–5/mo |

### Segment C — Developer / OEM (Long Tail)

| Persona | Use Case |
|---|---|
| **OSS Contributor** | Wants to self-host, contribute features, fork for custom needs |
| **System Integrator** | Installing cameras for 20+ clients, wants white-label or API-first solution |
| **MSP** (Managed Service Provider) | Offers camera monitoring as a value-add service to existing clients |

---

## 3. Core Narrative & Messaging

### The Hook (for every channel)
> "Ring charges $20/month per camera. I built an open-source alternative that costs $3/month — with ML object detection, WebRTC streaming, and no vendor lock-in."

### Taglines by Channel

| Channel | Tagline |
|---|---|
| Product Hunt | "Open-source camera monitoring that costs 90% less than Ring" |
| Hacker News | "Show HN: I built a Ring alternative that runs on $3/month of cloud infra" |
| Reddit r/selfhosted | "Frigate alternative with zero hardware requirements — backend ML, no Coral needed" |
| LinkedIn (B2B) | "Cut your commercial camera monitoring costs by 80% without sacrificing intelligence" |
| Landing Page | "Professional camera monitoring. No hardware. No contract. $3/month." |
| YouTube | "I replaced my $240/year Ring subscription with a $36/year self-hosted alternative" |

### Value Props by Segment

**B2B:**
- "Deploy camera monitoring for any site in 5 minutes — no truck roll, no installer needed"
- "Pay only when you're watching. Auto-pause billing when sites are idle."
- "ML detection that actually works. YOLO11m identifies people, vehicles, animals — not just pixel changes."

**B2C:**
- "Your footage, your rules. Encrypted. No Chinese cloud. No monthly commitment."
- "Check your cabin, RV, or rental property from anywhere. Works on cellular."
- "Pet mode, nanny mode, property watch — one app for all your cameras."

---

## 4. Phase 1 — Launch (Weeks 1–4)

**Goal:** First 500 signups. Validate messaging. Establish community.

### Week 1 — Foundation

| Action | Details | Cost |
|---|---|---|
| **Landing page optimization** | A/B test headline: "Ring alternative" vs "Open source NVR" vs "$3 camera monitoring" | Free |
| **Product Hunt pre-launch** | Create teaser page. Recruit 10–15 backers from network. Prepare Launch checklist | Free |
| **Hacker News Draft** | Write "Show HN" post with demo video, GitHub link, cost breakdown | Free |
| **GitHub repo polish** | README with screenshots, one-click deploy button (Deploy to Fly.io), architecture diagram | Free |
| **Pricing page** | Free tier (1 camera, 7-day retention) → Pro $5/mo → Business $20/mo | Free |

**Launch assets to create:**
- 90-second demo video (screen recording + voiceover)
- Side-by-side cost comparison chart (Ring vs HK)
- 3 case studies (you testing with your own setup)
- Architecture diagram (Phone App → WebRTC → Fly.io → R2)

### Week 2 — Launch Day

| Action | Details | Expected Traffic |
|---|---|---|
| **Product Hunt launch** | Post at 12:01 AM PT. Have team upvote in first hour. Engage every comment | 5,000–15,000 visits |
| **Hacker News post** | Submit "Show HN" 2 hours after PH launch. Monitor for flagging | 10,000–50,000 visits |
| **Reddit** | Post to r/selfhosted, r/homesecurity, r/webdev, r/opensource | 5,000–20,000 visits |
| **Twitter/X thread** | 6-tweet thread with screenshots, cost breakdown, link | 2,000–10,000 impressions |
| **Indie Hackers** | "I built a Ring alternative" launch post | 500–2,000 visits |

**Day-of checklist:**
- Monitor server scaling (expect 10x traffic)
- Have 2 support people in Discord/chat ready
- Track signup source attribution
- Fix critical bugs immediately
- Post launch on LinkedIn with B2B angle

### Week 3 — Ride the Wave

| Action | Details |
|---|---|
| **Follow-up blog post** | "What I learned launching my Ring alternative" — metrics, stories, lessons |
| **Email sequence** to signups | D1: Welcome + getting started video. D3: Advanced features (ML detection). D7: Pro upgrade offer |
| **Community seeding** | Answer every GitHub Issue. Post in r/selfhosted "Updates since launch". Start Discord discussions |
| **Early adopter interviews** | DM 10 signups. Ask: "What made you sign up? What's missing?" Record calls. Extract testimonials. |

### Week 4 — Iterate

| Action | Details |
|---|---|
| **Analyze launch data** | Which channel drove highest-quality signups? What's the conversion rate from visit → signup → first camera added? |
| **Fix top 3 friction points** | From user interviews, fix the biggest onboarding blockers |
| **Publish first testimonials** | "HK Camera saved my construction site $2,400/year" — case study with real user |
| **Set up analytics infrastructure** | PostHog (free tier) for product analytics. Plausible for simple page analytics |

**Phase 1 target:**
- 500 registered users
- 100 active cameras (at least 1 camera connected)
- 10 paying customers (Pro tier)
- 5 unsolicited testimonials
- $1,000 ARR

---

## 5. Phase 2 — Growth (Months 2–3)

**Goal:** 2,000 registered users. $5,000 ARR. Repeatable B2B channel.

### Content Engine

| Type | Frequency | Topic Examples |
|---|---|---|
| **Blog posts** | 2x/week | "How to monitor a construction site for $3/month", "RTSP vs ONVIF vs WebRTC — what actually matters", "YOLO11m vs Pixel-diff: real-world detection comparison" |
| **YouTube videos** | 1x/week | "Complete HK Camera setup guide", "I installed cameras at my rental property — cost breakdown", "Ring vs HK Camera: 30-day real-world test" |
| **Reddit comments** | Daily | Answer questions in r/homesecurity, r/selfhosted, r/videosurveillance. No pitches — just helpful answers with "I built HK Camera" as a footnote |
| **SEO articles** | 4x/month | "Best self-hosted camera monitoring 2026", "Ring alternatives that respect your privacy", "How much does commercial camera monitoring actually cost?" |

### SEO Strategy (Month 2 → Compounds)

**Target keywords (by priority):**

| Keyword | Intent | Volume | Difficulty |
|---|---|---|---|
| "ring alternative no subscription" | Commercial | 3.2K/mo | Medium |
| "self hosted camera system" | Informational | 2.8K/mo | Low |
| "frigate alternative" | Commercial | 1.5K/mo | Very Low |
| "open source nvr" | Commercial | 2.1K/mo | Medium |
| "commercial camera monitoring cost" | Commercial (B2B) | 900/mo | Low |
| "remote property camera monitoring" | Commercial | 600/mo | Low |
| "construction site security cameras" | Commercial (B2B) | 1.8K/mo | Medium |
| "warehouse security camera system" | Commercial (B2B) | 1.2K/mo | Medium |

**Technical SEO:**
- Submit sitemap to Google Search Console
- Add FAQ schema to landing page
- Generate backlinks from GitHub projects, open-source directories
- Create "alternatives to [product]" pages (Ring, SimpliSafe, Unifi, Frigate)

### B2B Outbound (Month 2 → Ongoing)

**Target industries (in order):**
1. Construction (temporary site monitoring)
2. Property management (apartment complexes)
3. Warehousing & logistics
4. Coworking spaces
5. Auto dealerships

**Outbound sequence (LinkedIn + Email):**

```
Step 1 — LinkedIn Connection Request (Day 1)
"Hi [Name], I came across [Company] — seems like you manage multiple [sites/properties]. I built a camera monitoring platform that costs 80% less than traditional options. Would love to connect."

Step 2 — Value Email (Day 3)
Subject: Cutting your camera monitoring costs by 80%
Body: Brief intro + 3-bullet value prop + case study link + "Want a 15-min demo?"

Step 3 — LinkedIn Follow-up (Day 7)
"Hey [Name], following up on my email. Happy to jump on a quick call to show you how it works. No commitment."

Step 4 — Breakup (Day 14)
"Last message — I'll assume now isn't the right time. If things change, here's the link to try it free: [link]. No credit card needed."
```

**Tools:** Apollo.io (free tier: 200 emails/mo) + LinkedIn Sales Navigator (free trial)

### Community Building

| Platform | Strategy |
|---|---|
| **Discord** | Product support, feature requests, beta testing. Target: 200 members by Month 3 |
| **GitHub** | Respond to issues within 4 hours. Merge community PRs quickly. Add CONTRIBUTING.md with good first issues |
| **Reddit** | r/selfhosted weekly update posts. r/homesecurity expert answers |
| **Twitter** | Build-in-public thread: weekly metrics, lessons learned, new features |

**Phase 2 target:**
- 2,000 registered users
- 500 active cameras
- 50 paying customers
- $5,000 ARR
- 10 B2B demos booked
- 2 B2B deals closed
- 200 Discord members
- 500 GitHub stars

---

## 6. Phase 3 — Scale (Months 4–6)

**Goal:** 10,000 registered users. $25,000 ARR. Dedicated B2B sales.

### Paid Acquisition

**Google Ads (B2B focus):**

| Campaign | Keywords | Monthly Budget | Expected CPC |
|---|---|---|---|
| Commercial Camera Monitoring | "warehouse camera system", "construction site cameras", "commercial security cameras" | $500/mo | $4–8 |
| Ring Alternative | "ring alternative", "replace ring subscription", "no monthly fee cameras" | $300/mo | $2–5 |
| Self-Hosted NVR | "self hosted nvr", "open source camera system", "raspberry pi nvr" | $200/mo | $1–3 |

**LinkedIn Ads:**
- Target: Job titles include "Facility Manager", "Property Manager", "Security Director", "Operations Manager"
- Industries: Construction, Real Estate, Warehousing, Retail
- Ad format: Sponsored Content (case study PDF download)
- Budget: $500/mo

**Retargeting:**
- Pixel visitors who hit pricing page but didn't convert
- Ad: "Still comparing? Here's $10 off your first 3 months"
- Budget: $200/mo

### B2B Sales Playbook

**Hire first sales hire (Month 4)** or commission-based BDM.

**Lead scoring model:**
| Signal | Score |
|---|---|
| Visited pricing page | +10 |
| Signed up for free tier | +15 |
| Added 2+ cameras | +20 |
| Company email domain | +25 |
| Viewed case study | +15 |
| >25 score → BDR outreach | Threshold |

**Demo script structure:**
1. Discovery (5 min): Number of cameras? Current solution? Pain points? Budget?
2. Product walkthrough (10 min): Focus on their specific use case (construction? warehouse? rental?)
3. ROI calculation (5 min): "You're paying $X now. Here's what you'd pay with HK Camera."
4. Objection handling (5 min): "What about reliability? Hardware? Installation?"
5. Close (5 min): "Let's set up your first 3 cameras free for 30 days."

### Partnerships

| Partner Type | Deal Structure |
|---|---|
| **Camera resellers** (Amcrest, Reolink, Hikvision distributors) | Rev share 15–20% for every customer they refer who subscribes |
| **MSPs / IT consultants** | White-label option. Flat $1/camera/mo license fee. They resell for $5–10/camera/mo |
| **Real estate agents** | Referral fee: $50 per closed lead. They recommend HK Camera to rental property clients |
| **RV/boat dealers** | Bundle: "Free 30-day HK Camera subscription with every RV purchase" — $5 CPA |

### Viral Loops

| Loop | Trigger | Mechanism |
|---|---|---|
| **Share your camera** | User adds a camera | "Share this live view with your team → they get 30 days free" |
| **Recording share** | User shares a recording | "Your friend viewed a recording. They signed up." |
| **Multi-camera referral** | User has 2+ cameras | "Invite your property manager → you both get 1 month free" |

**Phase 3 target:**
- 10,000 registered users
- 2,500 active cameras
- 300 paying customers
- $25,000 ARR (run rate)
- 20 B2B accounts
- 3 integration partners
- 2,000 Discord members
- 2,000 GitHub stars

---

## 7. Channel Playbooks

### Reddit Playbook

| Subreddit | Post Type | Frequency | Best Time |
|---|---|---|---|
| r/selfhosted | "I built X" project posts, update posts, comparison posts | 1x/month | Tuesday 10am ET |
| r/homesecurity | Answer questions, link to guide, mention HK Camera naturally | 3x/week | Weekdays |
| r/videosurveillance | Technical deep-dives (WebRTC vs RTMP, etc.) | 1x/2 weeks | Anytime |
| r/startups | "My $3 camera monitoring app hit $1K MRR" | 1x/month | Anytime |

**Reddit Rules:**
- 90% genuine value, 10% self-promotion
- Never link directly to landing page in post body — use text posts with link in comment
- Never post from a brand-new account
- Always engage with every comment within 1 hour

### Product Hunt Playbook

**Launch checklist:**
- 2 weeks before: Build hunter relationship (DM 5 top hunters on Twitter)
- 1 week before: Email 50 friends/colleagues to follow on PH
- Day before: Post teaser on Twitter with PH link
- Launch day 12:01 AM PT: Post product
- First hour: Reply to EVERY comment within 5 minutes
- Morning: Share in all communities
- Evening: Thank-you post with lessons learned

### YouTube Playbook

**Video formats (alternate weekly):**
1. Tutorial (How to set up HK Camera)
2. Comparison (HK vs Ring vs Frigate — real tests)
3. Use case (I secured my construction site for $3/month)
4. Build-in-public (Metrics, revenue, lessons)

**SEO for YouTube:**
- Title includes target keyword + "2026"
- Description: 200+ words with links
- Chapters in video description
- End screen with subscribe + related video

---

## 8. Content Engine

### Editorial Calendar Template (First 30 Days)

| Day | Channel | Content Type | Topic |
|---|---|---|---|
| D1 | Blog | Launch post | Introducing HK Camera |
| D3 | YouTube | Tutorial | Complete setup guide |
| D5 | Reddit | Text post | "I built a Ring alternative — here's the cost breakdown" |
| D7 | Blog | Technical | How WebRTC + ML detection works under the hood |
| D9 | YouTube | Comparison | Ring vs HK Camera: 30 days side-by-side |
| D11 | Blog | Use case | How a property manager saved $2,400/year |
| D13 | LinkedIn | Article | The real cost of commercial camera monitoring |
| D15 | Blog | Technical | YOLO11m on Fly.io: running ML inference for pennies |
| D17 | YouTube | Tutorial | Setting up remote property monitoring |
| D19 | Blog | Comparison | Frigate vs HK Camera: which should you choose? |
| D21 | Reddit | Update post | "30 days since launch — here are the results" |
| D23 | Blog | Use case | Construction site security for $3/month |
| D25 | YouTube | Build in public | Month 1 metrics and lessons learned |
| D27 | Blog | Technical | R2 vs S3 vs local storage — cost comparison |
| D29 | LinkedIn | Article | Why your business is overpaying for camera monitoring |
| D30 | Blog | Milestone | Month 1 recap: 500 users, 100 cameras, $1K ARR |

### Repurposing Pipeline

```
Blog Post
  → YouTube script (read blog, add demo)
  → Twitter thread (6 tweets from key points)
  → LinkedIn post (different angle)
  → Reddit post (ask for feedback)
  → Newsletter (weekly roundup)
```

---

## 9. Conversion Funnel

### Funnel Stages

| Stage | Metric | Target Rate | Current (if known) |
|---|---|---|---|
| Visit | Unique visitors | — | — |
| Signup | Click "Get Started" → create account | 5–8% | — |
| Activation | Add first camera + see live stream | 40–50% of signups | — |
| Engagement | Open app 3+ times/week | 60% of activated | — |
| Conversion | Free → Pro upgrade | 5–10% of engaged | — |
| Retention | Still active after 90 days | 80% of paid | — |
| Referral | Invite another user | 10% of paid | — |

### Pricing Tiers

| Tier | Price | Cameras | Retention | ML Detection | Support |
|---|---|---|---|---|---|
| Free | $0 | 1 | 7 days | No | Community |
| Pro | $5/mo | 3 | 30 days | Yes | Email |
| Business | $20/mo | 10 | 90 days | Yes | Priority |
| Enterprise | Custom | Unlimited | Custom | Yes | Dedicated |

### Onboarding Flow (Optimized for Conversion)

```
Step 1: Sign up (email + password — 15 seconds)
Step 2: "Add your first camera" wizard
  → Enter camera name
  → Connect via RTSP URL or stream key
  → Show live stream immediately
Step 3: "Want to get alerts?" → Enable motion detection
Step 4: "Invite someone else to watch?" → Share stream link
Step 5: Upgrade prompt (appears after 3rd session)
```

**Critical onboarding metrics:**
- Time from signup to first live stream: target < 3 minutes
- Drop-off points: RTSP URL entry (provide how-to guide), NAT/firewall issues (provide test tool)

---

## 10. Metrics & OKRs

### North Star Metric
**Active Camera Days** — Total number of camera-days with at least 1 minute of streaming per day.

### OKRs — First 6 Months

**Objective 1: Validate product-market fit**
- KR1: 500 active cameras (streaming > 1hr/week)
- KR2: 80% of users who add a camera are still active after 30 days
- KR3: NPS > 40 (survey at 30-day mark)

**Objective 2: Build sustainable revenue**
- KR1: $25,000 ARR
- KR2: 300 paying subscribers
- KR3: Average revenue per paying user (ARPU) > $7/mo

**Objective 3: Establish B2B channel**
- KR1: 10 B2B accounts signed
- KR2: Average B2B deal size > $500/year
- KR3: 3 integration/partnership deals signed

### Dashboard (Track Weekly)

| Metric | Where to Track |
|---|---|
| New signups (daily) | PostHog |
| Active cameras (daily) | PostgreSQL query |
| Paid conversions (weekly) | Stripe |
| Churn rate (monthly) | Stripe |
| CAC by channel (monthly) | Spreadsheet |
| LTV (monthly) | Spreadsheet |
| NPS (monthly) | SurveyMonkey |
| Page views (weekly) | Plausible |
| Signup → activation rate (weekly) | PostHog funnel |

---

## 11. Budget Allocation (First 6 Months)

### Lean ($0–500/mo self-funded)

| Item | Monthly Cost |
|---|---|
| Infrastructure (Fly.io + R2 + DB) | $5–15 |
| Google Workspace (custom domain email) | $6 |
| Apollo.io (email outreach) | $0 (free tier) |
| LinkedIn Sales Navigator | $0 (free trial) |
| PostHog (product analytics) | $0 (free tier) |
| Plausible (page analytics) | $0 (free tier) |
| Discord | $0 |
| GitHub | $0 |
| **Total** | **$11–21/mo** |

### Growth Mode ($2,000/mo — requires revenue or small raise)

| Item | Monthly Cost |
|---|---|
| Infrastructure | $30–50 |
| Google Ads (B2B keywords) | $500 |
| LinkedIn Ads | $500 |
| Retargeting | $200 |
| Content writer (freelance, 2x/week) | $500 |
| Apollo.io (premium) | $49 |
| YouTube equipment (one-time) | $200 |
| **Total** | **~$1,800/mo + one-time** |

### Scaling ($5,000/mo — requires $5K+ MRR)

| Item | Monthly Cost |
|---|---|
| Infrastructure | $100–200 |
| Paid ads (Google + LinkedIn + retargeting) | $2,000 |
| Content agency or full-time writer | $1,500 |
| BDR / sales commission (commission-only) | $1,000 (base) + 10% of closed deals |
| Tools (Apollo, SalesNav, PostHog paid) | $150 |
| Community manager (part-time) | $500 |
| **Total** | **~$5,250/mo** |

---

## 12. Tools Stack

### Marketing & Analytics

| Tool | Purpose | Cost |
|---|---|---|
| **Plausible** | Simple page analytics, privacy-first | Free tier |
| **PostHog** | Product analytics, funnel tracking, session replays | Free tier (1M events/mo) |
| **Hotjar** | Heatmaps, user recordings (watch onboarding struggles) | Free tier |
| **Google Search Console** | SEO monitoring, keyword tracking | Free |

### Content & SEO

| Tool | Purpose | Cost |
|---|---|---|
| **Ahrefs** or **Ubersuggest** | Keyword research, competitor analysis | $29/mo or free |
| **Canva** | Social media graphics, thumbnails | Free |
| **OBS Studio** | Screen recording for YouTube | Free |
| **CapCut** or **DaVinci Resolve** | Video editing | Free |

### Outreach & CRM

| Tool | Purpose | Cost |
|---|---|---|
| **Apollo.io** | B2B contact discovery, email sequences | Free tier (200 emails/mo) |
| **LinkedIn Sales Navigator** | Precision targeting for B2B | Free trial, $80/mo after |
| **HubSpot CRM** (free tier) | Pipeline tracking, deal stages | Free |
| **Calendly** | Demo booking | Free tier |

### Community & Support

| Tool | Purpose | Cost |
|---|---|---|
| **Discord** | Community, support, announcements | Free |
| **GitHub Discussions** | Feature requests, Q&A | Free |
| **Intercom** or **Crisp** | In-app chat support | Free tier |
| **ConvertKit** or **Buttondown** | Email newsletter | Free tier |

### Automation

| Tool | Purpose | Cost |
|---|---|---|
| **Zapier** (free tier) | Connect form fills → CRM → email sequences | Free (100 tasks/mo) |
| **Make** (free tier) | More complex automation flows | Free (1,000 ops/mo) |
| **n8n** (self-host) | Advanced automation, no monthly fee | Free (self-hosted on Fly.io) |

---

## Appendix

### A. Launch Day Email Templates

**Welcome Email:**
```
Subject: Your camera is 3 minutes away from streaming

Hi [Name],

You just joined 500+ people who are done paying $20/month for camera monitoring.

Here's how to set up your first camera in 3 minutes:

1. [Link: Download the app]
2. [Link: How to find your camera's RTSP URL]
3. [Link: Connect and watch live]

Need help? Join our Discord: [link]

— [Founder Name]
```

**Day 7 Upgrade Email:**
```
Subject: You've been watching for a week. Ready for ML detection?

Hi [Name],

You've been using HK Camera for a week now — hope you're enjoying it.

Here's what you're missing on the Pro plan ($5/mo):

• 🧠 YOLO ML detection (identifies people, cars, animals — not just motion)
• 📹 30-day cloud recording
• 📱 3 cameras instead of 1
• 🔔 Smart alerts (person detected, not "something moved")

First 100 Pro users get 50% off their first month: [link]

— [Founder Name]
```

### B. Competitor Battle Cards

**vs Ring:**
- Cost: $3/mo vs $20/mo
- ML: Yes vs No
- Hardware: Your existing cameras vs Ring's locked hardware
- Privacy: Encrypted, no data mining vs Amazon-owned

**vs Frigate:**
- No hardware needed (no Coral TPU required)
- Managed cloud (no server maintenance)
- Multi-user built-in
- Two-way audio

**vs Unifi Protect:**
- No $500+ hardware gateway required
- Works with any RTSP camera (not locked to Unifi ecosystem)
- Lower total cost

### C. First 10 Customer Interview Questions

1. What made you sign up for HK Camera?
2. What were you using before? What was wrong with it?
3. How long from signup to seeing your first live stream?
4. What almost made you NOT sign up?
5. What feature surprised you the most?
6. What's missing that would make this a 10/10 for you?
7. Have you recommended it to anyone? Why or why not?
8. If you could change one thing about the setup process, what?
9. How much were you paying before? How much are you saving?
10. Would you be upset if HK Camera shut down tomorrow? Why?

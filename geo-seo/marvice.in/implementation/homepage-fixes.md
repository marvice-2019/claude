# Homepage (/) fixes

The homepage has **no H1**, no meta description, no Open Graph tags, no schema, 67 of 69 images without alt text, typos in the hero area, and no city anywhere on the page. Search engines and AI models can't tell what Marvice is or where it operates.

## 1. Add one H1 (Elementor → first hero heading → HTML tag: H1)

> **Digital Marketing, SEO & AI Search Agency in Bengaluru**

Keep the slider headlines ("We Provide a Digital Solutions" and so on) as H2 or as a styled `div`. Right now all three are H2 with the same grammar error.

## 2. Fix the copy errors

| Current | Replace with |
|---|---|
| We Provide a Digital Solutions | We Provide Digital Solutions |
| We Provide a Branding Solutions | We Provide Branding Solutions |
| We Provide a Software Solutions | We Provide Software Solutions |
| We Can Save Your Money · Promiss · Specific Timelinel Guarantee | Transparent pricing · On-time delivery, guaranteed |
| A innovative Brands | Our Brands |
| Marvice Media Pvt Ltd is a leading group of four sector of brands | Marvice Media is a Bengaluru digital agency running three specialist brands |
| Lorem ipsum … (2 blocks) | Remove, or replace with real client testimonials (name, company, photo) |

The homepage says "four sector of brands" but lists three. Pick one number (three: Onscreens, Worxforu, Conxyou) and use it everywhere.

## 3. Add a citable "who we are" block (plain text, above the fold or directly under the hero)

> **Marvice Media** is a digital growth agency in Koramangala, Bengaluru, founded in 2017. We help businesses get found on Google and in AI assistants like ChatGPT and Gemini, win customers and scale operations through three brands: **Onscreens** (branding, digital marketing, SEO and generative engine optimization, websites and apps), **Worxforu** (business automation, custom software and AI development) and **Conxyou** (events, PR, corporate gifting and photography). We work with clients across India and the UK.

AI models quote exactly this kind of self-contained, fact-dense paragraph.

## 4. Image alt text

Give every meaningful image an alt describing it, e.g. `Marvice Media team at the Koramangala office` or `Corporate event staged by Conxyou, Bengaluru`. Mark decorative shapes as empty alt (`alt=""`). The logo needs `alt="Marvice Media logo"`.

## 5. NAP in the footer (every page)

```
Marvice Media Pvt Ltd
No.38, 3rd Floor, Green Leaf Extension, 3rd Cross, 80 Feet Rd,
4th Block, Koramangala, Bengaluru, Karnataka 560034
+91 80562 91930 · info@marvice.in
```

This must match the Contact page, Google Business Profile and every directory character for character. The Contact page currently shows **17, Purasawalkam High Rd, Chennai 600007**, which conflicts with the Bengaluru address.

## 6. Open Graph (Rank Math sets this automatically once installed)

og:title / og:description from `meta-tags.csv`, og:image = a 1200×630 branded image (not the logo on transparency).

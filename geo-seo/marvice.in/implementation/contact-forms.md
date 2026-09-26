# Contact Form 7 — paste into wp-admin (Contact → Contact Forms)

The CF7 REST API on marvice.in accepts updates but does not persist them, so apply these in the CF7 editor.
**Email will still not arrive until SMTP is set up** (see bottom) — marvice.in mail is on Microsoft 365 (SPF `-all`), so the Hostinger server cannot send as @marvice.in; test submission returned `mail_failed`.

## 1. "Main Contact Form" (used on Contact Us, service pages, GEO page)

### Form tab
```
<div class="contact-page-form">
<div class="job-apply-page-form contact-form-wrap">
<div class="contact-form">
    <div class="contact-form-input">[text* first-name akismet:author class:input-box autocomplete:given-name placeholder "First Name *"]</div>
    <div class="contact-form-input">[text* last-name class:input-box autocomplete:family-name placeholder "Last Name *"]</div>
    <div class="contact-form-input">[email* your-email akismet:author_email class:input-box autocomplete:email placeholder "Email Address *"]</div>
    <div class="contact-form-input">[tel* your-phone class:input-box autocomplete:tel placeholder "Phone / WhatsApp *"]</div>
    <div class="contact-form-input">[text company class:input-box autocomplete:organization placeholder "Company / Business Name"]</div>
    <div class="contact-form-input">[text your-city class:input-box placeholder "City"]</div>
    <div class="contact-form-input">[select* service class:input-box first_as_label "Service You Need *" "Branding & Consultancy" "Digital Marketing & SEO" "Generative Engine Optimization (GEO)" "Social Media Marketing" "Ad Films & Corporate Video" "Website Design & Development" "Mobile App Development" "Business Process Automation" "Custom Software / CRM / ERP" "AI Development & Chatbots" "Learning Management System (LMS)" "Event Management" "Corporate Gifting & Packaging" "Public Relations" "Photography" "Other"]</div>
    <div class="contact-form-input">[select budget class:input-box first_as_label "Approx. Budget" "Under ₹50,000" "₹50,000 – ₹2 Lakh" "₹2 – 5 Lakh" "₹5 – 10 Lakh" "Above ₹10 Lakh" "Not sure yet"]</div>
    <div class="contact-form-input">[select office class:input-box first_as_label "Preferred Office" "Bengaluru (Koramangala)" "Chennai (Nungambakkam)" "Online / Anywhere"]</div>
    <div class="contact-form-input">[select timeline class:input-box first_as_label "When do you want to start?" "Immediately" "Within 1 month" "1 – 3 months" "Just exploring"]</div>
    <div class="contact-form-input has-full-width">[textarea* your-message placeholder "Tell us about your project or requirement *"]</div>
    <div class="contact-form-input has-full-width">[acceptance consent] I agree to be contacted by Marvice Media about my enquiry, as per the Privacy Policy. [/acceptance]</div>
    <div class="contact-form-input has-full-width "><button class="gly-pr-btn-1" type="submit" aria-label="Send enquiry"><span class="text">Send Enquiry</span></button></div>
</div>
</div>
</div>
```

### Mail tab
- **To:** `yuvarajgs@marvice.in`
- **From:** `Marvice Media Website <info@marvice.in>` (replaces the stranger's `wabidullahsharif@gmail.com`)
- **Subject:** `New enquiry: [service] – [first-name] [last-name]`
- **Additional headers:** `Reply-To: [first-name] [last-name] <[your-email]>`
- **Message body:**
```
New enquiry from marvice.in

Name: [first-name] [last-name]
Email: [your-email]
Phone / WhatsApp: [your-phone]
Company: [company]
City: [your-city]

Service: [service]
Budget: [budget]
Preferred office: [office]
Start: [timeline]

Message:
[your-message]

--
Page: [_url]
Submitted: [_date] [_time]
```
- Tick **Exclude lines with blank mail-tags**. Leave **Mail (2)** off (an auto-reply without CAPTCHA can be abused for spam).

## 2. "Footer Newsletter"

### Form tab
```
[email* email-592 class:gly-form-1-input autocomplete:email placeholder "Email Address"]<button class="gly-form-1-button" aria-label="Subscribe" type="submit">subscribe</button>
```
### Mail tab
- **To:** `yuvarajgs@marvice.in` · **From:** `Marvice Media Website <info@marvice.in>`
- **Subject:** `New newsletter subscriber: [email-592]` · **Additional headers:** `Reply-To: [email-592]`
- **Body:** `New newsletter subscriber on marvice.in  Email: [email-592]  Page: [_url]`

## 3. Make email actually send (required)

Install **FluentSMTP** (free) → Settings → choose one:
- **Microsoft 365 / Outlook** with `info@marvice.in` (best — matches your SPF). Needs SMTP AUTH enabled for that mailbox in Microsoft 365 admin, or use FluentSMTP's Outlook OAuth connection.
- **Gmail** with `yuvarajgs@marvice.in` + a Google App Password (quickest; From becomes the Gmail address).

Then FluentSMTP → Email Test → send to yuvarajgs@marvice.in, and submit the website form once.
Also add a DMARC record at your DNS: `_dmarc.marvice.in TXT "v=DMARC1; p=none; rua=mailto:yuvarajgs@marvice.in"`.

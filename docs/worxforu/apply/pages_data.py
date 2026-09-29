"""Products (case-study CPT), Services hub, About, Contact and enquiry form content for worxforu.com."""

PRICING = ('Pricing depends on modules, users, customisation, integrations and deployment requirements. '
           'Share your requirements for a scoped proposal.')

# (post_id or None, slug, title, availability, for_whom, excerpt, overview, modules, image_id, cta)
PRODUCTS = [
 (2442, 'crm-solution', 'CRM Solution', 'Implementation service', 'Sales and service teams',
  'Leads, deals, quotations and follow-ups in one place.',
  'A CRM configured around your sales stages, with the follow-ups, quotations and reports your team needs. Built for teams that track leads in spreadsheets, inboxes or disconnected tools.',
  'Leads, contacts, deals, tasks, quotations and reports. Optional: website-form capture, email integration, automation rules and support tickets. Existing contacts and open deals can be imported with deduplication.',
  1541, 'Discuss Your CRM'),
 (2441, 'erp-solution', 'ERP Solution', 'Implementation service', 'Operations, purchasing and finance teams',
  'Inventory, purchasing, orders and approvals, connected.',
  'An ERP scoped to the operational modules you need first, connected to your customer and finance processes.',
  'Inventory, purchasing, orders, suppliers and approvals, with operational dashboards and role-based access. Accounting, payroll and tax functions need separately confirmed scope.',
  1540, 'Plan Your ERP'),
 (2440, 'ai-business-assistant', 'AI Business Assistant', 'Implementation service', 'Teams answering repeated questions',
  'Answers grounded in your approved documents.',
  'An assistant that searches your approved knowledge, cites its sources and hands over to a person when needed. AI outputs can contain errors, so review and feedback are built in.',
  'Approved knowledge search, source citations, human handoff and feedback capture, with access rules and monitoring.',
  1539, 'Explore an AI Assistant'),
 (2439, 'workflow-automation', 'Workflow Automation', 'Implementation service', 'Teams with repetitive handoffs',
  'Triggers, approvals and logs across your tools.',
  'Automations that move information between your tools, keep people in control of approvals and make exceptions visible.',
  'Triggers, integrations, approvals, logs and exception handling, with duplicate protection and retry rules.',
  1538, 'Review My Workflow'),
 (None, 'lms-solution', 'LMS Solution', 'Implementation / custom build', 'Training teams and educators',
  'Courses, enrolment, assessments and progress reports.',
  'A learning platform for delivering courses and tracking learner progress, implemented around your content and users.',
  'Courses, enrolment, assessments and progress reports, with role-based administration. Video hosting, content migration and certification are confirmed per project.',
  1537, 'Discuss Your LMS'),
 (None, 'hr-attendance-solution', 'HR and Attendance Solution', 'Custom-build solution', 'HR and operations teams',
  'Employee records, leave, attendance and onboarding.',
  'A custom-built HR workspace that keeps employee records, leave and attendance in one place.',
  'Employee records, leave management, attendance and onboarding. Payroll integration is scoped separately.',
  1536, 'Discuss HR Requirements'),
 (None, 'project-task-solution', 'Project and Task Solution', 'Custom-build solution', 'Project and delivery teams',
  'Projects, tasks, milestones, time and status reports.',
  'A custom-built project workspace shaped around how your teams plan and deliver work.',
  'Projects, tasks, milestones, time tracking and status reports.',
  1535, 'Discuss Project Operations'),
 (None, 'helpdesk-solution', 'Helpdesk Solution', 'Custom-build solution', 'Customer support teams',
  'Tickets, assignment, priorities and a knowledge base.',
  'A custom-built helpdesk that routes customer requests to the right person and keeps answers consistent.',
  'Tickets, assignment, priorities and a knowledge base, with optional AI-assisted replies.',
  1534, 'Plan Customer Support'),
 (None, 'analytics-dashboard', 'Analytics Dashboard', 'Implementation service', 'Owners and managers',
  'Defined KPIs, source connectors, filters and exports.',
  'Dashboards built around the business measures you actually manage, pulling from the systems you already use.',
  'Defined KPIs, source connectors, filters and exports, with data-quality checks and role-based access.',
  1533, 'Discuss Reporting'),
]

INDUSTRIES = ('Hospitality and F&amp;B · Retail and ecommerce · Distribution and logistics · Manufacturing · '
              'Education and training · Healthcare and clinics · Real estate and construction · Professional services · '
              'Travel and tourism · Media and entertainment · Startups and SaaS · Non-profits')

CF7_FORM = '''<div class="row">
<div class="col-lg-6 col-md-6">[text* your-name placeholder "Full name"]</div>
<div class="col-lg-6 col-md-6">[email* your-email placeholder "Work email"]</div>
<div class="col-lg-6 col-md-6">[text* your-company placeholder "Company"]</div>
<div class="col-lg-6 col-md-6">[tel your-phone placeholder "Phone (optional)"]</div>
<div class="col-lg-12">[select* service-interest first_as_label "Service interest" "AI Solutions" "ERP and CRM Software" "Business Automation" "Custom Software Development" "Website and Mobile Development" "Web Portals" "Learning Management Systems" "SaaS Implementation" "SEO Services" "Market Research" "Cloud, DevOps and Support" "Technology Consulting" "Not sure yet"]</div>
<div class="col-lg-6 col-md-6">[select budget first_as_label "Budget range (optional)" "Under ₹5 lakh" "₹5–15 lakh" "₹15–50 lakh" "Above ₹50 lakh" "Not decided"]</div>
<div class="col-lg-6 col-md-6">[select timeline first_as_label "Timeline (optional)" "Within 1 month" "1–3 months" "3–6 months" "Exploring"]</div>
<div class="col-lg-12">[textarea* your-message placeholder "What do you want to improve? Current tools, users and goals help us scope it."]</div>
<div class="col-lg-12">[acceptance consent] I agree to Worxforu / Marvice Media contacting me about this enquiry. [/acceptance]</div>
<div class="col-lg-12"><div class="input-filled">[submit "Send Enquiry"]</div></div>
</div>'''

CF7_MAIL = {
    'subject': 'Worxforu enquiry: [service-interest] from [your-company]',
    'sender': 'Worxforu Website <wordpress@worxforu.com>',
    'recipient': 'info@marvice.in',
    'additional_headers': 'Reply-To: [your-email]',
    'body': ('Name: [your-name]\nEmail: [your-email]\nCompany: [your-company]\nPhone: [your-phone]\n'
             'Service: [service-interest]\nBudget: [budget]\nTimeline: [timeline]\n\nMessage:\n[your-message]\n\n'
             '-- \nSent from the enquiry form on worxforu.com ([_url])'),
}
CF7_MESSAGES = {
    'mail_sent_ok': 'Thanks. Your requirements have reached our team. We will reply by email.',
    'mail_sent_ng': 'Your message could not be sent. Please try again, or email info@marvice.in directly.',
}

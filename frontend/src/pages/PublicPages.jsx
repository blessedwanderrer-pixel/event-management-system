import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  Button,
  Card,
  CardBody,
  Typography,
} from '@material-tailwind/react';
import { FadeIn, ZoomHover } from '../components/Motion';
import { usePageMeta } from '../seo';

const WHATSAPP_URL = 'https://wa.me/923172727299';
const WHATSAPP_DISPLAY = '+92 317 2727299';
const EMAIL = 'blessedwanderrer@gmail.com';
const MAILTO = `mailto:${EMAIL}`;
const GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL)}`;

export function ContactActionButtons({ className = '', compact = false }) {
  return (
    <div className={`contact-action-buttons ${compact ? 'compact' : ''} ${className}`.trim()}>
      <ZoomHover>
      <a
        className="button contact-whatsapp"
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat on WhatsApp ${WHATSAPP_DISPLAY}`}
      >
          <img className="contact-icon-img" src="/icons/whatsapp.jpg" alt="" width="20" height="20" />
        WhatsApp
      </a>
      </ZoomHover>
      <ZoomHover>
      <a
        className="button contact-gmail"
        href={GMAIL_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Email via Gmail ${EMAIL}`}
      >
          <img className="contact-icon-img" src="/icons/gmail.jpg" alt="" width="20" height="20" />
        Gmail
      </a>
      </ZoomHover>
    </div>
  );
}

export function AboutPage() {
  usePageMeta(
    'About Us',
    'Learn who Nowshera Events Co. is, what we do, and why this event platform exists.',
  );

  return (
    <main className="page prose-page">
      <div className="page-heading">
        <div>
          <Typography variant="h6" color="orange" className="eyebrow !normal-case !tracking-normal">About us</Typography>
          <Typography variant="h1" color="blue-gray">Built for real gatherings.</Typography>
        </div>
      </div>

      <section className="prose-block">
        <Typography variant="h4" color="blue-gray" className="mb-2">Who we are</Typography>
        <Typography className="font-normal !text-gray-600">
          Nowshera Events Co. is a local event registration and management platform.
          We help organizers publish clear event details and help attendees discover,
          reserve, and manage seats without friction.
        </Typography>
      </section>

      <section className="prose-block">
        <Typography variant="h4" color="blue-gray" className="mb-2">What we do</Typography>
        <Typography className="font-normal !text-gray-600">
          We provide a shared calendar for upcoming events, simple account-based
          registration, and admin tools for creating, publishing, and tracking attendance.
          The focus is operational clarity: dates, capacity, availability, and reliable status updates.
        </Typography>
      </section>

      <div className="mission-grid">
        <FadeIn>
          <Card className="border border-blue-gray-50 shadow-sm">
            <CardBody>
              <Typography variant="h6" color="orange" className="mb-2">Mission</Typography>
              <Typography variant="h4" color="blue-gray" className="mb-2">Make event registration dependable.</Typography>
              <Typography className="font-normal !text-gray-600">
            Give attendees a trustworthy place to find events and reserve seats, while
            giving organizers tools that respect capacity and keep records accurate.
              </Typography>
            </CardBody>
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="border border-blue-gray-50 shadow-sm">
            <CardBody>
              <Typography variant="h6" color="orange" className="mb-2">Vision</Typography>
              <Typography variant="h4" color="blue-gray" className="mb-2">Keep community events easy to join.</Typography>
              <Typography className="font-normal !text-gray-600">
            A calm, professional platform where local gatherings stay discoverable,
            registration stays fair, and everyone knows where they stand.
              </Typography>
            </CardBody>
          </Card>
        </FadeIn>
      </div>

      <section className="prose-block">
        <Typography variant="h4" color="blue-gray" className="mb-2">Why this platform exists</Typography>
        <Typography className="font-normal !text-gray-600">
          Events fall apart when details are scattered and seat counts are unclear.
          This platform exists to keep discovery, registration, and administration in one
          place—so organizers can publish with confidence and attendees can plan with certainty.
        </Typography>
        <div className="actions mt-7">
          <Link to="/events"><Button color="gray">Browse events</Button></Link>
          <Link to="/contact"><Button variant="outlined" color="gray">Contact us</Button></Link>
          <Link to="/ceo"><Button variant="text" color="orange">Meet the CEO</Button></Link>
        </div>
      </section>
    </main>
  );
}

export function CeoPage() {
  usePageMeta(
    'Muhammad Hassaan Khan · CEO',
    'Meet Muhammad Hassaan Khan, CEO of Nowshera Events and Automation Engineer building technology-driven community experiences.',
  );

  const focusAreas = [
    {
      title: 'Automation & Technology',
      text: 'Using modern technology and automation to simplify processes and create smarter digital experiences.',
    },
    {
      title: 'Community Building',
      text: 'Connecting students, professionals, entrepreneurs, creators, and organizations through meaningful events.',
    },
    {
      title: 'Innovation',
      text: 'Encouraging new ideas and creating opportunities for people to showcase what they are building.',
    },
    {
      title: 'Digital Experiences',
      text: 'Bringing a modern, premium digital experience to the way people discover and participate in events.',
    },
  ];

  const ecosystem = [
    'People connect',
    'Ideas are shared',
    'Skills are developed',
    'Businesses grow',
    'Communities become stronger',
  ];

  return (
    <main>
      <section className="hero-mt relative min-h-screen w-full overflow-hidden bg-black">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(255,122,26,0.18),transparent_45%),radial-gradient(ellipse_at_90%_10%,rgba(255,255,255,0.06),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#FF7A1A]/15 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center gap-10 px-6 pb-16 pt-28 md:px-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-12">
          <FadeIn className="max-w-xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#FF7A1A]">
              Nowshera Events
            </p>
            <h1 className="mb-3 text-4xl font-extrabold leading-[0.98] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Muhammad Hassaan Khan
            </h1>
            <p className="mb-5 text-lg font-medium text-white/90 md:text-xl">
              CEO &amp; Automation Engineer
            </p>
            <p className="mb-8 max-w-md text-base leading-relaxed text-white/70 md:text-lg">
              Building technology. Connecting people. Creating opportunities.
            </p>
            <a
              href="#about"
              className="inline-flex items-center gap-2 rounded-full bg-[#FF7A1A] px-7 py-3 text-sm font-bold text-black transition hover:bg-[#ff8d3a]"
            >
              About CEO <span aria-hidden="true">↓</span>
            </a>
          </FadeIn>

          <FadeIn delay={0.12} className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-[#FF7A1A]/40 via-transparent to-white/10 blur-2xl" aria-hidden="true" />
            <img
              src="/images/ceo-muhammad-hassaan-khan.jpg"
              alt="Muhammad Hassaan Khan, CEO of Nowshera Events"
              className="relative z-10 aspect-[4/5] w-full object-cover object-[center_20%] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
            />
          </FadeIn>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 border-b border-blue-gray-50 bg-white px-6 py-20 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[7rem_1fr] lg:gap-14">
          <FadeIn>
            <p className="text-sm font-semibold tracking-[0.2em] text-[#FF7A1A]">01 — About</p>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h2 className="mb-5 text-3xl font-bold tracking-tight text-blue-gray-900 md:text-4xl">
              Short biography
            </h2>
            <p className="max-w-3xl text-base leading-relaxed text-gray-600 md:text-lg">
              Muhammad Hassaan Khan is the CEO of Nowshera Events and an Automation Engineer
              focused on using technology, automation, and modern digital systems to create
              better experiences and more efficient ways of working.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-600 md:text-lg">
              As the driving force behind Nowshera Events, his vision is to create a platform
              where people can discover events, connect with communities, share ideas, and
              build meaningful opportunities.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="border-b border-blue-gray-50 bg-[#0a0a0a] px-6 py-20 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[7rem_1fr] lg:gap-14">
          <FadeIn>
            <p className="text-sm font-semibold tracking-[0.2em] text-[#FF7A1A]">02 — Engineering</p>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h2 className="mb-5 text-3xl font-bold tracking-tight md:text-4xl">
              Engineering meets community
            </h2>
            <p className="max-w-3xl text-base leading-relaxed text-white/75 md:text-lg">
              With a background in automation engineering, Muhammad Hassaan Khan brings a
              technology-first mindset to event management. His approach combines automation,
              digital innovation, and community building to make events more accessible and engaging.
            </p>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/75 md:text-lg">
              At Nowshera Events, the goal isn&apos;t simply to organize events. It&apos;s to build
              a growing ecosystem where:
            </p>
            <ul className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
              {ecosystem.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium text-white/90 md:text-base">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7A1A]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      <section className="border-b border-blue-gray-50 bg-white px-6 py-20 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[7rem_1fr] lg:gap-14">
          <FadeIn>
            <p className="text-sm font-semibold tracking-[0.2em] text-[#FF7A1A]">03 — Vision</p>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h2 className="mb-5 text-3xl font-bold tracking-tight text-blue-gray-900 md:text-4xl">
              The future of Nowshera Events
            </h2>
            <blockquote className="mb-6 max-w-3xl border-l-4 border-[#FF7A1A] pl-5 text-2xl font-semibold leading-snug text-blue-gray-900 md:text-3xl">
              Create a place where every event becomes an opportunity to connect, learn, and grow.
            </blockquote>
            <p className="max-w-3xl text-base leading-relaxed text-gray-600 md:text-lg">
              Muhammad Hassaan Khan envisions Nowshera Events as more than an event-listing
              platform. It is designed to become a digital community hub for Nowshera and beyond,
              bringing together technology, business, creativity, education, and networking.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[7rem_1fr] lg:gap-14">
          <FadeIn>
            <p className="text-sm font-semibold tracking-[0.2em] text-[#FF7A1A]">04 — Mission</p>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-blue-gray-900 md:text-4xl">
              Connect · Learn · Grow
            </h2>
            <p className="mb-10 max-w-3xl text-base leading-relaxed text-gray-600 md:text-lg">
              Areas of focus guiding the work behind Nowshera Events.
            </p>
            <div className="grid gap-8 sm:grid-cols-2">
              {focusAreas.map((area, index) => (
                <FadeIn key={area.title} delay={0.05 * index}>
                  <h3 className="mb-2 text-lg font-bold text-blue-gray-900">{area.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600 md:text-base">{area.text}</p>
                </FadeIn>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap gap-3">
              <Link
                to="/events"
                className="inline-flex items-center gap-2 rounded-full bg-[#FF7A1A] px-7 py-3 text-sm font-bold text-black transition hover:bg-[#ff8d3a]"
              >
                Explore Events <span aria-hidden="true">→</span>
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center rounded-full border border-blue-gray-200 px-6 py-3 text-sm font-semibold text-blue-gray-900 hover:border-blue-gray-400"
              >
                Contact
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}

export function ContactPage() {
  usePageMeta(
    'Contact Us',
    'Contact Nowshera Events Co. by WhatsApp or email, or send a message through the contact form.',
  );

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim() || form.name.trim().length < 2) next.name = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.subject.trim() || form.subject.trim().length < 3) next.subject = 'Add a short subject.';
    if (!form.message.trim() || form.message.trim().length < 10) next.message = 'Message should be at least 10 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = e => {
    e.preventDefault();
    setStatus(null);
    if (!validate()) {
      setStatus({ kind: 'error', text: 'Please fix the highlighted fields and try again.' });
      return;
    }

    const body = [
      `Name: ${form.name.trim()}`,
      `Email: ${form.email.trim()}`,
      '',
      form.message.trim(),
    ].join('\n');

    const href = `${MAILTO}?subject=${encodeURIComponent(form.subject.trim())}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    setStatus({
      kind: 'success',
      text: 'Your email client should open with the message ready to send. You can also reach us on WhatsApp.',
    });
  };

  return (
    <main className="page prose-page">
      <div className="page-heading">
        <div>
          <Typography variant="h6" color="orange">Contact</Typography>
          <Typography variant="h1" color="blue-gray">We are easy to reach.</Typography>
        </div>
      </div>

      <div className="contact-layout">
        <Card className="border border-blue-gray-50 shadow-sm">
          <CardBody>
            <Typography variant="h6" color="orange" className="mb-2">Direct lines</Typography>
            <Typography variant="h4" color="blue-gray" className="mb-2">Prefer a quick conversation?</Typography>
            <Typography className="mb-4 font-normal !text-gray-600">
              Use WhatsApp or email and we will get back to you as soon as we can.
            </Typography>
            <ContactActionButtons />
            <Typography className="contact-hint mt-3">WhatsApp opens a chat. Gmail opens a new email to {EMAIL}.</Typography>
          <ul className="contact-list">
            <li><span>WhatsApp</span><strong>{WHATSAPP_DISPLAY}</strong></li>
            <li><span>Email</span><strong>{EMAIL}</strong></li>
          </ul>
          </CardBody>
        </Card>

        <Card className="border border-blue-gray-50 shadow-sm">
          <CardBody>
            <Typography variant="h6" color="orange" className="mb-2">Message form</Typography>
            <Typography variant="h4" color="blue-gray" className="mb-4">Send a note</Typography>
          {status && <div className={status.kind === 'error' ? 'notice error' : 'notice'}>{status.text}</div>}
          <form onSubmit={submit} noValidate>
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" required />
              {errors.name && <em className="field-error">{errors.name}</em>}
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" required />
              {errors.email && <em className="field-error">{errors.email}</em>}
            </label>
            <label className="field">
              <span>Subject</span>
              <input value={form.subject} onChange={e => set('subject', e.target.value)} required />
              {errors.subject && <em className="field-error">{errors.subject}</em>}
            </label>
            <label className="field">
              <span>Message</span>
              <textarea value={form.message} onChange={e => set('message', e.target.value)} required />
              {errors.message && <em className="field-error">{errors.message}</em>}
            </label>
              <Button type="submit" color="gray">Send message</Button>
          </form>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

export function FaqPage() {
  usePageMeta(
    'FAQ',
    'Answers about accounts, event discovery, registration, cancellations, and support for Nowshera Events Co.',
  );

  const items = useMemo(() => ([
    {
      q: 'How do I create an account?',
      a: 'Open Create account, enter your full name, email, and password, then submit. Depending on authentication settings, you may need to confirm your email before logging in.',
    },
    {
      q: 'How do I find events?',
      a: 'Visit the Events page to browse the published calendar. You can search by title or location and filter by status or date.',
    },
    {
      q: 'How do I register for an event?',
      a: 'Open an event details page and choose Register now. You must be logged in. Registration is only available for published events with remaining seats.',
    },
    {
      q: 'Are there registration limits?',
      a: 'Each event has a capacity. When available seats reach zero, new registrations are closed for that event.',
    },
    {
      q: 'Can I cancel a registration?',
      a: 'Yes. Go to My registrations, open the event row, and cancel an active registration. Cancelled seats become available to other attendees.',
    },
    {
      q: 'What if an event is full or unavailable?',
      a: 'Full or non-published events will show registration as closed. Check back later or browse other upcoming events on the calendar.',
    },
    {
      q: 'How do I reset my password?',
      a: 'Use Forgot password on the login page, enter your email, and follow the reset link if an account exists for that address.',
    },
    {
      q: 'How can I contact support?',
      a: `Use the Contact page, WhatsApp at ${WHATSAPP_DISPLAY}, or email ${EMAIL}.`,
    },
  ]), []);

  const [open, setOpen] = useState(1);

  return (
    <main className="page prose-page">
      <div className="mb-10 text-center">
        <Typography variant="h1" color="blue-gray" className="mb-4">Answers, kept short.</Typography>
        <Typography variant="lead" className="mx-auto max-w-2xl !text-gray-500">
          Common questions about accounts, discovery, registration, and support.
        </Typography>
      </div>
      <div className="mx-auto max-w-screen-md">
        {items.map((item, key) => (
          <Accordion
            key={item.q}
            open={open === key + 1}
            onClick={() => setOpen(open === key + 1 ? 0 : key + 1)}
          >
            <AccordionHeader className="text-left text-gray-900">{item.q}</AccordionHeader>
            <AccordionBody>
              <Typography color="blue-gray" className="font-normal text-gray-500">{item.a}</Typography>
            </AccordionBody>
          </Accordion>
        ))}
      </div>
    </main>
  );
}

export function PrivacyPage() {
  usePageMeta(
    'Privacy Policy',
    'Privacy policy for Nowshera Events Co. covering account data, registrations, security, and your rights.',
  );

  return (
    <main className="page prose-page legal-page">
      <div className="page-heading">
        <div>
          <Typography variant="h6" color="orange">Legal</Typography>
          <Typography variant="h1" color="blue-gray">Privacy Policy</Typography>
        </div>
      </div>
      <p className="legal-lede">Last updated: September 2026. This policy explains how Nowshera Events Co. handles information on this event registration website.</p>

      <section className="prose-block"><h2>Information we collect</h2><p>We collect information you provide directly when you create an account, update your profile, register for events, cancel registrations, or contact us.</p></section>
      <section className="prose-block"><h2>Account information</h2><p>Account details may include your full name, email address, authentication credentials managed by our auth provider, and role information used to authorize attendee or admin access.</p></section>
      <section className="prose-block"><h2>Event registration information</h2><p>When you register for an event, we store the relationship between your account and the event, registration status, and related timestamps needed to manage capacity and attendance.</p></section>
      <section className="prose-block"><h2>How information is used</h2><p>We use this information to authenticate users, show relevant event details, process registrations and cancellations, support admin event management, and respond to support requests.</p></section>
      <section className="prose-block"><h2>Authentication</h2><p>Sign-in and password recovery are handled through our authentication service. Access tokens stored in your browser are used to call protected API endpoints on your behalf.</p></section>
      <section className="prose-block"><h2>Data security</h2><p>We take reasonable technical and organizational measures to protect information in transit and at rest. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.</p></section>
      <section className="prose-block"><h2>Third-party services</h2><p>This platform uses third-party infrastructure such as Supabase for authentication and database services, and hosting providers for the website and API. Those services process data according to their own security and privacy practices under our configuration.</p></section>
      <section className="prose-block"><h2>Your rights</h2><p>Depending on applicable law, you may request access to, correction of, or deletion of personal information associated with your account by contacting us. We may need to verify your identity before fulfilling a request.</p></section>
      <section className="prose-block"><h2>Data retention</h2><p>We retain account and registration records for as long as needed to operate the platform, meet operational requirements, and resolve disputes. You may ask us about deletion of your account data.</p></section>
      <section className="prose-block"><h2>Policy updates</h2><p>We may update this Privacy Policy from time to time. The “Last updated” date at the top of this page will change when revisions are published. Continued use of the platform after updates means you should review the revised policy.</p></section>
      <section className="prose-block"><h2>Contact</h2><p>Questions about privacy can be sent to <a href={MAILTO}>{EMAIL}</a> or WhatsApp at <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">{WHATSAPP_DISPLAY}</a>.</p></section>
    </main>
  );
}

export function TermsPage() {
  usePageMeta(
    'Terms & Conditions',
    'Terms and conditions for using Nowshera Events Co., including accounts, registrations, cancellations, and liability limits.',
  );

  return (
    <main className="page prose-page legal-page">
      <div className="page-heading">
        <div>
          <Typography variant="h6" color="orange">Legal</Typography>
          <Typography variant="h1" color="blue-gray">Terms &amp; Conditions</Typography>
        </div>
      </div>
      <p className="legal-lede">Last updated: September 2026. By using Nowshera Events Co., you agree to these terms.</p>

      <section className="prose-block"><h2>Account responsibilities</h2><p>You are responsible for providing accurate account information, keeping your login credentials confidential, and all activity that occurs under your account.</p></section>
      <section className="prose-block"><h2>Event registration rules</h2><p>Registrations are accepted only for published events with available capacity. Completing registration does not transfer ownership of an event or create rights beyond the seat reservation recorded in the system.</p></section>
      <section className="prose-block"><h2>Cancellation rules</h2><p>Where the platform allows cancellation, you may cancel an active registration from My registrations. Once cancelled, your seat may be offered to others and re-registration is subject to availability.</p></section>
      <section className="prose-block"><h2>Capacity limitations</h2><p>Event capacity is enforced by the system. When an event is full, new registrations are blocked even if a page was opened earlier while seats appeared available.</p></section>
      <section className="prose-block"><h2>Event changes and cancellations</h2><p>Organizers may update event details, complete events, or cancel events through admin tools. Schedules, locations, and availability can change. Check event pages for the latest information.</p></section>
      <section className="prose-block"><h2>Prohibited use</h2><p>You may not attempt to disrupt the service, bypass authentication or authorization controls, scrape the platform aggressively, submit abusive content, or use the service for unlawful purposes.</p></section>
      <section className="prose-block"><h2>User responsibilities</h2><p>Attendees should arrive according to published event details and follow any on-site rules set by organizers. Admins should publish accurate information and manage capacity responsibly.</p></section>
      <section className="prose-block"><h2>Limitation of liability</h2><p>The platform is provided as a registration and management tool. To the fullest extent permitted by law, Nowshera Events Co. is not liable for indirect, incidental, or consequential damages arising from event attendance, cancellations, technical interruptions, or reliance on published details.</p></section>
      <section className="prose-block"><h2>Updates to terms</h2><p>We may update these Terms &amp; Conditions periodically. Material changes will be reflected by updating the date on this page. Continued use after changes constitutes acceptance of the revised terms.</p></section>
      <section className="prose-block"><h2>Contact</h2><p>For questions about these terms, contact <a href={MAILTO}>{EMAIL}</a> or WhatsApp <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">{WHATSAPP_DISPLAY}</a>.</p></section>
    </main>
  );
}

export const SITE_CONTACT = { WHATSAPP_URL, WHATSAPP_DISPLAY, EMAIL, MAILTO, GMAIL_URL };

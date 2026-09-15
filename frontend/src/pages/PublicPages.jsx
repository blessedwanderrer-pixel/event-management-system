import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../seo';

const WHATSAPP_URL = 'https://wa.me/923172727299';
const WHATSAPP_DISPLAY = '+92 317 2727299';
const EMAIL = 'blessedwanderrer@gmail.com';
const MAILTO = `mailto:${EMAIL}`;
const GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL)}`;

export function ContactActionButtons({ className = '', compact = false }) {
  return (
    <div className={`contact-action-buttons ${compact ? 'compact' : ''} ${className}`.trim()}>
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
          <p className="eyebrow">About us</p>
          <h1>Built for real gatherings.</h1>
        </div>
      </div>

      <section className="prose-block">
        <h2>Who we are</h2>
        <p>
          Nowshera Events Co. is a local event registration and management platform.
          We help organizers publish clear event details and help attendees discover,
          reserve, and manage seats without friction.
        </p>
      </section>

      <section className="prose-block">
        <h2>What we do</h2>
        <p>
          We provide a shared calendar for upcoming events, simple account-based
          registration, and admin tools for creating, publishing, and tracking attendance.
          The focus is operational clarity: dates, capacity, availability, and reliable status updates.
        </p>
      </section>

      <div className="mission-grid">
        <section className="prose-card">
          <p className="eyebrow">Mission</p>
          <h2>Make event registration dependable.</h2>
          <p>
            Give attendees a trustworthy place to find events and reserve seats, while
            giving organizers tools that respect capacity and keep records accurate.
          </p>
        </section>
        <section className="prose-card">
          <p className="eyebrow">Vision</p>
          <h2>Keep community events easy to join.</h2>
          <p>
            A calm, professional platform where local gatherings stay discoverable,
            registration stays fair, and everyone knows where they stand.
          </p>
        </section>
      </div>

      <section className="prose-block">
        <h2>Why this platform exists</h2>
        <p>
          Events fall apart when details are scattered and seat counts are unclear.
          This platform exists to keep discovery, registration, and administration in one
          place—so organizers can publish with confidence and attendees can plan with certainty.
        </p>
        <div className="actions" style={{ marginTop: 28 }}>
          <Link className="button primary" to="/events">Browse events</Link>
          <Link className="button ghost" to="/contact">Contact us</Link>
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
          <p className="eyebrow">Contact</p>
          <h1>We are easy to reach.</h1>
        </div>
      </div>

      <div className="contact-layout">
        <section className="contact-panel">
          <p className="eyebrow">Direct lines</p>
          <h2>Prefer a quick conversation?</h2>
          <p>Use WhatsApp or email and we will get back to you as soon as we can.</p>
          <div className="contact-actions">
            <ContactActionButtons />
            <p className="contact-hint">WhatsApp opens a chat. Gmail opens a new email to {EMAIL}.</p>
          </div>
          <ul className="contact-list">
            <li><span>WhatsApp</span><strong>{WHATSAPP_DISPLAY}</strong></li>
            <li><span>Email</span><strong>{EMAIL}</strong></li>
          </ul>
        </section>

        <section className="form-card wide contact-form-card">
          <p className="eyebrow">Message form</p>
          <h2>Send a note</h2>
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
            <button className="button primary" type="submit">Send message</button>
          </form>
        </section>
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

  const [open, setOpen] = useState(0);

  return (
    <main className="page prose-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FAQ</p>
          <h1>Answers, kept short.</h1>
        </div>
      </div>
      <div className="faq-list">
        {items.map((item, index) => {
          const isOpen = open === index;
          return (
            <div className={`faq-item ${isOpen ? 'open' : ''}`} key={item.q}>
              <button
                type="button"
                className="faq-trigger"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : index)}
              >
                <span>{item.q}</span>
                <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && <div className="faq-panel"><p>{item.a}</p></div>}
            </div>
          );
        })}
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
          <p className="eyebrow">Legal</p>
          <h1>Privacy Policy</h1>
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
          <p className="eyebrow">Legal</p>
          <h1>Terms &amp; Conditions</h1>
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

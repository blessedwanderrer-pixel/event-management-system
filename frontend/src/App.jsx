import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from './api';
import { usePageMeta } from './seo';
import { authLinkError, clearAuthParamsFromUrl, clearSession, getAccessToken, readAuthParams, saveSession } from './session';
import { AboutPage, ContactActionButtons, ContactPage, FaqPage, PrivacyPage, SITE_CONTACT, TermsPage } from './pages/PublicPages';

function useAuth() {
  const [state, setState] = useState({ loading: true, profile: null });

  const refreshAuth = () => {
    const token = getAccessToken();

    if (!token) {
      setState({ loading: false, profile: null });
      return Promise.resolve(null);
    }

    setState(prev => ({ ...prev, loading: true }));

    return api.me()
      .then(profile => {
        setState({ loading: false, profile });
        return profile;
      })
      .catch(() => {
        clearSession();
        setState({ loading: false, profile: null });
        return null;
      });
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return { ...state, refreshAuth };
}

const AuthContext = createContext({ loading: true, profile: null, refreshAuth: () => Promise.resolve(null) });
const ToastContext = createContext(() => {});
const useAuthState = () => useContext(AuthContext);
const useToast = () => useContext(ToastContext);

function App() {
  const auth = useAuth();
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const notify = (message, kind = 'success') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, kind });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3200);
  };

  useEffect(() => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, [location.pathname]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  return (
    <AuthContext.Provider value={auth}>
      <ToastContext.Provider value={notify}>
        <div className="app-shell">
          <Layout />
          <div className="route-stage" key={location.pathname}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/privacy-policy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/403" element={<Forbidden />} />
              <Route path="/admin" element={<AdminEntry />} />
              <Route path="/my-registrations" element={<Guard><Registrations /></Guard>} />
              <Route path="/profile" element={<Guard><Profile /></Guard>} />
              <Route path="/admin/dashboard" element={<AdminGuard><Dashboard /></AdminGuard>} />
              <Route path="/admin/events" element={<AdminGuard><AdminEvents /></AdminGuard>} />
              <Route path="/admin/events/new" element={<AdminGuard><EventForm /></AdminGuard>} />
              <Route path="/admin/events/:id" element={<AdminGuard><AdminEventView /></AdminGuard>} />
              <Route path="/admin/events/:id/edit" element={<AdminGuard><EventForm /></AdminGuard>} />
              <Route path="/admin/events/:id/attendees" element={<AdminGuard><Attendees /></AdminGuard>} />
              <Route path="/admin/reports" element={<AdminGuard><Reports /></AdminGuard>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <SiteFooter />
          <FloatingContactButtons />
        </div>
        {toast && <Toast {...toast} />}
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

function Layout() {
  const { profile, refreshAuth } = useAuthState();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const logout = async () => {
    closeMenu();
    await api.logout();
    clearSession();
    navigate('/');
    refreshAuth();
  };
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <header className={`topbar ${menuOpen ? 'menu-open' : ''}`}>
      <Link to="/" className="brand" onClick={closeMenu}>
        <span className="brand-mark">NE</span>
        <span>Nowshera Events<span className="brand-dot">.</span></span>
      </Link>
      <button
        className="menu-toggle"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span /><span />
      </button>
      <nav className={menuOpen ? 'nav-open' : ''} aria-label="Primary">
        <NavLink to="/events" onClick={closeMenu}>Explore</NavLink>
        <NavLink to="/about" onClick={closeMenu}>About</NavLink>
        <NavLink to="/contact" onClick={closeMenu}>Contact</NavLink>
        <NavLink to="/faq" onClick={closeMenu}>FAQ</NavLink>
        {profile && <NavLink to="/my-registrations" onClick={closeMenu}>My Registrations</NavLink>}
        {profile?.role === 'admin' && (
          <NavLink to="/admin/dashboard" onClick={closeMenu}>Admin Dashboard</NavLink>
        )}
        <div className="nav-auth">
          {profile ? (
            <>
              <NavLink to="/profile" className="nav-profile" onClick={closeMenu}>
                Profile
              </NavLink>
              <button className="text-button" type="button" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={closeMenu}>Log In</NavLink>
              <NavLink to="/signup" className="nav-cta" onClick={closeMenu}>Create Account</NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function FloatingContactButtons() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <div className="floating-contact" aria-label="Quick contact">
      <ContactActionButtons compact />
    </div>
  );
}

function SiteFooter() {
  const { profile } = useAuthState();
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <span className="brand-mark">NE</span>
            <span>Nowshera Events<span className="brand-dot">.</span></span>
          </Link>
          <p>A professional event registration platform for discovering gatherings, reserving seats, and managing plans in one place.</p>
          <ContactActionButtons compact className="footer-contact-actions" />
        </div>
        <div>
          <h2>Explore</h2>
          <Link to="/events">Explore Events</Link>
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact Us</Link>
          <Link to="/faq">FAQ</Link>
        </div>
        <div>
          <h2>Legal &amp; account</h2>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms &amp; Conditions</Link>
          <Link to="/login">Login</Link>
          <Link to="/signup">Create Account</Link>
          {profile && (
            <>
              <Link to="/profile">Profile</Link>
              <Link to="/my-registrations">My Registrations</Link>
            </>
          )}
        </div>
        <div>
          <h2>Contact</h2>
          <p>WhatsApp: <a href={SITE_CONTACT.WHATSAPP_URL} target="_blank" rel="noopener noreferrer">{SITE_CONTACT.WHATSAPP_DISPLAY}</a></p>
          <p>Gmail: <a href={SITE_CONTACT.GMAIL_URL} target="_blank" rel="noopener noreferrer">{SITE_CONTACT.EMAIL}</a></p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Nowshera Events Co. All rights reserved.</span>
        <Link className="text-link" to="/events">Explore Events <span>↗</span></Link>
      </div>
    </footer>
  );
}

function defaultHomeForRole(role) {
  return role === 'admin' ? '/admin/dashboard' : '/events';
}

/** Post-login destination from the authenticated profile role (never from the form). */
function postAuthDestination(profile, intendedFrom) {
  const fallback = defaultHomeForRole(profile?.role);
  if (typeof intendedFrom !== 'string' || !intendedFrom.startsWith('/') || intendedFrom.startsWith('//')) {
    return fallback;
  }
  if (intendedFrom === '/login' || intendedFrom === '/signup' || intendedFrom.startsWith('/auth/')) {
    return fallback;
  }
  const wantsAdmin = intendedFrom === '/admin' || intendedFrom.startsWith('/admin/');
  if (wantsAdmin && profile?.role !== 'admin') {
    return fallback;
  }
  return intendedFrom;
}

function Guard({ children }) {
  const { loading, profile } = useAuthState();
  const location = useLocation();
  if (loading) return <Loading />;
  return profile ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

function AdminGuard({ children }) {
  const { loading, profile } = useAuthState();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return profile.role === 'admin' ? children : <Navigate to="/403" replace />;
}

function AdminEntry() {
  const { loading, profile } = useAuthState();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return profile.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/events" replace />;
}

function Loading() {
  return <main className="page centered"><div className="spinner" /><p>Loading your workspace...</p></main>;
}

function EventSkeleton() {
  return <div className="event-skeleton" aria-label="Loading event"><span /><span /><span /></div>;
}

function Notice({ error, children }) {
  if (!children) return null;
  return <div className={error ? 'notice error' : 'notice'}>{children}</div>;
}

function Toast({ message, kind }) {
  return (
    <div className={`toast ${kind === 'error' ? 'toast-error' : ''}`} role="status">
      <span>{kind === 'error' ? '!' : '✓'}</span>{message}
    </div>
  );
}

function ConfirmDialog({ title, description, confirmLabel, onConfirm, onCancel, busy }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <p className="eyebrow">Please confirm</p>
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        <div className="modal-actions">
          <button className="button ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="button primary" onClick={onConfirm} disabled={busy}>{busy ? 'Working...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Page({ eyebrow, title, children, action }) {
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </main>
  );
}

function Landing() {
  usePageMeta(
    'Home',
    'Discover upcoming events in Nowshera, reserve seats, and manage registrations with Nowshera Events Co.',
  );

  const { profile } = useAuthState();
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    api.events()
      .then(data => {
        setEvents(Array.isArray(data) ? data : []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const featured = events.slice(0, 3);
  const openSpots = events.reduce((sum, event) => sum + (event.available_spots || 0), 0);

  return (
    <main>
      <section className="hero">
        <div className="hero-backdrop" />
        <div className="hero-copy">
          <p className="eyebrow">Nowshera Events Co. / 2026</p>
          <h1>Make room for<br /><em>what matters.</em></h1>
          <p className="hero-lede">
            A considered calendar of gatherings, ideas, and the people worth making time for.
            Browse published events, reserve seats, and keep your plans in one place.
          </p>
          <div className="actions">
            <Link className="button primary magnetic" to="/events">Explore <span>↗</span></Link>
            {profile ? (
              <Link className="button ghost" to="/my-registrations">My Registrations</Link>
            ) : (
              <>
                <Link className="button ghost" to="/signup">Create Account</Link>
                <Link className="button ghost" to="/login">Log In</Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-art">
          <img src="/images/nowshera-night.jpg" alt="Nowshera city lights at night" />
          <div className="art-shade" />
          <div className="art-orbit" />
          <div className="art-label">NEXT UP <strong>01</strong></div>
          <div className="art-date">15<br /><small>OCT</small></div>
          <div className="art-caption">Nowshera<br /><strong>Tech Meetup</strong></div>
          <span className="art-coordinate">34°00' N / 72°00' E</span>
        </div>
      </section>

      <section className="intro-band">
        <span className="section-index">01 / THE PLATFORM</span>
        <h2>For the curious,<br /><i>the connected,</i><br />the almost-there.</h2>
        <p>
          Nowshera Events Co. is a professional event registration platform.
          Discover upcoming gatherings, check live availability, and manage your seats without chasing message threads.
        </p>
        <Link className="text-link" to="/about">About the platform <span>↗</span></Link>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Featured events</p>
            <h2>Coming up next.</h2>
          </div>
          <Link className="button ghost" to="/events">View all events</Link>
        </div>
        {status === 'loading' && <div className="event-grid"><EventSkeleton /><EventSkeleton /><EventSkeleton /></div>}
        {status === 'error' && <Notice error>Unable to load featured events. <Link to="/events">Try the full calendar</Link></Notice>}
        {status === 'ready' && !featured.length && (
          <Empty title="No upcoming events yet" text="Check back soon for published gatherings." action={<Link className="button primary" to="/events">Browse events</Link>} />
        )}
        {status === 'ready' && featured.length > 0 && (
          <div className="event-grid">{featured.map(event => <EventCard key={event.id} event={event} />)}</div>
        )}
      </section>

      <section className="feature-strip why-strip">
        <div><span className="feature-no">01</span><h3>Clear discovery</h3><p>Browse a published calendar with dates, locations, and remaining seats in view.</p></div>
        <div><span className="feature-no">02</span><h3>Simple registration</h3><p>Reserve with an account, track status, and cancel when plans change.</p></div>
        <div><span className="feature-no">03</span><h3>Organizer tools</h3><p>Admins can create, publish, and understand attendance from one workspace.</p></div>
      </section>

      <section className="stats-band">
        <div>
          <span>Upcoming events</span>
          <strong>{status === 'ready' ? events.length : '—'}</strong>
        </div>
        <div>
          <span>Open seats</span>
          <strong>{status === 'ready' ? openSpots : '—'}</strong>
        </div>
        <div>
          <span>Registration</span>
          <strong>Live</strong>
        </div>
        <div>
          <span>Support</span>
          <strong>Direct</strong>
        </div>
      </section>

      <section className="cta-band">
        <p className="eyebrow">Ready when you are</p>
        <h2>Find your next seat.</h2>
        <p>Explore the calendar, create an account, or message us if you need help.</p>
        <div className="actions">
          <Link className="button primary" to="/events">Explore</Link>
          {profile ? (
            <Link className="button ghost" to="/my-registrations">My Registrations</Link>
          ) : (
            <>
              <Link className="button ghost" to="/signup">Create Account</Link>
              <Link className="button ghost" to="/login">Log In</Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Events() {
  usePageMeta(
    'Events',
    'Browse upcoming Nowshera events, filter by status or date, and open details to register.',
  );

  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    api.events()
      .then(data => {
        setEvents(Array.isArray(data) ? data : []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const filtered = events.filter(e => {
    const matchesSearch = `${e.title} ${e.location}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const eventDate = new Date(`${e.event_date}T00:00`);
    const matchesDate = dateFilter === 'all'
      || (dateFilter === 'this-month' && eventDate.getMonth() === new Date().getMonth())
      || (dateFilter === 'next-month' && eventDate.getMonth() === (new Date().getMonth() + 1) % 12);
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <Page
      eyebrow="The calendar"
      title="Find your next thing."
      action={(
        <div className="event-filters">
          <input className="search" placeholder="Search events" value={query} onChange={e => setQuery(e.target.value)} />
          <select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="completed">Completed</option>
          </select>
          <select aria-label="Filter by date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="all">Any date</option>
            <option value="this-month">This month</option>
            <option value="next-month">Next month</option>
          </select>
        </div>
      )}
    >
      {status === 'loading' && <div className="event-grid"><EventSkeleton /><EventSkeleton /></div>}
      {status === 'error' && (
        <Notice error>
          Unable to load events. <button className="link-button" type="button" onClick={() => window.location.reload()}>Try again</button>
        </Notice>
      )}
      {status === 'ready' && !filtered.length && (
        <Empty title="No upcoming events" text="Check back soon for something worth making time for." />
      )}
      {status === 'ready' && filtered.length > 0 && (
        <div className="event-grid">{filtered.map(event => <EventCard key={event.id} event={event} />)}</div>
      )}
    </Page>
  );
}

function EventCard({ event }) {
  const image = event.title.toLowerCase().includes('tech') ? '/images/event-table.jpg' : '/images/event-gathering.jpg';
  const closed = event.status !== 'published' || event.available_spots < 1;

  return (
    <article className="event-card">
      <div className="card-visual">
        <img src={image} alt="" />
        <span className="card-date">
          <b>{new Date(`${event.event_date}T00:00`).toLocaleDateString('en', { day: '2-digit' })}</b>
          <span>{new Date(`${event.event_date}T00:00`).toLocaleDateString('en', { month: 'short' })}</span>
        </span>
      </div>
      <div className="card-body">
        <span className="tag">{event.status}</span>
        <h2>{event.title}</h2>
        <p>{event.description || 'An experience designed for curious people.'}</p>
        <div className="meta">
          <span>◷ {event.event_time.slice(0, 5)}</span>
          <span>⌖ {event.location}</span>
          <span>{event.available_spots} of {event.capacity} spots left</span>
        </div>
        <div className="card-actions">
          <Link className="card-link" to={`/events/${event.id}`}>View details <span>→</span></Link>
          <Link className={`button ${closed ? 'ghost' : 'primary'} compact`} to={`/events/${event.id}`}>
            {closed ? 'View status' : 'Register'}
          </Link>
        </div>
      </div>
    </article>
  );
}

function EventDetails() {
  usePageMeta('Event details', 'View event details, availability, and registration options on Nowshera Events Co.');

  const { id } = useParams();
  const { profile } = useAuthState();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const notify = useToast();

  const load = () => {
    api.event(id).then(setEvent).catch(e => setError(e.message));
    if (profile) api.registrations().then(setRegistrations).catch(() => {});
  };

  useEffect(load, [id, profile]);

  if (error) {
    return (
      <Page eyebrow="Not found" title="This event moved on.">
        <Notice error>{error}</Notice>
        <Link className="button ghost" to="/events">Back to events</Link>
      </Page>
    );
  }

  if (!event) return <Loading />;

  const registration = registrations.find(r => r.event_id === event.id && r.status === 'active');
  const closed = event.status !== 'published' || event.available_spots < 1;

  const register = async () => {
    setBusy(true);
    try {
      await api.register(id);
      load();
      notify('Registration successful.');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page detail-page">
      <Link className="back" to="/events">← All events</Link>
      <div className="detail-layout">
        <section>
          <span className="tag">{event.status}</span>
          <h1>{event.title}</h1>
          <p className="detail-description">{event.description || 'No description provided for this event.'}</p>
          <div className="detail-meta">
            <div>
              <small>When</small>
              <strong>
                {new Date(`${event.event_date}T00:00`).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
                <br />{event.event_time.slice(0, 5)}
              </strong>
            </div>
            <div><small>Where</small><strong>{event.location}</strong></div>
            <div><small>Availability</small><strong>{event.available_spots} of {event.capacity} spots</strong></div>
            <div><small>Capacity</small><strong>{event.capacity} seats</strong></div>
          </div>
        </section>
        <aside className="action-panel">
          <p className="eyebrow">Save your seat</p>
          {!profile ? (
            <>
              <p>Join the room when it opens.</p>
              <Link className="button primary full" to="/login">Log in to register</Link>
            </>
          ) : registration ? (
            <>
              <p>You have a place at this event.</p>
              <button className="button secondary full" type="button" disabled>Already registered</button>
              <Link className="button ghost full" to="/my-registrations" style={{ marginTop: 10 }}>View my registrations</Link>
            </>
          ) : (
            <>
              <p>{closed ? (event.status === 'published' ? 'This event is full.' : 'Registration is closed.') : 'Ready when you are.'}</p>
              <button className="button primary full" type="button" disabled={closed || busy} onClick={register}>
                {busy ? 'Reserving...' : closed ? 'Registration closed' : 'Register now'}
              </button>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function AuthForm({ mode }) {
  usePageMeta(mode === 'signup' ? 'Sign up' : 'Log in', 'Sign in or create an account to register for Nowshera events.');
  const signup = mode === 'signup';
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshAuth } = useAuthState();
  const [data, setData] = useState(signup
    ? { full_name: '', email: '', password: '', confirm_password: '' }
    : { email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef(0);

  const clearTransientFeedback = () => {
    setError('');
    setMessage('');
    setFieldErrors({});
  };

  useEffect(() => {
    clearTransientFeedback();
    setBusy(false);
    const onPageShow = (event) => {
      if (event.persisted) clearTransientFeedback();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      requestIdRef.current += 1;
    };
  }, [mode, location.pathname]);

  const submit = async e => {
    e.preventDefault();
    clearTransientFeedback();
    const nextErrors = {};
    if (signup) {
      if (data.full_name.trim().length < 2) nextErrors.full_name = 'Enter your full name.';
      if (data.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
      if (data.password !== data.confirm_password) nextErrors.confirm_password = 'Passwords do not match.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) nextErrors.email = 'Enter a valid email address.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const requestId = ++requestIdRef.current;
    setBusy(true);
    try {
      const payload = signup
        ? { full_name: data.full_name.trim(), email: data.email.trim(), password: data.password }
        : { email: data.email.trim(), password: data.password };
      const result = signup ? await api.signup(payload) : await api.login(payload);
      if (requestId !== requestIdRef.current) return;
      if (result.session?.access_token) {
        saveSession(result.session);
        const profile = await refreshAuth();
        if (requestId !== requestIdRef.current) return;
        if (!profile) {
          setError('Signed in, but your profile could not be loaded. Please try again.');
          return;
        }
        navigate(postAuthDestination(profile, location.state?.from), { replace: true });
      } else {
        setMessage(result.message);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message);
    } finally {
      if (requestId === requestIdRef.current) setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <p className="eyebrow">Nowshera Events Co.</p>
        <h1>{signup ? 'Make yourself at home.' : 'Welcome back.'}</h1>
        <p>{signup ? 'Create an account to keep your plans close.' : 'Pick up where you left off.'}</p>
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <form onSubmit={submit} noValidate>
          {signup && (
            <Field
              label="Full name"
              value={data.full_name}
              onChange={v => setData({ ...data, full_name: v })}
              error={fieldErrors.full_name}
              autoComplete="name"
            />
          )}
          <Field
            label="Email address"
            type="email"
            value={data.email}
            onChange={v => setData({ ...data, email: v })}
            error={fieldErrors.email}
            autoComplete="email"
          />
          <PasswordField
            label="Password"
            value={data.password}
            onChange={v => setData({ ...data, password: v })}
            error={fieldErrors.password}
            autoComplete={signup ? 'new-password' : 'current-password'}
          />
          {signup && (
            <PasswordField
              label="Confirm password"
              value={data.confirm_password}
              onChange={v => setData({ ...data, confirm_password: v })}
              error={fieldErrors.confirm_password}
              autoComplete="new-password"
            />
          )}
          {!signup && <Link className="form-help" to="/forgot-password">Forgot your password?</Link>}
          <button className="button primary full" disabled={busy}>{busy ? 'Please wait...' : signup ? 'Create account' : 'Log in'}</button>
        </form>
        <p className="switch">
          {signup ? 'Already have an account?' : 'New here?'}{' '}
          <Link to={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Create an account'}</Link>
        </p>
      </div>
    </main>
  );
}

function Field({ label, type = 'text', value, onChange, error, autoComplete, disabled }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        required
        type={type}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        onChange={e => onChange(e.target.value)}
      />
      {error && <em className="field-error">{error}</em>}
    </label>
  );
}

function PasswordField({ label, value, onChange, error, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="password-field">
        <input
          required
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          onChange={e => onChange(e.target.value)}
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setVisible(current => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && <em className="field-error">{error}</em>}
    </label>
  );
}

const Login = () => <AuthForm mode="login" />;
const Signup = () => <AuthForm mode="signup" />;

function ForgotPassword() {
  usePageMeta('Forgot password', 'Request a secure password reset link for your Nowshera Events account.');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.forgotPassword({ email: email.trim() });
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <p className="eyebrow">Account recovery</p>
        <h1>Find your way back.</h1>
        <p>Enter your email and we will send a secure reset link if the account exists.</p>
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <form onSubmit={submit}>
          <Field label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <button className="button primary full" disabled={busy || Boolean(message)}>{busy ? 'Sending...' : 'Send reset link'}</button>
        </form>
        <p className="switch"><Link to="/login">← Back to login</Link></p>
      </div>
    </main>
  );
}

function ResetPassword() {
  usePageMeta('Reset password', 'Choose a new password for your Nowshera Events account.');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params = readAuthParams();
    const linkError = authLinkError(params);
    if (linkError) {
      setError(linkError);
      setReady(true);
      return undefined;
    }

    const bootstrap = async () => {
      try {
        if (params.token_hash && (params.type === 'recovery' || !params.type)) {
          const verified = await api.verifyToken({ token_hash: params.token_hash, type: params.type || 'recovery' });
          if (cancelled) return;
          if (verified.session?.access_token) {
            setToken(verified.session.access_token);
            clearAuthParamsFromUrl();
            setReady(true);
            return;
          }
        }
        if (params.access_token) {
          if (cancelled) return;
          setToken(params.access_token);
          if (params.refresh_token) {
            saveSession({ access_token: params.access_token, refresh_token: params.refresh_token });
          }
          clearAuthParamsFromUrl();
          setReady(true);
          return;
        }
        if (cancelled) return;
        setError('This reset link is missing or expired. Please request a new one.');
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'This reset link is missing or expired. Please request a new one.');
          setReady(true);
        }
      }
    };

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!token) return setError('This reset link is missing or expired. Please request a new one.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      const result = await api.resetPassword({ password }, token);
      clearSession();
      setMessage(result.message);
      window.setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <p className="eyebrow">Account recovery</p>
        <h1>Choose a new password.</h1>
        <p>Use at least eight characters, then return to login.</p>
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        {!ready && <Loading />}
        {ready && !message && (
          <form onSubmit={submit}>
            <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
            <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            <button className="button primary full" disabled={busy || !token}>{busy ? 'Updating...' : 'Update password'}</button>
          </form>
        )}
        <p className="switch"><Link to="/login">← Back to login</Link></p>
      </div>
    </main>
  );
}

function AuthCallback() {
  usePageMeta('Confirming account', 'Completing your Nowshera Events authentication request.');
  const navigate = useNavigate();
  const { refreshAuth } = useAuthState();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Confirming your account...');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const params = readAuthParams();
      const linkError = authLinkError(params);
      if (linkError) {
        setError(linkError);
        return;
      }
      try {
        if (params.token_hash && params.type) {
          const verified = await api.verifyToken({ token_hash: params.token_hash, type: params.type });
          if (cancelled) return;
          if (verified.session?.access_token) {
            saveSession(verified.session);
            const profile = await refreshAuth();
            clearAuthParamsFromUrl();
            if (params.type === 'recovery') {
              navigate('/reset-password', { replace: true });
              return;
            }
            setMessage(params.type === 'email_change'
              ? 'Email confirmed. Your account email is now up to date.'
              : 'Email confirmed. You are signed in.');
            const next = params.type === 'email_change'
              ? '/profile'
              : postAuthDestination(profile, null);
            window.setTimeout(() => navigate(next, { replace: true }), 900);
            return;
          }
        }
        if (params.access_token) {
          saveSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          const profile = await refreshAuth();
          clearAuthParamsFromUrl();
          if (params.type === 'recovery') {
            navigate('/reset-password', { replace: true });
            return;
          }
          setMessage(params.type === 'email_change'
            ? 'Email confirmed. Your account email is now up to date.'
            : 'Email confirmed. You are signed in.');
          const next = params.type === 'email_change'
            ? '/profile'
            : postAuthDestination(profile, null);
          window.setTimeout(() => navigate(next, { replace: true }), 900);
          return;
        }
        setError('This confirmation link is missing or expired.');
      } catch (err) {
        if (!cancelled) setError(err.message || 'This confirmation link is missing or expired.');
      }
    };
    run();
    return () => { cancelled = true; };
  }, [navigate, refreshAuth]);

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <p className="eyebrow">Authentication</p>
        <h1>Almost there.</h1>
        {error ? <Notice error>{error}</Notice> : <Notice>{message}</Notice>}
        <p className="switch"><Link to="/login">← Back to login</Link></p>
      </div>
    </main>
  );
}

function Profile() {
  usePageMeta('Account settings', 'Manage your Nowshera Events profile, email, and password.');
  const { profile, refreshAuth } = useAuthState();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [nameMessage, setNameMessage] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [busyName, setBusyName] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);
  const notify = useToast();

  useEffect(() => {
    setName(profile?.full_name || '');
    setEmail(profile?.email || '');
  }, [profile?.full_name, profile?.email]);

  const saveName = async e => {
    e.preventDefault();
    setNameError('');
    setNameMessage('');
    if (name.trim().length < 2) {
      setNameError('Enter your full name.');
      return;
    }
    setBusyName(true);
    try {
      const updated = await api.updateProfile({ full_name: name.trim() });
      await refreshAuth();
      setName(updated.full_name);
      setNameMessage('Name updated.');
      notify('Name updated.');
    } catch (err) {
      setNameError(err.message);
      notify(err.message, 'error');
    } finally {
      setBusyName(false);
    }
  };

  const saveEmail = async e => {
    e.preventDefault();
    setEmailError('');
    setEmailMessage('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setBusyEmail(true);
    try {
      const result = await api.changeEmail({ email: email.trim() });
      if (result.profile) await refreshAuth();
      setEmailMessage(result.message);
      notify(result.requires_confirmation ? 'Confirmation email sent.' : 'Email updated.');
    } catch (err) {
      setEmailError(err.message);
      notify(err.message, 'error');
    } finally {
      setBusyEmail(false);
    }
  };

  const savePassword = async e => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (passwordForm.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setBusyPassword(true);
    try {
      const result = await api.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordMessage(result.message);
      notify('Password updated.');
    } catch (err) {
      setPasswordError(err.message);
      notify(err.message, 'error');
    } finally {
      setBusyPassword(false);
    }
  };

  const logout = async () => {
    await api.logout();
    clearSession();
    await refreshAuth();
    navigate('/');
  };

  return (
    <Page eyebrow="Account" title="Your profile">
      <div className="profile-grid">
        <section className="form-card">
          <p className="eyebrow">Account information</p>
          <h2>Details</h2>
          <label className="field"><span>Full name</span><input value={profile?.full_name || ''} disabled /></label>
          <label className="field"><span>Email address</span><input value={profile?.email || ''} disabled /></label>
          <label className="field"><span>Role</span><input value={profile?.role || ''} disabled /></label>
          <button className="button ghost" type="button" onClick={logout}>Log out</button>
        </section>

        <section className="form-card">
          <p className="eyebrow">Change name</p>
          <h2>Update how you appear</h2>
          <form onSubmit={saveName}>
            <Field label="Full name" value={name} onChange={setName} autoComplete="name" />
            {nameError && <Notice error>{nameError}</Notice>}
            {nameMessage && <Notice>{nameMessage}</Notice>}
            <button className="button primary" disabled={busyName}>{busyName ? 'Saving...' : 'Save name'}</button>
          </form>
        </section>

        <section className="form-card">
          <p className="eyebrow">Change email</p>
          <h2>Use a different inbox</h2>
          <p className="form-copy">Supabase may send a confirmation email before the new address becomes active.</p>
          <form onSubmit={saveEmail}>
            <Field label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" />
            {emailError && <Notice error>{emailError}</Notice>}
            {emailMessage && <Notice>{emailMessage}</Notice>}
            <button className="button primary" disabled={busyEmail}>{busyEmail ? 'Updating...' : 'Update email'}</button>
          </form>
        </section>

        <section className="form-card">
          <p className="eyebrow">Change password</p>
          <h2>Keep your account secure</h2>
          <form onSubmit={savePassword}>
            <PasswordField
              label="Current password"
              value={passwordForm.current_password}
              onChange={v => setPasswordForm({ ...passwordForm, current_password: v })}
              autoComplete="current-password"
            />
            <PasswordField
              label="New password"
              value={passwordForm.new_password}
              onChange={v => setPasswordForm({ ...passwordForm, new_password: v })}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm new password"
              value={passwordForm.confirm_password}
              onChange={v => setPasswordForm({ ...passwordForm, confirm_password: v })}
              autoComplete="new-password"
            />
            {passwordError && <Notice error>{passwordError}</Notice>}
            {passwordMessage && <Notice>{passwordMessage}</Notice>}
            <button className="button primary" disabled={busyPassword}>{busyPassword ? 'Updating...' : 'Update password'}</button>
          </form>
        </section>
      </div>
    </Page>
  );
}

function Registrations() {
  usePageMeta('My registrations', 'Review and cancel your active event registrations.');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const notify = useToast();

  const load = () => {
    api.registrations()
      .then(setItems)
      .catch(e => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async () => {
    setError('');
    try {
      await api.cancelRegistration(pending);
      setPending(null);
      load();
      notify('Registration cancelled.');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    }
  };

  return (
    <Page eyebrow="Your plans" title="My registrations">
      <Notice error={Boolean(error)}>{error}</Notice>
      {items && !items.length && (
        <Empty
          title="Nothing on the calendar yet"
          text="Your next good plan is a few clicks away."
          action={<Link className="button primary" to="/events">Browse events</Link>}
        />
      )}
      {items && (
        <div className="registration-list">
          {items.map(item => (
            <div className="registration-row" key={item.id}>
              <div>
                <span className="tag">{item.status}</span>
                <h2>{item.event.title}</h2>
                <p>{item.event.event_date} · {item.event.location}</p>
              </div>
              <div className="row-actions">
                <Link className="button ghost" to={`/events/${item.event_id}`}>View event</Link>
                {item.status === 'active' && (
                  <button className="button danger" type="button" onClick={() => setPending(item.id)}>Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {pending && (
        <ConfirmDialog
          title="Cancel your registration?"
          description="Your seat will become available to someone else."
          confirmLabel="Cancel registration"
          onConfirm={cancel}
          onCancel={() => setPending(null)}
        />
      )}
    </Page>
  );
}

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setDisplay(value);
    let current = 0;
    const step = Math.max(1, Math.ceil(value / 18));
    const timer = window.setInterval(() => {
      current = Math.min(value, current + step);
      setDisplay(current);
      if (current === value) window.clearInterval(timer);
    }, 35);
    return () => window.clearInterval(timer);
  }, [value]);
  return <strong>{display}</strong>;
}

function Dashboard() {
  usePageMeta('Admin dashboard', 'Manage Nowshera Events: create, publish, and review registrations.');
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [eventsError, setEventsError] = useState('');
  const [pending, setPending] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const notify = useToast();

  const loadSummary = () => api.summary()
    .then(data => { setSummary(data); setSummaryError(''); })
    .catch(e => setSummaryError(e.message));

  const loadEvents = () => api.adminEvents()
    .then(data => { setEvents(data); setEventsError(''); })
    .catch(e => { setEvents(null); setEventsError(e.message); });

  useEffect(() => {
    loadSummary();
    loadEvents();
  }, []);

  const refreshAll = () => {
    loadSummary();
    loadEvents();
  };

  const actionLabels = { publish: 'published', complete: 'completed', cancel: 'cancelled' };

  const runAction = async (id, verb) => {
    setActionBusy(true);
    setEventsError('');
    try {
      await api.eventAction(id, verb);
      setPending(null);
      refreshAll();
      notify(`Event ${actionLabels[verb] || verb}.`);
    } catch (e) {
      setEventsError(e.message);
      notify(e.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const requestAction = (id, verb) => (
    verb === 'cancel' || verb === 'complete'
      ? setPending({ id, verb })
      : runAction(id, verb)
  );

  const metrics = summary ? [
    ['Total Events', summary.total_events],
    ['Published Events', summary.published_events],
    ['Total Registrations', summary.total_registrations ?? summary.active_registrations],
    ['Available Seats', summary.available_places ?? 0],
  ] : null;

  return (
    <Page
      eyebrow="Admin workspace"
      title="Admin dashboard"
      action={<Link className="button primary" to="/admin/events/new">+ Create Event</Link>}
    >
      <section className="admin-section" aria-labelledby="admin-summary-heading">
        <div className="admin-section-head">
          <h2 id="admin-summary-heading">Overview</h2>
          <p>Live counts from your event calendar and registrations.</p>
        </div>
        {summaryError && <Notice error>{summaryError}</Notice>}
        {!summary && !summaryError && <Loading />}
        {metrics && (
          <div className="metrics">
            {metrics.map(([label, value]) => (
              <div className="metric" key={label}>
                <span>{label}</span>
                <AnimatedCounter value={Number(value) || 0} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-section" aria-labelledby="admin-events-heading">
        <div className="admin-section-head admin-section-head-row">
          <div>
            <h2 id="admin-events-heading">Event management</h2>
            <p>Create, edit, publish, complete, or cancel events, and open attendee lists.</p>
          </div>
          <Link className="button primary" to="/admin/events/new">+ Create Event</Link>
        </div>
        {eventsError && <Notice error>{eventsError}</Notice>}
        {events === null && !eventsError && <Loading />}
        {events && !events.length && (
          <Empty
            title="No events yet"
            text="Create your first event to start managing the calendar."
            action={<Link className="button primary" to="/admin/events/new">+ Create Event</Link>}
          />
        )}
        {events && events.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Seats</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.title}</strong>
                      <small>{e.location}</small>
                    </td>
                    <td>{e.event_date}{e.event_time ? ` · ${String(e.event_time).slice(0, 5)}` : ''}</td>
                    <td>{e.active_registrations} / {e.capacity}</td>
                    <td><span className="tag">{e.status}</span></td>
                    <td className="table-actions">
                      <Link className="button ghost compact" to={`/admin/events/${e.id}/edit`}>Edit</Link>
                      <Link className="button ghost compact" to={`/admin/events/${e.id}/attendees`}>View Attendees</Link>
                      {e.status === 'draft' && (
                        <>
                          <button className="button primary compact" type="button" disabled={actionBusy} onClick={() => requestAction(e.id, 'publish')}>Publish</button>
                          <button className="button ghost compact" type="button" disabled={actionBusy} onClick={() => requestAction(e.id, 'cancel')}>Cancel</button>
                        </>
                      )}
                      {e.status === 'published' && (
                        <>
                          <button className="button primary compact" type="button" disabled={actionBusy} onClick={() => requestAction(e.id, 'complete')}>Complete</button>
                          <button className="button ghost compact" type="button" disabled={actionBusy} onClick={() => requestAction(e.id, 'cancel')}>Cancel</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section" id="reports" aria-labelledby="admin-reports-heading">
        <div className="admin-section-head admin-section-head-row">
          <div>
            <h2 id="admin-reports-heading">Reports</h2>
            <p>Registration and capacity snapshot across the calendar.</p>
          </div>
          <Link className="button ghost" to="/admin/reports">Open full reports</Link>
        </div>
        {summary && (
          <div className="report-grid">
            {Object.entries({
              'Total events': summary.total_events,
              'Published events': summary.published_events,
              'Upcoming events': summary.upcoming_events,
              'All registrations': summary.total_registrations,
              'Active registrations': summary.active_registrations,
              'Places available': summary.available_places ?? 0,
              'Completed events': summary.completed_events,
              'Cancelled events': summary.cancelled_events,
            }).map(([key, value]) => (
              <div className="report-card" key={key}><span>{key}</span><strong>{value}</strong></div>
            ))}
          </div>
        )}
      </section>

      {pending && (
        <ConfirmDialog
          title={`${pending.verb === 'cancel' ? 'Cancel' : 'Complete'} this event?`}
          description="This changes the event lifecycle and may close future attendee actions."
          confirmLabel={pending.verb === 'cancel' ? 'Cancel event' : 'Complete event'}
          onConfirm={() => runAction(pending.id, pending.verb)}
          onCancel={() => setPending(null)}
        />
      )}
    </Page>
  );
}

function AdminEvents() {
  return <Navigate to="/admin/dashboard" replace />;
}

function EventForm() {
  const { id } = useParams();
  const edit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', event_date: '', event_time: '', location: '', capacity: 50, status: 'draft' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (edit) {
      api.adminEvent(id)
        .then(e => setForm({
          ...e,
          capacity: e.capacity,
          event_date: e.event_date,
          event_time: String(e.event_time || '').slice(0, 5),
        }))
        .catch(e => setError(e.message));
    }
  }, [id]);

  const set = (key, value) => setForm({ ...form, [key]: value });

  const submit = async e => {
    e.preventDefault();
    setError('');
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      setError('Capacity must be a whole number greater than 0.');
      return;
    }
    if (edit && form.active_registrations != null && capacity < Number(form.active_registrations)) {
      setError(`Capacity cannot be lower than the ${form.active_registrations} people already registered.`);
      return;
    }
    setBusy(true);
    try {
      const data = {
        title: form.title,
        description: form.description,
        event_date: form.event_date,
        event_time: form.event_time,
        location: form.location,
        capacity,
        status: form.status,
      };
      if (edit) await api.updateEvent(id, data);
      else await api.createEvent(data);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page eyebrow="Admin workspace" title={edit ? 'Edit event' : 'Create an event'}>
      <div className="form-card wide">
        {error && <Notice error>{error}</Notice>}
        <form onSubmit={submit} className="event-form">
          <Field label="Title" value={form.title} onChange={v => set('title', v)} />
          <Field label="Location" value={form.location} onChange={v => set('location', v)} />
          <div className="form-row">
            <Field label="Date" type="date" value={form.event_date} onChange={v => set('event_date', v)} />
            <Field label="Time" type="time" value={form.event_time} onChange={v => set('event_time', v)} />
            <Field label="Capacity" type="number" value={form.capacity} onChange={v => set('capacity', v)} />
          </div>
          <label className="field"><span>Description</span><textarea value={form.description || ''} onChange={e => set('description', e.target.value)} /></label>
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
          <div className="actions">
            <Link className="button ghost" to="/admin/dashboard">Cancel</Link>
            <button className="button primary" disabled={busy}>{busy ? 'Saving...' : edit ? 'Update event' : 'Save event'}</button>
          </div>
        </form>
      </div>
    </Page>
  );
}

function Attendees() {
  const { id } = useParams();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [message, setMessage] = useState('');
  const notify = useToast();

  useEffect(() => {
    setItems(null);
    setError('');
    api.attendees(id, statusFilter)
      .then(setItems)
      .catch(e => setError(e.message));
  }, [id, statusFilter]);

  const filtered = (items || []).filter(item => {
    const haystack = `${item.full_name} ${item.email}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const exportRows = filtered.map(item => ({
    full_name: item.full_name,
    email: item.email,
    status: item.registration_status,
    registered_at: new Date(item.registered_at).toISOString(),
  }));

  const copyList = async () => {
    const text = [
      'Name\tEmail\tStatus\tRegistered',
      ...exportRows.map(row => `${row.full_name}\t${row.email}\t${row.status}\t${row.registered_at}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Attendee list copied for check-in.');
      notify('Attendee list copied.');
    } catch {
      setError('Unable to copy the attendee list.');
      notify('Unable to copy the attendee list.', 'error');
    }
  };

  const downloadCsv = () => {
    const escape = value => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [
      'Name,Email,Status,Registered',
      ...exportRows.map(row => [row.full_name, row.email, row.status, row.registered_at].map(escape).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendees-${id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Attendee CSV downloaded.');
    notify('Attendee CSV downloaded.');
  };

  return (
    <Page
      eyebrow="Event details"
      title="Attendees"
      action={(
        <div className="event-filters">
          <Link className="button ghost" to="/admin/dashboard">← Dashboard</Link>
          <input className="search" placeholder="Search name or email" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search attendees" />
          <select aria-label="Filter by registration status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="active">Active only</option>
            <option value="cancelled">Cancelled only</option>
            <option value="all">All statuses</option>
          </select>
          <button className="button ghost" type="button" onClick={copyList} disabled={!filtered.length}>Copy list</button>
          <button className="button primary" type="button" onClick={downloadCsv} disabled={!filtered.length}>Export CSV</button>
        </div>
      )}
    >
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {!items && !error && <Loading />}
      {items && !filtered.length && (
        <Empty title="No matching attendees" text="Try another search, or switch the status filter." />
      )}
      {items && filtered.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Registered</th></tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={`${item.id}-${item.registered_at}`}>
                  <td>{item.full_name}</td>
                  <td>{item.email}</td>
                  <td><span className="tag">{item.registration_status}</span></td>
                  <td>{new Date(item.registered_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}

function AdminEventView() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => api.adminEvent(id).then(setEvent).catch(e => setError(e.message)), [id]);
  if (error) {
    return (
      <Page eyebrow="Admin workspace" title="Event unavailable">
        <Notice error>{error}</Notice>
        <Link className="button ghost" to="/admin/dashboard">Back to dashboard</Link>
      </Page>
    );
  }
  if (!event) return <Loading />;
  return (
    <Page eyebrow="Admin event view" title={event.title} action={<Link className="button primary" to={`/admin/events/${id}/edit`}>Edit event</Link>}>
      <div className="detail-layout">
        <section>
          <span className="tag">{event.status}</span>
          <p className="detail-description">{event.description || 'No description provided.'}</p>
          <div className="detail-meta">
            <div><small>Date</small><strong>{event.event_date}</strong></div>
            <div><small>Location</small><strong>{event.location}</strong></div>
            <div><small>Seats</small><strong>{event.active_registrations} / {event.capacity}</strong></div>
          </div>
        </section>
        <aside className="action-panel">
          <p className="eyebrow">Attendee activity</p>
          <p>Review the people registered for this event.</p>
          <Link className="button primary full" to={`/admin/events/${id}/attendees`}>View Attendees</Link>
          <Link className="button ghost full" to="/admin/dashboard" style={{ marginTop: 10 }}>← Dashboard</Link>
        </aside>
      </div>
    </Page>
  );
}

function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.summary().then(setData).catch(e => setError(e.message));
  }, []);
  return (
    <Page
      eyebrow="Admin workspace"
      title="Reports & analytics"
      action={<Link className="button ghost" to="/admin/dashboard">← Dashboard</Link>}
    >
      {error && <Notice error>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && (
        <div className="report-grid">
          {Object.entries({
            'Total events': data.total_events,
            'Published events': data.published_events,
            'Upcoming events': data.upcoming_events,
            'All registrations': data.total_registrations,
            'Active registrations': data.active_registrations,
            'Places available': data.available_places ?? 0,
            'Completed events': data.completed_events,
            'Cancelled events': data.cancelled_events,
          }).map(([key, value]) => (
            <div className="report-card" key={key}><span>{key}</span><strong>{value}</strong></div>
          ))}
        </div>
      )}
    </Page>
  );
}

function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-mark">○</div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}

function Forbidden() {
  return (
    <Page eyebrow="403" title="This room is for admins.">
      <p>You do not have permission to view this page.</p>
      <Link className="button primary" to="/events">Back to events</Link>
    </Page>
  );
}

function NotFound() {
  usePageMeta('Page not found', 'The page you requested could not be found on Nowshera Events Co.');
  return (
    <Page eyebrow="404" title="Page not found.">
      <p>There is nothing here yet. Head home or browse the event calendar.</p>
      <div className="actions" style={{ marginTop: 24 }}>
        <Link className="button primary" to="/">Back Home</Link>
        <Link className="button ghost" to="/events">Browse Events</Link>
      </div>
    </Page>
  );
}

export default App;

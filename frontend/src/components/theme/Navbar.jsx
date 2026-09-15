import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Navbar as MTNavbar,
  Collapse,
  IconButton,
} from '@material-tailwind/react';
import {
  Bars3Icon,
  XMarkIcon,
  CalendarDaysIcon,
  InformationCircleIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
  TicketIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  HomeIcon,
} from '@heroicons/react/24/solid';
import { AnimatePresence, motion } from 'motion/react';
import { ZoomHover, useMotionSafe } from '../Motion';

const BRAND_ORANGE = '#FF7A1A';

const menuContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.06 },
  },
};

const menuItem = {
  hidden: { opacity: 0, scale: 0.86, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 420, damping: 24 },
  },
};

function NavItem({ to, children, onClick, end, dark }) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        onClick={onClick}
        className={({ isActive }) => {
          if (dark) {
            return `flex items-center gap-2 border-b-2 pb-0.5 font-medium transition-colors ${
              isActive
                ? 'border-[var(--brand-orange)] text-white'
                : 'border-transparent text-white/85 hover:text-white'
            }`;
          }
          return `flex items-center gap-2 border-b-2 pb-0.5 font-medium transition-colors ${
            isActive
              ? 'border-[var(--brand-orange)] text-gray-900'
              : 'border-transparent text-gray-700 hover:text-gray-900'
          }`;
        }}
      >
        {children}
      </NavLink>
    </li>
  );
}

function MobileNavItem({ children, animate }) {
  if (!animate) {
    return <li>{children}</li>;
  }
  return (
    <motion.li variants={menuItem} className="origin-left">
      {children}
    </motion.li>
  );
}

export default function Navbar({ profile, onLogout }) {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();
  const animate = useMotionSafe();
  const isHome = location.pathname === '/';
  const isCeo = location.pathname === '/ceo';
  const isAuthSurface = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);
  const isAdminArea = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';
  const darkNav = isHome || isCeo || isAuthSurface || isAdminArea;

  React.useEffect(() => {
    const onResize = () => window.innerWidth >= 960 && setOpen(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const close = () => setOpen(false);
  const brandTo = profile?.role === 'admin' && isAdminArea ? '/admin/dashboard' : '/';
  const linkTone = darkNav ? 'text-white' : 'text-gray-900';
  const btnColor = darkNav ? 'white' : 'gray';
  const mobileLinkClass = darkNav
    ? 'flex items-center gap-2 font-medium text-white/90 hover:text-white'
    : 'flex items-center gap-2 font-medium text-gray-800 hover:text-gray-900';

  const publicLinks = (
    <>
      <NavItem dark={darkNav} to="/" end onClick={close}><HomeIcon className="h-4 w-4" /><span>Home</span></NavItem>
      <NavItem dark={darkNav} to="/events" onClick={close}><CalendarDaysIcon className="h-4 w-4" /><span>Explore</span></NavItem>
      <NavItem dark={darkNav} to="/about" onClick={close}><InformationCircleIcon className="h-4 w-4" /><span>About</span></NavItem>
      <NavItem dark={darkNav} to="/contact" onClick={close}><EnvelopeIcon className="h-4 w-4" /><span>Contact</span></NavItem>
      <NavItem dark={darkNav} to="/faq" onClick={close}><QuestionMarkCircleIcon className="h-4 w-4" /><span>FAQ</span></NavItem>
      {profile && (
        <NavItem dark={darkNav} to="/my-registrations" onClick={close}><TicketIcon className="h-4 w-4" /><span>My Registrations</span></NavItem>
      )}
      {profile?.role === 'admin' && (
        <NavItem dark={darkNav} to="/admin/dashboard" onClick={close}><ShieldCheckIcon className="h-4 w-4" /><span>Admin Dashboard</span></NavItem>
      )}
    </>
  );

  const adminLinks = (
    <>
      <NavItem dark={darkNav} to="/admin/dashboard" onClick={close}><ShieldCheckIcon className="h-4 w-4" /><span>Admin Dashboard</span></NavItem>
      <NavItem dark={darkNav} to="/admin/events" onClick={close}><CalendarDaysIcon className="h-4 w-4" /><span>Events</span></NavItem>
      <NavItem dark={darkNav} to="/admin/reports" onClick={close}><InformationCircleIcon className="h-4 w-4" /><span>Reports</span></NavItem>
    </>
  );

  const authLinks = isAdminArea ? (
    <li>
      <button type="button" className={`font-medium ${linkTone}`} onClick={() => { close(); onLogout(); }}>
        Log out
      </button>
    </li>
  ) : profile ? (
    <>
      <li>
        <Link to="/profile" onClick={close} className={`inline-flex items-center gap-2 font-medium ${linkTone}`}>
          <UserCircleIcon className="h-5 w-5" /> Profile
        </Link>
      </li>
      <li>
        <button type="button" className={`font-medium ${linkTone}`} onClick={() => { close(); onLogout(); }}>
          Log out
        </button>
      </li>
    </>
  ) : (
    <>
      <li>
        <Link to="/login" onClick={close} className={`font-medium ${linkTone}`}>Log In</Link>
      </li>
      <li>
        <Link
          to="/signup"
          onClick={close}
          className="rounded-full border-2 px-4 py-1.5 font-semibold transition-colors"
          style={{ borderColor: BRAND_ORANGE, color: darkNav ? '#fff' : BRAND_ORANGE }}
        >
          Create Account
        </Link>
      </li>
    </>
  );

  const mobilePublicItems = [
    { key: 'home', to: '/', end: true, icon: HomeIcon, label: 'Home' },
    { key: 'events', to: '/events', icon: CalendarDaysIcon, label: 'Explore' },
    { key: 'about', to: '/about', icon: InformationCircleIcon, label: 'About' },
    { key: 'contact', to: '/contact', icon: EnvelopeIcon, label: 'Contact' },
    { key: 'faq', to: '/faq', icon: QuestionMarkCircleIcon, label: 'FAQ' },
    ...(profile
      ? [{ key: 'regs', to: '/my-registrations', icon: TicketIcon, label: 'My Registrations' }]
      : []),
    ...(profile?.role === 'admin'
      ? [{ key: 'admin', to: '/admin/dashboard', icon: ShieldCheckIcon, label: 'Admin Dashboard' }]
      : []),
  ];

  const mobileAdminItems = [
    { key: 'dash', to: '/admin/dashboard', icon: ShieldCheckIcon, label: 'Admin Dashboard' },
    { key: 'admin-events', to: '/admin/events', icon: CalendarDaysIcon, label: 'Events' },
    { key: 'reports', to: '/admin/reports', icon: InformationCircleIcon, label: 'Reports' },
  ];

  const mobileNavItems = isAdminArea ? mobileAdminItems : mobilePublicItems;

  return (
    <MTNavbar
      shadow={false}
      fullWidth
      blurred={false}
      color={darkNav ? 'transparent' : 'white'}
      className={`fixed top-0 z-50 border-0 ${darkNav ? 'bg-[#111111]/95 backdrop-blur-md' : 'bg-white shadow-sm'}`}
      style={{ '--brand-orange': BRAND_ORANGE }}
    >
      <div className="container mx-auto flex items-center justify-between px-2">
        <Link to={brandTo} onClick={close} className="flex items-center gap-2.5">
          <img src="/images/logo-nowshera-n.png" alt="" className="h-9 w-9 object-contain" />
          <span className={`text-base font-bold tracking-wide ${darkNav ? 'text-white' : 'text-gray-900'}`}>
            NOWSHERA <span style={{ color: BRAND_ORANGE }}>EVENTS</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className={`ml-6 flex items-center gap-6 ${linkTone}`}>
            {isAdminArea ? adminLinks : publicLinks}
            {authLinks}
          </ul>
        </nav>

        <ZoomHover className="ml-auto inline-flex lg:hidden" scale={1.12}>
          <IconButton
            variant="text"
            color={btnColor}
            onClick={() => setOpen((cur) => !cur)}
            className="relative"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? 'close' : 'open'}
                className="inline-flex"
                initial={animate ? { opacity: 0, scale: 0.6, rotate: -90 } : false}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={animate ? { opacity: 0, scale: 0.6, rotate: 90 } : undefined}
                transition={{ type: 'spring', stiffness: 480, damping: 26 }}
              >
                {open
                  ? <XMarkIcon strokeWidth={2} className="h-6 w-6" />
                  : <Bars3Icon strokeWidth={2} className="h-6 w-6" />}
              </motion.span>
            </AnimatePresence>
          </IconButton>
        </ZoomHover>
      </div>

      <Collapse open={open}>
        <motion.div
          className={`container mx-auto mt-4 origin-top rounded-lg px-6 py-5 ${darkNav ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-900'}`}
          initial={animate ? { opacity: 0, scale: 0.94, y: -10 } : false}
          animate={open ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.94, y: -10 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        >
          <nav aria-label="Mobile">
            <motion.ul
              className="flex flex-col gap-4"
              variants={animate ? menuContainer : undefined}
              initial={animate ? 'hidden' : false}
              animate={open && animate ? 'show' : 'hidden'}
            >
              {mobileNavItems.map(({ key, to, end, icon: Icon, label }) => (
                <MobileNavItem key={key} animate={animate}>
                  <NavLink to={to} end={end} onClick={close} className={mobileLinkClass}>
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </NavLink>
                </MobileNavItem>
              ))}

              {isAdminArea ? (
                <MobileNavItem animate={animate}>
                  <button type="button" className={mobileLinkClass} onClick={() => { close(); onLogout(); }}>
                    Log out
                  </button>
                </MobileNavItem>
              ) : profile ? (
                <>
                  <MobileNavItem animate={animate}>
                    <Link to="/profile" onClick={close} className={mobileLinkClass}>
                      <UserCircleIcon className="h-5 w-5" /> Profile
                    </Link>
                  </MobileNavItem>
                  <MobileNavItem animate={animate}>
                    <button type="button" className={mobileLinkClass} onClick={() => { close(); onLogout(); }}>
                      Log out
                    </button>
                  </MobileNavItem>
                </>
              ) : (
                <>
                  <MobileNavItem animate={animate}>
                    <Link to="/login" onClick={close} className={mobileLinkClass}>Log In</Link>
                  </MobileNavItem>
                  <MobileNavItem animate={animate}>
                    <Link to="/signup" onClick={close} className={mobileLinkClass} style={{ color: BRAND_ORANGE }}>
                      Create Account
                    </Link>
                  </MobileNavItem>
                </>
              )}
            </motion.ul>
          </nav>
        </motion.div>
      </Collapse>
    </MTNavbar>
  );
}

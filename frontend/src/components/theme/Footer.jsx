import { Link } from 'react-router-dom';
import { Typography, Button } from '@material-tailwind/react';
import { SITE_CONTACT, ContactActionButtons } from '../../pages/PublicPages';
import { ZoomHover } from '../Motion';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer({ profile }) {
  return (
    <footer className="p-10 pb-5 md:pt-10" role="contentinfo">
      <div className="container mx-auto flex flex-col">
        <div className="mb-5 flex !w-full max-w-6xl flex-col !items-center justify-center rounded-2xl bg-gray-900 p-5 py-10 md:mb-20 md:mx-auto">
          <Typography className="text-center text-2xl font-bold md:text-3xl" color="white">
            Find your next seat.
          </Typography>
          <Typography color="white" className="my-3 text-center !text-base md:w-7/12">
            Explore the calendar, create an account, or message us if you need help with a registration.
          </Typography>
          <div className="mt-2 flex w-full flex-col gap-3 md:w-fit md:flex-row">
            <ZoomHover>
              <Link to="/events"><Button color="white" size="md">Browse the calendar</Button></Link>
            </ZoomHover>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Typography as={Link} to="/" variant="h6" className="mb-3 text-gray-900">
              Nowshera Events.
            </Typography>
            <Typography className="mb-4 !text-sm !font-normal !text-gray-700">
              A professional event registration platform for discovering gatherings, reserving seats, and managing plans in one place.
            </Typography>
            <ContactActionButtons compact className="footer-contact-actions" />
          </div>
          <div className="flex flex-col gap-2">
            <Typography variant="small" className="mb-1 font-semibold text-gray-900">Explore</Typography>
            <Typography as={Link} to="/events" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">Explore Events</Typography>
            <Typography as={Link} to="/about" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">About Us</Typography>
            <Typography as={Link} to="/ceo" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">CEO</Typography>
            <Typography as={Link} to="/contact" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">Contact Us</Typography>
            <Typography as={Link} to="/faq" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">FAQ</Typography>
          </div>
          <div className="flex flex-col gap-2">
            <Typography variant="small" className="mb-1 font-semibold text-gray-900">Legal &amp; account</Typography>
            <Typography as={Link} to="/privacy-policy" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">Privacy Policy</Typography>
            <Typography as={Link} to="/terms" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">Terms &amp; Conditions</Typography>
            <Typography as={Link} to="/login" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">Login</Typography>
            <Typography as={Link} to="/signup" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">Create Account</Typography>
            {!profile && (
              <Typography as={Link} to="/admin/login" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">Admin Login</Typography>
            )}
            {profile && (
              <>
                <Typography as={Link} to="/profile" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">Profile</Typography>
                <Typography as={Link} to="/my-registrations" variant="small" className="font-normal !text-gray-700 hover:!text-gray-900">My Registrations</Typography>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Typography variant="small" className="mb-1 font-semibold text-gray-900">Contact</Typography>
            <Typography variant="small" className="font-normal !text-gray-700">
              WhatsApp:{' '}
              <a href={SITE_CONTACT.WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">
                {SITE_CONTACT.WHATSAPP_DISPLAY}
              </a>
            </Typography>
            <Typography variant="small" className="font-normal !text-gray-700">
              Gmail:{' '}
              <a href={SITE_CONTACT.GMAIL_URL} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">
                {SITE_CONTACT.EMAIL}
              </a>
            </Typography>
          </div>
        </div>

        <Typography color="blue-gray" className="mt-12 text-center font-normal !text-gray-700">
          © {CURRENT_YEAR} Nowshera Events Co. All rights reserved.
        </Typography>
        <Typography className="text-center font-normal !text-gray-700">
          Visual system adapted from{' '}
          <a className="font-semibold text-gray-900" href="https://www.material-tailwind.com" target="_blank" rel="noreferrer">
            Material Tailwind
          </a>
          .
        </Typography>
      </div>
    </footer>
  );
}

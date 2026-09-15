import { Link } from 'react-router-dom';
import {
  Typography,
  Card,
  CardHeader,
  CardBody,
} from '@material-tailwind/react';
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
} from '@heroicons/react/24/solid';
import { CapacityBar, StatusBadge } from '../ui';
import { TitleFloat, ZoomHover } from '../Motion';
import { eventCoverImage } from '../../eventImages';

const viewDetailsClass =
  'inline-flex items-center justify-center rounded-lg border-2 border-black bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-black transition hover:bg-gray-50 sm:px-4 sm:text-xs';

const registerClass =
  'inline-flex items-center justify-center rounded-lg border-2 border-[#FF7A1A] bg-black px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white transition hover:opacity-90 sm:px-4 sm:text-xs';

export default function EventCard({ event }) {
  const image = eventCoverImage(event);
  const closed = event.status !== 'published' || event.available_spots < 1;
  const used = Math.max((event.capacity || 0) - (event.available_spots || 0), 0);

  return (
    <Card className="flex h-full flex-col overflow-hidden border border-blue-gray-50 shadow-md shadow-blue-gray-900/5">
      <CardHeader floated={false} shadow={false} className="m-0 h-48 shrink-0 rounded-none">
        <img src={image} alt="" className="h-full w-full object-cover" />
      </CardHeader>
      <CardBody className="flex flex-1 flex-col gap-3 p-5">
        <div className="shrink-0">
          <StatusBadge status={event.status} />
        </div>

        <TitleFloat className="line-clamp-2 min-h-[3.5rem] text-xl font-semibold leading-snug tracking-normal">
          {event.title}
        </TitleFloat>

        <Typography className="line-clamp-2 min-h-[2.75rem] font-normal !text-gray-500">
          {event.description || 'An experience designed for curious people.'}
        </Typography>

        <div className="flex shrink-0 flex-col gap-1 text-sm text-blue-gray-600">
          <span className="inline-flex min-h-5 items-center gap-1.5 truncate">
            <CalendarDaysIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{event.event_date}</span>
          </span>
          <span className="inline-flex min-h-5 items-center gap-1.5 truncate">
            <ClockIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{String(event.event_time || '').slice(0, 5)}</span>
          </span>
          <span className="inline-flex min-h-5 items-center gap-1.5 truncate">
            <MapPinIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{event.location}</span>
          </span>
        </div>

        <div className="shrink-0">
          <CapacityBar used={used} capacity={event.capacity} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <ZoomHover>
            <Link to={`/events/${event.id}`} className={viewDetailsClass}>
              View details →
            </Link>
          </ZoomHover>
          <ZoomHover>
            <Link to={`/events/${event.id}`} className={registerClass}>
              {closed ? 'View status' : 'Register'}
            </Link>
          </ZoomHover>
        </div>
      </CardBody>
    </Card>
  );
}

import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Shield,
  Ticket,
  User,
  Users,
  X,
} from 'lucide-react';

const defaults = { size: 16, strokeWidth: 1.75, 'aria-hidden': true };

export const Icons = {
  Alert: (props) => <AlertCircle {...defaults} {...props} />,
  ArrowRight: (props) => <ArrowRight {...defaults} {...props} />,
  ArrowUpRight: (props) => <ArrowUpRight {...defaults} {...props} />,
  Calendar: (props) => <Calendar {...defaults} {...props} />,
  Check: (props) => <CheckCircle2 {...defaults} {...props} />,
  Clock: (props) => <Clock {...defaults} {...props} />,
  Dashboard: (props) => <LayoutDashboard {...defaults} {...props} />,
  LogIn: (props) => <LogIn {...defaults} {...props} />,
  LogOut: (props) => <LogOut {...defaults} {...props} />,
  Mail: (props) => <Mail {...defaults} {...props} />,
  MapPin: (props) => <MapPin {...defaults} {...props} />,
  Menu: (props) => <Menu {...defaults} {...props} />,
  Message: (props) => <MessageCircle {...defaults} {...props} />,
  Shield: (props) => <Shield {...defaults} {...props} />,
  Ticket: (props) => <Ticket {...defaults} {...props} />,
  User: (props) => <User {...defaults} {...props} />,
  Users: (props) => <Users {...defaults} {...props} />,
  Close: (props) => <X {...defaults} {...props} />,
};

export function StatusBadge({ status, className = '' }) {
  const tone = String(status || '').toLowerCase();
  return <span className={`tag tag-${tone} ${className}`.trim()}>{status}</span>;
}

export function CapacityBar({ used = 0, capacity = 0 }) {
  const safeCapacity = Math.max(Number(capacity) || 0, 0);
  const safeUsed = Math.min(Math.max(Number(used) || 0, 0), safeCapacity || 0);
  const remaining = Math.max(safeCapacity - safeUsed, 0);
  const pct = safeCapacity ? Math.round((safeUsed / safeCapacity) * 100) : 0;
  return (
    <div className="capacity-meter" aria-label={`${remaining} of ${safeCapacity} seats available`}>
      <div className="capacity-track">
        <span className="capacity-fill" style={{ width: `${pct}%` }} />
      </div>
      <small>{remaining} of {safeCapacity} spots left</small>
    </div>
  );
}

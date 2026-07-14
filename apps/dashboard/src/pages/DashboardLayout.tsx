import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  CreditCard,
  LayoutDashboard,
  Users,
  Webhook,
  Terminal,
  Settings,
  LogOut,
  Zap } from
'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LiveErrorBanner } from '../components/DataStates';
import { useAuth } from '../lib/auth-context';
import { useData } from '../lib/useData';
const navItems = [
{
  name: 'Overview',
  href: '/',
  icon: LayoutDashboard
},
{
  name: 'Services',
  href: '/services',
  icon: Settings
},
{
  name: 'Customers',
  href: '/customers',
  icon: Users
},
{
  name: 'Payment Requests',
  href: '/payments',
  icon: CreditCard
},
{
  name: 'Usage Events',
  href: '/usage',
  icon: Activity
},
{
  name: 'Webhooks',
  href: '/webhooks',
  icon: Webhook
},
{
  name: 'Quickstart',
  href: '/quickstart',
  icon: Terminal
}];

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { demoMode, developer, logout } = useAuth();
  const { isLive, isLoading, error } = useData();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen w-full bg-zinc-50/50">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-zinc-200 bg-white sm:flex">
        <div className="flex h-14 items-center border-b border-zinc-200 px-4 lg:h-[60px] lg:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Zap className="h-6 w-6 text-blue-600" />
            <span className="text-lg">FiberMeter</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-4 text-sm font-medium">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
              location.pathname === item.href ||
              item.href !== '/' && location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 transition-all hover:text-zinc-900',
                    isActive ? 'bg-zinc-100 text-zinc-900' : ''
                  )}>

                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>);

            })}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className="rounded-xl bg-blue-50 p-4 text-sm">
            <div className="mb-2 font-semibold text-blue-900">Try the demo app</div>
            <p className="text-blue-700 mb-3">
              A sample AI Summary API that meters usage through FiberMeter.
            </p>
            <Link
              to="/demo-service"
              className="text-blue-700 font-medium hover:underline flex items-center gap-1">

              Open Demo Service <Zap className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col sm:pl-64">
        <header className="flex h-14 items-center gap-4 border-b border-zinc-200 bg-white px-4 lg:h-[60px] lg:px-6">
          <div className="w-full flex-1">
            {demoMode ?
            <Badge
              variant="outline"
              className="bg-amber-100 text-amber-800 border-amber-200">

                Demo Mode · in-browser engine
              </Badge> :

            <Badge
              variant="outline"
              className="bg-green-100 text-green-800 border-green-200">

                Live · connected to API
              </Badge>
            }
          </div>
          <div className="flex items-center gap-3 text-sm">
            {!demoMode && developer &&
            <span className="hidden text-zinc-500 sm:inline">{developer.email}</span>
            }
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1.5 h-4 w-4" />
              {demoMode ? 'Exit demo' : 'Sign out'}
            </Button>
          </div>
        </header>
        {isLive && isLoading &&
        <div className="h-0.5 w-full overflow-hidden bg-blue-100">
            <div className="h-full w-1/3 animate-pulse bg-blue-500" />
          </div>
        }
        <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
          <LiveErrorBanner error={error} />
          <Outlet />
        </main>
      </div>
    </div>);

}

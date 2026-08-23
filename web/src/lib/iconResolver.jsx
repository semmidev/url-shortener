import {
  LayoutDashboard as LayoutDashboardIcon,
  Link2 as Link2Icon,
  BarChart3 as BarChart3Icon,
  ShieldAlert as ShieldAlertIcon,
  ShieldCheck as ShieldCheckIcon,
  Users as UsersIcon,
  User as UserIcon,
  UserCog as UserCogIcon,
  KeyRound as KeyRoundIcon,
  Menu as MenuIcon,
  Globe as GlobeIcon,
  FileText as FileTextIcon,
  Sliders as SlidersIcon,
  Settings as SettingsIcon,
  Zap as ZapIcon,
  BarChart as BarChartIcon,
  Home as HomeIcon,
  Link as LinkIcon,
  Star as StarIcon,
  Bookmark as BookmarkIcon,
  Bell as BellIcon,
  Lock as LockIcon,
  Shield as ShieldIcon,
  ChartBar as ChartBarIcon,
  Activity as ActivityIcon,
  Database as DatabaseIcon,
  Code as CodeIcon,
  Search as SearchIcon,
  List as ListIcon,
  Filter as FilterIcon,
  AlertTriangle as AlertTriangleIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
} from 'lucide-react';

const iconMap = {
  // Dashboard
  LayoutDashboard: LayoutDashboardIcon,
  Home: HomeIcon,

  // Links
  Link: Link2Icon,
  Link2: Link2Icon,
  LinkIcon: LinkIcon,

  // Analytics
  BarChart3: BarChart3Icon,
  BarChart: BarChartIcon,
  Activity: ActivityIcon,

  // Admin / Security
  ShieldAlert: ShieldAlertIcon,
  ShieldCheck: ShieldCheckIcon,
  Shield: ShieldIcon,
  Lock: LockIcon,
  KeyRound: KeyRoundIcon,

  // Users
  Users: UsersIcon,
  User: UserIcon,
  UserCog: UserCogIcon,

  // Navigation / Menus
  Menu: MenuIcon,

  // Global / Links
  Globe: GlobeIcon,

  // Audit
  FileText: FileTextIcon,

  // System Config
  Sliders: SlidersIcon,
  Settings: SettingsIcon,
  Database: DatabaseIcon,

  // Utility
  Zap: ZapIcon,
  Star: StarIcon,
  Bookmark: BookmarkIcon,
  Bell: BellIcon,
  Code: CodeIcon,
  Search: SearchIcon,
  List: ListIcon,
  Filter: FilterIcon,
  AlertTriangle: AlertTriangleIcon,
  Info: InfoIcon,
  CheckCircle: CheckCircleIcon,
};

/**
 * Resolve a string icon name from the database into a Lucide React component.
 * @param {string} name - The icon name stored in navigation_menus.icon
 * @param {object} props - Props to pass to the icon component (e.g. className)
 * @returns JSX element or null
 */
export function resolveIcon(name, props = {}) {
  if (!name) return null;
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}

export default iconMap;

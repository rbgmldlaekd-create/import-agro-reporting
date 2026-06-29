import React from 'react';
import {
  PieChart,
  ChevronLeft,
  ChevronRight,
  Menu,
  Database,
  LogOut,
  FileSpreadsheet,
  HelpCircle,
  Plus,
  Trash2,
  Download,
  Search,
  Calendar,
  Layers,
  AlertCircle,
  FileText,
  PlayCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Settings,
  X
} from 'lucide-react';

const iconMapping = {
  'pie-chart': PieChart,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'menu': Menu,
  'database': Database,
  'log-out': LogOut,
  'file-spreadsheet': FileSpreadsheet,
  'help-circle': HelpCircle,
  'plus': Plus,
  'trash-2': Trash2,
  'download': Download,
  'search': Search,
  'calendar': Calendar,
  'layers': Layers,
  'alert-circle': AlertCircle,
  'file-text': FileText,
  'play-circle': PlayCircle,
  'check-circle': CheckCircle2,
  'x-circle': XCircle,
  'trending-up': TrendingUp,
  'settings': Settings,
  'x': X
};

const Icon = ({ name, className = '', ...props }) => {
  // Safe fallback if icon name is missing
  const LucideIcon = iconMapping[name] || HelpCircle;
  return <LucideIcon className={className} {...props} />;
};

export default Icon;
export { iconMapping };

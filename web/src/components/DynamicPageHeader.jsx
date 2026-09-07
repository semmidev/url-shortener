import React from 'react';
import { useLocation } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { resolveIcon } from '@/lib/iconResolver';

/**
 * Recursively find menu item in tree matching path.
 */
function findMenuItem(items, targetPath) {
  if (!items || !Array.isArray(items)) return null;

  for (const item of items) {
    if (item.path && item.path === targetPath) return item;
    if (item.children && item.children.length > 0) {
      const found = findMenuItem(item.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Custom hook to dynamically resolve the menu icon matching current or target path.
 */
export function useDynamicMenuIcon(customPath, fallbackIcon = null, props = { className: 'size-7 text-primary shrink-0' }) {
  const { pathname } = useLocation();
  const { menus } = usePermission();
  const targetPath = customPath || pathname;

  const menuItem = findMenuItem(menus, targetPath);
  if (menuItem?.icon) {
    const iconNode = resolveIcon(menuItem.icon, props);
    if (iconNode) return iconNode;
  }

  if (fallbackIcon) {
    const Fallback = fallbackIcon;
    return <Fallback {...props} />;
  }

  return null;
}

/**
 * Reusable dynamic page header component with DB menu icon sync.
 */
export function DynamicPageHeader({
  title,
  subtitle,
  description,
  path: customPath,
  fallbackIcon,
  iconSize = 'size-7',
  className = 'flex flex-col sm:flex-row sm:items-center justify-between gap-4',
  titleClassName = 'text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5',
  actions,
  actionButton,
  action,
  children,
}) {
  const iconNode = useDynamicMenuIcon(customPath, fallbackIcon, { className: `${iconSize} text-primary shrink-0` });
  const subText = subtitle || description;
  const actionNodes = actions || actionButton || action || children;

  return (
    <div className={className}>
      <div>
        <h1 className={titleClassName}>
          {iconNode}
          <span>{title}</span>
        </h1>
        {subText && <p className="text-sm text-muted-foreground mt-1">{subText}</p>}
      </div>
      {actionNodes && <div className="flex items-center gap-2">{actionNodes}</div>}
    </div>
  );
}

export default DynamicPageHeader;

-- 1. Seed System Roles
INSERT INTO roles (id, name, display_name, description, is_system) VALUES
('00000000-0000-0000-0000-000000000001', 'superadmin', 'Super Administrator', 'Full system access and security administration', true),
('00000000-0000-0000-0000-000000000002', 'admin', 'Administrator', 'Administrative access for system overview and management', true),
('00000000-0000-0000-0000-000000000003', 'user', 'Regular User', 'Standard user with short link creation capabilities', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Permissions
INSERT INTO permissions (code, module, action, description) VALUES
('admin.dashboard.read', 'dashboard', 'read', 'View executive admin dashboard and metrics'),
('users.read', 'users', 'read', 'View users list and account details'),
('users.suspend', 'users', 'suspend', 'Suspend or unsuspend user accounts'),
('users.roles.update', 'users', 'update_role', 'Change assigned role of users'),
('users.sessions.revoke', 'users', 'revoke_session', 'Revoke active sessions of users'),
('roles.read', 'roles', 'read', 'View roles and permission matrices'),
('roles.create', 'roles', 'create', 'Create custom roles'),
('roles.permissions.update', 'roles', 'update_permissions', 'Update role permissions mapping'),
('menus.read', 'menus', 'read', 'View navigation menu structure'),
('menus.create', 'menus', 'create', 'Create new navigation menu items'),
('menus.update', 'menus', 'update', 'Reorder or modify navigation menu items'),
('links.read', 'links', 'read', 'View global URLs list'),
('links.ban', 'links', 'ban', 'Ban or unban malicious short links global oversight'),
('audit.read', 'audit', 'read', 'View security audit trail logs'),
('system.config.read', 'system', 'read_config', 'View system configurations and feature flags'),
('system.config.update', 'system', 'update_config', 'Modify system configurations and feature flags')
ON CONFLICT (code) DO NOTHING;

-- 3. Map all permissions to superadmin and admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('superadmin', 'admin')
ON CONFLICT DO NOTHING;

-- 4. Seed Default Users (Password: password)
INSERT INTO users (id, email, password_hash, full_name, role, is_suspended) VALUES
('01a03158-2a33-7c0e-96ba-e839d6c95501', 'superadmin@gmail.com', '$2a$10$4A1xBRjGT6FvrBcu8gEU0u4QLip9gawlD4agU2f.KK23/8WLmP6hq', 'Super Administrator', 'superadmin', false),
('01a03158-2a33-7c0e-96ba-e839d6c95521', 'admin@gmail.com', '$2a$10$4A1xBRjGT6FvrBcu8gEU0u4QLip9gawlD4agU2f.KK23/8WLmP6hq', 'System Administrator', 'admin', false),
('01a03158-2a33-7c0e-96ba-e839d6c95531', 'sammidev4@gmail.com', '$2a$10$4A1xBRjGT6FvrBcu8gEU0u4QLip9gawlD4agU2f.KK23/8WLmP6hq', 'John Doe', 'user', false)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    is_suspended = false;

-- 5. Seed Dynamic Navigation Groups and Menus
-- Section Groups (Top level, is_group = true)
INSERT INTO navigation_menus (id, parent_id, title, path, icon, order_index, is_active, is_group, permission_code) VALUES
('10000000-0000-0000-0000-000000000101', NULL, 'Home', '', 'Home', 0, true, true, NULL),
('10000000-0000-0000-0000-000000000102', NULL, 'Links', '', 'Link', 1, true, true, NULL),
('10000000-0000-0000-0000-000000000103', NULL, 'Administration', '', 'ShieldCheck', 2, true, true, 'admin.dashboard.read'),
('10000000-0000-0000-0000-000000000104', NULL, 'Settings', '', 'Settings', 3, true, true, NULL)
ON CONFLICT (id) DO NOTHING;

-- Menus under Home Group
INSERT INTO navigation_menus (id, parent_id, title, path, icon, order_index, is_active, is_group, permission_code) VALUES
('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000101', 'Overview', '/dashboard', 'LayoutDashboard', 0, true, false, NULL)
ON CONFLICT (id) DO NOTHING;

-- Menus under Links Group
INSERT INTO navigation_menus (id, parent_id, title, path, icon, order_index, is_active, is_group, permission_code) VALUES
('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000102', 'My Links', '/dashboard/urls', 'Link', 0, true, false, NULL),
('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000102', 'Analytics', '/dashboard/analytics', 'BarChart3', 1, true, false, NULL)
ON CONFLICT (id) DO NOTHING;

-- Menus under Administration Group (All 7 Admin Modules directly listed)
INSERT INTO navigation_menus (id, parent_id, title, path, icon, order_index, is_active, is_group, permission_code) VALUES
('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000103', 'Overview', '/dashboard/admin', 'LayoutDashboard', 0, true, false, 'admin.dashboard.read'),
('10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000103', 'Users Lifecycle', '/dashboard/admin/users', 'UserCog', 1, true, false, 'users.read'),
('10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000103', 'Roles & RBAC', '/dashboard/admin/roles', 'KeyRound', 2, true, false, 'roles.read'),
('10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000103', 'Menu Builder', '/dashboard/admin/menus', 'Menu', 3, true, false, 'menus.read'),
('10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000103', 'Global Link Control', '/dashboard/admin/links', 'Globe', 4, true, false, 'links.read'),
('10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000103', 'Audit Trail Logs', '/dashboard/admin/audit-logs', 'FileText', 5, true, false, 'audit.read'),
('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000103', 'System Config', '/dashboard/admin/system', 'Sliders', 6, true, false, 'system.config.read')
ON CONFLICT (id) DO NOTHING;

-- Menus under Settings Group
INSERT INTO navigation_menus (id, parent_id, title, path, icon, order_index, is_active, is_group, permission_code) VALUES
('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000104', 'Account Profile', '/dashboard/account', 'User', 0, true, false, NULL)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Sample Short URLs
INSERT INTO short_urls (id, user_id, short_code, original_url, title, is_active, click_count) VALUES
('20000000-0000-0000-0000-000000000001', '01a03158-2a33-7c0e-96ba-e839d6c95521', 'github-repo', 'https://github.com/semmidev/url-shortener', 'URL Shortener Repository', true, 12),
('20000000-0000-0000-0000-000000000002', '01a03158-2a33-7c0e-96ba-e839d6c95531', 'golang-spec', 'https://go.dev/doc/', 'Go Programming Language Documentation', true, 8),
('20000000-0000-0000-0000-000000000003', '01a03158-2a33-7c0e-96ba-e839d6c95531', 'scalar-ui', 'https://github.com/scalar/scalar', 'Scalar API Reference UI', true, 15)
ON CONFLICT (short_code) DO NOTHING;

-- 7. Seed Default System Configurations
INSERT INTO system_configs (key, value, description) VALUES
('app_info', '{"app_name": "URL Shortener Enterprise", "description": "High performance link management platform", "support_email": "support@example.com"}', 'General application branding information'),
('feature_flags', '{"allow_public_registration": true, "enable_custom_slug": true, "enable_qr_code": true, "maintenance_mode": false}', 'Global system feature toggles'),
('rate_limits', '{"clicks_per_sec": 100, "shortens_per_min": 30}', 'Default system-wide API rate limiting thresholds')
ON CONFLICT (key) DO NOTHING;

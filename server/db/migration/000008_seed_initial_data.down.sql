DELETE FROM system_configs WHERE key IN ('app_info', 'feature_flags', 'rate_limits');
DELETE FROM short_urls WHERE id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003');
DELETE FROM navigation_menus;
DELETE FROM users WHERE email IN ('superadmin@gmail.com', 'admin@gmail.com', 'sammidev4@gmail.com');
DELETE FROM role_permissions;
DELETE FROM permissions;
DELETE FROM roles;

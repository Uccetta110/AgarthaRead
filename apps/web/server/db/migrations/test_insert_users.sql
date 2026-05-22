-- Insert test user if not exists
INSERT INTO users (email, username, full_name, country_code, birth_date)
SELECT 'testuser@example.com','testuser','Test User','IT','1990-01-01' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='testuser@example.com');

-- Insert session for test user
INSERT INTO user_sessions (userId, sessionToken, ip, userAgent, deviceLabel, expiresAt)
SELECT id, 'testsessiontoken1', '127.0.0.1', 'curl', 'test', DATE_ADD(NOW(), INTERVAL 7 DAY)
FROM users WHERE email='testuser@example.com'
ON DUPLICATE KEY UPDATE session_token=sessionToken;

-- Insert admin user if not exists
INSERT INTO users (email, username, full_name, country_code, birth_date, role)
SELECT 'admin@example.com','adminuser','Admin User','IT','1985-01-01','admin' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@example.com');

-- Insert session for admin
INSERT INTO user_sessions (userId, sessionToken, ip, userAgent, deviceLabel, expiresAt)
SELECT id, 'adminsessiontoken1', '127.0.0.1', 'curl', 'admin-test', DATE_ADD(NOW(), INTERVAL 7 DAY)
FROM users WHERE email='admin@example.com'
ON DUPLICATE KEY UPDATE session_token=sessionToken;

-- Insert manager candidate if not exists
INSERT INTO users (email, username, full_name, country_code, birth_date)
SELECT 'manager_candidate@example.com','managercand','Manager Candidate','IT','1992-01-01' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='manager_candidate@example.com');

-- Insert session for manager candidate
INSERT INTO user_sessions (userId, sessionToken, ip, userAgent, deviceLabel, expiresAt)
SELECT id, 'managercandtoken1', '127.0.0.1', 'curl', 'manager-test', DATE_ADD(NOW(), INTERVAL 7 DAY)
FROM users WHERE email='manager_candidate@example.com'
ON DUPLICATE KEY UPDATE session_token=sessionToken;

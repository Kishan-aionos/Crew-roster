-- roster_full_setup_tidb.sql
-- TiDB / MySQL-compatible schema + sample data (compatible with TiDB Serverless)
-- No DEFAULT on TEXT columns, no generated columns, no JSON column defaults.

DROP DATABASE IF EXISTS roster_db;
CREATE DATABASE roster_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE roster_db;

-- crew_members
CREATE TABLE crew_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crew_code VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('pilot','cabin') NOT NULL,
  `rank` VARCHAR(60),
  base_airport VARCHAR(10),
  qualifications TEXT,
  phone VARCHAR(20),
  email VARCHAR(120),
  passport_no VARCHAR(50),
  medical_valid_until DATE,
  `status` ENUM('active','inactive') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- pilots_extra
CREATE TABLE pilots_extra (
  crew_id INT PRIMARY KEY,
  license_type VARCHAR(50),
  total_flight_hours INT DEFAULT 0,
  pic_hours TEXT,
  FOREIGN KEY (crew_id) REFERENCES crew_members(id) ON DELETE CASCADE
);

-- flights
CREATE TABLE flights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_no VARCHAR(20) NOT NULL,
  flight_date DATE NOT NULL,
  dep_airport VARCHAR(10) NOT NULL,
  arr_airport VARCHAR(10) NOT NULL,
  dep_time DATETIME NOT NULL,
  arr_time DATETIME NOT NULL,
  aircraft_type VARCHAR(20) NOT NULL,
  seats INT NOT NULL,
  required_pilots INT NOT NULL DEFAULT 2,
  required_cabin INT NOT NULL,
  status ENUM('scheduled','delayed','cancelled') DEFAULT 'scheduled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- rosters
CREATE TABLE rosters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_id INT NOT NULL,
  crew_id INT NOT NULL,
  role_on_flight VARCHAR(60),
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('assigned','standby','released') DEFAULT 'assigned',
  created_by VARCHAR(100),
  FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
  FOREIGN KEY (crew_id) REFERENCES crew_members(id) ON DELETE CASCADE
);

-- duty_blocks
CREATE TABLE duty_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crew_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  total_minutes INT DEFAULT 0,
  notes VARCHAR(255),
  FOREIGN KEY (crew_id) REFERENCES crew_members(id) ON DELETE CASCADE
);

-- crew_preferences
CREATE TABLE crew_preferences (
  crew_id INT PRIMARY KEY,
  preferences TEXT,
  FOREIGN KEY (crew_id) REFERENCES crew_members(id) ON DELETE CASCADE
);

-- crew_requests
CREATE TABLE crew_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crew_id INT NOT NULL,
  request_type ENUM('day_off','swap','standby_off','other') NOT NULL,
  request_data TEXT,
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending','approved','denied','auto_approved') DEFAULT 'pending',
  FOREIGN KEY (crew_id) REFERENCES crew_members(id) ON DELETE CASCADE
);

-- disruptions
CREATE TABLE disruptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_id INT NOT NULL,
  type ENUM('delay','cancel') NOT NULL,
  reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(255),
  est_resumption DATETIME,
  FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
);

-- standby_assignments
CREATE TABLE standby_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crew_id INT NOT NULL,
  base_airport VARCHAR(10),
  standby_date DATE NOT NULL,
  standby_type ENUM('airport','home') DEFAULT 'home',
  ready_within_minutes INT DEFAULT 90,
  notes VARCHAR(255),
  FOREIGN KEY (crew_id) REFERENCES crew_members(id) ON DELETE CASCADE
);

-- audit_logs
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor VARCHAR(100),
  action VARCHAR(255),
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- crew_leaves
CREATE TABLE crew_leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crew_id INT NOT NULL,
  leave_type ENUM('paid','unpaid','sick','other') DEFAULT 'paid',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending','approved','denied') DEFAULT 'approved',
  reason VARCHAR(255),
  approved_by VARCHAR(100),
  FOREIGN KEY (crew_id) REFERENCES crew_members(id) ON DELETE CASCADE
);

-- availability_cache
CREATE TABLE availability_cache (
  crew_id INT PRIMARY KEY,
  date DATE NOT NULL,
  is_available TINYINT(1) DEFAULT 1,
  reason VARCHAR(255),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (crew_id) REFERENCES crew_members(id) ON DELETE CASCADE
);

-- --------------------------
-- Seed crew members (TEXT used for qualifications)
-- --------------------------
INSERT INTO crew_members (crew_code, full_name, role, `rank`, base_airport, qualifications, phone, email, passport_no, medical_valid_until)
VALUES
('P001','Amit Verma','pilot','Captain','DEL', '["A320"]', '9999000001','amit.verma@example.com','PPT001','2026-08-30'),
('P002','Rahul Sharma','pilot','First Officer','DEL', '["A320"]', '9999000002','rahul.sharma@example.com','PPT002','2026-03-15'),
('P003','Sunil Rao','pilot','Captain','BLR', '["ATR72"]', '9999000003','sunil.rao@example.com','PPT003','2025-12-01'),
('P004','Pooja Singh','pilot','First Officer','BLR', '["ATR72"]', '9999000004','pooja.singh@example.com','PPT004','2026-05-11'),
('P005','Vikram Das','pilot','Captain','DEL', '["A321","A320"]', '9999000005','vikram.das@example.com','PPT005','2027-01-20'),
('C001','Neha Kapoor','cabin','Senior Attendant','DEL', '["A320"]', '9999000010','neha.kapoor@example.com',NULL,'2026-01-20'),
('C002','Ravi Kumar','cabin','Attendant','DEL', '["A320"]', '9999000011','ravi.kumar@example.com',NULL,'2026-04-15'),
('C003','Sonal Mehta','cabin','Attendant','DEL', '["A320"]', '9999000012','sonal.mehta@example.com',NULL,'2026-07-07'),
('C004','Geeta Joshi','cabin','Senior Attendant','BLR', '["ATR72"]', '9999000013','geeta.joshi@example.com',NULL,'2026-02-02'),
('C005','Manish Patel','cabin','Attendant','BLR', '["ATR72"]', '9999000014','manish.patel@example.com',NULL,'2026-06-09'),
('C006','Kavita Rao','cabin','Attendant','DEL', '["A321","A320"]', '9999000015','kavita.rao@example.com',NULL,'2026-09-12'),
('C007','Asha Nair','cabin','Attendant','DEL', '["A320"]', '9999000016','asha.nair@example.com',NULL,'2026-10-05');

INSERT INTO pilots_extra (crew_id, license_type, total_flight_hours, pic_hours)
VALUES
(1,'ATPL',5400, '[{"type":"A320","hours":3200}]'),
(2,'CPL',2100, '[{"type":"A320","hours":500}]'),
(3,'ATPL',4200, '[{"type":"ATR72","hours":2500}]'),
(4,'CPL',1800, '[{"type":"ATR72","hours":400}]'),
(5,'ATPL',6200, '[{"type":"A321","hours":3500}]');

-- --------------------------
-- Seed flights
-- --------------------------
INSERT INTO flights (flight_no, flight_date, dep_airport, arr_airport, dep_time, arr_time, aircraft_type, seats, required_pilots, required_cabin, status)
VALUES
('6E201','2025-09-10','DEL','BOM','2025-09-10 08:00:00','2025-09-10 10:00:00','A320',180,2,4,'scheduled'),
('6E202','2025-09-10','BOM','DEL','2025-09-10 11:30:00','2025-09-10 13:30:00','A320',180,2,4,'scheduled'),
('6E305','2025-09-10','DEL','BLR','2025-09-10 15:00:00','2025-09-10 18:00:00','A321',230,2,5,'scheduled'),
('6E550','2025-09-11','BLR','GAU','2025-09-11 09:00:00','2025-09-11 10:30:00','ATR72',78,2,2,'scheduled'),
('6E551','2025-09-11','GAU','BLR','2025-09-11 11:15:00','2025-09-11 12:45:00','ATR72',78,2,2,'scheduled');

-- standby_assignments
INSERT INTO standby_assignments (crew_id, base_airport, standby_date, standby_type, ready_within_minutes, notes)
VALUES
(2,'DEL','2025-09-10','home',60,'Available for morning flights'),
(5,'DEL','2025-09-10','airport',30,'A321 standby at DEL'),
(4,'BLR','2025-09-11','home',90,'ATR standby'),
(9,'BLR','2025-09-11','airport',45,'Cabin standby at BLR');

-- crew_leaves
INSERT INTO crew_leaves (crew_id, leave_type, start_date, end_date, status, reason, approved_by)
VALUES
(7,'paid','2025-09-10','2025-09-11','approved','Personal leave','CrewMgr1'),
(2,'sick','2025-09-10','2025-09-10','approved','Fever','CrewMgr1');

-- duty_blocks
INSERT INTO duty_blocks (crew_id, start_time, end_time, notes)
VALUES
(1,'2025-09-09 18:00:00','2025-09-09 23:00:00','Night duty prior to sample flights'),
(2,'2025-09-09 19:00:00','2025-09-09 22:00:00','Previous duty'),
(3,'2025-09-10 05:30:00','2025-09-10 07:00:00','Morning regional duty'),
(5,'2025-09-09 16:00:00','2025-09-09 20:00:00','Evening duty'),
(6,'2025-09-09 19:00:00','2025-09-09 23:30:00','Cabin previous duty'),
(7,'2025-09-09 17:00:00','2025-09-09 20:00:00','Cabin previous duty'),
(8,'2025-09-10 06:00:00','2025-09-10 07:30:00','Cabin regional duty');

-- rosters
INSERT INTO rosters (flight_id, crew_id, role_on_flight, status, created_by)
VALUES
(1,1,'Captain','assigned','system'),
(1,2,'First Officer','assigned','system'),
(1,6,'Senior Attendant','assigned','system'),
(1,7,'Attendant','assigned','system'),
(1,8,'Attendant','assigned','system'),
(1,10,'Attendant','assigned','system'),
(2,1,'Captain','assigned','system'),
(2,2,'First Officer','assigned','system'),
(2,6,'Senior Attendant','assigned','system'),
(2,7,'Attendant','assigned','system'),
(2,8,'Attendant','assigned','system'),
(2,10,'Attendant','assigned','system'),
(3,5,'Captain','assigned','system'),
(3,2,'First Officer','assigned','system'),
(3,10,'Senior Attendant','assigned','system'),
(3,6,'Attendant','assigned','system'),
(3,7,'Attendant','assigned','system'),
(3,9,'Attendant','assigned','system'),
(3,11,'Attendant','assigned','system'),
(4,3,'Captain','assigned','system'),
(4,4,'First Officer','assigned','system'),
(4,9,'Senior Attendant','assigned','system'),
(4,10,'Attendant','assigned','system'),
(5,3,'Captain','assigned','system'),
(5,4,'First Officer','assigned','system'),
(5,9,'Senior Attendant','assigned','system'),
(5,10,'Attendant','assigned','system');

-- disruptions
INSERT INTO disruptions (flight_id, type, reported_at, reason, est_resumption)
VALUES
(3,'delay','2025-09-10 13:45:00','ATC slot delay','2025-09-10 16:30:00');

-- crew_preferences
INSERT INTO crew_preferences (crew_id, preferences)
VALUES
(6, '{"preferred_days_off": ["2025-09-12","2025-09-13"], "preferred_routes": ["DEL-BOM"]}'),
(11, '{"preferred_days_off": ["2025-09-15"], "preferred_routes": ["DEL-BLR"]}');

-- crew_requests
INSERT INTO crew_requests (crew_id, request_type, request_data, status)
VALUES
(8,'day_off','{"dates":["2025-09-12","2025-09-13"],"reason":"family event"}','pending');

-- audit log
INSERT INTO audit_logs (actor, action, details)
VALUES
('system','initial_seed','{"info":"Inserted sample flights, crew, rosters, leaves, standby"}');

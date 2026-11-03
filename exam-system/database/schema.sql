-- ============================================================
-- Online Exam System - Full Database Schema
-- Run: mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS online_exam_db;
USE online_exam_db;

-- ── Drop in reverse FK order for clean re-runs ──────────────
DROP TABLE IF EXISTS results;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS users;

-- ── TABLE: users ─────────────────────────────────────────────
CREATE TABLE users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100)  NOT NULL,
    email      VARCHAR(150)  NOT NULL UNIQUE,
    password   VARCHAR(255)  NOT NULL,
    role       ENUM('student','admin') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── TABLE: exams ─────────────────────────────────────────────
CREATE TABLE exams (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    duration_mins INT          NOT NULL DEFAULT 30,
    total_marks   INT          NOT NULL DEFAULT 0,
    pass_percent  INT          NOT NULL DEFAULT 50,
    created_by    INT          NOT NULL,
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_exam_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ── TABLE: questions ─────────────────────────────────────────
CREATE TABLE questions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    exam_id        INT          NOT NULL,
    question_text  TEXT         NOT NULL,
    option_a       VARCHAR(400) NOT NULL,
    option_b       VARCHAR(400) NOT NULL,
    option_c       VARCHAR(400) NOT NULL,
    option_d       VARCHAR(400) NOT NULL,
    correct_option ENUM('A','B','C','D') NOT NULL,
    marks          INT          NOT NULL DEFAULT 1,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_question_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- ── TABLE: results ───────────────────────────────────────────
CREATE TABLE results (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    student_id   INT  NOT NULL,
    exam_id      INT  NOT NULL,
    score        INT  NOT NULL DEFAULT 0,
    total_marks  INT  NOT NULL DEFAULT 0,
    percentage   DECIMAL(5,2) NOT NULL DEFAULT 0,
    passed       TINYINT(1)   NOT NULL DEFAULT 0,
    answers      JSON,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_attempt (student_id, exam_id),
    CONSTRAINT fk_result_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_result_exam    FOREIGN KEY (exam_id)    REFERENCES exams(id)  ON DELETE CASCADE
);

-- ── Triggers: auto-update total_marks ────────────────────────
DROP TRIGGER IF EXISTS after_question_insert;
DROP TRIGGER IF EXISTS after_question_delete;
DROP TRIGGER IF EXISTS after_question_update;

DELIMITER $$
CREATE TRIGGER after_question_insert AFTER INSERT ON questions FOR EACH ROW
BEGIN
  UPDATE exams SET total_marks=(SELECT COALESCE(SUM(marks),0) FROM questions WHERE exam_id=NEW.exam_id) WHERE id=NEW.exam_id;
END$$
CREATE TRIGGER after_question_delete AFTER DELETE ON questions FOR EACH ROW
BEGIN
  UPDATE exams SET total_marks=(SELECT COALESCE(SUM(marks),0) FROM questions WHERE exam_id=OLD.exam_id) WHERE id=OLD.exam_id;
END$$
CREATE TRIGGER after_question_update AFTER UPDATE ON questions FOR EACH ROW
BEGIN
  UPDATE exams SET total_marks=(SELECT COALESCE(SUM(marks),0) FROM questions WHERE exam_id=NEW.exam_id) WHERE id=NEW.exam_id;
END$$
DELIMITER ;

-- ── Seed: default admin (password = admin123) ────────────────
INSERT INTO users (name, email, password, role) VALUES
('Super Admin','admin@exam.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','admin');

-- ── Seed: sample exam ─────────────────────────────────────────
INSERT INTO exams (title, description, duration_mins, pass_percent, created_by) VALUES
('JavaScript Fundamentals','Test your knowledge of core JavaScript concepts.',20, 50, 1),
('Python Basics','Basic Python programming concepts and syntax.',25, 50, 1);

-- ── Seed: questions for exam 1 ───────────────────────────────
INSERT INTO questions (exam_id,question_text,option_a,option_b,option_c,option_d,correct_option,marks) VALUES
(1,'Which keyword is used to declare a variable in modern JavaScript?','var','let','int','dim','B',1),
(1,'What does === check in JavaScript?','Value only','Type only','Value and type','Neither','C',1),
(1,'Which method adds an element to the end of an array?','push()','pop()','shift()','splice()','A',1),
(1,'What is the output of: typeof null','object','null','undefined','string','A',1),
(1,'Which function parses a JSON string?','JSON.stringify()','JSON.parse()','JSON.convert()','JSON.decode()','B',1);

-- ── Seed: questions for exam 2 ───────────────────────────────
INSERT INTO questions (exam_id,question_text,option_a,option_b,option_c,option_d,correct_option,marks) VALUES
(2,'Which keyword defines a function in Python?','function','def','fun','define','B',1),
(2,'What is the output of: print(type([]))','list','array','tuple','dict','A',1),
(2,'Which operator is used for exponentiation in Python?','*','**','^','exp()','B',1),
(2,'How do you start a comment in Python?','//','/*','#','--','C',1),
(2,'What does len() return for a string "Hello"?','4','5','6','Error','B',1);

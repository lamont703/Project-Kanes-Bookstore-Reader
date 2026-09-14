-- ============================================================
-- Employee role — part 1 of 2: the enum value
-- ============================================================
-- Postgres will not let a new enum value be *used* in the same transaction
-- that adds it, and a SQL function body referencing 'employee' is parsed at
-- creation time. So the value lands here on its own and everything that reads
-- it lives in 20260826000001_employee_role_policies.sql.
--
-- Employees sit between reader and admin: they maintain the catalogue (books
-- and merchandise) and can publish, but they cannot delete and cannot see
-- orders, customers, discussions, events, the book club or site pages.
-- ============================================================

ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'employee';

---
layout: post
title: Postgres CLI Command CMDsheet
categories: [cloud, aws]
tags: [Databases, Postgres, CMDsheet]
---

## Introduction

In this blog post, we will explore some commonly used postgres commands that can help you manage your postgres dataabases.

## Postgres Command Cmdsheet

### 1. Database Connection

| Connecting to PostgreSQL | `psql -U username -d database_name` |
| Connecting with Specific Port | `psql -h localhost -p 5432 -U username -d database_name` |

### 2. Database Operations

| List all databases | `\l` |
| Create a new database | `CREATE DATABASE db_name;` |
| Drop a database | `DROP DATABASE db_name;` |
| Connect to a specific database | `\c db_name` |

### 3. User Management

| List all users | `\du` |
| Create a new user | `CREATE USER username WITH PASSWORD 'password';` |
| Grant user privileges on a database | `GRANT ALL PRIVILEGES ON DATABASE db_name TO username;` |
| Change user password | `ALTER USER username WITH PASSWORD 'new_password';` |

### 4. Table Operations

| List all tables in a database | `\dt` |
| Describe a table’s schema <br/> (columns, types, etc.) | `\d table_name` |
| Create a table | `CREATE TABLE table_name (id SERIAL PRIMARY KEY,name VARCHAR(100),age INT);` |
| Drop a table | `DROP TABLE table_name;` |

### 5. Basic Queries

| Select all data from a table | `SELECT * FROM table_name;` |
| Insert data into a table | `INSERT INTO table_name (name, age) VALUES ('John Doe', 30);` |
| Update data in a table | `UPDATE table_name SET age = 31 WHERE name = 'John Doe';` |
| Delete data from a table | `DELETE FROM table_name WHERE name = 'John Doe';` |

### 6. Indexing and Performance

| Create an index on a column | `CREATE INDEX idx_name ON table_name (column_name);`
| Drop an index | `DROP INDEX idx_name;` |
| Analyze the performance of a query | `EXPLAIN ANALYZE SELECT * FROM table_name WHERE column_name = 'value';` |

### 7. Backup and Restore

| Backup a database | `pg_dump db_name > backup.sql` |
| Restore a database | `psql -U username -d db_name -f backup.sql` |

### 8. Transaction Management

| Begin a transaction | `BEGIN;` |
| Commit a transaction | `COMMIT;` |
| Rollback a transaction | `ROLLBACK;` |

### 9. System Information

| Show current user | `SELECT current_user;` |
| Show the PostgreSQL version | `SELECT version();` |

### 10. Miscellaneous

| List active connections | `SELECT * FROM pg_stat_activity;` |
| Show disk usage for each table | `SELECT relname AS "Table", pg_size_pretty` <br/> `(pg_total_relation_size(relid)) AS "Size"` <br/> `FROM pg_catalog.pg_statio_user_tables` <br/> `ORDER BY pg_total_relation_size(relid) DESC;` |

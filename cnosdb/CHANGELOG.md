# Changelog

## 0.6.0

### 1. Add some datasource config. 

Add some configs to improve connection security and query performance.

### 2. Support CnosDB Cloud

Add a config panel to connect to CnosDB cloud.

## 0.5.2

### 1. Change plugin-ID

- From: cnos-grafana-datasource
- To: cnos-cnosdb-datasource

If you're using grafana config:
```
allow_loading_unsigned_plugins = cnos-grafana-datasource
```
You may need to modify it to 
```
allow_loading_unsigned_plugins = cnos-cnosdb-datasource
```

### 2. Support variables.

Query variable: support sql:

- `SHOW TABLES`, `SHOW DATABASES`, etc. 
- SELECT statements, there can be only one column to select, and it's alias should be `value`: `SELECT DISTINCT host AS value FROM cpu ORDER BY host ASC`

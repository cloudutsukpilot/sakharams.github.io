---
layout: post
title: Azure - Kusto Query Language
categories: [cloud, azure, developer tools]
tags: [Cloud, Azure, Developer Tools, KQL, CMDsheet]
---

## Introduction
- KQL, or Kusto Query Language, is a powerful query language used in Azure to perform read-only requests for processing and retrieving data from the Azure Data Explorer service. 
- KQL is widely used in Azure Monitor, Log Analytics, and other Azure services to analyze and explore large volumes of data efficiently. 

- Below are some common examples and usage scenarios of KQL:

### **Basic Query Structure**

1. `Retrieving All Records from a Table`

    ```
    TableName
    ```
    - This query retrieves all records from the specified table.

2. `Filtering Data`

    ```
    TableName 
    | where Timestamp > datetime(2024-01-01)
    ```
    - This query retrieves records from the table where the Timestamp is later than January 1, 2023.

    ```
    TableName 
    | where ColumnName contains "Error"
    ```
    ```
    TableName 
    | search "Error"
    ```
    - This query retrieves records from the table where the "Error" word is present

3. `Selecting Specific Columns`

    ```
    TableName
    | project Column1, Column2, CustomerColum=["internalKeyName"]
    ```
    - This query selects and returns only Column1 and Column2 from the table.

4. `Get Table Schema`

    ```
    TableName
    | getschema
    ```
    - This query returns the table schema.

### **Aggregation and Summarization**

1. `Counting Records`

    ```
    TableName
    | count
    ```
    - This query counts the total number of records in the table.

2. `Summarizing Data`

    ```
    TableName
    | summarize TotalCount = count() by Column1
    ```
    - This query groups the records by Column1 and returns the count of records for each group.

3. `Average Calculation`

    ```
    TableName
    | summarize AverageValue = avg(NumericColumn) by CategoryColumn
    ```
    - This query calculates the average of NumericColumn values, grouped by CategoryColumn.

### **Time-Based Analysis**

1. `Time Series Analysis`

    ```
    TableName
    | summarize CountPerHour = count() by bin(Timestamp, 1h)
    ```
    - This query groups records into 1-hour bins based on the Timestamp and counts the number of records in each bin.

2. `Calculating Time Differences`

    ```
    TableName
    | extend TimeDifference = datetime_diff('minute', EndTime, StartTime)
    ```
    - This query calculates the difference in minutes between EndTime and StartTime for each record.

### **Joining and Combining Data**

1. `Joining Tables`

    ```
    Table1
    | join kind=inner (Table2) on CommonColumn
    ```
    - This query performs an inner join between Table1 and Table2 based on CommonColumn.

2. `Union of Tables`

    ```
    Table1
    | union Table2
    ```
    - This query combines records from Table1 and Table2.

3. `Creating a New Column`

    ```
    AzureActivity
    | extend request=todynamic(HTTPReqeust)
    | project request9["clientIpAddress"]
    ```
    - This query returns the client IP address from the HTTPRequest column

### Advanced Scenarios

1. `Parsing JSON Data`

    ```
    TableName
    | extend ParsedJson = parse_json(JsonColumn)
    ```
    - This query parses JSON-formatted data in JsonColumn.

2. `Detecting Anomalies`

    ```
    TableName
    | summarize AvgValue = avg(NumericColumn) by bin(Timestamp, 1h)
    | evaluate anomaly_detection(AvgValue, 2, 'linefit')
    ```
- This query detects anomalies in the AvgValue over time, using a 2-sigma threshold and a line fit model.

3. `Parsing Data from Column Text`

    ```
    AzureDiagnostics
    | parse msg_s with Protocol 'request from ' SourceIP ':' * 'to' DestinationIP ':' *
    | extend 1_protocol=Protocol, 1_sourceip=SourceIP,1_destination=DestinationIP
    | project 1_protocol, 1_sourceip,1_destination
    ```


### Real-World Examples

1. `Monitoring CPU Usage`

    ```
    Perf
    | where ObjectName == "Processor" and CounterName == "% Processor Time"
    | summarize AvgCpuUsage = avg(CounterValue) by bin(Timestamp, 5m)
    ```
    - This query monitors CPU usage by summarizing the average processor time every 5 minutes.

2. `Tracking Error Rates in Applications`

    ```
    AppRequests
    | where Success == false
    | summarize ErrorCount = count() by bin(Timestamp, 1h)
    ```
    - This query tracks the number of failed application requests per hour.

3. `Analyzing User Activity`

    ```
    UserActivityLogs
    | where Action == "Login"
    | summarize LoginsPerDay = count() by bin(Timestamp, 1d)
    ```
    - This query analyzes user login activity by counting logins per day.


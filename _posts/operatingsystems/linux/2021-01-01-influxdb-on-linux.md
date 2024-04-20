---
layout: post
title: Install InfluxDB on Linux
categories: [operating systems, linux]
tags: [Operating Systems, Linux]
---

#### What is InfluxDB?
- An InfluxDB is a time-series database (TSDB) optimized for time-series data. The time-series data are simply metrics or events which are tracked, monitored, and aggregated over time.
- These data could be server metrics, web application performance monitoring, sensor data, and many other types of analytics data.
- InfluxDB is built on a SQL-like query language called InfluxQL, which makes it easy to query and analyze time-series data. It also has a built-in HTTP API that enables you to easily write and read data, as well as query and manage the database.
- In addition, InfluxDB supports several data integrations and plugins, including Grafana, Telegraf, and Kapacitor, which enable you to easily monitor and analyze your data.
- Overall, InfluxDB is a powerful database solution for applications that require high-performance and scalable storage and querying of time-series data. It is widely used in industries such as IoT, finance, healthcare, and more.
- In this tutorial, you will see how to install and set up InfluxDB on your Ubuntu 20.04 and 22.04.

#### Installation of InfluxDB
1. Update your Ubuntu system using the following command:
```bash
sudo apt-get update
```
2. Getting packages on Ubuntu distributions
- You can go to the InfluxData downloads page website or download the packages using the below command:
```bash
wget -q https://repos.influxdata.com/influxdata-archive_compat.key
echo '393e8779c89ac8d958f81f942f9ad7fb82a25e133faddaf92e15b16e6ac9ce4c influxdata-archive_compat.key' | sha256sum -c && cat influxdata-archive_compat.key | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg > /dev/null
echo 'deb [signed-by=/etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg] https://repos.influxdata.com/debian stable main' | sudo tee /etc/apt/sources.list.d/influxdata.list
```

3. Install InfluxDB as a service
- Update your package list using the following command:
```bash
sudo apt-get update
```

- Install the InfluxDB version 2 package using the following command:
```bash
sudo apt-get install influxdb2
```

4. Check InfluxDB version
```bash
influx version
```

5. Start the InfluxDB service using the following command:
```bash
sudo systemctl start influxdb
```

6. Enable InfluxDB as a service:
```bash
sudo systemctl enable influxdb
```

7. Verify your InfluxDB installation as a service:
```bash
sudo service influxdb status
```

InfluxDB should run automatically, but if this is not the case, make sure to start it.
```bash
sudo service influxdb start
```

- Installing the InfluxDB package creates a service file at /lib/systemd/system/influxdb.service to start InfluxDB as a background service on startup.

#### InfluxDB Commands:
Restart
sudo service influxdb restart
Stop
sudo service influxdb stop

#### Allow InfluxDB TCP port 8086 in the Firewall 
- To access influxdb from outside, add the following firewall rule:
```bash
sudo ufw allow 8086/tcp
```

#### Set up InfluxDB
You can use the command line or the GUI to set up InfluxDB.

##### Set up InfluxDB through the UI
- With InfluxDB running, visit http://localhost:8086.
- Click Get Started.
- Set up your initial user
- Enter a Username for your initial user.
- Enter a Password and Confirm the Password for your user.
- Enter your initial Organization Name.
- Enter your initial Bucket Name.
- InfluxDB User Setup

That’s it! You have now set up InfluxDB through the UI and can begin using it to store and analyze your data.

#### Conclusion
In this post, You have now Installed and set up InfluxDB on Ubuntu. You can continue to explore the InfluxDB UI and API to add data and create dashboards. 

Thank You!
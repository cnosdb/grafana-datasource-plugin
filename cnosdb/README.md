## CnosDB data source for Grafana

This document describes how to install and configure CnosDB data source plugin for Grafana, and to query and visualize
data from CnosDB.

## Installation

At first, you should add a _Connection_ to query CnosDB.

Navigate to **Configurations / Plugins**, search `cnosdb` and then click it.

![install_1](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/install_1.png)

Click button **Create a CnosDB data source**.

![install_2](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/install_2.png)

Configure the connection options, then click the **Save & test** button.

![configure_1](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/configure_1.png)

If you see `"Data source is working"` that means CnosDB data source connected successfully.

![configure_2](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/configure_2.png)

## Usage - Dashboard

> See [Use Dashboards](https://grafana.com/docs/grafana/v9.0/dashboards/use-dashboards/) for more instructions on how to
> use grafana dashboard.

Navigate to **Dashboards**, click **New Dashboard** in dropped down list, then click **Add a new panel**.
Now you can see the visual query editor.

### Visual query editor

Click the area after `FROM` to choose the table.

![create_panel_5](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/create_panel_5.png)

Click the area after `SELECT` to choose the column.

![create_panel_6](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/create_panel_6.png)

Now you can see the visualization of the query result.

![create_panel_7](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/create_panel_7.png)

### Raw query editor

You can also enter the raw sql editor mode by clicking this button.

![create_panel_1](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/create_panel_1.png)

Now the whole visual query editor means SQL query below:

```sql
SELECT date_bin(INTERVAL '1 minute', time, TIMESTAMP '1970-01-01T00:00:00Z') AS time, avg(usage_user)
FROM cpu
WHERE $timeFilter
GROUP BY date_bin(INTERVAL '1 minute', time, TIMESTAMP '1970-01-01T00:00:00Z')
ORDER BY time ASC
```

You can see that SQL in raw query editor.

![create_panel_2](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/create_panel_2.png)

### Save your panel

Click `Apply` to save the panel, and then you will be navigated to **New dashboard** page.

![create_panel_8](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/create_panel_8.png)

You'll see the panel we just edited on **New dashboard** page.

![create_panel_9](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/create_panel_9.png)

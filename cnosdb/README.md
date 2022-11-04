## CnosDB data source for Grafana

This document describes how to install and configure CnosDB data source plugin for Grafana, and to query and visualize data from CnosDB.
## Installation

1. Navigate to **Configurations / Plugins**, search `CnosDB` and then click it.

![install_1](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/install_1.png)

1. Click `Create a CnosDB data source` button.

![install_2](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/install_2.png)

3. Configure the connection options.

![configure_1](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/configure_1.png)

4. Click `Save & test`, if it displays `"Data source is working"` means CnosDB data source connected successfully.

![configure_1](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/configure_2.png)

## Usage - Dashboard

1. Navigate to **Dashboards**, click `New Dashboard` button, then click `Add a new panel` button. We see visual query editor now, you can also enter the raw sql eidte mode by clicking this button.

**Visual query editor**

![create_pannel_1](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/create_pannel_1.png)

**Raw query editor**

![create_pannel_2](https://raw.githubusercontent.com/cnosdb/grafana-datasource-plugin/master/cnosdb/assets/create_pannel_2.png)
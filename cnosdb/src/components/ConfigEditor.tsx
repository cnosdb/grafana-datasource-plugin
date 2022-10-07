import { uniqueId } from 'lodash';
import React, { PureComponent } from 'react';

import {
  DataSourcePluginOptionsEditorProps,
  updateDatasourcePluginResetOption,
  onUpdateDatasourceJsonDataOption,
  updateDatasourcePluginJsonDataOption,
} from '@grafana/data';
import { Alert, DataSourceHttpSettings, InlineField, InlineFormLabel, LegacyForms } from '@grafana/ui';

import { MyDataSourceOptions } from '../types';

const { Input } = LegacyForms;

export type Props = DataSourcePluginOptionsEditorProps<MyDataSourceOptions>;
type State = {
  maxSeries: string | undefined;
};

export class ConfigEditor extends PureComponent<Props, State> {
  state = {
    maxSeries: '',
  };

  htmlPrefix: string;

  constructor(props: Props) {
    super(props);
    this.state.maxSeries = props.options.jsonData.maxSeries?.toString() || '';
    this.htmlPrefix = uniqueId('cnosdb-config');
  }

  onDsJsonDataChange = (property: keyof MyDataSourceOptions) => {
    return onUpdateDatasourceJsonDataOption(this.props, property);
  };

  onResetPassword = () => {
    updateDatasourcePluginResetOption(this.props, 'password');
  };

  render() {
    const { options, onOptionsChange } = this.props;
    const jsonData = options.jsonData;
    return (
      <>
        {options.access === 'direct' && (
          <Alert title="Deprecation Notice" severity="warning">
            Browser access mode in the InfluxDB datasource is deprecated and will be removed in a future release.
          </Alert>
        )}

        <DataSourceHttpSettings
          showAccessOptions={true}
          dataSourceConfig={options}
          defaultUrl="http://localhost:31007"
          onChange={onOptionsChange}
        />

        <div className="gf-form-group">
          <div>
            <h3 className="page-heading">Database</h3>
          </div>
          <div className="gf-form-inline">
            <div className="gf-form">
              <InlineFormLabel htmlFor={`${this.htmlPrefix}-db`} className="width-10">
                Database
              </InlineFormLabel>
              <div className="width-20">
                <Input
                  id={`${this.htmlPrefix}-db`}
                  className="width-20"
                  value={jsonData.database || ''}
                  onChange={this.onDsJsonDataChange('database')}
                />
              </div>
            </div>
          </div>

          <div className="gf-form-inline">
            <div className="gf-form">
              <InlineFormLabel
                className="width-10"
                tooltip="A lower limit for the auto group by time interval. Recommended to be set to write frequency,
				for example 1m if your data is written every minute."
              >
                Min time interval
              </InlineFormLabel>
              <div className="width-10">
                <Input
                  className="width-10"
                  placeholder="10s"
                  value={jsonData.timeInterval || ''}
                  onChange={this.onDsJsonDataChange('timeInterval')}
                />
              </div>
            </div>
          </div>
          <div className="gf-form-inline">
            <InlineField
              labelWidth={20}
              label="Max series"
              tooltip="Limit the number of series/tables that Grafana will process. Lower this number to prevent abuse, and increase it if you have lots of small time series and not all are shown. Defaults to 1000."
            >
              <Input
                placeholder="1000"
                type="number"
                className="width-10"
                value={this.state.maxSeries}
                onChange={(event) => {
                  // We duplicate this state so that we allow to write freely inside the input. We don't have
                  // any influence over saving so this seems to be only way to do this.
                  this.setState({ maxSeries: event.currentTarget.value });
                  const val = parseInt(event.currentTarget.value, 10);
                  updateDatasourcePluginJsonDataOption(this.props, 'maxSeries', Number.isFinite(val) ? val : undefined);
                }}
              />
            </InlineField>
          </div>
        </div>
      </>
    );
  }
}

export default ConfigEditor;

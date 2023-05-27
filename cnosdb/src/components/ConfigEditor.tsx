import {uniqueId} from 'lodash';
import React, {PureComponent} from 'react';

import {
  DataSourcePluginOptionsEditorProps,
  onUpdateDatasourceJsonDataOption,
  onUpdateDatasourceSecureJsonDataOption,
  updateDatasourcePluginResetOption,
} from '@grafana/data';
import {InlineFormLabel, LegacyForms, LegacyInputStatus} from '@grafana/ui';

import {CnosDataSourceOptions, CnosSecureJsonData} from '../types';

const {Input, SecretFormField} = LegacyForms;

type ConfigInputProps = {
  label: string;
  htmlPrefix: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>, status?: LegacyInputStatus) => void;
  value: string;
  placeholder: string;
};

const ConfigInput = ({label, htmlPrefix, onChange, value, placeholder}: ConfigInputProps): JSX.Element => {
  return (
    <div className="gf-form-inline">
      <div className="gf-form">
        <InlineFormLabel htmlFor={htmlPrefix} className="width-10">
          {label}
        </InlineFormLabel>
        <div className="width-20">
          <Input id={htmlPrefix} className="width-20" value={value || ''} onChange={onChange}
                 placeholder={placeholder}/>
        </div>
      </div>
    </div>
  );
};

export type Props = DataSourcePluginOptionsEditorProps<CnosDataSourceOptions, CnosSecureJsonData>;
type State = {
  maxSeries: string | undefined;
};

export class ConfigEditor extends PureComponent<Props, State> {
  htmlPrefix: string;

  constructor(props: Props) {
    super(props);
    this.htmlPrefix = uniqueId('cnosdb-config');
  }

  onResetPassword = () => {
    updateDatasourcePluginResetOption(this.props, 'password');
  };

  render() {
    const {secureJsonFields, jsonData} = this.props.options;
    const secureJsonData = this.props.options.secureJsonData || {};
    // TODO: use DataSourceHttpSettings to store TLS configs
    return (
      <>
        <div className="gf-form-group">
          <h3 className="page-heading">CnosDB Connection</h3>
          <ConfigInput
            label="URL"
            htmlPrefix={`${this.htmlPrefix}-url`}
            onChange={onUpdateDatasourceJsonDataOption(this.props, 'url')}
            value={jsonData.url || ''}
            placeholder="http://127.0.0.1:8902"
          />
          <ConfigInput
            label="Database"
            htmlPrefix={`${this.htmlPrefix}-database`}
            onChange={onUpdateDatasourceJsonDataOption(this.props, 'database')}
            value={jsonData.database || ''}
            placeholder="database"
          />
          <ConfigInput
            label="User"
            htmlPrefix={`${this.htmlPrefix}-user`}
            onChange={onUpdateDatasourceJsonDataOption(this.props, 'user')}
            value={jsonData.user ?? ''}
            placeholder="root"
          />
          <div className="gf-form-inline">
            <div className="gf-form">
              <SecretFormField
                isConfigured={Boolean(secureJsonFields && secureJsonFields.password)}
                value={secureJsonData.password ?? ''}
                label="Password"
                aria-label="Password"
                placeholder="password"
                labelWidth={10}
                inputWidth={20}
                onReset={this.onResetPassword}
                onChange={onUpdateDatasourceSecureJsonDataOption(this.props, 'password')}
              />
            </div>
          </div>
        </div>
      </>
    );
  }
}

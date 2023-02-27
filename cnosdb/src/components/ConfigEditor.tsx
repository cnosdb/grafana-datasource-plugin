import {uniqueId} from 'lodash';
import React, {ChangeEvent, PureComponent} from 'react';
import {Base64} from 'js-base64';

import {
  DataSourcePluginOptionsEditorProps,
  onUpdateDatasourceOption,
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
};

const ConfigInput = ({label, htmlPrefix, onChange, value}: ConfigInputProps): JSX.Element => {
  return (
    <div className="gf-form-inline">
      <div className="gf-form">
        <InlineFormLabel htmlFor={htmlPrefix} className="width-10">
          {label}
        </InlineFormLabel>
        <div className="width-20">
          <Input id={htmlPrefix} className="width-20" value={value || ''} onChange={onChange}/>
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

  onUserChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.onAuthChange(event.currentTarget.value, undefined);
  };

  onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.onAuthChange(undefined, event.currentTarget.value);
  };

  onAuthChange = (user?: string, password?: string) => {
    const {onOptionsChange, options} = this.props;
    const secureJsonData = (options.secureJsonData || {});

    if (user === undefined) {
      user = options.user;
    }
    if (password === undefined) {
      password = secureJsonData.password ?? ''
    }

    onOptionsChange({
      ...options,
      user: user,
      secureJsonData: {
        ...options.secureJsonData,
        auth: Base64.encode(user + ':' + password),
        password: password,
      },
    });
  };

  render() {
    const {options} = this.props;
    const {secureJsonFields} = options;
    const secureJsonData = (options.secureJsonData || {});
    // TODO: use DataSourceHttpSettings to store TLS configs
    return (
      <>
        <div className="gf-form-group">
          <h3 className="page-heading">CnosDB Connection</h3>
          <ConfigInput
            label="URL"
            htmlPrefix={`${this.htmlPrefix}-url`}
            onChange={onUpdateDatasourceOption(this.props, 'url')}
            value={options.url || ''}
          />
          <ConfigInput
            label="Database"
            htmlPrefix={`${this.htmlPrefix}-database`}
            onChange={onUpdateDatasourceOption(this.props, 'database')}
            value={options.database || ''}
          />
          <ConfigInput
            label="User"
            htmlPrefix={`${this.htmlPrefix}-user`}
            onChange={this.onUserChange}
            value={options.user || ''}
          />
          <div className="gf-form-inline">
            <div className="gf-form">
              <SecretFormField
                isConfigured={Boolean(secureJsonFields && secureJsonFields.password)}
                value={secureJsonData.password ?? ''}
                label="Password"
                aria-label="Password"
                labelWidth={10}
                inputWidth={20}
                onReset={this.onResetPassword}
                onChange={this.onPasswordChange}
              />
            </div>
          </div>
        </div>
      </>
    );
  }
}

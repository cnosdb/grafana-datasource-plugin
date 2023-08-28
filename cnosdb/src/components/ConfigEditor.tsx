import { uniqueId } from 'lodash';
import React, { PureComponent } from 'react';

import {
  DataSourcePluginOptionsEditorProps,
  onUpdateDatasourceJsonDataOption,
  onUpdateDatasourceSecureJsonDataOption,
  SelectableValue,
  updateDatasourcePluginJsonDataOption,
  updateDatasourcePluginResetOption,
} from '@grafana/data';
import {
  InlineField,
  InlineFormLabel,
  InlineSwitch,
  LegacyForms,
  LegacyInputStatus,
  RadioButtonGroup,
} from '@grafana/ui';

import { CnosDataSourceOptions, CnosdbMode, CnosSecureJsonData } from '../types';
import { cx } from '@emotion/css';

const { Input, SecretFormField } = LegacyForms;

type ConfigInputProps = {
  label: string;
  htmlPrefix: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>, status?: LegacyInputStatus) => void;
  value: string | number | undefined;
  placeholder: string;
};

const ConfigInput = ({ label, htmlPrefix, onChange, value, placeholder }: ConfigInputProps): JSX.Element => {
  return (
    <div className="gf-form-inline">
      <div className="gf-form">
        <InlineFormLabel htmlFor={htmlPrefix} className="width-10">
          {label}
        </InlineFormLabel>
        <div className="width-20">
          <Input id={htmlPrefix} value={value ?? ''} onChange={onChange} placeholder={placeholder} />
        </div>
      </div>
    </div>
  );
};

export type Props = DataSourcePluginOptionsEditorProps<CnosDataSourceOptions, CnosSecureJsonData>;
type State = {
  maxSeries: string | undefined;
};

const cnosdbModes: Array<SelectableValue<CnosdbMode>> = [
  { label: 'CnosDB', value: CnosdbMode.Private },
  { label: 'CnosDB Cloud', value: CnosdbMode.PublicCloud },
];

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
    const { secureJsonFields, jsonData } = this.props.options;
    if (jsonData) {
      if (jsonData.cnosdbMode === undefined) {
        jsonData.cnosdbMode = CnosdbMode.Private;
      }
      if (jsonData.useBasicAuth === undefined) {
        jsonData.useBasicAuth = true;
      }
    }

    const secureJsonData = this.props.options.secureJsonData || {};

    // TODO: use DataSourceHttpSettings to store TLS configs
    return (
      <>
        <div className="gf-form-group">
          <RadioButtonGroup
            id={`${this.htmlPrefix}-host-cnosdb-mode`}
            value={jsonData.cnosdbMode}
            options={cnosdbModes}
            onChange={(m) => {
              updateDatasourcePluginJsonDataOption(this.props, 'cnosdbMode', m);
            }}
            size="md"
          />
        </div>

        <div className="gf-form-group">
          <h3 className="page-heading">CnosDB Connection</h3>
          <div className="gf-form-inline">
            <InlineField label="Host" labelWidth={10}>
              <Input
                id={`${this.htmlPrefix}-host`}
                className="width-12"
                value={jsonData.host}
                onChange={onUpdateDatasourceJsonDataOption(this.props, 'host')}
                placeholder="localhost"
              />
            </InlineField>
            <InlineField label="Port" labelWidth={10}>
              <Input
                id={`${this.htmlPrefix}-port`}
                type="number"
                min={0}
                max={65535}
                step={1}
                value={jsonData.port}
                onChange={(e) => {
                  const v = parseInt(e.currentTarget.value, 10);
                  updateDatasourcePluginJsonDataOption(this.props, 'port', Number.isFinite(v) ? v : undefined);
                }}
                placeholder="8902"
              />
            </InlineField>
          </div>
          <ConfigInput
            label="Database"
            htmlPrefix={`${this.htmlPrefix}-database`}
            onChange={onUpdateDatasourceJsonDataOption(this.props, 'database')}
            value={jsonData.database}
            placeholder="public"
          />
          {jsonData.cnosdbMode === CnosdbMode.PublicCloud && (
            <ConfigInput
              label="API Key"
              htmlPrefix={`${this.htmlPrefix}-api-key`}
              onChange={onUpdateDatasourceJsonDataOption(this.props, 'apiKey')}
              value={jsonData.apiKey}
              placeholder=""
            />
          )}
          {jsonData.cnosdbMode !== CnosdbMode.PublicCloud && (
            <ConfigInput
              label="Tenant"
              htmlPrefix={`${this.htmlPrefix}-tenant`}
              onChange={onUpdateDatasourceJsonDataOption(this.props, 'tenant')}
              value={jsonData.tenant}
              placeholder="cnosdb"
            />
          )}
        </div>

        {jsonData.cnosdbMode === CnosdbMode.Private && (
          <>
            <div className="gf-form-group">
              <h3 className="page-heading">Auth</h3>
              <div className="gf-form-inline">
                <InlineField label="Basic Auth" labelWidth={20}>
                  <InlineSwitch
                    id={`${this.htmlPrefix}-basic-auth`}
                    value={jsonData.useBasicAuth}
                    onChange={onUpdateDatasourceJsonDataOption(this.props, 'useBasicAuth')}
                  />
                </InlineField>
                <InlineField label="SSL" labelWidth={20}>
                  <InlineSwitch
                    id={`${this.htmlPrefix}-ssl`}
                    value={jsonData.enableHttps}
                    onChange={onUpdateDatasourceJsonDataOption(this.props, 'enableHttps')}
                  />
                </InlineField>
              </div>
              <div className="gf-form-inline">
                <InlineField label="With CA Cert" labelWidth={20}>
                  <InlineSwitch
                    id={`${this.htmlPrefix}-with-ca-cert`}
                    value={jsonData.useCaCert}
                    onChange={onUpdateDatasourceJsonDataOption(this.props, 'useCaCert')}
                  />
                </InlineField>
                <InlineField label="Skip TLS Verify" labelWidth={20}>
                  <InlineSwitch
                    id={`${this.htmlPrefix}-skip-tls-verify`}
                    value={jsonData.skipTlsVerify}
                    onChange={onUpdateDatasourceJsonDataOption(this.props, 'skipTlsVerify')}
                  />
                </InlineField>
              </div>
            </div>

            {jsonData.useBasicAuth && (
              <div className="gf-form-group">
                <h3 className="page-heading">Basic Auth Details</h3>
                <ConfigInput
                  label="User"
                  htmlPrefix={`${this.htmlPrefix}-user`}
                  onChange={onUpdateDatasourceJsonDataOption(this.props, 'user')}
                  value={jsonData.user}
                  placeholder="root"
                />
                <div className="gf-form-inline">
                  <div className={cx('gf-form', 'width-30')}>
                    <SecretFormField
                      isConfigured={Boolean(secureJsonFields && secureJsonFields.password)}
                      value={secureJsonData.password}
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
            )}
          </>
        )}

        <div className="gf-form-group">
          <h3 className="page-heading">General</h3>
          <InlineField label="Target partitions" labelWidth={20}>
            <Input
              id={`${this.htmlPrefix}-target-partitions`}
              type="number"
              min={0}
              max={65535}
              step={1}
              className="width-10"
              value={jsonData.targetPartitions}
              onChange={onUpdateDatasourceJsonDataOption(this.props, 'targetPartitions')}
              placeholder=""
            />
          </InlineField>
          <InlineField label="Stream trigger interval" labelWidth={20}>
            <Input
              id={`${this.htmlPrefix}-stream-trigger-interval`}
              type="number"
              min={0}
              max={65535}
              step={1}
              className="width-10"
              value={jsonData.streamTriggerInterval}
              onChange={onUpdateDatasourceJsonDataOption(this.props, 'streamTriggerInterval')}
              placeholder=""
            />
          </InlineField>
          <InlineField label="Chuncked" labelWidth={20}>
            <InlineSwitch
              id={`${this.htmlPrefix}-use-chunked-response`}
              value={jsonData.useChunkedResponse}
              onChange={onUpdateDatasourceJsonDataOption(this.props, 'useChunkedResponse')}
            />
          </InlineField>
        </div>
      </>
    );
  }
}

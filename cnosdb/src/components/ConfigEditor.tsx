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
  Button,
  InlineField,
  InlineSwitch,
  LegacyForms,
  LegacyInputStatus,
  RadioButtonGroup,
  TextArea,
} from '@grafana/ui';

import { CnosDataSourceOptions, CnosdbMode, CnosSecureJsonData } from '../types';
import { cx } from '@emotion/css';

const { Input, SecretFormField } = LegacyForms;

type ConfigInputProps = {
  label: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>, status?: LegacyInputStatus) => void;
  value: string | number | undefined;
  placeholder: string;
  tooltip?: string;
};

const ConfigInput = ({ label, onChange, value, placeholder, tooltip }: ConfigInputProps): React.JSX.Element => {
  return (
    <div className="gf-form-inline">
      <InlineField label={label} tooltip={tooltip} labelWidth={20}>
        <div className="width-20">
          <Input value={value ?? ''} onChange={onChange} placeholder={placeholder} />
        </div>
      </InlineField>
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
  constructor(props: Props) {
    super(props);
  }

  onResetPassword = () => {
    updateDatasourcePluginResetOption(this.props, 'password');
  };

  render() {
    const { onOptionsChange, options } = this.props;
    const { secureJsonFields, jsonData } = options;
    if (jsonData) {
      if (jsonData.cnosdbMode === undefined) {
        jsonData.cnosdbMode = CnosdbMode.Private;
      }
      if (jsonData.basicAuth === undefined) {
        jsonData.basicAuth = true;
      }
    }

    const secureJsonData = this.props.options.secureJsonData || {};
    const hasTLSCACert = secureJsonFields.tlsCACert;

    // TODO: use DataSourceHttpSettings to store TLS configs
    return (
      <>
        <div className="gf-form-group">
          <RadioButtonGroup
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
                className="width-12"
                value={jsonData.host}
                onChange={onUpdateDatasourceJsonDataOption(this.props, 'host')}
                placeholder="localhost"
              />
            </InlineField>
            <InlineField label="Port" labelWidth={10}>
              <Input
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
            onChange={onUpdateDatasourceJsonDataOption(this.props, 'database')}
            value={jsonData.database}
            placeholder="public"
          />
          {jsonData.cnosdbMode === CnosdbMode.PublicCloud && (
            <ConfigInput
              label="API Key"
              onChange={onUpdateDatasourceJsonDataOption(this.props, 'apiKey')}
              value={jsonData.apiKey}
              placeholder=""
            />
          )}
          {jsonData.cnosdbMode !== CnosdbMode.PublicCloud && (
            <ConfigInput
              label="Tenant"
              onChange={onUpdateDatasourceJsonDataOption(this.props, 'tenant')}
              value={jsonData.tenant}
              placeholder="cnosdb"
            />
          )}
        </div>

        <div className="gf-form-group">
          {jsonData.cnosdbMode === CnosdbMode.Private && <h3 className="page-heading">Auth</h3>}
          {jsonData.cnosdbMode === CnosdbMode.PublicCloud && <h3 className="page-heading">TLS/SSL</h3>}
          <div className="gf-form-inline">
            {jsonData.cnosdbMode === CnosdbMode.Private && (
              <InlineField label="Basic Auth" labelWidth={20}>
                <InlineSwitch
                  value={jsonData.basicAuth}
                  onChange={(event) => {
                    return updateDatasourcePluginJsonDataOption(this.props, 'basicAuth', event.currentTarget.checked);
                  }}
                />
              </InlineField>
            )}
            <InlineField label="SSL" labelWidth={20}>
              <InlineSwitch
                value={jsonData.enableHttps}
                onChange={(event) => {
                  return updateDatasourcePluginJsonDataOption(this.props, 'enableHttps', event.currentTarget.checked);
                }}
              />
            </InlineField>
          </div>
          <div className="gf-form-inline">
            {jsonData.cnosdbMode === CnosdbMode.Private && (
              <InlineField label="With CA Cert" labelWidth={20}>
                <InlineSwitch
                  value={jsonData.tlsAuthWithCACert}
                  onChange={(event) => {
                    return updateDatasourcePluginJsonDataOption(
                      this.props,
                      'tlsAuthWithCACert',
                      event.currentTarget.checked
                    );
                  }}
                />
              </InlineField>
            )}
            <InlineField label="Skip TLS Verify" labelWidth={20}>
              <InlineSwitch
                value={jsonData.tlsSkipVerify}
                onChange={(event) => {
                  return updateDatasourcePluginJsonDataOption(this.props, 'tlsSkipVerify', event.currentTarget.checked);
                }}
              />
            </InlineField>
          </div>
        </div>

        {jsonData.cnosdbMode === CnosdbMode.Private && jsonData.basicAuth && (
          <div className="gf-form-group">
            <h3 className="page-heading">Basic Auth Details</h3>
            <ConfigInput
              label="User"
              onChange={onUpdateDatasourceJsonDataOption(this.props, 'basicAuthUser')}
              value={jsonData.basicAuthUser}
              placeholder="root"
            />
            <div className="gf-form-inline">
              <div className={cx('gf-form', 'width-30')}>
                <SecretFormField
                  isConfigured={Boolean(secureJsonFields && secureJsonFields.password)}
                  value={secureJsonData.basicAuthPassword}
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

        {jsonData.cnosdbMode === CnosdbMode.Private && jsonData.tlsAuthWithCACert && (
          <div className="gf-form-group">
            <h3 className="page-heading">TLS/SSL Auth Details</h3>
            <div className="gf-form-inline">
              <InlineField label="CA Cert" labelWidth={20}>
                <div className="width-20">
                  {hasTLSCACert ? (
                    <Input type="text" value="configured" disabled={true} />
                  ) : (
                    <TextArea
                      rows={7}
                      onChange={(event) => {
                        const newSecureJsonData = secureJsonData;
                        newSecureJsonData['tlsCACert'] = event.currentTarget.value;
                        onOptionsChange({
                          ...options,
                          secureJsonData: newSecureJsonData,
                        });
                        // onUpdateDatasourceSecureJsonDataOption(this.props, 'tlsCACert');
                      }}
                      placeholder="Begins with -----BEGIN CERTIFICATE-----"
                      required
                    />
                  )}
                </div>
              </InlineField>
              {hasTLSCACert && (
                <Button
                  variant="secondary"
                  onClick={(event) => {
                    event.preventDefault();
                    const newSecureJsonFields = secureJsonFields;
                    newSecureJsonFields['tlsCACert'] = false;
                    onOptionsChange({
                      ...options,
                      secureJsonFields: newSecureJsonFields,
                    });
                    // updateDatasourcePluginSecureJsonDataOption(this.props, 'tlsCACert', event.currentTarget.value);
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="gf-form-group">
          <h3 className="page-heading">General</h3>
          <InlineField
            label="Target partitions"
            labelWidth={20}
            tooltip="Number of partitions for query execution. Increasing partitions can increase concurrency"
          >
            <Input
              type="number"
              min={0}
              max={65535}
              step={1}
              className="width-10"
              value={jsonData.targetPartitions}
              onChange={(event) => {
                let v = parseInt(event.currentTarget.value, 10);
                if (!Number.isFinite(v)) {
                  if (v < 0) {
                    v = 0;
                  } else if (v > 65535) {
                    v = 65535;
                  }
                }
                updateDatasourcePluginJsonDataOption(
                  this.props,
                  'targetPartitions',
                  Number.isFinite(v) ? v : undefined
                );
              }}
              placeholder=""
            />
          </InlineField>
          <InlineField
            label="Stream trigger"
            labelWidth={20}
            tooltip="Optionally, specify the micro batch stream trigger interval. e.g. once, 1m, 10s"
          >
            <Input
              type="text"
              className="width-10"
              value={jsonData.streamTriggerInterval}
              onChange={onUpdateDatasourceJsonDataOption(this.props, 'streamTriggerInterval')}
              placeholder=""
            />
          </InlineField>
          <InlineField label="Chuncked" labelWidth={20} tooltip="Whether to use chunked response to get query results.">
            <InlineSwitch
              value={jsonData.useChunkedResponse}
              onChange={(event) => {
                return updateDatasourcePluginJsonDataOption(
                  this.props,
                  'useChunkedResponse',
                  event.currentTarget.checked
                );
              }}
            />
          </InlineField>
        </div>
      </>
    );
  }
}

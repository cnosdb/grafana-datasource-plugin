import { DataSourcePlugin } from '@grafana/data';

import { CnosDataSourceOptions, CnosQuery } from './types';
import { CnosDataSource } from './datasource';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';

export const plugin = new DataSourcePlugin<CnosDataSource, CnosQuery, CnosDataSourceOptions>(CnosDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);

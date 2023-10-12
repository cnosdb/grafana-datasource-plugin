export class MetaSchema {
  cnosdb_version: string;
  keys: string[];

  constructor(options: any) {
    this.cnosdb_version = options.cnosdb_version;
    this.keys = options.keys;
  }
}

export const showTablesSchema: MetaSchema[] = [
  {
    cnosdb_version: '2.4',
    keys: ['table_name'],
  },
  {
    cnosdb_version: '2.3.2',
    keys: ['TABLE_NAME'],
  },
  {
    cnosdb_version: '2.3.1',
    keys: ['Table'],
  },
];

export const describeTableSchema: MetaSchema[] = [
  {
    cnosdb_version: '2.4',
    keys: ['column_name', 'column_type'],
  },
  {
    cnosdb_version: '2.3',
    keys: ['COLUMN_NAME', 'COLUMN_TYPE'],
  },
];

export const showTagValuesSchema: MetaSchema[] = [
  {
    cnosdb_version: '*',
    keys: ['value'],
  },
];

export const customQuerySchema: MetaSchema[] = [
  {
    cnosdb_version: '*',
    keys: ['value'],
  },
];

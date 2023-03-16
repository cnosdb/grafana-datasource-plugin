package plugin_test

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/cnosdb/cnos-grafana-datasource-backend/pkg/plugin"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func TestParseQuery(t *testing.T) {
	var requestJson = `
{
    "table": "mq",
    "select": [
        [
            { "type": "field", "params": [ "fa"] },
            { "type": "avg" }
        ]
    ],
    "groupBy": [
        { "type": "time", "params": [ "10 minutes" ] },
        { "type": "fill", "params": [ "null" ] }
    ],
    "orderByTime": "ASC"
}`
	queryContext := &backend.QueryDataRequest{
		Queries: []backend.DataQuery{
			{
				JSON: []byte(requestJson),
				TimeRange: backend.TimeRange{
					From: time.Date(2022, 10, 10, 0, 0, 0, 0, time.UTC),
					To:   time.Date(2022, 10, 17, 0, 0, 0, 0, time.UTC),
				},
			},
		},
	}
	var queryModel plugin.QueryModel
	if err := json.Unmarshal([]byte(requestJson), &queryModel); err != nil {
		t.Error(err)
	}
	if err := queryModel.Introspect(); err != nil {
		t.Error(err)
	}

	sql, err := queryModel.Build(queryContext)
	if err != nil {
		t.Error(err)
	}

	fmt.Println(sql)
}

func TestParseQuery2(t *testing.T) {
	var requestJson = `
{
    "datasource": {
        "type": "cnos-grafana-datasource",
        "uid": "Jn47KMS4z"
    },
    "datasourceId": 32,
    "groupBy": [
        { "params": [ "10 minutes" ], "type": "time" },
        { "params": [ "10" ], "type": "fill" }
    ],
    "intervalMs": 30000,
    "maxDataPoints": 500,
    "orderByTime": "ASC",
    "rawTagsExpr": "",
    "refId": "A",
    "select": [
        [
            { "params": [ "fa" ], "type": "field" },
            { "params": [], "type": "avg" },
            { "params": [ "value" ], "type": "alias" }
        ]
    ],
    "table": "ma",
    "tags": []
}`
	queryContext := &backend.QueryDataRequest{
		Queries: []backend.DataQuery{
			{
				JSON: []byte(requestJson),
				TimeRange: backend.TimeRange{
					From: time.Date(2022, 10, 10, 0, 0, 0, 0, time.UTC),
					To:   time.Date(2022, 10, 17, 0, 0, 0, 0, time.UTC),
				},
			},
		},
	}
	var queryModel plugin.QueryModel
	if err := json.Unmarshal([]byte(requestJson), &queryModel); err != nil {
		t.Error(err)
	}
	if err := queryModel.Introspect(); err != nil {
		t.Error(err)
	}

	sql, err := queryModel.Build(queryContext)
	if err != nil {
		t.Error(err)
	}

	fmt.Println(sql)
}

func TestParseQuery3(t *testing.T) {
	var requestJson = `
{
	"datasource":{"type":"cnos-grafana-datasource","uid":"jDXXYpI4k"},
	"datasourceId":37,
	"fill":"null",
	"groupBy":[{"Type":"field","params":["10 seconds"],"type":"time"},
	{"params":["null"],"type":"fill"}],
	"interval":"$__interval",
	"intervalMs":2000,
	"key":"Q-841544f6-541e-45d7-afe4-accae7c5654f-0",
	"maxDataPoints":1137,
	"orderByTime":"ASC",
	"queryText":"SELECT DATE_BIN(INTERVAL '10 seconds', time, TIMESTAMP '1970-01-01T00:00:00Z') AS time, avg(\"default_field\") FROM \"default_table\" WHERE $timeFilter GROUP BY time(time) ORDER BY time ASC",
	"rawQuery":true,
	"refId":"A",
	"select":[[{"params":["default_field"],"type":"field"},{"params":[],"type":"avg"}]],
	"tags":[]
}`
	queryContext := &backend.QueryDataRequest{
		Queries: []backend.DataQuery{
			{
				JSON: []byte(requestJson),
				TimeRange: backend.TimeRange{
					From: time.Date(2022, 10, 10, 0, 0, 0, 0, time.UTC),
					To:   time.Date(2022, 10, 17, 0, 0, 0, 0, time.UTC),
				},
			},
		},
	}
	var queryModel plugin.QueryModel
	if err := json.Unmarshal([]byte(requestJson), &queryModel); err != nil {
		t.Error(err)
	}
	if err := queryModel.Introspect(); err != nil {
		t.Error(err)
	}

	sql, err := queryModel.Build(queryContext)
	if err != nil {
		t.Error(err)
	}

	fmt.Println(sql)
}

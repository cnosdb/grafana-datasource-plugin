package plugin_test

import (
	"context"
	"testing"
	"time"

	"github.com/cnosdb/cnos-cnosdb-datasource-backend/pkg/plugin"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// This is where the tests for the datasource backend live.
func TestQueryData(t *testing.T) {
	ds := plugin.CnosdbDatasource{}

	resp, err := ds.QueryData(
		context.Background(),
		&backend.QueryDataRequest{
			Queries: []backend.DataQuery{
				{RefID: "A"},
			},
		},
	)
	if err != nil {
		t.Error(err)
	}

	if len(resp.Responses) != 1 {
		t.Fatal("QueryData must return a response")
	}
}

func TestResample(t *testing.T) {
	fromDate := time.Date(2022, time.October, 10, 12, 30, 00, 0, time.UTC)
	frame := data.NewFrame("response")
	frame.TimeSeriesSchema()
	frame.Fields = append(frame.Fields,
		data.NewField("time", nil, []time.Time{fromDate, fromDate.Add(time.Minute), fromDate.Add(2 * time.Minute)}),
	)
	col0Values := []float64{10, 20, 30}
	frame.Fields = append(frame.Fields,
		data.NewField("col0", nil, []*float64{&col0Values[0], &col0Values[1], &col0Values[2]}),
	)
	interval := plugin.ParseIntervalString("1 minute")
	timeRange := backend.TimeRange{
		From: time.Date(2022, time.October, 10, 12, 30, 00, 0, time.UTC),
		To:   time.Date(2022, time.October, 10, 13, 30, 00, 0, time.UTC),
	}
	fillMode := data.FillModeNull
	fillValue := 0.0
	frame, err := plugin.Resample(frame, interval, timeRange, &data.FillMissing{
		Mode:  fillMode,
		Value: fillValue,
	})

	if err != nil {
		t.Error(err)
	}

}

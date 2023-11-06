package plugin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// Make sure CnosdbDatasource implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. In this example datasource instance implements backend.QueryDataHandler,
// backend.CheckHealthHandler, backend.StreamHandler interfaces. Plugin should not
// implement all these interfaces - only those which are required for a particular task.
// For example if plugin does not need streaming functionality then you are free to remove
// methods that implement backend.StreamHandler. Implementing instancemgmt.InstanceDisposer
// is useful to clean up resources used by previous datasource instance when a new datasource
// instance created upon datasource settings changed.
var (
	_ backend.QueryDataHandler      = (*CnosdbDatasource)(nil)
	_ backend.CheckHealthHandler    = (*CnosdbDatasource)(nil)
	_ instancemgmt.InstanceDisposer = (*CnosdbDatasource)(nil)
)

const (
	ColumnTime = "time"

	TypeFloat64 = "float64"
	TypeString  = "string"
	TypeBool    = "bool"
	TypeNull    = "null"

	FillPrevious = "previous"
	FillNull     = "null"
)

type CnosdbMode int

const (
	CnosdbModePrivate     CnosdbMode = 0
	CnosdbModePublicCloud CnosdbMode = 1
)

type CnosdbDataSourceOptions struct {
	Host                  string     `json:"host"`
	Port                  int        `json:"port"`
	Database              string     `json:"database"`
	CnosdbMode            CnosdbMode `json:"cnosdbMode"`
	Tenant                string     `json:"tenant"`
	ApiKey                string     `json:"apiKey"`
	TargetPartitions      int        `json:"targetPartitions"`
	StreamTriggerInterval string     `json:"streamTriggerInterval"`
	UseChunkedResponse    bool       `json:"useChunkedResponse"`

	EnableHttps bool `json:"enableHttps"`

	// TLS options in JSON config, copied from <grafana>/backend/http_settings.go
	// DataSourceInstanceSettings.HTTPClientOptions() uses these options.

	TlsSKipVerify     bool   `json:"tlsSkipVerify"`
	TlsAuthWithCaCert bool   `json:"tlsAuthWithCACert"`
	CaCert            string `json:"caCert"`
}

func (c *CnosdbDataSourceOptions) buildCnosdbUrl() (*url.URL, error) {
	var port = c.Port
	if c.EnableHttps {
		if port == 0 {
			port = 443
		}
		urlStr := fmt.Sprintf("https://%s:%d", c.Host, c.Port)
		return url.Parse(urlStr)
	} else {
		if port == 0 {
			port = 80
		}
		urlStr := fmt.Sprintf("http://%s:%d", c.Host, c.Port)
		return url.Parse(urlStr)
	}
}

// NewCnosdbDatasource creates a new datasource instance.
func NewCnosdbDatasource(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	var dsConfigJsonData CnosdbDataSourceOptions
	if err := json.Unmarshal(settings.JSONData, &dsConfigJsonData); err != nil {
		return nil, fmt.Errorf("unmarshal CnosDB datasource configurations as JSON: '%s'", err.Error())
	}

	httpOptions, err := settings.HTTPClientOptions(ctx)
	if err != nil {
		return nil, fmt.Errorf("parse http client options: %w", err)
	}

	var cnosdbApi Api
	if dsConfigJsonData.CnosdbMode == CnosdbModePublicCloud {
		// Cloud mode doesn't need those options
		httpOptions.BasicAuth = nil
		if httpOptions.TLS != nil {
			httpOptions.TLS.CACertificate = ""
			httpOptions.TLS.ClientCertificate = ""
			httpOptions.TLS.ClientKey = ""
		}

		cnosdbApi, err = NewCnosdbCloudApi(&dsConfigJsonData)
		if err != nil {
			return nil, fmt.Errorf("invalid CnosDB cloud API: %w", err)
		}
	} else {
		cnosdbApi, err = NewCnosdbApi(&dsConfigJsonData)
		if err != nil {
			return nil, fmt.Errorf("invalid CnosDB API: %w", err)
		}
	}

	httpClient, err := httpclient.New(httpOptions)
	if err != nil {
		return nil, fmt.Errorf("create http client: %w", err)
	}

	return &CnosdbDatasource{
		options:     dsConfigJsonData,
		httpOptions: httpOptions,
		client:      httpClient,
		api:         cnosdbApi,
	}, nil
}

// CnosdbDatasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type CnosdbDatasource struct {
	options CnosdbDataSourceOptions

	httpOptions httpclient.Options
	client      *http.Client
	api         Api
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewCnosdbDatasource factory function.
func (d *CnosdbDatasource) Dispose() {
	// Clean up datasource instance resources.
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *CnosdbDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	// Create response struct
	response := backend.NewQueryDataResponse()

	// Loop over queries and execute them individually.
	// TODO: Use goroutine instead of serial execution.
	for _, q := range req.Queries {
		res := d.query(ctx, req, q)

		// Save the response in a hashmap based on with RefID as identifier
		response.Responses[q.RefID] = res
	}

	return response, nil
}

func (d *CnosdbDatasource) query(ctx context.Context, queryContext *backend.QueryDataRequest, query backend.DataQuery) backend.DataResponse {
	response := backend.DataResponse{}

	var queryModel QueryModel
	var err error
	if err = json.Unmarshal(query.JSON, &queryModel); err != nil {
		return backend.ErrDataResponse(backend.StatusValidationFailed, err.Error())
	}
	if err = queryModel.Introspect(); err != nil {
		return backend.ErrDataResponse(backend.StatusValidationFailed, err.Error())
	}

	// Build sql
	sql := queryModel.Build(queryContext)

	// Build HTTP request
	req, err := d.api.BuildQueryRequest(ctx, d, sql)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusInternal, err.Error())
	}

	// Do HTTP request
	res, err := d.client.Do(req)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadGateway, err.Error())
	}
	defer res.Body.Close()

	// Handle HTTP response
	respData, err := io.ReadAll(res.Body)
	if err != nil && !errors.Is(err, io.EOF) {
		// Error while receiving request payload
		return backend.ErrDataResponse(backend.StatusBadRequest, err.Error())
	}

	if res.StatusCode/100 != 2 {
		var errMsg map[string]string
		if err := json.NewDecoder(bytes.NewReader(respData)).Decode(&errMsg); err != nil {
			return backend.ErrDataResponse(
				backend.StatusBadRequest,
				fmt.Sprintf("Query failed with status '%s', error: Failed to parse response: %s", res.Status, err),
			)
		}
		if error_code, ok := errMsg["error_code"]; ok {
			return backend.ErrDataResponse(
				backend.StatusBadRequest,
				fmt.Sprintf("Query failed with status '%s', error code: %s, error: %s", res.Status, error_code, errMsg["error_message"]),
			)
		} else {
			return backend.ErrDataResponse(
				backend.StatusBadRequest,
				fmt.Sprintf("Query failed with status '%s', error: %s", res.Status, errMsg["message"]),
			)
		}

	}

	var resRows []map[string]interface{}
	var resultNotEmpty = true
	if len(respData) > 0 {
		if err := json.NewDecoder(bytes.NewReader(respData)).Decode(&resRows); err != nil {
			return backend.ErrDataResponse(
				backend.StatusInternal,
				fmt.Sprintf("Failed to decode response jsonData: %s", err),
			)
		}
	} else {
		resultNotEmpty = false
	}

	// Create data frame response.
	frame := data.NewFrame("response")
	timeArray := make([]time.Time, len(resRows))
	valueArrayMap := make(map[string]Array)
	var columnArray []string
	var columnTypes []string

	if resultNotEmpty {
		for i, row := range resRows {
			for col, val := range row {
				if col == ColumnTime {
					parsedTime, err := ParseTimeString(val.(string))
					if err != nil {
						errStr := fmt.Sprintf("Failed to convert to time: %s", err.Error())
						return backend.ErrDataResponse(backend.StatusInternal, errStr)
					}
					timeArray[i] = parsedTime
				} else {
					valArr, ok := valueArrayMap[col]
					valType := typeof(val)
					if !ok {
						valArr = Array{
							stringArray:  make([]*string, len(resRows)),
							float64Array: make([]*float64, len(resRows)),
							boolArray:    make([]*bool, len(resRows)),
						}
						columnArray = append(columnArray, col)
						columnTypes = append(columnTypes, valType)
						valueArrayMap[col] = valArr
					}
					switch valType {
					case TypeFloat64:
						v := val.(float64)
						valArr.float64Array[i] = &v
					case TypeString:
						v := val.(string)
						valArr.stringArray[i] = &v
					case TypeBool:
						v := val.(bool)
						valArr.boolArray[i] = &v
					default:
						// Ignore
						log.DefaultLogger.Debug("Unexpected value type", "value", val, "value_type", valType)
					}
				}
			}
		}
	}

	// Add fields.
	frame.Fields = append(frame.Fields,
		data.NewField(ColumnTime, nil, timeArray),
	)
	for i, col := range columnArray {
		switch columnTypes[i] {
		case TypeFloat64:
			frame.Fields = append(frame.Fields, data.NewField(col, nil, valueArrayMap[col].float64Array))
		case TypeString:
			frame.Fields = append(frame.Fields, data.NewField(col, nil, valueArrayMap[col].stringArray))
		case TypeBool:
			frame.Fields = append(frame.Fields, data.NewField(col, nil, valueArrayMap[col].boolArray))
		default:
			// Ignore
			log.DefaultLogger.Debug("Unexpected column type", "column", col)
		}
	}

	// Resample if needed
	if resultNotEmpty && queryModel.Fill != "" {
		log.DefaultLogger.Debug("Fill detected, need Resample", "fill", queryModel.Fill)
		var fillMode data.FillMode
		var fillValue float64 = 0
		switch strings.ToLower(queryModel.Fill) {
		case FillPrevious:
			fillMode = data.FillModePrevious
		case FillNull:
			fillMode = data.FillModeNull
		default:
			fillMode = data.FillModeValue
			fillValue, err = strconv.ParseFloat(queryModel.Fill, 64)
			if err != nil {
				frame.AppendNotices(data.Notice{Text: "Failed to convert fill value to float", Severity: data.NoticeSeverityWarning})
				return backend.ErrDataResponse(backend.StatusInternal, err.Error())
			}
		}
		interval := ParseIntervalString(queryModel.Interval)
		if interval != 0 {
			frame, err = Resample(frame, interval, query.TimeRange, &data.FillMissing{
				Mode:  fillMode,
				Value: fillValue,
			})
			if err != nil {
				frame.AppendNotices(data.Notice{Text: "Failed to Resample dataframe", Severity: data.NoticeSeverityWarning})
			}
		}
	}

	// Add the frames to the response.
	response.Frames = append(response.Frames, frame)

	return response
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *CnosdbDatasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	pingReq, err := d.api.BuildPingRequest(ctx, d)
	if err != nil {
		return nil, fmt.Errorf("failed to build ping request: %w", err)
	}

	res, err := d.client.Do(pingReq)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: fmt.Sprintf("Ping CnosDB failed: %s", err),
		}, nil
	}

	pingResponse, err := io.ReadAll(res.Body)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: fmt.Sprintf("Ping CnosDB not return anything"),
		}, nil
	}
	if res.StatusCode/100 == 2 {
		return &backend.CheckHealthResult{
			Status:      backend.HealthStatusOk,
			Message:     "Data source is working",
			JSONDetails: pingResponse,
		}, nil
	} else {
		return &backend.CheckHealthResult{
			Status:      backend.HealthStatusError,
			Message:     "Ping CnosDB returned error",
			JSONDetails: pingResponse,
		}, nil
	}
}

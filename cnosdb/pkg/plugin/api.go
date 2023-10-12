package plugin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

type Api interface {
	BuildQueryRequest(ctx context.Context, datasource *CnosdbDatasource, sql string) (*http.Request, error)

	BuildPingRequest(ctx context.Context, datasource *CnosdbDatasource) (*http.Request, error)
}

type CnosdbApi struct {
	queryUrl *url.URL
}

func NewCnosdbApi(options *CnosdbDataSourceOptions) (*CnosdbApi, error) {
	queryUrl, err := options.buildCnosdbUrl()
	if err != nil {
		return nil, err
	}

	queryUrlParams := queryUrl.Query()
	if len(options.Database) > 0 {
		queryUrlParams.Add("db", options.Database)
	}
	if len(options.Tenant) > 0 {
		queryUrlParams.Add("tenant", options.Tenant)
	}
	if options.TargetPartitions != 0 {
		queryUrlParams.Add("target_partitions", strconv.FormatInt(int64(options.TargetPartitions), 10))
	}
	if len(options.StreamTriggerInterval) > 0 {
		queryUrlParams.Add("stream_trigger_interval", options.StreamTriggerInterval)
	}
	if options.UseChunkedResponse {
		queryUrlParams.Set("chunked", "true")
	}
	queryUrl.RawQuery = queryUrlParams.Encode()

	return &CnosdbApi{
		queryUrl: queryUrl,
	}, nil
}

func (c *CnosdbApi) BuildQueryRequest(ctx context.Context, d *CnosdbDatasource, sql string) (*http.Request, error) {
	queryUrl := c.queryUrl.JoinPath("api/v1/sql")

	req, err := http.NewRequestWithContext(ctx, "POST", queryUrl.String(), strings.NewReader(sql))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	if d.httpOptions.BasicAuth != nil {
		req.SetBasicAuth(d.httpOptions.BasicAuth.User, d.httpOptions.BasicAuth.Password)
	}

	return req, err
}

func (c *CnosdbApi) BuildPingRequest(ctx context.Context, d *CnosdbDatasource) (*http.Request, error) {
	queryUrl := c.queryUrl.JoinPath("api/v1/ping")
	queryUrl.RawQuery = ""
	return http.NewRequestWithContext(ctx, "GET", queryUrl.String(), nil)
}

type CnosdbCloudApi struct {
	queryUrl *url.URL
}

func NewCnosdbCloudApi(options *CnosdbDataSourceOptions) (*CnosdbCloudApi, error) {
	queryUrl, err := options.buildCnosdbUrl()
	if err != nil {
		return nil, err
	}

	queryUrlParams := queryUrl.Query()
	if options.TargetPartitions != 0 {
		queryUrlParams.Add("target_partitions", strconv.FormatInt(int64(options.TargetPartitions), 10))
	}
	if len(options.StreamTriggerInterval) > 0 {
		queryUrlParams.Add("stream_trigger_interval", options.StreamTriggerInterval)
	}
	if options.UseChunkedResponse {
		queryUrlParams.Set("chunked", "true")
	}
	queryUrl.RawQuery = queryUrlParams.Encode()

	return &CnosdbCloudApi{
		queryUrl: queryUrl,
	}, nil
}

func (c *CnosdbCloudApi) BuildQueryRequest(ctx context.Context, d *CnosdbDatasource, sql string) (*http.Request, error) {
	dataJson, err := json.Marshal(map[string]interface{}{
		"apikey":   d.options.ApiKey,
		"database": d.options.Database,
		"sql":      sql,
	})
	if err != nil {
		return nil, err
	}

	queryUrl := c.queryUrl.JoinPath("api/v1/sql")
	req, err := http.NewRequestWithContext(ctx, "POST", queryUrl.String(), bytes.NewReader(dataJson))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	return req, nil
}

func (c *CnosdbCloudApi) BuildPingRequest(ctx context.Context, d *CnosdbDatasource) (*http.Request, error) {
	queryUrl := c.queryUrl.JoinPath("api/v1/ping")
	queryUrlParams := url.Values{}
	queryUrlParams.Set("apikey", d.options.ApiKey)
	queryUrl.RawQuery = queryUrlParams.Encode()
	return http.NewRequestWithContext(ctx, "GET", queryUrl.String(), nil)
}

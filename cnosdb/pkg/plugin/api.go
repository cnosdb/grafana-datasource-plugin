package plugin

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
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
	queryUri string
}

func NewCnosdbApi(options *CnosdbDataSourceOptions) *CnosdbApi {
	var queryUri = "/api/v1/sql"
	var isFirstParam = false
	if len(options.Database) > 0 {
		queryUri += "?db=" + url.QueryEscape(options.Database)
		isFirstParam = false
	}
	if len(options.Tenant) > 0 {
		if isFirstParam {
			queryUri += "?"
			isFirstParam = false
		} else {
			queryUri += "&"
		}
		queryUri += "tenant=" + url.QueryEscape(options.Tenant)
	}
	if options.TargetPartitions != 0 {
		if isFirstParam {
			queryUri += "?"
			isFirstParam = false
		} else {
			queryUri += "&"
		}
		queryUri += "target_partitions=" + strconv.FormatInt(int64(options.TargetPartitions), 10)
	}
	if len(options.StreamTriggerInterval) > 0 {
		if isFirstParam {
			queryUri += "?"
			isFirstParam = false
		} else {
			queryUri += "&"
		}
		queryUri += "stream_trigger_interval=" + url.QueryEscape(options.StreamTriggerInterval)
	}
	if options.UseChunkedResponse {
		if isFirstParam {
			queryUri += "?"
			isFirstParam = false
		} else {
			queryUri += "&"
		}
		queryUri += "chunked"
	}

	return &CnosdbApi{
		queryUri: queryUri,
	}
}

func (c *CnosdbApi) BuildQueryRequest(ctx context.Context, d *CnosdbDatasource, sql string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, "POST", d.url+c.queryUri, strings.NewReader(sql))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	if d.options.UseBasicAuth {
		req.SetBasicAuth(d.options.User, d.password)
	}

	return req, err
}

func (c *CnosdbApi) BuildPingRequest(ctx context.Context, d *CnosdbDatasource) (*http.Request, error) {
	return http.NewRequestWithContext(ctx, "GET", d.url+"/api/v1/ping", nil)
}

type CnosdbCloudApi struct {
}

func (c *CnosdbCloudApi) BuildQueryRequest(ctx context.Context, d *CnosdbDatasource, sql string) (*http.Request, error) {
	log.DefaultLogger.Info("Building sql for cloud", "sql", sql)
	dataJson, err := json.Marshal(map[string]interface{}{
		"apikey":   d.options.ApiKey,
		"database": d.options.Database,
		"sql":      sql,
	})
	if err != nil {
		log.DefaultLogger.Info("Failed to build query request json", "err", err)
		return nil, err
	}
	log.DefaultLogger.Info("Built query request", "url", d.url+"/api/v1/sql", "data", string(dataJson))

	req, err := http.NewRequestWithContext(ctx, "POST", d.url+"/api/v1/sql", bytes.NewReader(dataJson))
	if err != nil {
		log.DefaultLogger.Info("Failed to build query request", "err", err)
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	return req, nil
}

func (c *CnosdbCloudApi) BuildPingRequest(ctx context.Context, d *CnosdbDatasource) (*http.Request, error) {
	return http.NewRequestWithContext(ctx, "GET", d.url+"/api/v1/ping?apikey="+d.options.ApiKey, nil)
}

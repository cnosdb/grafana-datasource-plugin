package plugin

import (
	"fmt"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

var (
	RegexpTimeFilter1 = CompileVariableRegexp("timeFilter")
	RegexpTimeFilter2 = CompileVariableRegexp("__timeFilter")
	RegexpInterval    = CompileVariableRegexp("__interval")
)

const (
	GroupTypeTime = "time"
	GroupTypeFill = "fill"
)

const DefaultLimit = 1000

type SelectItem struct {
	Def    *QueryDefinition
	Type   string   `json:"type,omitempty"`
	Params []string `json:"params,omitempty"`
}

func (s *SelectItem) Render(query *QueryModel, queryContext *backend.QueryDataRequest, expr string) string {
	return s.Def.Renderer(query, queryContext, s, expr)
}

type TagItem struct {
	Key       string `json:"key,omitempty"`
	Operator  string `json:"operator,omitempty"`
	Condition string `json:"condition,omitempty"`
	Value     string `json:"value,omitempty"`
}

type QueryModel struct {
	Table       string          `json:"table,omitempty"`
	Select      [][]*SelectItem `json:"select,omitempty"`
	Tags        []*TagItem      `json:"tags,omitempty"`
	RawTagsExpr string          `json:"rawTagsExpr,omitempty"`
	GroupBy     []*SelectItem   `json:"groupBy,omitempty"`
	Interval    string          `json:"interval,omitempty"`
	Fill        string          `json:"fill,omitempty"`
	OrderByTime string          `json:"orderByTime,omitempty"`
	Limit       string          `json:"limit,omitempty"`
	Tz          string          `json:"tz,omitempty"`

	RawQuery  bool   `json:"rawQuery,omitempty"`
	QueryText string `json:"queryText,omitempty"`
	Alias     string `json:"alias,omitempty"`
}

func (query *QueryModel) Introspect() error {
	for _, sel := range query.Select {
		for _, s := range sel {
			def, exists := renders[s.Type]
			if !exists {
				return fmt.Errorf("missing query definition for %q", s.Type)
			}
			s.Def = &def
		}
	}
	for _, s := range query.GroupBy {
		if s.Type == GroupTypeTime {
			// from: GROUP BY time($interval)
			// to: "GROUP BY time", "DATE_BIN(... $interval ...) AS time"
			query.Interval = s.Params[0]
		} else if s.Type == GroupTypeFill {
			query.Fill = s.Params[0]
		}
		def, exists := renders[s.Type]
		if !exists {
			return fmt.Errorf("missing query definition for %q", s.Type)
		}
		s.Def = &def
	}
	if query.RawQuery {
		query.Fill = ""
	}

	return nil
}

func (query *QueryModel) Build(queryContext *backend.QueryDataRequest) string {
	var res string
	if query.RawQuery && query.QueryText != "" {
		res = query.QueryText
	} else {
		res = query.renderSelectors(queryContext)
		res += query.renderMeasurement()
		res += query.renderWhereClause()
		res += query.renderTimeFilter(queryContext)
		res += query.renderGroupBy(queryContext)
		res += query.renderOrderByTime()
		res += query.renderLimit()
	}

	resBytes := []byte(res)
	timeFilter := []byte(query.renderTimeFilter(queryContext))
	resBytes = RegexpTimeFilter1.ReplaceAll(resBytes, timeFilter)
	resBytes = RegexpTimeFilter2.ReplaceAll(resBytes, timeFilter)
	resBytes = RegexpInterval.ReplaceAll(resBytes, []byte(query.Interval))

	return string(resBytes)
}

func (query *QueryModel) renderTimeFilter(queryContext *backend.QueryDataRequest) string {
	timeRange := &queryContext.Queries[0].TimeRange
	if timeRange == nil {
		return ""
	}
	return fmt.Sprintf("time >= %d AND time <= %d", timeRange.From.UnixNano(), timeRange.To.UnixNano())
}

func (query *QueryModel) renderSelectors(queryContext *backend.QueryDataRequest) string {
	res := "SELECT "
	if query.Interval != "" {
		res += fmt.Sprintf("DATE_BIN(INTERVAL '%s', time, TIMESTAMP '1970-01-01T00:00:00Z') AS time, ", query.Interval)
	} else {
		res += "time, "
	}

	var selectors []string
	for _, sel := range query.Select {
		stk := ""
		for _, s := range sel {
			stk = s.Render(query, queryContext, stk)
		}
		selectors = append(selectors, stk)
	}

	return res + strings.Join(selectors, ", ")
}

func (query *QueryModel) renderMeasurement() string {
	return fmt.Sprintf(` FROM %s`, query.Table)
}

func (query *QueryModel) renderTags() []string {
	var res []string
	for i, tag := range query.Tags {
		str := ""

		if i > 0 {
			if tag.Condition == "" {
				str += "AND"
			} else {
				str += tag.Condition
			}
			str += " "
		}

		// If the operator is missing we fall back to sensible defaults
		if tag.Operator == "" {
			tag.Operator = "="
		}

		var textValue string
		switch tag.Operator {
		case "<", ">":
			textValue = tag.Value
		default:
			textValue = fmt.Sprintf("'%s'", strings.ReplaceAll(tag.Value, `\`, `\\`))
		}

		res = append(res, fmt.Sprintf(`%s"%s" %s %s`, str, tag.Key, tag.Operator, textValue))
	}

	return res
}

func (query *QueryModel) renderWhereClause() string {
	res := " WHERE "
	if len(query.RawTagsExpr) > 0 {
		res += "(" + query.RawTagsExpr + ")"
		res += " AND "
	}
	tagsExpr := query.renderTags()
	if len(tagsExpr) > 0 {
		if len(tagsExpr) > 1 {
			res += "(" + strings.Join(tagsExpr, " ") + ")"
		} else {
			res += tagsExpr[0]
		}
		res += " AND "
	}

	return res
}

func (query *QueryModel) renderGroupBy(queryContext *backend.QueryDataRequest) string {
	groupBy := ""
	for i, group := range query.GroupBy {
		if i == 0 {
			groupBy += " GROUP BY "
		}

		if i > 0 && group.Type != "fill" {
			groupBy += ", "
		}

		groupBy += group.Render(query, queryContext, "")
	}

	return groupBy
}

func (query *QueryModel) renderOrderByTime() string {
	orderByTime := query.OrderByTime
	if orderByTime == "" {
		return ""
	}
	return fmt.Sprintf(" ORDER BY time %s", orderByTime)
}

func (query *QueryModel) renderLimit() string {
	limit := query.Limit
	if limit == "" {
		return fmt.Sprintf(" LIMIT %d", DefaultLimit)
	}
	return fmt.Sprintf(" LIMIT %s", limit)
}

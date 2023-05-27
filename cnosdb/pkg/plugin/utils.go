package plugin

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	LayoutSecond      = "2006-01-02T15:04:05"
	LayoutMillisecond = "2006-01-02T15:04:05.000"
	LayoutMicrosecond = "2006-01-02T15:04:05.000000"
	LayoutNanosecond  = "2006-01-02T15:04:05.000000000"
)

func ParseTimeString(timeStr string) (time.Time, error) {
	switch len(timeStr) {
	case len(LayoutSecond):
		if timeStr[10] == 'T' {
			return time.Parse(LayoutSecond, timeStr)
		} else {
			return time.Parse(time.DateTime, timeStr)
		}
	case len(LayoutMillisecond):
		return time.Parse(LayoutMillisecond, timeStr)
	case len(LayoutMicrosecond):
		return time.Parse(LayoutMicrosecond, timeStr)
	default:
		return time.Parse(LayoutNanosecond, timeStr)
	}
}

func ParseIntervalString(intervalStr string) time.Duration {
	seg := strings.Split(intervalStr, " ")
	if len(seg) < 2 {
		return 0
	}

	num, err := strconv.ParseInt(seg[0], 10, 64)
	if err != nil {
		return 0
	}

	// TODO: support century decade year month week day (hour minute second) millisecond microsecond nanosecond
	// TODO: support combined interval string (3 year 1 month; 3 year -1 month)
	unit := strings.ToLower(seg[1])
	if strings.HasPrefix(unit, "second") {
		return time.Duration(num) * time.Second
	} else if strings.HasPrefix(unit, "minute") {
		return time.Duration(num) * time.Minute
	} else if strings.HasPrefix(unit, "hour") {
		return time.Duration(num) * time.Hour
	} else {
		return 0
	}
}

func typeof(value interface{}) string {
	if value != nil {
		return fmt.Sprintf("%T", value)
	}
	return TypeNull
}

func CompileVariableRegexp(variableName string) *regexp.Regexp {
	str := fmt.Sprintf("\\$\\{?%s\\}?", variableName)
	return regexp.MustCompile(str)
}

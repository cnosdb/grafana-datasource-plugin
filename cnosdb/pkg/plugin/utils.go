package plugin

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

const (
	LAYOUT_SECOND      = "2006-01-02T15:04:05"
	LAYOUT_MILLISECOND = "2006-01-02T15:04:05.000"
	LAYOUT_NANOSECOND  = "2006-01-02T15:04:05.000000"
)

func ParseTimeString(timeStr string) (time.Time, error) {
	switch len(timeStr) {
	case len(LAYOUT_SECOND):
		return time.Parse(LAYOUT_SECOND, timeStr)
	case len(LAYOUT_MILLISECOND):
		return time.Parse(LAYOUT_MILLISECOND, timeStr)
	default:
		return time.Parse(LAYOUT_NANOSECOND, timeStr)
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
	return "null"
}

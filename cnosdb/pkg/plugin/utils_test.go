package plugin

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestFormatDateTime(t *testing.T) {
	t0, err := time.Parse(time.RFC3339, "2022-03-07T11:39:00+08:00")
	if err != nil {
		t.Fatal(err)
	}
	t1, err := ParseTimeString("2022-03-07 11:39:00")
	if err != nil {
		t.Fatal(err)
	}
	t2, err := ParseTimeString("2022-03-07T11:39:00")
	if err != nil {
		t.Fatal(err)
	}
	assert.Equal(t, t0, t1)
	assert.Equal(t, t0, t2)
}

func TestTimestamp(t *testing.T) {
	t0, err := time.Parse(time.RFC3339, "2023-05-31T16:41:00+08:00")
	if err != nil {
		t.Fatal(err)
	}
	fmt.Println(t0, t0.UnixMilli())
	t1, err := ParseTimeString("2023-05-31T16:41:00")
	if err != nil {
		t.Fatal(err)
	}
	fmt.Println(t1, t1.UnixMilli())
}

func TestParseIntervalString(t *testing.T) {
	interval := ParseIntervalString("10 minute")
	assert.Equal(t, interval, time.Duration(10)*time.Minute)

	interval = ParseIntervalString("10 seconds")
	assert.Equal(t, interval, time.Duration(10)*time.Second)

	interval = ParseIntervalString("10 hours")
	assert.Equal(t, interval, time.Duration(10)*time.Hour)
}

package plugin

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestFormatDateTime(t *testing.T) {
	t0, err := time.Parse(time.DateTime, "2022-03-07 11:39:00")
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
	assert.Equal(t, t1, t0)
	assert.Equal(t, t2, t0)
}

func TestParseIntervalString(t *testing.T) {
	interval := ParseIntervalString("10 minute")
	assert.Equal(t, interval, time.Duration(10)*time.Minute)

	interval = ParseIntervalString("10 seconds")
	assert.Equal(t, interval, time.Duration(10)*time.Second)

	interval = ParseIntervalString("10 hours")
	assert.Equal(t, interval, time.Duration(10)*time.Hour)
}

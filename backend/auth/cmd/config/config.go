package config

import (
  "os"
);

var AccessSecret string;
var RefreshSecret string;

func Load() {
  AccessSecret = os.Getenv("ACCESS_SECRET");
  RefreshSecret = os.Getenv("REFRESH_SECRET");
};
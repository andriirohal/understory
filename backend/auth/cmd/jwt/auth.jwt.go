package jwt

import (
  "Auth/cmd/models"
	
  "errors"
  "fmt"
  "time"
  "github.com/golang-jwt/jwt/v5"
);

func SignAccessToken(userId, email, accessSecret string) (string, error) {
  claims := jwt.MapClaims{
    "userId": userId,
    "email": email,
	  "exp": time.Now().Add(15 * time.Minute).Unix(),
  };

  accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims);

  return accessToken.SignedString([]byte(accessSecret));
};

func SignRefreshToken(userId, email, refreshSecret string) (string, error) {
  claims := jwt.MapClaims{
    "userId": userId,
    "email": email,
	  "exp": time.Now().Add(14 * 24 * time.Hour).Unix(),
  };

  refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims);

  return refreshToken.SignedString([]byte(refreshSecret));
};

func VerifyAccessToken(accessString, accessSecret string) (models.UserPayload, error) {
  accessToken, err := jwt.ParseWithClaims(accessString, &models.UserPayload{}, func(t *jwt.Token) (any, error) {
    if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
      return nil, fmt.Errorf("Unexpected signing method");
    };

    return []byte(accessSecret), nil;
  });

  if err != nil {
    return models.UserPayload{}, errors.New("Invalid access token");
  };

  claims, ok := accessToken.Claims.(*models.UserPayload);

  if !ok {
    return models.UserPayload{}, errors.New("Invalid access token");
  };

  return *claims, nil;
};

func VerifyRefreshToken(refreshString, refreshSecret string) (models.UserPayload, error) {
  accessToken, err := jwt.ParseWithClaims(refreshString, &models.UserPayload{}, func(t *jwt.Token) (any, error) {
    if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
      return nil, fmt.Errorf("Unexpected signing method")
    };

    return []byte(refreshSecret), nil;
  });

  if err != nil || !accessToken.Valid {
    return models.UserPayload{}, errors.New("Invalid refresh token");
  };

  claims, ok := accessToken.Claims.(*models.UserPayload);

  if !ok {
    return models.UserPayload{}, errors.New("Invalid refresh token");
  };

  return *claims, nil;
};
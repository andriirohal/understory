package models

import (
  "github.com/golang-jwt/jwt/v5"
  "time"
);

type UserPayload struct {
  UserId string `json:"userId"`
  Email  string `json:"email"`
  jwt.RegisteredClaims;
};

type UserResponse struct {
  UserId string `json:"userId"`;
  Name string `json:"name"`;
  Email string `json:"email"`;
  AccessToken string `json:"accessToken"`;
  RefreshToken *string `json:"refreshToken"`;
  CreatedAt time.Time `json:"createdAt"`;
};

type UserRecord struct {
  UserId string `json:"userId"`;
  CreatedAt time.Time `json:"createdAt"`;
};

type UserBase struct {
  UserId string `json:"userId"`;
  Name string `json:"name"`;
  Email string `json:"email"`;
  RefreshToken string `json:"refreshToken"`;
  CreatedAt time.Time `json:"createdAt"`;
};

type UserRow struct {
  UserId string `json:"userId"`;
  Name string `json:"name"`;
  Email string `json:"email"`;
  RefreshToken *string `json:"refreshToken"`;
  CreatedAt time.Time `json:"createdAt"`;
};

type UserInput struct {
  Name string `json:"name"`;
  Email string `json:"email"`;
  Password string `json:"password"`;
};

type UserModel struct {
	UserId string `json:"userId"`;
	Name string `json:"name"`;
	Email string `json:"email"`;
	Password string `json:"password"`;
	CreatedAt time.Time `json:"createdAt"`;
};

type AuthInput struct {
  Email string `json:"email"`;
  Password string `json:"password"`;
};

type Authentication struct {
  AccessToken string `json:"accessToken"`;
  RefreshToken string `json:"refreshToken"`;
};

type UserSummary struct {
  TotalOrders int `json:"totalOrders"`;
  TotalPlants int `json:"totalPlants"`;
  LastOrderDate *time.Time `json:"lastOrderDate"`;
};
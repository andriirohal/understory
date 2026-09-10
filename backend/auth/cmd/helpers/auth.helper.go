package helpers

import (
  "Auth/cmd/config"
  "Auth/cmd/jwt"
  "Auth/cmd/models"
	
  "crypto/sha256"
  "encoding/hex"
  "errors"
  "net/mail"
  "strings"
  "unicode/utf8"
  "github.com/jackc/pgx/v5"
  "golang.org/x/crypto/bcrypt"
);

func IsValidName(name string) string {
  if utf8.RuneCountInString(name) == 0 || name != strings.TrimSpace(name) {
    return "";
  };

  return name;
};

func IsValidPassword(password string) string {
  length := utf8.RuneCountInString(password);

  if length < 8 || length > 100 {
    return "";
  };
  
  return password;
};

func IsValidEmail(email string) string {
  if email == "" || email != strings.TrimSpace(email) {
    return "";
  };

  address, err := mail.ParseAddress(email);

  if err != nil || address.Address != email {
    return "";
  };

  return email;
};

func IssueAuthentication(payload models.UserPayload) (models.Authentication, error) {
  AccessToken, err := jwt.SignAccessToken(payload.UserId, payload.Email, config.AccessSecret);

  if err != nil {
    return models.Authentication{}, errors.New("Invalid access token");
  };

  RefreshToken, err := jwt.SignRefreshToken(payload.UserId, payload.Email, config.RefreshSecret);

  if err != nil {
    return models.Authentication{}, errors.New("Invalid refresh token");
  };

  authentication := models.Authentication{
    AccessToken: AccessToken,
    RefreshToken: RefreshToken,
  };

  return authentication, nil;
};

func ScanUserBase(row pgx.Row) (models.UserBase, error) {
  var user models.UserBase;

  err := row.Scan(
    &user.UserId,
    &user.CreatedAt,
  );

  return user, err;
};

func ScanUserId(row pgx.Row) (string, error) {
  var userId string;

  err := row.Scan(
    &userId,
  );

  return userId, err;
};

func ScanUser(row pgx.Row) (models.User, error) {
  var user models.User;

  err := row.Scan(
    &user.UserId,
    &user.Name,
    &user.Email,
    &user.Password,
    &user.RefreshToken,
    &user.CreatedAt,
  );

  return user, err;
};

func ScanUserRecord(row pgx.Row) (models.UserRecord, error) {
  var user models.UserRecord;

  err := row.Scan(
    &user.UserId,
    &user.Name,
    &user.Email,
    &user.RefreshToken,
    &user.CreatedAt,
  );

  return user, err;
};

func ScanUserResponse(row pgx.Row) (models.UserResponse, error) {
  var response models.UserResponse;

  err := row.Scan(
    &response.UserId,
    &response.Name,
    &response.Email,
    &response.CreatedAt,
  );

  return response, err;
};

func ScanUserSummary(row pgx.Row) (models.UserSummary, error) {
  var user models.UserSummary;

  err := row.Scan(
    &user.TotalOrders,
    &user.TotalPlants,
    &user.LastOrderDate,
  );

  return user, err;
};

func HashPassword(password string) (string, error) {
  hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost);

  return string(hash), err;
};

func HashRefreshToken(refreshToken string) (string, error) {
  hash := sha256.Sum256([]byte(refreshToken));

  return hex.EncodeToString(hash[:]), nil;
};

func CompareRefreshToken(refreshToken, hashedRefreshToken string) bool {
  hash := sha256.Sum256([]byte(refreshToken));

  return hex.EncodeToString(hash[:]) == hashedRefreshToken;
};

func ParseRefreshToken(refreshToken string) (models.UserPayload, error) {
  decoded, err := jwt.VerifyRefreshToken(refreshToken, config.RefreshSecret);

  if err != nil {
    return models.UserPayload{}, errors.New("Invalid refresh token");
  };

  return decoded, nil;
};
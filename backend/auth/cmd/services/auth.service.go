package services

import (
	"Auth/cmd/db"
	"Auth/cmd/helpers"
	"Auth/cmd/models"

	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
);

func SignUpUser(ctx context.Context, input models.UserInput) (models.UserResponse, error) {
  if !helpers.IsValidName(input.Name) {
    return models.UserResponse{}, errors.New("Name must be 20 characters or less");
  };

  email := helpers.IsValidEmail(input.Email);

  if email == "" {
    return models.UserResponse{}, errors.New("Please enter a valid email address");
  };

  password := helpers.IsValidPassword(input.Password);

  if password == "" {
    return models.UserResponse{}, errors.New("Password must be 8–100 characters");
  };

  hashedPassword, err := helpers.HashPassword(password);

  if err != nil {
    return models.UserResponse{}, err;
  };

  tx, err := db.DB.Begin(ctx);

  if err != nil {
    return models.UserResponse{}, err;
  };

  defer tx.Rollback(ctx);

  row := tx.QueryRow(ctx, `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, "createdAt"`,
    input.Name, email, hashedPassword,
  );

  user, err := helpers.ScanUserBase(row);

  if err != nil {
    return models.UserResponse{}, err;
  };

  payload := models.UserPayload{
    UserId: user.UserId,
    Email: email,
  };
  
  authentication, err := helpers.IssueAuthentication(payload);

  if err != nil {
    return models.UserResponse{}, err;
  };

  hashedRefreshToken, err := helpers.HashRefreshToken(authentication.RefreshToken);

  if err != nil {
    return models.UserResponse{}, err;
  };

  _, err = tx.Exec(ctx, `UPDATE users SET "refreshToken" = $2 WHERE id = $1`,
    user.UserId, hashedRefreshToken,
  );

  if err != nil {
    return models.UserResponse{}, err;
  };

  if err := tx.Commit(ctx); err != nil {
    return models.UserResponse{}, err;
  };

  response := models.UserResponse{
    UserId: user.UserId,
    Name: input.Name,
    Email: email,
    AccessToken: authentication.AccessToken,
    RefreshToken: &authentication.RefreshToken,
    CreatedAt: user.CreatedAt,
  };

  return response, nil;
};

func LogInUser(ctx context.Context, input models.AuthInput) (models.UserResponse, error) {
  email := helpers.IsValidEmail(input.Email);
    
  if email == "" {
    return models.UserResponse{}, errors.New("Please enter a valid email address");
  };

  password := helpers.IsValidPassword(input.Password);

  if password == "" {
    return models.UserResponse{}, errors.New("Password must be 8–100 characters");
  };

  tx, err := db.DB.Begin(ctx);

  if err != nil {
    return models.UserResponse{}, err;
  };

  defer tx.Rollback(ctx);

  user, err := helpers.ScanUserModel(tx.QueryRow(ctx, `SELECT id, name, email, password, "createdAt" FROM users WHERE email = $1`,
    email,
    ),
  );

  if err != nil {
    if errors.Is(err, pgx.ErrNoRows) {
      return models.UserResponse{}, errors.New("We couldn't find an account with this email address");
    };

    return models.UserResponse{}, err;
  };

  err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password));

  if err != nil {
    return models.UserResponse{}, errors.New("We couldn't verify your password");
  };

  payload := models.UserPayload{
    UserId: user.UserId,
    Email: user.Email,
  };

  authentication, err := helpers.IssueAuthentication(payload);

  if err != nil {
    return models.UserResponse{}, err;
  };

  hashedRefreshToken, err := helpers.HashRefreshToken(authentication.RefreshToken);

  if err != nil {
    return models.UserResponse{}, err;
  };

  _, err = tx.Exec(ctx, `UPDATE users SET "refreshToken" = $2 WHERE id = $1`,
    payload.UserId, hashedRefreshToken,
  );

  if err != nil {
    return models.UserResponse{}, err;
  };

  if err := tx.Commit(ctx); err != nil {
    return models.UserResponse{}, err;
  };

  response := models.UserResponse{
    UserId: user.UserId,
    Name: user.Name,
    Email: user.Email,
    AccessToken: authentication.AccessToken,
    RefreshToken: &authentication.RefreshToken,
    CreatedAt: user.CreatedAt,
  };

  return response, nil;
};

func RotateUserTokens(ctx context.Context, refreshToken string) (models.Authentication, error) {
  if refreshToken == "" {
    return models.Authentication{}, errors.New("Invalid refresh token");
  };

  decoded, err := helpers.ParseRefreshToken(refreshToken);

  if err != nil {
    return models.Authentication{}, errors.New("Invalid refresh token");
  };

  tx, err := db.DB.Begin(ctx);
  
  if err != nil {
    return models.Authentication{}, err;
  };

  defer tx.Rollback(ctx);

  user, err := helpers.ScanUserRow(tx.QueryRow(ctx, `SELECT id, name, email, "refreshToken", "createdAt" FROM users WHERE id = $1 FOR UPDATE`,
    decoded.UserId,
    ),
  );

  if err != nil {
    if errors.Is(err, pgx.ErrNoRows) {
      return models.Authentication{}, errors.New("Invalid refresh token");
    };

    return models.Authentication{}, err;
  };

  if user.RefreshToken == nil {
    return models.Authentication{}, errors.New("Invalid refresh token");
  };

  if !helpers.CompareRefreshToken(refreshToken, *user.RefreshToken) {
    return models.Authentication{}, errors.New("Invalid refresh token");
  };

  payload := models.UserPayload{
    UserId: user.UserId,
    Email: user.Email,
  };

  authentication, err := helpers.IssueAuthentication(payload);

  if err != nil {
    return models.Authentication{}, err;
  };

  hashedRefreshToken, err := helpers.HashRefreshToken(authentication.RefreshToken);

  if err != nil {
    return models.Authentication{}, err;
  };

  _, err = tx.Exec(ctx, `UPDATE users SET "refreshToken" = $2 WHERE id = $1`,
    user.UserId, hashedRefreshToken,
  );

  if err != nil {
    return models.Authentication{}, err;
  };

  if err := tx.Commit(ctx); err != nil {
    return models.Authentication{}, err;
  };

  return authentication, nil;
};

func LogOutUser(ctx context.Context, refreshToken string) (string, error) {
  decoded, err := helpers.ParseRefreshToken(refreshToken);

  if err != nil {
    return "", err;
  };
  
  _, err = helpers.ScanUserId(db.DB.QueryRow(ctx, `UPDATE users SET "refreshToken" = NULL WHERE id = $1 RETURNING id`,
    decoded.UserId,
    ),
  );

  if err != nil {
    if errors.Is(err, pgx.ErrNoRows) {
      return "", errors.New("User not found");
    };

    return "", err;
  };

  return "Logged out successfully", nil;
};

func GetLoggedInUser(ctx context.Context, userId string) (models.UserResponse, error) {
  response, err := helpers.ScanUserResponse(db.DB.QueryRow(ctx, `SELECT id, name, email, "createdAt" FROM users WHERE id = $1`,
    userId,
    ),
  );

  if err != nil {
    if errors.Is(err, pgx.ErrNoRows) {
      return models.UserResponse{}, errors.New("User not found");
    };

    return models.UserResponse{}, err;
  };

  return response, nil;
};

func GetUserSummary(ctx context.Context, userId string) (models.UserSummary, error) {
  user, err := helpers.ScanUserSummary(db.DB.QueryRow(ctx, `SELECT COUNT(DISTINCT orders.id) AS "totalOrders", COALESCE(SUM("orderItems".quantity), 0) AS "totalPlants", MAX(orders."createdAt") AS "lastOrderDate" FROM orders LEFT JOIN "orderItems" ON orders.id = "orderItems"."orderId" WHERE orders."userId" = $1 AND orders.status = 'completed'`,
    userId,
    ),
  );

  if err != nil {
    return models.UserSummary{}, err;
  };

  return user, nil;
};
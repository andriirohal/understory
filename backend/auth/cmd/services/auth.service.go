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

func SignUpUser(ctx context.Context, input models.UserInput) (models.AuthResponse, error) {
  name := helpers.IsValidName(input.Name);

  if name == "" {
    return models.AuthResponse{}, errors.New("Name is required");
  };

  email := helpers.IsValidEmail(input.Email);

  if email == "" {
    return models.AuthResponse{}, errors.New("Please enter a valid email");
  };

  password := helpers.IsValidPassword(input.Password);

  if password == "" {
    return models.AuthResponse{}, errors.New("Password must be 8–100 characters");
  };

  hashedPassword, err := helpers.HashPassword(password);

  if err != nil {
    return models.AuthResponse{}, errors.New("An unexpected error occurred");
  };

  row := db.DB.QueryRow(ctx, `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, "createdAt"`,
    name, email, hashedPassword,
  );

  user, err := helpers.ScanUserBase(row);

  if err != nil {
    return models.AuthResponse{}, err;
  };

  payload := models.UserPayload{
    UserId: user.UserId,
    Email: email,
  };
  
  authentication, err := helpers.IssueAuthentication(payload);

  if err != nil {
    return models.AuthResponse{}, err;
  };

  hashedRefreshToken, err := helpers.HashRefreshToken(authentication.RefreshToken);

  if err != nil {
    return models.AuthResponse{}, err;
  };

  _, err = helpers.ScanUserBase(db.DB.QueryRow(ctx, `UPDATE users SET "refreshToken" = $2 WHERE id = $1 RETURNING id, "createdAt"`,
    user.UserId, hashedRefreshToken,
    ),
  );

  if err != nil {
    return models.AuthResponse{}, err;
  };

  response := models.AuthResponse{
    UserId: user.UserId,
    Name: name,
    Email: email,
    AccessToken: authentication.AccessToken,
    RefreshToken: authentication.RefreshToken,
    CreatedAt: user.CreatedAt,
  };

  return response, nil;
};

func LogInUser(ctx context.Context, input models.AuthInput) (models.AuthResponse, error) {
  email := helpers.IsValidEmail(input.Email);
    
  if email == "" {
    return models.AuthResponse{}, errors.New("Please enter a valid email");
  };

  password := helpers.IsValidPassword(input.Password);

  if password == "" {
    return models.AuthResponse{}, errors.New("Password must be 8–100 characters");
  };

  user, err := helpers.ScanUser(db.DB.QueryRow(ctx, `SELECT id, name, email, password, "refreshToken", "createdAt" FROM users WHERE email = $1`,
    email,
    ),
  );

  if err != nil {
    if errors.Is(err, pgx.ErrNoRows) {
      return models.AuthResponse{}, errors.New("We couldn't find an account with this email");
    };

    return models.AuthResponse{}, err;
  };

  err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password));

  if err != nil {
    return models.AuthResponse{}, errors.New("We couldn't verify your password");
  };

  payload := models.UserPayload{
    UserId: user.UserId,
    Email: user.Email,
  };

  authentication, err := helpers.IssueAuthentication(payload);

  if err != nil {
    return models.AuthResponse{}, err;
  };

  hashedRefreshToken, err := helpers.HashRefreshToken(authentication.RefreshToken);

  if err != nil {
    return models.AuthResponse{}, err;
  };

  _, err = helpers.ScanUserBase(db.DB.QueryRow(ctx, `UPDATE users SET "refreshToken" = $2 WHERE id = $1 RETURNING id, "createdAt"`,
    payload.UserId, hashedRefreshToken,
    ),
  );

  if err != nil {
    return models.AuthResponse{}, err;
  };

  response := models.AuthResponse{
    UserId: user.UserId,
    Name: user.Name,
    Email: user.Email,
    AccessToken: authentication.AccessToken,
    RefreshToken: authentication.RefreshToken,
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

  user, err := helpers.ScanUserRecord(db.DB.QueryRow(ctx, `SELECT id, name, email, "refreshToken", "createdAt" FROM users WHERE id = $1`,
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

  autentication, err := helpers.IssueAuthentication(payload);

  if err != nil {
    return models.Authentication{}, err;
  };

  hashedRefreshToken, err := helpers.HashRefreshToken(autentication.RefreshToken);

  if err != nil {
    return models.Authentication{}, err;
  };

  _, err = helpers.ScanUserBase(db.DB.QueryRow(ctx, `UPDATE users SET "refreshToken" = $2 WHERE id = $1 RETURNING id, "createdAt"`,
    user.UserId, hashedRefreshToken,
    ),
  );

  if err != nil {
    return models.Authentication{}, err;
  };

  return autentication, nil;
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
    if errors.Is(err, pgx.ErrNoRows) {
      return models.UserSummary{}, errors.New("User not found");
    };

    return models.UserSummary{}, err;
  };

  return user, nil;
};
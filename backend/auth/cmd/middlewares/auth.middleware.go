package middlewares

import (
  "Auth/cmd/config"
  "Auth/cmd/jwt"

  "errors"
  "strings"
  "github.com/gin-gonic/gin"
  "github.com/jackc/pgx/v5/pgconn"
);

func Authenticate(ctx *gin.Context) {
  authorization := ctx.GetHeader("Authorization");

  parts := strings.SplitN(authorization, " ", 2);

  if len(parts) != 2 || parts[0] != "Bearer" || parts[1] == "" {
    ctx.AbortWithStatusJSON(401, gin.H {
      "error": "Invalid access token",
	  });
	  return;
  };

  accessString := parts[1];

  payload, err := jwt.VerifyAccessToken(accessString, config.AccessSecret);

  if err != nil {
    ctx.AbortWithStatusJSON(401, gin.H {
      "error": "Invalid access token",
	  });
	  return;
  };

  ctx.Set("userId", payload.UserId);

  ctx.Next();
};

func UniqueHandler(ctx *gin.Context) {
  ctx.Next();

  for _, err := range ctx.Errors {
    var pgErr *pgconn.PgError;

    if errors.As(err.Err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "users_email_unique" {
      if !ctx.Writer.Written() {
        ctx.JSON(409, gin.H {
          "error": "An account with this email address already exists",
        });
      };
      return;
    };  
  };
};

func ErrorHandler(ctx *gin.Context) {
  ctx.Next();

  if len(ctx.Errors) > 0 {
    err := ctx.Errors.Last().Err

    if ctx.Writer.Written() {
      return;
    };

    ctx.JSON(400, gin.H {
      "error": err.Error(),
    });
    return;
  };

  if !ctx.Writer.Written() {
    ctx.JSON(500, gin.H {
      "error": "Internal server error",
    });
    return;
  };
};
package controllers

import (
  "Auth/cmd/models"
  "Auth/cmd/services"

  "net/http"
  "github.com/gin-gonic/gin"
);

func setRefreshCookie(ctx *gin.Context, refreshToken string) { 
  http.SetCookie(ctx.Writer, &http.Cookie{ 
    Name: "refreshToken", 
    Value: refreshToken, 
    Path: "/", 
    MaxAge: 7 * 24 * 60 * 60, 
    HttpOnly: true, 
    Secure: true, 
    SameSite: http.SameSiteNoneMode,
  }); 
};

func clearRefreshCookie(ctx *gin.Context) { 
  http.SetCookie(ctx.Writer, &http.Cookie { 
    Name: "refreshToken", 
    Value: "", 
    Path: "/", 
    MaxAge: -1, 
    HttpOnly: true, 
    Secure: true, 
    SameSite: http.SameSiteNoneMode, 
  }); 
};

func GetLoggedInUser(ctx *gin.Context) {
  userId, exists := ctx.Get("userId");

  if !exists {
	  ctx.JSON(401, gin.H{
	    "error": "Unauthorized",
	  });
	  return;
  };

  userIdString, ok := userId.(string)

  if !ok {
	  ctx.JSON(401, gin.H{
	    "error": "Unauthorized",
	  });
	  return;
  };

  user, err := services.GetLoggedInUser(ctx.Request.Context(), userIdString);

  if err != nil {
	  ctx.JSON(404, gin.H{
	    "error": err.Error(),
	  });
	  return;
  };

  ctx.JSON(200, user);
};

func LogOutUser(ctx *gin.Context) {
  refreshToken, err := ctx.Cookie("refreshToken")

  if err != nil {
	  ctx.JSON(401, gin.H{
	    "error": "Invalid refresh token",
	  });
	  return;
  };

  user, err := services.LogOutUser(ctx.Request.Context(), refreshToken);

  if err != nil {
	  ctx.JSON(404, gin.H{
	    "error": err.Error(),
	  });
	  return;
  };

  clearRefreshCookie(ctx);

  ctx.JSON(200, user);
};

func SignUpUser(ctx *gin.Context) {
  var input models.UserInput;

  if err := ctx.ShouldBindJSON(&input); err != nil {
	  ctx.JSON(400, gin.H{
	    "error": err.Error(),
	  });
	  return;
  };

  user, err := services.SignUpUser(ctx.Request.Context(), input);

  if err != nil {
	  ctx.Error(err);
	  return;
  };

  setRefreshCookie(ctx, *user.RefreshToken);

  ctx.JSON(200, gin.H {
    "userId": user.UserId,
    "name": user.Name,
    "email": user.Email,
    "accessToken": user.AccessToken,
    "createdAt": user.CreatedAt,
  });
};

func LogInUser(ctx *gin.Context) {
  var input models.AuthInput;
  
  if err := ctx.ShouldBindJSON(&input); err != nil {
	  ctx.JSON(400, gin.H{
	    "error": err.Error(),
	  });
	  return;
  };

  user, err := services.LogInUser(ctx.Request.Context(), input);

  if err != nil {
	  ctx.JSON(401, gin.H{
	    "error": err.Error(),
	  });
	  return;
  };

  setRefreshCookie(ctx, *user.RefreshToken);

  ctx.JSON(200, gin.H {
    "userId": user.UserId,
    "name": user.Name,
    "email": user.Email,
    "accessToken": user.AccessToken,
    "createdAt": user.CreatedAt,
  });
};

func RotateUserTokens(ctx *gin.Context) {
  refreshToken, err := ctx.Cookie("refreshToken");

  if err != nil {
	  ctx.JSON(401, gin.H{
	    "error": "Invalid refresh token",
	  });
	  return;
  };

  authentication, err := services.RotateUserTokens(ctx.Request.Context(), refreshToken);

  if err != nil {
	  ctx.JSON(401, gin.H{
	    "error": err.Error(),
	  });
	  return;
  };

  setRefreshCookie(ctx, authentication.RefreshToken);

  ctx.JSON(200, authentication);
};

func GetUserSummary(ctx *gin.Context) {
  userId, exists := ctx.Get("userId");

  if !exists {
	  ctx.JSON(401, gin.H{
	    "error": "Unauthorized",
	  });
	  return;
  };

  userIdString, ok := userId.(string);

  if !ok {
	  ctx.JSON(401, gin.H{
	    "error": "Unauthorized",
	  });
	  return;
  };

  user, err := services.GetUserSummary(ctx.Request.Context(), userIdString);

  if err != nil {
	  ctx.JSON(404, gin.H{
	    "error": err.Error(),
	  });
	  return;
  };

  ctx.JSON(200, user);
};
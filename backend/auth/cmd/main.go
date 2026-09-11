package main

import (
  "Auth/cmd/config"
  "Auth/cmd/controllers"
  "Auth/cmd/db"
  "Auth/cmd/middlewares"
	
  "os"
  "log"
  "time"
  "github.com/gin-contrib/cors"
  "github.com/gin-gonic/gin"
);

func main() {
  config.Load();

  if err := db.Connect(); err != nil {
    log.Fatal(err);
  };

  defer db.DB.Close();

  router := gin.Default();

  corsConfig := cors.Config{
    AllowOrigins: []string{
      "http://localhost:5173",
      "https://understory-mu.vercel.app",
    },
    AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
    AllowHeaders: []string{"Origin", "Accept", "Content-Type", "Authorization"},
    AllowCredentials: true,
    MaxAge: 12 * time.Hour,
  };

  router.Use(cors.New(corsConfig));
  router.Use(middlewares.ErrorHandler, middlewares.UniqueHandler);

  router.GET("/profile", middlewares.Authenticate, controllers.GetLoggedInUser);
  router.GET("/profile/summary", middlewares.Authenticate, controllers.GetUserSummary);

  router.POST("/signup", controllers.SignUpUser);
  router.POST("/login", controllers.LogInUser);

  router.DELETE("/logout", controllers.LogOutUser);

  router.POST("/refresh", controllers.RotateUserTokens);

  router.GET("/", func(ctx *gin.Context) {
    ctx.JSON(200, "Healthy");
  });

  PORT := os.Getenv("PORT");

  if PORT == "" {
    PORT = "8080";
  };

  if err := router.Run(":" + PORT); err != nil {
    log.Fatal(err);
  };
};
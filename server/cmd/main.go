package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
    "rust-rush/server/internal/game"
    "rust-rush/server/internal/websocket"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize game manager
	gameManager := game.NewManager()

	// Set up WebSocket hub
	hub := websocket.NewHub(gameManager)
	go hub.Run()

	// HTTP routes
	http.HandleFunc("/", handleHome)
	http.HandleFunc("/health", handleHealth)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.ServeWs(hub, w, r)
	})

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

func handleHome(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"message": "Rust Rush WebSocket Server", "version": "0.1.0"}`))
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "healthy"}`))
}

package main

import (
	"log"
	"net/http"

	"rust-rush/server/internal/game"
	"rust-rush/server/internal/websocket"
)

func main() {
	log.Println("Starting Rust Rush server...")

	// Create game manager
	gameManager := game.NewManager()

	// Create WebSocket hub
	hub := websocket.NewHub(gameManager)
	go hub.Run()

	// Setup routes
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.ServeWs(hub, w, r)
	})

	// Health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Start server
	port := ":8080"
	log.Printf("Server listening on port %s", port)
	log.Printf("WebSocket endpoint: ws://localhost%s/ws", port)

	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

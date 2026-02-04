package websocket

import (
	"encoding/json"
	"log"

	"rust-rush/server/internal/game"
)

// Message types
const (
	MessageTypeJoinRoom  = "join_room"
	MessageTypeLeaveRoom = "leave_room"
	MessageTypeGameState = "game_state"
	MessageTypeAction    = "action"
)

// Message represents a WebSocket message
type Message struct {
	Type    string          `json:"type"`
	RoomID  string          `json:"room_id,omitempty"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// Hub maintains active clients and broadcasts messages
type Hub struct {
	clients     map[*Client]bool
	broadcast   chan []byte
	register    chan *Client
	unregister  chan *Client
	gameManager *game.Manager
}

// NewHub creates a new Hub
func NewHub(gameManager *game.Manager) *Hub {
	return &Hub{
		clients:     make(map[*Client]bool),
		broadcast:   make(chan []byte),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		gameManager: gameManager,
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("Client registered. Total clients: %d", len(h.clients))

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("Client unregistered. Total clients: %d", len(h.clients))
			}

		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

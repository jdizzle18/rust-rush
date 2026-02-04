package websocket

import (
	"encoding/json"
	"log"

	"rust-rush/server/internal/game"
)

// Message types
const (
	MessageTypeJoinRoom    = "join_room"
	MessageTypeLeaveRoom   = "leave_room"
	MessageTypeGameState   = "game_state"
	MessageTypePlaceTower  = "place_tower"
	MessageTypeRemoveTower = "remove_tower"
	MessageTypeStartWave   = "start_wave"
	MessageTypePauseGame   = "pause_game"
)

// Message represents a WebSocket message
type Message struct {
	Type    string                 `json:"type"`
	RoomID  string                 `json:"room_id,omitempty"`
	Payload map[string]interface{} `json:"payload,omitempty"`
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
			log.Printf("Client registered: %s. Total clients: %d", client.id, len(h.clients))

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				// Remove from room if in one
				if client.roomID != "" {
					h.gameManager.RemovePlayer(client.roomID, client.id)
				}

				delete(h.clients, client)
				close(client.send)
				log.Printf("Client unregistered: %s. Total clients: %d", client.id, len(h.clients))
			}

		case message := <-h.broadcast:
			// Broadcast to all clients
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

// BroadcastToRoom sends a message to all clients in a specific room
func (h *Hub) BroadcastToRoom(roomID string, message []byte) {
	for client := range h.clients {
		if client.roomID == roomID {
			select {
			case client.send <- message:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
}

// BroadcastGameState broadcasts the current game state to all clients in a room
func (h *Hub) BroadcastGameState(roomID string) {
	room, exists := h.gameManager.GetRoom(roomID)
	if !exists {
		return
	}

	msg := Message{
		Type:   MessageTypeGameState,
		RoomID: roomID,
		Payload: map[string]interface{}{
			"players":   room.Players,
			"game_data": room.GameData,
		},
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal game state: %v", err)
		return
	}

	h.BroadcastToRoom(roomID, data)
}

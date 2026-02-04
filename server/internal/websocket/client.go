package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 * 1024
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// Client represents a WebSocket client
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	id     string
	roomID string
}

// readPump pumps messages from the WebSocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Parse the message
		var msg Message
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			log.Printf("Failed to parse message: %v", err)
			continue
		}

		// Handle the message
		c.handleMessage(&msg)
	}
}

// handleMessage processes different message types
func (c *Client) handleMessage(msg *Message) {
	log.Printf("Client %s received message type: %s", c.id, msg.Type)

	switch msg.Type {
	case MessageTypeJoinRoom:
		if msg.RoomID != "" {
			c.roomID = msg.RoomID
			c.hub.gameManager.AddPlayer(msg.RoomID, c.id)

			// Send confirmation
			response := Message{
				Type:   MessageTypeJoinRoom,
				RoomID: msg.RoomID,
				Payload: map[string]interface{}{
					"status":   "joined",
					"clientId": c.id,
				},
			}
			c.sendJSON(response)

			log.Printf("Client %s joined room %s", c.id, msg.RoomID)
		}

	case MessageTypeLeaveRoom:
		if c.roomID != "" {
			c.hub.gameManager.RemovePlayer(c.roomID, c.id)
			c.roomID = ""
		}

	case MessageTypePlaceTower:
		log.Printf("Place tower request: %v", msg.Payload)
		// TODO: Call Rust engine to place tower

		// Send acknowledgment
		response := Message{
			Type: MessageTypeGameState,
			Payload: map[string]interface{}{
				"action": "tower_placed",
				"tower":  msg.Payload,
			},
		}
		c.sendJSON(response)

	case MessageTypeRemoveTower:
		log.Printf("Remove tower request: %v", msg.Payload)
		// TODO: Call Rust engine to remove tower

	case MessageTypeStartWave:
		log.Printf("Start wave request from client %s", c.id)
		// TODO: Call Rust engine to start wave

		// Send acknowledgment
		response := Message{
			Type: MessageTypeGameState,
			Payload: map[string]interface{}{
				"action": "wave_started",
				"wave":   1,
			},
		}
		c.sendJSON(response)

	case MessageTypePauseGame:
		log.Printf("Pause game request from client %s", c.id)
		// TODO: Pause game logic

	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

// sendJSON sends a JSON message to the client
func (c *Client) sendJSON(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return
	}

	select {
	case c.send <- data:
	default:
		log.Printf("Client %s send buffer full", c.id)
	}
}

// writePump pumps messages from the hub to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ServeWs handles WebSocket requests from clients
func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
		id:   generateClientID(),
	}

	client.hub.register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

func generateClientID() string {
	return "client-" + time.Now().Format("20060102150405999")
}

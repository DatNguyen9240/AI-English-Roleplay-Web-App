import { io } from 'socket.io-client';

/**
 * WebSocket streaming provider using Socket.IO.
 * Complies with Section 7.5: Swappable network interface pattern.
 */
export class SocketIOStreamer {
  constructor() {
    this.socket = null;
  }

  /**
   * Establishes socket connection and maps lifecycle callbacks.
   * Safely disconnects any previous socket before creating a new one.
   * @param {string} socketUrl
   * @param {object} options
   * @param {() => void} [options.onConnect]
   * @param {(err: Error) => void} [options.onConnectError]
   * @param {() => void} [options.onDisconnect]
   */
  connect(socketUrl, options = {}) {
    // Guard: prevent socket leak if connect() is called while already connected
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      withCredentials: true,
    });

    if (options.onConnect) {
      this.socket.on('connect', options.onConnect);
    }

    if (options.onConnectError) {
      this.socket.on('connect_error', options.onConnectError);
    }

    if (options.onDisconnect) {
      this.socket.on('disconnect', options.onDisconnect);
    }
  }

  /**
   * Emits raw audio chunks to the socket server
   * @param {number} sequenceNumber
   * @param {ArrayBuffer} pcmBuffer
   */
  sendChunk(sequenceNumber, pcmBuffer) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('audio-chunk', {
        sequenceNumber,
        chunk: pcmBuffer,
      });
    }
  }

  /**
   * Alerts the server that voice activity has ceased
   */
  sendSpeechEnd() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('speech-end');
    }
  }

  /**
   * Performs standard disconnect and clears the socket reference
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

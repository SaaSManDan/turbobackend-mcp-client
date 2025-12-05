/**
 * SSE Streaming Utilities
 * Utilities for creating and managing Server-Sent Events streams
 */

export function createSSEStream(event) {
  // Set headers for SSE
  event.node.res.setHeader('Content-Type', 'text/event-stream');
  event.node.res.setHeader('Cache-Control', 'no-cache');
  event.node.res.setHeader('Connection', 'keep-alive');
  
  let eventId = 0;
  
  return {
    sendEvent: function(id, data) {
      sendSSEEvent(event, id, data);
    },
    
    sendProgress: function(message, progress) {
      eventId++;
      const progressData = {
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: {
          progress: progress,
          message: message
        }
      };
      sendSSEEvent(event, eventId, progressData);
    },
    
    sendComplete: function(result) {
      eventId++;
      sendSSEEvent(event, eventId, result);
    },
    
    close: function() {
      event.node.res.end();
    }
  };
}

export function sendSSEEvent(event, eventId, data) {
  const formattedData = typeof data === 'string' ? data : JSON.stringify(data);
  event.node.res.write(`id: ${eventId}\n`);
  event.node.res.write(`data: ${formattedData}\n\n`);
}

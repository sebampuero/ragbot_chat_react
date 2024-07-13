import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

// Placeholder components
const WaitingPage = ({queuePosition}) => (
  <div className="waiting-page">
    <h2>Waiting in Queue</h2>
    <p>Please be patient. Since this application runs on a Raspberry Pi and executes embedding functions to convert tokens 
      to words in order to perform retrieval in documents, there can only be one chat instance at a time!
    </p>
    <p>{queuePosition}</p>
  </div>
);

function ChatUI({ currUserID }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatSocket = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    chatSocket.current = new WebSocket(`${process.env.REACT_APP_WEBSOCKET_C_URL}?userID=${currUserID}`);

    chatSocket.current.addEventListener('message', (event) => {
      processChatMessage(JSON.parse(event.data));
    });

    chatSocket.current.addEventListener('error', (event) => {
      console.log(event);
      alert("There was an error loading the chat");
    });

    chatSocket.current.addEventListener('close', (event) => {
      console.log("Websocket was closed", event);
      alert("The connection was closed! Please reload the page")
    });

    return () => {
      if (chatSocket.current) {
        chatSocket.current.close();
      }
    };
  }, [currUserID]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const processChatMessage = (data) => {
    if (data.type === 'end') {
      console.log("End of streamming");
      setIsSending(false);
      return
    }
    if (data.type === 'chunk') {
      setMessages((prev) => {
        const existingMessageIndex = prev.findIndex((msg) => msg.id === data.id);
        if (existingMessageIndex !== -1) {
          const updatedMessages = [...prev];
          updatedMessages[existingMessageIndex].content += data.content;
          return updatedMessages;
        } else {
          const newMessage = { id: data.id, content: data.content, isUser: false };
          return [...prev, newMessage];
        }
      });
    } 
  };

  const sendMessage = () => {
    if (inputMessage.trim() !== '') {
      setIsSending(true);
      const newMessage = { content: inputMessage, isUser: true };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      chatSocket.current.send(newMessage.content);
      setInputMessage('');
    }
  };

  return (
    <div className="chat-ui">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.isUser ? 'user' : 'recipient'}`}>
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
        />
        <button 
          onClick={sendMessage} 
          disabled={isSending}
        >
          {isSending ? <i className="fa fa-spinner fa-spin"></i> : <i className="fa fa-arrow-right"></i>}
        </button>
      </div>
    </div>
  );
}

function App() {

  const [queuePosition, setQueuePosition] = useState("You are in the queue!");
  const [waitingInQueue, setWaitingInQueue] = useState(true);
  const currUserID = useRef("");

  useEffect(() => {
    const randomUUID = uuidv4();
    currUserID.current = randomUUID;
    const queueSocket = new WebSocket(`${process.env.REACT_APP_WEBSOCKET_Q_URL}?userID=${randomUUID}`);

    queueSocket.addEventListener('message', (event) => {
      processQueueMessages(event.data);
    });

    queueSocket.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
      alert("There was an error loading the chat");
    });

    queueSocket.addEventListener('close', (event) => {
      console.log("Websocket was closed", event);
    });

    return () => {
      if(queueSocket){
        queueSocket.close()
      }
    };
  }, []);

  const processQueueMessages = (message) => {
    if (message === "Connected"){
      setWaitingInQueue(false);
    } else {
      setQueuePosition(message);
    }
  }

  return (
    <div className="App">
      {waitingInQueue ? (
        <WaitingPage queuePosition={queuePosition}/>
      ): (
        <ChatUI currUserID={currUserID.current}/>
      )}
    </div>
  );
}

export default App;
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./ChatBot.css";

const ChatBot = () => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! 🌤️ Which city or country do you want the weather for?" }
  ]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/weather?city=${input}`);
      const data = res.data;

      if (data.error) {
        const botMessage = {
          sender: "bot",
          text: `😅 Hmm... "${input}" is not in our planet directory! Just Google it for the real country name on Earth 😉`
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const botMessage = {
          sender: "bot",
          text: `The weather in ${data.city} is ${data.temperature}°C with ${data.description}. 🌤️`
        };
        setMessages((prev) => [...prev, botMessage]);
      }

    } catch (err) {
      const botMessage = {
        sender: "bot",
        text: `😅 Hmm... "${input}" is not in our planet directory! Just Google it for the real country name on Earth 😉`
      };
      setMessages((prev) => [...prev, botMessage]);
    }

    setInput("");
  };

  return (
    <div className={`chatbot-container ${open ? "open" : ""}`}>
      <div className="chatbot-header" onClick={() => setOpen(!open)}>
        Weather Chat ☀️
        <button className="chatbot-close" onClick={() => setOpen(false)}>✖</button>
      </div>

      {open && (
        <div className="chatbot-body">
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              placeholder="Enter city or country..."
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;

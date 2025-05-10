import { useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export default function App() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [faqs, setFaqs] = useState({});
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const chatEndRef = useRef(null);

  const speakText = (text) => {
    if (!ttsEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  };

  const handleClick = (question, answer) => {
    setMessages((prev) => [
      ...prev,
      { type: "user", text: question },
      { type: "bot", text: answer },
    ]);
    speakText(answer);
  };

  const fetchFAQs = async () => {
    const snapshot = await getDocs(collection(db, "FAQs"));
    const data = {};
    snapshot.forEach((doc) => {
      const { question, answer, category } = doc.data();
      if (!data[category]) data[category] = {};
      data[category][question] = answer;
    });
    setFaqs(data);
  };

  const linkify = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline">${url}</a>`;
    });
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!started) {
    return (
      <div
        className="min-h-screen flex flex-col justify-between bg-blue-100 bg-cover bg-center"
        style={{ backgroundImage: "url('/homeBG.jpg')" }}
      >
        <div className="flex flex-col items-center px-4 py-6 space-y-8">
          <div className="flex justify-center mt-12 w-full">
            <img src="/CCS logo.png" alt="Logo" className="w-40 h-40" />
          </div>

          <div className="flex flex-col sm:flex-row gap-8 sm:mt-40 mt-32 px-5">
            <div className="p-10 bg-white/10 backdrop-blur-md rounded-lg shadow-lg text-center w-full max-w-md text-white">
              <img
                src="/CCS logo.png"
                alt="GCCAN Logo"
                className="w-24 h-24 mx-auto mb-4"
              />
              <h1 className="text-3xl font-bold">Welcome to GCCAN</h1>
              <p className="text-white-600 mt-2">
                Gordon College Chatbot Assistant & Navigation
              </p>
              <button
                className="mt-6 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700"
                onClick={() => setStarted(true)}
              >
                Get Started
              </button>
            </div>

            <div className="p-10 bg-white/10 backdrop-blur-md rounded-lg shadow-lg text-center w-full max-w-md text-white">
              <h2 className="text-2xl font-bold mb-4">About GCCAN</h2>
              <p className="text-white-700">
                GCCAN (Gordon College Chatbot Assistant and Navigation)
              </p>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 w-full bg-gray-100/20 backdrop-blur-md py-1 text-center text-sm text-white">
            <p>
              ✉️ Email us at{" "}
              <span className="font-semibold">info@gordoncollege.edu.ph</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen sm:flex-row">
      {/* Side bar */}
      <div className="w-full sm:w-1/3 p-4">
        <div className="p-6 bg-white rounded-lg shadow-lg shadow-gray-900/50">
          <h1 className="text-xl font-bold mb-4">GCCAN</h1>
          <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">Text-to-Speech:</p>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={ttsEnabled}
                onChange={() => {
                if (ttsEnabled) {
                  speechSynthesis.cancel();
              }
                setTtsEnabled(!ttsEnabled);
              }}
              className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-all duration-300 relative">
                <span className={`absolute right-1 top-1 text-xs font-bold transition-all duration-300 ${ttsEnabled ? 'opacity-0' : 'opacity-100'}`}>
                  OFF
                </span>
                <span className={`absolute left-1 top-1 text-xs font-bold text-white transition-all duration-300 ${ttsEnabled ? 'opacity-100' : 'opacity-0'}`}>
                  ON
                </span>
            </div>
          <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 peer-checked:translate-x-7"></div>
          </label>
          </div>

          <p className="text-gray-600 mb-2">Select a category:</p>
          <div className="flex flex-col gap-2">
            {Object.keys(faqs).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded text-white ${
                  selectedCategory === category
                    ? "bg-green-700"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {selectedCategory && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-2">
                {selectedCategory} Questions
              </h2>
              {Object.entries(faqs[selectedCategory]).map(
                ([question, answer]) => (
                  <button
                    key={question}
                    className="block w-full text-left p-2 bg-green-100 hover:bg-green-200 rounded-lg mb-2"
                    onClick={() => handleClick(question, answer)}
                  >
                    {question}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="w-full sm:w-2/3 p-4 flex-grow overflow-y-auto">
        <div className="p-6 bg-green-300 rounded-lg shadow-lg flex flex-col h-full max-h-[90vh]">
          <h1 className="text-xl font-bold mb-4">Chat with GCCAN</h1>
          <div className="flex-1 bg-gray-100 rounded-lg p-4 overflow-y-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-2 my-1 rounded-lg max-w-xs ${
                  msg.type === "user"
                    ? "bg-green-200 ml-auto text-right"
                    : "bg-gray-200"
                }`}
              >
                <strong>{msg.type === "user" ? "You" : "GCCAN"}:</strong>{" "}
                {msg.type === "bot" ? (
                  <span
                    className="whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: linkify(msg.text) }}
                  />
                ) : (
                  msg.text
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

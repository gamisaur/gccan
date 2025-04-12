import { useState } from "react";

export default function GCCAN() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const faqs = {
    Enrollment: {
      "How do I enroll?": "To enroll, visit the registrar's office and submit the required documents.",
      "What are the requirements?": "Requirements include a valid ID, transcript of records, and admission form."
    },
    Schedules: {
      "Where can I check my schedule?": "You can check your schedule through the student portal or visit the registrar.",
      "How do I change my schedule?": "Schedule changes are handled at the registrar’s office during adjustment periods."
    },
    "Campus Facilities": {
      "Where is the library?": "The library is located on the second floor of the main building.",
      "How do I get to the registrar’s office?": "From the main entrance, walk straight and turn left at the first hallway."
    },
    "School Personnel": {
      "Where can I find a teacher?" : "You may find the teachers on the 3rd floor of the building in their various faculties."
    }
  };

  const speakText = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  }

  const handleClick = (question, answer) => {
    setMessages([...messages, { type: "user", text: question }, { type: "bot", text: answer }]);
    speakText(answer);
  };

  if (!started) {
    return (
      <div
        className="min-h-screen flex flex-col justify-between bg-blue-100 bg-cover bg-center"
        style= {{backgroundImage: "url('/homeBG.jpg')" }}
      >
      <div className="flex flex-col items-center px-4 py-6 space-y-8">
      <div className="flex justify-center mt-12 w-full">
        <img
          src="/CCS logo.png"
          alt="Logo"
          className="w-40 h-40"
        /> 
      </div>

      <div className="flex flex-col lg:flex=row gap-10 sm:mt-40 mt-24 px-4 w-full justify-center items-center">
          <div className="p-10 bg-white/10 backdrop-blur-md rounded-lg shadow-lg text-center w-full max-w-md text-white">
            <img
              src="/CCS logo.png"
              alt="GCCAN Logo"
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4"
            />
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome to GCCAN</h1>
            <p className="mt-2">Gordon College Chatbot Assistant & Navigation</p>
            <button
              className="mt-6 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700"
              onClick={() => setStarted(true)}
            >
              Get Started
            </button>
          </div>
  
          <div className="p-8 sm:p-10 bg-white/10 backdrop-blur-md rounded-lg shadow-lg text-center w-full max-w-md text-white">
            <h2 className="text-2xl font-bold mb-4">About GCCAN</h2>
            <p>
              GCCAN (Gordon College Chatbot Assistant and Navigation)
            </p>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 w-full bg-gray-100/20 backdrop-blur-md py-1 text-center text-sm text-white">
          <p>
          ✉️ Email us at <span className="font-semibold">info@gordoncollege.edu.ph</span>
          </p>
        </div>
      </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* Category and Questions Card */}
      <div className="lg:w-1/3 w-full p-4">
        <div className="p-6 bg-white rounded-lg shadow-lg shadow-gray-900/50 h-full overflow-y-auto">
          <h1 className="text-xl font-bold mb-4">GCCAN</h1>
          <p className="text-gray-600 mb-2">Select a category:</p>
          <div className="flex flex-col gap-2">
            {Object.keys(faqs).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded text-white ${selectedCategory === category ? "bg-green-700" : "bg-green-500 hover:bg-green-600"}`}
              >
                {category}
              </button>
            ))}
          </div>

          {selectedCategory && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-2">{selectedCategory} Questions</h2>
              {Object.entries(faqs[selectedCategory]).map(([question, answer]) => (
                <button
                  key={question}
                  className="block w-full text-left p-2 bg-green-100 hover:bg-green-200 rounded-lg mb-2"
                  onClick={() => handleClick(question, answer)}
                >
                  {question}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Box Card */}
      <div className="lg:w-2/3 w-full p-4">
        <div className="p-6 bg-green-300 rounded-lg shadow-lg flex flex-col h-full">
          <h1 className="text-xl font-bold mb-4">Chat with GCCAN</h1>
          <div className="flex-1 bg-gray-100 rounded-lg p-4 overflow-y-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-2 my-1 rounded-lg max-w-xs ${msg.type === "user" ? "bg-green-200 ml-auto text-right" : "bg-gray-200"}`}
              >
                <strong>{msg.type === "user" ? "You" : "GCCAN"}:</strong> {msg.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
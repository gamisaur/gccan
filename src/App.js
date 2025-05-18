import { useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

export default function App() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [faqs, setFaqs] = useState({});
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState("user");
  const chatEndRef = useRef(null);
  const messageRef = useRef(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === "admin@gccan.com") {
        setIsAdmin(true);
        setView("admin");
      } else {
        setIsAdmin(false);
        if (view === "admin") setView("adminLogin");
      }
    });
    return () => unsubscribe();
  }, []);

  const speakText = (htmlText) => {
    if (!ttsEnabled) return;
    speechSynthesis.cancel();
    const doc = new DOMParser().parseFromString(htmlText, "text/html");
    const text = doc.body.innerText;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  };

  const handleClick = (question, answer) => {
    const linkedAnswer = linkify(answer);
    setMessages((prev) => [
      ...prev,
      { type: "user", text: question },
      { type: "bot", text: linkedAnswer },
    ]);
    speakText(linkedAnswer);
  };

  const handleCheckAvailability = async () => {
  try {
    const schedulesSnapshot = await getDocs(collection(db, "FacultySchedules"));
    if (schedulesSnapshot.empty) {
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: "No faculty schedules found." },
      ]);
      return;
    }

    // Prepare faculty options: array of { name, email }
    const faculties = schedulesSnapshot.docs.map(doc => {
      const { facultyName } = doc.data();
      return { facultyName, facultyEmail: doc.id };
    });

    // Build dropdown HTML for faculty selection
    const optionsHTML = faculties
      .map(
        ({ facultyName, facultyEmail }) =>
          `<option value="${facultyEmail}">${facultyName}</option>`
      )
      .join("");

    const dropdownHTML = `
      <p class="mb-4 text-gray-700">
        Select a faculty to view their schedule:
      </p>
      <select id="faculty-select" class="border border-gray-400 rounded p-2 w-full mb-2">
        <option value="">Select Faculty</option>
        ${optionsHTML}
      </select>
      <button class="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600">
        Select
      </button>
      <div id="faculty-schedule-table" class="mt-4"></div>
    `;

    setMessages((prev) => [...prev, { type: "bot", text: dropdownHTML }]);

    // Wait for DOM update then attach event listener to the button
    setTimeout(() => {
      const selectElem = document.getElementById("faculty-select");
      const btn = document.getElementById("show-schedule-btn");
      const tableContainer = document.getElementById("faculty-schedule-table");

      if (!selectElem || !btn || !tableContainer) return;

      btn.onclick = async () => {
        const selectedEmail = selectElem.value;
        if (!selectedEmail) {
          alert("Please select a faculty.");
          return;
        }

        try {
          const facultyDoc = await getDocs(collection(db, `FacultySchedules/${selectedEmail}/subjects`));
          const facultyDataDoc = schedulesSnapshot.docs.find(doc => doc.id === selectedEmail);
          const facultyName = facultyDataDoc?.data()?.facultyName || "";

          if (facultyDoc.empty) {
            tableContainer.innerHTML = `<p class="text-red-600">No schedule found for this faculty.</p>`;
            return;
          }

          // Build schedule rows
          const rows = facultyDoc.docs.map(subDoc => {
            const data = subDoc.data();
            const available = data.classType === "Face-to-face" ? "Available" : "Not Available";
            return `
              <tr class="border border-gray-300 even:bg-green-50 odd:bg-white">
                <td class="p-2 border border-gray-300">${facultyName}</td>
                <td class="p-2 border border-gray-300">${data.courseCode}</td>
                <td class="p-2 border border-gray-300">${data.classCode}</td>
                <td class="p-2 border border-gray-300">${data.courseDescription}</td>
                <td class="p-2 border border-gray-300">${data.classType}</td>
                <td class="p-2 border border-gray-300">${data.day}</td>
                <td class="p-2 border border-gray-300">${data.time}</td>
                <td class="p-2 border border-gray-300 font-semibold text-center ${
                  available === "Available" ? "text-green-700" : "text-red-600"
                }">${available}</td>
                <td class="p-2 border border-gray-300">${selectedEmail}</td>
              </tr>
            `;
          }).join("");

          tableContainer.innerHTML = `
            <div class="overflow-auto max-h-[400px] border border-gray-400 rounded">
              <table class="table-auto w-full text-sm border-collapse border border-gray-400">
                <thead class="bg-green-600 text-white sticky top-0">
                  <tr>
                    <th class="p-2 border">Name</th>
                    <th class="p-2 border">Course Code</th>
                    <th class="p-2 border">Class Code</th>
                    <th class="p-2 border">Description</th>
                    <th class="p-2 border">Class Type</th>
                    <th class="p-2 border">Day</th>
                    <th class="p-2 border">Time</th>
                    <th class="p-2 border">Status</th>
                    <th class="p-2 border">Email</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>
          `;
        } catch (err) {
          console.error(err);
          tableContainer.innerHTML = `<p class="text-red-600">Error loading schedule.</p>`;
        }
      };
    }, 100);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    setMessages((prev) => [...prev, { type: "bot", text: "Error fetching schedules." }]);
  }
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
    text = text.replace(
      /https:\/\/gordoncollege\.edu\.ph\/gca\/student\/#\/login/g,
      `<a href="https://gordoncollege.edu.ph/gca/student/#/login" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline">portal login page</a>`
    );
    text = text.replace(
      /https:\/\/gordoncollege\.edu\.ph\/gca\/student(?!\/#\/login)/g,
      `<a href="https://gordoncollege.edu.ph/gca/student" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline">Gordon College Admission Portal signup page</a>`
    );
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    return text.replace(urlRegex, (url) => {
      if (text.includes(`href="${url}`)) return url;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline break-words">${url}</a>`;
    });
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && ttsEnabled && lastMessage.type === "bot") {
      speakText(lastMessage.text);
    }
  }, [messages, ttsEnabled]);

  if (view === "admin") {
    return isAdmin ? (
      <AdminDashboard
        onLogout={() => {
          const auth = getAuth();
          signOut(auth).then(() => {
            setIsAdmin(false);
            setView("user");
          });
        }}
      />
    ) : (
      <AdminLogin
        onLogin={() => {
          setIsAdmin(true);
          setView("admin");
        }}
        onBack={() => setView("user")}
      />
    );
  }

  if (!started) {
    return (
      <div
        className="min-h-screen flex flex-col justify-between bg-blue-100 bg-cover bg-center"
        style={{ backgroundImage: "url('/homeBG.jpg')" }}
      >
        <div className="flex flex-col items-center px-4 py-6 space-y-8">
          <div className="flex justify-center mt-12 w-full">
            <img src="/GC logo.png" alt="Logo" className="w-40 h-40" />
          </div>

          <div className="flex flex-col sm:flex-row gap-8 sm:mt-40 mt-32 px-5">
            <div className="p-10 bg-white/10 backdrop-blur-md rounded-lg shadow-lg text-center w-full max-w-md text-white">
              <img
                src="/GC logo.png"
                alt="GCCAN Logo"
                className="w-24 h-24 mx-auto mb-4"
              />
              <h1 className="text-3xl font-bold">Welcome to GCCAN</h1>
              <p className="text-white-600 mt-2">
                Gordon College Chatbot Assistant & Navigation
              </p>
              <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 mt-6 mb-4 justify-center items-center">
              <button
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700"
                onClick={() => setStarted(true)}
              >
                Get Started
              </button>
              <button
                className="px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700"
                onClick={() => setView("admin")}
              >
                Admin Login
              </button>
            </div>
            </div>

            <div className="p-10 bg-white/10 backdrop-blur-md rounded-lg shadow-lg text-center w-full max-w-md text-white">
              <h2 className="text-2xl font-bold mb-4">About GCCAN</h2>
              <p className="text-white-700">
                GCCAN Gordon College Chatbot Assistant and Navigation (GCCAN) is a web-based platform designed to guide students through enrollment, answer frequently asked questions, and assist with navigating college services—offering quick, reliable support anytime.
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

  // Main Chatbot UI
  return (
    <div className="flex flex-col h-screen sm:flex-row">
      <div className="w-full sm:w-1/3 p-4">
        <div className="p-6 bg-white rounded-lg shadow-lg shadow-gray-900/50">
          <div className="flex items-center mb-4">
          <button
            onClick={() => {
              setStarted(false);
              setMessages([]);
              setSelectedCategory(null);
            }}
            className="mr-3 px-2 py-1 bg-white-300 hover:bg-gray-200 rounded text-sm"
            aria-label="Back to Home"
          >
            <img
              src="/back.png"
              alt="back"
              className="w-12 h-12 mr-1"
              />
          
          </button>
          <h2 className="font-bold text-lg">GCCAN</h2>
        </div>

          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">Text-to-Speech:</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ttsEnabled}
                onChange={() => {
                  if (ttsEnabled) speechSynthesis.cancel();
                  setTtsEnabled(!ttsEnabled);
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-all duration-300 relative">
                <span
                  className={`absolute left-1 top-1 text-xs font-bold text-white transition-all duration-300 ${ttsEnabled ? "opacity-100" : "opacity-0"}`}
                >
                  ON
                </span>
                <span
                  className={`absolute right-1 top-1 text-xs font-bold text-white transition-all duration-300 ${ttsEnabled ? "opacity-0" : "opacity-100"}`}
                >
                  OFF
                </span>
              </div>
              <div className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${ttsEnabled ? "translate-x-7" : ""}`}></div>
            </label>
          </div>

          <p className="text-gray-600 mb-2">Select a category:</p>
          <div className="flex flex-col gap-2">
            {Object.keys(faqs).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                className={`px-4 py-2 rounded text-white ${selectedCategory === category ? "bg-green-700" : "bg-green-500 hover:bg-green-600"}`}
              >
                {category}
              </button>
            ))}

            <button
              onClick={handleCheckAvailability}
              className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-700"
            >
              Check Availability
            </button>
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

      <div className="w-full sm:w-2/3 p-4 flex-grow overflow-y-auto min-h-[95vh] text-base sm:text-sm">
        <div className="relative p-6 bg-green-300 rounded-lg shadow-lg flex flex-col h-full max-h-[90vh] overflow-hidden">
            <div
              className="absolute inset-0 bg-center bg-cover z-0 pointer-events-none"
              style={{ backgroundImage: "url('/GC logo.png')", opacity: 0.03 }}
            ></div>
          <h1 className="text-xl font-bold mb-4">Chat with GCCAN</h1>
          <div className="flex-1 bg-gray-100 rounded-lg p-4 overflow-y-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
                ref={index === messages.length - 1 ? messageRef : null}
                className={`p-2 my-1 rounded-lg max-w-xs break-words whitespace-pre-line ${msg.type === "user" ? "bg-green-200 ml-auto text-right" : "bg-gray-200"}`}
              >
                <strong>{msg.type === "user" ? "You" : "GCCAN"}:</strong>{" "}
                {msg.type === "bot" ? (
                  <span className="break-words whitespace-pre-line" dangerouslySetInnerHTML={{ __html: msg.text }} />
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

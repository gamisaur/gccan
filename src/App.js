import { useEffect, useRef, useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import { ref as dbRef, push as dbPush } from "firebase/database";
import { rtdb } from "./firebase";
import qrcode from 'qrcode-generator';

export default function App() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [faqs, setFaqs] = useState({});
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState("user");
  const [authLoading, setAuthLoading] = useState(true);
  const chatEndRef = useRef(null);
  const messageRef = useRef(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [facultySchedule, setFacultySchedule] = useState([]);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [welcomeQrNode, setWelcomeQrNode] = useState(null);

  const welcomeQrRef = useCallback(node => {
    setWelcomeQrNode(node);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (
        firebaseUser &&
        firebaseUser.email &&
        firebaseUser.email.endsWith("@gordoncollege.edu.ph")
      ) {
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
    setShowAvailability(false);
    
    const displayAnswer = linkify(answer.text);
    
    setMessages((prev) => [
      ...prev,
      { type: "user", text: question },
      { 
        type: "bot", 
        text: displayAnswer,
        videoUrl: answer.videoUrl 
      },
    ]);
    speakText(displayAnswer);
  };

  const handleCheckAvailability = async () => {
    setShowAvailability(true);
    setMessages((prev) => [
      ...prev,
      { type: "bot", text: "Please select a faculty to view their schedule." },
    ]);
    setSelectedFaculty("");
    setFacultySchedule([]);
    try {
      const schedulesSnapshot = await getDocs(collection(db, "FacultySchedules"));
      if (schedulesSnapshot.empty) {
        setFacultyList([]);
        setMessages((prev) => [
          ...prev,
          { type: "bot", text: "No faculty schedules found." },
        ]);
        return;
      }
      const faculties = schedulesSnapshot.docs.map(doc => {
        const { facultyName } = doc.data();
        return { facultyName, facultyEmail: doc.id };
      });
      setFacultyList(faculties);
    } catch (error) {
      setFacultyList([]);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: "Error fetching schedules." },
      ]);
    }
  };

  const handleFacultySelect = async (facultyEmail) => {
    setSelectedFaculty(facultyEmail);
    setFacultySchedule([]);
    if (!facultyEmail) return;
    try {
      const facultyDoc = await getDocs(collection(db, `FacultySchedules/${facultyEmail}/subjects`));
      if (facultyDoc.empty) {
        setFacultySchedule([]);
        return;
      }
      setFacultySchedule(facultyDoc.docs.map(doc => doc.data()));
    } catch (err) {
      setFacultySchedule([]);
    }
  };

  const fetchFAQs = async () => {
    const snapshot = await getDocs(collection(db, "FAQs"));
    const data = {};
    snapshot.forEach((doc) => {
      const { question, answer, category, videoUrl } = doc.data();
      if (!data[category]) data[category] = {};
      data[category][question] = {
        text: answer,
        videoUrl: videoUrl || null
      };
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

  useEffect(() => {
    if (!started && welcomeQrNode) {
      welcomeQrNode.innerHTML = '';
      const welcomeQr = qrcode(0, 'M');
      welcomeQr.addData('https://gccan.vercel.app');
      welcomeQr.make();
      welcomeQrNode.innerHTML = welcomeQr.createImgTag(3, 4);
    }
  }, [started, welcomeQrNode]);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (view === "admin") {
    return isAdmin ? (
      <AdminDashboard
        user={user}
        onLogout={() => {
          const auth = getAuth();
          signOut(auth).then(() => {
            setIsAdmin(false);
            setUser(null);
            setView("user");
          });
        }}
      />
    ) : (
      <AdminLogin
        onLogin={(firebaseUser) => {
          setUser(firebaseUser);
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
        <div className="flex flex-col items-center px-4 py-6">
          <div className="flex flex-col sm:flex-row gap-8 sm:mt-40 mt-32 px-5">
            {/* QR Code Card - Left */}
            <div className="p-10 bg-white/10 backdrop-blur-md rounded-lg shadow-lg text-center w-full max-w-md text-white">
              <h2 className="text-2xl font-bold mb-4">Quick Access</h2>
              <p className="text-white-700 mb-4">
                Scan the QR code below to quickly access GCCAN on your mobile device
              </p>
              <div className="bg-white rounded-lg p-4 inline-block">
                <div ref={welcomeQrRef} className="mx-auto"></div>
              </div>
              <p className="text-sm text-white-600 mt-2">
                Point your camera at the QR code
              </p>
            </div>

            {/* Welcome Card - Middle */}
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
                  onClick={() => {
                    if (!hasAgreed) {
                      alert("Please agree to the Terms and Conditions first before proceeding.");
                      return;
                    }
                    setStarted(true);
                  }}
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

            {/* About Card - Right */}
            <div className="p-10 bg-white/10 backdrop-blur-md rounded-lg shadow-lg text-center w-full max-w-md text-white">
              <h2 className="text-2xl font-bold mb-4">About GCCAN</h2>
              <p className="text-white-700">
                GCCAN Gordon College Chatbot Assistant and Navigation (GCCAN) is a web-based platform designed to guide students through enrollment, answer frequently asked questions, and assist with navigating college services—offering quick, reliable support anytime.
              </p>
            </div>
          </div>

          {/* Terms and Conditions Section*/}
          <div className="mt-4 mb-20 sm:mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-green-500"
                onChange={(e) => {
                  if (e.target.checked) {
                    setShowTerms(true);
                  }
                  setHasAgreed(e.target.checked);
                }}
                checked={hasAgreed}
              />
              <span className="text-white">
                I agree to the{" "}
                <button
                  onClick={() => setShowTerms(true)}
                  className="text-green-400 hover:text-green-300 underline"
                >
                  Terms & Conditions
                </button>
              </span>
            </label>
          </div>

          <div className="fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-md py-1 text-center text-sm text-white">
            <p>
              ✉️ Email us at{" "}
              <span className="font-semibold">info@gordoncollege.edu.ph</span>
            </p>
          </div>
        </div>

        {/* Add the Terms Modal */}
        {showTerms && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Terms and Conditions</h2>
                <button
                  onClick={() => setShowTerms(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-gray-600 mb-4">Effective Date: May 28, 2025</p>
      
                <div className="space-y-4">
                  <section>
                    <h3 className="text-lg font-semibold">1. Acceptance of Terms</h3>
                    <p>By using this web application, you agree to comply with and be bound by these terms. If you do not agree with any part of these terms, please do not continue use immediately.</p>
                  </section>
      
                  <section>
                    <h3 className="text-lg font-semibold">2. Purpose of the Application</h3>
                    <p>GCCAN is intended to:</p>
                    <ul className="list-disc pl-5">
                      <li>Provide automated responses to frequently asked questions (FAQs).</li>
                      <li>Assist users in navigating campus services such as enrollment, scheduling, and facilities.</li>
                      <li>Collect feedback and suggestions to improve user experience.</li>
                    </ul>
                  </section>
      
                  <section>
                    <h3 className="text-lg font-semibold">3. User Responsibilities</h3>
                    <p>As a user of this application, you agree to:</p>
                    <ul className="list-disc pl-5">
                      <li>Use the application only for educational and informational purposes.</li>
                      <li>Provide accurate and respectful input when submitting feedback or questions.</li>
                      <li>Avoid abusing or interfering with the system.</li>
                    </ul>
                  </section>
      
                  <section>
                    <h3 className="text-lg font-semibold">4. Data Collection and Privacy</h3>
                    <p>GCCAN collects the following user data:</p>
                    <ul className="list-disc pl-5">
                      <li>Email address</li>
                      <li>Feedback or questions</li>
                      <li>Timestamp of submission</li>
                    </ul>
                    <br></br>
                    <p>All collected data is stored securely using Google Firebase services and is only used to improve the system and respond to user needs.</p>
                  </section>
      
                  <section>
                    <h3 className="text-lg font-semibold">5. Contact</h3>
                    <p>For inquiries or concerns about these terms, contact:</p>
                    <p className="font-medium">📧 info@gordoncollege.edu.ph</p>
                  </section>
                </div>
      
                <div className="mt-6 pt-4 border-t flex justify-end gap-4">
                  <button
                    onClick={() => setShowTerms(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowTerms(false);
                      setHasAgreed(true);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Accept & Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
              <div key={category}>
                <button
                  onClick={() => {
                    setShowAvailability(false); // Hide availability UI if FAQ is clicked
                    setSelectedCategory(selectedCategory === category ? null : category);
                  }}
                  className={`px-4 py-2 rounded text-white ${selectedCategory === category ? "bg-green-700 w-full" : "bg-green-500 hover:bg-green-600 w-full"}`}
                >
                  {category}
                </button>

                {selectedCategory === category && (
                  <div className="mt-2">
                    {Object.entries(faqs[category]).map(([question, answerObj]) => (
                      <div key={question} className="mb-2">
                        <button
                          onClick={() => handleClick(question, answerObj)}  // Pass the whole answer object
                          className="text-left w-full px-2 py-1 rounded bg-green-200 hover:bg-green-300"
                        >
                          {question}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={handleCheckAvailability}
              className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-700"
            >
              Check Availability
            </button>
          </div>

          <button
            onClick={() => setShowFeedbackForm(prev => !prev)}
            className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-700 mt-2 w-full"
          >
            Submit Feedback/Questions
          </button>


          <div className="flex-grow" />

          {showFeedbackForm && (  
            <div className="p-4 bg-white rounded shadow mt-auto">
              <h3 className="font-semibold mb-2">Submit Feedback/Question</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!userEmail.trim()) {
                    alert("Please enter your email.");
                    return;
                  }
                  if (!feedbackText.trim()) {
                    alert("Please enter your feedback before submitting.");
                    return;
                  }
                  try {
                    const feedbackRef = dbRef(rtdb, "feedbacks");
                    await dbPush(feedbackRef, {
                      email: userEmail.trim(),
                      feedback: feedbackText.trim(),
                      timestamp: Date.now(),
                      resolved: false,
                    });
                    alert("Thank you for your feedback!");
                    setFeedbackText("");
                    setUserEmail("");
                    setShowFeedbackForm(false);
                  } catch (err) {
                    alert("Failed to submit feedback. Please try again.");
                    console.error(err);
                  }
                }}
              >
                <input
                  type="email"
                  className="w-full p-2 border rounded mb-2"
                  placeholder="Your email (required)"
                  value={userEmail || ""}
                  onChange={e => setUserEmail(e.target.value)}
                  required
                />
                <textarea
                  className="w-full p-2 border rounded mb-2"
                  rows={4}
                  placeholder="Type your feedback or question here..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    onClick={() => {
                      setShowFeedbackForm(false);
                      setFeedbackText("");
                      setUserEmail("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
                  >
                    Submit
                  </button>
                </div>
              </form>
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
                className={`p-2 my-1 rounded-lg max-w-xs md:max-w-2xl break-words whitespace-pre-line ${
                  msg.type === "user" ? "bg-green-200 ml-auto text-right" : "bg-gray-200"
                }`}
              >
                <strong>{msg.type === "user" ? "You" : "GCCAN"}:</strong>{" "}
                {msg.type === "bot" ? (
                  <div className="w-full">
                    <span 
                      className="break-words whitespace-pre-line" 
                      dangerouslySetInnerHTML={{ __html: msg.text }} 
                    />
                    {msg.videoUrl && (
                      <div className="mt-4 bg-white rounded-lg p-4 shadow-md">
                        <h3 className="text-lg font-semibold mb-2">Video Content</h3>
                        <div className="relative w-full pb-[56.25%]">
                          <iframe
                            src={msg.videoUrl}
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            frameBorder="0"
                            allowFullScreen
                            allow="autoplay; encrypted-media"
                          ></iframe>
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                          <a 
                            href={msg.videoUrl.replace('/preview', '/view')} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open in Google Drive
                          </a>
                          <button 
                            onClick={() => window.open(msg.videoUrl, '_blank')}
                            className="text-green-500 hover:text-green-700 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {showAvailability && (
              <div className="my-4">
                <label className="block mb-2 text-gray-700">Select a faculty:</label>
                <select
                  className="border border-gray-400 rounded p-2 w-full mb-2"
                  value={selectedFaculty}
                  onChange={e => handleFacultySelect(e.target.value)}
                >
                  <option value="">Select Faculty</option>
                  {facultyList.map(faculty => (
                    <option key={faculty.facultyEmail} value={faculty.facultyEmail}>
                      {faculty.facultyName}
                    </option>
                  ))}
                </select>
                {selectedFaculty && (
                  <div className="mt-4">
                    {facultySchedule.length === 0 ? (
                      <p className="text-red-600">No schedule found for this faculty.</p>
                    ) : (
                      <div className="overflow-auto max-h-[400px] border border-gray-400 rounded">
                        <table className="table-auto w-full text-sm border-collapse border border-gray-400">
                          <thead className="bg-green-600 text-white sticky top-0">
                            <tr>
                              <th className="p-2 border">Course Code</th>
                              <th className="p-2 border">Class Code</th>
                              <th className="p-2 border">Description</th>
                              <th className="p-2 border">Class Type</th>
                              <th className="p-2 border">Day</th>
                              <th className="p-2 border">Time</th>
                              <th className="p-2 border">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {facultySchedule.map((data, idx) => {
                              const available = data.classType === "Face-to-face" ? "Available" : "Not Available";
                              return (
                                <tr key={idx} className="border border-gray-300 even:bg-green-50 odd:bg-white">
                                  <td className="p-2 border border-gray-300">{data.courseCode}</td>
                                  <td className="p-2 border border-gray-300">{data.classCode}</td>
                                  <td className="p-2 border border-gray-300">{data.courseDescription}</td>
                                  <td className="p-2 border border-gray-300">{data.classType}</td>
                                  <td className="p-2 border border-gray-300">{data.day}</td>
                                  <td className="p-2 border border-gray-300">{data.time}</td>
                                  <td className={`p-2 border border-gray-300 font-semibold text-center ${available === "Available" ? "text-green-700" : "text-red-600"}`}>{available}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
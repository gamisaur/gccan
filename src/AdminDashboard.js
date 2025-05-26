import { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { getAuth, signOut, updateProfile } from "firebase/auth";
import { db, rtdb } from "./firebase";
import { ref, onValue, push, remove, update as rtdbUpdate } from "firebase/database";
import defaultAvatar from "./default-avatar.png";
import Cropper from "react-easy-crop";
import getCroppedImg from "./utils/cropImage";
import emailjs from "@emailjs/browser"; 

export default function AdminDashboard({ user, onLogout }) {
  const [uploading, setUploading] = useState(false);
  const [photoURL, setPhotoURL] = useState("");
  const [photoLoading, setPhotoLoading] = useState(true);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  const [view, setView] = useState("feedback");

  const [faqs, setFaqs] = useState([]);
  const [faqFormData, setFaqFormData] = useState({ category: "", question: "", answer: "" });

  const [schedules, setSchedules] = useState([]);
  const [scheduleFormData, setScheduleFormData] = useState({
    facultyEmail: "",
    facultyName: "",
    courseCode: "",
    classCode: "",
    courseDescription: "",
    classType: "",
    day: "",
    time: "",
  });

  const [feedbackList, setFeedbackList] = useState([]);
  const [notification, setNotification] = useState("");
  const prevFeedbackCount = useRef(0);
  const [adminName, setAdminName] = useState("Admin");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchFAQs = async () => {
    const snapshot = await getDocs(collection(db, "FAQs"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setFaqs(data);
  };

  const fetchSchedules = async () => {
    const facultySchedulesSnapshot = await getDocs(collection(db, "FacultySchedules"));
    const schedulesData = [];

    for (const facultyDoc of facultySchedulesSnapshot.docs) {
      const facultyData = facultyDoc.data();
      const subjectsSnapshot = await getDocs(collection(db, "FacultySchedules", facultyDoc.id, "subjects"));

      subjectsSnapshot.forEach((subjectDoc) => {
        schedulesData.push({
          id: subjectDoc.id,
          facultyId: facultyDoc.id,
          facultyEmail: facultyData.facultyEmail,
          facultyName: facultyData.facultyName,
          ...subjectDoc.data(),
        });
      });
    }

    setSchedules(schedulesData);
  };

  useEffect(() => {
    fetchFAQs();
    fetchSchedules();

    const feedbackRef = ref(rtdb, "feedbacks");
    const unsubscribe = onValue(feedbackRef, (snapshot) => {
      const data = snapshot.val() || {};
      let feedbackArray = Object.entries(data).map(([id, value]) => ({
        id,
        ...value,
      }));
      feedbackArray = feedbackArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setFeedbackList(feedbackArray);

      if (prevFeedbackCount.current !== 0 && feedbackArray.length > prevFeedbackCount.current) {
        setNotification("New feedback received!");
        setTimeout(() => setNotification(""), 4000);
      }
      prevFeedbackCount.current = feedbackArray.length;
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchAdminPhoto() {
      setPhotoLoading(true);
      try {
        if (user) {
          const adminDoc = await getDoc(doc(db, "admins", user.uid));
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            setPhotoURL(adminData.photoURL || "");
            setAdminName(adminData.displayName || "Admin");
            console.log("Fetched admin photoURL from Firestore:", adminData.photoURL);
          } else {
            setPhotoURL("");
            setAdminName("Admin");
            console.log("No admin doc found for this user.");
          }
        }
      } catch (err) {
        setPhotoURL("");
        setAdminName("Admin");
        console.error("Error fetching admin photo:", err);
      }
      setPhotoLoading(false);
    }
    fetchAdminPhoto();
  }, [user]);

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "profiles");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dfijy5ac3/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();

      if (!data.secure_url) {
        throw new Error("Cloudinary upload failed");
      }

      console.log("User for Firestore:", user);
      console.log("Cloudinary URL:", data.secure_url);

      if (user) {
        await updateProfile(user, { photoURL: data.secure_url });
        await setDoc(
          doc(db, "admins", user.uid),
          { photoURL: data.secure_url, displayName: user.displayName, email: user.email },
          { merge: true }
        );
        setPhotoURL(data.secure_url);
        console.log("Saved photoURL to Firestore:", data.secure_url);
      } else {
        console.error("No user found, cannot save to Firestore!");
      }

      alert("Profile photo updated!");
    } catch (err) {
      alert("Upload failed.");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleAddFAQ = async () => {
    if (!faqFormData.category || !faqFormData.question || !faqFormData.answer) return;

    const confirmed = window.confirm(
      `Add new FAQ?\n\nCategory: ${faqFormData.category}\nQuestion: ${faqFormData.question}\nAnswer: ${faqFormData.answer}`
    );

    if (!confirmed) return;

    await addDoc(collection(db, "FAQs"), faqFormData);
    setFaqFormData({ category: "", question: "", answer: "" });
    fetchFAQs();
  };

  const handleDeleteFAQ = async (id, question) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the question: "${question}"?`);
    if (confirmDelete) {
      await deleteDoc(doc(db, "FAQs", id));
      fetchFAQs();
    }
  };

  const handleUpdateFAQ = async (id) => {
    const newAnswer = prompt("Enter new answer:");
    if (newAnswer) {
      await updateDoc(doc(db, "FAQs", id), { answer: newAnswer });
      fetchFAQs();
    }
  };

  const handleAddSchedule = async () => {
    const {
      facultyEmail,
      facultyName,
      courseCode,
      classCode,
      courseDescription,
      classType,
      day,
      time,
    } = scheduleFormData;

    if (!facultyEmail || !facultyName || !courseCode || !classCode || !courseDescription || !classType || !day || !time) {
      alert("Please fill out all schedule fields.");
      return;
    }

    const confirmed = window.confirm(
      `Add new Faculty Schedule?\n\nFaculty Email: ${facultyEmail}\nFaculty Name: ${facultyName}\nCourse Code: ${courseCode}\nClass Code: ${classCode}\nDescription: ${courseDescription}\nClass Type: ${classType}\nDay: ${day}\nTime: ${time}`
    );
    if (!confirmed) return;

    const facultyDocRef = doc(db, "FacultySchedules", facultyEmail);
    try {
      await setDoc(facultyDocRef, { facultyEmail, facultyName }, { merge: true });
    } catch (error) {
      console.error("Error creating/updating faculty document:", error);
    }

    await addDoc(collection(db, "FacultySchedules", facultyEmail, "subjects"), {
      courseCode,
      classCode,
      courseDescription,
      classType,
      day,
      time,
    });

    setScheduleFormData({
      facultyEmail: "",
      facultyName: "",
      courseCode: "",
      classCode: "",
      courseDescription: "",
      classType: "",
      day: "",
      time: "",
    });
    fetchSchedules();
  };

  const handleDeleteSchedule = async (facultyId, scheduleId) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete this schedule?`);
    if (confirmDelete) {
      await deleteDoc(doc(db, "FacultySchedules", facultyId, "subjects", scheduleId));
      fetchSchedules();
    }
  };

  const handleChangeClassType = async (facultyId, scheduleId, newClassType) => {
    try {
      await updateDoc(doc(db, "FacultySchedules", facultyId, "subjects", scheduleId), {
        classType: newClassType,
      });
      fetchSchedules();
      alert("Class type has been changed successfully.");
    } catch (error) {
      console.error("Error updating classType:", error);
      alert("Failed to update class type. Try again.");
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;
    const auth = getAuth();
    await signOut(auth);
    onLogout();
  };

  const handleAddFeedback = async ({ email, feedback }) => {
    const feedbackRef = ref(rtdb, "feedbacks");
    await push(feedbackRef, {
      email,
      feedback,
      timestamp: Date.now(),
      resolved: false,
    });
  };

  const handleDeleteFeedback = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this feedback message?");
    if (confirmDelete) {
      const feedbackRef = ref(rtdb, `feedbacks/${id}`);
      await remove(feedbackRef);
    }
  };

  const handleMarkAsResolved = async (id) => {
    try {
      const confirmResolve = window.confirm("Are you sure you want to mark this feedback as resolved?");
      if (!confirmResolve) return;
      const feedbackRef = ref(rtdb, `feedbacks/${id}`);
      await rtdbUpdate(feedbackRef, { resolved: true });
    } catch (error) {
      console.error("Error marking as resolved:", error);
      alert("Failed to mark as resolved.");
    }
  };

  const handleReplyFeedback = async (feedback) => {
    const reply = prompt(`Reply to ${feedback.email}:\n\n${feedback.feedback}\n\nType your reply below:`);
    if (!reply || !reply.trim()) return;

    try {
      // Send email using EmailJS
      await emailjs.send(
        "service_a5ne3r5", // replace with EmailJS service ID
        "template_x4g277a", // replace with EmailJS template ID
        {
          to_email: feedback.email,
          message: reply,
          question: feedback.feedback,
        },
        "2BElq4KD701yuD4aC" // replace with EmailJS public key
      );

      // Mark as resolved in the database
      const feedbackRef = ref(rtdb, `feedbacks/${feedback.id}`);
      await rtdbUpdate(feedbackRef, { resolved: true });

      alert("Reply sent and marked as resolved!");
    } catch (error) {
      alert("Failed to send reply. Please check your email service configuration.");
      console.error(error);
    }
  };

  const checkIfAdmin = async (user) => {
    if (!user) return false;
    const adminDoc = await getDoc(doc(db, "admins", user.uid));
    return adminDoc.exists();
  };

  useEffect(() => {
    if (user) {
      checkIfAdmin(user).then(isAdmin => {
        if (isAdmin) {
          console.log("You are logged in as an admin!");
        } else {
          console.log("You are NOT an admin.");
        }
      });
    }
  }, [user]);

  return (
    <div className="flex min-h-screen bg-green-100 flex-row-reverse">
      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto h-screen transition-all duration-300">
        {/* Notification */}
        {notification && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-green-500 text-white px-10 py-5 rounded-xl shadow-2xl transition text-2xl font-bold">
            {/* Bell Icon (SVG) */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mr-2 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notification}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0 relative">
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
        </div>
        {/* Arrow toggle button - only on mobile */}
        {!sidebarOpen && (
          <button
            className="fixed left-0 z-50 bg-white border border-gray-300 shadow p-1 rounded-none flex items-center justify-center transition sm:hidden"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: 0,
              top: "50px",
            }}
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* FAQ Section */}
        {view === "faqs" && (
          <>
            <div className="bg-white p-4 rounded shadow-lg mb-6 max-w-full overflow-x-auto">
              <h2 className="text-xl font-semibold mb-2">Add New FAQ</h2>
              <input
                type="text"
                placeholder="Category"
                value={faqFormData.category}
                onChange={(e) => setFaqFormData({ ...faqFormData, category: e.target.value })}
                className="p-2 border border-gray-300 rounded mb-2 w-full"
              />
              <input
                type="text"
                placeholder="Question"
                value={faqFormData.question}
                onChange={(e) => setFaqFormData({ ...faqFormData, question: e.target.value })}
                className="p-2 border border-gray-300 rounded mb-2 w-full"
              />
              <textarea
                placeholder="Answer"
                value={faqFormData.answer}
                onChange={(e) => setFaqFormData({ ...faqFormData, answer: e.target.value })}
                className="p-2 border border-gray-300 rounded mb-2 w-full"
                rows={4}
              />
              <button
                onClick={handleAddFAQ}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full sm:w-auto"
              >
                Add FAQ
              </button>
            </div>

            <div className="bg-white p-4 rounded shadow-lg max-w-full overflow-x-auto">
              <h2 className="text-xl font-semibold mb-4">Existing FAQs</h2>
              {faqs.map((faq) => (
                <div key={faq.id} className="border-b py-2">
                  <p><strong>Category:</strong> {faq.category}</p>
                  <p><strong>Q:</strong> {faq.question}</p>
                  <p><strong>A:</strong> {faq.answer}</p>
                  <div className="flex gap-4 mt-2 flex-wrap">
                    <button
                      onClick={() => handleUpdateFAQ(faq.id)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteFAQ(faq.id, faq.question)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Faculty Schedule Section */}
        {view === "schedules" && (
          <>
            <div className="bg-white p-4 rounded shadow-lg mb-6 max-w-full overflow-x-auto">
              <h2 className="text-xl font-semibold mb-2">Add Faculty Schedule</h2>
              {["facultyEmail", "facultyName", "courseCode", "classCode", "courseDescription", "classType", "day", "time"].map((field) => (
                <input
                  key={field}
                  type={field === "facultyEmail" ? "email" : "text"}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                  value={scheduleFormData[field]}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, [field]: e.target.value })}
                  className="p-2 border border-gray-300 rounded mb-2 w-full"
                />
              ))}
              <button
                onClick={handleAddSchedule}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full sm:w-auto"
              >
                Add Schedule
              </button>
            </div>

            <div className="bg-white p-4 rounded shadow max-w-full overflow-x-auto">
              <h2 className="text-xl font-semibold mb-4">Existing Faculty Schedules</h2>
              {schedules.length === 0 && <p>No schedules found.</p>}
              {schedules.map((schedule) => (
                <div key={schedule.id} className="border-b py-2">
                  <p><strong>Faculty:</strong> {schedule.facultyName} ({schedule.facultyEmail})</p>
                  <p><strong>Course Code:</strong> {schedule.courseCode}</p>
                  <p><strong>Class Code:</strong> {schedule.classCode}</p>
                  <p><strong>Description:</strong> {schedule.courseDescription}</p>
                  <p>
                    <strong>Class Type:</strong>{" "}
                    <select
                      value={schedule.classType}
                      onChange={(e) =>
                        handleChangeClassType(schedule.facultyId, schedule.id, e.target.value)
                      }
                      className="border rounded px-1 py-0.5"
                    >
                      <option value="Face-to-face">Face-to-face</option>
                      <option value="Online">Online</option>
                    </select>
                  </p>
                  <p><strong>Day:</strong> {schedule.day}</p>
                  <p><strong>Time:</strong> {schedule.time}</p>
                  <div className="flex gap-4 mt-2 flex-wrap">
                    <button
                      onClick={() => handleDeleteSchedule(schedule.facultyId, schedule.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Feedback Section */}
        {view === "feedback" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unresolved Feedback Card */}
            <div className="bg-white p-4 rounded shadow-lg max-w-full overflow-x-auto">
              <h2 className="text-xl font-semibold mb-4 text-green-700">Unresolved Feedback / Questions</h2>
              {feedbackList.filter(fb => !fb.resolved).length === 0 ? (
                <p className="mb-4">No unresolved feedback submitted yet.</p>
              ) : (
                feedbackList.filter(fb => !fb.resolved).map((feedback) => (
                  <div key={feedback.id} className="border-b py-3">
                    <p><strong>Email:</strong> {feedback.email}</p>
                    <p><strong>Message:</strong> {feedback.feedback}</p>
                    <p className="text-sm text-gray-500">
                      Status: Unresolved{" "}
                      {feedback.timestamp
                        ? new Date(feedback.timestamp).toLocaleString()
                        : "No timestamp"}
                    </p>
                    <div className="mt-2 flex gap-4 flex-wrap">
                      <button
                        onClick={() => handleDeleteFeedback(feedback.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleReplyFeedback(feedback)}
                        className="text-green-600 hover:underline"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Resolved Feedback Card */}
            <div className="bg-white p-4 rounded shadow-lg max-w-full overflow-x-auto">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Resolved Feedback / Questions</h2>
              {feedbackList.filter(fb => fb.resolved).length === 0 ? (
                <p>No resolved feedback yet.</p>
              ) : (
                feedbackList.filter(fb => fb.resolved).map((feedback) => (
                  <div key={feedback.id} className="border-b py-3 opacity-80">
                    <p><strong>Email:</strong> {feedback.email}</p>
                    <p><strong>Message:</strong> {feedback.feedback}</p>
                    <p className="text-sm text-gray-500">
                      Status: Resolved{" "}
                      {feedback.timestamp
                        ? new Date(feedback.timestamp).toLocaleString()
                        : "No timestamp"}
                    </p>
                    <div className="mt-2 flex gap-4 flex-wrap">
                      <button
                        onClick={() => handleDeleteFeedback(feedback.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Cropper Modal */}
        {showCropper && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white p-4 rounded shadow-lg flex flex-col items-center">
              <div className="relative w-72 h-72 bg-gray-200">
                <Cropper
                  image={selectedImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                />
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded"
                  onClick={async () => {
                    const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels);
                    const croppedFile = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
                    await handleImageUpload(croppedFile);
                    setShowCropper(false);
                    setSelectedImage(null);
                  }}
                >
                  Crop & Upload
                </button>
                <button
                  className="bg-gray-300 px-4 py-2 rounded"
                  onClick={() => {
                    setShowCropper(false);
                    setSelectedImage(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sidebar: Drawer on mobile, static on desktop */}
      <aside
        className={`
          fixed z-30 top-0 h-full w-64 bg-white shadow-lg flex flex-col items-center py-8 px-4
          rounded-none flex-shrink-0 overflow-hidden transition-transform duration-300
          sm:static sm:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-64"} 
          sm:w-64
        `}
        style={{
          maxWidth: "100vw",
          minHeight: "100vh",
          left: 0,
          right: "auto",
          top: 0,
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        <div className="relative mb-4">
          {photoLoading ? (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">Loading...</span>
            </div>
          ) : (
            <img
              src={photoURL || defaultAvatar}
              alt="Admin"
              className="w-24 h-24 rounded-full object-cover border-4 border-green-500 cursor-pointer"
              onClick={() => {
                if (photoURL && photoURL !== defaultAvatar) setShowPhotoMenu(true);
              }}
            />
          )}
          {!photoLoading && (!photoURL || photoURL === defaultAvatar) && (
            <label className="absolute bottom-2 right-2 bg-green-500 rounded-full p-1 cursor-pointer hover:bg-green-600 shadow-lg transition">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  if (!user) {
                    alert("You must be logged in to upload a photo.");
                    return;
                  }
                  const file = e.target.files[0];
                  if (file) {
                    setSelectedImage(URL.createObjectURL(file));
                    setShowCropper(true);
                  }
                }}
                disabled={uploading || !user}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </label>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
              <span className="text-green-700 font-bold">Uploading...</span>
            </div>
          )}
          {/* Photo menu */}
          {photoURL && photoURL !== defaultAvatar && showPhotoMenu && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border rounded shadow-lg z-10 flex flex-col min-w-[140px]">
              <label className="px-4 py-2 cursor-pointer hover:bg-gray-100">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      setSelectedImage(URL.createObjectURL(file));
                      setShowCropper(true);
                    }
                    setShowPhotoMenu(false);
                  }}
                  disabled={uploading}
                />
                Change Photo
              </label>
              <button
                className="px-4 py-2 text-left hover:bg-gray-100"
                onClick={async () => {
                  setPhotoURL("");
                  if (user) {
                    await updateProfile(user, { photoURL: "" });
                    await setDoc(
                      doc(db, "admins", user.uid),
                      { photoURL: "", displayName: user.displayName, email: user.email },
                      { merge: true }
                    );
                  }
                  setShowPhotoMenu(false);
                }}
              >
                Remove Photo
              </button>
              <button
                className="px-4 py-2 text-left text-red-500 hover:bg-gray-100"
                onClick={() => setShowPhotoMenu(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold mb-1 text-center">
          {user?.displayName || adminName}
        </h2>
        <p className="text-gray-500 text-center mb-6 break-all">
          {user?.email || ""}
        </p>
        <hr className="w-full border-t border-gray-300 mb-6 rounded-none" />

        {/* Navigation */}
        <nav className="mb-8 flex flex-col gap-2 w-full">
          <SidebarButton
            icon={
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            label="View Feedback & Questions"
            active={view === "feedback"}
            onClick={() => setView("feedback")}
          />
          <SidebarButton
            icon={
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M8 17l4 4 4-4m-4-5v9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            label="Manage FAQs"
            active={view === "faqs"}
            onClick={() => setView("faqs")}
          />
          <SidebarButton
            icon={
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M9 17v-6h6v6m2 4H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            label="Manage Faculty Schedules"
            active={view === "schedules"}
            onClick={() => setView("schedules")}
          />
        </nav>

        {/* Actions */}
        <button
          onClick={handleLogout}
          className="absolute left-4 bottom-6 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-none transition text-sm shadow"
          style={{ borderRadius: "0" }}
          title="Logout"
        >
          {/* Logout SVG icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
          </svg>
          Logout
        </button>
      </aside>

      {/* Overlay for mobile: click to close sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-0 sm:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}
    </div>
  );
}

function SidebarButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2 w-full text-left transition
        ${active ? "bg-green-100 border-l-4 border-green-500 text-green-700 font-semibold" : "hover:bg-gray-100"}
        rounded-none`}
      style={{ borderRadius: "0" }}
    >
      {icon}
      {label}
    </button>
  );
}
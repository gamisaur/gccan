import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { db } from "./firebase";

export default function AdminDashboard({ user, onLogout }) {
  const [view, setView] = useState("faqs");

  // FAQ states
  const [faqs, setFaqs] = useState([]);
  const [faqFormData, setFaqFormData] = useState({ category: "", question: "", answer: "" });

  // Faculty Schedule states
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

  //Feedback states
  const[feedbackList, setFeedbackList] = useState([]);

  // Fetch FAQs
  const fetchFAQs = async () => {
    const snapshot = await getDocs(collection(db, "FAQs"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setFaqs(data);
  };

  // Fetch Faculty Schedules
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

  // Fetch Feedbacks
    const fetchFeedback = async () => {
    try {
      const feedbackRef = collection(db, "Feedback");
      const snapshot = await getDocs(feedbackRef);
      const feedbackData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFeedbackList(feedbackData); 
    } catch (error) {
      console.error("Error fetching feedback:", error);
    }
  };

  useEffect(() => {
    fetchFAQs();
    fetchSchedules();
    fetchFeedback();
  }, []);

  // FAQ handlers
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

  // Schedule handlers
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

    // Create or update faculty document
    const facultyDocRef = doc(db, "FacultySchedules", facultyEmail);
    try {
      await setDoc(facultyDocRef, { facultyEmail, facultyName }, { merge: true });
    } catch (error) {
      console.error("Error creating/updating faculty document:", error);
    }

    // Add schedule in subjects subcollection
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

  // Update classType manually with success prompt
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
    const auth = getAuth();
    await signOut(auth);
    onLogout();
  };

  const handleDeleteFeedback = async (id) => {
    const confirmDelete = window.confirm("Delete this feedback message?");
    if (confirmDelete) {
      await deleteDoc(doc(db, "Feedback", id));
      fetchFeedback();
    }
  };

  const handleMarkAsResolved = async (id) => {
  try {
    await updateDoc(doc(db, "Feedback", id), {
      resolved: true,
    });
    fetchFeedback(); // Refresh feedback list
  } catch (error) {
    console.error("Error marking as resolved:", error);
    alert("Failed to mark as resolved.");
  }
};

return (
  <div className="p-4 sm:p-8 bg-gray-100 min-h-screen">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
      <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 whitespace-nowrap"
      >
        Logout
      </button>
    </div>

    {/* Toggle Buttons */}
    <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
      <button
        onClick={() => setView("faqs")}
        className={`px-4 py-2 rounded text-center ${
          view === "faqs" ? "bg-green-500 text-white" : "bg-gray-300"
        }`}
      >
        Manage FAQs
      </button>
      <button
        onClick={() => setView("schedules")}
        className={`px-4 py-2 rounded text-center ${
          view === "schedules" ? "bg-green-500 text-white" : "bg-gray-300"
        }`}
      >
        Manage Faculty Schedules
      </button>
      <button
        onClick={() => setView("feedback")}
        className={`px-4 py-2 rounded text-center ${
          view === "feedback" ? "bg-green-500 text-white" : "bg-gray-300"
        }`}
      >
        View Feedback & Questions
      </button>
    </div>

    {/* FAQ Section */}
    {view === "faqs" && (
      <>
        <div className="bg-white p-4 rounded shadow mb-6 max-w-full overflow-x-auto">
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

        <div className="bg-white p-4 rounded shadow max-w-full overflow-x-auto">
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
        <div className="bg-white p-4 rounded shadow mb-6 max-w-full overflow-x-auto">
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
      <div className="bg-white p-4 rounded shadow max-w-full overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">User Feedback / Questions</h2>

        {feedbackList.length === 0 ? (
          <p>No feedback submitted yet.</p>
        ) : (
          feedbackList.map((feedback) => (
            <div key={feedback.id} className="border-b py-3">
              <p><strong>Message:</strong> {feedback.feedback}</p>
              <p className="text-sm text-gray-500">
                Status: {feedback.resolved ? "Resolved " : "Unresolved "}
                {feedback.timestamp?.toDate().toLocaleString() || "No timestamp"}
              </p>
              <div className="mt-2 flex gap-4 flex-wrap">
                <button
                  onClick={() => handleDeleteFeedback(feedback.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleMarkAsResolved(feedback.id)}
                  className="text-blue-600 hover:underline"
                >
                  Mark as Resolved
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    )}
  </div>
);
}
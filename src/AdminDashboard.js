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

  useEffect(() => {
    fetchFAQs();
    fetchSchedules();
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

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Toggle Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setView("faqs")}
          className={`px-4 py-2 rounded ${view === "faqs" ? "bg-green-500 text-white" : "bg-gray-300"}`}
        >
          Manage FAQs
        </button>
        <button
          onClick={() => setView("schedules")}
          className={`px-4 py-2 rounded ${view === "schedules" ? "bg-green-500 text-white" : "bg-gray-300"}`}
        >
          Manage Faculty Schedules
        </button>
      </div>

      {/* FAQ Section */}
      {view === "faqs" && (
        <>
          <div className="bg-white p-4 rounded shadow mb-6">
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
            />
            <button
              onClick={handleAddFAQ}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Add FAQ
            </button>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Existing FAQs</h2>
            {faqs.map((faq) => (
              <div key={faq.id} className="border-b py-2">
                <p><strong>Category:</strong> {faq.category}</p>
                <p><strong>Q:</strong> {faq.question}</p>
                <p><strong>A:</strong> {faq.answer}</p>
                <div className="flex gap-4 mt-2">
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
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-xl font-semibold mb-2">Add Faculty Schedule</h2>
            <input
              type="email"
              placeholder="Faculty Email"
              value={scheduleFormData.facultyEmail}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, facultyEmail: e.target.value })}
              className="p-2 border border-gray-300 rounded mb-2 w-full"
            />
            <input
              type="text"
              placeholder="Faculty Name"
              value={scheduleFormData.facultyName}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, facultyName: e.target.value })}
              className="p-2 border border-gray-300 rounded mb-2 w-full"
            />
            <input
              type="text"
              placeholder="Course Code"
              value={scheduleFormData.courseCode}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, courseCode: e.target.value })}
              className="p-2 border border-gray-300 rounded mb-2 w-full"
            />
            <input
              type="text"
              placeholder="Class Code"
              value={scheduleFormData.classCode}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, classCode: e.target.value })}
              className="p-2 border border-gray-300 rounded mb-2 w-full"
            />
            <input
              type="text"
              placeholder="Course Description"
              value={scheduleFormData.courseDescription}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, courseDescription: e.target.value })}
              className="p-2 border border-gray-300 rounded mb-2 w-full"
            />
            <input
              type="text"
              placeholder="Class Type"
              value={scheduleFormData.classType}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, classType: e.target.value })}
              className="p-2 border border-gray-300 rounded mb-2 w-full"
            />
            <input
              type="text"
              placeholder="Day"
              value={scheduleFormData.day}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, day: e.target.value })}
              className="p-2 border border-gray-300 rounded mb-2 w-full"
            />
            <input
              type="text"
              placeholder="Time"
              value={scheduleFormData.time}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, time: e.target.value })}
              className="p-2 border border-gray-300 rounded mb-2 w-full"
            />
            <button
              onClick={handleAddSchedule}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Add Schedule
            </button>
          </div>

          <div className="bg-white p-4 rounded shadow">
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
                <div className="flex gap-4 mt-2">
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
    </div>
  );
}

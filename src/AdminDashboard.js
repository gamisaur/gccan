import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { db } from "./firebase";

export default function AdminDashboard({ user, onLogout }) {
  const [faqs, setFaqs] = useState([]);
  const [formData, setFormData] = useState({ category: "", question: "", answer: "" });

  const fetchFAQs = async () => {
    const snapshot = await getDocs(collection(db, "FAQs"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setFaqs(data);
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  const handleAdd = async () => {
  if (!formData.category || !formData.question || !formData.answer) return;

  const confirmed = window.confirm(
    `Add new FAQ?\n\nCategory: ${formData.category}\nQuestion: ${formData.question}\nAnswer: ${formData.answer}`
    );

    if (!confirmed) return;

    await addDoc(collection(db, "FAQs"), formData);
    setFormData({ category: "", question: "", answer: "" });
    fetchFAQs();
    };

  const handleDelete = async (id, question) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the question: "${question}"?`);
    if (confirmDelete) {
      await deleteDoc(doc(db, "FAQs", id));
      fetchFAQs();
    }
  };

  const handleUpdate = async (id) => {
    const newAnswer = prompt("Enter new answer:");
    if (newAnswer) {
      await updateDoc(doc(db, "FAQs", id), { answer: newAnswer });
      fetchFAQs();
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

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Add New FAQ</h2>
        <input
          type="text"
          placeholder="Category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="p-2 border border-gray-300 rounded mb-2 w-full"
        />
        <input
          type="text"
          placeholder="Question"
          value={formData.question}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          className="p-2 border border-gray-300 rounded mb-2 w-full"
        />
        <textarea
          placeholder="Answer"
          value={formData.answer}
          onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
          className="p-2 border border-gray-300 rounded mb-2 w-full"
        />
        <button
          onClick={handleAdd}
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
                onClick={() => handleUpdate(faq.id)}
                className="text-blue-600 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(faq.id, faq.question)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

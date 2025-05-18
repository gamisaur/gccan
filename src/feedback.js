import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export default function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setStatus("Please enter your message.");
      return;
    }

    try {
      await addDoc(collection(db, "FeedbackQuestions"), {
        message: message.trim(),
        timestamp: serverTimestamp(),
      });
      setMessage("");
      setStatus("Feedback/Question submitted successfully. Thank you!");
    } catch (error) {
      setStatus("Error submitting Feedback/Question. Please try again.");
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Submit Feedback / Questions</h2>
      <textarea
        rows={5}
        placeholder="Write your feedback or question here..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />
      <button
        type="submit"
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Submit
      </button>
      {status && <p className="mt-2 text-sm">{status}</p>}
    </form>
  );
}

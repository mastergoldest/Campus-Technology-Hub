import { useState, type FormEvent } from "react";
import Navbar from "../components/Navbar";
import "./contact.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });

  const whatsappNumber = "2347032901606";

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to send your message.");
      }

      setFeedback({
        type: "success",
        message: "Your message has been sent successfully. Thank you for contacting us!",
      });

      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="contact-page">
        <section className="contact-hero">
          <div className="container">
            <span className="section-kicker">WE'RE HERE TO HELP</span>

            <h1>
              Get in <span>Touch</span>
            </h1>

            <p>
              Have a question, suggestion or need assistance using Campus
              Tech Hub? We'd love to hear from you.
            </p>
          </div>
        </section>

        <section className="contact-content container">
          <div className="contact-information">
            <span className="section-kicker">CONTACT INFORMATION</span>

            <h2>Let's talk.</h2>

            <p>
              Reach out to us through any of the channels below. We're happy
              to help.
            </p>

            <a
              href="mailto:Agboolaiyanuoluwa17@gmail.com"
              className="contact-method"
            >
              <span className="contact-method-icon">✉</span>

              <span>
                <small>Email us</small>
                <strong>Agboolaiyanuoluwa17@gmail.com</strong>
              </span>
            </a>

            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-method"
            >
              <span className="contact-method-icon">☏</span>

              <span>
                <small>WhatsApp</small>
                <strong>07032901606</strong>
              </span>
            </a>

            <div className="contact-note">
              <h3>Campus Tech Hub</h3>
              <p>
                Connecting students with useful products and reliable
                technician support services within the campus community.
              </p>
            </div>
          </div>

          <div className="contact-form-container">
            <h2>Send us a message</h2>

            <p>
              Fill in the form below and we'll get back to you.
            </p>

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="contact-form-row">
                <div className="contact-field">
                  <label htmlFor="contact-name">Full name</label>

                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </div>

                <div className="contact-field">
                  <label htmlFor="contact-email">Email address</label>

                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="contact-field">
                <label htmlFor="contact-subject">Subject</label>

                <input
                  id="contact-subject"
                  type="text"
                  name="subject"
                  placeholder="What is your message about?"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  minLength={3}
                  maxLength={120}
                />
              </div>

              <div className="contact-field">
                <label htmlFor="contact-message">Message</label>

                <textarea
                  id="contact-message"
                  name="message"
                  placeholder="Write your message here..."
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  minLength={10}
                  maxLength={2000}
                />
              </div>

              {feedback.message && (
                <div
                  className={`contact-feedback ${feedback.type}`}
                  role="status"
                >
                  {feedback.message}
                </div>
              )}

              <button
                type="submit"
                className="button button-primary contact-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending message..." : "Send Message"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}

export default Contact;
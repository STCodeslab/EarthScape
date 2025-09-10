import { useEffect, useState } from "react";

export function useEventSource(url) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token"); // <-- your JWT key in localStorage
    const fullUrl = `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token || "")}`;

    const source = new EventSource(fullUrl, { withCredentials: false });

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents((prev) => [...prev, data]);
      } catch (e) {
        console.error("Invalid SSE event", e);
      }
    };

    source.onerror = (err) => {
      console.error("SSE error", err);
      source.close();
    };

    return () => {
      source.close();
    };
  }, [url]);

  return events;
}

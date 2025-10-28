# TaskNest - Your Smart Daily Organizer 🐦

**TaskNest** is a **Progressive Web App (PWA)** designed to help users stay on top of their daily responsibilities — even offline. Whether you're tracking tasks, scheduling events, or jotting down quick notes, TaskNest keeps your day organized in one simple, responsive interface.

---

## 🚀 Features

- ✅ **Task Management**: Add, complete, or remove daily tasks with ease.
- 📅 **Calendar View**: Visualize and manage events by date.
- 📝 **Quick Notes**: Write and view sticky-note style thoughts and reminders.
- 📲 **Installable**: Use it like a native app on your phone or desktop.
- 📡 **Offline-Ready**: Access your data even when you're not connected to the internet.

---

## 🖥️ Live Demo

🔗 [View Live Prototype on GitHub Pages](https://github.com/AKahbeah/INF-654-Mobile-Web-Development)  


---

## 🧪 Prototype Structure

This is a front-end-only prototype to demonstrate the core ideas behind a PWA.

**Main Screens:**

- `index.html` - Home dashboard
- `tasks.html` - To-do task manager
- `calendar.html` - Monthly calendar view
- `notes.html` - Quick notes board
- `settings.html` - Settings & preferences

---

## 🧰 Built With

- [Materialize CSS](https://materializecss.com/) – UI Framework
- HTML5
- Custom CSS
- JavaScript (basic interactivity)
- PWA technologies (Manifest & Service Worker)

---

## 📂 How to Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/AKahbeah/INF-654-Mobile-Web-Development.git
   ```

---

## 💾 Local storage (data persistence)

This prototype stores user data locally in the browser using the following keys (via a small `TaskNestStorage` helper):

- `tasknest_tasks` — JSON array of task objects: `{ text: string, done: boolean }`.
- `tasknest_note` — Plain string containing the notes textarea content.
- `tasknest_theme` — `'light'` or `'dark'` to remember the user's theme choice.

If you need to clear app data while developing, open your browser DevTools > Application (Storage) > Local Storage and remove these keys, or run in the console:

```javascript
localStorage.removeItem('tasknest_tasks');
localStorage.removeItem('tasknest_note');
localStorage.removeItem('tasknest_theme');
```

These changes are also reflected in `app.js` (a `TaskNestStorage` wrapper around localStorage) so pages share the same persistence API.
